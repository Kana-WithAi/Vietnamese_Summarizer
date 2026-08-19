import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useHistory } from '../context/HistoryContext'
import { collectionsApi, historyApi } from '../utils/api'

const ITEMS_PER_PAGE = 20
const DEFAULT_COLLECTION_NAME = 'Default'

function readLocalCollectionData() {
  try {
    const raw = localStorage.getItem('vietnamese-summarizer-collections')
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function getHistoryCollection(item) {
  const collection = item?.collection || item?.collection_name || item?.collectionName || item?.category || DEFAULT_COLLECTION_NAME
  return collection || DEFAULT_COLLECTION_NAME
}

function getHistoryBookmark(item) {
  return Boolean(item?.is_bookmarked ?? item?.isBookmarked ?? item?.bookmarked ?? false)
}

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

  const [activeTab, setActiveTab] = useState('history')
  const [selectedCollectionId, setSelectedCollectionId] = useState('')
  const [selectedCollection, setSelectedCollection] = useState(null)
  const [selectedCollectionItems, setSelectedCollectionItems] = useState([])
  const [selectedCollectionPage, setSelectedCollectionPage] = useState(1)
  const [selectedCollectionTotalPages, setSelectedCollectionTotalPages] = useState(0)
  const [selectedCollectionTotalItems, setSelectedCollectionTotalItems] = useState(0)
  const [collectionDetailLoading, setCollectionDetailLoading] = useState(false)
  const [collectionDetailError, setCollectionDetailError] = useState('')

  const [collections, setCollections] = useState([])
  const [collectionFilter, setCollectionFilter] = useState('all')
  const [newCollectionName, setNewCollectionName] = useState('')
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const [collectionsError, setCollectionsError] = useState('')
  const [collectionSearch, setCollectionSearch] = useState('')
  const [collectionDateFilter, setCollectionDateFilter] = useState('all')
  const [collectionSortBy, setCollectionSortBy] = useState('newest')

  const [editId, setEditId] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [clearingAll, setClearingAll] = useState(false)

  const isLoggedIn = Boolean(localStorage.getItem('accessToken'))

  const normalizeCollection = (item) => {
    const name = String(item?.name || item?.title || item?.collection_name || item?.collectionName || DEFAULT_COLLECTION_NAME).trim() || DEFAULT_COLLECTION_NAME
    return {
      id: item?.id || item?._id || item?.collection_id || item?.collectionId || name,
      name,
      title: item?.title || item?.name || name,
      description: item?.description || '',
      count: Number(item?.count ?? item?.item_count ?? item?.items_count ?? 0) || 0,
    }
  }

  const loadCollections = async () => {
    if (!isLoggedIn) {
      setCollections([])
      return
    }

    setCollectionsLoading(true)
    setCollectionsError('')

    try {
      const response = await collectionsApi.list({ page: 1, limit: 100 })
      const payload = response?.data || response || {}
      const rawCollections = payload?.items || payload?.collections || payload?.results || (Array.isArray(payload) ? payload : [])

      const nextCollections = Array.isArray(rawCollections)
        ? rawCollections.map(normalizeCollection)
        : [normalizeCollection(payload)]

      setCollections(nextCollections)
      if (collectionFilter !== 'all' && !nextCollections.some((collection) => collection.name === collectionFilter)) {
        setCollectionFilter('all')
      }
    } catch (nextError) {
      setCollectionsError(nextError?.message || 'Unable to load collections.')
      setCollections([])
    } finally {
      setCollectionsLoading(false)
    }
  }

  const loadHistoryList = async (nextPage) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await historyApi.list({ page: nextPage, limit: ITEMS_PER_PAGE })
      const parsed = normalizeHistoryListResponse(response)
      const localCollections = readLocalCollectionData()
      const localItems = Object.values(localCollections).flat().map((item) => ({
        ...item,
        collection: item.collection || DEFAULT_COLLECTION_NAME,
        is_bookmarked: Boolean(item.is_bookmarked ?? item.isBookmarked ?? false),
      }))
      const mergedItems = [...(Array.isArray(parsed.items) ? parsed.items : []), ...localItems]
      const dedupedItems = mergedItems.filter((item, index, array) => {
        const id = String(getHistoryId(item, index))
        return array.findIndex((candidate) => String(getHistoryId(candidate, 0)) === id) === index
      })

      setItems(dedupedItems)
      setTotalPages(parsed.totalPages)
      if (parsed.totalPages > 0) {
        setHasNextPage(nextPage < parsed.totalPages)
      } else {
        setHasNextPage(parsed.items.length === ITEMS_PER_PAGE || localItems.length > 0)
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

  const loadCollectionDetail = async (collectionId, nextPage = 1) => {
    if (!collectionId) return

    setCollectionDetailLoading(true)
    setCollectionDetailError('')

    try {
      const [detailResponse, historiesResponse] = await Promise.all([
        collectionsApi.getById(collectionId),
        collectionsApi.getHistories(collectionId, { page: nextPage, limit: ITEMS_PER_PAGE }),
      ])

      const detail = detailResponse?.data || detailResponse || {}
      const normalizedDetail = detail?.item || detail?.collection || detail || {}
      const historyPayload = historiesResponse?.data || historiesResponse || {}
      const historyItems = historyPayload?.items || historyPayload?.histories || historyPayload?.results || (Array.isArray(historyPayload) ? historyPayload : [])
      const pagination = historyPayload?.pagination || historyPayload?.meta || {}

      setSelectedCollection({
        id: normalizedDetail?.id || normalizedDetail?._id || collectionId,
        name: normalizedDetail?.name || normalizedDetail?.title || 'Collection',
        description: normalizedDetail?.description || '',
        created_at: normalizedDetail?.created_at || normalizedDetail?.createdAt || '',
        count: Number(normalizedDetail?.count ?? normalizedDetail?.items_count ?? normalizedDetail?.item_count ?? 0) || 0,
      })
      setSelectedCollectionItems(Array.isArray(historyItems) ? historyItems : [])
      setSelectedCollectionTotalPages(
        Number(pagination?.totalPages || pagination?.total_pages || historyPayload?.totalPages || historyPayload?.total_pages || 0) || 0,
      )
      setSelectedCollectionTotalItems(
        Number(pagination?.totalItems || pagination?.total_items || historyPayload?.totalItems || historyPayload?.total_items || 0) || 0,
      )
      setSelectedCollectionPage(nextPage)
    } catch (nextError) {
      setSelectedCollection(null)
      setSelectedCollectionItems([])
      setCollectionDetailError(nextError?.message || 'Unable to load collection detail.')
    } finally {
      setCollectionDetailLoading(false)
    }
  }

  const createCollection = async () => {
    const trimmed = newCollectionName.trim()
    if (!trimmed) return

    try {
      await collectionsApi.create({ name: trimmed, title: trimmed })
      setNewCollectionName('')
      await loadCollections()
    } catch (nextError) {
      setCollectionsError(nextError?.message || 'Unable to create collection.')
    }
  }

  const deleteCollection = async (collection) => {
    if (!collection?.id) return
    const confirmed = window.confirm(`Delete collection "${collection.name}"?`)
    if (!confirmed) return

    try {
      await collectionsApi.remove(collection.id)
      await loadCollections()
      if (collectionFilter === collection.name) {
        setCollectionFilter('all')
      }
    } catch (nextError) {
      setCollectionsError(nextError?.message || 'Unable to delete collection.')
    }
  }

  const loadHistoryDetail = async (id) => {
    if (!id) return

    setDetailLoading(true)
    setDetailError('')
    setSelectedId(id)

    try {
      if (String(id).startsWith('local-')) {
        const localCollections = readLocalCollectionData()
        const found = Object.values(localCollections)
          .flat()
          .find((item) => item?.id === id)
        setSelectedItem(found || null)
        return
      }

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
        loadCollections()
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

      if (collectionFilter !== 'all' && getHistoryCollection(item) !== collectionFilter) {
        return false
      }

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
  }, [items, search, dateFilter, sortBy, collectionFilter])

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

  const handleToggleBookmark = async (item, index) => {
    const id = getHistoryId(item, index)
    const nextValue = !getHistoryBookmark(item)

    if (typeof id === 'string' && id.startsWith('local-')) {
      const localCollections = readLocalCollectionData()
      const nextItems = Object.fromEntries(
        Object.entries(localCollections).map(([collectionName, entries]) => [
          collectionName,
          Array.isArray(entries)
            ? entries.map((entry) =>
                entry.id === id
                  ? { ...entry, is_bookmarked: nextValue, isBookmarked: nextValue }
                  : entry,
              )
            : [],
        ]),
      )
      localStorage.setItem('vietnamese-summarizer-collections', JSON.stringify(nextItems))
      setItems((current) => current.map((entry) => (getHistoryId(entry, 0) === id ? { ...entry, is_bookmarked: nextValue, isBookmarked: nextValue } : entry)))
      if (selectedId === id) {
        setSelectedItem((current) => (current ? { ...current, is_bookmarked: nextValue, isBookmarked: nextValue } : current))
      }
      return
    }

    setActionLoadingId(`bookmark-${id}`)
    setError('')

    try {
      await historyApi.setBookmark(id, nextValue)
      await loadHistoryList(page)
      if (selectedId === id) {
        await loadHistoryDetail(id)
      }
    } catch (nextError) {
      setError(nextError?.message || t('historyOverlay.errors.toggleBookmark'))
    } finally {
      setActionLoadingId('')
    }
  }

  const handleSelectForSummary = async (item, index) => {
    const id = getHistoryId(item, index)
    if (!id || id.startsWith('history-')) return

    setActionLoadingId(`open-${id}`)
    setError('')

    try {
      let history = item
      if (!String(id).startsWith('local-')) {
        const response = await historyApi.getById(id)
        const payload = response?.data || response
        history = payload?.item || payload?.history || payload || item
      }

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
      if (String(id).startsWith('local-')) {
        const collectionMap = readLocalCollectionData()
        for (const [collectionName, entries] of Object.entries(collectionMap)) {
          if (!Array.isArray(entries)) continue
          const filteredEntries = entries.filter((entry) => entry.id !== id)
          if (filteredEntries.length !== entries.length) {
            collectionMap[collectionName] = filteredEntries
          }
        }
        localStorage.setItem('vietnamese-summarizer-collections', JSON.stringify(collectionMap))
        setItems((current) => current.filter((item) => getHistoryId(item, 0) !== id))
      } else {
        await historyApi.removeById(id)
      }

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

  const filteredCollections = useMemo(() => {
    const query = collectionSearch.trim().toLowerCase()
    const list = [...collections]

    return list
      .filter((collection) => {
        const matchesQuery = !query || String(collection.name).toLowerCase().includes(query)
        return matchesQuery
      })
      .sort((a, b) => {
        if (collectionSortBy === 'title-asc') {
          return String(a.name).localeCompare(String(b.name))
        }
        if (collectionSortBy === 'title-desc') {
          return String(b.name).localeCompare(String(a.name))
        }
        const aDate = new Date(a.created_at || a.createdAt || 0).getTime()
        const bDate = new Date(b.created_at || b.createdAt || 0).getTime()
        return collectionSortBy === 'oldest' ? aDate - bDate : bDate - aDate
      })
  }, [collections, collectionSearch, collectionSortBy])

  const filteredCollectionItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    const now = Date.now()

    return [...selectedCollectionItems]
      .filter((item) => {
        const title = String(getHistoryTitle(item)).toLowerCase()
        if (query && !title.includes(query)) return false

        if (collectionDateFilter !== 'all') {
          const createdAt = new Date(getHistoryCreatedAt(item)).getTime()
          if (Number.isNaN(createdAt)) return false
          if (collectionDateFilter === '7d' && now - createdAt > 7 * 24 * 60 * 60 * 1000) return false
          if (collectionDateFilter === '30d' && now - createdAt > 30 * 24 * 60 * 60 * 1000) return false
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'title-asc') {
          return getHistoryTitle(a).localeCompare(getHistoryTitle(b))
        }
        if (sortBy === 'title-desc') {
          return getHistoryTitle(b).localeCompare(getHistoryTitle(a))
        }
        const aDate = new Date(getHistoryCreatedAt(a)).getTime() || 0
        const bDate = new Date(getHistoryCreatedAt(b)).getTime() || 0
        return sortBy === 'oldest' ? aDate - bDate : bDate - aDate
      })
  }, [selectedCollectionItems, search, collectionDateFilter, sortBy])

  const handleOpenCollection = async (collection) => {
    if (!collection?.id) return
    setActiveTab('collection-detail')
    setSelectedCollectionId(collection.id)
    await loadCollectionDetail(collection.id, 1)
  }

  const handleBackToCollections = () => {
    setActiveTab('collections')
    setSelectedCollectionId('')
    setSelectedCollection(null)
    setSelectedCollectionItems([])
    setCollectionDetailError('')
  }

  const renderHistoryRows = (historyData, isCollectionView = false) => {
    if (!historyData.length) {
      return (
        <div className="rounded-xl border border-dashed border-surface-border/50 bg-surface-base/30 px-4 py-6 text-center text-sm text-slate-400">
          {t('historyOverlay.empty')}
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {historyData.map((item, index) => {
          const id = getHistoryId(item, index)
          const isEditing = editId === id
          const isDeletingLoading = actionLoadingId === `delete-${id}`
          const isBookmarked = getHistoryBookmark(item)
          const collectionName = getHistoryCollection(item)

          return (
            <div
              key={id}
              className="group relative w-full rounded-lg border border-surface-border/20 bg-surface-base/40 transition hover:border-surface-border/40 hover:bg-surface-base/70"
              onClick={() => {
                if (!isEditing && !isDeletingLoading) {
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
                        disabled={actionLoadingId === `edit-${id}` || !editTitle.trim()}
                        className="rounded-md bg-accent px-2 py-1 text-xs font-semibold text-surface-base transition disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoadingId === `edit-${id}` ? t('historyOverlay.saving') : t('historyOverlay.save')}
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
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500">{formatDate(getHistoryCreatedAt(item), lang)}</p>
                      {!isCollectionView && (
                        <span className="rounded-full border border-surface-border bg-surface-base px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-300">
                          {collectionName}
                        </span>
                      )}
                    </div>
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
                          handleToggleBookmark(item, index)
                        }}
                        className="rounded-md px-2 py-1 text-xs text-amber-300 transition hover:bg-amber-500/10"
                        aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                      >
                        {isBookmarked ? '★' : '☆'}
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
    )
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

          {activeTab !== 'collection-detail' && (
            <div className="mb-4 flex rounded-xl border border-surface-border bg-surface-base p-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('history')
                  setSelectedCollection(null)
                  setSelectedCollectionId('')
                }}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  activeTab === 'history' ? 'bg-accent text-surface-base' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('historyOverlay.tabHistory')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('collections')
                  setSelectedCollection(null)
                  setSelectedCollectionId('')
                }}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  activeTab === 'collections' || activeTab === 'collection-detail'
                    ? 'bg-accent text-surface-base'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('historyOverlay.tabCollections')}
              </button>
            </div>
          )}

          {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}

          {activeTab === 'history' && (
            <>
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

              {isLoading ? (
                <div className="rounded-xl border border-dashed border-surface-border/50 bg-surface-base/30 px-4 py-6 text-center text-sm text-slate-400">
                  {t('historyOverlay.loading')}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-surface-border/50 bg-surface-base/30 px-4 py-6 text-center text-sm text-slate-400">
                  {t('historyOverlay.empty')}
                </div>
              ) : (
                renderHistoryRows(filteredItems)
              )}
            </>
          )}

          {activeTab === 'collections' && (
            <>
              <div className="mb-4 flex gap-2">
                <div className="flex w-full items-center gap-2 rounded-lg border border-surface-border bg-surface-base px-2 py-1.5">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    value={collectionSearch}
                    onChange={(e) => setCollectionSearch(e.target.value)}
                    placeholder={t('historyOverlay.collectionSearchPlaceholder')}
                    className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mb-4 flex gap-2">
                <input
                  value={newCollectionName}
                  onChange={(event) => setNewCollectionName(event.target.value)}
                  placeholder={t('historyOverlay.collectionNamePlaceholder')}
                  className="w-full rounded-lg border border-surface-border bg-surface-base px-2 py-2 text-xs text-slate-200 placeholder:text-slate-500 outline-none"
                />
                <button
                  type="button"
                  onClick={createCollection}
                  className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-surface-base"
                >
                  {t('historyOverlay.createCollection')}
                </button>
              </div>

              {collectionsError && <p className="mb-3 text-xs text-rose-300">{collectionsError}</p>}

              {collectionsLoading ? (
                <div className="rounded-xl border border-dashed border-surface-border/50 bg-surface-base/30 px-4 py-6 text-center text-sm text-slate-400">
                  {t('historyOverlay.loading')}
                </div>
              ) : filteredCollections.length === 0 ? (
                <div className="rounded-xl border border-dashed border-surface-border/50 bg-surface-base/30 px-4 py-6 text-center text-sm text-slate-400">
                  {t('historyOverlay.noCollections')}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCollections.map((collection) => (
                    <button
                      key={collection.id}
                      type="button"
                      onClick={() => handleOpenCollection(collection)}
                      className="w-full rounded-2xl border border-surface-border/40 bg-surface-base/35 p-3 text-left transition hover:border-surface-border hover:bg-surface-base/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-100">{collection.name}</div>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                            <span>
                              {collection.count || 0} {t('historyOverlay.collectionCount')}
                            </span>
                            <span>
                              {t('historyOverlay.createdAt')}: {formatDate(collection.created_at || collection.createdAt, lang)}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            deleteCollection(collection)
                          }}
                          className="text-[10px] font-medium text-rose-300 hover:text-rose-200"
                        >
                          {t('historyOverlay.remove')}
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'collection-detail' && (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleBackToCollections}
                  className="rounded-lg border border-surface-border bg-surface-base px-2 py-1.5 text-xs text-slate-200"
                >
                  ← {t('historyOverlay.backToCollections')}
                </button>
                <div className="truncate text-sm font-semibold text-slate-100">
                  {selectedCollection?.name || t('historyOverlay.collectionDetail')}
                </div>
              </div>

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

              {collectionDetailError && <p className="mb-3 text-sm text-rose-300">{collectionDetailError}</p>}

              {collectionDetailLoading ? (
                <div className="rounded-xl border border-dashed border-surface-border/50 bg-surface-base/30 px-4 py-6 text-center text-sm text-slate-400">
                  {t('historyOverlay.loading')}
                </div>
              ) : filteredCollectionItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-surface-border/50 bg-surface-base/30 px-4 py-6 text-center text-sm text-slate-400">
                  {t('historyOverlay.empty')}
                </div>
              ) : (
                renderHistoryRows(filteredCollectionItems, true)
              )}
            </>
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
