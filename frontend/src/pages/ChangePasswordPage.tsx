import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import InputField from '../components/common/InputField'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage } from '../lib/api'

function ChangePasswordPage() {
  const navigate = useNavigate()
  const { forcePasswordChange } = useAuth()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Đổi mật khẩu bắt buộc</h2>
        <p className="mt-1 text-sm text-slate-600">
          Bạn cần đổi mật khẩu trước khi tiếp tục sử dụng hệ thống.
        </p>
      </div>

      <form
        className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
        onSubmit={async (event) => {
          event.preventDefault()
          setError(null)

          if (newPassword !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp.')
            return
          }

          // client-side password policy check (mirror backend)
          const pw = newPassword
          if (pw.length < 8) {
            setError('Mật khẩu phải có ít nhất 8 ký tự')
            return
          }
          if (!/[A-Z]/.test(pw)) {
            setError('Mật khẩu phải có ít nhất 1 chữ hoa')
            return
          }
          if (!/\d/.test(pw)) {
            setError('Mật khẩu phải có ít nhất 1 chữ số')
            return
          }
          if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) {
            setError('Mật khẩu phải có ít nhất 1 ký tự đặc biệt')
            return
          }

          try {
            await forcePasswordChange(oldPassword, newPassword)
            navigate('/employee', { replace: true })
          } catch (err) {
            setError(getApiErrorMessage(err))
          }
        }}
      >
        <InputField
          id="force-old-password"
          label="Mật khẩu cũ"
          type="password"
          value={oldPassword}
          onChange={(event) => setOldPassword(event.target.value)}
          required
        />
        <InputField
          id="force-new-password"
          label="Mật khẩu mới"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
        />
        <InputField
          id="force-confirm-password"
          label="Nhập lại mật khẩu mới"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />

        {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Xác nhận đổi mật khẩu
        </button>
      </form>
    </div>
  )
}

export default ChangePasswordPage
