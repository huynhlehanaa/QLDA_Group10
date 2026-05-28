'use client';

import React, { useMemo, useState } from 'react';

import { useTasks } from '../../../../hooks/useTasks';
import TaskFilterToolbar from '../../../../components/tasks/TaskFilterToolbar';
import TaskDetailDrawer from '../../../../components/tasks/TaskDetailDrawer';
import type { TaskListItem, TaskStatus } from '../../../../types/task';

const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'done'];
const COLUMN_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

export default function KanbanPage() {
  const {
    tasks,
    loading,
    error,
    selectedTaskId,
    selectTask,
    deselectTask,
    filters,
    setFilters,
    updateTaskStatus,
  } = useTasks();

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<TaskStatus | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);

  const groupedTasks = useMemo(() => {
    const groups: Record<TaskStatus, TaskListItem[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };

    tasks.forEach((task) => {
      if (task.status in groups) {
        groups[task.status].push(task);
      }
    });

    return groups;
  }, [tasks]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string, status: TaskStatus) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragError(null);
    setDraggedTaskId(taskId);
    setDragSource(status);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetStatus: TaskStatus) => {
    e.preventDefault();

    if (!draggedTaskId || dragSource === targetStatus) {
      setDraggedTaskId(null);
      setDragSource(null);
      return;
    }

    try {
      await updateTaskStatus(draggedTaskId, targetStatus);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update task status';
      setDragError(message);
      console.error('Failed to update task status:', error);
    }

    setDraggedTaskId(null);
    setDragSource(null);
  };

  const handleMoveViaButton = async (taskId: string, toStatus: TaskStatus) => {
    try {
      await updateTaskStatus(taskId, toStatus);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to move task';
      setDragError(message);
      console.error('Failed to move task:', error);
    }
  };

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

      {dragError && <p className="error">{dragError}</p>}

      <div className="kanban-board">
        {COLUMNS.map((status) => {
          const columnTasks = groupedTasks[status];
          return (
            <div
              key={status}
              className="kanban-column"
              data-column={status}
              data-testid={`column-${status}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div className="column-header">
                <h3>{COLUMN_LABELS[status]}</h3>
                <span className="column-count">{columnTasks.length}</span>
              </div>

              <div className="column-cards">
                {columnTasks.length === 0 ? (
                  <div className="empty-column">No tasks</div>
                ) : (
                  columnTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`task-card ${draggedTaskId === task.id ? 'dragging' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id, status)}
                      onClick={() => selectTask(task.id)}
                    >
                      <div className="card-header">
                        <h4 className="card-title">{task.title}</h4>
                        <span className={`priority-dot priority-${task.priority}`} />
                      </div>

                      {task.progress_pct > 0 && (
                        <div className="progress-mini">
                          <div
                            className="progress-fill"
                            style={{ width: `${task.progress_pct}%` }}
                          />
                          <span className="progress-text">{task.progress_pct}%</span>
                        </div>
                      )}

                      {task.deadline && (
                        <div className="deadline-info">
                          📅 {new Date(task.deadline).toLocaleDateString('vi-VN')}
                        </div>
                      )}

                      {/* Fallback move buttons when drag unavailable */}
                      <div className="card-actions">
                        {status !== 'todo' && (
                          <button
                            className="action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              const prevStatus = status === 'in_progress' ? 'todo' : 'in_progress';
                              void handleMoveViaButton(task.id, prevStatus);
                            }}
                          >
                            ←
                          </button>
                        )}
                        {status !== 'done' && (
                          <button
                            className="action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextStatus = status === 'todo' ? 'in_progress' : 'done';
                              void handleMoveViaButton(task.id, nextStatus);
                            }}
                            title={`Move to ${status === 'todo' ? 'in_progress' : 'done'}`}
                          >
                            →
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTaskId && (
        <TaskDetailDrawer
          taskId={selectedTaskId}
          isOpen={true}
          onClose={deselectTask}
          onStatusChange={(newStatus) => updateTaskStatus(selectedTaskId, newStatus)}
        />
      )}

      <style jsx>{`
        .kanban-board {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 16px;
          padding: 16px 0;
        }

        .kanban-column {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 420px;
          background: var(--bg-alt);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px;
          transition: background-color 140ms ease, transform 140ms ease;
        }

        .kanban-column:hover {
          background: var(--surface);
        }

        .column-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 2px solid var(--border-strong);
          margin-bottom: 8px;
        }

        .column-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .column-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          padding: 2px 6px;
          background: var(--brand-soft);
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--brand-strong);
        }

        .column-cards {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
          overflow-y: auto;
        }

        .empty-column {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100px;
          color: var(--muted);
          font-size: 0.94rem;
        }

        .task-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background: var(--surface-strong);
          border: 1px solid var(--border);
          border-radius: 10px;
          cursor: move;
          transition: transform 140ms ease, box-shadow 140ms ease;
          user-select: none;
        }

        .task-card:hover {
          box-shadow: 0 4px 12px rgba(15, 32, 55, 0.1);
          transform: translateY(-2px);
        }

        .task-card.dragging {
          opacity: 0.5;
          background: var(--bg-alt);
        }

        .task-card:focus-visible {
          outline: 3px solid rgba(15, 93, 130, 0.18);
          transform: translateY(-3px);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }

        .card-title {
          margin: 0;
          font-size: 0.94rem;
          font-weight: 600;
          line-height: 1.3;
          flex: 1;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .priority-dot {
          flex-shrink: 0;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-top: 4px;
        }

        .priority-dot.priority-high {
          background: var(--danger);
        }

        .priority-dot.priority-medium {
          background: var(--accent);
        }

        .priority-dot.priority-low {
          background: var(--brand);
        }

        .progress-mini {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
        }

        .progress-mini .progress-fill {
          height: 4px;
          background: var(--brand);
          border-radius: 2px;
        }

        .progress-text {
          color: var(--muted);
          min-width: 30px;
        }

        .deadline-info {
          font-size: 0.85rem;
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .card-actions {
          display: flex;
          gap: 4px;
          justify-content: flex-end;
        }

        .action-btn {
          width: 24px;
          height: 24px;
          padding: 0;
          border: 1px solid var(--border);
          border-radius: 4px;
          background: var(--bg);
          color: var(--muted);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 100ms ease;
        }

        .action-btn:hover {
          background: var(--brand-soft);
          color: var(--brand-strong);
          border-color: var(--brand);
        }

        @media (max-width: 768px) {
          .kanban-board {
            grid-template-columns: 1fr;
          }

          .kanban-column {
            min-height: 300px;
          }
        }
      `}</style>
    </div>
  );
}
