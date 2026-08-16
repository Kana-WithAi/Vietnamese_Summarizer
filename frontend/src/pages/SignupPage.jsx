import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import AuthInput from '../components/auth/AuthInput'
import { useLanguage } from '../context/LanguageContext'
import { authApi } from '../utils/api'

function SignupPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [agreed, setAgreed] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const next = {}
    if (!form.name.trim()) {
      next.name = t('signupPage.errors.emptyName')
    }
    if (!form.email.trim()) {
      next.email = t('signupPage.errors.emptyEmail')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = t('signupPage.errors.invalidEmail')
    }
    if (!form.password) {
      next.password = t('signupPage.errors.emptyPassword')
    } else if (form.password.length < 8) {
      next.password = t('signupPage.errors.shortPassword')
    }
    if (form.password !== form.confirmPassword) {
      next.confirmPassword = t('signupPage.errors.mismatchPassword')
    }
    if (!agreed) {
      next.terms = t('signupPage.errors.termsRequired')
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
      await authApi.register({
        full_name: form.name.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      navigate('/verify-email', { state: { email: form.email.trim() } })
    } catch (error) {
      setSubmitError(error.message || t('signupPage.submitError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title={t('signupPage.title')}
      subtitle={t('signupPage.subtitle')}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput
          id="name"
          label={t('signupPage.nameLabel')}
          value={form.name}
          onChange={handleChange('name')}
          placeholder={t('signupPage.namePlaceholder')}
          autoComplete="name"
          error={errors.name}
        />

        <AuthInput
          id="email"
          label={t('signupPage.emailLabel')}
          type="email"
          value={form.email}
          onChange={handleChange('email')}
          placeholder={t('signupPage.emailPlaceholder')}
          autoComplete="email"
          error={errors.email}
        />

        <AuthInput
          id="password"
          label={t('signupPage.passwordLabel')}
          value={form.password}
          onChange={handleChange('password')}
          placeholder={t('signupPage.passwordPlaceholder')}
          autoComplete="new-password"
          error={errors.password}
          showToggle
        />

        <AuthInput
          id="confirmPassword"
          label={t('signupPage.confirmPasswordLabel')}
          value={form.confirmPassword}
          onChange={handleChange('confirmPassword')}
          placeholder={t('signupPage.confirmPasswordPlaceholder')}
          autoComplete="new-password"
          error={errors.confirmPassword}
          showToggle
        />

        <div>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => {
                setAgreed(event.target.checked)
                setErrors((prev) => ({ ...prev, terms: '' }))
              }}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-accent-600 focus:ring-accent-500"
            />
            <span>
              {t('signupPage.termsPrefix')}{' '}
              <a href="#" className="font-medium text-accent-600 hover:text-accent-700">
                {t('signupPage.termsOfUse')}
              </a>{' '}
              {t('signupPage.termsAnd')}{' '}
              <a href="#" className="font-medium text-accent-600 hover:text-accent-700">
                {t('signupPage.privacyPolicy')}
              </a>
            </span>
          </label>
          {errors.terms && (
            <p className="mt-1.5 text-sm text-red-500">{errors.terms}</p>
          )}
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
          {isSubmitting ? t('signupPage.loadingButton') : t('signupPage.submitButton')}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        {t('signupPage.haveAccount')}{' '}
        <Link
          to="/login"
          className="font-semibold text-accent-600 transition hover:text-accent-700"
        >
          {t('signupPage.loginNow')}
        </Link>
      </p>
    </AuthLayout>
  )
}

export default SignupPage
