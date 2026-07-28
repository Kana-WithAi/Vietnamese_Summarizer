import { useRef, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { countTextStats } from '../utils/textStats'
import { jsPDF } from 'jspdf'
import { Document as DocxDocument, Packer, Paragraph, TextRun } from 'docx'

const LENGTH_MAP = { 0: 'short', 1: 'medium', 2: 'long' }

function HomePage() {
  const { t, lang } = useLanguage()
  const fileInputRef = useRef(null)

  const [inputText, setInputText] = useState('')
  const [summary, setSummary] = useState('')
  const [outputFormat, setOutputFormat] = useState('paragraph')
  const [mode, setMode] = useState('summary')
  const [lengthIndex, setLengthIndex] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloadFormat, setDownloadFormat] = useState('txt')
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)
  const downloadToggleRef = useRef(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackOptions, setFeedbackOptions] = useState({
    incoherent: false,
    grammar: false,
    spelling: false,
  })

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

    // Placeholder — connect to summarizer API with mode, outputFormat & LENGTH_MAP[lengthIndex]
    await new Promise((resolve) => setTimeout(resolve, 800))

    const lengthLabel = t(`controls.${LENGTH_MAP[lengthIndex]}`).toLowerCase()
    const modeLabel = t(`controls.${mode}`)
    const placeholder = `[${modeLabel}] `
    const previewIntro =
      mode === 'extract'
        ? lang === 'vi'
          ? 'Mẫu trích xuất thông tin từ văn bản của bạn'
          : 'Extraction preview from your text'
        : lang === 'vi'
          ? 'Mẫu tóm tắt văn bản của bạn'
          : 'Summary preview of your text'

    if (outputFormat === 'bullet') {
      setSummary(
        `${placeholder}${previewIntro}:\n• Key point one from your text\n• Key point two from your text\n• Key point three from your text`,
      )
    } else {
      setSummary(
        `${placeholder}${previewIntro}. Connect the API to generate real results based on your selected mode, length, and format.`,
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

  const toggleFeedbackOption = (option) => {
    setFeedbackOptions((prev) => ({
      ...prev,
      [option]: !prev[option],
    }))
  }

  const handleSendFeedback = () => {
    if (!summary) return
    setIsFeedbackOpen(false)
    setFeedbackText('')
    setFeedbackOptions({
      incoherent: false,
      grammar: false,
      spelling: false,
    })
  }

  const handleDownload = (ext = downloadFormat) => {
    if (!summary) return
    const selectedExt = ext || 'txt'
    if (selectedExt === 'pdf') {
      generatePDF()
      return
    }
    if (selectedExt === 'docx') {
      generateDocx()
      return
    }

    let content = summary
    let mime = 'text/plain'

    if (selectedExt === 'md') {
      mime = 'text/markdown'
      content = `# Summary\n\n${summary}`
    } else if (selectedExt === 'json') {
      mime = 'application/json'
      content = JSON.stringify({ summary, words: outputStats.words, sentences: outputStats.sentences }, null, 2)
    }

    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `summary.${selectedExt}`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const openDownloadMenu = () => {
    const el = downloadToggleRef.current
    if (!el) {
      setDownloadMenuOpen(true)
      return
    }
    const rect = el.getBoundingClientRect()
    const menuWidth = 220
    setMenuPosition({ top: rect.bottom + window.scrollY + 6, left: Math.max(8, rect.right + window.scrollX - menuWidth) })
    setDownloadMenuOpen(true)
  }

  const generatePDF = () => {
    try {
      const doc = new jsPDF()
      const lineHeight = 10
      const margin = 10
      const pageWidth = doc.internal.pageSize.getWidth() - margin * 2
      const lines = doc.splitTextToSize(summary, pageWidth)
      doc.setFontSize(12)
      doc.text(lines, margin, margin + 5)
      const blob = doc.output('blob')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'summary.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      // fallback: download as txt with .pdf extension
      const blob = new Blob([summary], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'summary.pdf'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const generateDocx = async () => {
    try {
      const doc = new DocxDocument({
        sections: [
          {
            properties: {},
            children: [new Paragraph({ children: [new TextRun(summary)] })],
          },
        ],
      })
      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'summary.docx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      // fallback to txt
      const blob = new Blob([summary], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'summary.docx'
      a.click()
      URL.revokeObjectURL(url)
    }
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
        <div className="flex flex-col gap-4 sm:min-w-[280px]">
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
                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${isActive
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

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {t('controls.mode')}
            </span>
            <div className="flex rounded-xl border border-surface-border bg-surface-base p-1">
              {['summary', 'extract'].map((option) => {
                const isActive = mode === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMode(option)}
                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${isActive
                        ? 'bg-accent text-surface-base shadow-md shadow-accent/25'
                        : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    {t(`controls.${option}`)}
                  </button>
                )
              })}
            </div>
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
              className={`h-full min-h-[400px] overflow-y-auto px-4 py-3 text-sm leading-relaxed lg:min-h-[440px] ${summary ? 'text-slate-200' : 'text-slate-600'
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

            <div className="flex items-center gap-2">
              {summary && (
                <>
                  <span className="hidden text-xs text-slate-400 sm:block">{t('output.rateSummary')}</span>
                  {/* Thumbs Up Button */}
                  <button
                    type="button"
                    onClick={() => { }}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-surface-elevated hover:text-accent"
                    aria-label={t('output.like')}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M7 10v12" />
                      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
                    </svg>
                  </button>

                  {/* Thumbs Down Button */}
                  <button
                    type="button"
                    onClick={() => setIsFeedbackOpen(true)}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-surface-elevated hover:text-red-400"
                    aria-label={t('output.dislike')}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 14V2" />
                      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
                    </svg>
                  </button>
                </>
              )}
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
              <div className="ml-2">
                <button
                  ref={downloadToggleRef}
                  type="button"
                  onClick={() => { if (!downloadMenuOpen) openDownloadMenu(); else setDownloadMenuOpen(false) }}
                  aria-haspopup="true"
                  aria-expanded={downloadMenuOpen}
                  className="flex items-center gap-2 rounded-md bg-surface-base px-3 py-2 text-sm text-slate-300 hover:bg-surface-elevated"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v13" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l7 7 7-7" />
                  </svg>
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 8l4 4 4-4" />
                  </svg>
                </button>

                {downloadMenuOpen && (
                  <div
                    style={{ position: 'fixed', top: `${menuPosition.top}px`, left: `${menuPosition.left}px`, zIndex: 9999, width: 220 }}
                    className="rounded-md border border-surface-border bg-surface-raised shadow-lg"
                  >
                    <ul className="py-1">
                      {[
                        { key: 'pdf', label: 'PDF Document (.pdf)' },
                        { key: 'docx', label: 'Word Document (.docx)' },
                        { key: 'txt', label: 'Plain Text (.txt)' },
                        { key: 'json', label: 'JSON Data (.json)' },
                      ].map((opt) => (
                        <li key={opt.key}>
                          <button
                            type="button"
                            onClick={() => { setDownloadFormat(opt.key); setDownloadMenuOpen(false); setTimeout(() => handleDownload(opt.key), 10) }}
                            className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-surface-base"
                          >
                            {opt.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <ActionButton label={t('output.speak')} onClick={handleSpeak} disabled={!summary}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </ActionButton>
            </div>
            {copied && (
              <div className="mt-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                {t('output.copied')}
              </div>
            )}
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

      {isFeedbackOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 py-6">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-surface-border bg-surface-raised shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-border px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('feedback.title')}</p>
                <h2 className="text-2xl font-semibold text-white">{t('feedback.header')}</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsFeedbackOpen(false)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-surface-elevated hover:text-white"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="space-y-3 rounded-3xl bg-surface-base p-4">
                <p className="text-sm font-semibold text-slate-200">{t('feedback.whyUnhappy')}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { key: 'incoherent', label: t('feedback.optionIncoherent') },
                    { key: 'grammar', label: t('feedback.optionGrammar') },
                    { key: 'spelling', label: t('feedback.optionSpelling') },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => toggleFeedbackOption(option.key)}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${feedbackOptions[option.key]
                          ? 'border-accent bg-accent/10 text-white'
                          : 'border-surface-border bg-surface-base text-slate-300 hover:border-slate-400'
                        }`}
                    >
                      <span className={`h-4 w-4 rounded-full border ${feedbackOptions[option.key] ? 'border-accent bg-accent' : 'border-slate-500'}`} />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-200" htmlFor="feedback-detail">
                  {t('feedback.detailsLabel')}
                </label>
                <textarea
                  id="feedback-detail"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={4}
                  placeholder={t('feedback.placeholder')}
                  className="w-full resize-none rounded-3xl border border-surface-border bg-surface-base px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-surface-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-slate-400">{t('feedback.note')}</span>
              <button
                type="button"
                onClick={handleSendFeedback}
                disabled={!summary}
                className="inline-flex items-center justify-center rounded-3xl bg-accent px-5 py-3 text-sm font-semibold text-surface-base transition hover:bg-accent-hover disabled:opacity-40"
              >
                {t('feedback.send')}
              </button>
            </div>
          </div>
        </div>
      )}
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
