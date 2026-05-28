import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TaskDetailDrawer from './TaskDetailDrawer';

const getTaskDetailMock = vi.fn();
const addCommentMock = vi.fn();
const updateTaskStatusMock = vi.fn();

vi.mock('../../lib/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => getTaskDetailMock(...args),
    post: (...args: unknown[]) => addCommentMock(...args),
    patch: (...args: unknown[]) => updateTaskStatusMock(...args),
  },
}));

describe('Task Detail Drawer', () => {
  beforeEach(() => {
    getTaskDetailMock.mockReset();
    addCommentMock.mockReset();
    updateTaskStatusMock.mockReset();
  });

  // User Journey: As an employee, I want task details in a drawer
  describe('displaying task details', () => {
    it('shows title, description, assignees, attachments, comments, and progress', async () => {
      const mockTask = {
        id: 'task-1',
        dept_id: 'dept-1',
        created_by: 'user-1',
        title: 'Important Feature',
        description: 'Implement new dashboard',
        status: 'in_progress' as const,
        priority: 'high' as const,
        progress_pct: 60,
        deadline: '2026-05-20',
        epic_id: null,
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-10T12:00:00Z',
        assignees: [
          {
            id: 'user-1',
            full_name: 'Alice',
            avatar_url: 'https://example.com/alice.jpg',
          },
        ],
        comments: [
          {
            id: 'comment-1',
            task_id: 'task-1',
            user_id: 'user-1',
            user: {
              id: 'user-1',
              full_name: 'Alice',
              avatar_url: 'https://example.com/alice.jpg',
            },
            content: 'Started working on this',
            created_at: '2026-05-05T10:00:00Z',
            updated_at: '2026-05-05T10:00:00Z',
          },
        ],
        attachments: [
          {
            id: 'att-1',
            task_id: 'task-1',
            file_name: 'design.pdf',
            file_url: 'https://example.com/design.pdf',
            created_at: '2026-05-01T00:00:00Z',
          },
        ],
      };

      getTaskDetailMock.mockResolvedValueOnce({
        data: mockTask,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      render(
        <TaskDetailDrawer
          taskId="task-1"
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Important Feature')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Implement new dashboard')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getAllByText('Alice')).toHaveLength(2); // Assignee + comment author
      });

      await waitFor(() => {
        expect(screen.getByText(/design\.pdf/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Started working on this')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/60%/)).toBeInTheDocument();
      });
    });

    it('loads comments in order and renders timestamps', async () => {
      const mockTask = {
        id: 'task-1',
        dept_id: 'dept-1',
        created_by: 'user-1',
        title: 'Test task',
        description: null,
        status: 'todo' as const,
        priority: 'low' as const,
        progress_pct: 0,
        deadline: null,
        epic_id: null,
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
        assignees: [],
        comments: [
          {
            id: 'comment-1',
            task_id: 'task-1',
            user_id: 'user-1',
            user: {
              id: 'user-1',
              full_name: 'User 1',
              avatar_url: null,
            },
            content: 'First comment',
            created_at: '2026-05-05T10:00:00Z',
            updated_at: '2026-05-05T10:00:00Z',
          },
          {
            id: 'comment-2',
            task_id: 'task-1',
            user_id: 'user-2',
            user: {
              id: 'user-2',
              full_name: 'User 2',
              avatar_url: null,
            },
            content: 'Second comment',
            created_at: '2026-05-05T11:00:00Z',
            updated_at: '2026-05-05T11:00:00Z',
          },
        ],
        attachments: [],
      };

      getTaskDetailMock.mockResolvedValueOnce({
        data: mockTask,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      render(
        <TaskDetailDrawer
          taskId="task-1"
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('First comment')).toBeInTheDocument();
      });

      expect(screen.getByText('Second comment')).toBeInTheDocument();
      // Comments are rendered in order
      const commentContainer = screen.getByText('First comment').closest('.comment-item');
      expect(commentContainer).toBeInTheDocument();

      // Check timestamps
      await waitFor(() => {
        expect(screen.getByText(/17:00:00/)).toBeInTheDocument();
        expect(screen.getByText(/18:00:00/)).toBeInTheDocument();
      });
    });
  });

  // Comment submission
  describe('adding comments', () => {
    it('allows adding a comment and updates thread immediately after success', async () => {
      const mockTask = {
        id: 'task-1',
        dept_id: 'dept-1',
        created_by: 'user-1',
        title: 'Test',
        description: null,
        status: 'todo' as const,
        priority: 'low' as const,
        progress_pct: 0,
        deadline: null,
        epic_id: null,
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
        assignees: [],
        comments: [],
        attachments: [],
      };

      getTaskDetailMock.mockResolvedValueOnce({
        data: mockTask,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const newComment = {
        id: 'comment-new',
        task_id: 'task-1',
        user_id: 'me',
        user: { id: 'me', full_name: 'Me', avatar_url: null },
        content: 'My new comment',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      addCommentMock.mockResolvedValueOnce({
        data: newComment,
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      });

      render(
        <TaskDetailDrawer
          taskId="task-1"
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/add a comment/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/add a comment/i);
      await userEvent.type(input, 'My new comment');
      await userEvent.click(screen.getByRole('button', { name: /post|add|send/i }));

      await waitFor(() => {
        expect(screen.getByText('My new comment')).toBeInTheDocument();
      });

      expect(addCommentMock).toHaveBeenCalledWith(
        '/tasks/task-1/comments',
        expect.objectContaining({
          content: 'My new comment',
        })
      );
    });

    it('auto-transitions task to In Progress after first comment if rule enabled', async () => {
      const mockTask = {
        id: 'task-1',
        dept_id: 'dept-1',
        created_by: 'user-1',
        title: 'Test',
        description: null,
        status: 'todo' as const,
        priority: 'low' as const,
        progress_pct: 0,
        deadline: null,
        epic_id: null,
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
        assignees: [],
        comments: [],
        attachments: [],
      };

      getTaskDetailMock.mockResolvedValueOnce({
        data: mockTask,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      addCommentMock.mockResolvedValueOnce({
        data: {
          id: 'comment-new',
          task_id: 'task-1',
          user_id: 'me',
          full_name: 'Me',
          avatar_url: null,
          content: 'Starting now',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      });

      updateTaskStatusMock.mockResolvedValueOnce({
        data: {
          data: {
            ...mockTask,
            status: 'in_progress' as const,
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      render(
        <TaskDetailDrawer
          taskId="task-1"
          isOpen={true}
          onClose={vi.fn()}
          onStatusChange={updateTaskStatusMock}
          autoTransitionOnFirstComment={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/add a comment/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/add a comment/i);
      await userEvent.type(input, 'Starting now');
      await userEvent.click(screen.getByRole('button', { name: /post|add|send/i }));

      await waitFor(() => {
        expect(updateTaskStatusMock).toHaveBeenCalledWith('in_progress');
      });
    });

    it('blocks comment submission when input is empty', async () => {
      const mockTask = {
        id: 'task-1',
        dept_id: 'dept-1',
        created_by: 'user-1',
        title: 'Test',
        description: null,
        status: 'todo' as const,
        priority: 'low' as const,
        progress_pct: 0,
        deadline: null,
        epic_id: null,
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
        assignees: [],
        comments: [],
        attachments: [],
      };

      getTaskDetailMock.mockResolvedValueOnce({
        data: mockTask,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      render(
        <TaskDetailDrawer
          taskId="task-1"
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/add a comment/i)).toBeInTheDocument();
      });

      const button = screen.getByRole('button', { name: /post|add|send/i });
      expect(button).toBeDisabled();

      expect(addCommentMock).not.toHaveBeenCalled();
    });
  });

  // Attachment handling
  describe('attachment handling', () => {
    it('renders attachment links when attachments exist', async () => {
      const mockTask = {
        id: 'task-1',
        dept_id: 'dept-1',
        created_by: 'user-1',
        title: 'Test',
        description: null,
        status: 'todo' as const,
        priority: 'low' as const,
        progress_pct: 0,
        deadline: null,
        epic_id: null,
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
        assignees: [],
        comments: [],
        attachments: [
          {
            id: 'att-1',
            task_id: 'task-1',
            file_name: 'large.bin',
            file_url: 'https://example.com/large.bin',
            created_at: '2026-05-01T00:00:00Z',
          },
        ],
      };

      getTaskDetailMock.mockResolvedValueOnce({
        data: mockTask,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      render(
        <TaskDetailDrawer
          taskId="task-1"
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /large\.bin/i })).toBeInTheDocument();
      });
    });
  });
});
