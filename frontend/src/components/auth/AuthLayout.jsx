import { Link } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import LanguageSwitcher from '../LanguageSwitcher'

function AuthLayout({ children, title, subtitle }) {
  const { t } = useLanguage()

  return (
    <div className="flex min-h-screen bg-surface-base">
      <aside className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-surface-raised via-surface-elevated to-surface-base lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        </div>

        <Link
          to="/"
          className="relative z-10 text-xl font-semibold text-white"
        >
          {t('appName')}
        </Link>

        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-bold leading-tight text-white">
            {t('hero.title')}
          </h2>
          <p className="max-w-md text-lg text-slate-400">
            {t('hero.subtitle')}
          </p>
        </div>

        <p className="relative z-10 text-sm text-slate-500">
          &copy; {new Date().getFullYear()} {t('appName')}
        </p>
      </aside>

      <main className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link to="/" className="text-xl font-semibold text-white">
              {t('appName')}
            </Link>
            <LanguageSwitcher />
          </div>

          <div className="mb-8 hidden justify-end lg:flex">
            <LanguageSwitcher />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-slate-400">{subtitle}</p>
            )}
          </div>

          {children}
        </div>
      </main>
    </div>
  )
}

export default AuthLayout
