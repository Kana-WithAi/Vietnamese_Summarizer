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
  const { t } = useLanguage()
  const [profile, setProfile] = useState(initialProfile)
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

  return (
    <div className="space-y-8">

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="space-y-6 rounded-3xl border border-surface-border bg-surface-raised p-6 shadow-sm shadow-black/10">
          <div className="space-y-3">
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
              {saved && (
                <p className="text-sm text-emerald-300">{t('profile.savedConfirmation')}</p>
              )}
            </div>
          </form>
        </section>

        <aside className="space-y-4 rounded-3xl border border-surface-border bg-surface-raised p-6 shadow-sm shadow-black/10">
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('profile.role')}</p>
              <h2 className="mt-1 text-lg font-semibold text-white">{profile.role}</h2>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('profile.plan')}</p>
              <h2 className="mt-1 text-lg font-semibold text-white">{profile.plan}</h2>
            </div>
          </div>
          <div className="rounded-3xl bg-slate-900/70 p-5 text-sm text-slate-300">
            <p className="font-semibold text-white">{t('profile.upgradePlan')}</p>
            <p className="mt-2 text-slate-400">Unlock AI usage insights and priority support.</p>
            <button
              type="button"
              className="mt-4 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-surface-base transition hover:bg-accent-hover"
            >
              {t('profile.upgradePlan')}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default ProfilePage
