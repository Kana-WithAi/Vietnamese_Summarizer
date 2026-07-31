import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import AuthInput from '../components/auth/AuthInput'
import { authApi } from '../utils/api'

function ResetPasswordConfirmPage() {
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

  const handleSubmit = async (event) => {
    event.preventDefault()

    const next = validate()
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }

    if (!email) {
      setSubmitError('Missing email information. Please start the reset flow again.')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const verifyResponse = await authApi.verifyResetOtp({ email, otp: form.otp.trim() })
      const resetToken = verifyResponse?.data?.reset_token || verifyResponse?.reset_token || verifyResponse?.token

      if (!resetToken) {
        throw new Error('The server did not return a reset token. Please try again.')
      }

      await authApi.resetPassword({ reset_token: resetToken, new_password: form.password })
      navigate('/login')
    } catch (error) {
      setSubmitError(error.message || 'Unable to reset password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the OTP sent to your email and choose a new password."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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

      <p className="mt-8 text-center text-sm text-slate-600">
        <Link to="/reset-password" className="font-semibold text-accent-600 transition hover:text-accent-700">
          Back
        </Link>
      </p>
    </AuthLayout>
  )
}

export default ResetPasswordConfirmPage
