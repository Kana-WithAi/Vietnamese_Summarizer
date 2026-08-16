import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import AuthInput from '../components/auth/AuthInput'
import { useLanguage } from '../context/LanguageContext'
import { authApi } from '../utils/api'

function LoginPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [remember, setRemember] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const extractRole = (payload) => {
    const user = payload?.user || payload?.data?.user || payload?.data || payload
    return user?.role || user?.role_name || user?.roleName || ''
  }

  const isBannedUser = (payload) => {
    const user = payload?.user || payload?.data?.user || payload?.data || payload
    const status = String(user?.status || user?.account_status || '').trim().toLowerCase()
    return status === 'banned' || user?.is_banned === true || user?.isBanned === true
  }

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const next = {}
    if (!form.email.trim()) {
      next.email = t('loginPage.errors.emptyEmail')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = t('loginPage.errors.invalidEmail')
    }
    if (!form.password) {
      next.password = t('loginPage.errors.emptyPassword')
    }
    return next
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const next = validate()
    if (Object.keys(next).length > 0) {
      setErrors(next)
      setSubmitError('')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const response = await authApi.login({
        email: form.email.trim(),
        password: form.password,
      })

      if (isBannedUser(response)) {
        localStorage.removeItem('accessToken')
        setSubmitError(t('loginPage.bannedError'))
        return
      }

      const token = response?.token || response?.accessToken || response?.data?.token
      let role = extractRole(response)

      if (token) {
        localStorage.setItem('accessToken', token)
        if (remember) {
          localStorage.setItem('rememberMe', 'true')
        } else {
          localStorage.removeItem('rememberMe')
        }

        if (!role) {
          try {
            const meResponse = await authApi.me()
            if (isBannedUser(meResponse)) {
              localStorage.removeItem('accessToken')
              setSubmitError(t('loginPage.bannedError'))
              return
            }
            role = extractRole(meResponse)
          } catch {
            // Ignore role lookup failure and continue with default route.
          }
        }

        window.dispatchEvent(new Event('auth:updated'))
      }

      const normalizedRole = String(role || '').trim().toLowerCase()
      const isAdmin = normalizedRole === 'admin' || normalizedRole === 'administrator' || normalizedRole.includes('admin')
      navigate(isAdmin ? '/dashboard' : '/')
    } catch (error) {
      setSubmitError(error.message || t('loginPage.submitError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title={t('loginPage.title')}
      subtitle={t('loginPage.subtitle')}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput
          id="email"
          label={t('loginPage.emailLabel')}
          type="email"
          value={form.email}
          onChange={handleChange('email')}
          placeholder={t('loginPage.emailPlaceholder')}
          autoComplete="email"
          error={errors.email}
        />

        <AuthInput
          id="password"
          label={t('loginPage.passwordLabel')}
          value={form.password}
          onChange={handleChange('password')}
          placeholder={t('loginPage.passwordPlaceholder')}
          autoComplete="current-password"
          error={errors.password}
          showToggle
        />

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-accent-600 focus:ring-accent-500"
            />
            {t('loginPage.rememberMe')}
          </label>
          <Link
            to="/reset-password"
            className="text-sm font-medium text-accent-600 transition hover:text-accent-700"
          >
            {t('loginPage.forgotPassword')}
          </Link>
        </div>

        {submitError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-surface-base shadow-md shadow-accent-600/25 transition hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? t('loginPage.loadingButton') : t('loginPage.submitButton')}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        {t('loginPage.noAccount')}{' '}
        <Link
          to="/signup"
          className="font-semibold text-accent-600 transition hover:text-accent-700"
        >
          {t('loginPage.signupNow')}
        </Link>
      </p>
    </AuthLayout>
  )
}

export default LoginPage
