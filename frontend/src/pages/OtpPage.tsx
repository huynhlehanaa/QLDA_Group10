import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import InputField from '../components/common/InputField'
import AuthCard from '../components/layout/AuthCard'
import { sendOtp, getApiErrorMessage } from '../lib/api'
import { useAuth } from '../context/AuthContext'

function OtpPage() {
  const navigate = useNavigate()
  const { signInWithOtp, session } = useAuth()

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) {
      return
    }

    const timer = window.setInterval(() => {
      setResendCooldown((current) => {
        if (current <= 1) {
          window.clearInterval(timer)
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [resendCooldown])

  return (
    <div className="grid min-h-screen place-content-center px-4">
      <AuthCard
        title="Xác thực OTP"
        subtitle="Nhập mã OTP đã gửi về email công ty để hoàn tất đăng nhập."
      >
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            setError(null)
            try {
              await signInWithOtp(email, otp)
              if (session?.role === 'staff') {
                navigate('/employee', { replace: true })
                return
              }
              navigate('/out-of-scope', { replace: true })
            } catch (err) {
              setError(getApiErrorMessage(err))
            }
          }}
        >
          <InputField
            id="otp-email"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <InputField
            id="otp-code"
            label="Mã OTP 6 số"
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            maxLength={6}
            required
          />

          {message && <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{message}</p>}
          {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Xác thực và đăng nhập
          </button>
        </form>

        <button
          type="button"
          disabled={resendCooldown > 0}
          className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          onClick={async () => {
            if (resendCooldown > 0) {
              return
            }

            setError(null)
            setMessage(null)
            try {
              await sendOtp(email)
              setResendCooldown(60)
              setMessage('Mã OTP đã được gửi. Vui lòng kiểm tra hộp thư của bạn.')
            } catch (err) {
              setError(getApiErrorMessage(err))
            }
          }}
        >
          Gửi lại OTP
        </button>

        {resendCooldown > 0 && (
          <p className="mt-2 text-center text-sm text-slate-600">
            Bạn có thể gửi lại OTP sau {resendCooldown} giây.
          </p>
        )}

        <p className="mt-4 text-center text-sm text-slate-600">
          <Link to="/login" className="text-brand hover:underline">
            Quay lại đăng nhập bằng mật khẩu
          </Link>
        </p>
      </AuthCard>
    </div>
  )
}

export default OtpPage
