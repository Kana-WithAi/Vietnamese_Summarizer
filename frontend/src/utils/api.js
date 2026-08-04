const DEFAULT_API_BASE_URL = '/api/v1'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL

function getErrorMessage(data) {
  if (!data) {
    return 'The request could not be completed.'
  }

  if (typeof data === 'string') {
    return data
  }

  if (typeof data === 'object') {
    const candidates = [data.message, data.error, data.detail, data.msg]

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate
      }

      if (candidate && typeof candidate === 'object') {
        const nested = getErrorMessage(candidate)
        if (nested && nested !== 'The request could not be completed.') {
          return nested
        }
      }
    }

    try {
      return JSON.stringify(data)
    } catch {
      return 'The request could not be completed.'
    }
  }

  return 'The request could not be completed.'
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

export const feedbacksApi = {
  list: (params = {}) => request(`/feedbacks${buildQuery(params)}`),
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
