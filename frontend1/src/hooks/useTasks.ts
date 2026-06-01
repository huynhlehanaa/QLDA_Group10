'use client';

import { useCallback, useMemo } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { toQuery, useApiLoading } from '@/hooks/apiUtils';

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskAssignee {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface TaskChecklist {
  id: string;
  content: string;
  is_done: boolean;
  position: number;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  parent_id?: string | null;
  content: string;
  created_at: string;
  replies: TaskComment[];
}

export interface TaskAttachment {
  id: string;
  file_url: string;
  file_name?: string | null;
  file_size?: number | null;
  uploaded_by: string;
  created_at: string;
}

export interface TaskHistory {
  id: string;
  changed_by: string;
  changer_name: string;
  field: string;
  old_value?: string | null;
  new_value?: string | null;
  note?: string | null;
  created_at: string;
}

export interface TaskListItem {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress_pct: number;
  deadline?: string | null;
  is_overdue: boolean;
  assignees: TaskAssignee[];
  checklist_total: number;
  checklist_done: number;
  epic_id?: string | null;
  created_at: string;
}

export interface TaskDetail extends TaskListItem {
  description?: string | null;
  blocked_by_id?: string | null;
  is_recurring: boolean;
  recur_pattern?: string | null;
  recur_day?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  checklists: TaskChecklist[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  history: TaskHistory[];
}

export interface TaskStats {
  total: number;
  done_on_time: number;
  done_late: number;
  in_progress: number;
  overdue: number;
  cancelled: number;
}

export interface KanbanColumn {
  status: TaskStatus;
  count: number;
  tasks: TaskListItem[];
}

export interface KanbanResponse {
  todo: KanbanColumn;
  in_progress: KanbanColumn;
  done: KanbanColumn;
  cancelled: KanbanColumn;
}

export interface Epic {
  id: string;
  name: string;
  dept_id: string;
  task_count: number;
  done_count: number;
  progress_pct: number;
  created_at: string;
}

export interface WorkloadItem {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  todo_count: number;
  in_progress_count: number;
  done_count: number;
  overdue_count: number;
  total: number;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  assignee_ids: string[];
  deadline?: string;
  priority: TaskPriority;
  epic_id?: string;
  blocked_by_id?: string;
  is_recurring?: boolean;
  recur_pattern?: 'daily' | 'weekly' | 'monthly';
  recur_day?: string;
}

export interface CreateTaskResponse {
  id: string;
  title: string;
  status: TaskStatus;
  warning?: string;
}

export type TaskFilters = {
  search?: string;
  status?: string;
  priority?: string;
  assignee_id?: string;
  deadline_from?: string;
  deadline_to?: string;
  overdue_only?: boolean;
  sort_by?: string;
  sort_dir?: string;
};

export type UpdateTaskPayload = {
  title?: string;
  description?: string;
  deadline?: string;
  priority?: TaskPriority;
  assignee_ids?: string[];
  deadline_change_reason?: string;
};

export function useTasks() {
  const { accessToken } = useAuthStore();
  const { loading, run } = useApiLoading();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  const fetchTasks = useCallback((filters: TaskFilters = {}) => run(() => (
    apiRequest<TaskListItem[]>(`/api/v1/tasks${toQuery(filters)}`, { token: accessToken })
  )), [accessToken, run]);

  const fetchKanban = useCallback((filters: TaskFilters = {}) => run(() => (
    apiRequest<KanbanResponse>(`/api/v1/tasks/kanban${toQuery(filters)}`, { token: accessToken })
  )), [accessToken, run]);

  const fetchStats = useCallback((fromDate?: string, toDate?: string) => run(() => (
    apiRequest<TaskStats>(`/api/v1/tasks/stats${toQuery({ from_date: fromDate, to_date: toDate })}`, { token: accessToken })
  )), [accessToken, run]);

  const fetchTaskDetail = useCallback((taskId: string) => run(() => (
    apiRequest<TaskDetail>(`/api/v1/tasks/${taskId}`, { token: accessToken })
  )), [accessToken, run]);

  const createTask = useCallback((payload: CreateTaskPayload) => run(() => (
    apiRequest<CreateTaskResponse>('/api/v1/tasks', {
      method: 'POST',
      token: accessToken,
      body: payload
    })
  )), [accessToken, run]);

  const updateTask = useCallback((taskId: string, payload: UpdateTaskPayload) => run(() => (
    apiRequest<TaskDetail>(`/api/v1/tasks/${taskId}`, {
      method: 'PATCH',
      token: accessToken,
      body: payload
    })
  )), [accessToken, run]);

  const updateTaskStatus = useCallback((taskId: string, status: TaskStatus, progressPct?: number) => run(() => (
    apiRequest<TaskDetail>(`/api/v1/tasks/${taskId}/status`, {
      method: 'PATCH',
      token: accessToken,
      body: { status, progress_pct: progressPct }
    })
  )), [accessToken, run]);

  const updateTaskProgress = useCallback((taskId: string, progressPct: number) => run(() => (
    apiRequest<TaskDetail>(`/api/v1/tasks/${taskId}/progress`, {
      method: 'PATCH',
      token: accessToken,
      body: { progress_pct: progressPct }
    })
  )), [accessToken, run]);

  const cancelTask = useCallback((taskId: string, reason: string) => run(() => (
    apiRequest<TaskDetail>(`/api/v1/tasks/${taskId}/cancel`, {
      method: 'POST',
      token: accessToken,
      body: { reason }
    })
  )), [accessToken, run]);

  const stopRecurring = useCallback((taskId: string) => run(() => (
    apiRequest<TaskDetail>(`/api/v1/tasks/${taskId}/stop-recurring`, {
      method: 'PATCH',
      token: accessToken
    })
  )), [accessToken, run]);

  const fetchEpics = useCallback(() => run(() => (
    apiRequest<Epic[]>('/api/v1/tasks/epics', { token: accessToken })
  )), [accessToken, run]);

  const createEpic = useCallback((name: string) => run(() => (
    apiRequest<Epic>('/api/v1/tasks/epics', {
      method: 'POST',
      token: accessToken,
      body: { name }
    })
  )), [accessToken, run]);

  const fetchWorkload = useCallback(() => run(() => (
    apiRequest<WorkloadItem[]>('/api/v1/tasks/workload', { token: accessToken })
  )), [accessToken, run]);

  const addComment = useCallback((taskId: string, content: string, parentId?: string) => run(() => (
    apiRequest<TaskComment>(`/api/v1/tasks/${taskId}/comments`, {
      method: 'POST',
      token: accessToken,
      body: { content, parent_id: parentId }
    })
  )), [accessToken, run]);

  const addChecklist = useCallback((taskId: string, content: string, position = 0) => run(() => (
    apiRequest<TaskChecklist>(`/api/v1/tasks/${taskId}/checklists`, {
      method: 'POST',
      token: accessToken,
      body: { content, position }
    })
  )), [accessToken, run]);

  const updateChecklist = useCallback((itemId: string, payload: { is_done?: boolean; content?: string }) => run(() => (
    apiRequest<TaskChecklist>(`/api/v1/tasks/checklists/${itemId}`, {
      method: 'PATCH',
      token: accessToken,
      body: payload
    })
  )), [accessToken, run]);

  const addAttachment = useCallback((taskId: string, payload: { file_url: string; file_name: string; file_size?: number }) => run(() => (
    apiRequest<TaskAttachment>(`/api/v1/tasks/${taskId}/attachments${toQuery(payload)}`, {
      method: 'POST',
      token: accessToken
    })
  )), [accessToken, run]);

  const exportTasks = useCallback(async (filters: Pick<TaskFilters, 'status' | 'assignee_id'> = {}) => {
    if (!accessToken) throw new Error('Bạn chưa đăng nhập.');
    const response = await fetch(`${apiBaseUrl}/api/v1/tasks/export${toQuery(filters)}`, {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    if (!response.ok) throw new Error('Không xuất được danh sách công việc.');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'danh-sach-cong-viec.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [accessToken, apiBaseUrl]);

  return useMemo(() => ({
    loading,
    fetchTasks,
    fetchKanban,
    fetchStats,
    fetchTaskDetail,
    createTask,
    updateTask,
    updateTaskStatus,
    updateTaskProgress,
    cancelTask,
    stopRecurring,
    fetchEpics,
    createEpic,
    fetchWorkload,
    addComment,
    addChecklist,
    updateChecklist,
    addAttachment,
    exportTasks
  }), [
    loading,
    fetchTasks,
    fetchKanban,
    fetchStats,
    fetchTaskDetail,
    createTask,
    updateTask,
    updateTaskStatus,
    updateTaskProgress,
    cancelTask,
    stopRecurring,
    fetchEpics,
    createEpic,
    fetchWorkload,
    addComment,
    addChecklist,
    updateChecklist,
    addAttachment,
    exportTasks
  ]);
}
