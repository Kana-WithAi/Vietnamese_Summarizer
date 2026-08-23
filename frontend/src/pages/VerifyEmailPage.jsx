import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import AuthInput from '../components/auth/AuthInput'
import { useLanguage } from '../context/LanguageContext'
import { authApi } from '../utils/api'

function VerifyEmailPage() {
  const { lang } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendMessage, setResendMessage] = useState('')

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!otp.trim()) {
      setError(lang === 'vi' ? 'Vui lòng nhập mã OTP được gửi tới email của bạn.' : 'Please enter the OTP code sent to your email.')
      return
    }

    setIsSubmitting(true)
    setError('')
    setResendMessage('')

    try {
      await authApi.verifyEmail({ email, otp: otp.trim() })
      navigate('/login')
    } catch (err) {
      setError(err.message || (lang === 'vi' ? 'Xác thực không thành công. Vui lòng thử lại.' : 'Verification failed. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendOtp = async () => {
    if (!email) {
      setResendMessage(lang === 'vi' ? 'Thiếu thông tin email. Vui lòng bắt đầu lại từ trang đăng ký.' : 'Missing email information. Please start the signup flow again.')
      return
    }
    if (resendCooldown > 0) return

    setIsResending(true)
    setResendMessage('')

    try {
      await authApi.resendOtp({ email })
      setResendCooldown(60)
      setResendMessage(lang === 'vi' ? 'Mã OTP mới đã được gửi tới email của bạn.' : 'A new OTP has been sent to your email.')
    } catch (err) {
      setResendMessage(err.message || (lang === 'vi' ? 'Không thể gửi lại mã OTP. Vui lòng thử lại.' : 'Unable to resend OTP. Please try again.'))
    } finally {
      setIsResending(false)
    }
  }

  return (
    <AuthLayout
      title={lang === 'vi' ? 'Xác thực tài khoản' : 'Verify your email'}
      subtitle={
        lang === 'vi'
          ? 'Nhập mã OTP 6 chữ số chúng tôi đã gửi tới hộp thư của bạn để kích hoạt tài khoản.'
          : 'Enter the 6-digit OTP code we sent to your inbox to activate your account.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput
          id="otp"
          label={lang === 'vi' ? 'Mã OTP' : 'OTP code'}
          value={otp}
          onChange={(event) => setOtp(event.target.value)}
          placeholder={lang === 'vi' ? 'Nhập mã 6 chữ số' : 'Enter 6-digit code'}
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
          {isSubmitting
            ? lang === 'vi'
              ? 'Đang xác thực...'
              : 'Verifying...'
            : lang === 'vi'
              ? 'Xác thực email'
              : 'Verify email'}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-slate-600">
        <button
          type="button"
          onClick={handleResendOtp}
          disabled={isResending || resendCooldown > 0}
          className="font-semibold text-accent transition hover:text-accent-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isResending
            ? lang === 'vi'
              ? 'Đang gửi...'
              : 'Sending...'
            : resendCooldown > 0
              ? lang === 'vi'
                ? `Gửi lại mã (${resendCooldown}s)`
                : `Resend OTP (${resendCooldown}s)`
              : lang === 'vi'
                ? 'Gửi lại mã OTP'
                : 'Resend OTP'}
        </button>
        {resendMessage && (
          <p className="mt-2 text-sm text-emerald-500">{resendMessage}</p>
        )}
      </div>

      <p className="mt-4 text-center text-sm text-slate-600">
        <Link to="/login" className="font-semibold text-accent transition hover:text-accent-700">
          {lang === 'vi' ? 'Quay lại đăng nhập' : 'Back to login'}
        </Link>
      </p>
    </AuthLayout>
  )
}

export default VerifyEmailPage
