import { useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage, getCalendarDay, getCalendarMonth, getCalendarWeek } from '../lib/api'
import type { CalendarDayResponse, CalendarMonthResponse, CalendarWeekResponse } from '../types/dashboard'

type CalendarMode = 'month' | 'week' | 'day'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function EmployeeCalendarPage() {
  const [mode, setMode] = useState<CalendarMode>('month')
  const [selectedDate, setSelectedDate] = useState(todayIso())
  const [monthData, setMonthData] = useState<CalendarMonthResponse | null>(null)
  const [weekData, setWeekData] = useState<CalendarWeekResponse | null>(null)
  const [dayData, setDayData] = useState<CalendarDayResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const period = useMemo(() => {
    const date = new Date(selectedDate)
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
    }
  }, [selectedDate])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        if (mode === 'month') {
          setMonthData(await getCalendarMonth(period.year, period.month))
        } else if (mode === 'week') {
          setWeekData(await getCalendarWeek(selectedDate))
        } else {
          setDayData(await getCalendarDay(selectedDate))
        }
      } catch (err) {
        setError(getApiErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [mode, period.month, period.year, selectedDate])

  const renderTaskChip = (title: string, progressPct: number, status: string) => (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="font-medium text-ink">{title}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{status}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">Tiến độ {progressPct}%</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-sky-700 via-cyan-600 to-teal-600 p-5 text-white shadow-panel">
        <p className="text-xs uppercase tracking-[0.2em] text-sky-100">Calendar</p>
        <h1 className="mt-2 text-2xl font-semibold">Lịch công việc cá nhân</h1>
        <p className="mt-2 max-w-2xl text-sm text-sky-50">
          Chuyển giữa tháng, tuần và ngày để xem deadline theo cách phù hợp với nhịp làm việc của bạn.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {(['month', 'week', 'day'] as CalendarMode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`rounded-xl px-4 py-2 text-sm font-medium capitalize ${mode === item ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {item === 'month' ? 'Tháng' : item === 'week' ? 'Tuần' : 'Ngày'}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          Mốc thời gian
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded-2xl border border-slate-300 px-3 py-2 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>
      </div>

      {loading && <p className="text-sm text-slate-500">Đang tải lịch...</p>}
      {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      {!loading && mode === 'month' && monthData && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {monthData.days.map((day) => (
            <article key={day.date} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-panel">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{day.date}</p>
                  <h2 className="mt-1 text-xl font-semibold text-ink">Ngày {day.day}</h2>
                </div>
                <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-700">
                  {day.task_count} task
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {day.tasks.length > 0 ? day.tasks.map((task) => renderTaskChip(task.title, task.progress_pct, task.status)) : <p className="text-sm text-slate-500">Không có task.</p>}
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && mode === 'week' && weekData && (
        <div className="space-y-3">
          {weekData.days.map((day) => (
            <article key={day.date} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-panel">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-ink">{day.weekday}</h2>
                <span className="text-sm text-slate-500">{day.date}</span>
              </div>
              <div className="mt-3 space-y-2">
                {day.tasks.length > 0 ? day.tasks.map((task) => renderTaskChip(task.title, task.progress_pct, task.status)) : <p className="text-sm text-slate-500">Không có task trong ngày này.</p>}
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && mode === 'day' && dayData && (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">{dayData.date}</h2>
            <span className="text-sm text-slate-500">{dayData.tasks.length} task</span>
          </div>
          <div className="mt-4 space-y-2">
            {dayData.tasks.length > 0 ? dayData.tasks.map((task) => renderTaskChip(task.title, task.progress_pct, task.status)) : <p className="text-sm text-slate-500">Không có task trong ngày này.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export default EmployeeCalendarPage