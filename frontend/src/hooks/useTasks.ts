'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiClient } from '../lib/api';
import type { TaskFilters, TaskListItem, TaskStatus } from '../types/task';

interface UseTasksState {
  tasks: TaskListItem[];
  loading: boolean;
  error: Error | null;
  selectedTaskId: string | null;
  filters: TaskFilters;
}

interface UseTasksReturn extends UseTasksState {
  selectTask: (id: string) => void;
  deselectTask: () => void;
  setFilters: (filters: Partial<TaskFilters>) => void;
  resetFilters: () => void;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  refetch: () => Promise<void>;
}

function areTaskFiltersEqual(left: TaskFilters, right: TaskFilters) {
  return (
    left.search === right.search &&
    left.deadlineStart === right.deadlineStart &&
    left.deadlineEnd === right.deadlineEnd &&
    JSON.stringify(left.status ?? null) === JSON.stringify(right.status ?? null) &&
    JSON.stringify(left.priority ?? null) === JSON.stringify(right.priority ?? null)
  );
}

export function useTasks(): UseTasksReturn {
  const [state, setState] = useState<UseTasksState>({
    tasks: [],
    loading: false,
    error: null,
    selectedTaskId: null,
    filters: {},
  });

  // Fetch tasks with given filters
  const fetchTasks = useCallback(async (filtersToUse: TaskFilters = {}) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const params: Record<string, any> = {};
      const filters = filtersToUse;

      if (filters.status) {
        params.status = Array.isArray(filters.status)
          ? filters.status.join(',')
          : filters.status;
      }

      if (filters.priority) {
        params.priority = Array.isArray(filters.priority)
          ? filters.priority.join(',')
          : filters.priority;
      }

      if (filters.search) {
        params.search = filters.search;
      }

      if (filters.deadlineStart) {
        params.deadline_start = filters.deadlineStart;
      }

      if (filters.deadlineEnd) {
        params.deadline_end = filters.deadlineEnd;
      }

      const response = await apiClient.get<TaskListItem[]>('/tasks', { params });

      setState((prev) => ({
        ...prev,
        tasks: response?.data ?? [],
        loading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to fetch tasks'),
        loading: false,
      }));
    }
  }, []);

  // Fetch on mount and when filters change
  useEffect(() => {
    void fetchTasks(state.filters);
  }, [fetchTasks, state.filters]);

  const selectTask = useCallback((id: string) => {
    setState((prev) => ({ ...prev, selectedTaskId: id }));
  }, []);

  const deselectTask = useCallback(() => {
    setState((prev) => ({ ...prev, selectedTaskId: null }));
  }, []);

  const setFilters = useCallback((newFilters: Partial<TaskFilters>) => {
    setState((prev) => {
      const mergedFilters = { ...prev.filters, ...newFilters };
      if (areTaskFiltersEqual(prev.filters, mergedFilters)) {
        return prev;
      }
      return { ...prev, filters: mergedFilters };
    });
  }, []);

  const resetFilters = useCallback(() => {
    setState((prev) => {
      if (Object.keys(prev.filters).length === 0) {
        return prev;
      }
      return { ...prev, filters: {} };
    });
  }, []);

  const updateTaskStatus = useCallback(
    async (id: string, status: TaskStatus) => {
      // Store original state for rollback
      const originalTasks = state.tasks;

      // Optimistic update
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === id
            ? { ...task, status }
            : task
        ),
      }));

      try {
        await apiClient.patch(`/tasks/${id}/status`, { status });
      } catch (error) {
        // Rollback on error
        setState((prev) => ({
          ...prev,
          tasks: originalTasks,
          error: error instanceof Error ? error : new Error('Failed to update task status'),
        }));
        throw error;
      }
    },
    [state.tasks]
  );

  const refetch = useCallback(async () => {
    await fetchTasks(state.filters);
  }, [state.filters, fetchTasks]);

  return {
    ...state,
    selectTask,
    deselectTask,
    setFilters,
    resetFilters,
    updateTaskStatus,
    refetch,
  };
}
