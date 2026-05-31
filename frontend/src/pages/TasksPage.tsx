import { useCallback, useEffect, useState } from 'react'
import { getApiErrorMessage, getKanban, getMobileKanban, getTasks, quickActionTask, updateTaskStatus } from '../lib/api'
import TaskList from '../components/common/TaskList'
import KanbanBoard from '../components/common/KanbanBoard'
import TaskDrawer from '../components/common/TaskDrawer'
import type { KanbanBoard as KanbanBoardData, TaskListItem, TaskPriority, TaskStatus, SortBy, SortDir } from '../types/task'
import type { PwaMobileKanbanResponse } from '../types/pwa'

type ListFilters = {
  search: string
  status: '' | TaskStatus
  priority: '' | TaskPriority
  overdue_only: boolean
  sort_by: SortBy
  sort_dir: SortDir
}

const DEFAULT_FILTERS: ListFilters = {
  search: '',
  status: '',
  priority: '',
  overdue_only: false,
  sort_by: 'deadline',
  sort_dir: 'asc',
}

const MOBILE_COLUMNS: Array<{ status: 'todo' | 'in_progress' | 'done'; label: string }> = [
  { status: 'todo', label: 'Todo' },
  { status: 'in_progress', label: 'Đang làm' },
  { status: 'done', label: 'Done' },
]

function TasksPage() {
  const [mode, setMode] = useState<'list' | 'kanban'>('kanban')
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [mobileColumn, setMobileColumn] = useState<'todo' | 'in_progress' | 'done'>('todo')
  const [tasks, setTasks] = useState<TaskListItem[]>([])
  const [kanban, setKanban] = useState<KanbanBoardData | null>(null)
  const [mobileKanban, setMobileKanban] = useState<PwaMobileKanbanResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null)
  const [quickActionTaskId, setQuickActionTaskId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [filters, setFilters] = useState<ListFilters>(DEFAULT_FILTERS)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobileViewport(media.matches)

    update()
    media.addEventListener('change', update)

    return () => media.removeEventListener('change', update)
  }, [])

  const loadCurrentView = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (mode === 'kanban' && isMobileViewport) {
        const data = await getMobileKanban(mobileColumn)
        setMobileKanban(data)
        setKanban(null)
      } else if (mode === 'kanban') {
        const data = await getKanban()
        setKanban(data)
        setMobileKanban(null)
      } else {
        const list = await getTasks({
          search: filters.search || undefined,
          status: filters.status || undefined,
          priority: filters.priority || undefined,
          overdue_only: filters.overdue_only,
          sort_by: filters.sort_by,
          sort_dir: filters.sort_dir,
        })
        setTasks(list)
        setKanban(null)
        setMobileKanban(null)
      }
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [filters, isMobileViewport, mobileColumn, mode])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCurrentView()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadCurrentView])

  async function refreshKanban() {
    await loadCurrentView()
  }

  async function handleMoveTask(taskId: string, status: TaskStatus) {
    const progressByStatus = status === 'todo' ? 0 : status === 'done' ? 100 : 50
    try {
      setMovingTaskId(taskId)
      await updateTaskStatus(taskId, status, progressByStatus)
      await refreshKanban()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setMovingTaskId(null)
    }
  }

  async function handleQuickComplete(taskId: string) {
    try {
      setQuickActionTaskId(taskId)
      await quickActionTask(taskId, 'complete')
      await refreshKanban()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setQuickActionTaskId(null)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Công việc của tôi</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 ${mode === 'kanban' ? 'bg-brand text-white' : 'hover:bg-slate-100'}`}
            onClick={() => setMode('kanban')}
          >
            Kanban
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 ${mode === 'list' ? 'bg-brand text-white' : 'hover:bg-slate-100'}`}
            onClick={() => setMode('list')}
          >
            Danh sách
          </button>
        </div>
      </div>

      {mode === 'list' && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Tìm kiếm
              <input
                value={filters.search}
                onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value }))}
                placeholder="Nhập tên task..."
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Trạng thái
              <select
                value={filters.status}
                onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value as ListFilters['status'] }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              >
                <option value="">Tất cả</option>
                <option value="todo">Todo</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Ưu tiên
              <select
                value={filters.priority}
                onChange={(e) => setFilters((current) => ({ ...current, priority: e.target.value as ListFilters['priority'] }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              >
                <option value="">Tất cả</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Sắp xếp
              <select
                value={filters.sort_by}
                onChange={(e) => setFilters((current) => ({ ...current, sort_by: e.target.value as SortBy }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              >
                <option value="deadline">Deadline</option>
                <option value="priority">Priority</option>
                <option value="created_at">Created at</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Thứ tự
              <select
                value={filters.sort_dir}
                onChange={(e) => setFilters((current) => ({ ...current, sort_dir: e.target.value as SortDir }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              >
                <option value="asc">Tăng dần</option>
                <option value="desc">Giảm dần</option>
              </select>
            </label>

            <label className="flex items-end gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={filters.overdue_only}
                onChange={(e) => setFilters((current) => ({ ...current, overdue_only: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              Chỉ task quá hạn
            </label>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Reset filter
            </button>
            <p className="text-sm text-slate-500">Kết quả sẽ tự cập nhật theo bộ lọc đang chọn.</p>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">Đang tải...</p>}
      {error && <p className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      {!loading && mode === 'kanban' && isMobileViewport && (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {MOBILE_COLUMNS.map((column) => (
              <button
                key={column.status}
                type="button"
                onClick={() => setMobileColumn(column.status)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${mobileColumn === column.status ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                {column.label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Cột {mobileKanban?.column ?? mobileColumn}</h3>
                <p className="text-xs text-slate-500">Mobile view tối ưu cho thao tác ngón tay</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{mobileKanban?.total ?? 0}</span>
            </div>

            <div className="space-y-3">
              {(mobileKanban?.tasks ?? []).map((task) => (
                <article
                  key={task.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate font-semibold text-slate-900">{task.title}</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        {task.priority} • {task.is_overdue ? 'Quá hạn' : 'Đúng hạn'}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">{task.progress_pct}%</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{ width: `${Math.max(0, Math.min(100, task.progress_pct))}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      Deadline: {task.deadline ? new Date(task.deadline).toLocaleDateString('vi-VN') : 'Chưa có'}
                    </p>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        void handleQuickComplete(task.id)
                      }}
                      disabled={quickActionTaskId === task.id}
                      className="rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                    >
                      {quickActionTaskId === task.id ? 'Đang xử lý...' : 'Hoàn thành'}
                    </button>
                  </div>
                </article>
              ))}

              {(mobileKanban?.tasks ?? []).length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  Không có task nào trong cột này.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && mode === 'kanban' && !isMobileViewport && kanban && (
        <KanbanBoard
          data={kanban}
          onOpen={(id: string) => setSelectedTaskId(id)}
          onMove={(taskId, status) => handleMoveTask(taskId, status)}
          movingTaskId={movingTaskId}
        />
      )}
      {!loading && mode === 'list' && (
        <TaskList tasks={tasks} onOpen={(id: string) => setSelectedTaskId(id)} />
      )}

      {selectedTaskId && (
        <TaskDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
      )}
    </div>
  )
}

export default TasksPage
