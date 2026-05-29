import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthCard from '../components/layout/AuthCard'
import InputField from '../components/common/InputField'
import { forgotPassword, getApiErrorMessage } from '../lib/api'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="grid min-h-screen place-content-center px-4">
      <AuthCard title="Khôi phục mật khẩu" subtitle="Nhập email công ty để nhận liên kết đặt lại mật khẩu.">
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            setError(null)
            try {
              await forgotPassword(email)
              setMessage('Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.')
            } catch (err) {
              setError(getApiErrorMessage(err))
            }
          }}
        >
          <InputField
            id="forgot-email"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          {message && <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{message}</p>}
          {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Gửi liên kết đặt lại mật khẩu
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          <Link to="/login" className="text-brand hover:underline">
            Quay lại đăng nhập
          </Link>
        </p>
      </AuthCard>
    </div>
  )
}

export default ForgotPasswordPage
