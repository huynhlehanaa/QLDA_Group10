'use client';

import { useCallback, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskAssignee {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
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
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  assignee_ids: string[];
  deadline?: string;
  priority: TaskPriority;
}

type TaskFilters = {
  search?: string;
  status?: string;
  priority?: string;
  assignee_id?: string;
};

function toQuery(params: TaskFilters = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

export function useTasks() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async (filters: TaskFilters = {}) => {
    setLoading(true);
    try {
      return await apiRequest<TaskListItem[]>(`/api/v1/tasks${toQuery(filters)}`, { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchKanban = useCallback(async (filters: TaskFilters = {}) => {
    setLoading(true);
    try {
      return await apiRequest<KanbanResponse>(`/api/v1/tasks/kanban${toQuery(filters)}`, { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest<TaskStats>('/api/v1/tasks/stats', { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const createTask = useCallback(async (payload: CreateTaskPayload) => {
    setLoading(true);
    try {
      return await apiRequest<{ id: string; title: string; status: TaskStatus; warning?: string }>('/api/v1/tasks', {
        method: 'POST',
        token: accessToken,
        body: payload
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const updateTaskStatus = useCallback(async (taskId: string, status: TaskStatus, progressPct?: number) => {
    setLoading(true);
    try {
      return await apiRequest(`/api/v1/tasks/${taskId}/status`, {
        method: 'PATCH',
        token: accessToken,
        body: { status, progress_pct: progressPct }
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  return { loading, fetchTasks, fetchKanban, fetchStats, createTask, updateTaskStatus };
}
