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
  return payload?.data || payload || {}
}

function extractRecordList(payload) {
  const data = getDataObject(payload)
  if (Array.isArray(data)) return data

  const candidates = ['items', 'results', 'records', 'data', 'series', 'stats', 'list']
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
    []

  if (Array.isArray(reasonList) && reasonList.length > 0) {
    return reasonList.map((item) => String(item)).join(', ')
  }

  return lang === 'vi' ? 'Người dùng không để lại bình luận.' : 'No comment provided by user.'
}

function getFeedbackTemplateLabel(templateType, t) {
  const normalized = String(templateType || '').trim().toLowerCase()
  if (normalized === 'thank_you' || normalized === 'thankyou') return t('dashboard.feedbackTemplates.thankYou')
  if (normalized === 'apology') return t('dashboard.feedbackTemplates.apology')
  if (normalized === 'feature_noted' || normalized === 'feature-noted') return t('dashboard.feedbackTemplates.featureNoted')
  if (normalized === 'custom') return t('dashboard.feedbackTemplates.custom')
  return templateType
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

function getFeedbackExistingReply(feedback) {
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
    feedback?.reply?.template_type,
  ]

  let templateType = ''
  for (const value of templateTypeCandidates) {
    if (typeof value === 'string' && value.trim()) {
      templateType = value.trim()
      break
    }
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

function DashboardPage() {
  const { t, lang } = useLanguage()
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('analyticsReports')

  const [fromDate, setFromDate] = useState('2026-07-01')
  const [toDate, setToDate] = useState('2026-08-01')
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

  const analyticsCards = useMemo(() => {
    const usersData = getDataObject(analyticsData.users)
    const requestsData = getDataObject(analyticsData.requests)
    const activeUsersData = getDataObject(analyticsData.activeUsers)

    const totalUsers =
      pickNumberByKeys(usersData, ['total_users', 'totalUsers', 'total', 'count', 'registrations']) ||
      extractTrendPoints(usersData).reduce((sum, point) => sum + point.value, 0)

    const totalRequests =
      pickNumberByKeys(requestsData, ['total_requests', 'totalRequests', 'total', 'count', 'requests']) ||
      extractTrendPoints(requestsData).reduce((sum, point) => sum + point.value, 0)

    const dau =
      pickNumberByKeys(activeUsersData, ['dau', 'daily_active_users', 'dailyActiveUsers', 'active_users', 'activeUsers']) ||
      0

    const mau =
      pickNumberByKeys(activeUsersData, ['mau', 'monthly_active_users', 'monthlyActiveUsers']) ||
      0

    const ratio = mau > 0 ? (dau / mau) * 100 : 0

    return [
      {
        key: 'users',
        title: lang === 'vi' ? 'Tổng người dùng mới' : 'Total new users',
        value: totalUsers,
        accent: 'text-cyan-300',
      },
      {
        key: 'requests',
        title: lang === 'vi' ? 'Tổng yêu cầu API' : 'Total API requests',
        value: totalRequests,
        accent: 'text-indigo-300',
      },
      {
        key: 'dau',
        title: 'DAU',
        value: dau,
        accent: 'text-emerald-300',
      },
      {
        key: 'mauRatio',
        title: lang === 'vi' ? 'Tỷ lệ DAU/MAU' : 'DAU/MAU ratio',
        value: ratio,
        accent: 'text-amber-300',
        suffix: '%',
      },
    ]
  }, [analyticsData, lang])

  const userTrend = useMemo(() => extractTrendPoints(analyticsData.users), [analyticsData.users])
  const requestTrend = useMemo(() => extractTrendPoints(analyticsData.requests), [analyticsData.requests])
  const fileFormatTrend = useMemo(() => extractFormatPoints(analyticsData.fileFormats), [analyticsData.fileFormats])

  const userTrendMax = useMemo(() => Math.max(1, ...userTrend.map((point) => point.value)), [userTrend])
  const requestTrendMax = useMemo(() => Math.max(1, ...requestTrend.map((point) => point.value)), [requestTrend])
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

    if (currentStatus === 'replied') {
      return
    }

    if (!form.reply_content.trim()) {
      setFeedbackError(lang === 'vi' ? 'Nội dung phản hồi không được để trống.' : 'Reply content is required.')
      return
    }

    try {
      await adminApi.feedbacks.reply(id, {
        template_type: form.template_type || undefined,
        reply_content: form.reply_content,
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
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('nav.overview')}</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{lang === 'vi' ? 'Báo cáo phân tích' : 'Analytics reports'}</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200" />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200" />
          <button type="button" onClick={loadAnalytics} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-surface-base transition hover:bg-accent-hover">
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
              <p className="text-sm font-semibold text-white">{lang === 'vi' ? 'Xu hướng người dùng mới' : 'New user trend'}</p>
              {userTrend.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">{lang === 'vi' ? 'Chưa có dữ liệu biểu đồ.' : 'No chart data available yet.'}</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {userTrend.slice(0, 8).map((point) => (
                    <div key={`${point.label}-${point.value}`}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                        <span className="truncate pr-2">{point.label}</span>
                        <span>{formatMetric(point.value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-border/60">
                        <div
                          className="h-2 rounded-full bg-cyan-400"
                          style={{ width: `${Math.max(4, (point.value / userTrendMax) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-base/40 p-4">
              <p className="text-sm font-semibold text-white">{lang === 'vi' ? 'Xu hướng yêu cầu API' : 'API request trend'}</p>
              {requestTrend.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">{lang === 'vi' ? 'Chưa có dữ liệu biểu đồ.' : 'No chart data available yet.'}</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {requestTrend.slice(0, 8).map((point) => (
                    <div key={`${point.label}-${point.value}`}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                        <span className="truncate pr-2">{point.label}</span>
                        <span>{formatMetric(point.value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-border/60">
                        <div
                          className="h-2 rounded-full bg-indigo-400"
                          style={{ width: `${Math.max(4, (point.value / requestTrendMax) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-base/40 p-4">
            <p className="text-sm font-semibold text-white">{lang === 'vi' ? 'Phân bổ định dạng tệp' : 'File format distribution'}</p>
            {fileFormatTrend.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">{lang === 'vi' ? 'Chưa có dữ liệu biểu đồ.' : 'No chart data available yet.'}</p>
            ) : (
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {fileFormatTrend.map((point) => (
                  <div key={`${point.label}-${point.value}`} className="rounded-xl border border-surface-border/70 bg-surface-base/50 px-3 py-2">
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                      <span>{point.label}</span>
                      <span>{formatMetric(point.value)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-border/60">
                      <div
                        className="h-2 rounded-full bg-emerald-400"
                        style={{ width: `${Math.max(6, (point.value / fileFormatMax) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <input value={userFiltersDraft.search} onChange={(e) => setUserFiltersDraft((p) => ({ ...p, search: e.target.value }))} placeholder={lang === 'vi' ? 'Tìm kiếm' : 'Search'} className="rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200" />
        <input value={userFiltersDraft.email} onChange={(e) => setUserFiltersDraft((p) => ({ ...p, email: e.target.value }))} placeholder={t('dashboard.filterByEmail')} className="rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200" />
        <input value={userFiltersDraft.name} onChange={(e) => setUserFiltersDraft((p) => ({ ...p, name: e.target.value }))} placeholder={t('dashboard.filterByName')} className="rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200" />
        <select value={userFiltersDraft.status} onChange={(e) => setUserFiltersDraft((p) => ({ ...p, status: e.target.value }))} className="rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200">
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
        <div className="overflow-hidden rounded-3xl border border-surface-border">
          <div className="grid grid-cols-[1.3fr_1.8fr_1fr_1fr] gap-4 border-b border-surface-border bg-surface-base px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            <span>{t('dashboard.userName')}</span>
            <span>{t('dashboard.userEmail')}</span>
            <span>{t('dashboard.userStatus')}</span>
            <span>{t('dashboard.action')}</span>
          </div>
          <div className="divide-y divide-surface-border bg-surface-raised/30">
            {users.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">{t('dashboard.noUsersFound')}</div>
            ) : (
              users.map((user, index) => {
                const status = String(user?.status || '').toLowerCase()
                const isBanned = status === 'banned' || status === 'suspended'
                return (
                  <div key={user?.id || user?._id || `user-${index}`} className="grid grid-cols-[1.3fr_1.8fr_1fr_1fr] items-center gap-4 px-4 py-3 text-sm">
                    <span className="truncate text-white">{user?.full_name || user?.fullName || user?.name || '-'}</span>
                    <span className="truncate text-slate-300">{user?.email || '-'}</span>
                    <span className={`inline-flex w-fit rounded-xl px-2.5 py-1 text-xs font-semibold ${isBanned ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                      {user?.status || '-'}
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('nav.feedbackModeration')}</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{t('dashboard.feedbackModerationUi.title')}</h2>
        </div>
        <div className="flex items-center gap-2">
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
              const existingReply = getFeedbackExistingReply(feedback)
              const replyForm = replyForms[id] || { template_type: existingReply.templateType, reply_content: existingReply.replyContent }
              const displayedReplyContent = isReplied
                ? (existingReply.replyContent || replyForm.reply_content || '')
                : (replyForm.reply_content ?? existingReply.replyContent ?? '')
              const selectedTemplateValue = replyForm.template_type || existingReply.templateType || ''
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

                  <div className="mt-3 grid gap-2 md:grid-cols-[220px_1fr_auto]">
                    <select
                      value={selectedTemplateValue}
                      onChange={(e) => setReplyForms((prev) => ({ ...prev, [id]: { ...replyForm, template_type: e.target.value } }))}
                      disabled={isReplied}
                      className="rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200"
                    >
                      <option value="">{t('dashboard.feedbackTemplates.select')}</option>
                      {selectedTemplateValue && !hasSelectedTemplateInList && (
                        <option value={selectedTemplateValue}>{selectedTemplateLabel}</option>
                      )}
                      {templates.map((tpl, tplIndex) => {
                        const value = tpl?.type || tpl?.template_type || `template-${tplIndex}`
                        const label = getFeedbackTemplateLabel(tpl?.label || tpl?.name || value, t)
                        return <option key={value} value={value}>{label}</option>
                      })}
                    </select>
                    <input
                      value={displayedReplyContent}
                      onChange={(e) => setReplyForms((prev) => ({ ...prev, [id]: { ...replyForm, reply_content: e.target.value } }))}
                      placeholder={t('dashboard.feedbackModerationUi.replyPlaceholder')}
                      disabled={isReplied}
                      className="rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-200"
                    />
                    <div className="flex items-center gap-2">
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
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
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
              {activeNav === item.id && <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[11px] uppercase tracking-[0.24em] text-accent">{t('dashboard.active')}</span>}
            </button>
          ))}
        </nav>
      </aside>

      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-xl border border-surface-border bg-surface-raised px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-surface-elevated hover:text-white"
          >
            {t('dashboard.switchToUserPage')}
          </button>
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
