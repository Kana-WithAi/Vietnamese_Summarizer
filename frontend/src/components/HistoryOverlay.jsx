import { useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { useHistory } from '../context/HistoryContext'
import { historyApi } from '../utils/api'

const ITEMS_PER_PAGE = 6

function HistoryOverlay() {
  const overlayRef = useRef(null)
  const { t } = useLanguage()
  const { isHistoryOpen, closeHistory } = useHistory()
  const [summaries, setSummaries] = useState([])
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [filterInputType, setFilterInputType] = useState('all')
  const [filterDate, setFilterDate] = useState('')

  const loadHistory = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setSummaries([])
      return
    }

    try {
      const response = await historyApi.list()
      const list = response?.data?.history || response?.history || response?.data || response || []
      const normalized = Array.isArray(list)
        ? list.map((item) => ({
            id: item?.id || item?.history_id,
            title: item?.title || item?.original_filename || (item?.original_text ? item.original_text.slice(0, 30) + '...' : 'Untitled'),
            time: item?.created_at ? new Date(item.created_at).toLocaleDateString() : '',
            date: item?.created_at ? item.created_at.slice(0, 10) : '',
            inputType: item?.file_type || 'text',
          }))
        : []
      setSummaries(normalized)
    } catch {
      setSummaries([])
    }
  }

  useEffect(() => {
    if (isHistoryOpen) {
      loadHistory()
    }
  }, [isHistoryOpen])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isHistoryOpen) {
        closeHistory()
      }
    }

    if (isHistoryOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
      setPage(1)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isHistoryOpen, closeHistory])

  useEffect(() => {
    // ensure page is valid when summaries list changes
    const totalPagesNow = Math.max(1, Math.ceil(summaries.length / ITEMS_PER_PAGE))
    if (page > totalPagesNow) {
      setPage(totalPagesNow)
    }
  }, [page, summaries])

  // compute filtered count and visible items
  const totalFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return summaries.filter((s) => {
      if (q && !s.title.toLowerCase().includes(q)) return false
      if (filterInputType !== 'all' && s.inputType !== filterInputType) return false
      if (filterDate) {
        if (!s.date || !s.date.startsWith(filterDate)) return false
      }
      return true
    }).length
  }, [summaries, search, filterInputType, filterDate])

  const totalPages = Math.max(1, Math.ceil(totalFiltered / ITEMS_PER_PAGE))

  const visibleSummaries = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = summaries.filter((s) => {
      if (q && !s.title.toLowerCase().includes(q)) return false
      if (filterInputType !== 'all' && s.inputType !== filterInputType) return false
      if (filterDate) {
        if (!s.date || !s.date.startsWith(filterDate)) return false
      }
      return true
    })
    const start = (page - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [page, summaries, search, filterInputType, filterDate])

  const handleRemove = async (id) => {
    try {
      await historyApi.removeById(id)
    } catch (err) {
      console.error('Failed to remove history item:', err)
    }
    setSummaries((prev) => prev.filter((item) => item.id !== id))
  }

  const handleClearAll = async () => {
    try {
      await historyApi.removeAll()
    } catch (err) {
      console.error('Failed to clear all history:', err)
    }
    setSummaries([])
    setPage(1)
  }

  return (
    <>
      {isHistoryOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
          onClick={closeHistory}
          style={{ top: '60px', bottom: '48px' }}
        />
      )}

      <div
        ref={overlayRef}
        className={`fixed right-0 z-50 w-1/5 transform transition-transform duration-300 ease-out bg-surface-raised/80 border-l border-surface-border/50 backdrop-blur-xl shadow-2xl shadow-black/30 flex flex-col ${
          isHistoryOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ top: '60px', bottom: '48px' }}
      >
        <div className="flex items-center justify-between border-b border-surface-border/30 px-5 py-4">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            {t('nav.history')}
          </h2>
          <button
            onClick={closeHistory}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-surface-base/50 hover:text-slate-200"
            aria-label="Close history"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Search + filter */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex w-full items-center gap-2 rounded-lg border border-surface-border bg-surface-base px-2 py-1">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsFilterOpen((s) => !s)}
              className={`h-9 w-9 rounded-lg flex items-center justify-center text-slate-400 transition hover:bg-surface-base/50 ${isFilterOpen ? 'bg-surface-base/60 text-accent' : ''}`}
              aria-label="Toggle filters"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h18M6 12h12M10 19h4" />
              </svg>
            </button>
          </div>

          {isFilterOpen && (
            <div className="mb-4 rounded-xl border border-surface-border/20 bg-gradient-to-b from-surface-base/50 to-surface-base/30 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h18M6 12h12M10 19h4" />
                  </svg>
                  <div>
                    <div className="text-xs text-slate-400">Filter by date</div>
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="mt-1 w-44 rounded-md bg-surface-elevated px-2 py-1 text-sm text-slate-200 border border-surface-border/20 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => { setFilterDate(''); setFilterInputType('all'); }}
                  className="text-xs text-slate-400 hover:text-accent"
                >
                  Reset
                </button>
              </div>

              <div className="mt-4">
                <div className="text-xs text-slate-400 mb-2">Input Type</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterInputType('all')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${filterInputType === 'all' ? 'bg-accent text-surface-base shadow-sm' : 'bg-surface-elevated text-slate-300'}`}
                  >
                    All
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterInputType('paste')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${filterInputType === 'paste' ? 'bg-accent text-surface-base shadow-sm' : 'bg-surface-elevated text-slate-300'}`}
                  >
                    Paste
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterInputType('upload')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${filterInputType === 'upload' ? 'bg-accent text-surface-base shadow-sm' : 'bg-surface-elevated text-slate-300'}`}
                  >
                    Upload
                  </button>
                </div>
              </div>
            </div>
          )}

          {totalFiltered === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-border/50 bg-surface-base/30 px-4 py-6 text-center text-sm text-slate-400">
              No summaries yet.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleSummaries.map((item) => (
                <div
                  key={item.id}
                  className="group relative w-full rounded-lg border border-surface-border/20 bg-surface-base/40 transition hover:border-surface-border/40 hover:bg-surface-base/70"
                >
                  <button
                    type="button"
                    className="w-full pr-10 text-left"
                  >
                    <div className="p-3">
                      <p className="truncate text-sm font-medium text-slate-200 transition group-hover:text-white">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{item.time} • {item.inputType}</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-surface-base/50 hover:text-red-400"
                    aria-label={`Remove ${item.title}`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {summaries.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between border-t border-surface-border/30 px-5 py-3 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="rounded-md px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-surface-base/50 hover:text-slate-200"
            >
              Prev
            </button>
            <span>
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="rounded-md px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-surface-base/50 hover:text-slate-200"
            >
              Next
            </button>
          </div>
        )}

        <div className="border-t border-surface-border/30 px-5 py-3">
          <button
            type="button"
            onClick={handleClearAll}
            className="w-full text-left text-xs font-medium text-slate-400 transition hover:text-accent"
          >
            Clear History
          </button>
        </div>
      </div>
    </>
  )
}

export default HistoryOverlay
