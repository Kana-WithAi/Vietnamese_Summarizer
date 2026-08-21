import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { adminApi } from '../utils/api'

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

function FileFormatPieChart({ data = [], lang, formatMetric }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)

  const total = useMemo(() => {
    return data.reduce((sum, item) => sum + (Number(item.value) || 0), 0)
  }, [data])

  if (!data.length || total === 0) {
    return (
      <p className="mt-3 text-xs text-slate-500">
        {lang === 'vi' ? 'Chưa có dữ liệu biểu đồ.' : 'No chart data available yet.'}
      </p>
    )
  }

  // Calculate slice angles
  let currentAngle = 0
  const slices = data.map((item, index) => {
    const value = Number(item.value) || 0
    const percentage = (value / total) * 100
    const angle = (value / total) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle += angle

    // SVG arc calculation (radius: 70, center: 100, 100)
    const rad = (deg) => ((deg - 90) * Math.PI) / 180
    const x1 = 100 + 70 * Math.cos(rad(startAngle))
    const y1 = 100 + 70 * Math.sin(rad(startAngle))
    const x2 = 100 + 70 * Math.cos(rad(endAngle))
    const y2 = 100 + 70 * Math.sin(rad(endAngle))
    const largeArc = angle > 180 ? 1 : 0

    // Inner radius for donut hole (45)
    const ix1 = 100 + 45 * Math.cos(rad(endAngle))
    const iy1 = 100 + 45 * Math.sin(rad(endAngle))
    const ix2 = 100 + 45 * Math.cos(rad(startAngle))
    const iy2 = 100 + 45 * Math.sin(rad(startAngle))

    const pathData = data.length === 1
      ? `M 100 30 A 70 70 0 1 1 99.99 30 M 100 55 A 45 45 0 1 0 100.01 55`
      : `M ${x1} ${y1} A 70 70 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A 45 45 0 ${largeArc} 0 ${ix2} ${iy2} Z`

    return {
      ...item,
      percentage,
      pathData,
      color: PIE_COLORS[index % PIE_COLORS.length],
    }
  })

  const activeSlice = hoveredIndex !== null ? slices[hoveredIndex] : null

  return (
    <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-around">
      {/* SVG Donut / Pie Chart */}
      <div className="relative flex items-center justify-center">
        <svg
          viewBox="0 0 200 200"
          className="h-48 w-48 drop-shadow-md sm:h-56 sm:w-56"
        >
          {slices.map((slice, index) => {
            const isHovered = hoveredIndex === index
            return (
              <path
                key={slice.label}
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

        {/* Center label (Donut hole info) */}
        <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
          {activeSlice ? (
            <>
              <span className="text-xs font-semibold uppercase text-slate-300">
                {activeSlice.label}
              </span>
              <span className="text-sm font-bold text-white">
                {activeSlice.percentage.toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-400">
                {formatMetric(activeSlice.value)}
              </span>
            </>
          ) : (
            <>
              <span className="text-[11px] uppercase tracking-wider text-slate-400">
                {lang === 'vi' ? 'Tổng tệp' : 'Total'}
              </span>
              <span className="text-base font-bold text-white">
                {formatMetric(total)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Breakdown / Legend List */}
      <div className="w-full flex-1 space-y-2.5 max-w-sm min-w-0">
        {slices.map((slice, index) => {
          const isHovered = hoveredIndex === index
          return (
            <div
              key={slice.label}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs transition-all cursor-pointer ${
                isHovered
                  ? 'border-accent bg-surface-base/90 shadow-sm'
                  : 'border-surface-border/70 bg-surface-base/50 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="font-semibold text-slate-200">{slice.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400">
                  {formatMetric(slice.value)}
                </span>
                <span
                  className="font-bold min-w-[45px] text-right"
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

function getFeedbackComment(feedback, lang) {
  const candidates = [
    feedback?.content,
    feedback?.message,
    feedback?.comment,
    feedback?.feedback_content,
    feedback?.feedbackContent,
    feedback?.details,
    feedback?.description,
    feedback?.reason,
    feedback?.text,
    feedback?.body,
    feedback?.payload?.content,
    feedback?.payload?.message,
    feedback?.feedback?.content,
    feedback?.feedback?.message,
  ]

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

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
  const normalized = String(rating || '').trim().toLowerCase()
  if (normalized === 'like') return t('dashboard.feedbackModerationUi.like')
  if (normalized === 'dislike') return t('dashboard.feedbackModerationUi.dislike')
  return rating || '-'
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
  const [analyticsData, setAnalyticsData] = useState({ users: null, requests: null, fileFormats: null, activeUsers: null })

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
  const [templates, setTemplates] = useState([])
  const [replyForms, setReplyForms] = useState({})
  const [deleteFeedbackTarget, setDeleteFeedbackTarget] = useState(null)
  const [isDeletingFeedback, setIsDeletingFeedback] = useState(false)

  const dateParams = useMemo(() => ({ from_date: fromDate, to_date: toDate }), [fromDate, toDate])

  const loadAnalytics = async () => {
    setAnalyticsLoading(true)
    setAnalyticsError('')
    try {
      const [usersRes, requestsRes, fileFormatsRes, activeUsersRes] = await Promise.all([
        adminApi.analytics.users(dateParams),
        adminApi.analytics.requests(dateParams),
        adminApi.analytics.fileFormats(dateParams),
        adminApi.analytics.activeUsers(),
      ])
      setAnalyticsData({
        users: usersRes?.data || usersRes,
        requests: requestsRes?.data || requestsRes,
        fileFormats: fileFormatsRes?.data || fileFormatsRes,
        activeUsers: activeUsersRes?.data || activeUsersRes,
      })
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

  const loadFeedbacks = async (pageValue = feedbackPage, ratingValue = feedbackRating, replyStatusValue = feedbackReplyStatus) => {
    setFeedbackLoading(true)
    setFeedbackError('')
    try {
      const response = await adminApi.feedbacks.list({
        page: pageValue,
        limit: 20,
        rating: ratingValue || undefined,
        admin_replied: replyStatusValue || undefined,
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
      loadFeedbacks(feedbackPage, feedbackRating, feedbackReplyStatus)
      loadReplyTemplates()
    }
  }, [activeNav, feedbackPage, feedbackRating, feedbackReplyStatus])

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

  const usersTimeSeries = useMemo(() => extractRecordList(analyticsData.users), [analyticsData.users])

  const usersByStatusMap = useMemo(
    () => deepFindObject(analyticsData.users, ['users_by_status', 'usersByStatus']) || {},
    [analyticsData.users],
  )
  const usersByRoleMap = useMemo(
    () => deepFindObject(analyticsData.users, ['users_by_role', 'usersByRole']) || {},
    [analyticsData.users],
  )
  const activeByPlanMap = useMemo(
    () => deepFindObject(analyticsData.activeUsers, ['by_plan', 'byPlan']) || {},
    [analyticsData.activeUsers],
  )

  const analyticsCards = useMemo(() => {
    const fallbackTotalUsers = Object.values(usersByStatusMap).reduce((sum, value) => sum + (Number(value) || 0), 0)

    const totalUsers =
      deepFindNumber(analyticsData.users, [
        'total_users_overall',
        'totalUsersOverall',
        'total_users',
        'totalUsers',
        'total',
        'count',
        'registrations',
      ]) ||
      fallbackTotalUsers ||
      0

    const newUsersFromSeries = usersTimeSeries.reduce((sum, point) => {
      const value = Number(point?.new_users ?? point?.newUsers ?? point?.count ?? 0)
      return sum + (Number.isFinite(value) ? value : 0)
    }, 0)

    const newUsers =
      deepFindNumber(analyticsData.users, ['total_users_in_period', 'totalUsersInPeriod']) ||
      newUsersFromSeries ||
      0

    const totalRequests =
      deepFindNumber(analyticsData.requests, ['total_requests', 'totalRequests', 'total', 'count', 'requests']) ||
      0

    const fallbackActiveUsersCount = Object.values(activeByPlanMap).reduce((sum, value) => sum + (Number(value) || 0), 0)

    const activeUsersCount =
      deepFindNumber(analyticsData.activeUsers, ['active_users_count', 'activeUsersCount', 'active_users', 'activeUsers']) ||
      fallbackActiveUsersCount ||
      0

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
        value: activeUsersCount,
        accent: 'text-amber-300',
      },
    ]
  }, [analyticsData.users, analyticsData.requests, analyticsData.activeUsers, usersByStatusMap, activeByPlanMap, usersTimeSeries, lang])

  const userStatusPoints = useMemo(
    () => extractObjectPoints(usersByStatusMap),
    [usersByStatusMap],
  )
  const userRolePoints = useMemo(
    () => extractObjectPoints(usersByRoleMap),
    [usersByRoleMap],
  )
  const activeByPlanPoints = useMemo(
    () => extractObjectPoints(activeByPlanMap),
    [activeByPlanMap],
  )
  const requestInsights = useMemo(
    () => ({
      characters: deepFindNumber(analyticsData.requests, ['total_characters_processed', 'totalCharactersProcessed']) || 0,
      words: deepFindNumber(analyticsData.requests, ['total_words_processed', 'totalWordsProcessed']) || 0,
      latency: deepFindNumber(analyticsData.requests, ['avg_latency_ms', 'avgLatencyMs']) || 0,
    }),
    [analyticsData.requests],
  )
  const activeUsersWindowMinutes = useMemo(
    () => deepFindNumber(analyticsData.activeUsers, ['window_minutes', 'windowMinutes']) || 5,
    [analyticsData.activeUsers],
  )

  const fileFormatTrend = useMemo(() => extractFormatPoints(analyticsData.fileFormats), [analyticsData.fileFormats])

  const userCompositionMax = useMemo(
    () => Math.max(1, ...[...userStatusPoints, ...userRolePoints].map((point) => point.value)),
    [userStatusPoints, userRolePoints],
  )
  const activeByPlanMax = useMemo(() => Math.max(1, ...activeByPlanPoints.map((point) => point.value)), [activeByPlanPoints])
  const fileFormatMax = useMemo(() => Math.max(1, ...fileFormatTrend.map((point) => point.value)), [fileFormatTrend])

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

  const handleSavePlan = async () => {
    const payload = {
      name: planForm.name,
      display_name: planForm.display_name,
      char_limit: parseNumber(planForm.char_limit),
      daily_word_limit: parseNumber(planForm.daily_word_limit),
      price: parseNumber(planForm.price),
      duration_days: parseNumber(planForm.duration_days),
      description: planForm.description,
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
      setPlansError(error?.message || (lang === 'vi' ? 'Không thể lưu gói.' : 'Unable to save plan.'))
    }
  }

  const handleEditPlan = (plan, index) => {
    const id = plan?.id || plan?._id || plan?.subscription_id || `plan-${index}`
    setEditingPlanId(id)
    setPlanForm({
      name: String(plan?.name || ''),
      display_name: String(plan?.display_name || plan?.displayName || ''),
      char_limit: String(plan?.char_limit ?? plan?.charLimit ?? ''),
      daily_word_limit: String(plan?.daily_word_limit ?? plan?.dailyWordLimit ?? ''),
      price: String(plan?.price ?? ''),
      duration_days: String(plan?.duration_days ?? plan?.durationDays ?? ''),
      description: String(plan?.description || ''),
      is_active: Boolean(plan?.is_active ?? plan?.isActive ?? true),
    })
  }

  const handleDeletePlan = async (plan, index) => {
    const id = plan?.id || plan?._id || plan?.subscription_id || `plan-${index}`
    if (!window.confirm(lang === 'vi' ? 'Xóa gói này?' : 'Delete this plan?')) return

    try {
      await adminApi.subscriptions.remove(id)
      await loadPlans()
    } catch (error) {
      setPlansError(error?.message || (lang === 'vi' ? 'Không thể xóa gói.' : 'Unable to delete plan.'))
    }
  }

  const handleToggleBan = async (user) => {
    const id = user?.id || user?._id || user?.user_id
    if (!id) return

    const isBanned = String(user?.status || '').toLowerCase() === 'banned'
    try {
      if (isBanned) {
        await adminApi.users.unban(id)
      } else {
        const reason = window.prompt(lang === 'vi' ? 'Lý do cấm (tùy chọn):' : 'Ban reason (optional):') || ''
        await adminApi.users.ban(id, reason ? { reason } : {})
      }
      await loadUsers(userFilters)
    } catch (error) {
      setUsersError(error?.message || (lang === 'vi' ? 'Không thể cập nhật trạng thái người dùng.' : 'Unable to update user status.'))
    }
  }

  const handleReplyFeedback = async (feedback, index) => {
    const id = feedback?.id || feedback?._id || feedback?.feedback_id || `feedback-${index}`
    const { replyContent, templateType } = getFeedbackExistingReply(feedback)
    const form = replyForms[id] || { template_type: templateType, reply_content: replyContent }
    const currentStatus = getFeedbackReplyStatus(feedback)
    const selectedTemplate = form.template_type || templateType || ''
    const isCustomTemplate = normalizeTemplateKey(selectedTemplate) === 'custom'
    const resolvedReplyContent = isCustomTemplate
      ? (form.reply_content || '').trim()
      : (getTemplateDefaultContent(selectedTemplate, templates) || form.reply_content || '').trim()

    if (currentStatus === 'replied') {
      return
    }

    if (isCustomTemplate && !resolvedReplyContent) {
      setFeedbackError(lang === 'vi' ? 'Nội dung phản hồi không được để trống.' : 'Reply content is required.')
      return
    }

    if (!isCustomTemplate && !resolvedReplyContent) {
      setFeedbackError(lang === 'vi' ? 'Mẫu phản hồi đã chọn chưa có nội dung mặc định.' : 'The selected template has no default reply content.')
      return
    }

    try {
      const nextReplyForm = {
        ...form,
        template_type: selectedTemplate || undefined,
        reply_content: resolvedReplyContent,
      }

      setReplyForms((prev) => ({ ...prev, [id]: nextReplyForm }))

      await adminApi.feedbacks.reply(id, {
        template_type: nextReplyForm.template_type || undefined,
        reply_content: nextReplyForm.reply_content,
        admin_replied: 'replied',
      })
      await loadFeedbacks(feedbackPage, feedbackRating, feedbackReplyStatus)
    } catch (error) {
      setFeedbackError(error?.message || (lang === 'vi' ? 'Không thể gửi phản hồi.' : 'Unable to send feedback reply.'))
    }
  }

  const handleDeleteFeedback = (feedback, index) => {
    const id = feedback?.id || feedback?._id || feedback?.feedback_id || `feedback-${index}`
    setDeleteFeedbackTarget({ id, feedback })
  }

  const confirmDeleteFeedback = async () => {
    if (!deleteFeedbackTarget?.id) return
    setIsDeletingFeedback(true)

    try {
      await adminApi.feedbacks.remove(deleteFeedbackTarget.id)
      setDeleteFeedbackTarget(null)
      await loadFeedbacks(feedbackPage, feedbackRating, feedbackReplyStatus)
    } catch (error) {
      setFeedbackError(error?.message || (lang === 'vi' ? 'Không thể xóa phản hồi.' : 'Unable to delete feedback.'))
    } finally {
      setIsDeletingFeedback(false)
    }
  }

  const renderAnalyticsReports = () => (
    <div className="space-y-4 rounded-3xl border border-surface-border bg-surface-raised p-6 shadow-sm shadow-black/10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('nav.overview')}</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{lang === 'vi' ? 'Báo cáo phân tích' : 'Analytics reports'}</h2>
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
        <div className="text-sm text-slate-400">{lang === 'vi' ? 'Đang tải dữ liệu...' : 'Loading data...'}</div>
      ) : (
        <div className="space-y-4">
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

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-surface-border bg-surface-base/40 p-4">
              <p className="text-sm font-semibold text-white">{lang === 'vi' ? 'Phân bổ người dùng' : 'User segmentation'}</p>
              {[...userStatusPoints, ...userRolePoints].length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">{lang === 'vi' ? 'Chưa có dữ liệu biểu đồ.' : 'No chart data available yet.'}</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {userStatusPoints.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{lang === 'vi' ? 'Theo trạng thái' : 'By status'}</p>
                      {userStatusPoints.map((point) => (
                        <div key={`status-${point.label}-${point.value}`}>
                          <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                            <span className="truncate pr-2">{point.label}</span>
                            <span>{formatMetric(point.value)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-surface-border/60">
                            <div
                              className="h-2 rounded-full bg-cyan-400"
                              style={{ width: `${Math.max(4, (point.value / userCompositionMax) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {userRolePoints.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{lang === 'vi' ? 'Theo vai trò' : 'By role'}</p>
                      {userRolePoints.map((point) => (
                        <div key={`role-${point.label}-${point.value}`}>
                          <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                            <span className="truncate pr-2">{point.label}</span>
                            <span>{formatMetric(point.value)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-surface-border/60">
                            <div
                              className="h-2 rounded-full bg-indigo-400"
                              style={{ width: `${Math.max(4, (point.value / userCompositionMax) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-base/40 p-4">
              <p className="text-sm font-semibold text-white">{lang === 'vi' ? 'Yêu cầu & người dùng realtime' : 'Requests & realtime users'}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-surface-border/70 bg-surface-base/50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{lang === 'vi' ? 'Ký tự xử lý' : 'Chars processed'}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{formatMetric(requestInsights.characters)}</p>
                </div>
                <div className="rounded-xl border border-surface-border/70 bg-surface-base/50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{lang === 'vi' ? 'Từ xử lý' : 'Words processed'}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{formatMetric(requestInsights.words)}</p>
                </div>
                <div className="rounded-xl border border-surface-border/70 bg-surface-base/50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{lang === 'vi' ? 'Độ trễ TB' : 'Avg latency'}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{formatMetric(requestInsights.latency)} ms</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {lang === 'vi' ? 'Đang hoạt động theo gói' : 'Active by plan'}
                  <span className="ml-2 normal-case tracking-normal text-slate-400">
                    ({lang === 'vi' ? 'cửa sổ' : 'window'} {activeUsersWindowMinutes} {lang === 'vi' ? 'phút' : 'minutes'})
                  </span>
                </p>
                {activeByPlanPoints.length === 0 ? (
                  <p className="text-xs text-slate-500">{lang === 'vi' ? 'Chưa có dữ liệu realtime.' : 'No realtime plan data yet.'}</p>
                ) : (
                  activeByPlanPoints.map((point) => (
                    <div key={`plan-${point.label}-${point.value}`}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                        <span className="truncate pr-2">{point.label}</span>
                        <span>{formatMetric(point.value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-border/60">
                        <div
                          className="h-2 rounded-full bg-emerald-400"
                          style={{ width: `${Math.max(4, (point.value / activeByPlanMax) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-base/40 p-4">
            <p className="text-sm font-semibold text-white">{lang === 'vi' ? 'Phân bổ định dạng tệp' : 'File format distribution'}</p>
            <FileFormatPieChart data={fileFormatTrend} lang={lang} formatMetric={formatMetric} />
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
          <option value="">{lang === 'vi' ? 'Tất cả trạng thái' : 'All status'}</option>
          <option value="active">active</option>
          <option value="banned">banned</option>
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
                users.map((user, index) => {
                  const status = String(user?.status || '').toLowerCase()
                  const isBanned = status === 'banned' || status === 'suspended'
                  const banReason = user?.ban_reason || user?.banReason || user?.reason || '-'
                  return (
                    <div key={user?.id || user?._id || `user-${index}`} className="grid grid-cols-[1.2fr_1.5fr_0.8fr_1.5fr_0.8fr] items-center gap-4 px-4 py-3 text-sm">
                      <span className="truncate text-white">{user?.full_name || user?.fullName || user?.name || '-'}</span>
                      <span className="truncate text-slate-300">{user?.email || '-'}</span>
                      <span className={`inline-flex w-fit rounded-xl px-2.5 py-1 text-xs font-semibold ${isBanned ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                        {user?.status || '-'}
                      </span>
                      <span className="truncate text-xs text-slate-400" title={typeof banReason === 'string' && banReason !== '-' ? banReason : undefined}>
                        {banReason}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleBan(user)}
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

  const renderFeedbackModeration = () => (
    <div className="space-y-5 rounded-3xl border border-surface-border bg-surface-raised p-6 shadow-sm shadow-black/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('nav.feedbackModeration')}</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{t('dashboard.feedbackModerationUi.title')}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={feedbackReplyStatus}
            onChange={(e) => { setFeedbackReplyStatus(e.target.value); setFeedbackPage(1) }}
            className="rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200"
          >
            <option value="">{t('dashboard.feedbackModerationUi.allReplyStatus')}</option>
            <option value="pending">{t('dashboard.feedbackModerationUi.pending')}</option>
            <option value="replied">{t('dashboard.feedbackModerationUi.replied')}</option>
          </select>
          <select value={feedbackRating} onChange={(e) => { setFeedbackRating(e.target.value); setFeedbackPage(1) }} className="rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200">
            <option value="">{t('dashboard.feedbackModerationUi.allRatings')}</option>
            <option value="like">{t('dashboard.feedbackModerationUi.like')}</option>
            <option value="dislike">{t('dashboard.feedbackModerationUi.dislike')}</option>
          </select>
        </div>
      </div>

      {feedbackError && <p className="text-sm text-rose-300">{feedbackError}</p>}
      {feedbackLoading ? (
        <p className="text-sm text-slate-400">{t('dashboard.feedbackModerationUi.loading')}</p>
      ) : (
        <div className="space-y-3">
          {feedbacks.length === 0 ? (
            <div className="rounded-2xl border border-surface-border bg-surface-base/40 px-4 py-3 text-sm text-slate-400">
              {t('dashboard.feedbackModerationUi.empty')}
            </div>
          ) : (
            feedbacks.map((feedback, index) => {
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

              return (
                <div key={id} className="rounded-2xl border border-surface-border bg-surface-base/40 px-4 py-4">
                  <p className="text-sm text-white">{getFeedbackComment(feedback, lang)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t('dashboard.feedbackModerationUi.userEmail')}: {feedbackEmail || '-'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{t('dashboard.feedbackModerationUi.ratingLabel')}: {getFeedbackRatingLabel(feedback?.rating, t)}</p>

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
