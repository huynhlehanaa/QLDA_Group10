'use client';

import { useCallback, useState } from 'react';
import { apiRequest } from '../lib/api';
import { authStore } from '../store/authStore';

export interface TaskListItem { id: string; title: string; status: 'todo' | 'in_progress' | 'done' | 'cancelled'; priority: 'low' | 'medium' | 'high'; progress_pct: number; deadline?: string | null; is_overdue: boolean; assignees: Array<{ user_id: string; full_name: string }>; }
export interface TaskStats { total: number; done_on_time: number; done_late: number; in_progress: number; overdue: number; cancelled: number; }
export interface KanbanColumn { count: number; tasks: TaskListItem[]; }
export interface KanbanResponse { todo: KanbanColumn; in_progress: KanbanColumn; done: KanbanColumn; cancelled: KanbanColumn; }

export function useTasks() {
  const [loading, setLoading] = useState(false);

  // ✅ Trích xuất token đồng bộ từ snapshot của authStore tĩnh
  const getValidToken = (): string => {
    const snapshot = authStore.getSnapshot();
    return snapshot?.accessToken || '';
  };

  const fetchTasks = useCallback(async (params?: { search?: string; status?: string; priority?: string }) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.status) query.set('status', params.status);
      if (params?.priority) query.set('priority', params.priority);
      const suffix = query.toString() ? `?${query.toString()}` : '';
      return await apiRequest<TaskListItem[]>(`/api/v1/tasks${suffix}`, { method: 'GET', token: getValidToken() });
    } finally { setLoading(false); }
  }, []);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest<TaskStats>('/api/v1/tasks/stats', { method: 'GET', token: getValidToken() });
    } finally { setLoading(false); }
  }, []);

  const fetchKanban = useCallback(async (params?: { search?: string; priority?: string }) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.priority) query.set('priority', params.priority);
      const suffix = query.toString() ? `?${query.toString()}` : '';
      return await apiRequest<KanbanResponse>(`/api/v1/tasks/kanban${suffix}`, { method: 'GET', token: getValidToken() });
    } finally { setLoading(false); }
  }, []);

  const createTask = useCallback(async (body: { title: string; description?: string; assignee_ids: string[]; deadline?: string; priority: 'low' | 'medium' | 'high'; }) => {
    setLoading(true);
    try {
      return await apiRequest<{ id: string; warning?: string }>('/api/v1/tasks', { method: 'POST', token: getValidToken(), body });
    } finally { setLoading(false); }
  }, []);

  const updateTaskStatus = useCallback(async (taskId: string, status: string, progress_pct?: number) => {
    setLoading(true);
    try {
      return await apiRequest<any>(`/api/v1/tasks/${taskId}/status`, { method: 'PATCH', token: getValidToken(), body: { status, progress_pct } });
    } finally { setLoading(false); }
  }, []);

  return { loading, fetchTasks, fetchStats, fetchKanban, createTask, updateTaskStatus };
}