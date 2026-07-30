import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import AuthInput from '../components/auth/AuthInput'
import { authApi } from '../utils/api'

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState('email')
  const [form, setForm] = useState({ email: '', otp: '', password: '', confirmPassword: '' })
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
      next.email = 'Please enter your email.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Please enter a valid email.'
    }
    return next
  }

  const validateReset = () => {
    const next = {}
    if (!form.otp.trim()) {
      next.otp = 'Please enter the OTP code.'
    }
    if (!form.password) {
      next.password = 'Please enter a new password.'
    } else if (form.password.length < 8) {
      next.password = 'Password must be at least 8 characters.'
    }
    if (form.password !== form.confirmPassword) {
      next.confirmPassword = 'Passwords do not match.'
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
      setSubmitError(error.message || 'Unable to send reset code. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()
    const next = validateReset()
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      await authApi.resetPassword({
        email: form.email.trim(),
        otp: form.otp.trim(),
        newPassword: form.password,
      })
      navigate('/login')
    } catch (error) {
      setSubmitError(error.message || 'Password reset failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title={step === 'email' ? 'Reset your password' : 'Set a new password'}
      subtitle={step === 'email' ? 'Enter your email and we will send you an OTP to continue.' : 'Enter the OTP code and choose a new password.'}
    >
      {step === 'email' ? (
        <form onSubmit={handleSendOtp} className="space-y-5">
          <AuthInput
            id="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            placeholder="name@example.com"
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
            {isSubmitting ? 'Sending...' : 'Send reset code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-5">
          <AuthInput
            id="otp"
            label="OTP code"
            value={form.otp}
            onChange={handleChange('otp')}
            placeholder="Enter code from email"
            autoComplete="one-time-code"
            error={errors.otp}
          />

          <AuthInput
            id="password"
            label="New password"
            value={form.password}
            onChange={handleChange('password')}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            error={errors.password}
            showToggle
          />

          <AuthInput
            id="confirmPassword"
            label="Confirm password"
            value={form.confirmPassword}
            onChange={handleChange('confirmPassword')}
            placeholder="Repeat new password"
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
            {isSubmitting ? 'Updating...' : 'Update password'}
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-slate-600">
        <Link to="/login" className="font-semibold text-accent-600 transition hover:text-accent-700">
          Back to login
        </Link>
      </p>
    </AuthLayout>
  )
}

export default ResetPasswordPage
