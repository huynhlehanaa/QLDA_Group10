import type { TaskListItem } from './task'

export interface StaffKpiCurrentMonth {
  total_score: number
  target_score: number
  grade: string
}

export interface StaffDashboardResponse {
  tasks_today: TaskListItem[]
  tasks_done_this_month: number
  tasks_done_last_month: number
  tasks_done_change: number
  change_direction: 'up' | 'down' | 'same'
  kpi_current_month: StaffKpiCurrentMonth
}

export interface CalendarTaskDayItem {
  day: number
  date: string
  tasks: TaskListItem[]
  task_count: number
}

export interface CalendarMonthResponse {
  year: number
  month: number
  days: CalendarTaskDayItem[]
}

export interface CalendarWeekDayItem {
  date: string
  weekday: string
  tasks: TaskListItem[]
}

export interface CalendarWeekResponse {
  week_start: string
  days: CalendarWeekDayItem[]
}

export interface CalendarDayResponse {
  date: string
  tasks: TaskListItem[]
}