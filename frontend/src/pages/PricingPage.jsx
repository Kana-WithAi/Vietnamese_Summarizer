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

        const subPayload = subResponse?.data || subResponse || {}
        const tier =
          subPayload?.tier ||
          subPayload?.plan?.name ||
          subPayload?.plan?.tier ||
          subPayload?.subscription?.tier ||
          subPayload?.subscription?.plan?.name ||
          'free'

        setCurrentTier(String(tier).toLowerCase())
      } catch (error) {
        setPlansError(error?.message || t('pricingPage.errors.loadPlans'))
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
      setPlansError(t('pricingPage.errors.zeroPrice'))
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
      // Xử lý trường hợp BE bọc data trong object { code, data: { ... } }
      const resData = payload?.data || payload

      const checkoutUrl = resData?.checkout_url || payload?.checkout_url
      const orderCode = resData?.order_code || payload?.order_code
      const amount = Number(resData?.amount || payload?.amount || plan.price || 0)

      if (!checkoutUrl) {
        throw new Error(t('pricingPage.errors.noCheckoutUrl'))
      }

      // 1. Lấy đúng chuỗi qr_code từ Backend trả về
      const qrCodeString = resData?.qr_code || payload?.qr_code

      let qrDataUrl = ''

      // 2. CHỈ render mã QR khi có chuỗi qr_code chuẩn
      if (qrCodeString) {
        if (qrCodeString.startsWith('data:image/') || qrCodeString.startsWith('http')) {
          qrDataUrl = qrCodeString
        } else {
          // Sinh ảnh QR từ chuỗi VietQR (000201...)
          qrDataUrl = await QRCode.toDataURL(String(qrCodeString), {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 360,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          })
        }
      }

      setPaymentModal({
        open: true,
        checkoutUrl: String(checkoutUrl),
        orderCode: String(orderCode),
        amount,
        planName: plan.displayName,
        qrDataUrl, // Đã chứa ảnh VietQR chuẩn
      })
    } catch (error) {
      const message = String(error?.message || '')
      const isBanned = /banned/i.test(message)
      const isUnverified = /verified/i.test(message)

      if (isBanned) {
        setPlansError(t('pricingPage.errors.banned'))
        return
      }

      if (isUnverified) {
        setPlansError(t('pricingPage.errors.unverified'))
        return
      }

      setPlansError(error?.message || t('pricingPage.errors.createPayment'))
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
                  {t('pricingPage.modal.title')}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {t('pricingPage.modal.scanTitle')}
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  {t('pricingPage.modal.scanSubtitle')}
                </p>
              </div>
              <button
                type="button"
                onClick={closePaymentModal}
                className="rounded-full p-2 text-slate-400 transition hover:bg-surface-elevated hover:text-white"
                aria-label={t('pricingPage.modal.close')}
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
                      {t('pricingPage.modal.generatingQr')}
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-3 rounded-2xl border border-surface-border bg-surface-raised p-4 text-sm text-slate-300">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">{t('pricingPage.modal.planLabel')}</span>
                    <span className="font-semibold text-white">{paymentModal.planName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">{t('pricingPage.modal.amountLabel')}</span>
                    <span className="font-semibold text-white">{formatPrice(paymentModal.amount)}</span>
                  </div>
                  {paymentModal.orderCode && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">orderCode</span>
                      <span className="font-semibold text-white">{paymentModal.orderCode}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  {paymentModal.checkoutUrl && (
                    <a
                      href={paymentModal.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-2xl border border-surface-border bg-surface-elevated px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-surface-border hover:text-white"
                    >
                      <span>{t('pricingPage.modal.openCheckout')}</span>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={closePaymentModal}
                    className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-surface-base transition hover:bg-accent-hover"
                  >
                    {t('pricingPage.modal.close')}
                  </button>
                </div>
              </div>

              <div className="space-y-4 rounded-3xl border border-surface-border bg-surface-base p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    {t('pricingPage.modal.instructions')}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {t('pricingPage.modal.howToPay')}
                  </h3>
                </div>

                <ol className="space-y-3 text-sm text-slate-300">
                  <li className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
                    {t('pricingPage.modal.step1')}
                  </li>
                  <li className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
                    {t('pricingPage.modal.step2')}
                  </li>
                  <li className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
                    {t('pricingPage.modal.step3')}
                  </li>
                  <li className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
                    {t('pricingPage.modal.step4')}
                  </li>
                </ol>

                <div className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-slate-200">
                  {t('pricingPage.modal.note')}
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
            {t('pricingPage.loadingPlans')}
          </div>
        ) : sortedPlans.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-surface-border bg-surface-raised px-6 py-8 text-sm text-slate-400">
            {t('pricingPage.noPlans')}
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
                        {t('pricingPage.recommended')}
                      </span>
                    )}
                    {isCurrentPlan && (
                      <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                        {t('pricingPage.currentPlan')}
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
                    ? t('pricingPage.currentPlan')
                    : Number(plan.price) <= 0
                      ? t('pricingPage.unavailable')
                    : isBusy
                      ? t('pricingPage.redirecting')
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
