import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../lib/api';
import { useTasks } from './useTasks';

vi.mock('../lib/api', () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

describe('useTasks Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches current user tasks from API on mount', async () => {
    const mockTasks = [
      {
        id: 'task-1',
        title: 'Task 1',
        status: 'todo' as const,
        priority: 'high' as const,
        progress_pct: 0,
        deadline: null,
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
      },
    ];

    vi.mocked(apiClient.get).mockResolvedValue({
      data: mockTasks,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tasks).toEqual(mockTasks);
    expect(apiClient.get).toHaveBeenCalledWith('/tasks', expect.any(Object));
  });

  it('applies status filter to request when provided', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.setFilters({ status: 'todo' });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenLastCalledWith(
        '/tasks',
        expect.objectContaining({
          params: expect.objectContaining({
            status: 'todo',
          }),
        })
      );
    });
  });

  it('supports optimistic status change and rolls back on failure', async () => {
    const mockTasks = [
      {
        id: 'task-1',
        title: 'Task 1',
        status: 'todo' as const,
        priority: 'high' as const,
        progress_pct: 0,
        deadline: null,
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
      },
    ];

    vi.mocked(apiClient.get).mockResolvedValue({
      data: mockTasks,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    vi.mocked(apiClient.patch).mockRejectedValueOnce(new Error('Update failed'));

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.tasks.length).toBe(1);
    });

    await expect(result.current.updateTaskStatus('task-1', 'in_progress')).rejects.toThrow('Update failed');

    await waitFor(() => {
      const rolledBackTask = result.current.tasks.find((t) => t.id === 'task-1');
      expect(rolledBackTask?.status).toBe('todo');
    });
  });
});

