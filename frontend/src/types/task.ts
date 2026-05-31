// Task types — mirrors backend schemas/task.py

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high'
export type SortBy = 'deadline' | 'priority' | 'created_at'
export type SortDir = 'asc' | 'desc'

export interface AssigneeInfo {
  user_id: string
  full_name: string
  avatar_url?: string | null
}

export interface ChecklistItem {
  id: string
  content: string
  is_done: boolean
  position: number
}

export interface CommentItem {
  id: string
  task_id: string
  user_id: string
  full_name: string
  avatar_url?: string | null
  parent_id?: string | null
  content: string
  created_at: string
  replies: CommentItem[]
}

export interface AttachmentItem {
  id: string
  file_url: string
  file_name?: string | null
  file_size?: number | null
  uploaded_by: string
  created_at: string
}

export interface ExtensionRequest {
  id: string
  task_id: string
  proposed_deadline: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  review_note?: string | null
  created_at: string
}

/** Used in list view and kanban columns */
export interface TaskListItem {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  progress_pct: number
  deadline?: string | null
  is_overdue: boolean
  assignees: AssigneeInfo[]
  checklist_total: number
  checklist_done: number
  epic_id?: string | null
  created_at: string
}

/** Full task detail (drawer) */
export interface TaskDetail extends TaskListItem {
  dept_id: string
  created_by: string
  description?: string | null
  is_recurring: boolean
  recur_pattern?: string | null
  completed_at?: string | null
  cancelled_at?: string | null
  cancel_reason?: string | null
  last_updated_at?: string | null
  blocked_by_id?: string | null
  checklists: ChecklistItem[]
  checklist_done: number
  checklist_total: number
  comments: CommentItem[]
  attachments?: AttachmentItem[]
}

export interface KanbanColumn {
  status: TaskStatus
  count: number
  tasks: TaskListItem[]
}

export interface KanbanBoard {
  todo: KanbanColumn
  in_progress: KanbanColumn
  done: KanbanColumn
}

export interface TaskFilterParams {
  search?: string
  status?: TaskStatus | ''
  priority?: TaskPriority | ''
  overdue_only?: boolean
  sort_by?: SortBy
  sort_dir?: SortDir
}

export interface TaskStats {
  total: number
  done_on_time: number
  done_late: number
  in_progress: number
  overdue: number
  cancelled: number
}

export interface MyTasksResponse {
  user_id: string
  full_name: string
  avatar_url?: string | null
  stats: TaskStats
  tasks: TaskListItem[]
}
