import { useEffect, useMemo, useState } from 'react'
import type { AttachmentItem, ChecklistItem, TaskDetail, TaskStatus } from '../../types/task'
import {
  addChecklist,
  addTaskComment,
  getTask,
  requestExtension,
  updateChecklist,
  updateTaskStatus,
  uploadAttachment,
} from '../../lib/api'

const statusByProgress = (progress: number): TaskStatus => {
  if (progress <= 0) return 'todo'
  if (progress >= 100) return 'done'
  return 'in_progress'
}

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Chưa cập nhật'
  return new Date(value).toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export default function TaskDrawer({ taskId, onClose }: { taskId: string; onClose?: () => void }) {
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [newChecklist, setNewChecklist] = useState('')
  const [comment, setComment] = useState('')
  const [progressInput, setProgressInput] = useState('')
  const [extOpen, setExtOpen] = useState(false)
  const [extDate, setExtDate] = useState('')
  const [extReason, setExtReason] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const [isSavingProgress, setIsSavingProgress] = useState(false)
  const [isSendingComment, setIsSendingComment] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!taskId) return
    const load = async () => {
      try {
        const data = await getTask(taskId)
        setTask(data)
        setProgressInput(String(data.progress_pct ?? 0))
      } catch (err) {
        console.error(err)
      }
    }
    void load()
  }, [taskId])

  const assignees = useMemo(() => task?.assignees ?? [], [task?.assignees])
  const comments = useMemo(() => task?.comments ?? [], [task?.comments])
  const checklists = useMemo(() => task?.checklists ?? [], [task?.checklists])
  const attachments = useMemo(() => task?.attachments ?? [], [task?.attachments])
  const progressPct = Math.max(0, Math.min(100, task?.progress_pct ?? 0))
  const progressTone = progressPct === 100 ? 'bg-emerald-500' : progressPct > 0 ? 'bg-sky-500' : 'bg-slate-400'

  async function reloadTask() {
    const data = await getTask(taskId)
    setTask(data)
    setProgressInput(String(data.progress_pct ?? 0))
  }

  async function toggleChecklist(item: ChecklistItem) {
    try {
      await updateChecklist(item.id, { is_done: !item.is_done })
      await reloadTask()
    } catch (err) {
      console.error(err)
    }
  }

  async function handleAddChecklist() {
    if (!newChecklist.trim()) return
    try {
      await addChecklist(taskId, newChecklist.trim())
      setNewChecklist('')
      await reloadTask()
    } catch (err) {
      console.error(err)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      await uploadAttachment(taskId, f)
      e.target.value = ''
      await reloadTask()
    } catch (err) {
      console.error(err)
    }
  }

  async function submitExtension() {
    if (!extDate || !extReason) return
    try {
      await requestExtension(taskId, extDate, extReason)
      setExtOpen(false)
      setExtDate('')
      setExtReason('')
      await reloadTask()
    } catch (err) {
      console.error(err)
    }
  }

  async function submitComment() {
    if (!comment.trim()) return
    try {
      setIsSendingComment(true)
      await addTaskComment(taskId, comment.trim())
      setComment('')
      await reloadTask()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSendingComment(false)
    }
  }

  async function submitProgress() {
    const raw = Number(progressInput)
    if (Number.isNaN(raw)) return
    const progress = Math.max(0, Math.min(100, Math.round(raw)))
    try {
      setIsSavingProgress(true)
      await updateTaskStatus(taskId, statusByProgress(progress), progress)
      await reloadTask()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSavingProgress(false)
    }
  }

  function handleClose() {
    setIsVisible(false)
    window.setTimeout(() => onClose?.(), 220)
  }

  return (
    <div className={`fixed inset-0 z-50 transition-all duration-300 ${isVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <button
        type="button"
        aria-label="Đóng drawer"
        onClick={handleClose}
        className={`absolute inset-0 bg-slate-950/35 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      />

      <aside
        className={`absolute inset-0 ml-auto h-full w-full overflow-hidden border-l border-white/60 bg-white/95 shadow-2xl shadow-slate-900/20 transition-transform duration-300 ease-out sm:inset-y-4 sm:right-4 sm:h-[calc(100vh-2rem)] sm:w-[min(42rem,calc(100vw-2rem))] sm:rounded-3xl ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_30%),linear-gradient(to_bottom,rgba(255,255,255,0.98),rgba(248,250,252,0.98))]">
          <div className="border-b border-slate-200/80 px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">Task detail</p>
                <h3 className="mt-1 truncate text-xl font-semibold text-slate-900">{task?.title ?? 'Đang tải task...'}</h3>
                <p className="mt-1 text-sm text-slate-600">{task?.description || 'Task chưa có mô tả chi tiết.'}</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900"
              >
                Đóng
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{task?.status}</span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{task?.priority}</span>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">{task?.progress_pct ?? 0}%</span>
              {task?.is_overdue ? <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">Quá hạn</span> : null}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-900/5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Progress trực quan</p>
                <span className="text-sm font-semibold text-slate-900">{progressPct}%</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${progressTone}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">0 = todo, 1-99 = in progress, 100 = done.</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm shadow-slate-900/5 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Nhân viên được giao</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {assignees.length > 0 ? assignees.map((assignee) => (
                    <span key={assignee.user_id} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                      <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                      {assignee.full_name}
                    </span>
                  )) : <p className="text-sm text-slate-500">Chưa có nhân viên được giao.</p>}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Thông tin khác</p>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <p><span className="font-medium text-slate-900">Deadline:</span> {formatDateTime(task?.deadline)}</p>
                  <p><span className="font-medium text-slate-900">Cập nhật:</span> {formatDateTime(task?.last_updated_at)}</p>
                  <p><span className="font-medium text-slate-900">Hoàn thành checklist:</span> {task?.checklist_done ?? 0}/{task?.checklist_total ?? 0}</p>
                </div>
              </div>
            </section>

            <section className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm shadow-slate-900/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tiến độ</p>
                  <h4 className="mt-1 font-semibold text-slate-900">Cập nhật progress task</h4>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${progressPct === 100 ? 'bg-emerald-50 text-emerald-700' : progressPct > 0 ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-700'}`}>
                  {progressPct}%
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="min-w-40 flex-1">
                  <label htmlFor="task-progress" className="text-sm font-medium text-slate-700">Nhập từ 0 đến 100</label>
                  <input
                    id="task-progress"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    inputMode="numeric"
                    value={progressInput}
                    onChange={(e) => {
                      const next = e.target.value
                      if (next === '') {
                        setProgressInput('')
                        return
                      }
                      const numeric = Number(next)
                      if (Number.isNaN(numeric)) return
                      const clamped = Math.max(0, Math.min(100, Math.trunc(numeric)))
                      setProgressInput(String(clamped))
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                  />
                </div>
                <button
                  type="button"
                  onClick={submitProgress}
                  disabled={isSavingProgress || progressInput === ''}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingProgress ? 'Đang lưu...' : 'Cập nhật'}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">0 = todo, 1-99 = in progress, 100 = done.</p>
            </section>

            <section className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm shadow-slate-900/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Checklist</p>
                  <h4 className="mt-1 font-semibold text-slate-900">Danh sách việc con</h4>
                </div>
                <span className="text-sm text-slate-500">{task?.checklist_done ?? 0}/{task?.checklist_total ?? 0}</span>
              </div>
              <ul className="mt-3 space-y-2">
                {checklists.length > 0 ? checklists.map((c) => (
                  <li key={c.id} className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2">
                    <input type="checkbox" checked={c.is_done} onChange={() => toggleChecklist(c)} className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                    <span className={c.is_done ? 'text-slate-400 line-through' : 'text-slate-700'}>{c.content}</span>
                  </li>
                )) : <li className="text-sm text-slate-500">Chưa có checklist.</li>}
              </ul>
              <div className="mt-3 flex gap-2">
                <input
                  value={newChecklist}
                  onChange={(e) => setNewChecklist(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                  placeholder="Thêm checklist mới"
                />
                <button onClick={handleAddChecklist} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-sky-500">Thêm</button>
              </div>
            </section>

            <section className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm shadow-slate-900/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Comments</p>
                  <h4 className="mt-1 font-semibold text-slate-900">Trao đổi trên task</h4>
                </div>
                <span className="text-sm text-slate-500">{comments.length} bình luận</span>
              </div>

              <div className="mt-3 space-y-3">
                {comments.length > 0 ? comments.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.full_name}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
                      </div>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.content}</p>

                    {item.replies?.length > 0 ? (
                      <div className="mt-3 space-y-2 border-l-2 border-slate-200 pl-3">
                        {item.replies.map((reply) => (
                          <div key={reply.id} className="rounded-xl bg-white p-3 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-800">{reply.full_name}</p>
                              <p className="text-xs text-slate-500">{formatDateTime(reply.created_at)}</p>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )) : <p className="text-sm text-slate-500">Chưa có comment nào.</p>}
              </div>

              <div className="mt-3 space-y-2">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                  placeholder="Viết comment mới..."
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={submitComment}
                    disabled={isSendingComment || !comment.trim()}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSendingComment ? 'Đang gửi...' : 'Thêm comment'}
                  </button>
                </div>
              </div>
            </section>

            <section className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm shadow-slate-900/5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">File đính kèm</p>
                <h4 className="mt-1 font-semibold text-slate-900">Tài liệu liên quan</h4>
              </div>
              <ul className="mt-3 space-y-2">
                {attachments.length > 0 ? attachments.map((a: AttachmentItem) => (
                  <li key={a.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <a href={a.file_url} target="_blank" rel="noreferrer" className="font-medium text-sky-700 hover:underline">{a.file_name || 'Tệp đính kèm'}</a>
                    <p className="text-xs text-slate-500">{formatDateTime(a.created_at)}</p>
                  </li>
                )) : <li className="text-sm text-slate-500">Chưa có file đính kèm.</li>}
              </ul>
              <div className="mt-3">
                <input type="file" onChange={handleUpload} className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800" />
              </div>
            </section>

            <section className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm shadow-slate-900/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Gia hạn deadline</p>
                  <h4 className="mt-1 font-semibold text-slate-900">Yêu cầu thêm thời gian</h4>
                </div>
                <button onClick={() => setExtOpen((current) => !current)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700">{extOpen ? 'Ẩn form' : 'Mở form'}</button>
              </div>

              {extOpen && (
                <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                  <label className="text-sm font-medium text-slate-700">Ngày đề xuất</label>
                  <input
                    type="date"
                    value={extDate}
                    onChange={(e) => setExtDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                  />
                  <label className="mt-3 block text-sm font-medium text-slate-700">Lý do</label>
                  <textarea
                    value={extReason}
                    onChange={(e) => setExtReason(e.target.value)}
                    className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                    placeholder="Giải thích lý do cần gia hạn..."
                  />
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button onClick={() => setExtOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white">Hủy</button>
                    <button onClick={submitExtension} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800">Gửi yêu cầu</button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </aside>
    </div>
  )
}
