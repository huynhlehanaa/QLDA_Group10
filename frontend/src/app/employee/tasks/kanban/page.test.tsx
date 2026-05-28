import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import KanbanPage from './page';

const useTasksMock = vi.fn();

vi.mock('../../../../hooks/useTasks', () => ({
  useTasks: () => useTasksMock(),
}));

describe('Kanban Board Page', () => {
  beforeEach(() => {
    useTasksMock.mockReset();
  });

  // User Journey: As an employee, I want a kanban board
  describe('rendering kanban columns', () => {
    it('renders Todo, In Progress, and Done columns with counts', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'To Do Task',
          status: 'todo' as const,
          priority: 'high' as const,
          progress_pct: 0,
          deadline: null,
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
        {
          id: 'task-2',
          title: 'In Progress Task',
          status: 'in_progress' as const,
          priority: 'medium' as const,
          progress_pct: 50,
          deadline: null,
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
        {
          id: 'task-3',
          title: 'Done Task',
          status: 'done' as const,
          priority: 'low' as const,
          progress_pct: 100,
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
        selectTask: vi.fn(),
        deselectTask: vi.fn(),
        filters: {},
        setFilters: vi.fn(),
        resetFilters: vi.fn(),
        updateTaskStatus: vi.fn(),
      });

      render(<KanbanPage />);

      expect(within(screen.getByTestId('column-todo')).getByRole('heading', { name: /^to do$/i })).toBeInTheDocument();
      expect(within(screen.getByTestId('column-in_progress')).getByRole('heading', { name: /^in progress$/i })).toBeInTheDocument();
      expect(within(screen.getByTestId('column-done')).getByRole('heading', { name: /^done$/i })).toBeInTheDocument();

      // Check column counts
      expect(screen.getByTestId('column-todo').querySelector('.column-count')).toHaveTextContent('1');
      expect(screen.getByTestId('column-in_progress').querySelector('.column-count')).toHaveTextContent('1');
      expect(screen.getByTestId('column-done').querySelector('.column-count')).toHaveTextContent('1');
    });

    it('displays cards in the correct column based on task status', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'To Do Task',
          status: 'todo' as const,
          priority: 'high' as const,
          progress_pct: 0,
          deadline: '2026-05-15',
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
        {
          id: 'task-2',
          title: 'In Progress Task',
          status: 'in_progress' as const,
          priority: 'medium' as const,
          progress_pct: 50,
          deadline: '2026-05-16',
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

      render(<KanbanPage />);

      // Find the column sections
      const todoColumn = screen.getByText('To Do Task').closest('[data-column="todo"]');
      const inProgressColumn = screen.getByText('In Progress Task').closest('[data-column="in_progress"]');

      expect(todoColumn).toBeInTheDocument();
      expect(inProgressColumn).toBeInTheDocument();
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

      render(<KanbanPage />);

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

      render(<KanbanPage />);

      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });

  // Drag and drop
  describe('drag and drop interactions', () => {
    it('updates UI when a task is dragged between columns', async () => {
      const updateTaskStatusMock = vi.fn();
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Drag me',
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
        selectTask: vi.fn(),
        deselectTask: vi.fn(),
        filters: {},
        setFilters: vi.fn(),
        resetFilters: vi.fn(),
        updateTaskStatus: updateTaskStatusMock,
      });

      render(<KanbanPage />);

      const card = screen.getByText('Drag me');
      const inProgressColumn = screen.getByTestId('column-in_progress');
      const dataTransfer = {
        effectAllowed: 'move',
        dropEffect: 'move',
        setData: vi.fn(),
        getData: vi.fn(),
      } as unknown as DataTransfer;

      // Simulate drag and drop
      fireEvent.dragStart(card, { dataTransfer });
      fireEvent.dragOver(inProgressColumn, { dataTransfer });
      fireEvent.drop(inProgressColumn, { dataTransfer });

      // Verify the update was called
      expect(updateTaskStatusMock).toHaveBeenCalledWith('task-1', 'in_progress');
    });

    it('rejects invalid transitions and shows visible error', async () => {
      const updateTaskStatusMock = vi.fn().mockRejectedValueOnce(new Error('Invalid transition'));

      const mockTasks = [
        {
          id: 'task-1',
          title: 'Invalid move',
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
        selectTask: vi.fn(),
        deselectTask: vi.fn(),
        filters: {},
        setFilters: vi.fn(),
        resetFilters: vi.fn(),
        updateTaskStatus: updateTaskStatusMock,
      });

      render(<KanbanPage />);

      const card = screen.getByText('Invalid move');
      const inProgressColumn = screen.getByTestId('column-in_progress');
      const dataTransfer = {
        effectAllowed: 'move',
        dropEffect: 'move',
        setData: vi.fn(),
        getData: vi.fn(),
      } as unknown as DataTransfer;

      // Try to drag
      fireEvent.dragStart(card, { dataTransfer });
      fireEvent.dragOver(inProgressColumn, { dataTransfer });
      fireEvent.drop(inProgressColumn, { dataTransfer });

      // Error should be visible
      await waitFor(() => {
        expect(screen.getByText(/invalid transition|error/i)).toBeInTheDocument();
      });
    });

    it('remains functional when drag and drop unavailable', async () => {
      const selectTaskMock = vi.fn();
      const updateTaskStatusMock = vi.fn();
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Click to move',
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
        updateTaskStatus: updateTaskStatusMock,
      });

      render(<KanbanPage />);

      // Use fallback action when drag unavailable
      const moveButton = screen.getByTitle(/move to in_progress/i);
      await userEvent.click(moveButton);

      expect(updateTaskStatusMock).toHaveBeenCalledWith('task-1', 'in_progress');
    });
  });

  // Task card interaction
  describe('task card interaction', () => {
    it('opens task drawer when a card is clicked', async () => {
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

      render(<KanbanPage />);

      const card = screen.getByText('Click me');
      await userEvent.click(card);

      expect(selectTaskMock).toHaveBeenCalledWith('task-1');
    });
  });

  // Real-time updates
  describe('realtime column updates', () => {
    it('updates card count per column when status changes', async () => {
      let currentTasks = [
        {
          id: 'task-1',
          title: 'Moving task',
          status: 'todo' as const,
          priority: 'high' as const,
          progress_pct: 0,
          deadline: null,
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
      ];

      useTasksMock.mockImplementation(() => ({
        tasks: currentTasks,
        loading: false,
        error: null,
        selectedTaskId: null,
        selectTask: vi.fn(),
        deselectTask: vi.fn(),
        filters: {},
        setFilters: vi.fn(),
        resetFilters: vi.fn(),
        updateTaskStatus: vi.fn(),
      }));

      const { rerender } = render(<KanbanPage />);

      expect(screen.getByTestId('column-todo').querySelector('.column-count')).toHaveTextContent('1');

      // Simulate status change
      currentTasks = [
        {
          ...currentTasks[0],
          status: 'in_progress' as const,
        },
      ];

      rerender(<KanbanPage />);

      await waitFor(() => {
        expect(screen.getByTestId('column-in_progress').querySelector('.column-count')).toHaveTextContent('1');
      });
    });
  });
});
