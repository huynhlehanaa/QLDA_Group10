import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { useAuth } from '../context/AuthContext'
import {
  getApiErrorMessage,
  getPwaNotificationSettings,
  updatePwaNotificationSettings,
} from '../lib/api'
import type { PwaNotificationSettingsResponse } from '../types/pwa'

const DEFAULT_SETTINGS: PwaNotificationSettingsResponse = {
  push_enabled: true,
  types: {
    new_task: true,
    deadline: true,
    kpi: true,
    system: true,
  },
}

const LANGUAGE_OPTIONS = [
  { key: 'system', label: 'Theo hệ thống', description: 'Dùng ngôn ngữ mặc định của trình duyệt/thiết bị.' },
  { key: 'vi', label: 'Tiếng Việt', description: 'Ưu tiên ngôn ngữ tiếng Việt cho giao diện staff.' },
  { key: 'en', label: 'English', description: 'Dùng English cho trải nghiệm giao diện quốc tế.' },
] as const

const SETTING_OPTIONS = [
  { key: 'new_task', label: 'Task mới' },
  { key: 'deadline', label: 'Nhắc deadline' },
  { key: 'kpi', label: 'KPI' },
  { key: 'system', label: 'Hệ thống' },
] as const

type LanguageKey = (typeof LANGUAGE_OPTIONS)[number]['key']

function getLanguageStorageKey(userId?: string | null) {
  return `staff-language-preference:${userId ?? 'anonymous'}`
}

function EmployeeSettingsPage() {
  const { profile, session } = useAuth()
  const [settings, setSettings] = useState<PwaNotificationSettingsResponse>(DEFAULT_SETTINGS)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [language, setLanguage] = useState<LanguageKey>('system')
  const [languageSaving, setLanguageSaving] = useState(false)
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'unsupported',
  )
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const storageKey = useMemo(() => getLanguageStorageKey(profile?.id ?? session?.userId), [profile?.id, session?.userId])

  useEffect(() => {
    const load = async () => {
      try {
        const stored = window.localStorage.getItem(storageKey)
        if (stored === 'vi' || stored === 'en' || stored === 'system') {
          setLanguage(stored)
        }

        const result = await getPwaNotificationSettings()
        setSettings({
          push_enabled: result.push_enabled,
          types: {
            ...DEFAULT_SETTINGS.types,
            ...result.types,
          },
        })
      } catch (err) {
        setError(getApiErrorMessage(err))
      } finally {
        setSettingsLoading(false)
      }
    }

    void load()
  }, [storageKey])

  useEffect(() => {
    document.documentElement.lang = language === 'system' ? 'vi' : language
  }, [language])

  async function saveLanguage(nextLanguage: LanguageKey) {
    setLanguageSaving(true)
    setError(null)
    try {
      window.localStorage.setItem(storageKey, nextLanguage)
      setLanguage(nextLanguage)
      setMessage('Đã lưu ngôn ngữ giao diện cho tài khoản này.')
    } finally {
      setLanguageSaving(false)
    }
  }

  async function saveNotificationSettings(nextSettings: PwaNotificationSettingsResponse) {
    setSettingsSaving(true)
    setError(null)
    try {
      const result = await updatePwaNotificationSettings(nextSettings)
      setSettings({
        push_enabled: result.push_enabled,
        types: {
          ...DEFAULT_SETTINGS.types,
          ...result.types,
        },
      })
      setMessage('Đã lưu cài đặt thông báo.')
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSettingsSaving(false)
    }
  }

  function updateTypeSetting(key: keyof PwaNotificationSettingsResponse['types']) {
    setSettings((current) => ({
      ...current,
      types: {
        ...current.types,
        [key]: !current.types[key],
      },
    }))
  }

  async function requestBrowserPermission() {
    if (!('Notification' in window)) {
      setError('Trình duyệt này không hỗ trợ thông báo.')
      setBrowserPermission('unsupported')
      return
    }

    const permission = await window.Notification.requestPermission()
    setBrowserPermission(permission)
    setMessage(permission === 'granted' ? 'Đã bật quyền thông báo của trình duyệt.' : 'Bạn đã từ chối quyền thông báo của trình duyệt.')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-800 p-5 text-white shadow-panel">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Cài đặt</p>
        <h1 className="mt-2 text-2xl font-semibold">Tùy chỉnh giao diện và thông báo</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">Chọn ngôn ngữ giao diện, bật/tắt từng loại thông báo và cấp quyền trình duyệt nếu cần.</p>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ngôn ngữ giao diện</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">Chọn ngôn ngữ riêng cho tài khoản</h2>
            <p className="mt-2 text-sm text-slate-600">Tùy chọn này được lưu theo user và có thể thay thế ngôn ngữ hệ thống cho trải nghiệm staff.</p>
          </div>
          <Link to="/employee/help" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Mở Help Center
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => void saveLanguage(option.key)}
              disabled={languageSaving}
              className={`rounded-2xl border p-4 text-left transition ${language === option.key ? 'border-brand bg-teal-50' : 'border-slate-200 bg-slate-50 hover:bg-white'} disabled:opacity-60`}
            >
              <p className="font-semibold text-ink">{option.label}</p>
              <p className="mt-1 text-sm text-slate-600">{option.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Thông báo</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">Push, badge và loại thông báo</h2>
            <p className="mt-2 text-sm text-slate-600">Điều chỉnh các nhóm thông báo bạn muốn nhận trong ứng dụng và trên trình duyệt.</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2 text-sm text-slate-700">
            <span className={`h-2.5 w-2.5 rounded-full ${browserPermission === 'granted' ? 'bg-emerald-500' : browserPermission === 'denied' ? 'bg-rose-500' : 'bg-amber-500'}`} />
            <span>
              {browserPermission === 'granted'
                ? 'Trình duyệt đã cho phép'
                : browserPermission === 'denied'
                  ? 'Trình duyệt đã chặn'
                  : browserPermission === 'unsupported'
                    ? 'Không hỗ trợ'
                    : 'Chưa cấp quyền'}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="font-medium text-ink">Bật nhận thông báo</p>
              <p className="text-sm text-slate-500">Cho phép ứng dụng hiển thị badge và gửi cảnh báo.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.push_enabled}
              onChange={(e) => setSettings((current) => ({ ...current, push_enabled: e.target.checked }))}
              className="h-5 w-5 rounded border-slate-300 text-brand focus:ring-brand"
            />
          </label>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="font-medium text-ink">Quyền thông báo của trình duyệt</p>
            <p className="mt-1 text-sm text-slate-500">Cần cấp quyền trước khi dùng thông báo hệ điều hành.</p>
            <button
              type="button"
              onClick={() => void requestBrowserPermission()}
              className="mt-3 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Cấp quyền trình duyệt
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SETTING_OPTIONS.map((option) => (
            <label key={option.key} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <span className="text-sm font-medium text-ink">{option.label}</span>
              <input
                type="checkbox"
                checked={settings.types[option.key] ?? false}
                onChange={() => updateTypeSetting(option.key)}
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
              />
            </label>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {settingsLoading ? 'Đang tải cài đặt...' : settingsSaving ? 'Đang lưu...' : 'Lưu thay đổi để áp dụng ngay.'}
          </p>
          <button
            type="button"
            onClick={() => void saveNotificationSettings(settings)}
            disabled={settingsLoading || settingsSaving}
            className="rounded-2xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {settingsSaving ? 'Đang lưu...' : 'Lưu cài đặt'}
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-lg font-semibold text-ink">Lối tắt</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link to="/employee/notifications" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Notification Center</Link>
            <Link to="/employee/help" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Help Center</Link>
            <Link to="/profile-security" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Hồ sơ bảo mật</Link>
            <Link to="/employee/tasks" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Công việc</Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-lg font-semibold text-ink">Ghi chú</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>• Ngôn ngữ giao diện đang được lưu riêng cho tài khoản hiện tại.</li>
            <li>• Cài đặt thông báo đồng bộ với backend PWA hiện có.</li>
            <li>• Nếu cần kiểm soát thêm, dùng trang Hồ sơ bảo mật để đổi mật khẩu hoặc đăng xuất thiết bị.</li>
          </ul>
        </div>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Lưu thay đổi cài đặt?"
        description="Bạn có chắc muốn áp dụng thay đổi hiện tại cho tài khoản của mình không?"
        confirmLabel="Lưu thay đổi"
        cancelLabel="Để sau"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false)
          await saveNotificationSettings(settings)
        }}
      />

      {message && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    </div>
  )
}

export default EmployeeSettingsPage