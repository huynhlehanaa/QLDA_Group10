import type { TaskStatus } from './task'

export interface PwaBadgeCountResponse {
  badge_count: number
}

export interface PwaInstallGuideStep {
  step: number
  title: string
  description: string
  icon: string
}

export interface PwaInstallGuideResponse {
  platform: 'android' | 'ios'
  title: string
  steps: PwaInstallGuideStep[]
  note: string
}

export interface PwaOfflineTaskItem {
  id: string
  title: string
  status: TaskStatus
  priority: 'low' | 'medium' | 'high'
  progress_pct: number
  deadline?: string | null
  is_overdue: boolean
}

export interface PwaOfflineDataResponse {
  user: {
    id: string
    full_name: string
    role: string
    avatar_url?: string | null
    email: string
  }
  tasks: PwaOfflineTaskItem[]
  cached_at: string
}

export interface PwaSyncTaskChange {
  id: string
  title?: string
  status: TaskStatus
}

export interface PwaSyncNotificationChange {
  id: string
  type: string
  title: string
  body: string
  is_read: boolean
  created_at: string
}

export interface PwaSyncResponse {
  synced_at: string
  changes: {
    new_tasks: PwaSyncTaskChange[]
    updated_tasks: PwaSyncTaskChange[]
    updated_notifications: PwaSyncNotificationChange[]
  }
}

export interface PwaMobileKanbanTaskItem {
  id: string
  title: string
  priority: 'low' | 'medium' | 'high'
  progress_pct: number
  deadline?: string | null
  is_overdue: boolean
}

export interface PwaMobileKanbanResponse {
  column: 'todo' | 'in_progress' | 'done'
  tasks: PwaMobileKanbanTaskItem[]
  total: number
}

export interface PwaMobileTaskDetailResponse {
  id: string
  title: string
  description?: string | null
  status: TaskStatus
  priority: 'low' | 'medium' | 'high'
  progress_pct: number
  deadline?: string | null
  is_overdue: boolean
  days_until_deadline?: number | null
  assignees: Array<{
    user_id: string
    full_name: string
    avatar_url?: string | null
  }>
  checklist_total: number
  checklist_done: number
  created_at: string
}

export interface PwaQuickActionResponse {
  id: string
  status: TaskStatus
}

export interface PwaNotificationSettingsResponse {
  push_enabled: boolean
  types: Record<string, boolean>
}