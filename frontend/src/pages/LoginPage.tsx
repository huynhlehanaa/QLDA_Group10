import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthCard from '../components/layout/AuthCard'
import InputField from '../components/common/InputField'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage } from '../lib/api'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from

  return (
    <div className="grid min-h-screen place-content-center px-4">
      <AuthCard
        title="Đăng nhập hệ thống KPI"
        subtitle="Đăng nhập bằng email công ty để tiếp tục làm việc an toàn."
      >
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            setError(null)
            setIsSubmitting(true)
            try {
              const session = await signIn(email, password)

              if (session.mustChangePassword) {
                navigate('/change-password', { replace: true })
                return
              }

              if (session.role === 'staff') {
                navigate(from || '/employee', { replace: true })
                return
              }

              navigate('/out-of-scope', { replace: true })
            } catch (err) {
              setError(getApiErrorMessage(err))
            } finally {
              setIsSubmitting(false)
            }
          }}
        >
          <InputField
            id="email"
            label="Email công ty"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <InputField
            id="password"
            label="Mật khẩu"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-brand hover:underline">
            Quên mật khẩu?
          </Link>
          <Link to="/otp" className="text-slate-600 hover:underline">
            Đăng nhập bằng OTP
          </Link>
        </div>
      </AuthCard>
    </div>
  )
}

export default LoginPage
