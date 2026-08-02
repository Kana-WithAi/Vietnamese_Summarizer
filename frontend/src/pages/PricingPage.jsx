import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { paymentsApi, subscriptionsApi } from '../utils/api'
import QRCode from 'qrcode'

function PricingPage() {
  const navigate = useNavigate()
  const { t, lang } = useLanguage()
  const [plans, setPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [plansError, setPlansError] = useState('')
  const [currentTier, setCurrentTier] = useState('free')
  const [checkoutLoadingPlanId, setCheckoutLoadingPlanId] = useState('')
  const [paymentModal, setPaymentModal] = useState({
    open: false,
    checkoutUrl: '',
    orderCode: '',
    amount: 0,
    planName: '',
    qrDataUrl: '',
  })

  const getPlanLocaleKey = (planKey) => {
    if (planKey.includes('free')) return 'free'
    if (planKey.includes('pro')) return 'pro'
    if (planKey.includes('max')) return 'max'
    return 'other'
  }

  const getLocalizedDescription = (plan) => {
    const key = getPlanLocaleKey(plan.key)
    const descriptions = {
      en: {
        free: 'Best for light daily usage and testing.',
        pro: 'Built for frequent users and professional workflow.',
        max: 'For heavy usage with premium limits and flexibility.',
        other: 'Subscription plan for your summarization workflow.',
      },
      vi: {
        free: 'Phù hợp cho nhu cầu nhẹ hằng ngày và dùng thử.',
        pro: 'Dành cho người dùng thường xuyên và công việc chuyên nghiệp.',
        max: 'Dành cho nhu cầu cao với giới hạn và độ linh hoạt tốt nhất.',
        other: 'Gói đăng ký cho nhu cầu tóm tắt của bạn.',
      },
    }

    return descriptions[lang]?.[key] || descriptions.en.other
  }

  useEffect(() => {
    const loadSubscriptionsData = async () => {
      setLoadingPlans(true)
      setPlansError('')

      try {
        const [plansResponse, subResponse] = await Promise.all([
          subscriptionsApi.plans(),
          subscriptionsApi.me().catch(() => null),
        ])

        const plansPayload = plansResponse?.data?.plans || plansResponse?.data || plansResponse || []
        const normalizedPlans = Array.isArray(plansPayload)
          ? plansPayload
              .map((item) => ({
                id: item?.id || item?.plan_id || item?.planId || '',
                key: String(item?.name || item?.tier || '').toLowerCase(),
                displayName: item?.display_name || item?.displayName || item?.name || 'Plan',
                price: Number(item?.price || 0),
                durationDays: Number(item?.duration_days || item?.durationDays || 30),
                description: item?.description || '',
                charLimit: item?.char_limit,
                dailyWordLimit: item?.daily_word_limit,
                isActive: item?.is_active !== false,
              }))
              .filter((item) => item.id && item.isActive)
          : []

        setPlans(normalizedPlans)

        const tier =
          subResponse?.data?.tier ||
          subResponse?.tier ||
          subResponse?.data?.subscription?.tier ||
          'free'
        setCurrentTier(String(tier).toLowerCase())
      } catch (error) {
        setPlansError(error?.message || (lang === 'vi' ? 'Không thể tải gói đăng ký.' : 'Unable to load subscription plans.'))
      } finally {
        setLoadingPlans(false)
      }
    }

    loadSubscriptionsData()
  }, [lang])

  const sortedPlans = useMemo(() => {
    const rank = (key) => {
      if (key.includes('free')) return 0
      if (key.includes('pro')) return 1
      return 2
    }

    return [...plans].sort((a, b) => rank(a.key) - rank(b.key))
  }, [plans])

  const formatPrice = (value) => {
    try {
      return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(value)
    } catch {
      return `${value} VND`
    }
  }

  const handleStartCheckout = async (plan) => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      navigate('/login')
      return
    }

    if (Number(plan.price) <= 0) {
      setPlansError(
        lang === 'vi'
          ? 'Gói này hiện chưa thể thanh toán vì giá đang bằng 0. Vui lòng cập nhật giá gói trong hệ thống admin.'
          : 'This plan cannot be purchased because its price is currently 0. Please update the plan price in admin settings.',
      )
      return
    }

    setCheckoutLoadingPlanId(plan.id)
    setPlansError('')

    try {
      const origin = window.location.origin
      const fallbackBaseUrl =
        import.meta.env.VITE_PAYMENT_PUBLIC_BASE_URL ||
        (origin.includes('localhost') ? 'https://datn.yviand.com' : origin)
      const returnUrl = import.meta.env.VITE_PAYMENT_RETURN_URL || `${fallbackBaseUrl}/payments/status`
      const cancelUrl = import.meta.env.VITE_PAYMENT_CANCEL_URL || `${fallbackBaseUrl}/payments/cancel`

      const response = await paymentsApi.create({
        plan_id: plan.id,
        return_url: returnUrl,
        cancel_url: cancelUrl,
      })

      const payload = response?.data || response
      const checkoutUrl =
        payload?.checkout_url ||
        payload?.payment_url ||
        payload?.checkoutUrl ||
        payload?.url ||
        payload?.data?.checkout_url
      const orderCode =
        payload?.order_code ||
        payload?.orderCode ||
        payload?.data?.order_code ||
        payload?.data?.orderCode ||
        ''
      const amount = Number(
        payload?.amount ||
          payload?.data?.amount ||
          payload?.payment_amount ||
          payload?.data?.payment_amount ||
          plan.price ||
          0,
      )

      if (!checkoutUrl) {
        throw new Error(lang === 'vi' ? 'Không nhận được liên kết thanh toán.' : 'No checkout URL returned from server.')
      }

      const qrDataUrl = await QRCode.toDataURL(String(checkoutUrl), {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 360,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })

      setPaymentModal({
        open: true,
        checkoutUrl: String(checkoutUrl),
        orderCode: String(orderCode),
        amount,
        planName: plan.displayName,
        qrDataUrl,
      })
    } catch (error) {
      const message = String(error?.message || '')
      const isBanned = /banned/i.test(message)
      const isUnverified = /verified/i.test(message)

      if (isBanned) {
        setPlansError(
          lang === 'vi'
            ? 'Tài khoản của bạn đang bị khóa nên không thể tạo thanh toán.'
            : 'Your account is banned, so payment creation is not allowed.',
        )
        return
      }

      if (isUnverified) {
        setPlansError(
          lang === 'vi'
            ? 'Bạn cần xác thực email hoặc kích hoạt tài khoản trước khi tạo thanh toán.'
            : 'You need to verify your email or activate your account before creating a payment.',
        )
        return
      }

      setPlansError(error?.message || (lang === 'vi' ? 'Không thể tạo giao dịch thanh toán.' : 'Unable to create payment transaction.'))
    } finally {
      setCheckoutLoadingPlanId('')
    }
  }

  const closePaymentModal = () => {
    setPaymentModal({
      open: false,
      checkoutUrl: '',
      orderCode: '',
      amount: 0,
      planName: '',
      qrDataUrl: '',
    })
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-surface-border bg-surface-raised p-8 shadow-sm shadow-black/10">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('pricingPage.heading')}</p>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{t('pricingPage.title')}</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-400 sm:text-base">{t('pricingPage.subtitle')}</p>
      </section>

      {paymentModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-surface-border bg-surface-raised shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4 border-b border-surface-border px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  {lang === 'vi' ? 'Thanh toán' : 'Payment'}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {lang === 'vi' ? 'Quét mã QR để thanh toán' : 'Scan the QR code to pay'}
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  {lang === 'vi'
                    ? 'Không cần chuyển trang. Hãy quét mã ngay trong popup này để tiếp tục thanh toán.'
                    : 'No page redirect is needed. Scan the QR directly inside this popup to continue.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closePaymentModal}
                className="rounded-full p-2 text-slate-400 transition hover:bg-surface-elevated hover:text-white"
                aria-label={lang === 'vi' ? 'Đóng' : 'Close'}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[420px_minmax(0,1fr)]">
              <div className="rounded-3xl border border-surface-border bg-surface-base p-5">
                <div className="flex items-center justify-center rounded-2xl bg-white p-4">
                  {paymentModal.qrDataUrl ? (
                    <img
                      src={paymentModal.qrDataUrl}
                      alt={lang === 'vi' ? 'Mã QR thanh toán' : 'Payment QR code'}
                      className="h-auto w-full max-w-[320px] rounded-xl"
                    />
                  ) : (
                    <div className="flex h-[320px] w-full items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
                      {lang === 'vi' ? 'Đang tạo mã QR...' : 'Generating QR code...'}
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-3 rounded-2xl border border-surface-border bg-surface-raised p-4 text-sm text-slate-300">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">{lang === 'vi' ? 'Gói' : 'Plan'}</span>
                    <span className="font-semibold text-white">{paymentModal.planName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">{lang === 'vi' ? 'Số tiền' : 'Amount'}</span>
                    <span className="font-semibold text-white">{formatPrice(paymentModal.amount)}</span>
                  </div>
                  {paymentModal.orderCode && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">orderCode</span>
                      <span className="font-semibold text-white">{paymentModal.orderCode}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={closePaymentModal}
                    className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-surface-base transition hover:bg-accent-hover"
                  >
                    {lang === 'vi' ? 'Đóng' : 'Close'}
                  </button>
                </div>
              </div>

              <div className="space-y-4 rounded-3xl border border-surface-border bg-surface-base p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    {lang === 'vi' ? 'Hướng dẫn' : 'Instructions'}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {lang === 'vi' ? 'Cách thanh toán' : 'How to pay'}
                  </h3>
                </div>

                <ol className="space-y-3 text-sm text-slate-300">
                  <li className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
                    {lang === 'vi'
                      ? '1. Mở app ngân hàng hoặc ví điện tử trên điện thoại.'
                      : '1. Open your banking app or e-wallet on your phone.'}
                  </li>
                  <li className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
                    {lang === 'vi'
                      ? '2. Quét mã QR đang hiển thị trong popup này.'
                      : '2. Scan the QR code shown in this popup.'}
                  </li>
                  <li className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
                    {lang === 'vi'
                      ? '3. Xác nhận thông tin chuyển khoản và hoàn tất thanh toán.'
                      : '3. Confirm the transfer details and complete the payment.'}
                  </li>
                  <li className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
                    {lang === 'vi'
                      ? '4. Sau khi thanh toán xong, hệ thống sẽ cập nhật trạng thái đơn hàng.'
                      : '4. After payment, the system will update the order status.'}
                  </li>
                </ol>

                <div className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-slate-200">
                  {lang === 'vi'
                    ? 'Nếu trạng thái chưa đổi ngay lập tức, hãy chờ vài giây rồi kiểm tra lại trang trạng thái thanh toán.'
                    : 'If the status does not update immediately, wait a few seconds and check the payment status page again.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {plansError && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {plansError}
        </div>
      )}

      <section className="grid gap-5 md:grid-cols-3">
        {loadingPlans ? (
          <div className="col-span-full rounded-3xl border border-surface-border bg-surface-raised px-6 py-8 text-sm text-slate-400">
            {lang === 'vi' ? 'Đang tải gói đăng ký...' : 'Loading subscription plans...'}
          </div>
        ) : sortedPlans.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-surface-border bg-surface-raised px-6 py-8 text-sm text-slate-400">
            {lang === 'vi' ? 'Chưa có gói đăng ký khả dụng.' : 'No active subscription plans available.'}
          </div>
        ) : (
          sortedPlans.map((plan) => {
            const isCurrentPlan = plan.key.includes(currentTier)
            const isFeatured = plan.key.includes('pro')
            const isBusy = checkoutLoadingPlanId === plan.id
            const localizedDescription = getLocalizedDescription(plan)

            return (
              <article
                key={plan.id}
                className={`rounded-3xl border p-6 shadow-sm transition ${
                  isFeatured
                    ? 'border-accent bg-accent/10 shadow-accent/20'
                    : 'border-surface-border bg-surface-raised shadow-black/10'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-white">{plan.displayName}</h2>
                  <div className="flex items-center gap-2">
                    {isFeatured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.539 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 00.95-.69l1.07-3.292z" />
                        </svg>
                        {lang === 'vi' ? 'Đề xuất' : 'Recommended'}
                      </span>
                    )}
                    {isCurrentPlan && (
                      <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                        {lang === 'vi' ? 'Gói hiện tại' : 'Current'}
                      </span>
                    )}
                  </div>
                </div>

                <p className="mt-4 text-3xl font-bold text-white">{formatPrice(plan.price)}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {lang === 'vi' ? `Mỗi ${plan.durationDays} ngày` : `Per ${plan.durationDays} days`}
                </p>

                <ul className="mt-6 space-y-3">
                  {[
                    localizedDescription,
                    `${lang === 'vi' ? 'Giới hạn ký tự:' : 'Character limit:'} ${plan.charLimit ?? (lang === 'vi' ? 'Không giới hạn' : 'Unlimited')}`,
                    `${lang === 'vi' ? 'Giới hạn từ/ngày:' : 'Daily word limit:'} ${plan.dailyWordLimit ?? (lang === 'vi' ? 'Không giới hạn' : 'Unlimited')}`,
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-200">
                      <span className="mt-1 inline-block h-2 w-2 rounded-full bg-accent" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={isCurrentPlan || isBusy || Number(plan.price) <= 0}
                  onClick={() => handleStartCheckout(plan)}
                  className="mt-8 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-surface-base transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCurrentPlan
                    ? (lang === 'vi' ? 'Đang sử dụng' : 'Current plan')
                    : Number(plan.price) <= 0
                      ? (lang === 'vi' ? 'Chưa khả dụng' : 'Unavailable')
                    : isBusy
                      ? (lang === 'vi' ? 'Đang chuyển hướng...' : 'Redirecting...')
                      : t('pricingPage.getStarted')}
                </button>
              </article>
            )
          })
        )}
      </section>
    </div>
  )
}

export default PricingPage
