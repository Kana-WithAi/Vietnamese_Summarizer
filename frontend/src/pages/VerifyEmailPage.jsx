import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import AuthInput from '../components/auth/AuthInput'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../utils/api'

function VerifyEmailPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!otp.trim()) {
      setError('Please enter the OTP code sent to your email.')
      return
    }

    setIsSubmitting(true)
    setError('')
    setResendMessage('')

    try {
      const response = await authApi.verifyEmail({ email, otp: otp.trim() })
      const resData = response?.data || response
      const token = resData?.access_token || resData?.token || response?.access_token
      if (token) {
        login(token)
      }
      navigate('/')
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendOtp = async () => {
    if (!email) {
      setResendMessage('Missing email information. Please start the signup flow again.')
      return
    }

    setIsResending(true)
    setResendMessage('')

    try {
      await authApi.resendOtp({ email })
      setResendMessage('A new OTP has been sent to your email.')
    } catch (err) {
      setResendMessage(err.message || 'Unable to resend OTP. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Enter the OTP code we sent to your inbox to activate your account."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput
          id="otp"
          label="OTP code"
          value={otp}
          onChange={(event) => setOtp(event.target.value)}
          placeholder="Enter 6-digit code"
          autoComplete="one-time-code"
          error={error}
        />

        {error && !otp.trim() && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-surface-base shadow-md shadow-accent-600/25 transition hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Verifying...' : 'Verify email'}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-slate-600">
        <button
          type="button"
          onClick={handleResendOtp}
          disabled={isResending}
          className="font-semibold text-accent-600 transition hover:text-accent-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isResending ? 'Sending...' : 'Resend OTP'}
        </button>
        {resendMessage && (
          <p className="mt-2 text-sm text-emerald-500">{resendMessage}</p>
        )}
      </div>

      <p className="mt-4 text-center text-sm text-slate-600">
        <Link to="/login" className="font-semibold text-accent-600 transition hover:text-accent-700">
          Back to login
        </Link>
      </p>
    </AuthLayout>
  )
}

export default VerifyEmailPage
