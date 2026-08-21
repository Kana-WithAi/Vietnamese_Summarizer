const DEFAULT_API_BASE_URL = '/api/v1'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL

function getPreferredLanguage() {
  const storedLang = localStorage.getItem('lang')
  if (storedLang === 'en' || storedLang === 'vi') {
    return storedLang
  }

  const htmlLang = document.documentElement.lang
  return htmlLang === 'en' ? 'en' : 'vi'
}

function formatLocalizedApiError(message) {
  if (typeof message !== 'string') {
    return message
  }

  const normalized = message.trim()
  if (!normalized) {
    return message
  }

  const lang = getPreferredLanguage()
  const lower = normalized.toLowerCase()

  const commonTranslations = {
    'valid authentication token is required': {
      en: 'Please log in again to continue.',
      vi: 'Vui lòng đăng nhập lại để tiếp tục.',
    },
    'authentication token is required': {
      en: 'Please log in to continue.',
      vi: 'Vui lòng đăng nhập để tiếp tục.',
    },
    'invalid authentication token': {
      en: 'Please log in again to continue.',
      vi: 'Vui lòng đăng nhập lại để tiếp tục.',
    },
    'unauthorized': {
      en: 'Unauthorized request.',
      vi: 'Yêu cầu không được phép.',
    },
    'forbidden': {
      en: 'Access forbidden.',
      vi: 'Truy cập bị từ chối.',
    },
    'failed to fetch': {
      en: 'Unable to connect to the server.',
      vi: 'Không thể kết nối đến máy chủ.',
    },
    'networkerror': {
      en: 'Network error. Please check your connection and try again.',
      vi: 'Lỗi mạng. Vui lòng kiểm tra kết nối và thử lại.',
    },
    'not found': {
      en: 'The requested resource was not found.',
      vi: 'Không tìm thấy tài nguyên yêu cầu.',
    },
  }

  for (const [key, translations] of Object.entries(commonTranslations)) {
    if (lower.includes(key)) {
      return translations[lang] || translations.en
    }
  }

  return normalized
}

function isLikelyTechnicalBackendMessage(value) {
  if (typeof value !== 'string') {
    return false
  }

  const normalized = value.trim()
  if (!normalized) {
    return false
  }

  const lower = normalized.toLowerCase()
  const technicalMarkers = [
    'panic:',
    'goroutine',
    'stack trace',
    'traceback',
    'sql:',
    'database error',
    'internal server error',
    'runtime error',
    'exception:',
    'at ',
    'call stack',
    'request id',
    'trace id',
    'debug:',
    'error id',
  ]

  return technicalMarkers.some((marker) => lower.includes(marker))
}

function getErrorMessage(data) {
  const genericMessage = getPreferredLanguage() === 'vi'
    ? 'Yêu cầu không thể hoàn thành.'
    : 'The request could not be completed.'

  if (!data) {
    return genericMessage
  }

  if (typeof data === 'string') {
    const formatted = formatLocalizedApiError(data)
    return isLikelyTechnicalBackendMessage(data) ? genericMessage : formatted
  }

  if (typeof data === 'object') {
    const candidates = [data.message, data.error, data.detail, data.msg]

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        if (isLikelyTechnicalBackendMessage(candidate)) {
          return genericMessage
        }
        return formatLocalizedApiError(candidate)
      }

      if (candidate && typeof candidate === 'object') {
        const nested = getErrorMessage(candidate)
        if (nested && nested !== genericMessage) {
          return nested
        }
      }
    }

    return genericMessage
  }

  return genericMessage
}

async function request(path, { method = 'GET', body, auth = false, headers = {} } = {}) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const config = {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
  }

  if (auth) {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  if (body !== undefined && body !== null) {
    config.body = isFormData ? body : JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, config)
  const contentType = response.headers.get('content-type') || ''

  let data = null
  if (contentType.includes('application/json')) {
    data = await response.json()
  } else {
    data = await response.text()
  }

  if (!response.ok) {
    const error = new Error(getErrorMessage(data))
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

async function requestBinary(path, { method = 'GET', body, auth = false, headers = {} } = {}) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const config = {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
  }

  if (auth) {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  if (body !== undefined && body !== null) {
    config.body = isFormData ? body : JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, config)

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || ''
    let data = null
    if (contentType.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    const error = new Error(getErrorMessage(data))
    error.status = response.status
    error.data = data
    throw error
  }

  const blob = await response.blob()
  return {
    blob,
    contentType: response.headers.get('content-type') || '',
    contentDisposition: response.headers.get('content-disposition') || '',
  }
}

function buildQuery(params = {}) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.set(key, String(value))
  })

  const content = query.toString()
  return content ? `?${content}` : ''
}

export const authApi = {
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  verifyEmail: (payload) => request('/auth/verify-email', { method: 'POST', body: payload }),
  resendOtp: (payload) => request('/auth/resend-otp', { method: 'POST', body: payload }),
  forgotPassword: (payload) => request('/auth/forgot-password', { method: 'POST', body: payload }),
  verifyResetOtp: (payload) => request('/auth/verify-reset-otp', { method: 'POST', body: payload }),
  resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: payload }),
  changePassword: (payload) => request('/auth/change-password', { method: 'POST', body: payload, auth: true }),
  updateProfile: (payload) => request('/auth/profile', { method: 'PUT', body: payload, auth: true }),
  me: () => request('/auth/me', { auth: true }),
}

export const subscriptionsApi = {
  plans: () => request('/subscriptions/plans'),
  me: () => request('/subscriptions/me', { auth: true }),
}

export const summarizeApi = {
  text: (payload) => request('/summarize/text', { method: 'POST', body: payload, auth: true }),
  file: (payload) => requestBinary('/summarize/file', { method: 'POST', body: payload, auth: true }),
}

function buildOcrFormData(file, options = {}) {
  if (!file) {
    throw new Error('OCR file is required.')
  }

  const formData = new FormData()
  formData.append('file', file)

  const extractLayout = options.extract_layout ?? options.extractLayout ?? true
  formData.append('extract_layout', String(Boolean(extractLayout)))
  formData.append('options.extract_layout', String(Boolean(extractLayout)))

  return formData
}

export const ocrApi = {
  process: (file, options = {}) =>
    request('/ocr/process', {
      method: 'POST',
      body: buildOcrFormData(file, options),
      auth: Boolean(options.auth),
    }),
  file: (file, options = {}) =>
    request('/ocr/file', {
      method: 'POST',
      body: buildOcrFormData(file, options),
      auth: Boolean(options.auth),
    }),
  index: (file, options = {}) =>
    request('/ocr', {
      method: 'POST',
      body: buildOcrFormData(file, options),
      auth: Boolean(options.auth),
    }),
}

export const feedbacksApi = {
  list: (params = {}) => request(`/feedbacks${buildQuery(params)}`),
  criteria: (params = {}) => request(`/feedbacks/criteria${buildQuery(params)}`),
  create: (payload) => request('/feedbacks', { method: 'POST', body: payload, auth: true }),
  update: (id, payload) => request(`/feedbacks/${id}`, { method: 'PUT', body: payload, auth: true }),
  remove: (id) => request(`/feedbacks/${id}`, { method: 'DELETE', auth: true }),
}

export const historyApi = {
  list: (params = {}) => {
    const query = new URLSearchParams()

    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.is_bookmarked !== undefined && params.is_bookmarked !== null) {
      query.set('is_bookmarked', String(params.is_bookmarked))
    }

    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request(`/history${suffix}`, { auth: true })
  },
  getById: (id) => request(`/history/${id}`, { auth: true }),
  updateTitle: (id, title) => request(`/history/${id}`, { method: 'PUT', body: { title }, auth: true }),
  setBookmark: (id, isBookmarked) =>
    request(`/history/${id}/bookmark`, {
      method: 'PUT',
      body: { is_bookmarked: Boolean(isBookmarked) },
      auth: true,
    }),
  update: (id, payload) => request(`/history/${id}`, { method: 'PUT', body: payload, auth: true }),
  removeAll: () => request('/history/all', { method: 'DELETE', auth: true }),
  removeById: (id) => request(`/history/${id}`, { method: 'DELETE', auth: true }),
}

export const collectionsApi = {
  list: (params = {}) => request(`/collections${buildQuery(params)}`, { auth: true }),
  create: (payload) => request('/collections', { method: 'POST', body: payload, auth: true }),
  getById: (id) => request(`/collections/${id}`, { auth: true }),
  getHistories: (id, params = {}) => request(`/collections/${id}/histories${buildQuery(params)}`, { auth: true }),
  getItems: (id, params = {}) => request(`/collections/${id}/items${buildQuery(params)}`, { auth: true }),
  update: (id, payload) => request(`/collections/${id}`, { method: 'PUT', body: payload, auth: true }),
  remove: (id) => request(`/collections/${id}`, { method: 'DELETE', auth: true }),
}

export const adminApi = {
  users: {
    list: (params = {}) => request(`/admin/users${buildQuery(params)}`, { auth: true }),
    ban: (id, payload = {}) => request(`/admin/users/${id}/ban`, { method: 'POST', body: payload, auth: true }),
    unban: (id) => request(`/admin/users/${id}/unban`, { method: 'POST', auth: true }),
  },
  subscriptions: {
    list: () => request('/admin/subscriptions', { auth: true }),
    create: (payload) => request('/admin/subscriptions', { method: 'POST', body: payload, auth: true }),
    update: (id, payload) => request(`/admin/subscriptions/${id}`, { method: 'PUT', body: payload, auth: true }),
    remove: (id) => request(`/admin/subscriptions/${id}`, { method: 'DELETE', auth: true }),
  },
  feedbacks: {
    list: ({ page, limit, rating, admin_replied } = {}) =>
      request(
        `/admin/feedbacks${buildQuery({ page, limit, rating, admin_replied })}`,
        { auth: true },
      ),
    replyTemplates: () => request('/admin/feedbacks/reply-templates', { auth: true }),
    reply: (id, payload) =>
      request(`/admin/feedbacks/${id}/reply`, {
        method: 'POST',
        body: {
          template_type: payload?.template_type,
          reply_content: payload?.reply_content,
          admin_replied: payload?.admin_replied,
        },
        auth: true,
      }),
    remove: (id) => request(`/admin/feedbacks/${id}`, { method: 'DELETE', auth: true }),
  },
  analytics: {
    users: (params = {}) => request(`/admin/analytics/users${buildQuery(params)}`, { auth: true }),
    requests: (params = {}) => request(`/admin/analytics/requests${buildQuery(params)}`, { auth: true }),
    fileFormats: (params = {}) => request(`/admin/analytics/file-formats${buildQuery(params)}`, { auth: true }),
    activeUsers: () => request('/admin/analytics/active-users', { auth: true }),
  },
}

export const sessionsApi = {
  list: () => request('/user/sessions', { auth: true }),
  revokeOther: () => request('/user/sessions/other', { method: 'DELETE', auth: true }),
  revokeById: (id) => request(`/user/sessions/${id}`, { method: 'DELETE', auth: true }),
}

export const paymentsApi = {
  create: (payload) => request('/payments/create', { method: 'POST', body: payload, auth: true }),
  cancel: (orderCode) => request(`/payments/${orderCode}/cancel`, { method: 'POST', auth: true }),
  webhook: (payload) => request('/payments/webhook', { method: 'POST', body: payload }),
  status: (orderCode) => request(`/payments/status/${orderCode}`, { auth: true }),
  myTransactions: (params = {}) => {
    const query = new URLSearchParams()

    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.status) query.set('status', String(params.status))

    const suffix = query.toString() ? `?${query.toString()}` : ''
    const primaryPath = `/payments/my-transactions${suffix}`
    const fallbackPath = `/payments/transactions${suffix}`

    return request(primaryPath, { auth: true }).catch((error) => {
      if (error?.status === 404) {
        return request(fallbackPath, { auth: true })
      }

      throw error
    })
  },
  transactions: (params = {}) => {
    const query = new URLSearchParams()

    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.status) query.set('status', String(params.status))

    const suffix = query.toString() ? `?${query.toString()}` : ''
    const primaryPath = `/payments/transactions${suffix}`
    const fallbackPath = `/payments/my-transactions${suffix}`

    return request(primaryPath, { auth: true }).catch((error) => {
      if (error?.status === 404) {
        return request(fallbackPath, { auth: true })
      }

      throw error
    })
  },
}
