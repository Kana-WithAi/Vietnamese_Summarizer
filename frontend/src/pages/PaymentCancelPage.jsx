import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

function PaymentCancelPage() {
  const { lang } = useLanguage()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-3xl border border-surface-border bg-surface-raised p-8 shadow-sm shadow-black/10">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
          {lang === 'vi' ? 'Thanh toán' : 'Payment'}
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
          {lang === 'vi' ? 'Bạn đã hủy thanh toán' : 'Payment canceled'}
        </h1>
        <p className="mt-3 text-sm text-slate-400 sm:text-base">
          {lang === 'vi'
            ? 'Giao dịch chưa được hoàn tất. Bạn có thể quay lại trang bảng giá để thử lại bất kỳ lúc nào.'
            : 'The transaction was not completed. You can return to the pricing page and try again anytime.'}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to="/pricing"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-surface-base transition hover:bg-accent-hover"
          >
            {lang === 'vi' ? 'Quay lại Bảng giá' : 'Back to Pricing'}
          </Link>
          <Link
            to="/"
            className="rounded-xl border border-surface-border px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-surface-base/60"
          >
            {lang === 'vi' ? 'Trang chủ' : 'Home'}
          </Link>
        </div>
      </section>
    </div>
  )
}

export default PaymentCancelPage
