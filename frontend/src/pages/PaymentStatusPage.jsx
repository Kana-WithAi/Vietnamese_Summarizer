import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { paymentsApi } from '../utils/api'

function PaymentStatusPage() {
  const { lang } = useLanguage()
  const { refreshUser } = useAuth()
  const [searchParams] = useSearchParams()
  const [statusData, setStatusData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const orderCode = searchParams.get('orderCode') || searchParams.get('order_code') || ''

  useEffect(() => {
    let isMounted = true

    const loadStatus = async () => {
      if (!orderCode) return

      setIsLoading(true)
      setError('')

      try {
        const response = await paymentsApi.status(orderCode)
        const data = response?.data || response
        if (!isMounted) return
        setStatusData(data)

        const status = String(data?.status || data?.payment_status || '').toLowerCase()
        if (status === 'paid' || status === 'completed' || status === 'success') {
          refreshUser(true)
        }
      } catch (nextError) {
        if (!isMounted) return
        setError(nextError?.message || (lang === 'vi' ? 'Không thể tải trạng thái thanh toán.' : 'Unable to load payment status.'))
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadStatus()
    return () => {
      isMounted = false
    }
  }, [orderCode])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-3xl border border-surface-border bg-surface-raised p-8 shadow-sm shadow-black/10">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
          {lang === 'vi' ? 'Thanh toán' : 'Payment'}
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
          {lang === 'vi' ? 'Trạng thái giao dịch' : 'Transaction status'}
        </h1>
        <p className="mt-3 text-sm text-slate-400 sm:text-base">
          {lang === 'vi'
            ? 'Trang này hiển thị trạng thái đơn hàng sau khi quay lại từ cổng thanh toán.'
            : 'This page shows your order status after returning from the payment gateway.'}
        </p>
      </section>

      <section className="rounded-3xl border border-surface-border bg-surface-raised p-6 shadow-sm shadow-black/10">
        {!orderCode && (
          <p className="text-sm text-slate-300">
            {lang === 'vi'
              ? 'Không tìm thấy orderCode trong URL. Hãy kiểm tra lại liên kết return_url.'
              : 'No orderCode found in the URL. Please verify your return_url configuration.'}
          </p>
        )}

        {orderCode && (
          <>
            <p className="text-sm text-slate-400">
              <span className="font-semibold text-slate-200">orderCode:</span> {orderCode}
            </p>

            {isLoading && (
              <p className="mt-4 text-sm text-slate-400">
                {lang === 'vi' ? 'Đang tải trạng thái thanh toán...' : 'Loading payment status...'}
              </p>
            )}

            {error && (
              <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </p>
            )}

            {!isLoading && !error && statusData && (
              <pre className="mt-4 overflow-x-auto rounded-2xl border border-surface-border bg-surface-base p-4 text-xs text-slate-200">
                {JSON.stringify(statusData, null, 2)}
              </pre>
            )}
          </>
        )}
      </section>
    </div>
  )
}

export default PaymentStatusPage
