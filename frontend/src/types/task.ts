// Task-related types aligned with backend API contract

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface TaskUser {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  user?: TaskUser;
  full_name?: string;
  avatar_url?: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  parent_id?: string | null;
  replies?: TaskComment[];
}

export interface TaskChecklist {
  id: string;
  task_id: string;
  title: string;
  is_done: boolean;
  created_at: string;
}

export interface TaskListItem {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress_pct: number;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  assignees?: TaskUser[];
}

export interface TaskResponse {
  id: string;
  dept_id: string;
  created_by: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  progress_pct: number;
  deadline: string | null;
  epic_id?: string | null;
  created_at: string;
  updated_at: string;
  assignees?: TaskUser[];
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  checklists?: TaskChecklist[];
}

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  search?: string;
  deadlineStart?: string;
  deadlineEnd?: string;
}

export interface TaskCreateRequest {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string;
}

export interface TaskUpdateRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  progress_pct?: number;
  deadline?: string;
}
