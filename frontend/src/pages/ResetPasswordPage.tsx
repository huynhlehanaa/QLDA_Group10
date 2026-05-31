import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthCard from '../components/layout/AuthCard'
import InputField from '../components/common/InputField'
import { getApiErrorMessage, resetPassword } from '../lib/api'

function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = useMemo(() => params.get('token') || '', [params])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="grid min-h-screen place-content-center px-4">
      <AuthCard
        title="Đặt lại mật khẩu"
        subtitle="Mật khẩu mới cần đủ mạnh để đảm bảo an toàn tài khoản."
      >
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            setError(null)

            if (!token) {
              setError('Liên kết đặt lại mật khẩu không hợp lệ.')
              return
            }

            if (newPassword !== confirmPassword) {
              setError('Mật khẩu xác nhận không khớp.')
              return
            }

            try {
              await resetPassword(token, newPassword)
              setMessage('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.')
            } catch (err) {
              setError(getApiErrorMessage(err))
            }
          }}
        >
          <InputField
            id="new-password"
            label="Mật khẩu mới"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
          <InputField
            id="confirm-password"
            label="Nhập lại mật khẩu mới"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />

          {message && <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{message}</p>}
          {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Đặt lại mật khẩu
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

export default ResetPasswordPage
