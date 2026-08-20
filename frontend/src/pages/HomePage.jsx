import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { collectionsApi, feedbacksApi, historyApi, ocrApi, subscriptionsApi, summarizeApi } from '../utils/api'
import OcrOutputBox from '../components/OcrOutputBox'
import { getFileDimensions } from '../utils/fileDimensions'
import { countTextStats } from '../utils/textStats'
import { jsPDF } from 'jspdf'
import { Document as DocxDocument, Packer, Paragraph, TextRun } from 'docx'

const LENGTH_MAP = { 0: 'short', 1: 'medium', 2: 'long' }
const DISLIKE_REASONS = ['missing_info', 'clunky_sentences', 'spelling_grammar', 'loss_of_context', 'other']
const SUMMARY_COLLECTION_STORAGE_KEY = 'vietnamese-summarizer-collections'
const SUMMARY_COLLECTION_COLOR_STORAGE_KEY = 'vietnamese-summarizer-collection-colors'
const DEFAULT_SUMMARY_COLLECTION = 'Default'
const DEFAULT_COLLECTION_COLOR = '#7c3aed'
const COLLECTION_SWATCHES = ['#7c3aed', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#f472b6', '#a78bfa', '#f97316']

function getCollectionColor(name, fallback = DEFAULT_COLLECTION_COLOR) {
  const raw = localStorage.getItem(SUMMARY_COLLECTION_COLOR_STORAGE_KEY)
  if (!raw) return fallback

  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      const color = String(parsed[name] || '').trim()
      if (color) return color
    }
  } catch {
    // Ignore invalid local history metadata and fall back to default color.
  }

  return fallback
}

function extractSummaryId(response) {
  const data = response?.data || response || {}
  const candidates = [
    data?.summary_id,
    data?.summaryId,
    data?.history_id,
    data?.historyId,
    data?.id,
    response?.summary_id,
    response?.id,
  ]

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

function extractSummaryIdFromHistoryResponse(response) {
  const data = response?.data || response || {}
  const items =
    data?.items ||
    data?.histories ||
    data?.results ||
    (Array.isArray(data) ? data : [])

  const latest = Array.isArray(items) && items.length > 0 ? items[0] : null
  if (!latest || typeof latest !== 'object') return ''

  const candidates = [latest?.id, latest?.history_id, latest?.summary_id]
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

function getSummarizeErrorMessage(error, t, lang) {
  const status = Number(error?.status || 0)
  const data = error?.data
  const dataObject = data && typeof data === 'object' ? data : {}
  const code = String(dataObject?.error || dataObject?.code || dataObject?.error_code || '').toUpperCase()
  const backendMessage = String(dataObject?.message || '')
  const rawText = String(
    dataObject?.message ||
    dataObject?.error ||
    (typeof data === 'string' ? data : '') ||
    error?.message ||
    '',
  ).toLowerCase()

  const looksLikeHtmlError = rawText.includes('<html') || rawText.includes('<!doctype')

  const hasUsableBackendMessage =
    backendMessage.trim() &&
    backendMessage.length < 300 &&
    !backendMessage.toLowerCase().includes('<html') &&
    !backendMessage.toLowerCase().includes('<!doctype')

  const looksLikeLimitError =
    code === 'TEXT_TOO_LONG' ||
    code === 'CHAR_LIMIT_EXCEEDED' ||
    code === 'WORD_LIMIT_EXCEEDED' ||
    code === 'INPUT_LIMIT_EXCEEDED' ||
    status === 413 ||
    status === 422 ||
    rawText.includes('character limit') ||
    rawText.includes('word limit') ||
    rawText.includes('too long') ||
    rawText.includes('limit')

  const looksLikeEmptyTextError =
    code === 'EMPTY_TEXT' ||
    (status === 400 && (rawText.includes('empty') || rawText.includes('whitespace')))

  if (status === 401 || status === 403) {
    return t('homePage.errors.authRequired')
  }

  if (looksLikeEmptyTextError) {
    return lang === 'vi'
      ? 'Vui lòng nhập nội dung trước khi tóm tắt.'
      : 'Please enter text before summarizing.'
  }

  if (code === 'DAILY_WORD_LIMIT_EXCEEDED' || status === 429) {
    if (hasUsableBackendMessage) return backendMessage
    return lang === 'vi'
      ? 'Bạn đã dùng hết giới hạn từ hôm nay. Giới hạn sẽ reset lúc 00:00 ngày mai.'
      : 'You have reached your daily word limit. It will reset at 00:00 tomorrow.'
  }

  if (code === 'ML_SERVICE_UNAVAILABLE' || status === 503) {
    if (hasUsableBackendMessage) return backendMessage
    return lang === 'vi'
      ? 'Dịch vụ tóm tắt tạm thời không khả dụng. Vui lòng thử lại sau ít phút.'
      : 'The summarization service is temporarily unavailable. Please try again in a few minutes.'
  }

  if (looksLikeLimitError) {
    return lang === 'vi'
      ? 'Văn bản vượt quá giới hạn của gói hiện tại. Hãy rút ngắn nội dung hoặc nâng cấp gói để tóm tắt.'
      : 'Your text exceeds the limit for your current plan. Shorten it or upgrade your tier to continue.'
  }

  if (hasUsableBackendMessage) {
    return backendMessage
  }

  if (status === 400) {
    return lang === 'vi'
      ? 'Yêu cầu tóm tắt chưa hợp lệ. Vui lòng kiểm tra lại nội dung đầu vào.'
      : 'The summarize request is invalid. Please check your input and try again.'
  }

  if (status >= 500) {
    if (!looksLikeHtmlError && rawText.trim()) {
      return lang === 'vi'
        ? 'Máy chủ tạm thời không xử lý được yêu cầu tóm tắt. Vui lòng thử lại sau.'
        : 'The server cannot process this summarize request right now. Please try again later.'
    }
    return t('homePage.errors.serverError')
  }

  if (status > 0) {
    return lang === 'vi'
      ? `Không thể tóm tắt lúc này (mã ${status}). Vui lòng thử lại.`
      : `Unable to summarize right now (status ${status}). Please try again.`
  }

  return lang === 'vi'
    ? 'Không thể kết nối tới dịch vụ tóm tắt. Vui lòng kiểm tra mạng và thử lại.'
    : 'Cannot reach the summarization service. Please check your connection and try again.'
}

function getFileUploadErrorMessage(error, t, lang) {
  const status = Number(error?.status || 0)
  const data = error?.data
  const dataObject = data && typeof data === 'object' ? data : {}
  const code = String(dataObject?.error || dataObject?.code || dataObject?.error_code || '').toUpperCase()
  const backendMessage = String(dataObject?.message || '')
  const rawText = String(
    dataObject?.message ||
    dataObject?.error ||
    (typeof data === 'string' ? data : '') ||
    error?.message ||
    '',
  ).toLowerCase()

  const hasUsableBackendMessage =
    backendMessage.trim() &&
    backendMessage.length < 300 &&
    !backendMessage.toLowerCase().includes('<html') &&
    !backendMessage.toLowerCase().includes('<!doctype')

  if (status === 400 || code === 'UNSUPPORTED_FILE') {
    return lang === 'vi'
      ? 'Định dạng tệp không được hỗ trợ. Vui lòng tải lên file .pdf, .doc, .docx, .txt, .png, .jpg hoặc .jpeg.'
      : 'Unsupported file type. Please upload a .pdf, .doc, .docx, .txt, .png, .jpg, or .jpeg file.'
  }

  if (code === 'VALIDATION_ERROR') {
    if (hasUsableBackendMessage) return backendMessage
    return lang === 'vi'
      ? 'Tệp tải lên chưa hợp lệ. Vui lòng kiểm tra lại tệp và thử lại.'
      : 'The uploaded file is invalid. Please verify the file and try again.'
  }

  if (code === 'TEXT_EXTRACT_FAILED' || status === 422) {
    if (hasUsableBackendMessage) return backendMessage
    return lang === 'vi'
      ? 'Không thể trích xuất nội dung từ tệp này. Vui lòng thử tệp khác hoặc dán văn bản thủ công.'
      : 'We could not extract readable text from this file. Please try another file or paste the text manually.'
  }

  const looksLikeFileTooLarge =
    code === 'FILE_TOO_LARGE' ||
    (status === 413 && !rawText.includes('text_too_long')) ||
    rawText.includes('file too large') ||
    rawText.includes('payload too large') ||
    rawText.includes('request entity too large')

  if (looksLikeFileTooLarge) {
    return lang === 'vi'
      ? 'Tệp quá lớn để xử lý. Vui lòng chọn tệp nhỏ hơn.'
      : 'The file is too large to process. Please choose a smaller file.'
  }

  const looksLikeContentLimitError =
    code === 'TEXT_TOO_LONG' ||
    code === 'CHAR_LIMIT_EXCEEDED' ||
    code === 'WORD_LIMIT_EXCEEDED' ||
    code === 'INPUT_LIMIT_EXCEEDED' ||
    code === 'EMPTY_TEXT' ||
    rawText.includes('character limit') ||
    rawText.includes('word limit') ||
    rawText.includes('input limit') ||
    rawText.includes('too long') ||
    (rawText.includes('limit') && !rawText.includes('rate limit'))

  if (looksLikeContentLimitError) {
    return lang === 'vi'
      ? 'Nội dung trong tệp vượt quá giới hạn của gói hiện tại. Hãy rút gọn nội dung hoặc nâng cấp gói để tiếp tục.'
      : 'The file content exceeds the limit for your current plan. Shorten the content or upgrade your plan to continue.'
  }

  if (status === 429 || code === 'DAILY_EXTRACT_LIMIT_EXCEEDED' || code === 'DAILY_WORD_LIMIT_EXCEEDED') {
    if (hasUsableBackendMessage) return backendMessage
    return lang === 'vi'
      ? 'Bạn đã hết lượt trích xuất trong ngày. Vui lòng thử lại vào ngày mai.'
      : 'You have reached your daily extraction limit. Please try again tomorrow.'
  }

  if (code === 'ML_SERVICE_UNAVAILABLE' || status === 503) {
    if (hasUsableBackendMessage) return backendMessage
    return lang === 'vi'
      ? 'Dịch vụ tóm tắt tệp tạm thời không khả dụng. Vui lòng thử lại sau ít phút.'
      : 'The file summarization service is temporarily unavailable. Please try again in a few minutes.'
  }

  if (status === 401 || status === 403) {
    return t('homePage.errors.authRequired')
  }

  if (hasUsableBackendMessage) {
    return backendMessage
  }

  if (status === 400) {
    return lang === 'vi'
      ? 'Yêu cầu tóm tắt tệp chưa hợp lệ. Vui lòng kiểm tra lại tệp đầu vào.'
      : 'The file summarize request is invalid. Please verify the uploaded file.'
  }

  if (status >= 500) {
    return t('homePage.errors.serverError')
  }

  if (status > 0) {
    return lang === 'vi'
      ? `Không thể xử lý tệp lúc này (mã ${status}). Vui lòng thử lại.`
      : `Unable to process this file right now (status ${status}). Please try again.`
  }

  return lang === 'vi'
    ? 'Không thể kết nối tới dịch vụ tóm tắt tệp. Vui lòng kiểm tra mạng và thử lại.'
    : 'Cannot reach the file summarization service. Please check your connection and try again.'
}

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
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [downloadFormat, setDownloadFormat] = useState('txt')
  const [downloadName, setDownloadName] = useState('summary')
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)
  const [saveMenuOpen, setSaveMenuOpen] = useState(false)
  const [saveCollectionName, setSaveCollectionName] = useState('')
  const [selectedCollectionId, setSelectedCollectionId] = useState('')
  const [currentSummaryId, setCurrentSummaryId] = useState('')
  const [collectionOptions, setCollectionOptions] = useState([DEFAULT_SUMMARY_COLLECTION])
  const [collectionSearchQuery, setCollectionSearchQuery] = useState('')
  const [newCollectionName, setNewCollectionName] = useState('')
  const [collectionValidationError, setCollectionValidationError] = useState('')
  const [editingCollectionName, setEditingCollectionName] = useState('')
  const [editingCollectionColor, setEditingCollectionColor] = useState(DEFAULT_COLLECTION_COLOR)
  const [editingCollectionOriginal, setEditingCollectionOriginal] = useState('')
  const [userTier, setUserTier] = useState('free')
  const [collectionMetadata, setCollectionMetadata] = useState({})
  const saveToggleRef = useRef(null)
  const downloadToggleRef = useRef(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [feedbackRating, setFeedbackRating] = useState('dislike')
  const [feedbackReason, setFeedbackReason] = useState('missing_info')
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackSubmitError, setFeedbackSubmitError] = useState('')
  const [lastSummaryId, setLastSummaryId] = useState('')
  const [selectedUploadFile, setSelectedUploadFile] = useState(null)
  const [ocrBlocks, setOcrBlocks] = useState([])
  const [ocrData, setOcrData] = useState(null)

  useEffect(() => {
    let clearMessageTimer = null

    const handleLoadFromHistory = (event) => {
      const payload = event?.detail || {}
      const nextInputText = String(payload?.inputText || '')
      const nextSummaryText = String(payload?.summary || '')
      const nextSummaryId = String(payload?.summaryId || '').trim()

      if (!nextInputText && !nextSummaryText) return

      setInputText(nextInputText)
      setSummary(nextSummaryText)
      setLastSummaryId(nextSummaryId)
      setSelectedUploadFile(null)
      setMode(nextSummaryText ? 'summary' : 'extract')
      setErrorMessage('')
      setFeedbackSubmitError('')
      setIsFeedbackOpen(false)
      setSuccessMessage(lang === 'vi' ? 'Đã tải nội dung từ lịch sử.' : 'Loaded content from history.')

      if (clearMessageTimer) {
        window.clearTimeout(clearMessageTimer)
      }
      clearMessageTimer = window.setTimeout(() => setSuccessMessage(''), 3000)
    }

    window.addEventListener('history:load-summary', handleLoadFromHistory)
    return () => {
      window.removeEventListener('history:load-summary', handleLoadFromHistory)
      if (clearMessageTimer) {
        window.clearTimeout(clearMessageTimer)
      }
    }
  }, [lang])

  const resolveLatestSummaryId = async () => {
    try {
      const response = await historyApi.list({ page: 1, limit: 1 })
      return extractSummaryIdFromHistoryResponse(response)
    } catch {
      return ''
    }
  }

  const inputStats = countTextStats(inputText)
  const outputStats = countTextStats(summary)
  const isEmpty = !inputText.trim()

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setInputText(text)
        setSelectedUploadFile(null)
      }
    } catch {
      /* clipboard unavailable */
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setErrorMessage('')
    setSuccessMessage('')
    setSelectedUploadFile(file)
    setInputText('')
    setSummary('')
    setOcrBlocks([])
    setOcrData(null)
    setLastSummaryId('')
    setSuccessMessage(t('ocr.fileSelected'))
    window.setTimeout(() => setSuccessMessage(''), 3000)
    event.target.value = ''
  }

  const handleClear = () => {
    setInputText('')
    setSummary('')
    setOcrBlocks([])
    setOcrData(null)
    setLastSummaryId('')
    setSelectedUploadFile(null)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const getSavedCollections = () => {
    try {
      const raw = localStorage.getItem(SUMMARY_COLLECTION_STORAGE_KEY)
      if (!raw) return {}
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }

  const persistSavedCollections = (collections) => {
    localStorage.setItem(SUMMARY_COLLECTION_STORAGE_KEY, JSON.stringify(collections))
  }

  const getSavedCollectionColors = () => {
    try {
      const raw = localStorage.getItem(SUMMARY_COLLECTION_COLOR_STORAGE_KEY)
      if (!raw) return {}
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }

  const persistSavedCollectionColors = (colors) => {
    localStorage.setItem(SUMMARY_COLLECTION_COLOR_STORAGE_KEY, JSON.stringify(colors))
  }

  const isProTierUser = (tierValue = userTier) => {
    const normalized = String(tierValue || '').trim().toLowerCase()
    if (!normalized) return false
    return ['pro', 'premium', 'max', 'business', 'elite', 'vip', 'team'].some((token) => normalized.includes(token))
  }

  const canSaveCurrentOutput = () => {
    const textFromSummary = String(summary || '').trim()
    if (textFromSummary) return true

    const textFromOcr = String(
      ocrBlocks.join('\n\n') || extractOcrTextFromPayload(ocrData?.payload || ocrData) || '',
    ).trim()

    return Boolean(textFromOcr)
  }

  useEffect(() => {
    const loadUserTier = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        setUserTier('free')
        return
      }

      try {
        const response = await subscriptionsApi.me().catch(() => null)
        const data = response?.data || response || {}

        const tier =
          data?.tier ||
          data?.tier_name ||
          data?.plan?.tier ||
          data?.plan?.name ||
          data?.subscription?.tier ||
          data?.subscription?.plan?.tier ||
          data?.subscription?.plan?.name ||
          'free'

        setUserTier(String(tier).toLowerCase())
      } catch {
        setUserTier('free')
      }
    }

    loadUserTier()
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadCollectionOptions = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        if (isMounted) {
          setCollectionOptions([DEFAULT_SUMMARY_COLLECTION])
          setCollectionMetadata({})
        }
        return
      }

      try {
        const response = await collectionsApi.list({ page: 1, limit: 100 })
        const payload = response?.data || response || {}
        const rawCollections =
          payload?.items ||
          payload?.collections ||
          payload?.results ||
          (Array.isArray(payload) ? payload : [])

        const nextOptions = [DEFAULT_SUMMARY_COLLECTION]
        const nextMetadata = {}

        if (Array.isArray(rawCollections)) {
          rawCollections.forEach((collection) => {
            const name = String(collection?.name || collection?.title || collection?.collection_name || '').trim()
            if (!name) return
            if (!nextOptions.includes(name)) nextOptions.push(name)
            nextMetadata[name] = {
              id: collection?.id || collection?._id || collection?.collection_id || collection?.collectionId || null,
              color: getCollectionColor(name, DEFAULT_COLLECTION_COLOR),
            }
          })
        }

        const localColors = getSavedCollectionColors()
        Object.entries(localColors).forEach(([name, color]) => {
          if (name && !nextOptions.includes(name)) nextOptions.push(name)
        })

        if (isMounted) {
          setCollectionOptions(nextOptions)
          setCollectionMetadata(nextMetadata)
          const nextSelectedName = (saveCollectionName || DEFAULT_SUMMARY_COLLECTION)
          const nextCollectionId = nextSelectedName && nextSelectedName !== DEFAULT_SUMMARY_COLLECTION
            ? nextMetadata[nextSelectedName]?.id || ''
            : ''
          setSaveCollectionName((current) => (current && nextOptions.includes(current) ? current : ''))
          setSelectedCollectionId(nextCollectionId)
        }
      } catch {
        if (isMounted) {
          const localCollections = Object.keys(getSavedCollections()).filter(Boolean)
          const nextOptions = [DEFAULT_SUMMARY_COLLECTION, ...localCollections]
          setCollectionOptions(nextOptions)
          setCollectionMetadata({})
          setSaveCollectionName((current) => (current && nextOptions.includes(current) ? current : ''))
        }
      }
    }

    loadCollectionOptions()
    return () => {
      isMounted = false
    }
  }, [])

  const handleSaveSummaryToCollection = async (targetCollectionId = selectedCollectionId) => {
    const summaryIdToUse = currentSummaryId || lastSummaryId

    if (!summaryIdToUse) {
      setErrorMessage(lang === 'vi' ? 'Không tìm thấy bài tóm tắt để lưu.' : 'No summary found to save.')
      return
    }

    if (!targetCollectionId) {
      setErrorMessage(lang === 'vi' ? 'Vui lòng chọn Collection hợp lệ.' : 'Please select a valid collection.')
      return
    }

    try {
      await historyApi.update(summaryIdToUse, {
        collection_id: targetCollectionId,
      })

      setSuccessMessage(
        lang === 'vi'
          ? 'Đã lưu tóm tắt vào bộ sưu tập.'
          : 'Saved the summary to the selected collection.',
      )
      setSaveMenuOpen(false)
      window.dispatchEvent(new CustomEvent('history:updated'))
      window.setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      setErrorMessage(error?.message || (lang === 'vi' ? 'Lỗi khi lưu vào bộ sưu tập.' : 'Unable to save to the collection.'))
    }
  }

  const openCollectionEditor = (name = '') => {
    const normalized = String(name || '').trim()
    const editableName = normalized || DEFAULT_SUMMARY_COLLECTION
    setEditingCollectionOriginal(normalized || DEFAULT_SUMMARY_COLLECTION)
    setEditingCollectionName(editableName)
    setEditingCollectionColor(getCollectionColor(editableName, DEFAULT_COLLECTION_COLOR))
  }

  const handleUpdateCollectionSettings = async () => {
    const nextName = editingCollectionName.trim()
    if (!nextName) {
      setCollectionValidationError(lang === 'vi' ? 'Vui lòng nhập tên collection.' : 'Please enter a collection name.')
      return
    }

    const previousName = editingCollectionOriginal || DEFAULT_SUMMARY_COLLECTION
    const safePreviousName = previousName === DEFAULT_SUMMARY_COLLECTION ? DEFAULT_SUMMARY_COLLECTION : previousName
    const normalizedName = nextName.replace(/\s+/g, ' ').trim()

    const hasDuplicateName = collectionOptions.some(
      (name) => name.toLowerCase() === normalizedName.toLowerCase() && name !== safePreviousName,
    )
    if (hasDuplicateName) {
      setCollectionValidationError(
        lang === 'vi' ? 'Vui lòng nhập một tên collection khác.' : 'Please enter a different collection name.',
      )
      return
    }

    setCollectionValidationError('')

    if (normalizedName !== safePreviousName && safePreviousName !== DEFAULT_SUMMARY_COLLECTION) {
      const metadata = collectionMetadata[safePreviousName]
      if (metadata?.id) {
        try {
          await collectionsApi.update(metadata.id, { name: normalizedName, title: normalizedName, color: editingCollectionColor })
        } catch {
          // Keep the local fallback for the rename when the API is unavailable.
        }
      }
    }

    const storedColors = getSavedCollectionColors()
    if (safePreviousName && safePreviousName !== DEFAULT_SUMMARY_COLLECTION && safePreviousName !== normalizedName) {
      delete storedColors[safePreviousName]
    }
    storedColors[normalizedName] = editingCollectionColor
    persistSavedCollectionColors(storedColors)

    if (safePreviousName !== DEFAULT_SUMMARY_COLLECTION) {
      const savedMap = getSavedCollections()
      const previousItems = savedMap[safePreviousName] || []
      if (savedMap[safePreviousName]) delete savedMap[safePreviousName]
      if (normalizedName !== previousName) {
        savedMap[normalizedName] = previousItems
      }
      persistSavedCollections(savedMap)
    }

    setCollectionOptions((current) => {
      const withoutPrevious = current.filter((name) => name !== safePreviousName)
      return [...new Set([...withoutPrevious, normalizedName])]
    })
    setCollectionMetadata((current) => {
      const next = { ...current }
      if (safePreviousName !== DEFAULT_SUMMARY_COLLECTION && safePreviousName !== normalizedName) {
        delete next[safePreviousName]
      }
      next[normalizedName] = {
        id: current[safePreviousName]?.id || current[normalizedName]?.id || null,
        color: editingCollectionColor,
      }
      return next
    })
    if (saveCollectionName === safePreviousName) {
      setSaveCollectionName(normalizedName)
    }
    setEditingCollectionName('')
    setEditingCollectionOriginal('')
    setEditingCollectionColor(DEFAULT_COLLECTION_COLOR)
  }

  const filteredCollectionOptions = collectionOptions.filter((name) => {
    const target = String(name || '').toLowerCase()
    const query = collectionSearchQuery.trim().toLowerCase()
    return !query || target.includes(query)
  })

  const handleOpenSaveMenu = () => {
    if (!isProTierUser(userTier)) return
    if (saveMenuOpen) {
      setSaveMenuOpen(false)
      return
    }

    if (!saveCollectionName) {
      setSaveCollectionName(DEFAULT_SUMMARY_COLLECTION)
    }

    const button = saveToggleRef.current?.getBoundingClientRect()
    if (button) {
      const modalHeight = 320
      setMenuPosition({
        top: Math.max(12, button.top + window.scrollY - modalHeight + 18),
        left: Math.max(12, button.right + window.scrollX - 220),
      })
    }
    setSaveMenuOpen(true)
  }

  const handleCreateCollectionQuick = async () => {
    const nextName = newCollectionName.trim()
    if (!nextName) {
      setCollectionValidationError(lang === 'vi' ? 'Vui lòng nhập tên collection.' : 'Please enter a collection name.')
      return
    }

    const normalized = nextName.replace(/\s+/g, ' ').trim()
    const exists = collectionOptions.some((name) => name.toLowerCase() === normalized.toLowerCase())
    if (exists) {
      setCollectionValidationError(
        lang === 'vi' ? 'Vui lòng nhập một tên collection khác.' : 'Please enter a different collection name.',
      )
      setSaveCollectionName(normalized)
      setNewCollectionName('')
      setCollectionSearchQuery('')
      return
    }

    setCollectionValidationError('')

    try {
      const token = localStorage.getItem('accessToken')
      if (token) {
        await collectionsApi.create({ name: normalized, title: normalized })
      }
    } catch {
      // fall back to local-only storage below
    }

    const nextCollectionMap = getSavedCollections()
    nextCollectionMap[normalized] = nextCollectionMap[normalized] || []
    persistSavedCollections(nextCollectionMap)
    const nextColors = getSavedCollectionColors()
    nextColors[normalized] = nextColors[normalized] || DEFAULT_COLLECTION_COLOR
    persistSavedCollectionColors(nextColors)
    setCollectionOptions((current) => (current.includes(normalized) ? current : [...current, normalized]))
    setSaveCollectionName(normalized)
    setNewCollectionName('')
    setCollectionSearchQuery('')
  }

  const deriveDownloadNameFromDisposition = (contentDisposition, fallbackName = 'summary.docx') => {
    if (!contentDisposition) return fallbackName

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1])
      } catch {
        return utf8Match[1]
      }
    }

    const simpleMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
    if (simpleMatch?.[1]) return simpleMatch[1]
    return fallbackName
  }

  const extractSummaryTextFromPayload = (payload) => {
    const data = payload?.data || payload || {}
    const summaryText = String(
      data?.summary ||
      data?.summary_text ||
      data?.summaryText ||
      data?.output_text ||
      data?.outputText ||
      data?.content ||
      '',
    ).trim()
    const extractedText = String(
      data?.text ||
      data?.input_text ||
      data?.inputText ||
      data?.extracted_text ||
      data?.extractedText ||
      '',
    ).trim()
    return { summaryText, extractedText }
  }

  const extractOcrTextFromPayload = (payload) => {
    const extractTextCandidate = (value, seen = new WeakSet()) => {
      if (typeof value === 'string') {
        const trimmed = value.trim()
        return trimmed
      }

      if (Array.isArray(value)) {
        const collected = []
        for (const item of value) {
          const nested = extractTextCandidate(item, seen)
          if (nested) collected.push(nested)
        }
        return collected.join('\n').trim()
      }

      if (value && typeof value === 'object') {
        if (seen.has(value)) return ''
        seen.add(value)

        const entries = Object.entries(value)
        const priorityKeys = ['text', 'content', 'output_text', 'outputText', 'extracted_text', 'extractedText', 'ocr_text', 'ocrText', 'raw_text', 'rawText']

        for (const key of priorityKeys) {
          const directValue = value[key]
          if (directValue !== undefined && directValue !== null) {
            const result = extractTextCandidate(directValue, seen)
            if (result) return result
          }
        }

        for (const [key, nestedValue] of entries) {
          const normalizedKey = String(key).toLowerCase()
          if (
            normalizedKey.includes('text') ||
            normalizedKey.includes('content') ||
            normalizedKey.includes('ocr') ||
            normalizedKey.includes('result') ||
            normalizedKey.includes('data') ||
            normalizedKey.includes('page') ||
            normalizedKey.includes('block') ||
            normalizedKey.includes('line') ||
            normalizedKey.includes('paragraph')
          ) {
            const result = extractTextCandidate(nestedValue, seen)
            if (result) return result
          }
        }
      }

      return ''
    }

    if (payload === null || payload === undefined) return ''
    return extractTextCandidate(payload).trim()
  }

  const extractOcrBlocksFromPayload = (payload) => {
    const visit = (value, seen = new WeakSet(), depth = 0) => {
      if (!value) return []

      if (typeof value === 'string') {
        const trimmed = value.trim()
        return trimmed ? [trimmed] : []
      }

      if (Array.isArray(value)) {
        const items = []
        for (const item of value) {
          items.push(...visit(item, seen, depth + 1))
        }
        return items
      }

      if (typeof value !== 'object') return []
      if (seen.has(value)) return []
      seen.add(value)

      const blocks = []
      const objectEntries = Object.entries(value)

      for (const [key, nestedValue] of objectEntries) {
        const normalizedKey = String(key).toLowerCase()

        if (
          ['text', 'content', 'value', 'output_text', 'outputText', 'extracted_text', 'extractedText', 'ocr_text', 'ocrText', 'raw_text', 'rawText'].includes(normalizedKey)
        ) {
          const text = typeof nestedValue === 'string' ? nestedValue.trim() : ''
          if (text) blocks.push(text)
        }

        if (
          normalizedKey === 'blocks' ||
          normalizedKey === 'pages' ||
          normalizedKey === 'lines' ||
          normalizedKey === 'paragraphs' ||
          normalizedKey === 'items' ||
          normalizedKey === 'results' ||
          normalizedKey === 'data'
        ) {
          blocks.push(...visit(nestedValue, seen, depth + 1))
        }
      }

      if (!blocks.length) {
        for (const nestedValue of Object.values(value)) {
          blocks.push(...visit(nestedValue, seen, depth + 1))
        }
      }

      return blocks.filter((text) => typeof text === 'string' && text.trim()).map((text) => text.trim())
    }

    const blocks = visit(payload)
    return blocks.filter((text, index) => text && blocks.indexOf(text) === index)
  }

  const handleSummarize = async () => {
    if (!inputText.trim() && !selectedUploadFile) return

    if (mode === 'ocr' && !selectedUploadFile) {
      setErrorMessage(t('ocr.requiresUpload'))
      return
    }

    setIsLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      if (selectedUploadFile) {
        if (mode === 'ocr') {
          const dimensions = await getFileDimensions(selectedUploadFile)
          const response = await ocrApi.process(selectedUploadFile, {
            extract_layout: true,
            auth: false,
          })

          const payload = response?.data || response || {}
          const extractedText = extractOcrTextFromPayload(payload)
          const ocrBlocks = extractOcrBlocksFromPayload(payload)

          setOcrData({ payload, dimensions })

          if (extractedText || ocrBlocks.length) {
            setSummary(ocrBlocks.join('\n\n') || extractedText)
            setOcrBlocks(ocrBlocks.length ? ocrBlocks : [extractedText])
            setSuccessMessage(t('ocr.success'))
            window.setTimeout(() => setSuccessMessage(''), 3000)
            return
          }

          setSummary('')
          setOcrData({ payload, dimensions })
          setErrorMessage(t('ocr.noText'))
          return
        }

        const formData = new FormData()
        formData.append('file', selectedUploadFile)
        formData.append('do_summarize', String(mode === 'summary'))
        formData.append('length_type', LENGTH_MAP[lengthIndex] || 'medium')

        const response = await summarizeApi.file(formData)
        const contentType = String(response?.contentType || '').toLowerCase()

        const shouldTryJsonPayload =
          contentType.includes('application/json') ||
          contentType.startsWith('text/') ||
          !String(response?.contentDisposition || '').trim()

        if (shouldTryJsonPayload) {
          try {
            const textPayload = await response.blob.text()
            const parsedPayload = JSON.parse(textPayload)
            const { summaryText, extractedText } = extractSummaryTextFromPayload(parsedPayload)

            if (mode === 'extract') {
              if (extractedText) {
                setSummary('')
                setSuccessMessage(
                  lang === 'vi'
                    ? 'Tệp đã được trích xuất thành công.'
                    : 'File text extracted successfully.',
                )
                window.setTimeout(() => setSuccessMessage(''), 3000)
                return
              }
            } else if (summaryText) {
              setSummary(summaryText)
              setSuccessMessage(
                lang === 'vi'
                  ? 'Tóm tắt tệp thành công.'
                  : 'File summarized successfully.',
              )
              window.setTimeout(() => setSuccessMessage(''), 3000)
              return
            }
          } catch {
            // Not a JSON payload, continue with binary download flow.
          }
        }

        if (mode === 'extract') {
          setSummary('')
          setSuccessMessage(
            lang === 'vi'
              ? 'Đã trích xuất văn bản từ tệp.'
              : 'The file text has been extracted.',
          )
          window.setTimeout(() => setSuccessMessage(''), 3000)
          return
        }

        const fallbackName = `${selectedUploadFile.name.replace(/\.(pdf|docx|txt)$/i, '')}-summary.${selectedUploadFile.name.toLowerCase().endsWith('.pdf') ? 'pdf' : selectedUploadFile.name.toLowerCase().endsWith('.txt') ? 'txt' : 'docx'}`
        const outputName = deriveDownloadNameFromDisposition(response?.contentDisposition, fallbackName)

        const url = URL.createObjectURL(response.blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = outputName
        anchor.click()
        URL.revokeObjectURL(url)

        setSummary('')
        setSuccessMessage(
          lang === 'vi'
            ? 'Tóm tắt tệp thành công. Kết quả đã được tải xuống.'
            : 'File summarized successfully. The result has been downloaded.',
        )
        window.setTimeout(() => setSuccessMessage(''), 3000)
        return
      }

      const selectedSummaryLength = LENGTH_MAP[lengthIndex] || 'medium'
      const response = await summarizeApi.text({
        text: inputText,
        mode,
        output_format: outputFormat,
        summary_length_ratio: selectedSummaryLength,
        collection_id: selectedCollectionId || null,
      })
      const nextSummary = response?.data?.summary || ''
      const directSummaryId = extractSummaryId(response)
      setCurrentSummaryId(response?.data?.id || response?.id || directSummaryId || currentSummaryId)
      if (directSummaryId) {
        setLastSummaryId(directSummaryId)
      } else if (nextSummary) {
        const fallbackSummaryId = await resolveLatestSummaryId()
        setLastSummaryId(fallbackSummaryId)
      }

      if (nextSummary) {
        setSummary(nextSummary)
        setSuccessMessage(lang === 'vi' ? 'Tóm tắt hoàn tất thành công.' : 'Summarization completed successfully.')
        window.setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setSummary(lang === 'vi' ? 'Không nhận được kết quả tóm tắt từ máy chủ.' : 'No summary was returned by the server.')
      }
    } catch (error) {
      setSummary('')
      if (selectedUploadFile) {
        setErrorMessage(getFileUploadErrorMessage(error, t, lang))
      } else {
        setErrorMessage(getSummarizeErrorMessage(error, t, lang))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!summary) return
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openFeedbackForm = (rating) => {
    setFeedbackRating(rating)
    setFeedbackReason('missing_info')
    setFeedbackText('')
    setFeedbackSubmitError('')
    setIsFeedbackOpen(true)
  }

  const closeFeedbackForm = () => {
    setIsFeedbackOpen(false)
    setFeedbackSubmitError('')
  }

  const handleSendFeedback = async () => {
    if (!summary) return

    const trimmedComment = feedbackText.trim()
    const resolvedSummaryId = lastSummaryId || await resolveLatestSummaryId()
    if (!resolvedSummaryId) {
      setFeedbackSubmitError(t('feedback.summaryIdRequired'))
      return
    }
    if (resolvedSummaryId !== lastSummaryId) {
      setLastSummaryId(resolvedSummaryId)
    }
    if (!trimmedComment) {
      setFeedbackSubmitError(t('feedback.commentRequired'))
      return
    }

    setFeedbackSubmitting(true)
    setFeedbackSubmitError('')

    try {
      await feedbacksApi.create({
        summary_id: resolvedSummaryId,
        rating: feedbackRating,
        error_reason: feedbackRating === 'dislike' ? feedbackReason : undefined,
        comment: trimmedComment,
      })

      closeFeedbackForm()
      setSuccessMessage(t('feedback.submitted'))
      window.setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        setFeedbackSubmitError(t('feedback.authRequired'))
      } else {
        setFeedbackSubmitError(t('feedback.submitFailed'))
      }
    } finally {
      setFeedbackSubmitting(false)
    }
  }

  const buildDownloadFileName = (ext, customName = downloadName) => {
    const trimmedName = (customName || 'summary').trim().replace(/[\\/:*?"<>|]+/g, '').trim()
    const baseName = trimmedName || 'summary'
    const normalizedExt = ext.toLowerCase()
    return baseName.endsWith(`.${normalizedExt}`) ? baseName : `${baseName}.${normalizedExt}`
  }

  const handleDownload = (ext = downloadFormat, name = downloadName) => {
    if (!summary) return
    const selectedExt = ext || 'txt'
    const fileName = buildDownloadFileName(selectedExt, name)

    if (selectedExt === 'pdf') {
      generatePDF(fileName)
      return
    }
    if (selectedExt === 'docx') {
      generateDocx(fileName)
      return
    }

    let content = summary
    let mime = 'text/plain'

    if (selectedExt === 'md') {
      mime = 'text/markdown'
      content = `# Summary\n\n${summary}`
    }

    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
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
    const menuWidth = 260
    setMenuPosition({ top: rect.bottom + window.scrollY + 6, left: Math.max(8, rect.right + window.scrollX - menuWidth) })
    setDownloadMenuOpen(true)
  }

  const generatePDF = (fileName = 'summary.pdf') => {
    try {
      const doc = new jsPDF()
      const margin = 10
      const pageWidth = doc.internal.pageSize.getWidth() - margin * 2
      const lines = doc.splitTextToSize(summary, pageWidth)
      doc.setFontSize(12)
      doc.text(lines, margin, margin + 5)
      const blob = doc.output('blob')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      const blob = new Blob([summary], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const generateDocx = async (fileName = 'summary.docx') => {
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
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      const blob = new Blob([summary], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
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
        <h1 className="text-3xl font-black tracking-tight text-[#050505] dark:text-white sm:text-4xl">
          {t('hero.title')}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-[#1f1f1f] dark:text-slate-400 sm:text-base">
          {t('hero.subtitle')}
        </p>
      </section>

      {/* Controls */}
      <section className="flex flex-col gap-4 rounded-2xl border border-surface-border bg-surface-raised/60 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex flex-col gap-4 sm:min-w-[280px]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {t('controls.mode')}
            </span>
            <div className="flex rounded-xl border border-surface-border bg-surface-base p-1">
              {['summary', 'extract', 'ocr'].map((option) => {
                const isActive = mode === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMode(option)}
                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                      isActive
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

          {selectedUploadFile && (
            <div className="border-b border-surface-border bg-surface-base/50 px-4 py-3">
              <div className="flex items-center gap-3 rounded-2xl border border-surface-border bg-surface-raised p-3 shadow-lg shadow-black/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700 text-xs font-bold uppercase tracking-[0.2em] text-slate-200">
                  {String(selectedUploadFile.name || 'FILE').split('.').pop()?.slice(0, 3)?.toUpperCase() || 'FILE'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{t('input.fileLabel')}</div>
                  <div className="truncate text-sm font-medium text-slate-100">{selectedUploadFile.name}</div>
                </div>
              </div>
            </div>
          )}

          <div className="relative flex-1">
            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value)
                if (selectedUploadFile) {
                  setSelectedUploadFile(null)
                }
              }}
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
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
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
              {errorMessage ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
                  {errorMessage}
                </div>
              ) : mode === 'ocr' ? (
                <OcrOutputBox ocrData={ocrData} isLoading={isLoading} t={t} />
              ) : (
                <div className="whitespace-pre-wrap">{summary || t('output.placeholder')}</div>
              )}
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
                    onClick={() => openFeedbackForm('like')}
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
                    onClick={() => openFeedbackForm('dislike')}
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
                    style={{
                      position: 'fixed',
                      top: `${menuPosition.top}px`,
                      left: `${menuPosition.left}px`,
                      zIndex: 9999,
                      width: 260,
                    }}
                    className="rounded-xl border border-surface-border bg-surface-raised p-4 shadow-2xl backdrop-blur-md"
                  >
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {t('output.fileName')}
                        </label>
                        <input
                          type="text"
                          value={downloadName}
                          onChange={(e) => setDownloadName(e.target.value)}
                          placeholder={t('output.fileNamePlaceholder')}
                          className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-accent focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {t('output.format')}
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {['pdf', 'docx', 'txt', 'md'].map((fmt) => (
                            <button
                              key={fmt}
                              type="button"
                              onClick={() => setDownloadFormat(fmt)}
                              className={`rounded-md py-1.5 text-xs font-semibold uppercase transition ${
                                downloadFormat === fmt
                                  ? 'bg-accent text-surface-base'
                                  : 'bg-surface-base text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              .{fmt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          handleDownload(downloadFormat, downloadName)
                          setDownloadMenuOpen(false)
                        }}
                        className="w-full rounded-lg bg-accent py-2 text-xs font-bold text-surface-base shadow-md shadow-accent/20 transition hover:bg-accent-hover"
                      >
                        {t('output.download')}
                      </button>
                    </div>
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
      <div className="pb-4">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleSummarize}
            disabled={(!inputText.trim() && !selectedUploadFile) || isLoading}
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

          <div className="relative" ref={saveToggleRef}>
            <button
              type="button"
              onClick={handleOpenSaveMenu}
              title={t('output.saveToCollection')}
              aria-label={t('output.saveToCollection')}
              disabled={!canSaveCurrentOutput() || !isProTierUser(userTier)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-surface-border bg-surface-raised text-slate-200 shadow-lg shadow-black/10 transition hover:border-accent/60 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 4.75h9.5l2.75 2.75V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6.75a2 2 0 0 1 2-2Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 4.75v5.5h7v-5.5M9 18.25h6" />
              </svg>
            </button>

            {saveMenuOpen && (
              <div
                className="fixed z-[9999] w-72 rounded-xl border border-surface-border bg-surface-raised p-3 shadow-2xl backdrop-blur-md"
                style={{
                  top: `${menuPosition.top}px`,
                  left: `${menuPosition.left}px`,
                }}
              >
                {editingCollectionName ? (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {t('output.chooseCollection')}
                      </label>
                      <input
                        type="text"
                        value={editingCollectionName}
                        onChange={(event) => setEditingCollectionName(event.target.value)}
                        className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-accent focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Color
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {COLLECTION_SWATCHES.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditingCollectionColor(color)}
                            className={`h-7 w-7 rounded-full border-2 transition ${
                              editingCollectionColor === color ? 'border-white scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                            aria-label={`Select color ${color}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleUpdateCollectionSettings}
                        className="flex-1 rounded-lg bg-accent py-2 text-[10px] font-bold text-surface-base transition hover:bg-accent-hover"
                      >
                        {t('subscriptionsForm.update')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCollectionName('')
                          setEditingCollectionOriginal('')
                          setEditingCollectionColor(DEFAULT_COLLECTION_COLOR)
                        }}
                        className="flex-1 rounded-lg bg-surface-elevated py-2 text-[10px] font-bold text-slate-200 transition hover:bg-surface-base"
                      >
                        {t('subscriptionsForm.cancelEdit')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        {t('output.chooseCollection')}
                      </span>
                    </div>

                    <div className="mb-3">
                      <input
                        type="text"
                        value={collectionSearchQuery}
                        onChange={(event) => setCollectionSearchQuery(event.target.value)}
                        placeholder={t('output.searchCollection')}
                        className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-accent focus:outline-none"
                      />
                    </div>

                    <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-surface-border bg-surface-base/50 p-2">
                      {filteredCollectionOptions.length === 0 ? (
                        <p className="text-[11px] text-slate-400">{t('output.noCollections')}</p>
                      ) : (
                        filteredCollectionOptions.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={async () => {
                              const nextCollectionId = name === DEFAULT_SUMMARY_COLLECTION ? '' : collectionMetadata[name]?.id || ''
                              const summaryIdToUse = currentSummaryId || lastSummaryId

                              setSaveCollectionName(name)
                              setSelectedCollectionId(nextCollectionId)

                              if (!summaryIdToUse) {
                                setErrorMessage(
                                  lang === 'vi'
                                    ? 'Vui lòng tạo hoặc mở một bản tóm tắt trước khi lưu vào collection.'
                                    : 'Please generate or open a summary before saving to a collection.',
                                )
                                return
                              }

                              if (nextCollectionId) {
                                await handleSaveSummaryToCollection(nextCollectionId)
                              } else {
                                setSuccessMessage(
                                  lang === 'vi' ? 'Đã chọn Default collection.' : 'Default collection selected.',
                                )
                                window.setTimeout(() => setSuccessMessage(''), 1500)
                              }
                            }}
                            className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition ${
                              (saveCollectionName || DEFAULT_SUMMARY_COLLECTION) === name
                                ? 'bg-accent/15 text-white ring-1 ring-accent/40'
                                : 'text-slate-300 hover:bg-surface-elevated hover:text-white'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: getCollectionColor(name, DEFAULT_COLLECTION_COLOR) }}
                              />
                              {name}
                            </span>
                            {(saveCollectionName || DEFAULT_SUMMARY_COLLECTION) === name && <span className="text-[10px]">✓</span>}
                          </button>
                        ))
                      )}
                    </div>

                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {successMessage && (
          <div className="mx-auto mt-3 max-w-fit rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
            {successMessage}
          </div>
        )}
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
                onClick={closeFeedbackForm}
                className="rounded-full p-2 text-slate-400 transition hover:bg-surface-elevated hover:text-white"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              {feedbackRating === 'dislike' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-200" htmlFor="feedback-reason">
                    {t('feedback.errorReasonLabel')}
                  </label>
                  <select
                    id="feedback-reason"
                    value={feedbackReason}
                    onChange={(e) => setFeedbackReason(e.target.value)}
                    className="w-full rounded-2xl border border-surface-border bg-surface-base px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    {DISLIKE_REASONS.map((reason) => (
                      <option key={reason} value={reason}>{t(`feedback.reasons.${reason}`)}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-200" htmlFor="feedback-detail">
                  {feedbackRating === 'like' ? t('feedback.likeCommentLabel') : t('feedback.detailsLabel')}
                </label>
                <textarea
                  id="feedback-detail"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={4}
                  placeholder={feedbackRating === 'like' ? t('feedback.likePlaceholder') : t('feedback.placeholder')}
                  className="w-full resize-none rounded-3xl border border-surface-border bg-surface-base px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              {feedbackSubmitError && (
                <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {feedbackSubmitError}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3 border-t border-surface-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-slate-400">{t('feedback.note')}</span>
              <button
                type="button"
                onClick={handleSendFeedback}
                disabled={!summary || feedbackSubmitting}
                className="inline-flex items-center justify-center rounded-3xl bg-accent px-5 py-3 text-sm font-semibold text-surface-base transition hover:bg-accent-hover disabled:opacity-40"
              >
                {feedbackSubmitting ? t('feedback.sending') : t('feedback.send')}
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