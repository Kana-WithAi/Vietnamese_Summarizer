import { useRef, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { countTextStats } from '../utils/textStats'

const LENGTH_MAP = { 0: 'short', 1: 'medium', 2: 'long' }

function HomePage() {
  const { t, lang } = useLanguage()
  const fileInputRef = useRef(null)

  const [inputText, setInputText] = useState('')
  const [summary, setSummary] = useState('')
  const [outputFormat, setOutputFormat] = useState('paragraph')
  const [lengthIndex, setLengthIndex] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const inputStats = countTextStats(inputText)
  const outputStats = countTextStats(summary)
  const isEmpty = !inputText.trim()

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setInputText(text)
    } catch {
      /* clipboard unavailable */
    }
  }

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => setInputText(String(e.target?.result ?? ''))
    reader.readAsText(file)
    event.target.value = ''
  }

  const handleClear = () => {
    setInputText('')
    setSummary('')
  }

  const handleSummarize = async () => {
    if (!inputText.trim()) return
    setIsLoading(true)

    // Placeholder — connect to summarizer API with outputFormat & LENGTH_MAP[lengthIndex]
    await new Promise((resolve) => setTimeout(resolve, 800))

    const lengthLabel = t(`controls.${LENGTH_MAP[lengthIndex]}`).toLowerCase()
    const placeholder =
      lang === 'vi'
        ? `[${lengthLabel}] `
        : `[${lengthLabel}] `

    if (outputFormat === 'bullet') {
      setSummary(
        `${placeholder}Summary preview:\n• Key point one from your text\n• Key point two from your text\n• Key point three from your text`,
      )
    } else {
      setSummary(
        `${placeholder}This is a preview summary of your text. Connect the API to generate real results based on your selected length and format.`,
      )
    }
    setIsLoading(false)
  }

  const handleCopy = async () => {
    if (!summary) return
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!summary) return
    const blob = new Blob([summary], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'summary.txt'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleSpeak = () => {
    if (!summary || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(summary)
    utterance.lang = lang === 'vi' ? 'vi-VN' : 'en-US'
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero */}
      <section className="text-center">
        <h1 className="bg-gradient-to-r from-white via-slate-200 to-accent bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
          {t('hero.title')}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400 sm:text-base">
          {t('hero.subtitle')}
        </p>
      </section>

      {/* Controls */}
      <section className="flex flex-col gap-4 rounded-2xl border border-surface-border bg-surface-raised/60 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {t('controls.outputFormat')}
          </span>
          <div className="flex rounded-xl border border-surface-border bg-surface-base p-1">
            {['paragraph', 'bulletPoints'].map((format) => {
              const value = format === 'bulletPoints' ? 'bullet' : 'paragraph'
              const isActive = outputFormat === value
              return (
                <button
                  key={format}
                  type="button"
                  onClick={() => setOutputFormat(value)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-accent text-surface-base shadow-md shadow-accent/25'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t(`controls.${format}`)}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:min-w-[280px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {t('controls.summaryLength')}
            </span>
            <span className="text-sm font-semibold text-accent">
              {t(`controls.${LENGTH_MAP[lengthIndex]}`)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={2}
            step={1}
            value={lengthIndex}
            onChange={(e) => setLengthIndex(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>{t('controls.short')}</span>
            <span>{t('controls.medium')}</span>
            <span>{t('controls.long')}</span>
          </div>
        </div>
      </section>

      {/* Workspace */}
      <section className="grid gap-4 lg:grid-cols-[1.08fr_1.08fr] lg:gap-6">
        {/* Input panel */}
        <div className="flex min-h-[550px] flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface-raised shadow-xl shadow-black/20">
          <div className="flex items-center justify-end border-b border-surface-border px-4 py-2.5">
            <button
              type="button"
              onClick={handleClear}
              disabled={isEmpty && !summary}
              className="text-sm text-slate-400 transition hover:text-red-400 disabled:opacity-40"
            >
              {t('input.clear')}
            </button>
          </div>

          <div className="relative flex-1">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('input.placeholder')}
              className="h-full min-h-[400px] w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-slate-200 placeholder:text-slate-600 focus:outline-none lg:min-h-[440px]"
            />

            {isEmpty && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handlePaste}
                  className="pointer-events-auto flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-surface-base shadow-lg shadow-accent/30 transition hover:bg-accent-hover hover:shadow-accent/40"
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
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  {t('input.paste')}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="pointer-events-auto text-sm text-accent transition hover:text-accent-hover hover:underline"
                >
                  {t('input.orUpload')}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}
          </div>

          <div className="border-t border-surface-border px-4 py-2.5 text-right text-xs text-slate-500">
            {inputStats.words} {t('input.words')} &mdash; {inputStats.sentences}{' '}
            {t('input.sentences')}
          </div>
        </div>

        {/* Output panel */}
        <div className="flex min-h-[550px] flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface-raised shadow-xl shadow-black/20">
          <div className="relative flex-1">
            <div
              className={`h-full min-h-[400px] overflow-y-auto px-4 py-3 text-sm leading-relaxed lg:min-h-[440px] ${
                summary ? 'text-slate-200' : 'text-slate-600'
              }`}
            >
              {summary || t('output.placeholder')}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-surface-border px-4 py-2.5">
            <span className="text-xs text-slate-500">
              {outputStats.words} {t('input.words')} &mdash; {outputStats.sentences}{' '}
              {t('input.sentences')}
            </span>

            <div className="flex items-center gap-1">
              <ActionButton
                label={copied ? t('output.copied') : t('output.copy')}
                onClick={handleCopy}
                disabled={!summary}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </ActionButton>
              <ActionButton label={t('output.download')} onClick={handleDownload} disabled={!summary}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </ActionButton>
              <ActionButton label={t('output.speak')} onClick={handleSpeak} disabled={!summary}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </ActionButton>
            </div>
          </div>
        </div>
      </section>

      {/* Summarize button */}
      <div className="flex justify-center pb-4">
        <button
          type="button"
          onClick={handleSummarize}
          disabled={isEmpty || isLoading}
          className="group relative min-w-[200px] overflow-hidden rounded-2xl bg-accent px-10 py-4 text-base font-bold text-surface-base shadow-xl shadow-accent/30 transition hover:bg-accent-hover hover:shadow-accent/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:min-w-[260px] sm:text-lg"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isLoading ? (
              <>
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                ...
              </>
            ) : (
              t('actions.summarize')
            )}
          </span>
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition group-hover:translate-x-full duration-700" />
        </button>
      </div>
    </div>
  )
}

function ActionButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="rounded-lg p-2 text-slate-400 transition hover:bg-surface-elevated hover:text-accent disabled:opacity-40"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        {children}
      </svg>
    </button>
  )
}

export default HomePage
