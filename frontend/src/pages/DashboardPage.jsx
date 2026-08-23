import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { adminApi, feedbacksApi } from '../utils/api'

const navItems = [
  { id: 'analyticsReports', labelKey: 'nav.overview' },
  { id: 'userManagement', labelKey: 'nav.userManagement' },
  { id: 'subscriptionsManagement', labelKey: 'nav.subscriptions' },
  { id: 'feedbackModeration', labelKey: 'nav.feedbackModeration' },
  { id: 'aiMonitor', labelKey: 'nav.aiMonitor' },
]

const PIE_COLORS = [
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#f97316', // Orange
]

function formatFileFormatName(format, lang = 'vi') {
  const norm = String(format || '').toLowerCase().trim()
  if (norm === 'text_direct' || norm === 'text') return lang === 'vi' ? 'Văn bản trực tiếp' : 'Direct text'
  if (norm === 'pdf') return 'PDF'
  if (norm === 'docx' || norm === 'doc') return 'DOCX'
  if (norm === 'txt') return 'TXT'
  if (norm === 'image' || norm === 'png' || norm === 'jpg' || norm === 'jpeg') return lang === 'vi' ? 'Hình ảnh' : 'Image'
  if (norm === 'other') return lang === 'vi' ? 'Khác' : 'Other'
  return format.toUpperCase()
}

function formatTierName(tier, lang = 'vi') {
  const norm = String(tier || '').toLowerCase().trim()
  if (norm === 'free') return lang === 'vi' ? 'Gói Miễn phí (Free)' : 'Free'
  if (norm === 'pro') return lang === 'vi' ? 'Gói Nâng cao (Pro)' : 'Pro'
  if (norm === 'max' || norm === 'premium' || norm === 'vip') return lang === 'vi' ? 'Gói Cao cấp (Max)' : 'Max'
  return tier.toUpperCase()
}

function DonutPieChart({
  data = [],
  lang,
  formatMetric,
  centerLabel,
  compact = false,
  emptyText,
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null)

  const total = useMemo(() => {
    return data.reduce((sum, item) => sum + (Number(item.value) || 0), 0)
  }, [data])

  if (!data.length || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <div className="h-24 w-24 rounded-full border-2 border-dashed border-surface-border flex items-center justify-center text-xs text-slate-500 mb-2">
          0
        </div>
        <p className="text-xs text-slate-500">
          {emptyText || (lang === 'vi' ? 'Chưa có dữ liệu.' : 'No data available.')}
        </p>
      </div>
    )
  }

  let currentAngle = 0
  const slices = data.map((item, index) => {
    const value = Number(item.value) || 0
    const percentage = item.percentage !== undefined && item.percentage !== null
      ? Number(item.percentage)
      : (total > 0 ? (value / total) * 100 : 0)
    const angle = total > 0 ? (value / total) * 360 : 0
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle += angle

    const rad = (deg) => ((deg - 90) * Math.PI) / 180
    const outerR = compact ? 56 : 70
    const innerR = compact ? 34 : 45
    const cx = 100
    const cy = 100

    const x1 = cx + outerR * Math.cos(rad(startAngle))
    const y1 = cy + outerR * Math.sin(rad(startAngle))
    const x2 = cx + outerR * Math.cos(rad(endAngle))
    const y2 = cy + outerR * Math.sin(rad(endAngle))
    const largeArc = angle > 180 ? 1 : 0

    const ix1 = cx + innerR * Math.cos(rad(endAngle))
    const iy1 = cy + innerR * Math.sin(rad(endAngle))
    const ix2 = cx + innerR * Math.cos(rad(startAngle))
    const iy2 = cy + innerR * Math.sin(rad(startAngle))

    const pathData = data.length === 1
      ? `M ${cx} ${cy - outerR} A ${outerR} ${outerR} 0 1 1 ${cx - 0.01} ${cy - outerR} M ${cx} ${cy - innerR} A ${innerR} ${innerR} 0 1 0 ${cx + 0.01} ${cy - innerR}`
      : `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`

    return {
      ...item,
      percentage,
      pathData,
      color: item.color || PIE_COLORS[index % PIE_COLORS.length],
    }
  })

  const activeSlice = hoveredIndex !== null ? slices[hoveredIndex] : null

  return (
    <div className={`mt-2 flex flex-col items-center gap-4 ${compact ? 'w-full' : 'sm:flex-row sm:items-center sm:justify-around'}`}>
      {/* SVG Donut */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          viewBox="0 0 200 200"
          className={`${compact ? 'h-36 w-36' : 'h-44 w-44 sm:h-52 sm:w-52'} drop-shadow-md`}
        >
          {slices.map((slice, index) => {
            const isHovered = hoveredIndex === index
            return (
              <path
                key={`${slice.label}-${index}`}
                d={slice.pathData}
                fill={slice.color}
                className="cursor-pointer transition-all duration-200 hover:opacity-90"
                style={{
                  transformOrigin: '100px 100px',
                  transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            )
          })}
        </svg>

        {/* Center label */}
        <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center px-1">
          {activeSlice ? (
            <>
              <span className="text-[10px] font-semibold uppercase text-slate-300 truncate max-w-[70px]">
                {activeSlice.label}
              </span>
              <span className="text-xs font-bold text-white">
                {activeSlice.percentage.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-400">
                {formatMetric ? formatMetric(activeSlice.value) : activeSlice.value}
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                {centerLabel || (lang === 'vi' ? 'Tổng' : 'Total')}
              </span>
              <span className="text-sm font-bold text-white">
                {formatMetric ? formatMetric(total) : total}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legend list */}
      <div className={`w-full space-y-1.5 ${compact ? 'max-w-full' : 'flex-1 max-w-sm min-w-0'}`}>
        {slices.map((slice, index) => {
          const isHovered = hoveredIndex === index
          return (
            <div
              key={`${slice.label}-${index}`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`flex items-center justify-between rounded-xl border px-2.5 py-1.5 text-xs transition-all cursor-pointer ${
                isHovered
                  ? 'border-accent bg-surface-base/90 shadow-sm'
                  : 'border-surface-border/70 bg-surface-base/50 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="font-medium text-slate-200 truncate">{slice.label}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-slate-400">
                  {formatMetric ? formatMetric(slice.value) : slice.value}
                </span>
                <span
                  className="font-bold min-w-[42px] text-right"
                  style={{ color: slice.color }}
                >
                  {slice.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function toArray(payload, keys = []) {
  const data = payload?.data || payload
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key]
  }
  if (Array.isArray(data)) return data
  return []
}

function getPagination(payload) {
  const data = payload?.data || payload
  const pagination = data?.pagination || data?.meta || {}
  const totalPages = Number(pagination?.totalPages || pagination?.total_pages || data?.totalPages || data?.total_pages || 0) || 0
  const totalItems = Number(pagination?.totalItems || pagination?.total_items || data?.totalItems || data?.total_items || 0) || 0
  return { totalPages, totalItems }
}

function pickNumberByKeys(source, keys = []) {
  if (!source || typeof source !== 'object') return null

  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      const value = Number(source[key])
      if (Number.isFinite(value)) return value
    }
  }

  return null
}

function getDataObject(payload) {
  let current = payload

  for (let i = 0; i < 4; i += 1) {
    if (!current || typeof current !== 'object') break
    if (Array.isArray(current)) return current

    if (current.data && typeof current.data === 'object') {
      current = current.data
      continue
    }
    if (current.result && typeof current.result === 'object') {
      current = current.result
      continue
    }
    if (current.payload && typeof current.payload === 'object') {
      current = current.payload
      continue
    }

    break
  }

  return current || {}
}

function extractRecordList(payload) {
  const data = getDataObject(payload)
  if (Array.isArray(data)) return data

  const candidates = ['items', 'results', 'records', 'data', 'series', 'time_series', 'stats', 'list']
  for (const key of candidates) {
    if (Array.isArray(data[key])) return data[key]
  }

  return []
}

function extractTrendPoints(payload) {
  const records = extractRecordList(payload)

  return records
    .map((record, index) => {
      const label =
        record?.date ||
        record?.day ||
        record?.period ||
        record?.month ||
        record?.label ||
        `#${index + 1}`

      const value =
        pickNumberByKeys(record, ['count', 'total', 'value', 'users', 'requests', 'registrations']) || 0

      return {
        label: String(label),
        value,
      }
    })
    .filter((point) => Number.isFinite(point.value))
}

function extractFormatPoints(payload) {
  const records = extractRecordList(payload)

  return records
    .map((record, index) => {
      const label =
        record?.format ||
        record?.file_type ||
        record?.fileType ||
        record?.name ||
        record?.label ||
        `Type ${index + 1}`

      const value = pickNumberByKeys(record, ['count', 'total', 'value', 'usage']) || 0

      return { label: String(label).toUpperCase(), value }
    })
    .filter((point) => Number.isFinite(point.value))
}

function extractObjectPoints(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return []

  return Object.entries(source)
    .map(([label, value]) => ({ label: String(label), value: Number(value) || 0 }))
    .filter((point) => Number.isFinite(point.value))
}

function normalizeKeyName(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
}

function deepFindNumber(source, aliases = []) {
  if (!source || typeof source !== 'object') return null

  const targetSet = new Set(aliases.map((key) => normalizeKeyName(key)))
  const visited = new Set()
  const queue = [source]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || typeof current !== 'object') continue
    if (visited.has(current)) continue
    visited.add(current)

    for (const [key, value] of Object.entries(current)) {
      if (targetSet.has(normalizeKeyName(key))) {
        const numeric = Number(value)
        if (Number.isFinite(numeric)) return numeric
      }

      if (value && typeof value === 'object') {
        queue.push(value)
      }
    }
  }

  return null
}

function deepFindObject(source, aliases = []) {
  if (!source || typeof source !== 'object') return null

  const targetSet = new Set(aliases.map((key) => normalizeKeyName(key)))
  const visited = new Set()
  const queue = [source]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || typeof current !== 'object') continue
    if (visited.has(current)) continue
    visited.add(current)

    for (const [key, value] of Object.entries(current)) {
      if (targetSet.has(normalizeKeyName(key)) && value && typeof value === 'object' && !Array.isArray(value)) {
        return value
      }

      if (value && typeof value === 'object') {
        queue.push(value)
      }
    }
  }

  return null
}

function getFeedbackTags(feedback, t) {
  const rawList = []

  const pushCandidate = (val) => {
    if (!val) return
    if (Array.isArray(val)) {
      val.forEach(pushCandidate)
    } else if (typeof val === 'string' && val.trim()) {
      rawList.push(val.trim())
    } else if (typeof val === 'object') {
      const code = val.code || val.id || val.tag || val.label || val.name || ''
      if (code) rawList.push(String(code).trim())
    }
  }

  pushCandidate(feedback?.tags)
  pushCandidate(feedback?.tag)
  pushCandidate(feedback?.criteria)
  pushCandidate(feedback?.reasons)
  pushCandidate(feedback?.reason_codes)
  pushCandidate(feedback?.reasonCodes)
  pushCandidate(feedback?.reason)
  pushCandidate(feedback?.payload?.tags)
  pushCandidate(feedback?.payload?.tag)
  pushCandidate(feedback?.payload?.criteria)
  pushCandidate(feedback?.payload?.reasons)
  pushCandidate(feedback?.payload?.reason)
  pushCandidate(feedback?.feedback?.tags)
  pushCandidate(feedback?.feedback?.tag)

  const uniqueCodes = Array.from(new Set(rawList.filter(Boolean)))

  return uniqueCodes.map((tagCode) => {
    const translatedTag = t ? t(`feedback.reasons.${tagCode}`) : ''
    const displayTag =
      translatedTag && translatedTag !== `feedback.reasons.${tagCode}`
        ? translatedTag
        : tagCode
    return { code: tagCode, label: displayTag }
  })
}

function getFeedbackUserComment(feedback) {
  const candidates = [
    feedback?.comment,
    feedback?.content,
    feedback?.message,
    feedback?.feedback_content,
    feedback?.feedbackContent,
    feedback?.details,
    feedback?.description,
    feedback?.text,
    feedback?.body,
    feedback?.payload?.comment,
    feedback?.payload?.content,
    feedback?.payload?.message,
    feedback?.feedback?.comment,
    feedback?.feedback?.content,
    feedback?.feedback?.message,
  ]

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

function getFeedbackComment(feedback, lang) {
  const comment = getFeedbackUserComment(feedback)
  if (comment) return comment

  const reasonList =
    feedback?.reasons ||
    feedback?.reason_codes ||
    feedback?.reasonCodes ||
    feedback?.tags ||
    (feedback?.tag ? [feedback.tag] : []) ||
    []

  if (Array.isArray(reasonList) && reasonList.length > 0) {
    return reasonList.map((item) => String(item)).join(', ')
  }

  return lang === 'vi' ? 'Người dùng không để lại bình luận.' : 'No comment provided by user.'
}

function normalizeTemplateKey(templateType) {
  return String(templateType || '').trim().toLowerCase().replace(/[-_\s]+/g, '_')
}

function getFeedbackTemplateLabel(templateType, t) {
  const normalized = normalizeTemplateKey(templateType)
  if (normalized === 'thank_you' || normalized === 'thankyou') return t('dashboard.feedbackTemplates.thankYou')
  if (normalized === 'apology') return t('dashboard.feedbackTemplates.apology')
  if (normalized === 'feature_noted' || normalized === 'feature-noted') return t('dashboard.feedbackTemplates.featureNoted')
  if (normalized === 'custom') return t('dashboard.feedbackTemplates.custom')
  return templateType
}

function getTemplateDefaultContent(templateType, templates = []) {
  const normalized = normalizeTemplateKey(templateType)
  if (!normalized || normalized === 'custom') {
    return ''
  }

  for (const template of templates) {
    const value = template?.type || template?.template_type || template?.name || template?.key
    if (normalizeTemplateKey(value) === normalized) {
      return (
        template?.content ||
        template?.reply_content ||
        template?.default_content ||
        template?.defaultContent ||
        template?.message ||
        template?.title ||
        ''
      )
    }
  }

  return ''
}

function inferTemplateTypeFromReplyContent(replyContent, templates = []) {
  const trimmedReply = String(replyContent || '').trim()
  if (!trimmedReply) {
    return ''
  }

  const normalizedReply = normalizeTemplateKey(trimmedReply)
  if (!normalizedReply) {
    return ''
  }

  for (const template of templates) {
    const templateType = template?.type || template?.template_type || template?.name || template?.key
    if (!templateType) continue

    const templateContent = (
      template?.content ||
      template?.reply_content ||
      template?.default_content ||
      template?.defaultContent ||
      template?.message ||
      ''
    )

    if (templateContent && normalizeTemplateKey(templateContent) === normalizedReply) {
      return String(templateType)
    }
  }

  return ''
}

function getFeedbackReplyStatus(feedback) {
  const status =
    feedback?.admin_replied ||
    feedback?.adminReplyStatus ||
    feedback?.reply_status ||
    feedback?.replyStatus ||
    feedback?.admin_reply_status ||
    'pending'

  const normalized = String(status).trim().toLowerCase()
  return normalized === 'replied' ? 'replied' : 'pending'
}

function getFeedbackExistingReply(feedback, templates = []) {
  const replyContentCandidates = [
    feedback?.reply_content,
    feedback?.replyContent,
    feedback?.admin_reply_content,
    feedback?.adminReplyContent,
    feedback?.admin_reply,
    feedback?.adminReply,
    feedback?.response,
    feedback?.feedback?.reply_content,
    feedback?.feedback?.replyContent,
    feedback?.feedback?.admin_reply_content,
    feedback?.feedback?.response,
    feedback?.data?.reply_content,
    feedback?.attributes?.reply_content,
    feedback?.reply?.content,
    feedback?.reply?.reply_content,
  ]

  let replyContent = ''
  for (const value of replyContentCandidates) {
    if (typeof value === 'string' && value.trim()) {
      replyContent = value.trim()
      break
    }
  }

  const templateTypeCandidates = [
    feedback?.template_type,
    feedback?.templateType,
    feedback?.admin_template_type,
    feedback?.adminTemplateType,
    feedback?.reply_template_type,
    feedback?.replyTemplateType,
    feedback?.reply?.type,
    feedback?.reply?.template_type,
  ]

  let templateType = ''
  for (const value of templateTypeCandidates) {
    if (typeof value === 'string' && value.trim()) {
      templateType = value.trim()
      break
    }
  }

  if (!templateType && replyContent) {
    templateType = inferTemplateTypeFromReplyContent(replyContent, templates) || 'custom'
  }

  return { replyContent, templateType }
}

function getFeedbackRatingLabel(rating, t) {
  const num = Number(rating)
  if (Number.isFinite(num) && num >= 1 && num <= 5) {
    return `${num} ★`
  }
  const normalized = String(rating || '').trim().toLowerCase()
  if (normalized === 'like') return '5 ★'
  if (normalized === 'dislike') return '1 ★'
  return rating ? `${rating} ★` : '-'
}

function getFeedbackAuthorName(feedback, lang = 'vi') {
  const directCandidates = [
    feedback?.user_name,
    feedback?.userName,
    feedback?.full_name,
    feedback?.fullName,
    feedback?.name,
    feedback?.author_name,
    feedback?.authorName,
    feedback?.user?.name,
    feedback?.user?.full_name,
    feedback?.user?.fullName,
    feedback?.user?.username,
    feedback?.author?.name,
    feedback?.author?.full_name,
    feedback?.author?.fullName,
    feedback?.author?.username,
  ]

  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  const emailCandidates = [
    feedback?.user?.email,
    feedback?.author?.email,
    feedback?.email,
    feedback?.user_email,
    feedback?.userEmail,
  ]

  for (const email of emailCandidates) {
    if (typeof email === 'string' && email.trim()) {
      const cleanEmail = email.trim()
      const prefix = cleanEmail.split('@')[0]
      if (prefix) return prefix
      return cleanEmail
    }
  }

  return lang === 'vi' ? 'Khách ẩn danh' : 'Anonymous User'
}

function getFeedbackUserEmail(feedback) {
  const candidates = [
    feedback?.user?.email,
    feedback?.email,
    feedback?.user_email,
    feedback?.userEmail,
    feedback?.author?.email,
  ]

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

function getDefaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 30)

  const toIso = (d) => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  return {
    start: toIso(start),
    end: toIso(end),
  }
}

function DashboardPage() {
  const { t, lang } = useLanguage()
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('analyticsReports')

  const [dateRange] = useState(() => getDefaultDateRange())
  const [fromDate, setFromDate] = useState(dateRange.start)
  const [toDate, setToDate] = useState(dateRange.end)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')
  const [analyticsData, setAnalyticsData] = useState(null)
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState('')
  const [users, setUsers] = useState([])
  const [userFiltersDraft, setUserFiltersDraft] = useState({ search: '', email: '', name: '', full_name: '', role: '', status: '' })
  const [userFilters, setUserFilters] = useState({ page: 1, limit: 20, search: '', email: '', name: '', full_name: '', role: '', status: '' })
  const [usersTotalPages, setUsersTotalPages] = useState(0)

  const [plansLoading, setPlansLoading] = useState(false)
  const [plansError, setPlansError] = useState('')
  const [plans, setPlans] = useState([])
  const [editingPlanId, setEditingPlanId] = useState('')
  const [planForm, setPlanForm] = useState({
    name: '',
    display_name: '',
    char_limit: '',
    daily_word_limit: '',
    price: '',
    duration_days: '',
    description: '',
    is_active: true,
  })

  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')
  const [feedbacks, setFeedbacks] = useState([])
  const [feedbackPage, setFeedbackPage] = useState(1)
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(0)
  const [feedbackRating, setFeedbackRating] = useState('')
  const [feedbackReplyStatus, setFeedbackReplyStatus] = useState('')
  const [feedbackTag, setFeedbackTag] = useState('')
  const [criteriaList, setCriteriaList] = useState([])
  const [templates, setTemplates] = useState([])
  const [replyForms, setReplyForms] = useState({})
  const [deleteFeedbackTarget, setDeleteFeedbackTarget] = useState(null)
  const [isDeletingFeedback, setIsDeletingFeedback] = useState(false)

  const dateParams = useMemo(() => ({ from_date: fromDate, to_date: toDate }), [fromDate, toDate])

  const loadAnalytics = async () => {
    if (fromDate && toDate && fromDate > toDate) {
      setAnalyticsError(lang === 'vi' ? 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.' : 'From date must be earlier than or equal to To date.')
      return
    }
    const todayStr = new Date().toISOString().split('T')[0]
    if (toDate && toDate > todayStr) {
      setAnalyticsError(lang === 'vi' ? 'Ngày kết thúc không được vượt quá ngày hiện tại.' : 'To date cannot be in the future.')
      return
    }
    if (fromDate && fromDate > todayStr) {
      setAnalyticsError(lang === 'vi' ? 'Ngày bắt đầu không được vượt quá ngày hiện tại.' : 'From date cannot be in the future.')
      return
    }

    setAnalyticsLoading(true)
    setAnalyticsError('')
    try {
      const response = await adminApi.analytics.overview(dateParams)
      const data = response?.data || response || {}
      setAnalyticsData(data)
    } catch (error) {
      setAnalyticsError(error?.message || (lang === 'vi' ? 'Không thể tải dữ liệu analytics.' : 'Unable to load analytics data.'))
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const loadUsers = async (params = userFilters) => {
    setUsersLoading(true)
    setUsersError('')
    try {
      const response = await adminApi.users.list(params)
      const list = toArray(response, ['items', 'users', 'results'])
      const pagination = getPagination(response)
      setUsers(list)
      setUsersTotalPages(pagination.totalPages)
    } catch (error) {
      setUsers([])
      setUsersTotalPages(0)
      setUsersError(error?.message || (lang === 'vi' ? 'Không thể tải danh sách người dùng.' : 'Unable to load users.'))
    } finally {
      setUsersLoading(false)
    }
  }

  const loadPlans = async () => {
    setPlansLoading(true)
    setPlansError('')
    try {
      const response = await adminApi.subscriptions.list()
      setPlans(toArray(response, ['items', 'subscriptions', 'plans']))
    } catch (error) {
      setPlans([])
      setPlansError(error?.message || (lang === 'vi' ? 'Không thể tải danh sách gói.' : 'Unable to load subscriptions.'))
    } finally {
      setPlansLoading(false)
    }
  }

  const loadCriteriaList = async () => {
    try {
      const res = await feedbacksApi.criteria()
      const list = res?.criteria || res?.data?.criteria || (Array.isArray(res) ? res : [])
      if (Array.isArray(list) && list.length > 0) {
        setCriteriaList(list)
      }
    } catch {
      // ignore criteria load error
    }
  }

  const loadFeedbacks = async (
    pageValue = feedbackPage,
    ratingValue = feedbackRating,
    replyStatusValue = feedbackReplyStatus,
    tagValue = feedbackTag,
  ) => {
    setFeedbackLoading(true)
    setFeedbackError('')
    try {
      const response = await adminApi.feedbacks.list({
        page: pageValue,
        limit: 20,
        rating: ratingValue || undefined,
        admin_replied: replyStatusValue || undefined,
        tag: tagValue || undefined,
      })
      const list = toArray(response, ['items', 'feedbacks', 'results'])
      const pagination = getPagination(response)
      setFeedbacks(list)
      setFeedbackTotalPages(pagination.totalPages)
    } catch (error) {
      setFeedbacks([])
      setFeedbackTotalPages(0)
      setFeedbackError(error?.message || (lang === 'vi' ? 'Không thể tải phản hồi.' : 'Unable to load feedbacks.'))
    } finally {
      setFeedbackLoading(false)
    }
  }

  const loadReplyTemplates = async () => {
    try {
      const response = await adminApi.feedbacks.replyTemplates()
      setTemplates(toArray(response, ['items', 'templates', 'data']))
    } catch {
      setTemplates([])
    }
  }

  const handleToggleBan = async (targetUser) => {
    const userId = targetUser?.id || targetUser?._id || targetUser?.user_id
    if (!userId) return
    if (user?.id && String(user.id) === String(userId)) {
      alert(lang === 'vi' ? 'Admin không thể tự vô hiệu hóa tài khoản của chính mình.' : 'Administrators cannot disable their own account.')
      return
    }
    const status = String(targetUser?.status || '').toLowerCase()
    const isBanned = status === 'banned' || status === 'suspended'
    try {
      if (isBanned) {
        await adminApi.users.unban(userId)
      } else {
        const promptMsg = lang === 'vi' ? 'Lý do vô hiệu hóa (tối đa 500 ký tự):' : 'Ban reason (max 500 characters):'
        const rawReason = window.prompt(promptMsg)
        if (rawReason === null) return
        const reason = (rawReason || '').trim().slice(0, 500) || (lang === 'vi' ? 'Vô hiệu hóa bởi Quản trị viên' : 'Disabled by Admin')
        await adminApi.users.ban(userId, { reason })
      }
      await loadUsers(userFilters)
    } catch (error) {
      alert(error?.message || (lang === 'vi' ? 'Thao tác thất bại.' : 'Action failed.'))
    }
  }

  const resetPlanForm = () => {
    setEditingPlanId('')
    setPlanForm({
      name: '',
      display_name: '',
      char_limit: '',
      daily_word_limit: '',
      price: '',
      duration_days: '',
      description: '',
      is_active: true,
    })
  }

  const handleEditPlan = (plan) => {
    const id = plan?.id || plan?._id
    setEditingPlanId(id || '')
    setPlanForm({
      name: plan?.name || '',
      display_name: plan?.display_name || plan?.displayName || '',
      char_limit: plan?.char_limit !== undefined ? String(plan.char_limit) : '',
      daily_word_limit: plan?.daily_word_limit !== undefined ? String(plan.daily_word_limit) : '',
      price: plan?.price !== undefined ? String(plan.price) : '',
      duration_days: plan?.duration_days !== undefined ? String(plan.duration_days) : '',
      description: plan?.description || '',
      is_active: plan?.is_active ?? true,
    })
  }

  const handleSavePlan = async () => {
    const charLimit = Number(planForm.char_limit) || 0
    const durationDays = Number(planForm.duration_days) || 0
    const dailyWordLimit = Number(planForm.daily_word_limit) || 0
    const price = Number(planForm.price) || 0

    if (!planForm.name?.trim() || !planForm.display_name?.trim()) {
      alert(lang === 'vi' ? 'Vui lòng nhập tên gói và tên hiển thị.' : 'Please enter plan name and display name.')
      return
    }
    if (charLimit < 100) {
      alert(lang === 'vi' ? 'Giới hạn ký tự/từ tối thiểu là 100.' : 'Character limit must be at least 100.')
      return
    }
    if (durationDays < 1 || durationDays > 3650) {
      alert(lang === 'vi' ? 'Thời hạn gói phải từ 1 đến 3650 ngày.' : 'Duration must be between 1 and 3650 days.')
      return
    }
    if (dailyWordLimit < 0) {
      alert(lang === 'vi' ? 'Hạn mức từ theo ngày không được âm.' : 'Daily word limit cannot be negative.')
      return
    }
    if (price < 0) {
      alert(lang === 'vi' ? 'Giá gói cước không được âm.' : 'Price cannot be negative.')
      return
    }

    const payload = {
      name: planForm.name.trim(),
      display_name: planForm.display_name.trim(),
      char_limit: charLimit,
      daily_word_limit: dailyWordLimit,
      price: price,
      duration_days: durationDays,
      description: (planForm.description || '').trim().slice(0, 500),
      is_active: Boolean(planForm.is_active),
    }

    try {
      if (editingPlanId) {
        await adminApi.subscriptions.update(editingPlanId, payload)
      } else {
        await adminApi.subscriptions.create(payload)
      }
      resetPlanForm()
      await loadPlans()
    } catch (error) {
      alert(error?.message || (lang === 'vi' ? 'Không thể lưu gói.' : 'Unable to save subscription plan.'))
    }
  }

  const handleDeletePlan = async (plan) => {
    const id = plan?.id || plan?._id
    if (!id) return
    const confirmMsg = lang === 'vi' ? 'Bạn có chắc chắn muốn xóa gói này?' : 'Are you sure you want to delete this plan?'
    if (!window.confirm(confirmMsg)) return
    try {
      await adminApi.subscriptions.remove(id)
      await loadPlans()
    } catch (error) {
      alert(error?.message || (lang === 'vi' ? 'Không thể xóa gói.' : 'Unable to delete subscription plan.'))
    }
  }

  const handleReplyFeedback = async (feedback, index) => {
    const id = feedback?.id || feedback?._id || feedback?.feedback_id || `feedback-${index}`
    const replyForm = replyForms[id]
    const replyContent = String(replyForm?.reply_content || '').trim()
    if (!replyContent) {
      alert(lang === 'vi' ? 'Vui lòng nhập nội dung phản hồi.' : 'Please enter reply content.')
      return
    }
    if (replyContent.length < 5 || replyContent.length > 2000) {
      alert(lang === 'vi' ? 'Nội dung phản hồi phải từ 5 đến 2000 ký tự.' : 'Reply content must be between 5 and 2000 characters.')
      return
    }
    try {
      await adminApi.feedbacks.reply(id, {
        template_type: replyForm.template_type || undefined,
        reply_content: replyContent,
        admin_replied: 'replied',
      })
      await loadFeedbacks()
    } catch (error) {
      alert(error?.message || (lang === 'vi' ? 'Không thể gửi phản hồi.' : 'Unable to send reply.'))
    }
  }

  const handleDeleteFeedback = (feedback) => {
    setDeleteFeedbackTarget(feedback)
  }

  const confirmDeleteFeedback = async () => {
    if (!deleteFeedbackTarget) return
    const id = deleteFeedbackTarget?.id || deleteFeedbackTarget?._id || deleteFeedbackTarget?.feedback_id
    if (!id) {
      setDeleteFeedbackTarget(null)
      return
    }
    setIsDeletingFeedback(true)
    try {
      await adminApi.feedbacks.remove(id)
      setDeleteFeedbackTarget(null)
      await loadFeedbacks()
    } catch (error) {
      alert(error?.message || (lang === 'vi' ? 'Không thể xóa phản hồi.' : 'Unable to delete feedback.'))
    } finally {
      setIsDeletingFeedback(false)
    }
  }

  useEffect(() => {
    if (activeNav === 'analyticsReports') {
      loadAnalytics()
    }
  }, [activeNav, dateParams])

  useEffect(() => {
    if (activeNav === 'userManagement') {
      loadUsers(userFilters)
    }
  }, [activeNav, userFilters])

  useEffect(() => {
    if (activeNav === 'subscriptionsManagement') {
      loadPlans()
    }
  }, [activeNav])

  useEffect(() => {
    if (activeNav === 'feedbackModeration') {
      loadFeedbacks(feedbackPage, feedbackRating, feedbackReplyStatus, feedbackTag)
      loadReplyTemplates()
      loadCriteriaList()
    }
  }, [activeNav, feedbackPage, feedbackRating, feedbackReplyStatus, feedbackTag])

  const formatMetric = (value) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return '--'
    return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
      notation: numeric >= 10000 ? 'compact' : 'standard',
      maximumFractionDigits: numeric >= 10000 ? 1 : 0,
    }).format(numeric)
  }

  const parseNumber = (value) => {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : 0
  }

  const analyticsCards = useMemo(() => {
    const usersObj = analyticsData?.users || {}
    const requestsObj = analyticsData?.requests || {}
    const activeUsersObj = analyticsData?.active_users || {}

    const totalUsers = Number(usersObj.total_users_overall ?? usersObj.total_users ?? 0)
    const newUsers = Number(usersObj.total_users_in_period ?? usersObj.new_users ?? 0)
    const totalRequests = Number(requestsObj.total_requests ?? requestsObj.total ?? 0)
    const activeCount = Number(activeUsersObj.total ?? 0)

    return [
      {
        key: 'users',
        title: lang === 'vi' ? 'Tổng người dùng' : 'Total users',
        value: totalUsers,
        accent: 'text-cyan-300',
      },
      {
        key: 'newUsers',
        title: lang === 'vi' ? 'Người dùng mới' : 'New users',
        value: newUsers,
        accent: 'text-emerald-300',
      },
      {
        key: 'requests',
        title: lang === 'vi' ? 'Tổng yêu cầu API' : 'Total API requests',
        value: totalRequests,
        accent: 'text-indigo-300',
      },
      {
        key: 'activeUsers',
        title: lang === 'vi' ? 'Đang hoạt động (5 phút)' : 'Active users (5 min)',
        value: activeCount,
        accent: 'text-amber-300',
      },
    ]
  }, [analyticsData, lang])

  const usageByTierPoints = useMemo(() => {
    const usageObj = analyticsData?.usage_by_tier || {}
    const tiers = Array.isArray(usageObj.tiers) ? usageObj.tiers : []
    if (tiers.length > 0) {
      return tiers.map((item, idx) => {
        const tierName = item.tier || 'other'
        const color =
          tierName.toLowerCase() === 'max'
            ? '#f59e0b'
            : tierName.toLowerCase() === 'pro'
              ? '#6366f1'
              : tierName.toLowerCase() === 'free'
                ? '#06b6d4'
                : PIE_COLORS[idx % PIE_COLORS.length]
        return {
          label: formatTierName(tierName, lang),
          value: Number(item.total_requests) || 0,
          percentage: Number(item.percentage_requests) || 0,
          color,
        }
      })
    }
    return []
  }, [analyticsData?.usage_by_tier, lang])

  const activeUsersByTierPoints = useMemo(() => {
    const activeUsersObj = analyticsData?.active_users || {}
    const byPlan = activeUsersObj.by_plan || activeUsersObj.byPlan || {}
    const planKeys = Object.keys(byPlan)
    if (planKeys.length > 0) {
      const items = planKeys.map((planKey) => {
        const val = Number(byPlan[planKey]) || 0
        const color =
          planKey.toLowerCase() === 'max'
            ? '#f59e0b'
            : planKey.toLowerCase() === 'pro'
              ? '#6366f1'
              : planKey.toLowerCase() === 'free'
                ? '#06b6d4'
                : '#10b981'
        return {
          label: formatTierName(planKey, lang),
          value: val,
          color,
        }
      })
      const hasAnyNonZero = items.some((item) => item.value > 0)
      if (hasAnyNonZero) return items
    }
    const total = Number(activeUsersObj.total) || 0
    if (total > 0) {
      return [{ label: lang === 'vi' ? 'Đang hoạt động' : 'Active', value: total, color: '#10b981' }]
    }
    return []
  }, [analyticsData?.active_users, lang])

  const fileFormatsByTier = useMemo(() => {
    const raw = analyticsData?.file_formats_by_tier || {}
    const tiers = ['free', 'pro', 'max']

    const result = {}
    tiers.forEach((tierKey) => {
      const items = Array.isArray(raw[tierKey]) ? raw[tierKey] : []
      result[tierKey] = items.map((item, idx) => ({
        label: formatFileFormatName(item.format, lang),
        value: Number(item.count) || 0,
        percentage: Number(item.percentage) || 0,
        color: PIE_COLORS[idx % PIE_COLORS.length],
      }))
    })

    return result
  }, [analyticsData?.file_formats_by_tier, lang])

  const renderAnalyticsReports = () => (
    <div className="space-y-5 rounded-3xl border border-surface-border bg-surface-raised p-6 shadow-sm shadow-black/10">
      {/* Header với Tiêu đề & Chọn ngày */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('nav.overview')}</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{lang === 'vi' ? 'Báo cáo thống kê' : 'Analytics & reports'}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-xs text-slate-400 shrink-0">{lang === 'vi' ? 'Từ:' : 'From:'}</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200 [color-scheme:dark]"
            />
          </div>
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-xs text-slate-400 shrink-0">{lang === 'vi' ? 'Đến:' : 'To:'}</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200 [color-scheme:dark]"
            />
          </div>
          <button type="button" onClick={loadAnalytics} className="w-full sm:w-auto rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-surface-base transition hover:bg-accent-hover">
            {lang === 'vi' ? 'Làm mới' : 'Refresh'}
          </button>
        </div>
      </div>

      {analyticsError && <p className="text-sm text-rose-300">{analyticsError}</p>}
      {analyticsLoading ? (
        <div className="py-8 text-center text-sm text-slate-400">{lang === 'vi' ? 'Đang tải dữ liệu...' : 'Loading data...'}</div>
      ) : (
        <div className="space-y-6">
          {/* Top 4 Stats Cards */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {analyticsCards.map((card) => (
              <div key={card.key} className="rounded-2xl border border-surface-border bg-gradient-to-br from-surface-base/90 to-surface-base/50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{card.title}</p>
                <p className={`mt-2 text-3xl font-semibold ${card.accent}`}>
                  {formatMetric(card.value)}{card.suffix || ''}
                </p>
              </div>
            ))}
          </div>

          {/* Row 1: Phân bổ người dùng theo bậc (Pie chart) & Người dùng Realtime theo bậc (Pie chart) */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Phân bổ người dùng & yêu cầu theo bậc */}
            <div className="rounded-2xl border border-surface-border bg-surface-base/40 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">
                    {lang === 'vi' ? 'Phân bổ người dùng theo bậc' : 'User distribution by tier'}
                  </p>
                  <span className="text-xs text-slate-400">
                    {lang === 'vi' ? 'Theo lượt yêu cầu' : 'By requests'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {lang === 'vi' ? 'Tỷ lệ phân bổ và sử dụng của từng nhóm người dùng (Free, Pro, Max)' : 'Usage distribution across tiers (Free, Pro, Max)'}
                </p>
              </div>
              <div className="mt-4">
                <DonutPieChart
                  data={usageByTierPoints}
                  lang={lang}
                  formatMetric={formatMetric}
                  centerLabel={lang === 'vi' ? 'Yêu cầu' : 'Requests'}
                  emptyText={lang === 'vi' ? 'Chưa có dữ liệu phân bổ bậc người dùng.' : 'No tier usage data available.'}
                />
              </div>
            </div>

            {/* Người dùng realtime theo bậc */}
            <div className="rounded-2xl border border-surface-border bg-surface-base/40 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">
                    {lang === 'vi' ? 'Người dùng Realtime theo bậc' : 'Realtime active users by tier'}
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {lang === 'vi' ? 'Trực tiếp (5 phút)' : 'Live (5 min)'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {lang === 'vi' ? 'Số lượng người dùng đang hoạt động phân theo từng bậc' : 'Active users in the last 5 minutes broken down by tier'}
                </p>
              </div>
              <div className="mt-4">
                <DonutPieChart
                  data={activeUsersByTierPoints}
                  lang={lang}
                  formatMetric={formatMetric}
                  centerLabel={lang === 'vi' ? 'Đang online' : 'Online'}
                  emptyText={lang === 'vi' ? 'Hiện tại không có người dùng nào đang hoạt động.' : 'No active users in the current window.'}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Phân bổ định dạng tệp tin theo bậc người dùng (1 khung chia thành 3 cột, mỗi cột 1 biểu đồ tròn) */}
          <div className="rounded-2xl border border-surface-border bg-surface-base/40 p-5 space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-white">
                  {lang === 'vi' ? 'Phân bổ định dạng tệp tin theo bậc người dùng' : 'File format distribution by user tier'}
                </h3>
                <span className="text-xs text-slate-400">
                  {lang === 'vi' ? 'Tỷ lệ % định dạng tệp (Text, PDF, DOCX,...) được sử dụng ở từng bậc' : 'Percentage of file formats used per user tier'}
                </span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 pt-2">
              {/* Cột 1: Gói Free */}
              <div className="rounded-xl border border-surface-border/70 bg-surface-base/60 p-4 flex flex-col justify-between">
                <div className="text-center pb-2 border-b border-surface-border/50 mb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 px-3 py-1 text-xs font-bold text-cyan-300">
                    {lang === 'vi' ? 'Gói Miễn phí (Free)' : 'Free Tier'}
                  </span>
                </div>
                <DonutPieChart
                  data={fileFormatsByTier.free || []}
                  lang={lang}
                  formatMetric={formatMetric}
                  compact={true}
                  centerLabel={lang === 'vi' ? 'Tệp Free' : 'Free Files'}
                  emptyText={lang === 'vi' ? 'Chưa có tệp ở gói Free.' : 'No files in Free tier.'}
                />
              </div>

              {/* Cột 2: Gói Pro */}
              <div className="rounded-xl border border-surface-border/70 bg-surface-base/60 p-4 flex flex-col justify-between">
                <div className="text-center pb-2 border-b border-surface-border/50 mb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 text-xs font-bold text-indigo-300">
                    {lang === 'vi' ? 'Gói Nâng cao (Pro)' : 'Pro Tier'}
                  </span>
                </div>
                <DonutPieChart
                  data={fileFormatsByTier.pro || []}
                  lang={lang}
                  formatMetric={formatMetric}
                  compact={true}
                  centerLabel={lang === 'vi' ? 'Tệp Pro' : 'Pro Files'}
                  emptyText={lang === 'vi' ? 'Chưa có tệp ở gói Pro.' : 'No files in Pro tier.'}
                />
              </div>

              {/* Cột 3: Gói Max */}
              <div className="rounded-xl border border-surface-border/70 bg-surface-base/60 p-4 flex flex-col justify-between">
                <div className="text-center pb-2 border-b border-surface-border/50 mb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-300">
                    {lang === 'vi' ? 'Gói Cao cấp (Max)' : 'Max Tier'}
                  </span>
                </div>
                <DonutPieChart
                  data={fileFormatsByTier.max || []}
                  lang={lang}
                  formatMetric={formatMetric}
                  compact={true}
                  centerLabel={lang === 'vi' ? 'Tệp Max' : 'Max Files'}
                  emptyText={lang === 'vi' ? 'Chưa có tệp ở gói Max.' : 'No files in Max tier.'}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderUserManagement = () => (
    <div className="space-y-5 rounded-3xl border border-surface-border bg-surface-raised p-6 shadow-sm shadow-black/10">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('nav.userManagement')}</p>
        <h2 className="mt-2 text-xl font-semibold text-white">{t('dashboard.userManagementTitle')}</h2>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <input value={userFiltersDraft.search} onChange={(e) => setUserFiltersDraft((p) => ({ ...p, search: e.target.value }))} placeholder={lang === 'vi' ? 'Tìm kiếm' : 'Search'} className="w-full min-w-0 rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200" />
        <input value={userFiltersDraft.email} onChange={(e) => setUserFiltersDraft((p) => ({ ...p, email: e.target.value }))} placeholder={t('dashboard.filterByEmail')} className="w-full min-w-0 rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200" />
        <input value={userFiltersDraft.name} onChange={(e) => setUserFiltersDraft((p) => ({ ...p, name: e.target.value }))} placeholder={t('dashboard.filterByName')} className="w-full min-w-0 rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200" />
        <select value={userFiltersDraft.status} onChange={(e) => setUserFiltersDraft((p) => ({ ...p, status: e.target.value }))} className="w-full min-w-0 rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200">
          <option value="">{t('dashboard.userStatusOptions.all')}</option>
          <option value="active">{t('dashboard.userStatusOptions.active')}</option>
          <option value="banned">{t('dashboard.userStatusOptions.banned')}</option>
          <option value="pending">{t('dashboard.userStatusOptions.pending')}</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setUserFilters((prev) => ({ ...prev, page: 1, ...userFiltersDraft }))}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-surface-base transition hover:bg-accent-hover"
        >
          {lang === 'vi' ? 'Áp dụng bộ lọc' : 'Apply filters'}
        </button>
      </div>

      {usersError && <p className="text-sm text-rose-300">{usersError}</p>}
      {usersLoading ? (
        <p className="text-sm text-slate-400">{lang === 'vi' ? 'Đang tải người dùng...' : 'Loading users...'}</p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-surface-border">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[1.2fr_1.5fr_0.8fr_1.5fr_0.8fr] gap-4 border-b border-surface-border bg-surface-base px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              <span>{t('dashboard.userName')}</span>
              <span>{t('dashboard.userEmail')}</span>
              <span>{t('dashboard.userStatus')}</span>
              <span>{t('dashboard.banReason')}</span>
              <span>{t('dashboard.action')}</span>
            </div>
            <div className="divide-y divide-surface-border bg-surface-raised/30">
              {users.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">{t('dashboard.noUsersFound')}</div>
              ) : (
                users.map((targetUser, index) => {
                  const status = String(targetUser?.status || '').toLowerCase()
                  const isBanned = status === 'banned' || status === 'suspended'
                  const isPending = status === 'pending'
                  const banReason = targetUser?.ban_reason || targetUser?.banReason || targetUser?.reason || '-'
                  const statusLabel = isBanned
                    ? t('dashboard.userStatusOptions.banned')
                    : isPending
                      ? t('dashboard.userStatusOptions.pending')
                      : status === 'active'
                        ? t('dashboard.userStatusOptions.active')
                        : targetUser?.status || '-'
                  const statusBadgeClass = isBanned
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20'
                    : isPending
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                      : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'

                  return (
                    <div key={targetUser?.id || targetUser?._id || `user-${index}`} className="grid grid-cols-[1.2fr_1.5fr_0.8fr_1.5fr_0.8fr] items-center gap-4 px-4 py-3 text-sm">
                      <span className="truncate text-white">{targetUser?.full_name || targetUser?.fullName || targetUser?.name || '-'}</span>
                      <span className="truncate text-slate-300">{targetUser?.email || '-'}</span>
                      <span className={`inline-flex w-fit rounded-xl px-2.5 py-1 text-xs font-semibold ${statusBadgeClass}`}>
                        {statusLabel}
                      </span>
                      <span className="truncate text-xs text-slate-400" title={typeof banReason === 'string' && banReason !== '-' ? banReason : undefined}>
                        {banReason}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleBan(targetUser)}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${isBanned ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25' : 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'}`}
                      >
                        {isBanned ? t('dashboard.unban') : t('dashboard.ban')}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-400">
        <button
          type="button"
          onClick={() => setUserFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
          disabled={userFilters.page === 1 || usersLoading}
          className="rounded-md px-2 py-1 transition hover:bg-surface-base/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {lang === 'vi' ? 'Trước' : 'Prev'}
        </button>
        <span>{lang === 'vi' ? 'Trang' : 'Page'} {userFilters.page}{usersTotalPages > 0 ? ` / ${usersTotalPages}` : ''}</span>
        <button
          type="button"
          onClick={() => setUserFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
          disabled={usersLoading || (usersTotalPages > 0 && userFilters.page >= usersTotalPages)}
          className="rounded-md px-2 py-1 transition hover:bg-surface-base/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {lang === 'vi' ? 'Sau' : 'Next'}
        </button>
      </div>
    </div>
  )

  const renderSubscriptionsManagement = () => (
    <div className="space-y-5 rounded-3xl border border-surface-border bg-surface-raised p-6 shadow-sm shadow-black/10">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('nav.subscriptions')}</p>
        <h2 className="mt-2 text-xl font-semibold text-white">{t('dashboard.subscriptionsTitle')}</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input value={planForm.name} onChange={(e) => setPlanForm((p) => ({ ...p, name: e.target.value }))} placeholder={t('dashboard.subscriptionsForm.name')} className="rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200" />
        <input value={planForm.display_name} onChange={(e) => setPlanForm((p) => ({ ...p, display_name: e.target.value }))} placeholder={t('dashboard.subscriptionsForm.displayName')} className="rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200" />
        <input value={planForm.char_limit} onChange={(e) => setPlanForm((p) => ({ ...p, char_limit: e.target.value }))} placeholder={t('dashboard.subscriptionsForm.charLimit')} className="rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200" />
        <input value={planForm.daily_word_limit} onChange={(e) => setPlanForm((p) => ({ ...p, daily_word_limit: e.target.value }))} placeholder={t('dashboard.subscriptionsForm.dailyWordLimit')} className="rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200" />
        <input value={planForm.price} onChange={(e) => setPlanForm((p) => ({ ...p, price: e.target.value }))} placeholder={t('dashboard.subscriptionsForm.price')} className="rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200" />
        <input value={planForm.duration_days} onChange={(e) => setPlanForm((p) => ({ ...p, duration_days: e.target.value }))} placeholder={t('dashboard.subscriptionsForm.durationDays')} className="rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200" />
        <textarea value={planForm.description} onChange={(e) => setPlanForm((p) => ({ ...p, description: e.target.value }))} placeholder={t('dashboard.subscriptionsForm.description')} className="md:col-span-2 rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200" rows={3} />
        <label className="inline-flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={planForm.is_active} onChange={(e) => setPlanForm((p) => ({ ...p, is_active: e.target.checked }))} /> {t('dashboard.subscriptionsForm.isActive')}
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={handleSavePlan} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-surface-base transition hover:bg-accent-hover">
          {editingPlanId ? t('dashboard.subscriptionsForm.update') : t('dashboard.subscriptionsForm.create')}
        </button>
        {editingPlanId && (
          <button type="button" onClick={resetPlanForm} className="rounded-xl border border-surface-border px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-surface-base/50">
            {t('dashboard.subscriptionsForm.cancelEdit')}
          </button>
        )}
      </div>

      {plansError && <p className="text-sm text-rose-300">{plansError}</p>}
      {plansLoading ? (
        <p className="text-sm text-slate-400">{t('dashboard.subscriptionsForm.loadingPlans')}</p>
      ) : (
        <div className="space-y-3">
          {plans.length === 0 ? (
            <div className="rounded-2xl border border-surface-border bg-surface-base/40 px-4 py-3 text-sm text-slate-400">
              {t('dashboard.subscriptionsForm.emptyPlans')}
            </div>
          ) : (
            plans.map((plan, index) => (
              <div key={plan?.id || plan?._id || `plan-${index}`} className="rounded-2xl border border-surface-border bg-surface-base/40 px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">{plan?.display_name || plan?.displayName || plan?.name || '-'}</p>
                    <p className="text-sm text-slate-400">{plan?.description || '-'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => handleEditPlan(plan, index)} className="rounded-md px-2 py-1 text-xs text-slate-300 transition hover:bg-surface-base/60">{t('dashboard.subscriptionsForm.edit')}</button>
                    <button type="button" onClick={() => handleDeletePlan(plan, index)} className="rounded-md px-2 py-1 text-xs text-rose-300 transition hover:bg-rose-500/10">{t('dashboard.subscriptionsForm.delete')}</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )

  const availableTags = useMemo(() => {
    const map = new Map()

    const addTag = (code, rawLabel) => {
      if (!code) return
      const cleanCode = String(code).trim()
      if (!cleanCode || map.has(cleanCode)) return
      const translated = t(`feedback.reasons.${cleanCode}`)
      const label = translated && translated !== `feedback.reasons.${cleanCode}`
        ? translated
        : (rawLabel || cleanCode)
      map.set(cleanCode, { code: cleanCode, label })
    }

    criteriaList.forEach((item) => {
      const code = typeof item === 'string' ? item : item?.code || item?.id || item?.name
      const label = typeof item === 'object' ? item?.label || item?.name : ''
      addTag(code, label)
    })

    feedbacks.forEach((fb) => {
      const tags = getFeedbackTags(fb, t)
      tags.forEach((tItem) => addTag(tItem.code, tItem.label))
    })

    const commonCodes = [
      'summary_accurate',
      'clear_concise',
      'good_structure',
      'context_preserved',
      'key_points_covered',
      'summary_inaccurate',
      'missing_critical_info',
      'hallucination',
      'awkward_phrasing',
      'too_long_or_short',
      'poor_formatting',
      'ocr_high_accuracy',
      'ocr_unreadable_file',
      'ocr_missing_large_text',
      'ocr_wrong_language',
      'ocr_character_errors',
      'ocr_layout_broken',
      'missing_info',
      'clunky_sentences',
      'spelling_grammar',
      'loss_of_context',
      'other',
    ]
    commonCodes.forEach((code) => addTag(code))

    return Array.from(map.values())
  }, [criteriaList, feedbacks, t])

  const displayedFeedbacks = useMemo(() => {
    return feedbacks.filter((fb) => {
      if (feedbackRating) {
        const ratingNum = Number(fb?.rating ?? fb?.score)
        const targetRating = Number(feedbackRating)
        if (Number.isFinite(targetRating)) {
          if (Number.isFinite(ratingNum) && ratingNum > 0) {
            if (ratingNum !== targetRating) return false
          } else {
            const raw = String(fb?.rating || '').toLowerCase()
            if (targetRating >= 4 && raw !== 'like') return false
            if (targetRating < 4 && raw !== 'dislike') return false
          }
        }
      }
      if (feedbackTag) {
        const tags = getFeedbackTags(fb, t)
        const hasTag = tags.some((tObj) => tObj.code === feedbackTag || tObj.label === feedbackTag)
        if (!hasTag) return false
      }
      return true
    })
  }, [feedbacks, feedbackRating, feedbackTag, t])

  const renderFeedbackModeration = () => (
    <div className="space-y-5 rounded-3xl border border-surface-border bg-surface-raised p-6 shadow-sm shadow-black/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('nav.feedbackModeration')}</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{t('dashboard.feedbackModerationUi.title')}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Trạng thái phản hồi */}
          <select
            value={feedbackReplyStatus}
            onChange={(e) => { setFeedbackReplyStatus(e.target.value); setFeedbackPage(1) }}
            className="rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200"
          >
            <option value="">{t('dashboard.feedbackModerationUi.allReplyStatus')}</option>
            <option value="pending">{t('dashboard.feedbackModerationUi.pending')}</option>
            <option value="replied">{t('dashboard.feedbackModerationUi.replied')}</option>
          </select>

          {/* Lọc số sao */}
          <select
            value={feedbackRating}
            onChange={(e) => { setFeedbackRating(e.target.value); setFeedbackPage(1) }}
            className="rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200"
          >
            <option value="">{t('dashboard.feedbackModerationUi.allRatings')}</option>
            <option value="5">5 ★ ({t('dashboard.feedbackModerationUi.star5')})</option>
            <option value="4">4 ★ ({t('dashboard.feedbackModerationUi.star4')})</option>
            <option value="3">3 ★ ({t('dashboard.feedbackModerationUi.star3')})</option>
            <option value="2">2 ★ ({t('dashboard.feedbackModerationUi.star2')})</option>
            <option value="1">1 ★ ({t('dashboard.feedbackModerationUi.star1')})</option>
          </select>

          {/* Lọc theo tag / tiêu chí */}
          <select
            value={feedbackTag}
            onChange={(e) => { setFeedbackTag(e.target.value); setFeedbackPage(1) }}
            className="rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200 max-w-[220px] truncate"
          >
            <option value="">{t('dashboard.feedbackModerationUi.allTags')}</option>
            {availableTags.map((tagItem) => (
              <option key={tagItem.code} value={tagItem.code}>
                {tagItem.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {feedbackError && <p className="text-sm text-rose-300">{feedbackError}</p>}
      {feedbackLoading ? (
        <p className="text-sm text-slate-400">{t('dashboard.feedbackModerationUi.loading')}</p>
      ) : (
        <div className="space-y-3">
          {displayedFeedbacks.length === 0 ? (
            <div className="rounded-2xl border border-surface-border bg-surface-base/40 px-4 py-3 text-sm text-slate-400">
              {t('dashboard.feedbackModerationUi.empty')}
            </div>
          ) : (
            displayedFeedbacks.map((feedback, index) => {
              const id = feedback?.id || feedback?._id || feedback?.feedback_id || `feedback-${index}`
              const replyStatus = getFeedbackReplyStatus(feedback)
              const isReplied = replyStatus === 'replied'
              const existingReply = getFeedbackExistingReply(feedback, templates)
              const replyForm = replyForms[id] || { template_type: existingReply.templateType, reply_content: existingReply.replyContent }
              const displayedReplyContent = isReplied
                ? (existingReply.replyContent || replyForm.reply_content || '')
                : (replyForm.reply_content ?? existingReply.replyContent ?? '')
              const selectedTemplateValue = isReplied
                ? (existingReply.templateType || (existingReply.replyContent ? 'custom' : ''))
                : (replyForm.template_type || existingReply.templateType || '')
              const isCustomTemplate = normalizeTemplateKey(selectedTemplateValue) === 'custom'
              const defaultTemplateReplyContent =
                !isCustomTemplate && selectedTemplateValue ? getTemplateDefaultContent(selectedTemplateValue, templates) : ''
              const resolvedDisplayedReplyContent = isCustomTemplate
                ? (displayedReplyContent || '')
                : (defaultTemplateReplyContent || displayedReplyContent || '')
              const selectedTemplateLabel = selectedTemplateValue ? getFeedbackTemplateLabel(selectedTemplateValue, t) : ''
              const hasSelectedTemplateInList = templates.some((tpl, tplIndex) => {
                const value = tpl?.type || tpl?.template_type || `template-${tplIndex}`
                return String(value) === String(selectedTemplateValue)
              })
              const feedbackEmail = getFeedbackUserEmail(feedback)
              const feedbackAuthorName = getFeedbackAuthorName(feedback, lang)
              const feedbackTags = getFeedbackTags(feedback, t)
              const userComment = getFeedbackUserComment(feedback)

              return (
                <div key={id} className="rounded-2xl border border-surface-border bg-surface-base/40 p-4 sm:p-5 space-y-3.5">
                  {/* Tag (hiển thị to hơn) & Đánh giá sao */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {feedbackTags.length > 0 ? (
                        feedbackTags.map((tagItem, tagIdx) => (
                          <span
                            key={`${tagItem.code || tagIdx}-${tagIdx}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-accent/20 border border-accent/40 px-3.5 py-1.5 text-base font-semibold text-white shadow-sm"
                          >
                            <span className="text-accent text-sm">🏷️</span>
                            <span>{tagItem.label}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs italic text-slate-500">
                          {t('dashboard.feedbackModerationUi.noTag')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm">
                        <span className="text-amber-400">★</span>
                        <span>{getFeedbackRatingLabel(feedback?.rating, t)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Comment của người dùng (ở dưới tag) */}
                  <div className="rounded-xl border border-surface-border/70 bg-surface-base/70 p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      {t('dashboard.feedbackModerationUi.userComment')}
                    </p>
                    {userComment ? (
                      <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap font-normal">
                        {userComment}
                      </p>
                    ) : (
                      <p className="text-xs italic text-slate-500">
                        {t('dashboard.feedbackModerationUi.noComment')}
                      </p>
                    )}
                  </div>

                  {/* Thông tin người gửi */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <p>
                      <span className="text-slate-500">{t('dashboard.feedbackModerationUi.userName')}:</span>{' '}
                      <span className="text-slate-200 font-semibold">{feedbackAuthorName}</span>
                    </p>
                    {feedbackEmail && (
                      <p>
                        <span className="text-slate-500">{t('dashboard.feedbackModerationUi.userEmail')}:</span>{' '}
                        <span className="text-slate-300 font-medium">{feedbackEmail}</span>
                      </p>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2 grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)_auto]">
                    <select
                      value={selectedTemplateValue}
                      onChange={(e) => {
                        const nextTemplateType = e.target.value
                        const nextTemplateContent = nextTemplateType && normalizeTemplateKey(nextTemplateType) !== 'custom'
                          ? getTemplateDefaultContent(nextTemplateType, templates)
                          : replyForm.reply_content || ''

                        setReplyForms((prev) => ({
                          ...prev,
                          [id]: {
                            ...replyForm,
                            template_type: nextTemplateType,
                            reply_content: nextTemplateType && normalizeTemplateKey(nextTemplateType) !== 'custom' ? nextTemplateContent : replyForm.reply_content || '',
                          },
                        }))
                      }}
                      disabled={isReplied}
                      className="w-full min-w-0 rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200"
                    >
                      <option value="">{t('dashboard.feedbackTemplates.select')}</option>
                      <option value="custom">{t('dashboard.feedbackTemplates.custom')}</option>
                      {selectedTemplateValue && !hasSelectedTemplateInList && !isCustomTemplate && (
                        <option value={selectedTemplateValue}>{selectedTemplateLabel}</option>
                      )}
                      {templates.map((tpl, tplIndex) => {
                        const value = tpl?.type || tpl?.template_type || `template-${tplIndex}`
                        const label = getFeedbackTemplateLabel(tpl?.label || tpl?.name || value, t)
                        return <option key={value} value={value}>{label}</option>
                      })}
                    </select>
                    <input
                      value={resolvedDisplayedReplyContent}
                      onChange={(e) => setReplyForms((prev) => ({ ...prev, [id]: { ...replyForm, reply_content: e.target.value } }))}
                      placeholder={t('dashboard.feedbackModerationUi.replyPlaceholder')}
                      readOnly={!isCustomTemplate}
                      disabled={isReplied || !isCustomTemplate}
                      className={`w-full min-w-0 rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200 ${!isCustomTemplate ? 'cursor-not-allowed opacity-80' : ''}`}
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" onClick={() => handleReplyFeedback(feedback, index)} disabled={isReplied} className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-surface-base transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-70">
                        {isReplied ? t('dashboard.feedbackModerationUi.repliedButton') : t('dashboard.feedbackModerationUi.reply')}
                      </button>
                      <button type="button" onClick={() => handleDeleteFeedback(feedback, index)} className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10">
                        {t('dashboard.feedbackModerationUi.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-400">
        <button
          type="button"
          onClick={() => setFeedbackPage((prev) => Math.max(1, prev - 1))}
          disabled={feedbackPage === 1 || feedbackLoading}
          className="rounded-md px-2 py-1 transition hover:bg-surface-base/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {lang === 'vi' ? 'Trước' : 'Prev'}
        </button>
        <span>{lang === 'vi' ? 'Trang' : 'Page'} {feedbackPage}{feedbackTotalPages > 0 ? ` / ${feedbackTotalPages}` : ''}</span>
        <button
          type="button"
          onClick={() => setFeedbackPage((prev) => prev + 1)}
          disabled={feedbackLoading || (feedbackTotalPages > 0 && feedbackPage >= feedbackTotalPages)}
          className="rounded-md px-2 py-1 transition hover:bg-surface-base/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {lang === 'vi' ? 'Sau' : 'Next'}
        </button>
      </div>
    </div>
  )

  const renderAiMonitorPlaceholder = () => (
    <div className="rounded-3xl border border-surface-border bg-surface-raised p-6 shadow-sm shadow-black/10">
      <p className="text-sm text-slate-400">{lang === 'vi' ? 'Mục giám sát AI sẽ được mở rộng sau.' : 'AI monitor section can be expanded later.'}</p>
    </div>
  )

  const renderPageContent = () => {
    if (activeNav === 'analyticsReports') return renderAnalyticsReports()
    if (activeNav === 'userManagement') return renderUserManagement()
    if (activeNav === 'subscriptionsManagement') return renderSubscriptionsManagement()
    if (activeNav === 'feedbackModeration') return renderFeedbackModeration()
    return renderAiMonitorPlaceholder()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden rounded-3xl border border-surface-border bg-surface-raised p-6 lg:block">
        <div className="mb-8">
          <div className="text-sm font-semibold uppercase tracking-[0.32em] text-slate-500">
            {t('nav.dashboard')}
          </div>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveNav(item.id)}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                activeNav === item.id
                  ? 'bg-accent/10 text-white shadow-sm shadow-accent/20'
                  : 'text-slate-300 hover:bg-surface-elevated hover:text-white'
              }`}
            >
              <span>{t(item.labelKey)}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-white lg:hidden">
            {t(navItems.find((n) => n.id === activeNav)?.labelKey || 'nav.dashboard')}
          </h1>
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-xl border border-surface-border bg-surface-raised px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-surface-elevated hover:text-white"
            >
              {t('dashboard.switchToUserPage')}
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Tab Selector (visible on < lg) */}
        <div className="rounded-2xl border border-surface-border bg-surface-raised p-2 lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {navItems.map((item) => {
              const isActive = activeNav === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveNav(item.id)}
                  className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-accent text-surface-base shadow-sm shadow-accent/25'
                      : 'border border-surface-border bg-surface-base text-slate-300 hover:border-accent/40 hover:text-white'
                  }`}
                >
                  {t(item.labelKey)}
                </button>
              )
            })}
          </div>
        </div>

        {renderPageContent()}
      </div>

      {deleteFeedbackTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-raised p-5 shadow-2xl shadow-black/40">
            <h3 className="text-lg font-semibold text-white">{t('dashboard.feedbackModerationUi.deleteTitle')}</h3>
            <p className="mt-2 text-sm text-slate-400">{t('dashboard.feedbackModerationUi.deleteDescription')}</p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteFeedbackTarget(null)}
                disabled={isDeletingFeedback}
                className="rounded-lg border border-surface-border px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-surface-base/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t('dashboard.feedbackModerationUi.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDeleteFeedback}
                disabled={isDeletingFeedback}
                className="rounded-lg bg-rose-500/90 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t('dashboard.feedbackModerationUi.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage
