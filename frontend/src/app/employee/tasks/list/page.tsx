'use client';

import React, { useMemo, useState } from 'react';

import { useTasks } from '../../../../hooks/useTasks';
import TaskFilterToolbar from '../../../../components/tasks/TaskFilterToolbar';
import TaskDetailDrawer from '../../../../components/tasks/TaskDetailDrawer';
import type { TaskFilters } from '../../../../types/task';

type SortField = 'deadline' | 'priority' | 'progress';

export default function TaskListPage() {
  const {
    tasks,
    loading,
    error,
    selectedTaskId,
    selectTask,
    deselectTask,
    filters,
    setFilters,
    resetFilters,
    updateTaskStatus,
  } = useTasks();

  const [sortField, setSortField] = useState<SortField>('deadline');

  const priorityOrder = { high: 0, medium: 1, low: 2 };

  const isOverdue = (deadline: string | null): boolean => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const sortedTasks = useMemo(() => {
    let sorted = [...tasks];

    // Sort overdue tasks to top
    sorted.sort((a, b) => {
      const aOverdue = isOverdue(a.deadline);
      const bOverdue = isOverdue(b.deadline);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Then sort by selected field
      if (sortField === 'deadline') {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }

      if (sortField === 'priority') {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }

      if (sortField === 'progress') {
        return b.progress_pct - a.progress_pct;
      }

      return 0;
    });

    return sorted;
  }, [tasks, sortField]);

  if (loading) {
    return (
      <div className="panel stack">
        <p>Loading tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel stack">
        <p className="error">Failed to load tasks: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="section-grid">
      <TaskFilterToolbar
        filters={filters}
        onFiltersChange={setFilters}
      />

      {sortedTasks.length === 0 ? (
        <div className="panel stack">
          <p>No tasks found. Create one to get started!</p>
        </div>
      ) : (
        <div className="panel">
          <table className="task-table">
            <thead>
              <tr>
                <th onClick={() => setSortField('deadline')}>Title</th>
                <th>Assignee</th>
                <th onClick={() => setSortField('priority')}>Priority</th>
                <th>Deadline</th>
                <th onClick={() => setSortField('progress')}>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task) => (
                <tr
                  key={task.id}
                  className={`task-row ${isOverdue(task.deadline) ? 'overdue' : ''}`}
                  onClick={() => selectTask(task.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="title-cell" data-label="Title">{task.title}</td>
                  <td className="assignee-cell" data-label="Assignee">
                    {task.assignees && task.assignees.length > 0
                      ? task.assignees.map((a) => a.full_name).join(', ')
                      : '—'}
                  </td>
                  <td className={`priority-badge priority-${task.priority}`} data-label="Priority">
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </td>
                  <td className="deadline-cell" data-label="Deadline">
                    {task.deadline
                      ? new Date(task.deadline).toLocaleDateString('vi-VN')
                      : '—'}
                  </td>
                  <td className="progress-cell">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${task.progress_pct}%` }}
                      />
                    </div>
                    <span className="progress-text">{task.progress_pct}%</span>
                  </td>
                  <td className={`status-badge status-${task.status}`} data-label="Status">
                    {task.status === 'todo' ? 'To Do' : task.status === 'in_progress' ? 'In Progress' : 'Done'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedTaskId && (
        <TaskDetailDrawer
          taskId={selectedTaskId}
          isOpen={true}
          onClose={deselectTask}
          onStatusChange={(newStatus) => updateTaskStatus(selectedTaskId, newStatus)}
        />
      )}

      <style jsx>{`
        .task-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.94rem;
        }

        .task-table thead {
          background: var(--bg-alt);
          border-bottom: 1px solid var(--border);
        }

        .task-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          cursor: pointer;
          user-select: none;
        }

        .task-table th:hover {
          background: rgba(15, 93, 130, 0.06);
        }

        .task-row {
          border-bottom: 1px solid var(--border);
          transition: background-color 140ms ease;
        }

        .task-row:hover {
          background: var(--bg-alt);
        }

        .task-row.overdue {
          background: rgba(180, 35, 24, 0.08);
        }

        .task-row.overdue td {
          color: var(--danger);
          font-weight: 500;
        }

        .task-table td {
          padding: 12px;
          vertical-align: middle;
        }

        .priority-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          text-align: center;
        }

        .priority-badge.priority-high {
          background: rgba(180, 35, 24, 0.12);
          color: var(--danger);
        }

        .priority-badge.priority-medium {
          background: rgba(212, 106, 76, 0.14);
          color: var(--accent);
        }

        .priority-badge.priority-low {
          background: rgba(15, 93, 130, 0.12);
          color: var(--brand);
        }

        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          text-align: center;
        }

        .status-badge.status-todo {
          background: rgba(92, 104, 122, 0.12);
          color: var(--muted);
        }

        .status-badge.status-in_progress {
          background: rgba(15, 93, 130, 0.12);
          color: var(--brand);
        }

        .status-badge.status-done {
          background: rgba(15, 93, 130, 0.08);
          color: var(--brand-soft);
        }

        .progress-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .progress-bar {
          flex: 0 0 60px;
          height: 6px;
          background: var(--border);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--brand);
          transition: width 140ms ease;
        }

        .progress-text {
          font-size: 0.85rem;
          color: var(--muted);
        }

        @media (max-width: 768px) {
          .task-table {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .task-table thead {
            display: none;
          }

          .task-table tbody {
            display: grid;
            gap: 16px;
          }

          .task-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            padding: 12px;
            border: 1px solid var(--border);
            border-radius: 12px;
            border-bottom: 1px solid var(--border);
          }

          .task-row td {
            padding: 0;
          }

          .task-row td::before {
            content: attr(data-label);
            font-weight: 600;
            font-size: 0.85rem;
            color: var(--muted);
          }

          .title-cell {
            grid-column: 1 / -1;
          }

          .title-cell::before {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
