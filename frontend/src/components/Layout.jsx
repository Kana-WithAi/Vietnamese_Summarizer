import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { useHistory } from '../context/HistoryContext'
import LanguageSwitcher from './LanguageSwitcher'
import HistoryOverlay from './HistoryOverlay'
import BookmarkOverlay from './BookmarkOverlay'

function Layout({ children }) {
  const { t } = useLanguage()
  const { isHistoryOpen, openHistory, closeHistory } = useHistory()
  const [isBookmarkOpen, setIsBookmarkOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-surface-base">
      <header className="sticky top-0 z-50 border-b border-surface-border/80 bg-surface-base/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 ring-1 ring-accent/30">
              <svg
                className="h-5 w-5 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </span>
            <span className="hidden text-lg font-semibold text-white sm:inline">
              {t('appName')}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              to="/pricing"
              className="rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-surface-elevated hover:text-slate-200"
            >
              {t('nav.pricing')}
            </Link>
            {['history', 'bookmark'].map((item) => (
              <button
                key={item}
                onClick={item === 'history' ? openHistory : () => setIsBookmarkOpen(true)}
                className="rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-surface-elevated hover:text-slate-200"
              >
                {t(`nav.${item}`)}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />

            <Link
              to="/dashboard"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-surface-elevated hover:text-slate-200 sm:flex"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              {t('nav.dashboard')}
            </Link>

            <Link
              to="/profile"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-surface-elevated hover:text-slate-200 sm:flex"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                />
              </svg>
              {t('nav.myAccount')}
            </Link>

            <Link
              to="/signup"
              className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-surface-base transition hover:bg-accent-hover sm:px-4"
            >
              {t('nav.signup')}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
        {children}
      </main>

      <footer className="border-t border-surface-border bg-surface-raised py-5 text-center text-sm text-slate-500">
        {t('appName')} &copy; {new Date().getFullYear()}. {t('footer.rights')}
      </footer>

      <HistoryOverlay isOpen={isHistoryOpen} onClose={closeHistory} />
      <BookmarkOverlay isOpen={isBookmarkOpen} onClose={() => setIsBookmarkOpen(false)} />
    </div>
  )
}

export default Layout
