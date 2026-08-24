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

export const API_ERROR_MESSAGES = {
  // Group 1: Analytics
  INVALID_DATE_FORMAT: {
    vi: 'Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD.',
    en: 'Invalid date format. Please use YYYY-MM-DD.',
  },
  INVALID_DATE_ORDER: {
    vi: 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.',
    en: 'From date must be earlier than or equal to To date.',
  },
  DATE_IN_FUTURE: {
    vi: 'Ngày tra cứu không được vượt quá ngày hiện tại.',
    en: 'Selected date cannot be in the future.',
  },

  // Group 2: Summarize & OCR
  TEXT_TOO_SHORT: {
    vi: 'Văn bản quá ngắn, yêu cầu tối thiểu 10 ký tự.',
    en: 'Text is too short. A minimum of 10 characters is required.',
  },
  TEXT_TOO_LONG: {
    vi: 'Văn bản vượt quá hạn mức từ cho phép của gói cước hiện tại.',
    en: 'Text exceeds the maximum word limit for your current plan.',
  },
  INVALID_LENGTH_RATIO: {
    vi: 'Tỷ lệ độ dài không hợp lệ (phải lớn hơn 0 và nhỏ hơn hoặc bằng 100%).',
    en: 'Invalid length ratio (must be greater than 0 and up to 100%).',
  },
  DAILY_WORD_LIMIT_EXCEEDED: {
    vi: 'Bạn đã dùng hết hạn mức từ tóm tắt trong ngày. Hạn mức sẽ được làm mới vào 00:00 ngày mai.',
    en: 'You have reached your daily word limit. It will reset at 00:00 tomorrow.',
  },
  EMPTY_FILE: {
    vi: 'Tệp tải lên không được rỗng (0 bytes).',
    en: 'The uploaded file cannot be empty (0 bytes).',
  },
  UNSUPPORTED_FILE_TYPE: {
    vi: 'Định dạng tệp không được hỗ trợ. Vui lòng chọn tệp .pdf, .docx, .doc, .txt, .png, .jpg, hoặc .jpeg.',
    en: 'Unsupported file type. Please upload a .pdf, .docx, .doc, .txt, .png, .jpg, or .jpeg file.',
  },
  UNSUPPORTED_FILE: {
    vi: 'Định dạng tệp không được hỗ trợ. Vui lòng chọn tệp .pdf, .docx, .doc, .txt, .png, .jpg, hoặc .jpeg.',
    en: 'Unsupported file type. Please upload a .pdf, .docx, .doc, .txt, .png, .jpg, or .jpeg file.',
  },
  FILE_TOO_LARGE: {
    vi: 'Dung lượng tệp vượt quá giới hạn tối đa cho phép của gói cước.',
    en: 'The file size exceeds the allowed limit for your subscription plan.',
  },
  DAILY_EXTRACT_LIMIT_EXCEEDED: {
    vi: 'Bạn đã dùng hết số lượt trích xuất tài liệu trong ngày hôm nay.',
    en: 'You have reached your daily document extraction limit.',
  },
  TEXT_EXTRACT_FAILED: {
    vi: 'Không thể trích xuất nội dung từ tệp này. Vui lòng thử tệp khác hoặc dán văn bản thủ công.',
    en: 'Unable to extract content from this file. Please try another file or paste text manually.',
  },
  ML_SERVICE_UNAVAILABLE: {
    vi: 'Hệ thống AI xử lý đang bận hoặc tạm thời gián đoạn. Vui lòng thử lại sau ít phút.',
    en: 'The AI summarization service is currently busy or unavailable. Please try again shortly.',
  },

  // Group 3: Collections & History
  COLLECTION_NAME_REQUIRED: {
    vi: 'Tên thư mục không được để trống.',
    en: 'Collection name cannot be empty.',
  },
  COLLECTION_NAME_TOO_LONG: {
    vi: 'Tên thư mục không được vượt quá 100 ký tự.',
    en: 'Collection name must not exceed 100 characters.',
  },
  INVALID_COLOR: {
    vi: 'Mã màu không hợp lệ. Vui lòng sử dụng mã màu HEX (ví dụ: #7C3AED hoặc #F53).',
    en: 'Invalid color format. Please use a HEX color code (e.g. #7C3AED or #F53).',
  },
  COLLECTION_DESC_TOO_LONG: {
    vi: 'Mô tả thư mục không được vượt quá 500 ký tự.',
    en: 'Collection description must not exceed 500 characters.',
  },
  INVALID_ID: {
    vi: 'Mã định danh không hợp lệ.',
    en: 'Invalid identifier format.',
  },
  FOLDER_LIMIT_EXCEEDED: {
    vi: 'Bạn đã đạt giới hạn số lượng thư mục tối đa của gói cước hiện tại. Vui lòng nâng cấp gói để tạo thêm.',
    en: 'You have reached the maximum folder limit for your current plan. Upgrade to create more.',
  },
  NOT_FOUND: {
    vi: 'Không tìm thấy dữ liệu yêu cầu hoặc mục này đã bị xóa.',
    en: 'The requested resource was not found or has been removed.',
  },

  // Group 4: Feedbacks
  CONTENT_REQUIRED: {
    vi: 'Vui lòng chọn ít nhất một tiêu chí đánh giá hoặc nhập nhận xét khi đánh giá từ 1 đến 3 sao.',
    en: 'Please select at least one criteria tag or provide comments for ratings of 1 to 3 stars.',
  },
  FORBIDDEN: {
    vi: 'Bạn không có quyền thực hiện thao tác này.',
    en: 'You do not have permission to perform this action.',
  },

  // Group 5: Payments
  PLAN_NOT_FOUND: {
    vi: 'Gói cước không tồn tại hoặc đã ngừng cung cấp.',
    en: 'Subscription plan not found or no longer available.',
  },
  INVALID_URL: {
    vi: 'Đường dẫn liên kết không hợp lệ (phải bắt đầu bằng http:// hoặc https://).',
    en: 'Invalid URL format (must start with http:// or https://).',
  },
  TRANSACTION_NOT_PENDING: {
    vi: 'Chỉ có thể hủy giao dịch đang trong trạng thái chờ thanh toán.',
    en: 'Only pending transactions can be cancelled.',
  },

  // Group 6: Auth
  EMAIL_EXISTS: {
    vi: 'Địa chỉ email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.',
    en: 'This email address is already registered. Please log in or use another email.',
  },
  PASSWORD_TOO_SHORT: {
    vi: 'Mật khẩu quá ngắn. Yêu cầu tối thiểu 8 ký tự.',
    en: 'Password is too short. Minimum 8 characters required.',
  },
  PASSWORD_TOO_LONG: {
    vi: 'Mật khẩu quá dài. Tối đa không quá 72 ký tự.',
    en: 'Password is too long. Maximum 72 characters allowed.',
  },
  SAME_PASSWORD: {
    vi: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.',
    en: 'New password cannot be the same as your current password.',
  },
  INVALID_PASSWORD: {
    vi: 'Mật khẩu hiện tại không chính xác.',
    en: 'Current password is incorrect.',
  },
  INVALID_OTP: {
    vi: 'Mã xác thực OTP không hợp lệ hoặc đã hết hạn (5 phút).',
    en: 'Invalid or expired OTP code (5-minute expiration).',
  },
  OTP_RATE_LIMIT: {
    vi: 'Vui lòng đợi 60 giây trước khi yêu cầu gửi lại mã OTP mới.',
    en: 'Please wait 60 seconds before requesting a new OTP.',
  },

  // Group 7: Admin
  CANNOT_BAN_SELF: {
    vi: 'Quản trị viên không thể tự vô hiệu hóa tài khoản của chính mình.',
    en: 'Administrators cannot disable their own account.',
  },
  VALIDATION_ERROR: {
    vi: 'Dữ liệu đầu vào không hợp lệ. Vui lòng kiểm tra lại thông tin.',
    en: 'Invalid input data. Please verify your information.',
  },
}

function extractErrorDetails(data) {
  let code = ''
  let message = ''

  if (typeof data === 'string') {
    message = data
  } else if (data && typeof data === 'object') {
    if (data.error && typeof data.error === 'object') {
      code = String(data.error.code || '').trim().toUpperCase()
      message = String(data.error.message || '').trim()
    } else if (typeof data.error === 'string') {
      message = data.error.trim()
    }

    if (!code && data.code) {
      code = String(data.code).trim().toUpperCase()
    }
    if (!message && data.message) {
      message = String(data.message).trim()
    }
    if (!message && data.detail) {
      message = String(data.detail).trim()
    }
    if (!message && data.msg) {
      message = String(data.msg).trim()
    }
  }

  return { code, message }
}

function isLikelyTechnicalBackendMessage(value) {
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  if (!normalized) return false

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
    '<html',
    '<!doctype',
  ]

  return technicalMarkers.some((marker) => normalized.includes(marker))
}

export function getLocalizedErrorMessage(data, defaultFallback) {
  const lang = getPreferredLanguage()
  const { code, message } = extractErrorDetails(data)

  if (code && API_ERROR_MESSAGES[code]) {
    return API_ERROR_MESSAGES[code][lang] || API_ERROR_MESSAGES[code].en
  }

  const lower = (message || '').toLowerCase()
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

  if (defaultFallback) {
    return defaultFallback
  }

  return lang === 'vi'
    ? 'Yêu cầu không thể hoàn thành. Vui lòng thử lại.'
    : 'The request could not be completed. Please try again.'
}

function getErrorMessage(data) {
  return getLocalizedErrorMessage(data)
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
    const errorDetails = extractErrorDetails(data)
    const localizedMessage = getLocalizedErrorMessage(data)
    const error = new Error(localizedMessage)
    error.status = response.status
    error.code = errorDetails.code
    error.rawMessage = errorDetails.message
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

    const errorDetails = extractErrorDetails(data)
    const localizedMessage = getLocalizedErrorMessage(data)
    const error = new Error(localizedMessage)
    error.status = response.status
    error.code = errorDetails.code
    error.rawMessage = errorDetails.message
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

const cacheStore = new Map()
const inFlightStore = new Map()

export function clearApiCache(prefix = '') {
  if (!prefix) {
    cacheStore.clear()
    inFlightStore.clear()
    return
  }
  for (const key of cacheStore.keys()) {
    if (key.includes(prefix)) {
      cacheStore.delete(key)
    }
  }
  for (const key of inFlightStore.keys()) {
    if (key.includes(prefix)) {
      inFlightStore.delete(key)
    }
  }
}

export async function cachedRequest(path, options = {}, ttlMs = 3 * 60 * 1000) {
  const method = options.method || 'GET'
  if (method !== 'GET') {
    return request(path, options)
  }

  const token = options.auth ? localStorage.getItem('accessToken') : ''
  const cacheKey = `${options.auth ? `auth:${token}:` : 'pub:'}${path}`

  if (!options.force) {
    const cached = cacheStore.get(cacheKey)
    if (cached && Date.now() < cached.expiry) {
      return cached.data
    }

    const inFlight = inFlightStore.get(cacheKey)
    if (inFlight) {
      return inFlight
    }
  }

  const promise = request(path, options)
    .then((data) => {
      cacheStore.set(cacheKey, {
        data,
        expiry: Date.now() + ttlMs,
      })
      return data
    })
    .finally(() => {
      setTimeout(() => {
        inFlightStore.delete(cacheKey)
      }, 300)
    })

  inFlightStore.set(cacheKey, promise)
  return promise
}

export const authApi = {
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  logout: () => request('/auth/logout', { method: 'POST', auth: true }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  verifyEmail: (payload) => request('/auth/verify-email', { method: 'POST', body: payload }),
  resendOtp: (payload) => request('/auth/resend-otp', { method: 'POST', body: payload }),
  forgotPassword: (payload) => request('/auth/forgot-password', { method: 'POST', body: payload }),
  verifyResetOtp: (payload) => request('/auth/verify-reset-otp', { method: 'POST', body: payload }),
  resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: payload }),
  changePassword: (payload) => request('/auth/change-password', { method: 'POST', body: payload, auth: true }),
  updateProfile: async (payload) => {
    const res = await request('/auth/profile', { method: 'PUT', body: payload, auth: true })
    clearApiCache('/auth/me')
    return res
  },
  me: (force = false) => cachedRequest('/auth/me', { auth: true, force }, 60 * 1000),
}

export const subscriptionsApi = {
  plans: (force = false) => cachedRequest('/subscriptions/plans', { force }, 5 * 60 * 1000),
  me: (force = false) => cachedRequest('/subscriptions/me', { auth: true, force }, 60 * 1000),
}

export const summarizeApi = {
  text: (payload) => {
    const normalizedPayload =
      payload && typeof payload === 'object' && 'length_ratio' in payload
        ? {
            ...payload,
            length_ratio:
              typeof payload.length_ratio === 'number'
                ? payload.length_ratio
                : Number(payload.length_ratio),
          }
        : payload
    return request('/summarize/text', { method: 'POST', body: normalizedPayload, auth: true })
  },
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
  list: (params = {}, force = false) => cachedRequest(`/feedbacks${buildQuery(params)}`, { force }, 60 * 1000),
  criteria: (params = {}, force = false) => cachedRequest(`/feedbacks/criteria${buildQuery(params)}`, { force }, 10 * 60 * 1000),
  create: async (payload) => {
    const res = await request('/feedbacks', { method: 'POST', body: payload, auth: true })
    clearApiCache('/feedbacks')
    clearApiCache('/admin/feedbacks')
    return res
  },
  update: async (id, payload) => {
    const res = await request(`/feedbacks/${id}`, { method: 'PUT', body: payload, auth: true })
    clearApiCache('/feedbacks')
    clearApiCache('/admin/feedbacks')
    return res
  },
  remove: async (id) => {
    const res = await request(`/feedbacks/${id}`, { method: 'DELETE', auth: true })
    clearApiCache('/feedbacks')
    clearApiCache('/admin/feedbacks')
    return res
  },
}

export const historyApi = {
  list: (params = {}, force = false) => {
    const query = new URLSearchParams()

    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.is_bookmarked !== undefined && params.is_bookmarked !== null) {
      query.set('is_bookmarked', String(params.is_bookmarked))
    }

    const suffix = query.toString() ? `?${query.toString()}` : ''
    return cachedRequest(`/history${suffix}`, { auth: true, force }, 20 * 1000)
  },
  getById: (id, force = false) => cachedRequest(`/history/${id}`, { auth: true, force }, 60 * 1000),
  updateTitle: async (id, title) => {
    const res = await request(`/history/${id}`, { method: 'PUT', body: { title }, auth: true })
    clearApiCache('/history')
    return res
  },
  setBookmark: async (id, isBookmarked) => {
    const res = await request(`/history/${id}/bookmark`, {
      method: 'PUT',
      body: { is_bookmarked: Boolean(isBookmarked) },
      auth: true,
    })
    clearApiCache('/history')
    return res
  },
  update: async (id, payload) => {
    const res = await request(`/history/${id}`, { method: 'PUT', body: payload, auth: true })
    clearApiCache('/history')
    return res
  },
  removeAll: async () => {
    const res = await request('/history/all', { method: 'DELETE', auth: true })
    clearApiCache('/history')
    return res
  },
  removeById: async (id) => {
    const res = await request(`/history/${id}`, { method: 'DELETE', auth: true })
    clearApiCache('/history')
    return res
  },
}

export const collectionsApi = {
  list: (params = {}, force = false) => cachedRequest(`/collections${buildQuery(params)}`, { auth: true, force }, 2 * 60 * 1000),
  create: async (payload) => {
    const res = await request('/collections', { method: 'POST', body: payload, auth: true })
    clearApiCache('/collections')
    return res
  },
  getById: (id) => request(`/collections/${id}`, { auth: true }),
  getHistories: (id, params = {}) => request(`/collections/${id}/histories${buildQuery(params)}`, { auth: true }),
  getItems: (id, params = {}) => request(`/collections/${id}/items${buildQuery(params)}`, { auth: true }),
  update: async (id, payload) => {
    const res = await request(`/collections/${id}`, { method: 'PUT', body: payload, auth: true })
    clearApiCache('/collections')
    return res
  },
  remove: async (id) => {
    const res = await request(`/collections/${id}`, { method: 'DELETE', auth: true })
    clearApiCache('/collections')
    return res
  },
}

export const adminApi = {
  users: {
    list: (params = {}) => request(`/admin/users${buildQuery(params)}`, { auth: true }),
    ban: (id, payload = {}) => {
      const reason =
        typeof payload === 'string'
          ? payload
          : payload?.reason || payload?.ban_reason || payload?.banReason || ''
      const body = {
        reason,
        ban_reason: reason,
        ...(typeof payload === 'object' ? payload : {}),
      }
      return request(`/admin/users/${id}/ban`, { method: 'POST', body, auth: true })
    },
    unban: (id) =>
      request(`/admin/users/${id}/unban`, { method: 'POST', auth: true }).catch((err) => {
        if (err?.status === 404 || err?.status === 405) {
          return request(`/admin/users/${id}/unban`, { method: 'PUT', auth: true }).catch(() => {
            return request(`/admin/users/${id}/ban`, { method: 'DELETE', auth: true })
          })
        }
        throw err
      }),
  },
  subscriptions: {
    list: (force = false) => cachedRequest('/admin/subscriptions', { auth: true, force }, 3 * 60 * 1000),
    create: async (payload) => {
      const res = await request('/admin/subscriptions', { method: 'POST', body: payload, auth: true })
      clearApiCache('/subscriptions')
      clearApiCache('/admin/subscriptions')
      return res
    },
    update: async (id, payload) => {
      const res = await request(`/admin/subscriptions/${id}`, { method: 'PUT', body: payload, auth: true })
      clearApiCache('/subscriptions')
      clearApiCache('/admin/subscriptions')
      return res
    },
    remove: async (id) => {
      const res = await request(`/admin/subscriptions/${id}`, { method: 'DELETE', auth: true })
      clearApiCache('/subscriptions')
      clearApiCache('/admin/subscriptions')
      return res
    },
  },
  feedbacks: {
    list: ({ page, limit, rating, admin_replied, tag } = {}) =>
      request(
        `/admin/feedbacks${buildQuery({ page, limit, rating, admin_replied, tag })}`,
        { auth: true },
      ),
    replyTemplates: (force = false) => cachedRequest('/admin/feedbacks/reply-templates', { auth: true, force }, 10 * 60 * 1000),
    reply: async (id, payload) => {
      const res = await request(`/admin/feedbacks/${id}/reply`, {
        method: 'POST',
        body: {
          template_type: payload?.template_type,
          reply_content: payload?.reply_content,
          admin_replied: payload?.admin_replied,
        },
        auth: true,
      })
      clearApiCache('/admin/feedbacks')
      clearApiCache('/feedbacks')
      return res
    },
    remove: async (id) => {
      const res = await request(`/admin/feedbacks/${id}`, { method: 'DELETE', auth: true })
      clearApiCache('/admin/feedbacks')
      clearApiCache('/feedbacks')
      return res
    },
  },
  analytics: {
    overview: (params = {}) => request(`/admin/analytics${buildQuery(params)}`, { auth: true }),
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
