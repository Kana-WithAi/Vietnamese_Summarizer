import { useLanguage } from '../context/LanguageContext'

function LanguageSwitcher() {
  const { lang, setLang } = useLanguage()

  return (
    <div className="flex items-center rounded-lg border border-surface-border bg-surface-elevated p-0.5">
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
          lang === 'en'
            ? 'bg-accent text-surface-base shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        aria-pressed={lang === 'en'}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('vi')}
        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
          lang === 'vi'
            ? 'bg-accent text-surface-base shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        aria-pressed={lang === 'vi'}
      >
        VI
      </button>
    </div>
  )
}

export default LanguageSwitcher
