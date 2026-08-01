import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import AuthInput from '../components/auth/AuthInput'
import { useLanguage } from '../context/LanguageContext'
import { authApi } from '../utils/api'

function toFriendlyResetPasswordError(error, t) {
  const rawMessage = (error?.message || '').trim()
  const message = rawMessage.toLowerCase()

  if (message.includes('invalid_otp') || message.includes('invalid otp') || message.includes('otp sai')) {
    return t('resetPassword.confirm.messages.invalidOtp')
  }

  if (message.includes('otp') && (message.includes('expired') || message.includes('hết hạn'))) {
    return t('resetPassword.confirm.messages.expiredOtp')
  }

  if (message.includes('otp_locked') || message.includes('too many') || message.includes('429')) {
    return t('resetPassword.confirm.messages.otpLocked')
  }

  if (message.includes('reset token') || message.includes('reset_token')) {
    return t('resetPassword.confirm.messages.invalidResetToken')
  }

  if (message.includes('password') && message.includes('short')) {
    return t('resetPassword.confirm.messages.shortPassword')
  }

  if (message.includes('network') || message.includes('failed to fetch') || message.includes('timeout')) {
    return t('resetPassword.confirm.messages.network')
  }

  return rawMessage || t('resetPassword.confirm.messages.fallback')
}

function ResetPasswordConfirmPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''
  const [form, setForm] = useState({ otp: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const next = {}

    if (!form.otp.trim()) {
      next.otp = t('resetPassword.confirm.errors.emptyOtp')
    }

    if (!form.password) {
      next.password = t('resetPassword.confirm.errors.emptyPassword')
    } else if (form.password.length < 8) {
      next.password = t('resetPassword.confirm.errors.shortPassword')
    }

    if (form.password !== form.confirmPassword) {
      next.confirmPassword = t('resetPassword.confirm.errors.mismatchPassword')
    }

    return next
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const next = validate()
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }

    if (!email) {
      setSubmitError(t('resetPassword.confirm.errors.missingEmail'))
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const verifyResponse = await authApi.verifyResetOtp({ email, otp: form.otp.trim() })
      const resetToken = verifyResponse?.data?.reset_token || verifyResponse?.reset_token || verifyResponse?.token

      if (!resetToken) {
        throw new Error(t('resetPassword.confirm.errors.missingResetToken'))
      }

      await authApi.resetPassword({ reset_token: resetToken, new_password: form.password })
      navigate('/login')
    } catch (error) {
      setSubmitError(toFriendlyResetPasswordError(error, t))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title={t('resetPassword.confirm.title')}
      subtitle={t('resetPassword.confirm.subtitle')}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput
          id="otp"
          label={t('resetPassword.confirm.otpLabel')}
          value={form.otp}
          onChange={handleChange('otp')}
          placeholder={t('resetPassword.confirm.otpPlaceholder')}
          autoComplete="one-time-code"
          error={errors.otp}
        />

        <AuthInput
          id="password"
          label={t('resetPassword.confirm.passwordLabel')}
          value={form.password}
          onChange={handleChange('password')}
          placeholder={t('resetPassword.confirm.passwordPlaceholder')}
          autoComplete="new-password"
          error={errors.password}
          showToggle
        />

        <AuthInput
          id="confirmPassword"
          label={t('resetPassword.confirm.confirmPasswordLabel')}
          value={form.confirmPassword}
          onChange={handleChange('confirmPassword')}
          placeholder={t('resetPassword.confirm.confirmPasswordPlaceholder')}
          autoComplete="new-password"
          error={errors.confirmPassword}
          showToggle
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
          {isSubmitting ? t('resetPassword.confirm.updatingButton') : t('resetPassword.confirm.updateButton')}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        <Link to="/reset-password" className="font-semibold text-accent-600 transition hover:text-accent-700">
          {t('resetPassword.confirm.back')}
        </Link>
      </p>
    </AuthLayout>
  )
}

export default ResetPasswordConfirmPage
