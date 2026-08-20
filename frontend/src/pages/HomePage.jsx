import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { collectionsApi, feedbacksApi, historyApi, ocrApi, subscriptionsApi, summarizeApi } from '../utils/api'
import OcrOutputBox from '../components/OcrOutputBox'
import { getFileDimensions } from '../utils/fileDimensions'
import { countTextStats } from '../utils/textStats'
import { Document, Font, Page, StyleSheet, Text, pdf } from '@react-pdf/renderer'
import { Document as DocxDocument, Packer, Paragraph, TextRun } from 'docx'

Font.register({
  family: 'Noto Sans Vietnamese',
  src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Regular.ttf',
})

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
  const [isCreatingCollection, setIsCreatingCollection] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createColor, setCreateColor] = useState(DEFAULT_COLLECTION_COLOR)
  const [createError, setCreateError] = useState('')
  const [isSubmittingCollection, setIsSubmittingCollection] = useState(false)
  const [selectedCollectionId, setSelectedCollectionId] = useState('')
  const [selectedCollectionName, setSelectedCollectionName] = useState('')
  const [selectedCollectionColor, setSelectedCollectionColor] = useState('')
  const [collections, setCollections] = useState([])
  const [collectionSearchQuery, setCollectionSearchQuery] = useState('')
  const [maxFolders, setMaxFolders] = useState(0)
  const [userTier, setUserTier] = useState('free')
  const [currentSummaryId, setCurrentSummaryId] = useState('')
  const saveContainerRef = useRef(null)
  const downloadToggleRef = useRef(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [feedbackRating, setFeedbackRating] = useState(0)
  const [feedbackCriteria, setFeedbackCriteria] = useState([])
  const [feedbackSelectedTags, setFeedbackSelectedTags] = useState([])
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackSubmitError, setFeedbackSubmitError] = useState('')
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [feedbackWizardStep, setFeedbackWizardStep] = useState('stars')
  const [feedbackStarMenuOpen, setFeedbackStarMenuOpen] = useState(false)
  const [feedbackCriteriaLoading, setFeedbackCriteriaLoading] = useState(false)
  const [feedbackTargetType, setFeedbackTargetType] = useState('summary')
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
      setFeedbackModalOpen(false)
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
    const loadUserSubscription = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        setUserTier('free')
        setMaxFolders(0)
        return
      }

      try {
        const [subResponse, plansResponse] = await Promise.all([
          subscriptionsApi.me().catch(() => null),
          subscriptionsApi.plans().catch(() => null),
        ])

        const subData = subResponse?.data || subResponse || {}
        const planObj = subData?.plan || subData?.subscription?.plan || subData?.subscription || {}

        let folders =
          subData?.max_folders ??
          subData?.maxFolders ??
          planObj?.max_folders ??
          planObj?.maxFolders ??
          null

        if (folders === null && plansResponse) {
          const plansList = plansResponse?.data?.plans || plansResponse?.data || plansResponse || []
          const currentPlanId = subData?.plan_id || subData?.planId || planObj?.id || planObj?.plan_id
          const currentTier = String(subData?.tier || planObj?.tier || planObj?.name || 'free').toLowerCase()

          if (Array.isArray(plansList)) {
            const matched = plansList.find((p) =>
              (currentPlanId && (p?.id === currentPlanId || p?.plan_id === currentPlanId)) ||
              (String(p?.name || p?.tier || '').toLowerCase() === currentTier),
            )
            if (matched) {
              folders = matched?.max_folders ?? matched?.maxFolders ?? null
            }
          }
        }

        const tier =
          subData?.tier ||
          subData?.tier_name ||
          planObj?.tier ||
          planObj?.name ||
          'free'

        setUserTier(String(tier).toLowerCase())
        setMaxFolders(Number(folders ?? 0))
      } catch {
        setUserTier('free')
        setMaxFolders(0)
      }
    }

    loadUserSubscription()
  }, [])

  const loadCollections = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setCollections([])
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

      const nextCollections = []
      if (Array.isArray(rawCollections)) {
        rawCollections.forEach((c) => {
          const name = String(c?.name || c?.title || '').trim()
          const id = c?.id || c?._id || c?.collection_id
          if (name && id) {
            const color = c?.color || getCollectionColor(name, DEFAULT_COLLECTION_COLOR)
            nextCollections.push({ id, name, title: name, color })
          }
        })
      }

      setCollections(nextCollections)
    } catch {
      setCollections([])
    }
  }

  useEffect(() => {
    loadCollections()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (saveContainerRef.current && !saveContainerRef.current.contains(event.target)) {
        setSaveMenuOpen(false)
        setIsCreatingCollection(false)
      }
    }

    if (saveMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [saveMenuOpen])

  const handleCreateCollection = async () => {
    const trimmed = createTitle.trim()
    if (!trimmed) {
      setCreateError(lang === 'vi' ? 'Vui lòng nhập tên bộ sưu tập.' : 'Please enter a collection title.')
      return
    }

    const exists = collections.some(
      (c) => String(c?.name || c?.title || '').trim().toLowerCase() === trimmed.toLowerCase(),
    )
    if (exists) {
      setCreateError(lang === 'vi' ? 'Tên bộ sưu tập đã tồn tại.' : 'Collection title already exists.')
      return
    }

    setIsSubmittingCollection(true)
    setCreateError('')

    try {
      const response = await collectionsApi.create({
        name: trimmed,
        title: trimmed,
        color: createColor,
      })

      const payload = response?.data || response || {}
      const newId = payload?.id || payload?._id || payload?.collection_id || `col-${Date.now()}`
      const newCollection = {
        id: newId,
        name: trimmed,
        title: trimmed,
        color: createColor,
      }

      const localColors = getSavedCollectionColors()
      localColors[trimmed] = createColor
      persistSavedCollectionColors(localColors)

      setCollections((prev) => [...prev, newCollection])
      setSelectedCollectionId(newId)
      setSelectedCollectionName(trimmed)
      setSelectedCollectionColor(createColor)

      setCreateTitle('')
      setCreateError('')
      setIsCreatingCollection(false)
      setSaveMenuOpen(false)

      setSuccessMessage(
        lang === 'vi'
          ? `Đã tạo và chọn bộ sưu tập "${trimmed}".`
          : `Created and selected collection "${trimmed}".`,
      )
      window.setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setCreateError(err?.message || (lang === 'vi' ? 'Không thể tạo bộ sưu tập.' : 'Failed to create collection.'))
    } finally {
      setIsSubmittingCollection(false)
    }
  }

  const filteredCollections = collections.filter((c) => {
    const target = String(c?.name || c?.title || '').toLowerCase()
    const query = collectionSearchQuery.trim().toLowerCase()
    return !query || target.includes(query)
  })

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
        if (selectedCollectionId) {
          formData.append('collection_id', selectedCollectionId)
        }

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
      const textPayload = {
        text: inputText,
        do_summarize: mode === 'summary',
        length_type: selectedSummaryLength,
      }
      if (selectedCollectionId) {
        textPayload.collection_id = selectedCollectionId
      }

      const response = await summarizeApi.text(textPayload)
      const nextSummary =
        response?.data?.summary ||
        response?.data?.text ||
        response?.data?.extracted_text ||
        response?.summary ||
        response?.text ||
        ''
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

  const fetchFeedbackCriteria = async (ratingValue, targetType = feedbackTargetType) => {
    setFeedbackCriteriaLoading(true)
    setFeedbackSubmitError('')

    try {
      const response = await feedbacksApi.criteria({ target_type: targetType, rating: ratingValue })
      const rawCriteria = response?.criteria || response?.data?.criteria || []
      setFeedbackCriteria(Array.isArray(rawCriteria) ? rawCriteria : [])
    } catch {
      setFeedbackCriteria([])
    } finally {
      setFeedbackCriteriaLoading(false)
    }
  }

  const handleFeedbackRatingSelection = async (ratingValue) => {
    setFeedbackRating(ratingValue)
    setFeedbackSelectedTags([])
    setFeedbackText('')
    setFeedbackSubmitError('')
    setFeedbackWizardStep('criteria')
    await fetchFeedbackCriteria(ratingValue, feedbackTargetType)
  }

  const openFeedbackForm = (ratingValue = 0, targetType = 'summary') => {
    setFeedbackTargetType(targetType)
    setFeedbackModalOpen(true)
    setFeedbackText('')
    setFeedbackSelectedTags([])
    setFeedbackSubmitError('')
    setFeedbackWizardStep('stars')
    setFeedbackRating(0)
    setFeedbackCriteria([])
    setFeedbackStarMenuOpen(false)

    if (ratingValue > 0) {
      setFeedbackTargetType(targetType)
      handleFeedbackRatingSelection(ratingValue)
    }
  }

  const openSummaryFeedbackForm = (ratingValue = 0) => {
    openFeedbackForm(ratingValue, 'summary')
  }

  const openSystemFeedbackForm = (ratingValue = 0) => {
    openFeedbackForm(ratingValue, 'system')
  }

  const closeFeedbackForm = () => {
    setFeedbackModalOpen(false)
    setFeedbackStarMenuOpen(false)
    setFeedbackWizardStep('stars')
    setFeedbackRating(0)
    setFeedbackSelectedTags([])
    setFeedbackText('')
    setFeedbackSubmitError('')
    setFeedbackCriteria([])
  }

  const toggleFeedbackTag = (tag) => {
    setFeedbackSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    )
  }

  const handleSendFeedback = async () => {
    const trimmedComment = feedbackText.trim()

    if (feedbackRating < 1 || feedbackRating > 5) {
      setFeedbackSubmitError(t('feedback.submitFailed'))
      return
    }
    if (feedbackRating <= 3 && feedbackSelectedTags.length === 0 && !trimmedComment) {
      setFeedbackSubmitError(
        lang === 'vi'
          ? 'Vui lòng chọn ít nhất một tiêu chí hoặc viết nhận xét.'
          : 'Please select at least one issue or add a comment.',
      )
      return
    }

    setFeedbackSubmitting(true)
    setFeedbackSubmitError('')

    try {
      const payload = {
        target_type: feedbackTargetType,
        rating: feedbackRating,
        tags: feedbackSelectedTags,
        comment: trimmedComment,
      }

      if (summary && (lastSummaryId || currentSummaryId)) {
        payload.summary_id = lastSummaryId || currentSummaryId
      }

      await feedbacksApi.create(payload)

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

  const generatePDF = async (fileName = 'summary.pdf') => {
    try {
      const styles = StyleSheet.create({
        page: {
          padding: 28,
          paddingTop: 32,
          backgroundColor: '#ffffff',
        },
        content: {
          fontFamily: 'Noto Sans Vietnamese',
          fontSize: 12,
          lineHeight: 1.7,
          color: '#111827',
        },
      })

      const content = summary || ''
      const blob = await pdf(
        <Document>
          <Page size="A4" style={styles.page}>
            <Text style={styles.content}>{content}</Text>
          </Page>
        </Document>
      ).toBlob()

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

            <div className="relative flex items-center gap-2">
              {summary && (
                <div
                  className="relative"
                  onMouseEnter={() => setFeedbackStarMenuOpen(true)}
                  onMouseLeave={() => setFeedbackStarMenuOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => openSummaryFeedbackForm()}
                    className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-slate-300 transition hover:bg-surface-elevated hover:text-white"
                    aria-label={lang === 'vi' ? 'Đánh giá tóm tắt' : 'Summary feedback'}
                  >
                    <span>{lang === 'vi' ? 'Đánh giá tóm tắt' : 'Summary feedback'}</span>
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" />
                    </svg>
                  </button>

                  {feedbackStarMenuOpen && (
                    <div className="absolute right-0 top-full z-30 mt-2 rounded-xl border border-surface-border bg-surface-raised/95 p-2 shadow-2xl backdrop-blur-md">
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => {
                              setFeedbackTargetType('summary')
                              handleFeedbackRatingSelection(star)
                              setFeedbackModalOpen(true)
                            }}
                            className="rounded-md p-1 text-slate-600 transition hover:bg-surface-elevated hover:text-yellow-300"
                            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                          >
                            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="h-4 w-4">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.922-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.785.57-1.84-.196-1.54-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.027 8.72c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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

          <div className="relative" ref={saveContainerRef}>
            <button
              type="button"
              onClick={() => {
                if (maxFolders <= 0) return
                setSaveMenuOpen((prev) => !prev)
                setIsCreatingCollection(false)
              }}
              disabled={maxFolders <= 0}
              title={
                maxFolders <= 0
                  ? (lang === 'vi' ? 'Nâng cấp gói để sử dụng bộ sưu tập' : 'Upgrade your plan to use collections')
                  : (selectedCollectionName
                      ? (lang === 'vi' ? `Bộ sưu tập: ${selectedCollectionName}` : `Collection: ${selectedCollectionName}`)
                      : (lang === 'vi' ? 'Chọn bộ sưu tập lưu trữ' : 'Select collection'))
              }
              aria-label={t('output.saveToCollection')}
              className={`flex h-12 items-center gap-2 rounded-2xl border px-3.5 text-sm font-medium shadow-lg shadow-black/10 transition disabled:cursor-not-allowed disabled:opacity-40 ${
                selectedCollectionId
                  ? 'border-accent/60 bg-accent/15 text-white ring-1 ring-accent/40'
                  : 'border-surface-border bg-surface-raised text-slate-200 hover:border-accent/60 hover:text-accent'
              }`}
            >
              {selectedCollectionId && selectedCollectionColor ? (
                <span
                  className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: selectedCollectionColor }}
                />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 4.75h9.5l2.75 2.75V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6.75a2 2 0 0 1 2-2Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 4.75v5.5h7v-5.5M9 18.25h6" />
                </svg>
              )}
              <span className="max-w-[120px] truncate text-xs">
                {selectedCollectionId ? selectedCollectionName : (lang === 'vi' ? 'Lưu' : 'Save')}
              </span>
            </button>

            {saveMenuOpen && (
              <div className="absolute bottom-full right-0 mb-3 z-50 flex items-start gap-3">
                {/* Main Collections Dropdown */}
                <div className="w-72 rounded-2xl border border-surface-border bg-surface-raised/95 p-3.5 shadow-2xl backdrop-blur-xl">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {lang === 'vi' ? 'Lưu vào bộ sưu tập' : 'Save to collection'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSaveMenuOpen(false)
                        setIsCreatingCollection(false)
                      }}
                      className="rounded-lg p-1 text-slate-400 transition hover:bg-surface-elevated hover:text-white"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="mb-2.5">
                    <input
                      type="text"
                      value={collectionSearchQuery}
                      onChange={(e) => setCollectionSearchQuery(e.target.value)}
                      placeholder={lang === 'vi' ? 'Tìm bộ sưu tập...' : 'Search collection...'}
                      className="w-full rounded-xl border border-surface-border bg-surface-base px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                    {/* Default (General History) Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCollectionId('')
                        setSelectedCollectionName('')
                        setSelectedCollectionColor('')
                        setSaveMenuOpen(false)
                        setIsCreatingCollection(false)
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs transition ${
                        !selectedCollectionId
                          ? 'bg-accent/15 text-accent ring-1 ring-accent/30 font-medium'
                          : 'text-slate-300 hover:bg-surface-elevated hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                        <span>{lang === 'vi' ? 'Mặc định (Lịch sử chung)' : 'Default (General History)'}</span>
                      </span>
                      {!selectedCollectionId && <span className="text-[11px] font-bold">✓</span>}
                    </button>

                    {/* User's Collections List */}
                    {filteredCollections.map((col) => {
                      const isSelected = selectedCollectionId === col.id
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => {
                            setSelectedCollectionId(col.id)
                            setSelectedCollectionName(col.name)
                            setSelectedCollectionColor(col.color)
                            setSaveMenuOpen(false)
                            setIsCreatingCollection(false)
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs transition ${
                            isSelected
                              ? 'bg-accent/15 text-accent ring-1 ring-accent/30 font-medium'
                              : 'text-slate-300 hover:bg-surface-elevated hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: col.color || DEFAULT_COLLECTION_COLOR }}
                            />
                            <span className="truncate">{col.name}</span>
                          </span>
                          {isSelected && <span className="text-[11px] font-bold">✓</span>}
                        </button>
                      )
                    })}

                    {filteredCollections.length === 0 && collectionSearchQuery && (
                      <p className="py-2 text-center text-[11px] text-slate-500">
                        {lang === 'vi' ? 'Không tìm thấy bộ sưu tập' : 'No collections found'}
                      </p>
                    )}
                  </div>

                  {/* Create New Collection Button */}
                  <div className="mt-2.5 border-t border-surface-border pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingCollection((prev) => !prev)
                        setCreateError('')
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-accent/40 bg-accent/5 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/15 hover:border-accent"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      {lang === 'vi' ? 'Tạo thêm bộ sưu tập' : 'Create new collection'}
                    </button>
                  </div>
                </div>

                {/* Side Panel: Create Collection Box */}
                {isCreatingCollection && (
                  <div className="w-72 rounded-2xl border border-surface-border bg-surface-raised/95 p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="mb-2.5 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {lang === 'vi' ? 'Tạo bộ sưu tập mới' : 'Create New Collection'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCreatingCollection(false)}
                        className="rounded-lg p-1 text-slate-400 transition hover:bg-surface-elevated hover:text-white"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {lang === 'vi' ? 'Tên bộ sưu tập' : 'Title'}
                        </label>
                        <input
                          type="text"
                          value={createTitle}
                          onChange={(e) => {
                            setCreateTitle(e.target.value)
                            setCreateError('')
                          }}
                          placeholder={lang === 'vi' ? 'Nhập tên bộ sưu tập...' : 'Enter collection title...'}
                          className="w-full rounded-xl border border-surface-border bg-surface-base px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-accent focus:outline-none"
                          autoFocus
                        />
                        {createError && (
                          <p className="mt-1 text-[10px] text-red-400">{createError}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {lang === 'vi' ? 'Bảng màu' : 'Color Palette'}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {COLLECTION_SWATCHES.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setCreateColor(color)}
                              className={`h-6 w-6 rounded-full border-2 transition transform hover:scale-110 ${
                                createColor === color ? 'border-white scale-110 shadow-md ring-2 ring-accent' : 'border-transparent'
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
                          disabled={isSubmittingCollection}
                          onClick={handleCreateCollection}
                          className="flex-1 rounded-xl bg-accent py-2 text-xs font-bold text-surface-base transition hover:bg-accent-hover disabled:opacity-50"
                        >
                          {isSubmittingCollection ? '...' : (lang === 'vi' ? 'Tạo' : 'Create')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingCollection(false)
                            setCreateTitle('')
                            setCreateError('')
                          }}
                          className="flex-1 rounded-xl bg-surface-elevated py-2 text-xs font-medium text-slate-300 transition hover:bg-surface-base"
                        >
                          {lang === 'vi' ? 'Hủy' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  </div>
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

      {feedbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 py-6">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-surface-border bg-surface-raised shadow-2xl">
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

            <div className="space-y-5 px-6 py-5">
              {feedbackWizardStep === 'stars' ? (
                <div className="space-y-4">
                  <p className="text-center text-sm text-slate-300">
                    {lang === 'vi' ? 'Bạn thấy hệ thống hoạt động như thế nào?' : 'How would you rate the system experience?'}
                  </p>
                  <div className="flex justify-center gap-3">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isActive = star <= feedbackRating
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleFeedbackRatingSelection(star)}
                          className={`rounded-full p-2 transition hover:scale-110 hover:bg-surface-elevated ${
                            isActive ? 'text-yellow-400' : 'text-slate-600 hover:text-yellow-300'
                          }`}
                          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                        >
                          <svg viewBox="0 0 20 20" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" className="h-10 w-10">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.922-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.785.57-1.84-.196-1.54-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.027 8.72c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="text-sm text-slate-300">
                      {lang === 'vi' ? 'Bạn đã chọn' : 'You selected'} <span className="font-semibold text-white">{feedbackRating}/5</span>
                    </p>
                    <div className="flex gap-1 text-yellow-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          viewBox="0 0 20 20"
                          fill={star <= feedbackRating ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          className="h-5 w-5"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.922-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.785.57-1.84-.196-1.54-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.027 8.72c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>

                  {feedbackCriteriaLoading ? (
                    <div className="rounded-2xl border border-surface-border bg-surface-base px-4 py-3 text-sm text-slate-400">
                      {lang === 'vi' ? 'Đang tải tiêu chí đánh giá...' : 'Loading feedback criteria...'}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {feedbackCriteria.length > 0 ? (
                          feedbackCriteria.map((criteria) => {
                            const isSelected = feedbackSelectedTags.includes(criteria.code)
                            return (
                              <button
                                key={criteria.code}
                                type="button"
                                onClick={() => toggleFeedbackTag(criteria.code)}
                                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                  isSelected
                                    ? 'border-accent bg-accent/15 text-white'
                                    : 'border-surface-border bg-surface-base text-slate-300 hover:border-accent/50 '
                                }`}
                              >
                                {criteria.label}
                              </button>
                            )
                          })
                        ) : (
                          <p className="text-sm text-slate-400">
                            {lang === 'vi' ? 'Không có tiêu chí nào cho mức sao này.' : 'No criteria are available for this rating.'}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-200" htmlFor="feedback-detail">
                          {lang === 'vi' ? 'Nhận xét chi tiết' : 'Detailed feedback'}
                        </label>
                        <textarea
                          id="feedback-detail"
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          rows={4}
                          placeholder={lang === 'vi' ? 'Viết thêm ý kiến của bạn...' : 'Write a few more details...'}
                          className="w-full resize-none rounded-3xl border border-surface-border bg-surface-base px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/30"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {feedbackSubmitError && (
                <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {feedbackSubmitError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-surface-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                {feedbackWizardStep !== 'stars' && (
                  <button
                    type="button"
                    onClick={() => {
                      setFeedbackWizardStep('stars')
                      setFeedbackSelectedTags([])
                      setFeedbackText('')
                      setFeedbackSubmitError('')
                    }}
                    className="rounded-full border border-surface-border bg-surface-base px-3 py-2 text-xs text-slate-300"
                  >
                    {lang === 'vi' ? 'Quay lại' : 'Back'}
                  </button>
                )}
              </div>

              <span className="text-sm text-slate-400">
                {feedbackTargetType === 'system'
                  ? lang === 'vi'
                    ? 'Đánh giá này nhằm cải thiện trải nghiệm hệ thống.'
                    : 'This feedback helps improve the system experience.'
                  : lang === 'vi'
                    ? 'Đánh giá này nhằm cải thiện chất lượng bản tóm tắt.'
                    : 'This feedback helps improve the summary quality.'}
              </span>
              <button
                type="button"
                onClick={handleSendFeedback}
                disabled={!summary || feedbackSubmitting || feedbackWizardStep === 'stars'}
                className="inline-flex items-center justify-center rounded-3xl bg-accent px-5 py-3 text-sm font-semibold text-surface-base transition hover:bg-accent-hover disabled:opacity-40"
              >
                {feedbackSubmitting ? t('feedback.sending') : t('feedback.send')}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => openSystemFeedbackForm()}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-xl text-surface-base shadow-2xl shadow-accent/30 transition hover:scale-105 hover:bg-accent-hover"
        aria-label={lang === 'vi' ? 'Đánh giá hệ thống' : 'System feedback'}
        title={lang === 'vi' ? 'Đánh giá hệ thống để cải thiện trải nghiệm hệ thống' : 'System feedback to improve the platform experience'}
      >
        ★
      </button>
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