import { useMemo, useState } from 'react'
import type { KanbanBoard as KanbanBoardData, TaskListItem, TaskStatus } from '../../types/task'

type Props = {
  data: KanbanBoardData
  onOpen?: (id: string) => void
  onMove?: (taskId: string, status: TaskStatus) => Promise<void> | void
  movingTaskId?: string | null
}

const COLUMN_META: Array<{ status: TaskStatus; title: string; accent: string }> = [
  { status: 'todo', title: 'Todo', accent: 'border-slate-200 bg-slate-50' },
  { status: 'in_progress', title: 'In Progress', accent: 'border-sky-200 bg-sky-50/60' },
  { status: 'done', title: 'Done', accent: 'border-emerald-200 bg-emerald-50/60' },
]

export default function KanbanBoard({ data, onOpen, onMove, movingTaskId }: Props) {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dropStatus, setDropStatus] = useState<TaskStatus | null>(null)

  const cols = useMemo(() => ([
    { ...data.todo, meta: COLUMN_META[0] },
    { ...data.in_progress, meta: COLUMN_META[1] },
    { ...data.done, meta: COLUMN_META[2] },
  ]), [data])

  const handleDragStart = (event: React.DragEvent<HTMLElement>, taskId: string) => {
    event.dataTransfer.setData('text/task-id', taskId)
    event.dataTransfer.effectAllowed = 'move'
    setDraggingTaskId(taskId)
  }

  const handleDragEnd = () => {
    setDraggingTaskId(null)
    setDropStatus(null)
  }

  const handleDrop = async (event: React.DragEvent<HTMLElement>, status: TaskStatus) => {
    event.preventDefault()
    const taskId = event.dataTransfer.getData('text/task-id') || draggingTaskId
    setDropStatus(null)
    setDraggingTaskId(null)
    if (!taskId || !onMove) return
    await onMove(taskId, status)
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cols.map((col) => (
        <div
          key={col.status}
          onDragOver={(event) => {
            event.preventDefault()
            setDropStatus(col.status)
          }}
          onDragLeave={() => {
            setDropStatus((current) => (current === col.status ? null : current))
          }}
          onDrop={(event) => void handleDrop(event, col.status)}
          className={`rounded-2xl border p-3 transition-all duration-200 ${col.meta.accent} ${dropStatus === col.status ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-900">{col.meta.title}</h4>
              <p className="text-xs text-slate-500">Kéo task vào đây để đổi trạng thái</p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-slate-600 shadow-sm">{col.count}</span>
          </div>
          <ul className="space-y-2">
            {col.tasks.map((t: TaskListItem) => (
              <li
                key={t.id}
                draggable={!movingTaskId || movingTaskId === t.id}
                onDragStart={(event) => handleDragStart(event, t.id)}
                onDragEnd={handleDragEnd}
                onClick={() => onOpen?.(t.id)}
                className={`cursor-grab rounded-xl border bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing ${draggingTaskId === t.id ? 'opacity-60' : ''} ${movingTaskId === t.id ? 'pointer-events-none opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{t.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{t.priority} • {t.status}</div>
                  </div>
                  <div className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{t.progress_pct}%</div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-sky-500 transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, t.progress_pct))}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
