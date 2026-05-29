import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ConfirmDialog from '../components/common/ConfirmDialog'
import {
  getApiErrorMessage,
  getNotifications,
  getPwaNotificationSettings,
  markAllNotificationsRead,
  markNotificationRead,
  updatePwaNotificationSettings,
} from '../lib/api'
import type { NotificationListResponse } from '../types/notification'
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

const SETTING_OPTIONS = [
  { key: 'new_task', label: 'Task mới' },
  { key: 'deadline', label: 'Nhắc deadline' },
  { key: 'kpi', label: 'KPI' },
  { key: 'system', label: 'Hệ thống' },
] as const

type NotificationGroupKey = 'all' | 'unread' | 'task' | 'deadline' | 'comment' | 'kpi' | 'system' | 'other'

const GROUP_LABELS: Record<NotificationGroupKey, string> = {
  all: 'Tất cả',
  unread: 'Chưa đọc',
  task: 'Công việc',
  deadline: 'Deadline',
  comment: 'Trao đổi',
  kpi: 'KPI',
  system: 'Hệ thống',
  other: 'Khác',
}

function resolveNotificationGroup(type: string): Exclude<NotificationGroupKey, 'all' | 'unread'> {
  const normalized = type.toLowerCase()
  if (normalized.includes('deadline')) return 'deadline'
  if (normalized.includes('comment') || normalized.includes('reply')) return 'comment'
  if (normalized.includes('kpi')) return 'kpi'
  if (normalized.includes('system')) return 'system'
  if (normalized.includes('task') || normalized.includes('assign')) return 'task'
  return 'other'
}

function groupItems(items: NotificationListResponse['items']) {
  const buckets: Record<Exclude<NotificationGroupKey, 'all' | 'unread'>, typeof items> = {
    task: [],
    deadline: [],
    comment: [],
    kpi: [],
    system: [],
    other: [],
  }

  items.forEach((item) => {
    buckets[resolveNotificationGroup(item.type)].push(item)
  })

  return buckets
}

function EmployeeNotificationsPage() {
  const { session } = useAuth()
  const [data, setData] = useState<NotificationListResponse | null>(null)
  const [settings, setSettings] = useState<PwaNotificationSettingsResponse>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null)
  const [confirmMarkAllOpen, setConfirmMarkAllOpen] = useState(false)
  const [confirmSaving, setConfirmSaving] = useState(false)
  const [activeGroup, setActiveGroup] = useState<NotificationGroupKey>('all')
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'unsupported',
  )

  const groupedItems = useMemo(() => {
    const items = data?.items ?? []
    const unreadItems = items.filter((item) => !item.is_read)
    const sourceItems = activeGroup === 'unread' ? unreadItems : items

    if (activeGroup === 'all' || activeGroup === 'unread') {
      const buckets = groupItems(sourceItems)
      return (Object.keys(buckets) as Array<Exclude<NotificationGroupKey, 'all' | 'unread'>>)
        .filter((key) => buckets[key].length > 0)
        .map((key) => ({ key, title: GROUP_LABELS[key], items: buckets[key] }))
    }

    const filtered = sourceItems.filter((item) => resolveNotificationGroup(item.type) === activeGroup)
    return filtered.length > 0 ? [{ key: activeGroup, title: GROUP_LABELS[activeGroup], items: filtered }] : []
  }, [activeGroup, data?.items])

  const groupCounts = useMemo(() => {
    const items = data?.items ?? []
    const counts: Record<NotificationGroupKey, number> = {
      all: items.length,
      unread: items.filter((item) => !item.is_read).length,
      task: 0,
      deadline: 0,
      comment: 0,
      kpi: 0,
      system: 0,
      other: 0,
    }

    items.forEach((item) => {
      counts[resolveNotificationGroup(item.type)] += 1
    })

    return counts
  }, [data?.items])

  const loadNotifications = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getNotifications({ page_size: 50 })
      setData(result)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = async () => {
    setSettingsLoading(true)
    setSettingsError(null)
    try {
      const result = await getPwaNotificationSettings()
      setSettings({
        push_enabled: result.push_enabled,
        types: {
          ...DEFAULT_SETTINGS.types,
          ...result.types,
        },
      })
    } catch (err) {
      setSettingsError(getApiErrorMessage(err))
    } finally {
      setSettingsLoading(false)
    }
  }

  useEffect(() => {
    void loadNotifications()
    void loadSettings()
  }, [])

  async function requestBrowserPermission() {
    if (!('Notification' in window)) {
      setSettingsError('Trình duyệt này không hỗ trợ thông báo.')
      setBrowserPermission('unsupported')
      return
    }

    const permission = await window.Notification.requestPermission()
    setBrowserPermission(permission)
    setSettingsMessage(
      permission === 'granted'
        ? 'Đã bật quyền thông báo của trình duyệt.'
        : 'Bạn đã từ chối quyền thông báo của trình duyệt.',
    )
  }

  async function saveSettings(nextSettings: PwaNotificationSettingsResponse) {
    setSettingsSaving(true)
    setSettingsError(null)
    try {
      const result = await updatePwaNotificationSettings(nextSettings)
      setSettings({
        push_enabled: result.push_enabled,
        types: {
          ...DEFAULT_SETTINGS.types,
          ...result.types,
        },
      })
      setSettingsMessage('Đã lưu cài đặt thông báo.')
    } catch (err) {
      setSettingsError(getApiErrorMessage(err))
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

  async function handleMarkRead(notificationId: string) {
    try {
      await markNotificationRead(notificationId)
      setActionMessage('Đã đánh dấu thông báo là đã đọc.')
      await loadNotifications()
    } catch (err) {
      setActionMessage(getApiErrorMessage(err))
    }
  }

  async function handleMarkAllRead() {
    try {
      setConfirmSaving(true)
      await markAllNotificationsRead()
      setActionMessage('Đã đánh dấu tất cả thông báo là đã đọc.')
      setConfirmMarkAllOpen(false)
      await loadNotifications()
    } catch (err) {
      setActionMessage(getApiErrorMessage(err))
    } finally {
      setConfirmSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-800 p-5 text-white shadow-panel">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Thông báo</p>
        <h1 className="mt-2 text-2xl font-semibold">Hộp thư thông báo của bạn</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          Xem các kết quả chốt KPI, kết quả điều chỉnh, và các thông báo công việc mới từ cùng một nơi.
        </p>
        <p className="mt-3 text-xs text-slate-300">Vai trò hiện tại: {session?.role ?? 'staff'}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(GROUP_LABELS) as NotificationGroupKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveGroup(key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeGroup === key ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            {GROUP_LABELS[key]} <span className="ml-1 text-xs opacity-80">{groupCounts[key]}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-panel">
        <p className="text-sm text-slate-600">
          {data ? `${data.unread_count} chưa đọc / ${data.total} tổng` : 'Đang tải...'}
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link to="/employee/settings" className="rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50">
            Cài đặt thông báo
          </Link>
          <Link to="/employee/help" className="rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50">
            Mở Help Center
          </Link>
          <button
            type="button"
            onClick={() => setConfirmMarkAllOpen(true)}
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-ink transition hover:bg-slate-50"
          >
            Đánh dấu tất cả đã đọc
          </button>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cài đặt thông báo</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">Push, badge và loại thông báo</h2>
            <p className="mt-2 text-sm text-slate-600">
              Điều chỉnh các nhóm thông báo bạn muốn nhận trong ứng dụng và trên trình duyệt.
            </p>
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

        {settingsError && <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{settingsError}</p>}
        {settingsMessage && <p className="mt-4 rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-800">{settingsMessage}</p>}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
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
            onClick={() => void saveSettings(settings)}
            disabled={settingsLoading || settingsSaving}
            className="rounded-2xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {settingsSaving ? 'Đang lưu...' : 'Lưu cài đặt'}
          </button>
        </div>
      </section>

      {loading && <p className="text-sm text-slate-500">Đang tải thông báo...</p>}
      {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {actionMessage && <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{actionMessage}</p>}

      <ConfirmDialog
        open={confirmMarkAllOpen}
        title="Đánh dấu tất cả thông báo là đã đọc?"
        description="Hành động này sẽ dọn toàn bộ badge chưa đọc trong trung tâm thông báo. Bạn có chắc muốn tiếp tục không?"
        confirmLabel="Đánh dấu đã đọc"
        cancelLabel="Để sau"
        busy={confirmSaving}
        onCancel={() => setConfirmMarkAllOpen(false)}
        onConfirm={() => void handleMarkAllRead()}
      />

      {data && (
        <div className="space-y-6">
          {groupedItems.length > 0 ? (
            groupedItems.map((group) => (
              <section key={group.key} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-ink">{group.title}</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{group.items.length}</span>
                </div>
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <article
                      key={item.id}
                      className={`rounded-3xl border p-4 shadow-panel ${item.is_read ? 'border-slate-200 bg-white' : 'border-teal-200 bg-teal-50'}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">{GROUP_LABELS[resolveNotificationGroup(item.type)]}</p>
                          <h3 className="mt-1 text-lg font-semibold text-ink">{item.title}</h3>
                          <p className="mt-2 text-sm text-slate-600 whitespace-pre-line">{item.body}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${item.is_read ? 'bg-slate-100 text-slate-600' : 'bg-teal-100 text-teal-700'}`}>
                            {item.is_read ? 'Đã đọc' : 'Chưa đọc'}
                          </span>
                          {!item.is_read && (
                            <button
                              type="button"
                              onClick={() => void handleMarkRead(item.id)}
                              className="rounded-full bg-brand px-3 py-1 text-xs font-medium text-white hover:bg-teal-700"
                            >
                              Đánh dấu đã đọc
                            </button>
                          )}
                        </div>
                      </div>
                      {item.created_at && <p className="mt-3 text-xs text-slate-500">{new Date(item.created_at).toLocaleString('vi-VN')}</p>}
                    </article>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Không có thông báo nào.</div>
          )}
        </div>
      )}
    </div>
  )
}

export default EmployeeNotificationsPage