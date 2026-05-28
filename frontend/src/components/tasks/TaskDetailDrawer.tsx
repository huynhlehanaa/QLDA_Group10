'use client';

import React, { useEffect, useState } from 'react';

import { apiClient } from '../../lib/api';
import type { TaskResponse, TaskComment, TaskStatus } from '../../../types/task';

interface TaskDetailDrawerProps {
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: TaskStatus) => Promise<void>;
  autoTransitionOnFirstComment?: boolean;
}

export default function TaskDetailDrawer({
  taskId,
  isOpen,
  onClose,
  onStatusChange,
  autoTransitionOnFirstComment = false,
}: TaskDetailDrawerProps) {
  const [task, setTask] = useState<TaskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [comments, setComments] = useState<TaskComment[]>([]);

  useEffect(() => {
    if (!isOpen || !taskId) return;

    const fetchTaskDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get<TaskResponse>(`/tasks/${taskId}`);
        const taskDetail = response.data;
        setTask(taskDetail);
        setComments(taskDetail.comments ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load task details');
      } finally {
        setLoading(false);
      }
    };

    void fetchTaskDetail();
  }, [isOpen, taskId]);

  const handleAddComment = async () => {
    if (!commentText.trim() || !task) return;

    setSubmittingComment(true);
    setError(null);

    try {
      const response = await apiClient.post<TaskComment>(
        `/tasks/${taskId}/comments`,
        { content: commentText }
      );

      setComments((prev) => [...prev, response.data]);
      setCommentText('');

      // Auto-transition to In Progress on first comment
      if (autoTransitionOnFirstComment && task.status === 'todo' && onStatusChange) {
        setError('Transitioning to in progress...');
        await onStatusChange('in_progress');
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2>{task?.title || 'Loading...'}</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {loading ? (
          <div className="drawer-body">
            <p>Loading task details...</p>
          </div>
        ) : error && !task ? (
          <div className="drawer-body">
            <p className="error">{error}</p>
          </div>
        ) : task ? (
          <div className="drawer-body">
            {/* Description */}
            {task.description && (
              <section className="detail-section">
                <h3>Description</h3>
                <p>{task.description}</p>
              </section>
            )}

            {/* Assignees */}
            {task.assignees && task.assignees.length > 0 && (
              <section className="detail-section">
                <h3>Assigned To</h3>
                <div className="assignees-list">
                  {task.assignees.map((assignee) => (
                    <div key={assignee.id} className="assignee-item">
                      {assignee.avatar_url && (
                        <img
                          src={assignee.avatar_url}
                          alt={assignee.full_name}
                          className="assignee-avatar"
                        />
                      )}
                      <span>{assignee.full_name}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Progress */}
            {task.progress_pct > 0 && (
              <section className="detail-section">
                <h3>Progress: {task.progress_pct}%</h3>
                <div className="progress-bar-large">
                  <div
                    className="progress-fill"
                    style={{ width: `${task.progress_pct}%` }}
                  />
                </div>
              </section>
            )}

            {/* Attachments */}
            {task.attachments && task.attachments.length > 0 && (
              <section className="detail-section">
                <h3>Attachments</h3>
                <div className="attachments-list">
                  {task.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="attachment-link"
                    >
                      📎 {att.file_name}
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Comments Thread */}
            <section className="detail-section comments-section">
              <h3>Comments ({comments.length})</h3>

              <div className="comments-list" data-testid="comments-list">
                {comments.length === 0 ? (
                  <p className="empty-comments">No comments yet</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="comment-item" data-testid={`comment-${comment.id}`}>
                      <div className="comment-header">
                        <strong>{comment.user?.full_name || comment.full_name || 'Unknown'}</strong>
                        <time className="comment-time">
                          {new Date(comment.created_at).toLocaleString('vi-VN')}
                        </time>
                      </div>
                      <p className="comment-content">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment */}
              <div className="add-comment-form">
                <textarea
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  className="comment-input"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || submittingComment}
                  className="submit-comment-btn"
                >
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>

              {error && <p className="error">{error}</p>}
            </section>
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          justify-content: flex-end;
          z-index: 1000;
          animation: fadeIn 200ms ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .drawer-content {
          width: min(600px, 100%);
          height: 100vh;
          background: var(--surface-strong);
          border-left: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          animation: slideIn 300ms ease;
          box-shadow: -4px 0 16px rgba(15, 32, 55, 0.15);
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid var(--border);
        }

        .drawer-header h2 {
          margin: 0;
          font-size: 1.25rem;
          flex: 1;
        }

        .close-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--muted);
          transition: color 140ms ease;
        }

        .close-btn:hover {
          color: var(--ink);
        }

        .drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .detail-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .detail-section h3 {
          margin: 0;
          font-size: 0.94rem;
          font-weight: 600;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .assignees-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .assignee-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: var(--bg);
          border-radius: 6px;
          font-size: 0.94rem;
        }

        .assignee-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          object-fit: cover;
        }

        .progress-bar-large {
          height: 8px;
          background: var(--border);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--brand);
          transition: width 300ms ease;
        }

        .attachments-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .attachment-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          text-decoration: none;
          color: var(--brand);
          font-size: 0.94rem;
          transition: all 140ms ease;
        }

        .attachment-link:hover {
          background: var(--brand-soft);
          border-color: var(--brand);
        }

        .comments-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .comments-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .empty-comments {
          color: var(--muted);
          font-style: italic;
          margin: 0;
        }

        .comment-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 12px;
          background: var(--bg);
          border-radius: 8px;
          border-left: 3px solid var(--brand);
        }

        .comment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
        }

        .comment-time {
          color: var(--muted);
          font-size: 0.8rem;
        }

        .comment-content {
          margin: 0;
          font-size: 0.94rem;
          line-height: 1.4;
        }

        .add-comment-form {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .comment-input {
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-family: inherit;
          font-size: 0.94rem;
          resize: vertical;
          transition: border-color 140ms ease;
        }

        .comment-input:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(15, 93, 130, 0.1);
        }

        .submit-comment-btn {
          padding: 10px 16px;
          background: var(--brand);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 140ms ease;
        }

        .submit-comment-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 93, 130, 0.2);
        }

        .submit-comment-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error {
          color: var(--danger);
          font-size: 0.94rem;
          margin: 0;
        }

        @media (max-width: 640px) {
          .drawer-content {
            width: 100%;
          }

          .drawer-header {
            padding: 16px;
          }

          .drawer-body {
            padding: 16px;
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
}
