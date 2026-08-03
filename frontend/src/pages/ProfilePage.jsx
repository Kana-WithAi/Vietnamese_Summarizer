import { useEffect, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { authApi, paymentsApi, sessionsApi } from '../utils/api'

const initialProfile = {
  displayName: '',
  email: '',
  role: 'Member',
  plan: 'Free',
}

function ProfilePage() {
  const { t, lang } = useLanguage()
  const [profile, setProfile] = useState(initialProfile)
  const [activeTab, setActiveTab] = useState('profile')
  const [formState, setFormState] = useState({
    displayName: profile.displayName,
    email: profile.email,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsError, setSessionsError] = useState('')
  const [sessionActionLoading, setSessionActionLoading] = useState('')
  const [transactions, setTransactions] = useState([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactionsError, setTransactionsError] = useState('')
  const [transactionStatusFilter, setTransactionStatusFilter] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        setProfile(initialProfile)
        setFormState((prev) => ({ ...prev, displayName: '', email: '' }))
        return
      }

      try {
        const response = await authApi.me()
        const user = response?.user || response?.data?.user || response?.data || response
        const nextProfile = {
          displayName: user?.full_name || user?.fullName || user?.name || user?.displayName || user?.email?.split('@')[0] || '',
          email: user?.email || '',
          role: user?.role || 'Member',
          plan: user?.plan || 'Free',
        }

        setProfile(nextProfile)
        setFormState((prev) => ({
          ...prev,
          displayName: nextProfile.displayName,
          email: nextProfile.email,
        }))
      } catch {
        setProfile(initialProfile)
        setFormState((prev) => ({ ...prev, displayName: '', email: '' }))
      }
    }

    loadProfile()

    const handleAuthUpdate = () => {
      loadProfile()
    }

    window.addEventListener('auth:updated', handleAuthUpdate)
    return () => window.removeEventListener('auth:updated', handleAuthUpdate)
  }, [])

  useEffect(() => {
    const loadSessions = async () => {
      if (activeTab !== 'sessions') return

      const token = localStorage.getItem('accessToken')
      if (!token) {
        setSessions([])
        setSessionsError(lang === 'vi' ? 'Vui lòng đăng nhập để xem phiên.' : 'Please log in to view sessions.')
        return
      }

      setSessionsLoading(true)
      setSessionsError('')

      try {
        const response = await sessionsApi.list()
        const payload = response?.data || response
        const sessionList =
          payload?.sessions ||
          payload?.items ||
          (Array.isArray(payload) ? payload : [])

        setSessions(Array.isArray(sessionList) ? sessionList : [])
      } catch (error) {
        setSessions([])
        setSessionsError(error?.message || (lang === 'vi' ? 'Không thể tải danh sách phiên.' : 'Unable to load sessions.'))
      } finally {
        setSessionsLoading(false)
      }
    }

    loadSessions()
  }, [activeTab, lang])

  useEffect(() => {
    const loadTransactions = async () => {
      if (activeTab !== 'transactions') return

      const token = localStorage.getItem('accessToken')
      if (!token) {
        setTransactions([])
        setTransactionsError(lang === 'vi' ? 'Vui lòng đăng nhập để xem giao dịch.' : 'Please log in to view transactions.')
        return
      }

      setTransactionsLoading(true)
      setTransactionsError('')

      try {
        const response = await paymentsApi.myTransactions({
          page: 1,
          limit: 20,
          status: transactionStatusFilter || undefined,
        })
        const payload = response?.data || response
        const transactionList =
          payload?.transactions ||
          payload?.items ||
          payload?.payments ||
          (Array.isArray(payload) ? payload : [])

        setTransactions(Array.isArray(transactionList) ? transactionList : [])
      } catch (error) {
        setTransactions([])
        if (error?.status === 404 || /404\s*page\s*not\s*found/i.test(String(error?.message || ''))) {
          setTransactionsError(
            lang === 'vi'
              ? 'API giao dịch thanh toán chưa có trên backend hiện tại (localhost). Vui lòng chạy đúng backend version có route payments transactions.'
              : 'Payment transactions API is not available on the current localhost backend. Please run the backend version that includes payments transactions routes.',
          )
        } else {
          setTransactionsError(error?.message || (lang === 'vi' ? 'Không thể tải danh sách giao dịch.' : 'Unable to load transactions.'))
        }
      } finally {
        setTransactionsLoading(false)
      }
    }

    loadTransactions()
  }, [activeTab, lang, transactionStatusFilter])

  const getSessionId = (session, fallbackIndex) => {
    return session?.id || session?.session_id || session?.sessionId || `session-${fallbackIndex}`
  }

  const getSessionName = (session) => {
    return (
      session?.device_name ||
      session?.deviceName ||
      session?.user_agent ||
      session?.userAgent ||
      (lang === 'vi' ? 'Thiết bị không xác định' : 'Unknown device')
    )
  }

  const getSessionDetail = (session) => {
    const ip = session?.ip_address || session?.ip || ''
    const lastSeen = session?.last_seen_at || session?.lastSeenAt || session?.updated_at || session?.created_at || ''

    if (ip && lastSeen) return `${ip} · ${lastSeen}`
    if (ip) return ip
    if (lastSeen) return lastSeen
    return lang === 'vi' ? 'Không có thông tin bổ sung' : 'No additional details'
  }

  const getTransactionId = (transaction, fallbackIndex) => {
    return transaction?.id || transaction?.order_code || transaction?.orderCode || `tx-${fallbackIndex}`
  }

  const getTransactionTitle = (transaction) => {
    return (
      transaction?.plan_name ||
      transaction?.planName ||
      transaction?.description ||
      transaction?.name ||
      (lang === 'vi' ? 'Thanh toán' : 'Payment')
    )
  }

  const getTransactionStatus = (transaction) => {
    return String(transaction?.status || transaction?.payment_status || transaction?.state || '').toLowerCase()
  }

  const getTransactionStatusLabel = (status) => {
    if (status === 'pending') return t('profile.transactionsStatusPending')
    if (status === 'paid') return t('profile.transactionsStatusPaid')
    if (status === 'cancelled') return t('profile.transactionsStatusCancelled')
    if (status === 'failed') return t('profile.transactionsStatusFailed')
    if (status === 'completed') return t('profile.transactionsStatusCompleted')
    if (status === 'success') return t('profile.transactionsStatusSuccess')
    return status || t('profile.transactionsUnknown')
  }

  const getTransactionAmount = (transaction) => {
    const amount = Number(transaction?.amount || transaction?.payment_amount || transaction?.total_amount || 0)
    try {
      return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(amount)
    } catch {
      return `${amount} VND`
    }
  }

  const getTransactionDate = (transaction) => {
    return transaction?.created_at || transaction?.createdAt || transaction?.updated_at || transaction?.updatedAt || ''
  }

  const handleRevokeSession = async (sessionId) => {
    setSessionActionLoading(sessionId)
    setSessionsError('')

    try {
      await sessionsApi.revokeById(sessionId)
      setSessions((prev) => prev.filter((session, index) => getSessionId(session, index) !== sessionId))
    } catch (error) {
      setSessionsError(error?.message || (lang === 'vi' ? 'Không thể đăng xuất phiên này.' : 'Unable to revoke this session.'))
    } finally {
      setSessionActionLoading('')
    }
  }

  const handleRevokeOtherSessions = async () => {
    setSessionActionLoading('others')
    setSessionsError('')

    try {
      await sessionsApi.revokeOther()
      setSessions((prev) => prev.filter((session) => session?.is_current || session?.current))
    } catch (error) {
      setSessionsError(error?.message || (lang === 'vi' ? 'Không thể đăng xuất các phiên khác.' : 'Unable to revoke other sessions.'))
    } finally {
      setSessionActionLoading('')
    }
  }

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
    if (saveError) setSaveError('')
  }

  const validate = () => {
    const next = {}
    if (!formState.displayName.trim()) {
      next.displayName = t('profile.errors.name')
    }
    if (!formState.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
      next.email = t('profile.errors.email')
    }
    if (formState.newPassword || formState.confirmPassword) {
      if (!formState.currentPassword) {
        next.currentPassword = t('profile.errors.currentPassword')
      }
      if (formState.newPassword && formState.newPassword.length < 8) {
        next.newPassword = t('profile.errors.newPassword')
      }
      if (formState.newPassword !== formState.confirmPassword) {
        next.confirmPassword = t('profile.errors.confirmPassword')
      }
    }
    return next
  }

  const handleSave = async (event) => {
    event.preventDefault()
    const nextErrors = validate()
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      setSaved(false)
      return
    }

    const nextDisplayName = formState.displayName.trim()
    const nextEmail = formState.email.trim()
    const shouldUpdateName = nextDisplayName !== profile.displayName
    const shouldChangePassword = Boolean(formState.newPassword || formState.confirmPassword)

    setIsSaving(true)
    setSaveError('')

    try {
      if (shouldUpdateName) {
        await authApi.updateProfile({ full_name: nextDisplayName }).catch((err) => {
          if (err?.status === 404) {
            console.warn('Backend does not support updateProfile endpoint')
          } else {
            throw err
          }
        })
      }

      if (shouldChangePassword) {
        await authApi.changePassword({
          old_password: formState.currentPassword,
          new_password: formState.newPassword,
        }).catch((err) => {
          if (err?.status === 404) {
            throw new Error(lang === 'vi' ? 'Tính năng đổi mật khẩu trực tiếp chưa có trên Backend hiện tại.' : 'Direct password change is not supported by current Backend.')
          }
          throw err
        })
      }

      setProfile((prev) => ({
        ...prev,
        displayName: nextDisplayName,
        email: nextEmail,
      }))
      setSaved(true)
      setFormState((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }))

      window.setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      setSaved(false)
      setSaveError(error?.message || t('profile.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const menuItems = [
    {
      key: 'profile',
      label: t('profile.menuUserInfo'),
      description: t('profile.menuUserInfoDesc'),
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0" />
        </svg>
      ),
    },
    {
      key: 'sessions',
      label: t('profile.menuSessions'),
      description: t('profile.menuSessionsDesc'),
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 7h14M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 11h8M8 15h5" />
        </svg>
      ),
    },
    {
      key: 'notifications',
      label: t('profile.menuNotifications'),
      description: t('profile.menuNotificationsDesc'),
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V10a6 6 0 10-12 0v4.2a2 2 0 01-.2 1.4L4 17h5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19a2 2 0 004 0" />
        </svg>
      ),
    },
    {
      key: 'transactions',
      label: t('profile.menuTransactions'),
      description: t('profile.menuTransactionsDesc'),
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M5 7v10a2 2 0 002 2h10a2 2 0 002-2V7" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 11h8M8 15h5" />
        </svg>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-surface-border bg-surface-raised shadow-lg shadow-black/20">
        <div className="grid gap-6 p-6 xl:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-surface-border bg-surface-base/70 p-3">
            <div className="space-y-2">
              {menuItems.map((item) => {
                const isActive = activeTab === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveTab(item.key)}
                    className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                      isActive
                        ? 'border-accent/40 bg-accent/10 text-white shadow-sm shadow-accent/10'
                        : 'border-transparent bg-transparent text-slate-400 hover:border-surface-border hover:bg-surface-elevated hover:text-slate-200'
                    }`}
                  >
                    <span className={`mt-0.5 rounded-xl p-2 ${isActive ? 'bg-accent/20 text-accent' : 'bg-surface-elevated text-slate-500'}`}>
                      {item.icon}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="mt-1 block text-xs text-slate-500">{item.description}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </aside>

          <div className="min-w-0">
            {activeTab === 'profile' && (
              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <section className="space-y-6 rounded-3xl border border-surface-border bg-surface-raised/70 p-6 shadow-sm shadow-black/10">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('profile.sectionAccount')}</p>
                    <p className="text-sm text-slate-400">{t('profile.subtitle')}</p>
                  </div>

                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2 text-sm text-slate-300">
                        <span>{t('profile.displayName')}</span>
                        <input
                          type="text"
                          value={formState.displayName}
                          onChange={handleChange('displayName')}
                          className={`w-full rounded-2xl border px-4 py-3 bg-surface-base text-white outline-none transition focus:border-accent ${errors.displayName ? 'border-rose-500' : 'border-surface-border'}`}
                        />
                        {errors.displayName && <span className="text-xs text-rose-400">{errors.displayName}</span>}
                      </label>

                      <label className="space-y-2 text-sm text-slate-300">
                        <span>{t('profile.emailAddress')}</span>
                        <input
                          type="email"
                          value={formState.email}
                          onChange={handleChange('email')}
                          className={`w-full rounded-2xl border px-4 py-3 bg-surface-base text-white outline-none transition focus:border-accent ${errors.email ? 'border-rose-500' : 'border-surface-border'}`}
                        />
                        {errors.email && <span className="text-xs text-rose-400">{errors.email}</span>}
                      </label>
                    </div>

                    <div className="space-y-4 rounded-3xl border border-surface-border bg-surface-elevated p-5">
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('profile.sectionSecurity')}</p>
                      </div>
                      <div className="grid gap-4">
                        <label className="space-y-2 text-sm text-slate-300">
                          <span>{t('profile.currentPassword')}</span>
                          <input
                            type="password"
                            value={formState.currentPassword}
                            onChange={handleChange('currentPassword')}
                            className={`w-full rounded-2xl border px-4 py-3 bg-surface-base text-white outline-none transition focus:border-accent ${errors.currentPassword ? 'border-rose-500' : 'border-surface-border'}`}
                          />
                          {errors.currentPassword && <span className="text-xs text-rose-400">{errors.currentPassword}</span>}
                        </label>

                        <label className="space-y-2 text-sm text-slate-300">
                          <span>{t('profile.newPassword')}</span>
                          <input
                            type="password"
                            value={formState.newPassword}
                            onChange={handleChange('newPassword')}
                            className={`w-full rounded-2xl border px-4 py-3 bg-surface-base text-white outline-none transition focus:border-accent ${errors.newPassword ? 'border-rose-500' : 'border-surface-border'}`}
                          />
                          {errors.newPassword && <span className="text-xs text-rose-400">{errors.newPassword}</span>}
                        </label>

                        <label className="space-y-2 text-sm text-slate-300">
                          <span>{t('profile.confirmPassword')}</span>
                          <input
                            type="password"
                            value={formState.confirmPassword}
                            onChange={handleChange('confirmPassword')}
                            className={`w-full rounded-2xl border px-4 py-3 bg-surface-base text-white outline-none transition focus:border-accent ${errors.confirmPassword ? 'border-rose-500' : 'border-surface-border'}`}
                          />
                          {errors.confirmPassword && <span className="text-xs text-rose-400">{errors.confirmPassword}</span>}
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center justify-center rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-surface-base transition hover:bg-accent-hover"
                      >
                        {isSaving ? (lang === 'vi' ? 'Đang lưu...' : 'Saving...') : t('profile.saveChanges')}
                      </button>
                      {saved && <p className="text-sm text-emerald-300">{t('profile.savedConfirmation')}</p>}
                    </div>

                    {saveError && <p className="text-sm text-rose-300">{saveError}</p>}
                  </form>
                </section>

                <aside className="space-y-4 rounded-3xl border border-surface-border bg-surface-base/70 p-5">
                  <div className="rounded-3xl border border-surface-border bg-surface-raised/70 p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('profile.role')}</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{profile.role}</h3>
                  </div>
                  <div className="rounded-3xl border border-surface-border bg-surface-raised/70 p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('profile.plan')}</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{profile.plan}</h3>
                  </div>
                  <div className="rounded-3xl bg-slate-900/80 p-5 text-sm text-slate-300">
                    <p className="font-semibold text-white">{t('profile.upgradePlan')}</p>
                    <p className="mt-2 text-slate-400">{lang === 'vi' ? 'Mở khóa phân tích AI và hỗ trợ ưu tiên.' : 'Unlock AI usage insights and priority support.'}</p>
                    <button
                      type="button"
                      className="mt-4 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-surface-base transition hover:bg-accent-hover"
                    >
                      {t('profile.upgradePlan')}
                    </button>
                  </div>
                </aside>
              </div>
            )}

            {activeTab === 'sessions' && (
              <div className="space-y-4 rounded-3xl border border-surface-border bg-surface-raised/70 p-6 shadow-sm shadow-black/10">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{lang === 'vi' ? 'Phiên đăng nhập' : 'Login sessions'}</p>
                  <h3 className="text-xl font-semibold text-white">{lang === 'vi' ? 'Thiết bị và phiên đang hoạt động' : 'Active devices and sessions'}</h3>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleRevokeOtherSessions}
                    disabled={sessionActionLoading === 'others' || sessions.length <= 1}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sessionActionLoading === 'others'
                      ? (lang === 'vi' ? 'Đang xử lý...' : 'Processing...')
                      : (lang === 'vi' ? 'Đăng xuất các phiên khác' : 'Log out other sessions')}
                  </button>
                </div>

                {sessionsError && <p className="text-sm text-rose-300">{sessionsError}</p>}

                <div className="space-y-3">
                  {sessionsLoading ? (
                    <div className="rounded-2xl border border-surface-border bg-surface-base/70 px-4 py-3 text-sm text-slate-400">
                      {lang === 'vi' ? 'Đang tải phiên đăng nhập...' : 'Loading login sessions...'}
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="rounded-2xl border border-surface-border bg-surface-base/70 px-4 py-3 text-sm text-slate-400">
                      {lang === 'vi' ? 'Không có phiên đăng nhập nào.' : 'No active sessions found.'}
                    </div>
                  ) : (
                    sessions.map((session, index) => {
                      const sessionId = getSessionId(session, index)
                      const isCurrent = Boolean(session?.is_current || session?.current)

                      return (
                        <div key={sessionId} className="flex items-center justify-between rounded-2xl border border-surface-border bg-surface-base/70 px-4 py-3">
                          <div>
                            <p className="font-medium text-white">
                              {getSessionName(session)}
                              {isCurrent && (
                                <span className="ml-2 rounded-lg bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                                  {lang === 'vi' ? 'Hiện tại' : 'Current'}
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-slate-500">{getSessionDetail(session)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(sessionId)}
                            disabled={isCurrent || sessionActionLoading === sessionId}
                            className="text-sm text-accent transition hover:text-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {sessionActionLoading === sessionId
                              ? (lang === 'vi' ? 'Đang xử lý...' : 'Processing...')
                              : (lang === 'vi' ? 'Đăng xuất' : 'Log out')}
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-4 rounded-3xl border border-surface-border bg-surface-raised/70 p-6 shadow-sm shadow-black/10">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{lang === 'vi' ? 'Thông báo' : 'Notifications'}</p>
                  <h3 className="text-xl font-semibold text-white">{lang === 'vi' ? 'Cài đặt thông báo của bạn' : 'Your notification preferences'}</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { title: lang === 'vi' ? 'Cập nhật hệ thống' : 'System updates', desc: lang === 'vi' ? 'Nhận thông báo khi có tính năng mới.' : 'Get notified when new features launch.' },
                    { title: lang === 'vi' ? 'Nhắc nhở sử dụng' : 'Usage reminders', desc: lang === 'vi' ? 'Gửi tôi lời nhắc khi cần tận dụng gói đăng ký.' : 'Remind me when it is time to make better use of my plan.' },
                  ].map((item) => (
                    <div key={item.title} className="rounded-2xl border border-surface-border bg-surface-base/70 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{item.title}</p>
                          <p className="text-sm text-slate-500">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input type="checkbox" className="peer sr-only" defaultChecked />
                          <div className="h-6 w-11 rounded-full bg-slate-700 peer-checked:bg-accent" />
                          <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="space-y-4 rounded-3xl border border-surface-border bg-surface-raised/70 p-6 shadow-sm shadow-black/10">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('profile.sectionTransactions')}</p>
                  <h3 className="text-xl font-semibold text-white">{t('profile.transactionsTitle')}</h3>
                  <p className="text-sm text-slate-400">{t('profile.transactionsSubtitle')}</p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      {t('profile.transactionsFilterStatus')}
                    </label>
                    <select
                      value={transactionStatusFilter}
                      onChange={(event) => setTransactionStatusFilter(event.target.value)}
                      className="rounded-2xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-slate-100 outline-none"
                    >
                      <option value="">{t('profile.transactionsAll')}</option>
                      <option value="pending">{t('profile.transactionsStatusPending')}</option>
                      <option value="paid">{t('profile.transactionsStatusPaid')}</option>
                      <option value="failed">{t('profile.transactionsStatusFailed')}</option>
                      <option value="cancelled">{t('profile.transactionsStatusCancelled')}</option>
                    </select>
                  </div>
                </div>

                {transactionsError && <p className="text-sm text-rose-300">{transactionsError}</p>}

                <div className="space-y-3">
                  {transactionsLoading ? (
                    <div className="rounded-2xl border border-surface-border bg-surface-base/70 px-4 py-3 text-sm text-slate-400">
                      {t('profile.transactionsLoading')}
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="rounded-2xl border border-surface-border bg-surface-base/70 px-4 py-3 text-sm text-slate-400">
                      {t('profile.transactionsEmpty')}
                    </div>
                  ) : (
                    transactions.map((transaction, index) => {
                      const status = getTransactionStatus(transaction)
                      const statusClass =
                        status === 'paid' || status === 'success' || status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : status === 'pending'
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-rose-500/15 text-rose-300'

                      return (
                        <div key={getTransactionId(transaction, index)} className="rounded-2xl border border-surface-border bg-surface-base/70 px-4 py-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                              <p className="font-semibold text-white">{getTransactionTitle(transaction)}</p>
                              <p className="text-sm text-slate-500">
                                {t('profile.transactionsOrder')}: {getTransactionId(transaction, index)}
                              </p>
                              {getTransactionDate(transaction) && (
                                <p className="text-sm text-slate-500">{getTransactionDate(transaction)}</p>
                              )}
                            </div>
                            <div className="flex flex-col items-start gap-2 sm:items-end">
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${statusClass}`}>
                                {getTransactionStatusLabel(status)}
                              </span>
                              <span className="text-lg font-semibold text-white">{getTransactionAmount(transaction)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default ProfilePage
