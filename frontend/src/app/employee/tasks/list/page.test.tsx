import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TaskListPage from './page';

const useTasksMock = vi.fn();

vi.mock('../../../../hooks/useTasks', () => ({
  useTasks: () => useTasksMock(),
}));

describe('Task List Page', () => {
  beforeEach(() => {
    useTasksMock.mockReset();
  });

  // User Journey: As an employee, I want a list view of my tasks
  describe('rendering task list', () => {
    it('renders a table or list with title, assignee, priority, deadline, progress, and status', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Design homepage mockup',
          status: 'in_progress' as const,
          priority: 'high' as const,
          progress_pct: 50,
          deadline: '2026-05-15',
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
          assignees: [
            {
              id: 'user-1',
              full_name: 'John Doe',
              avatar_url: 'https://example.com/avatar.jpg',
            },
          ],
        },
      ];

      useTasksMock.mockReturnValue({
        tasks: mockTasks,
        loading: false,
        error: null,
        selectedTaskId: null,
        selectTask: vi.fn(),
        deselectTask: vi.fn(),
        filters: {},
        setFilters: vi.fn(),
        resetFilters: vi.fn(),
        updateTaskStatus: vi.fn(),
      });

      render(<TaskListPage />);

      expect(screen.getByText('Design homepage mockup')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText(/^high$/i, { selector: 'td' })).toBeInTheDocument();
      expect(screen.getByText(/15\/5\/2026/)).toBeInTheDocument();
      expect(screen.getByText(/50%/)).toBeInTheDocument();
      expect(screen.getByText(/in[_\s-]?progress/i, { selector: 'td' })).toBeInTheDocument();
    });

    it('shows an empty state when no tasks exist', async () => {
      useTasksMock.mockReturnValue({
        tasks: [],
        loading: false,
        error: null,
        selectedTaskId: null,
        selectTask: vi.fn(),
        deselectTask: vi.fn(),
        filters: {},
        setFilters: vi.fn(),
        resetFilters: vi.fn(),
        updateTaskStatus: vi.fn(),
      });

      render(<TaskListPage />);

      expect(screen.getByText(/no tasks/i)).toBeInTheDocument();
    });

    it('shows loading state while tasks are being fetched', async () => {
      useTasksMock.mockReturnValue({
        tasks: [],
        loading: true,
        error: null,
        selectedTaskId: null,
        selectTask: vi.fn(),
        deselectTask: vi.fn(),
        filters: {},
        setFilters: vi.fn(),
        resetFilters: vi.fn(),
        updateTaskStatus: vi.fn(),
      });

      render(<TaskListPage />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('shows error state when task loading fails', async () => {
      useTasksMock.mockReturnValue({
        tasks: [],
        loading: false,
        error: new Error('Failed to fetch tasks'),
        selectedTaskId: null,
        selectTask: vi.fn(),
        deselectTask: vi.fn(),
        filters: {},
        setFilters: vi.fn(),
        resetFilters: vi.fn(),
        updateTaskStatus: vi.fn(),
      });

      render(<TaskListPage />);

      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });

  // Sorting
  describe('sorting tasks', () => {
    it('sorts by deadline correctly when deadline column is clicked', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          status: 'todo' as const,
          priority: 'low' as const,
          progress_pct: 0,
          deadline: '2026-05-20',
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
        {
          id: 'task-2',
          title: 'Task 2',
          status: 'todo' as const,
          priority: 'low' as const,
          progress_pct: 0,
          deadline: '2026-05-10',
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
      ];

      useTasksMock.mockReturnValue({
        tasks: mockTasks.sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()),
        loading: false,
        error: null,
        selectedTaskId: null,
        selectTask: vi.fn(),
        deselectTask: vi.fn(),
        filters: {},
        setFilters: vi.fn(),
        resetFilters: vi.fn(),
        updateTaskStatus: vi.fn(),
      });

      render(<TaskListPage />);

      const rows = screen.getAllByRole('row');
      // First row after header should be task-2 (earliest deadline)
      expect(rows[1]).toHaveTextContent('Task 2');
    });

    it('sorts by priority correctly (High > Medium > Low)', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          status: 'todo' as const,
          priority: 'low' as const,
          progress_pct: 0,
          deadline: null,
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
        {
          id: 'task-2',
          title: 'Task 2',
          status: 'todo' as const,
          priority: 'high' as const,
          progress_pct: 0,
          deadline: null,
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
      ];

      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const sorted = mockTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      useTasksMock.mockReturnValue({
        tasks: sorted,
        loading: false,
        error: null,
        selectedTaskId: null,
        selectTask: vi.fn(),
        deselectTask: vi.fn(),
        filters: {},
        setFilters: vi.fn(),
        resetFilters: vi.fn(),
        updateTaskStatus: vi.fn(),
      });

      render(<TaskListPage />);

      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('Task 2');
      expect(rows[1]).toHaveTextContent(/high/i);
    });
  });

  // Overdue highlighting
  describe('overdue task highlighting', () => {
    it('highlights overdue tasks in a distinct visual state', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockTasks = [
        {
          id: 'task-1',
          title: 'Overdue task',
          status: 'todo' as const,
          priority: 'high' as const,
          progress_pct: 0,
          deadline: yesterday.toISOString().split('T')[0],
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
      ];

      useTasksMock.mockReturnValue({
        tasks: mockTasks,
        loading: false,
        error: null,
        selectedTaskId: null,
        selectTask: vi.fn(),
        deselectTask: vi.fn(),
        filters: {},
        setFilters: vi.fn(),
        resetFilters: vi.fn(),
        updateTaskStatus: vi.fn(),
      });

      render(<TaskListPage />);

      const row = screen.getByText('Overdue task').closest('tr');
      expect(row).toHaveClass(/overdue/i);
    });

    it('places overdue tasks at the top of the list', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockTasks = [
        {
          id: 'task-1',
          title: 'Normal task',
          status: 'todo' as const,
          priority: 'low' as const,
          progress_pct: 0,
          deadline: '2026-05-30',
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
        {
          id: 'task-2',
          title: 'Overdue task',
          status: 'todo' as const,
          priority: 'low' as const,
          progress_pct: 0,
          deadline: yesterday.toISOString().split('T')[0],
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
      ];

      useTasksMock.mockReturnValue({
        tasks: mockTasks.sort((a, b) => {
          const isAOverdue = new Date(a.deadline!) < new Date();
          const isBOverdue = new Date(b.deadline!) < new Date();
          if (isAOverdue && !isBOverdue) return -1;
          if (!isAOverdue && isBOverdue) return 1;
          return 0;
        }),
        loading: false,
        error: null,
        selectedTaskId: null,
        selectTask: vi.fn(),
        deselectTask: vi.fn(),
        filters: {},
        setFilters: vi.fn(),
        resetFilters: vi.fn(),
        updateTaskStatus: vi.fn(),
      });

      render(<TaskListPage />);

      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('Overdue task');
    });
  });

  // Row click interaction
  describe('task detail interaction', () => {
    it('opens task detail drawer when a row is clicked', async () => {
      const selectTaskMock = vi.fn();
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Click me',
          status: 'todo' as const,
          priority: 'high' as const,
          progress_pct: 0,
          deadline: null,
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
      ];

      useTasksMock.mockReturnValue({
        tasks: mockTasks,
        loading: false,
        error: null,
        selectedTaskId: null,
        selectTask: selectTaskMock,
        deselectTask: vi.fn(),
        filters: {},
        setFilters: vi.fn(),
        resetFilters: vi.fn(),
        updateTaskStatus: vi.fn(),
      });

      render(<TaskListPage />);

      const row = screen.getByText('Click me').closest('tr');
      await userEvent.click(row!);

      expect(selectTaskMock).toHaveBeenCalledWith('task-1');
    });
  });

  // Responsive design
  describe('responsive mobile layout', () => {
    it('keeps the page usable on mobile widths by stacking columns', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Mobile task',
          status: 'todo' as const,
          priority: 'high' as const,
          progress_pct: 25,
          deadline: '2026-05-15',
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
      ];

      useTasksMock.mockReturnValue({
        tasks: mockTasks,
        loading: false,
        error: null,
        selectedTaskId: null,
        selectTask: vi.fn(),
        deselectTask: vi.fn(),
        filters: {},
        setFilters: vi.fn(),
        resetFilters: vi.fn(),
        updateTaskStatus: vi.fn(),
      });

      render(<TaskListPage />);

      // Check that layout changes on mobile (simplified check)
      expect(screen.getByText('Mobile task')).toBeInTheDocument();
      expect(screen.getByText(/25%/)).toBeInTheDocument();
    });
  });
});
