import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage, getOnboardingChecklist, getStaffDashboard } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { StaffDashboardResponse } from '../types/dashboard'

function EmployeeHomePage() {
  const { profile, session } = useAuth()
  const [checklist, setChecklist] = useState<Awaited<ReturnType<typeof getOnboardingChecklist>> | null>(null)
  const [dashboard, setDashboard] = useState<StaffDashboardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)

  useEffect(() => {
    const loadHome = async () => {
      try {
        const [checklistData, dashboardData] = await Promise.all([getOnboardingChecklist(), getStaffDashboard()])
        setChecklist(checklistData)
        setDashboard(dashboardData)
      } catch (err) {
        setError(getApiErrorMessage(err))
      }
    }
    void loadHome()
  }, [])

  const firstLogin = !profile?.first_login_at

  const isWelcomeOpen = firstLogin && !welcomeDismissed

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-600 p-5 text-white">
        <p className="text-xs uppercase tracking-wide text-teal-100">Không gian làm việc nhân viên</p>
        <h2 className="mt-2 text-2xl font-semibold">Xin chào, {session?.fullName}</h2>
        <p className="mt-2 text-sm text-teal-50">
          Bạn đã đăng nhập đúng vai trò. Hệ thống đã sẵn sàng để bạn bắt đầu công việc hôm nay.
        </p>
      </div>

      {firstLogin && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <h3 className="font-semibold text-amber-900">Chào mừng bạn đến với hệ thống</h3>
          <p className="mt-1 text-sm text-amber-800">
            Hãy xem hướng dẫn nhanh để làm quen với các chức năng quan trọng.
          </p>
          <button
            type="button"
            className="mt-3 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
            onClick={() => setWelcomeDismissed(false)}
          >
            Xem lại hướng dẫn
          </button>
        </div>
      )}

      {isWelcomeOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/50 px-4">
          <div
            role="dialog"
            aria-label="Chào mừng bạn đến với KPI Nội Bộ"
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-panel"
          >
            <h3 className="text-xl font-semibold text-ink">Chào mừng bạn đến với KPI Nội Bộ</h3>
            <p className="mt-2 text-sm text-slate-600">
              Chỉ mất 2 phút để hoàn thành các bước thiết lập đầu tiên.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>Bước 1: Đổi mật khẩu tạm thời</li>
              <li>Bước 2: Cập nhật ảnh đại diện và số điện thoại</li>
              <li>Bước 3: Kiểm tra danh sách công việc được giao</li>
            </ul>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setWelcomeDismissed(true)}
              >
                Bỏ qua
              </button>
              <button
                type="button"
                className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
                onClick={() => setWelcomeDismissed(true)}
              >
                Bắt đầu ngay
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold text-ink">Thông tin cá nhân</h3>
          <dl className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-4">
              <dt>Email</dt>
              <dd className="font-medium">{profile?.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Vai trò</dt>
              <dd className="font-medium uppercase">{profile?.role}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Số điện thoại</dt>
              <dd className="font-medium">{profile?.phone || 'Chưa cập nhật'}</dd>
            </div>
          </dl>
          <Link
            to="/employee/kpi"
            className="mt-4 inline-block rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Mở trang KPI cá nhân
          </Link>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link to="/employee/notifications" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Thông báo
            </Link>
            <Link to="/employee/settings" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cài đặt
            </Link>
            <Link to="/employee/help" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Help Center
            </Link>
            <Link to="/profile-security" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Hồ sơ
            </Link>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold text-ink">Dashboard hôm nay</h3>
          {error && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
          {!error && !dashboard && <p className="mt-2 text-sm text-slate-600">Đang tải dữ liệu...</p>}
          {dashboard && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Task hôm nay</p>
                <p className="mt-2 text-2xl font-semibold text-ink">{dashboard.tasks_today.length}</p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">KPI hiện tại</p>
                <p className="mt-2 text-2xl font-semibold text-ink">{dashboard.kpi_current_month.total_score}</p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Done tháng này</p>
                <p className="mt-2 text-2xl font-semibold text-ink">{dashboard.tasks_done_this_month}</p>
                <p className="text-sm text-slate-500">
                  {dashboard.change_direction === 'up' ? '+' : dashboard.change_direction === 'down' ? '-' : ''}
                  {dashboard.tasks_done_change} so với tháng trước
                </p>
              </div>
            </div>
          )}
          {dashboard && (
            <div className="mt-4 rounded-2xl bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-medium text-ink">Task cần làm ngay</h4>
                <Link to="/employee/tasks" className="text-sm text-brand hover:underline">
                  Mở danh sách
                </Link>
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {dashboard.tasks_today.slice(0, 3).map((task) => (
                  <li key={task.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span className="font-medium text-ink">{task.title}</span>
                    <span className="text-slate-500">{task.status}</span>
                  </li>
                ))}
                {dashboard.tasks_today.length === 0 && <li className="text-slate-500">Không có task hôm nay.</li>}
              </ul>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold text-ink">Danh sách thiết lập ban đầu</h3>
          {!error && !checklist && <p className="mt-2 text-sm text-slate-600">Đang tải dữ liệu...</p>}
          {checklist && (
            <>
              <p className="mt-2 text-sm text-slate-700">
                Hoàn thành: <strong>{checklist.done_count}</strong>/{checklist.total} ({checklist.completion_pct}%)
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {checklist.items.map((item) => {
                  const isInternal = item.action_url?.startsWith('/')
                  return (
                    <li
                      key={item.step_id}
                      className="flex items-center justify-between rounded-lg bg-white px-3 py-2"
                    >
                      {isInternal ? (
                        <Link to={item.action_url} className="text-sm text-ink hover:underline">
                          {item.title}
                        </Link>
                      ) : item.action_url ? (
                        <a href={item.action_url} target="_blank" rel="noreferrer" className="text-sm text-ink hover:underline">
                          {item.title}
                        </a>
                      ) : (
                        <span className="text-sm text-ink">{item.title}</span>
                      )}

                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          item.is_done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.is_done ? 'Hoàn thành' : 'Chưa xong'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </article>
      </div>
    </div>
  )
}

export default EmployeeHomePage
