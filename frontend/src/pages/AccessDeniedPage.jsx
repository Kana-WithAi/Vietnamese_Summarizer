import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

function AccessDeniedPage() {
  const { t } = useLanguage()

  return (
    <section className="mx-auto max-w-2xl rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8 text-center shadow-lg shadow-black/10">
      <p className="text-xs uppercase tracking-[0.24em] text-rose-300">{t('accessDenied.code')}</p>
      <h1 className="mt-3 text-3xl font-semibold text-white">{t('accessDenied.title')}</h1>
      <p className="mt-3 text-sm text-slate-300">{t('accessDenied.description')}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link to="/" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-surface-base transition hover:bg-accent-hover">
          {t('accessDenied.backHome')}
        </Link>
        <Link to="/login" className="rounded-xl border border-surface-border px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-surface-base/60">
          {t('accessDenied.loginAgain')}
        </Link>
      </div>
    </section>
  )
}

export default AccessDeniedPage
