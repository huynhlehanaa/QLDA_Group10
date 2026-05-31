import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getApiErrorMessage, getPwaBadgeCount, getPwaInstallGuide, getPwaOfflineData, syncPwaData } from '../../lib/api'
import type { PwaInstallGuideResponse } from '../../types/pwa'
import Breadcrumbs, { type BreadcrumbItem } from '../common/Breadcrumbs'

const ROUTE_BREADCRUMBS: Record<string, BreadcrumbItem[]> = {
  '/employee': [{ label: 'Trang chủ', to: '/employee' }],
  '/employee/kpi': [{ label: 'Trang chủ', to: '/employee' }, { label: 'KPI' }],
  '/employee/calendar': [{ label: 'Trang chủ', to: '/employee' }, { label: 'Lịch' }],
  '/employee/notifications': [{ label: 'Trang chủ', to: '/employee' }, { label: 'Thông báo' }],
  '/employee/help': [{ label: 'Trang chủ', to: '/employee' }, { label: 'Help Center' }],
  '/employee/settings': [{ label: 'Trang chủ', to: '/employee' }, { label: 'Cài đặt' }],
  '/employee/tasks': [{ label: 'Trang chủ', to: '/employee' }, { label: 'Công việc' }],
  '/profile-security': [{ label: 'Trang chủ', to: '/employee' }, { label: 'Hồ sơ' }],
  '/change-password': [{ label: 'Trang chủ', to: '/employee' }, { label: 'Đổi mật khẩu' }],
}

function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, sessionWarning, refreshSession, logoutThisDevice } = useAuth()
  const [warningCountdown, setWarningCountdown] = useState(300)
  const [badgeCount, setBadgeCount] = useState(0)
  const [installBannerVisible, setInstallBannerVisible] = useState(false)
  const [installGuide, setInstallGuide] = useState<PwaInstallGuideResponse | null>(null)
  const [installGuideError, setInstallGuideError] = useState<string | null>(null)
  const [installGuideOpen, setInstallGuideOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(window.navigator.onLine)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [offlineTaskCount, setOfflineTaskCount] = useState(0)

  useEffect(() => {
    if (!sessionWarning) {
      return
    }

    const timer = window.setInterval(() => {
      setWarningCountdown((current) => (current > 0 ? current - 1 : 0))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [sessionWarning])

  useEffect(() => {
    const loadBadgeCount = async () => {
      try {
        const data = await getPwaBadgeCount()
        setBadgeCount(data.badge_count)
      } catch {
        setBadgeCount(0)
      }
    }

    void loadBadgeCount()
  }, [])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const hydrateCache = async () => {
      if (!isOnline) {
        const cached = window.localStorage.getItem('pwa-offline-cache')
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as { tasks?: Array<unknown> }
            setOfflineTaskCount(Array.isArray(parsed.tasks) ? parsed.tasks.length : 0)
          } catch {
            setOfflineTaskCount(0)
          }
        }
        setSyncMessage('Đang ở chế độ offline, dùng dữ liệu đã lưu gần nhất.')
        return
      }

      try {
        const offlineData = await getPwaOfflineData()
        window.localStorage.setItem('pwa-offline-cache', JSON.stringify(offlineData))
        window.localStorage.setItem('pwa-last-sync-at', offlineData.cached_at)
        setOfflineTaskCount(offlineData.tasks.length)

        const lastSyncAt = window.localStorage.getItem('pwa-last-sync-at')
        if (lastSyncAt) {
          const syncResult = await syncPwaData(lastSyncAt)
          window.localStorage.setItem('pwa-last-sync-at', syncResult.synced_at)
          const changeCount =
            syncResult.changes.new_tasks.length +
            syncResult.changes.updated_tasks.length +
            syncResult.changes.updated_notifications.length
          setSyncMessage(changeCount > 0 ? `Đã đồng bộ ${changeCount} thay đổi khi mạng trở lại.` : 'Dữ liệu đã được đồng bộ.')
        } else {
          setSyncMessage('Dữ liệu offline đã được làm mới.')
        }

        const badge = await getPwaBadgeCount()
        setBadgeCount(badge.badge_count)
      } catch (err) {
        setSyncMessage(getApiErrorMessage(err))
      }
    }

    void hydrateCache()
  }, [isOnline])

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches
    if (!isMobile) {
      return
    }

    const dismissedAt = window.localStorage.getItem('pwa-install-banner-dismissed-at')
    if (dismissedAt) {
      const dismissedTime = new Date(dismissedAt).getTime()
      if (Number.isFinite(dismissedTime) && Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return
      }
    }

    const timer = window.setTimeout(() => setInstallBannerVisible(true), 30000)
    return () => window.clearTimeout(timer)
  }, [])

  const mobilePlatform = useMemo<'android' | 'ios'>(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    return /iphone|ipad|ipod/.test(userAgent) ? 'ios' : 'android'
  }, [])

  async function openInstallGuide() {
    setInstallGuideError(null)
    try {
      const guide = await getPwaInstallGuide(mobilePlatform)
      setInstallGuide(guide)
      setInstallGuideOpen(true)
    } catch (err) {
      setInstallGuideError(getApiErrorMessage(err))
    }
  }

  function dismissInstallBanner() {
    window.localStorage.setItem('pwa-install-banner-dismissed-at', new Date().toISOString())
    setInstallBannerVisible(false)
  }

  const initials = session?.fullName
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  const breadcrumbItems = ROUTE_BREADCRUMBS[location.pathname] ?? [{ label: 'Trang chủ', to: '/employee' }]

  return (
    <div className="min-h-screen text-ink">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <Link to="/employee" className="font-semibold text-brand">
            KPI Nội Bộ - Nhân viên
          </Link>

          <nav className="hidden items-center gap-2 text-sm font-medium text-slate-600 md:flex">
            <NavLink
              to="/employee"
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 ${isActive ? 'bg-brand text-white' : 'hover:bg-slate-100'}`
              }
            >
              Trang chính
            </NavLink>
            <NavLink
              to="/employee/kpi"
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 ${isActive ? 'bg-brand text-white' : 'hover:bg-slate-100'}`
              }
            >
              KPI
            </NavLink>
            <NavLink
              to="/employee/calendar"
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 ${isActive ? 'bg-brand text-white' : 'hover:bg-slate-100'}`
              }
            >
              Lịch
            </NavLink>
            <NavLink
              to="/employee/notifications"
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 ${isActive ? 'bg-brand text-white' : 'hover:bg-slate-100'}`
              }
            >
              Thông báo
            </NavLink>
            <NavLink
              to="/employee/tasks"
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 ${isActive ? 'bg-brand text-white' : 'hover:bg-slate-100'}`
              }
            >
              Công việc
            </NavLink>
            <NavLink
              to="/employee/help"
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 ${isActive ? 'bg-brand text-white' : 'hover:bg-slate-100'}`
              }
            >
              Hỗ trợ
            </NavLink>
            <NavLink
              to="/employee/settings"
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 ${isActive ? 'bg-brand text-white' : 'hover:bg-slate-100'}`
              }
            >
              Cài đặt
            </NavLink>
            <NavLink
              to="/profile-security"
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 ${isActive ? 'bg-brand text-white' : 'hover:bg-slate-100'}`
              }
            >
              Hồ sơ
            </NavLink>
            <button
              type="button"
              onClick={async () => {
                await logoutThisDevice()
                navigate('/login', { replace: true })
              }}
              className="rounded-full px-3 py-1.5 hover:bg-slate-100"
            >
              Đăng xuất
            </button>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {session?.role ?? 'staff'}
            </span>
          </div>
        </div>

        {sessionWarning && (
          <div className="border-t border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-900 md:px-6">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
              <p>Phiên làm việc sẽ hết hạn sau {warningCountdown} giây nếu bạn không gia hạn.</p>
              <button
                type="button"
                onClick={() => {
                  void refreshSession()
                }}
                className="rounded-md bg-amber-500 px-3 py-1 text-white hover:bg-amber-600"
              >
                Tiếp tục làm việc
              </button>
            </div>
          </div>
        )}

        {!isOnline && (
          <div className="border-t border-slate-300 bg-slate-100 px-4 py-2 text-sm text-slate-700 md:px-6">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
              <p>Không có mạng. Bạn đang xem dữ liệu cache gần nhất cho {offlineTaskCount} task.</p>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600">Offline</span>
            </div>
          </div>
        )}

        {syncMessage && isOnline && (
          <div className="border-t border-teal-200 bg-teal-50 px-4 py-2 text-sm text-teal-900 md:px-6">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
              <p>{syncMessage}</p>
              <button
                type="button"
                onClick={() => setSyncMessage(null)}
                className="rounded-full px-3 py-1 text-xs font-medium text-teal-800 hover:bg-teal-100"
              >
                Ẩn
              </button>
            </div>
          </div>
        )}

        {installBannerVisible && (
          <div className="border-t border-teal-200 bg-teal-50 px-4 py-3 md:px-6">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 rounded-2xl border border-teal-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">Cài KPI Nội Bộ lên màn hình chính</p>
                <p className="text-sm text-slate-600">Truy cập nhanh hơn, nhận thông báo và dùng như ứng dụng native.</p>
                {installGuideError && <p className="mt-2 text-sm text-rose-600">{installGuideError}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void openInstallGuide()}
                  className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  Xem hướng dẫn
                </button>
                <button
                  type="button"
                  onClick={dismissInstallBanner}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Để sau
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-4 md:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-panel backdrop-blur">
          <Breadcrumbs items={breadcrumbItems} />
        </div>
      </div>

      {installGuideOpen && installGuide && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-slate-950/60 p-4 md:items-center">
          <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">{installGuide.platform}</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">{installGuide.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setInstallGuideOpen(false)}
                className="rounded-full px-3 py-1 text-slate-500 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-slate-700">
              {installGuide.steps.map((step) => (
                <li key={step.step} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="font-semibold text-ink">{step.step}. {step.title}</p>
                  <p className="mt-1 text-slate-600">{step.description}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-800">{installGuide.note}</p>
          </div>
        </div>
      )}

      <main className="mx-auto flex max-w-6xl gap-6 px-4 py-6 pb-24 md:px-6 md:pb-6">
        <aside className="hidden w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-panel md:block">
          <div className="mb-5 flex items-center gap-3">
            {session?.avatarUrl ? (
              <img
                src={session.avatarUrl}
                alt={`${session.fullName ?? 'User'} avatar`}
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              <div className="grid h-11 w-11 place-content-center rounded-full bg-brand text-sm font-semibold text-white">
                {initials || 'NV'}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-ink">{session?.fullName}</p>
              <p className="text-xs text-slate-500">Vai trò: {session?.role}</p>
            </div>
          </div>
          <p className="rounded-xl bg-mist px-3 py-2 text-xs text-slate-600">
            Mọi thao tác trong khu vực này chỉ áp dụng cho dữ liệu cá nhân của bạn.
          </p>
          <div className="mt-4 space-y-2 text-sm font-medium text-slate-700">
            <Link to="/employee/notifications" className="block rounded-xl px-3 py-2 transition hover:bg-slate-50">
              Mở trung tâm thông báo
            </Link>
            <Link to="/employee/tasks" className="block rounded-xl px-3 py-2 transition hover:bg-slate-50">
              Xem công việc của tôi
            </Link>
            <Link to="/employee/kpi" className="block rounded-xl px-3 py-2 transition hover:bg-slate-50">
              Kiểm tra KPI
            </Link>
            <Link to="/employee/help" className="block rounded-xl px-3 py-2 transition hover:bg-slate-50">
              Mở Help Center
            </Link>
            <Link to="/employee/settings" className="block rounded-xl px-3 py-2 transition hover:bg-slate-50">
              Mở Cài đặt
            </Link>
          </div>
        </aside>
        <section className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-panel md:p-6">
          <Outlet />
        </section>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-4 gap-1 px-2 py-2 text-xs font-medium text-slate-600">
          <NavLink to="/employee" className={({ isActive }) => `rounded-2xl px-2 py-2 text-center ${isActive ? 'bg-brand text-white' : 'hover:bg-slate-100'}`}>
            Trang chủ
          </NavLink>
          <NavLink to="/employee/tasks" className={({ isActive }) => `rounded-2xl px-2 py-2 text-center ${isActive ? 'bg-brand text-white' : 'hover:bg-slate-100'}`}>
            Tasks
          </NavLink>
          <NavLink to="/employee/kpi" className={({ isActive }) => `rounded-2xl px-2 py-2 text-center ${isActive ? 'bg-brand text-white' : 'hover:bg-slate-100'}`}>
            KPI
          </NavLink>
          <NavLink to="/employee/notifications" className={({ isActive }) => `relative rounded-2xl px-2 py-2 text-center ${isActive ? 'bg-brand text-white' : 'hover:bg-slate-100'}`}>
            <span>TB</span>
            {badgeCount > 0 && (
              <span className="absolute right-2 top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </NavLink>
        </div>
      </nav>
    </div>
  )
}

export default AppShell
