import { useEffect, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { authApi } from '../utils/api'

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

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
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

  const handleSave = (event) => {
    event.preventDefault()
    const nextErrors = validate()
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      setSaved(false)
      return
    }

    setProfile((prev) => ({
      ...prev,
      displayName: formState.displayName.trim(),
      email: formState.email.trim(),
    }))
    setSaved(true)
    setFormState((prev) => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }))

    window.setTimeout(() => setSaved(false), 3000)
  }

  const menuItems = [
    {
      key: 'profile',
      label: lang === 'vi' ? 'Thông tin người dùng' : 'User information',
      description: lang === 'vi' ? 'Cập nhật hồ sơ và bảo mật' : 'Update profile and security',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0" />
        </svg>
      ),
    },
    {
      key: 'sessions',
      label: lang === 'vi' ? 'Phiên đăng nhập' : 'Login sessions',
      description: lang === 'vi' ? 'Quản lý thiết bị đã đăng nhập' : 'Manage your active devices',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 7h14M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 11h8M8 15h5" />
        </svg>
      ),
    },
    {
      key: 'notifications',
      label: lang === 'vi' ? 'Thông báo' : 'Notifications',
      description: lang === 'vi' ? 'Tùy chọn thông báo và cập nhật' : 'Alerts and update preferences',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V10a6 6 0 10-12 0v4.2a2 2 0 01-.2 1.4L4 17h5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19a2 2 0 004 0" />
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
                        className="inline-flex items-center justify-center rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-surface-base transition hover:bg-accent-hover"
                      >
                        {t('profile.saveChanges')}
                      </button>
                      {saved && <p className="text-sm text-emerald-300">{t('profile.savedConfirmation')}</p>}
                    </div>
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
                <div className="space-y-3">
                  {[
                    { name: lang === 'vi' ? 'Chrome trên Windows' : 'Chrome on Windows', detail: 'FPT, 10 phút trước' },
                    { name: lang === 'vi' ? 'Safari trên iPhone' : 'Safari on iPhone', detail: 'Hà Nội, 3 giờ trước' },
                  ].map((session) => (
                    <div key={session.name} className="flex items-center justify-between rounded-2xl border border-surface-border bg-surface-base/70 px-4 py-3">
                      <div>
                        <p className="font-medium text-white">{session.name}</p>
                        <p className="text-sm text-slate-500">{session.detail}</p>
                      </div>
                      <button type="button" className="text-sm text-accent hover:text-accent-hover">
                        {lang === 'vi' ? 'Đăng xuất' : 'Log out'}
                      </button>
                    </div>
                  ))}
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
          </div>
        </div>
      </section>
    </div>
  )
}

export default ProfilePage
