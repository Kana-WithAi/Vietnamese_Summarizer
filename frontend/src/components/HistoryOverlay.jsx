import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useHistory } from '../context/HistoryContext'
import { historyApi } from '../utils/api'

const ITEMS_PER_PAGE = 20

function normalizeHistoryListResponse(raw) {
  const payload = raw?.data || raw

  const items =
    payload?.items ||
    payload?.histories ||
    payload?.history ||
    payload?.results ||
    (Array.isArray(payload) ? payload : [])

  const pagination = payload?.pagination || payload?.meta || {}
  const totalPages =
    Number(pagination?.totalPages || pagination?.total_pages || payload?.totalPages || payload?.total_pages || 0) || 0
  const totalItems =
    Number(pagination?.totalItems || pagination?.total_items || payload?.totalItems || payload?.total_items || 0) || 0

  return {
    items: Array.isArray(items) ? items : [],
    totalPages,
    totalItems,
  }
}

function getHistoryId(item, index) {
  return item?.id || item?._id || item?.history_id || item?.historyId || `history-${index}`
}

function getHistoryTitle(item) {
  return item?.title || item?.name || item?.summary_title || item?.summaryTitle || ''
}

function getHistoryCreatedAt(item) {
  return item?.created_at || item?.createdAt || item?.updated_at || item?.updatedAt || ''
}

function getHistorySummary(item) {
  return item?.summary || item?.result || item?.output || item?.content || ''
}

function getHistorySourceText(item) {
  return item?.source_text || item?.sourceText || item?.input_text || item?.inputText || ''
}

function formatDate(value, lang) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function HistoryOverlay() {
  const overlayRef = useRef(null)
  const navigate = useNavigate()
  const { t, lang } = useLanguage()
  const { isHistoryOpen, closeHistory } = useHistory()

  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  const [selectedId, setSelectedId] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  const [editId, setEditId] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [clearingAll, setClearingAll] = useState(false)

  const isLoggedIn = Boolean(localStorage.getItem('accessToken'))

  const loadHistoryList = async (nextPage) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await historyApi.list({ page: nextPage, limit: ITEMS_PER_PAGE })
      const parsed = normalizeHistoryListResponse(response)

      setItems(parsed.items)
      setTotalPages(parsed.totalPages)
      if (parsed.totalPages > 0) {
        setHasNextPage(nextPage < parsed.totalPages)
      } else {
        setHasNextPage(parsed.items.length === ITEMS_PER_PAGE)
      }
    } catch (nextError) {
      setItems([])
      setTotalPages(0)
      setHasNextPage(false)
      setError(nextError?.message || t('historyOverlay.errors.loadList'))
    } finally {
      setIsLoading(false)
    }
  }

  const loadHistoryDetail = async (id) => {
    if (!id) return

    setDetailLoading(true)
    setDetailError('')
    setSelectedId(id)

    try {
      const response = await historyApi.getById(id)
      const payload = response?.data || response
      const history = payload?.item || payload?.history || payload
      setSelectedItem(history)
    } catch (nextError) {
      setSelectedItem(null)
      setDetailError(nextError?.message || t('historyOverlay.errors.loadDetail'))
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isHistoryOpen) {
        closeHistory()
      }
    }

    if (isHistoryOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'

      if (!isLoggedIn) {
        setItems([])
        setSelectedId('')
        setSelectedItem(null)
        setError(t('historyOverlay.loginRequired'))
      } else {
        loadHistoryList(1)
      }

      setPage(1)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isHistoryOpen, closeHistory, isLoggedIn, t])

  useEffect(() => {
    if (!isHistoryOpen || !isLoggedIn) return
    loadHistoryList(page)
  }, [page, isHistoryOpen, isLoggedIn])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    const now = Date.now()
    const filtered = items.filter((item) => {
      const title = String(getHistoryTitle(item)).toLowerCase()
      if (q && !title.includes(q)) return false

      if (dateFilter !== 'all') {
        const createdAt = getHistoryCreatedAt(item)
        const createdAtMs = new Date(createdAt).getTime()
        if (Number.isNaN(createdAtMs)) return false

        if (dateFilter === '7d' && now - createdAtMs > 7 * 24 * 60 * 60 * 1000) return false
        if (dateFilter === '30d' && now - createdAtMs > 30 * 24 * 60 * 60 * 1000) return false
      }

      return true
    })

    return filtered.sort((a, b) => {
      if (sortBy === 'title-asc') {
        return getHistoryTitle(a).localeCompare(getHistoryTitle(b))
      }
      if (sortBy === 'title-desc') {
        return getHistoryTitle(b).localeCompare(getHistoryTitle(a))
      }

      const aDate = new Date(getHistoryCreatedAt(a)).getTime() || 0
      const bDate = new Date(getHistoryCreatedAt(b)).getTime() || 0
      if (sortBy === 'oldest') {
        return aDate - bDate
      }

      return bDate - aDate
    })
  }, [items, search, dateFilter, sortBy])

  const canGoPrev = page > 1
  const canGoNext = totalPages > 0 ? page < totalPages : hasNextPage

  const handleViewDetail = async (item, index) => {
    const id = getHistoryId(item, index)
    if (selectedId === id) {
      setSelectedId('')
      setSelectedItem(null)
      setDetailError('')
      return
    }
    await loadHistoryDetail(id)
  }

  const handleSelectForSummary = async (item, index) => {
    const id = getHistoryId(item, index)
    if (!id || id.startsWith('history-')) return

    setActionLoadingId(`open-${id}`)
    setError('')

    try {
      const response = await historyApi.getById(id)
      const payload = response?.data || response
      const history = payload?.item || payload?.history || payload || item

      const inputText = String(
        history?.source_text ||
        history?.sourceText ||
        history?.input_text ||
        history?.inputText ||
        '',
      )
      const outputText = String(
        history?.summary ||
        history?.output_text ||
        history?.outputText ||
        history?.result ||
        history?.content ||
        '',
      )
      const summaryId = String(
        history?.id || history?.history_id || history?.historyId || history?.summary_id || history?.summaryId || '',
      ).trim()

      window.dispatchEvent(
        new CustomEvent('history:load-summary', {
          detail: {
            inputText,
            summary: outputText,
            summaryId,
          },
        }),
      )

      closeHistory()
      navigate('/')
    } catch (nextError) {
      setError(nextError?.message || t('historyOverlay.errors.loadDetail'))
    } finally {
      setActionLoadingId('')
    }
  }

  const handleStartEdit = (item, index) => {
    const id = getHistoryId(item, index)
    setEditId(id)
    setEditTitle(getHistoryTitle(item))
  }

  const handleCancelEdit = () => {
    setEditId('')
    setEditTitle('')
  }

  const handleSaveTitle = async (id) => {
    const trimmedTitle = editTitle.trim()
    if (!trimmedTitle) return

    setActionLoadingId(`edit-${id}`)
    setError('')

    try {
      await historyApi.updateTitle(id, trimmedTitle)
      setEditId('')
      setEditTitle('')

      await loadHistoryList(page)
      if (selectedId === id) {
        await loadHistoryDetail(id)
      }
    } catch (nextError) {
      setError(nextError?.message || t('historyOverlay.errors.updateTitle'))
    } finally {
      setActionLoadingId('')
    }
  }

  const handleRemove = async (id) => {
    setActionLoadingId(`delete-${id}`)
    setError('')

    try {
      await historyApi.removeById(id)

      const nextItems = filteredItems.filter((item, index) => getHistoryId(item, index) !== id)
      const shouldStepBack = nextItems.length === 0 && page > 1
      const nextPage = shouldStepBack ? page - 1 : page

      if (selectedId === id) {
        setSelectedId('')
        setSelectedItem(null)
        setDetailError('')
      }

      if (nextPage !== page) {
        setPage(nextPage)
      } else {
        await loadHistoryList(page)
      }
    } catch (nextError) {
      setError(nextError?.message || t('historyOverlay.errors.removeItem'))
    } finally {
      setActionLoadingId('')
    }
  }

  const handleClearAll = async () => {
    if (!window.confirm(t('historyOverlay.confirmClearAll'))) return

    setClearingAll(true)
    setError('')

    try {
      await historyApi.removeAll()
      setItems([])
      setSelectedId('')
      setSelectedItem(null)
      setDetailError('')
      setPage(1)
      setTotalPages(0)
      setHasNextPage(false)
    } catch (nextError) {
      setError(nextError?.message || t('historyOverlay.errors.clearAll'))
    } finally {
      setClearingAll(false)
    }
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
            {t('historyOverlay.title')}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => loadHistoryList(page)}
              className="rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-surface-base/50 hover:text-slate-200"
              disabled={isLoading}
            >
              {t('historyOverlay.refresh')}
            </button>
            <button
              onClick={closeHistory}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-surface-base/50 hover:text-slate-200"
              aria-label={t('historyOverlay.close')}
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
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!isLoggedIn && (
            <div className="mb-4 rounded-xl border border-dashed border-surface-border/50 bg-surface-base/30 px-4 py-6 text-center text-sm text-slate-400">
              {t('historyOverlay.loginRequired')}
            </div>
          )}

          <div className="mb-4 flex items-center gap-3">
            <div className="flex w-full items-center gap-2 rounded-lg border border-surface-border bg-surface-base px-2 py-1">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('historyOverlay.searchPlaceholder')}
                className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t('historyOverlay.filterByDate')}</span>
              <select
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="rounded-lg border border-surface-border bg-surface-base px-2 py-1.5 text-xs text-slate-200 outline-none"
              >
                <option value="all">{t('historyOverlay.filterAllTime')}</option>
                <option value="7d">{t('historyOverlay.filterLast7Days')}</option>
                <option value="30d">{t('historyOverlay.filterLast30Days')}</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t('historyOverlay.sortBy')}</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="rounded-lg border border-surface-border bg-surface-base px-2 py-1.5 text-xs text-slate-200 outline-none"
              >
                <option value="newest">{t('historyOverlay.sortNewest')}</option>
                <option value="oldest">{t('historyOverlay.sortOldest')}</option>
                <option value="title-asc">{t('historyOverlay.sortTitleAsc')}</option>
                <option value="title-desc">{t('historyOverlay.sortTitleDesc')}</option>
              </select>
            </label>
          </div>

          {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}

          {isLoading ? (
            <div className="rounded-xl border border-dashed border-surface-border/50 bg-surface-base/30 px-4 py-6 text-center text-sm text-slate-400">
              {t('historyOverlay.loading')}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-border/50 bg-surface-base/30 px-4 py-6 text-center text-sm text-slate-400">
              {t('historyOverlay.empty')}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item, index) => {
                const id = getHistoryId(item, index)
                const isEditing = editId === id
                const isEditingLoading = actionLoadingId === `edit-${id}`
                const isDeletingLoading = actionLoadingId === `delete-${id}`

                return (
                <div
                  key={id}
                  className="group relative w-full rounded-lg border border-surface-border/20 bg-surface-base/40 transition hover:border-surface-border/40 hover:bg-surface-base/70"
                  onClick={() => {
                    if (!isEditing && !isEditingLoading && !isDeletingLoading) {
                      handleSelectForSummary(item, index)
                    }
                  }}
                >
                  <div className="p-3">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          onClick={(event) => event.stopPropagation()}
                          value={editTitle}
                          onChange={(event) => setEditTitle(event.target.value)}
                          className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-100 outline-none"
                          maxLength={120}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleSaveTitle(id)
                            }}
                            disabled={isEditingLoading || !editTitle.trim()}
                            className="rounded-md bg-accent px-2 py-1 text-xs font-semibold text-surface-base transition disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isEditingLoading ? t('historyOverlay.saving') : t('historyOverlay.save')}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleCancelEdit()
                            }}
                            className="rounded-md px-2 py-1 text-xs text-slate-300 transition hover:bg-surface-base/60"
                          >
                            {t('historyOverlay.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="truncate text-sm font-medium text-slate-200 transition group-hover:text-white">
                          {getHistoryTitle(item) || t('historyOverlay.untitled')}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{formatDate(getHistoryCreatedAt(item), lang)}</p>
                        {selectedId === id && (
                          <div className="mt-3 rounded-lg border border-surface-border/40 bg-surface-base/50 px-3 py-2">
                            <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              {t('historyOverlay.detailTitle')}
                            </p>
                            {detailLoading ? (
                              <p className="text-sm text-slate-400">{t('historyOverlay.loadingDetail')}</p>
                            ) : detailError ? (
                              <p className="text-sm text-rose-300">{detailError}</p>
                            ) : selectedItem ? (
                              <div className="space-y-2">
                                {getHistorySummary(selectedItem) && (
                                  <p className="line-clamp-5 text-sm text-slate-300">{getHistorySummary(selectedItem)}</p>
                                )}
                                {!getHistorySummary(selectedItem) && getHistorySourceText(selectedItem) && (
                                  <p className="line-clamp-5 text-sm text-slate-300">{getHistorySourceText(selectedItem)}</p>
                                )}
                              </div>
                            ) : null}
                          </div>
                        )}
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleViewDetail(item, index)
                            }}
                            className="rounded-md px-2 py-1 text-xs text-slate-300 transition hover:bg-surface-base/60"
                          >
                            {t('historyOverlay.view')}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleStartEdit(item, index)
                            }}
                            className="rounded-md px-2 py-1 text-xs text-slate-300 transition hover:bg-surface-base/60"
                          >
                            {t('historyOverlay.edit')}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleRemove(id)
                            }}
                            disabled={isDeletingLoading}
                            className="rounded-md px-2 py-1 text-xs text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isDeletingLoading ? t('historyOverlay.removing') : t('historyOverlay.remove')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>

        {isLoggedIn && (
          <div className="flex items-center justify-between border-t border-surface-border/30 px-5 py-3 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={!canGoPrev || isLoading}
              className="rounded-md px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-surface-base/50 hover:text-slate-200"
            >
              {t('historyOverlay.prev')}
            </button>
            <span>
              {t('historyOverlay.page')} {page}
              {totalPages > 0 ? ` / ${totalPages}` : ''}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={!canGoNext || isLoading}
              className="rounded-md px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-surface-base/50 hover:text-slate-200"
            >
              {t('historyOverlay.next')}
            </button>
          </div>
        )}

        <div className="border-t border-surface-border/30 px-5 py-3">
          <button
            type="button"
            onClick={handleClearAll}
            disabled={clearingAll || isLoading || !isLoggedIn || items.length === 0}
            className="w-full text-left text-xs font-medium text-slate-400 transition hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {clearingAll ? t('historyOverlay.clearing') : t('historyOverlay.clearHistory')}
          </button>
        </div>
      </div>
    </>
  )
}

export default HistoryOverlay
