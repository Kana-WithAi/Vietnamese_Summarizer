import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import AuthInput from '../components/auth/AuthInput'
import { useLanguage } from '../context/LanguageContext'
import { authApi } from '../utils/api'

function toFriendlyForgotPasswordError(error, t) {
  const rawMessage = (error?.message || '').trim()
  const message = rawMessage.toLowerCase()

  if (message.includes('too many requests') || message.includes('rate limit') || message.includes('429')) {
    return t('resetPassword.request.messages.tooManyRequests')
  }

  if (message.includes('invalid email') || message.includes('validation') || message.includes('email')) {
    return t('resetPassword.request.messages.invalidEmail')
  }

  if (message.includes('network') || message.includes('failed to fetch') || message.includes('timeout')) {
    return t('resetPassword.request.messages.network')
  }

  return rawMessage || t('resetPassword.request.messages.fallback')
}

function ResetPasswordPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '' })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validateEmail = () => {
    const next = {}
    if (!form.email.trim()) {
      next.email = t('resetPassword.request.errors.emptyEmail')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = t('resetPassword.request.errors.invalidEmail')
    }
    return next
  }

  const handleSendOtp = async (event) => {
    event.preventDefault()
    const next = validateEmail()
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      await authApi.forgotPassword({ email: form.email.trim() })
      navigate('/reset-password/confirm', { state: { email: form.email.trim() } })
    } catch (error) {
      setSubmitError(toFriendlyForgotPasswordError(error, t))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title={t('resetPassword.request.title')}
      subtitle={t('resetPassword.request.subtitle')}
    >
      <form onSubmit={handleSendOtp} className="space-y-5">
        <AuthInput
          id="email"
          label={t('resetPassword.request.emailLabel')}
          type="email"
          value={form.email}
          onChange={handleChange('email')}
          placeholder={t('resetPassword.request.emailPlaceholder')}
          autoComplete="email"
          error={errors.email}
        />

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
          {isSubmitting ? t('resetPassword.request.sendingButton') : t('resetPassword.request.sendButton')}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        <Link to="/login" className="font-semibold text-accent-600 transition hover:text-accent-700">
          {t('resetPassword.request.backToLogin')}
        </Link>
      </p>
    </AuthLayout>
  )
}

export default ResetPasswordPage
