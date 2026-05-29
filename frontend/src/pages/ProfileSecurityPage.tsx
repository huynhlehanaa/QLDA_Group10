import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import InputField from '../components/common/InputField'
import { useAuth } from '../context/AuthContext'
import {
  changePassword,
  getApiErrorMessage,
  getProfile,
  updateAvatar,
  updatePhone,
} from '../lib/api'

function ProfileSecurityPage() {
  const navigate = useNavigate()
  const { profile, updateProfileLocally, logoutEverywhere } = useAuth()
  const { logoutThisDevice } = useAuth()
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshProfile = async () => {
    const me = await getProfile()
    updateProfileLocally(me)
  }

  // keep local input state in sync when profile updates elsewhere
  useEffect(() => {
    setAvatarUrl(profile?.avatar_url || '')
    setPhone(profile?.phone || '')
  }, [profile])

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-ink">Hồ sơ và bảo mật tài khoản</h2>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
        <div>
          <h3 className="font-semibold text-ink">Thông tin hồ sơ</h3>
          <p className="mt-1 text-sm text-slate-600">
            Xem thông tin cá nhân, cập nhật ảnh đại diện và số điện thoại.
          </p>
        </div>
        <div className="space-y-3">
          <InputField
            id="avatar-url"
            label="URL ảnh đại diện"
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            placeholder="https://..."
          />
          <button
            type="button"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-white"
            onClick={async () => {
              setMessage(null)
              setError(null)
              try {
                await updateAvatar(avatarUrl)
                await refreshProfile()
                setMessage('Đã cập nhật ảnh đại diện.')
              } catch (err) {
                setError(getApiErrorMessage(err))
              }
            }}
          >
            Lưu ảnh đại diện
          </button>

          <InputField
            id="phone"
            label="Số điện thoại"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="0901234567"
          />
          <button
            type="button"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-white"
            onClick={async () => {
              setMessage(null)
              setError(null)
              try {
                await updatePhone(phone)
                await refreshProfile()
                setMessage('Đã cập nhật số điện thoại.')
              } catch (err) {
                setError(getApiErrorMessage(err))
              }
            }}
          >
            Lưu số điện thoại
          </button>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
        <div>
          <h3 className="font-semibold text-ink">Đổi mật khẩu</h3>
          <p className="mt-1 text-sm text-slate-600">Vui lòng nhập mật khẩu cũ để xác nhận thay đổi.</p>
        </div>

        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault()
            setMessage(null)
            setError(null)
            try {
                // client-side validation to mirror backend rules
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

                await changePassword(oldPassword, newPassword)
              setMessage('Đổi mật khẩu thành công. Vui lòng đăng nhập lại trên các thiết bị khác.')
              setOldPassword('')
              setNewPassword('')
              await refreshProfile()
            } catch (err) {
              setError(getApiErrorMessage(err))
            }
          }}
        >
          <InputField
            id="old-password"
            label="Mật khẩu cũ"
            type="password"
            value={oldPassword}
            onChange={(event) => setOldPassword(event.target.value)}
            required
          />
          <InputField
            id="new-password-profile"
            label="Mật khẩu mới"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Đổi mật khẩu
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
        <h3 className="font-semibold text-amber-900">Đăng xuất khỏi tất cả thiết bị</h3>
        <p className="mt-1 text-sm text-amber-800">
          Sử dụng khi nghi ngờ tài khoản đang được đăng nhập trái phép.
        </p>
        <button
          type="button"
          className="mt-3 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
          onClick={async () => {
            await logoutEverywhere()
            navigate('/login', { replace: true })
          }}
        >
          Đăng xuất tất cả
        </button>
        <button
          type="button"
          className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
          onClick={async () => {
            await logoutThisDevice()
            navigate('/login', { replace: true })
          }}
        >
          Đăng xuất thiết bị này
        </button>
      </section>

      {message && <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{message}</p>}
      {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
    </div>
  )
}

export default ProfileSecurityPage
