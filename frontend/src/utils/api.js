const DEFAULT_API_BASE_URL = '/api/v1'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL

async function request(path, { method = 'GET', body, auth = false, headers = {} } = {}) {
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
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
    config.body = JSON.stringify(body)
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
    const message =
      data?.message ||
      data?.error ||
      data?.detail ||
      'The request could not be completed.'
    throw new Error(message)
  }

  return data
}

export const authApi = {
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  me: () => request('/auth/me', { auth: true }),
}

export const subscriptionsApi = {
  plans: () => request('/subscriptions/plans'),
  me: () => request('/subscriptions/me', { auth: true }),
}

export const summarizeApi = {
  text: (payload) => request('/summarize/text', { method: 'POST', body: payload, auth: false }),
  file: (payload) => request('/summarize/file', { method: 'POST', body: payload, auth: false }),
}

export const historyApi = {
  list: () => request('/history', { auth: true }),
  getById: (id) => request(`/history/${id}`, { auth: true }),
  update: (id, payload) => request(`/history/${id}`, { method: 'PUT', body: payload, auth: true }),
  removeAll: () => request('/history/all', { method: 'DELETE', auth: true }),
  removeById: (id) => request(`/history/${id}`, { method: 'DELETE', auth: true }),
}
