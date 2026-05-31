import type { TaskListItem } from '../../types/task'

export default function TaskList({ tasks, onOpen }: { tasks: TaskListItem[]; onOpen?: (id: string) => void }) {
  if (!tasks || tasks.length === 0) {
    return <p className="text-sm text-slate-600">Không có công việc nào.</p>
  }

  return (
    <ul className="space-y-2">
      {tasks.map((t) => (
        <li key={t.id} className="rounded-lg border p-3 hover:shadow cursor-pointer" onClick={() => onOpen?.(t.id)}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium">{t.title}</h3>
              <p className="text-xs text-slate-500">{t.priority} • {t.status}</p>
            </div>
            <div className="text-sm text-slate-600">{t.progress_pct}%</div>
          </div>
        </li>
      ))}
    </ul>
  )
}
