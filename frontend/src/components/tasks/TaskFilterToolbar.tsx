'use client';

import React, { useCallback, useEffect, useState } from 'react';

import type { TaskFilters, TaskPriority, TaskStatus } from '../../../types/task';

interface TaskFilterToolbarProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
}

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];
const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

const PRIORITIES: TaskPriority[] = ['high', 'medium', 'low'];
const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'High Priority',
  medium: 'Medium Priority',
  low: 'Low Priority',
};

export default function TaskFilterToolbar({ filters, onFiltersChange }: TaskFilterToolbarProps) {
  const [searchValue, setSearchValue] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>(
    Array.isArray(filters.status) ? filters.status : []
  );
  const [selectedPriorities, setSelectedPriorities] = useState<TaskPriority[]>(
    Array.isArray(filters.priority) ? filters.priority : []
  );
  const [deadlineStart, setDeadlineStart] = useState(filters.deadlineStart || '');
  const [deadlineEnd, setDeadlineEnd] = useState(filters.deadlineEnd || '');

  useEffect(() => {
    setSelectedStatuses(Array.isArray(filters.status) ? filters.status : []);
    setSelectedPriorities(Array.isArray(filters.priority) ? filters.priority : []);
    setDeadlineStart(filters.deadlineStart || '');
    setDeadlineEnd(filters.deadlineEnd || '');
    setSearchValue(filters.search || '');
  }, [filters.deadlineEnd, filters.deadlineStart, filters.priority, filters.search, filters.status]);

  const buildCurrentFilters = (overrides: Partial<TaskFilters> = {}): TaskFilters => ({
    ...filters,
    ...overrides,
    search: overrides.search ?? (searchValue || undefined),
    status: overrides.status ?? (selectedStatuses.length > 0 ? selectedStatuses : undefined),
    priority: overrides.priority ?? (selectedPriorities.length > 0 ? selectedPriorities : undefined),
    deadlineStart: overrides.deadlineStart ?? (deadlineStart || undefined),
    deadlineEnd: overrides.deadlineEnd ?? (deadlineEnd || undefined),
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange(buildCurrentFilters({ search: searchValue || undefined }));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, selectedStatuses, selectedPriorities, deadlineStart, deadlineEnd, filters, onFiltersChange]);

  const handleStatusChange = (status: TaskStatus, checked: boolean) => {
    const updated = checked
      ? [...selectedStatuses, status]
      : selectedStatuses.filter((s) => s !== status);

    setSelectedStatuses(updated);
    onFiltersChange(buildCurrentFilters({ status: updated.length > 0 ? updated : undefined }));
  };

  const handlePriorityChange = (priority: TaskPriority, checked: boolean) => {
    const updated = checked
      ? [...selectedPriorities, priority]
      : selectedPriorities.filter((p) => p !== priority);

    setSelectedPriorities(updated);
    onFiltersChange(buildCurrentFilters({ priority: updated.length > 0 ? updated : undefined }));
  };

  const handleThisWeek = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startStr = startOfWeek.toISOString().split('T')[0];
    const endStr = endOfWeek.toISOString().split('T')[0];

    setDeadlineStart(startStr);
    setDeadlineEnd(endStr);

    onFiltersChange(buildCurrentFilters({ deadlineStart: startStr, deadlineEnd: endStr }));
  };

  const handleClearFilters = () => {
    setSearchValue('');
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setDeadlineStart('');
    setDeadlineEnd('');
    onFiltersChange({});
  };

  const handleDeadlineChange = (start: string, end: string) => {
    setDeadlineStart(start);
    setDeadlineEnd(end);

    onFiltersChange(buildCurrentFilters({ deadlineStart: start || undefined, deadlineEnd: end || undefined }));
  };

  const hasActiveFilters =
    searchValue ||
    selectedStatuses.length > 0 ||
    selectedPriorities.length > 0 ||
    deadlineStart ||
    deadlineEnd;

  const activeFilterBadges = [
    ...selectedStatuses.map((status) => STATUS_LABELS[status]),
    ...selectedPriorities.map((priority) => PRIORITY_LABELS[priority]),
  ];

  return (
    <div className="filter-toolbar">
      <div className="search-group">
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="filter-group">
        <details className="filter-dropdown">
          <summary className="filter-toggle">Status</summary>
          <div className="filter-options">
            {STATUSES.map((status) => (
              <label key={status} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(status)}
                  onChange={(e) => handleStatusChange(status, e.target.checked)}
                />
                {STATUS_LABELS[status]}
              </label>
            ))}
          </div>
        </details>
      </div>

      <div className="filter-group">
        <details className="filter-dropdown">
          <summary className="filter-toggle">Priority</summary>
          <div className="filter-options">
            {PRIORITIES.map((priority) => (
              <label key={priority} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={selectedPriorities.includes(priority)}
                  onChange={(e) => handlePriorityChange(priority, e.target.checked)}
                />
                {PRIORITY_LABELS[priority]}
              </label>
            ))}
          </div>
        </details>
      </div>

      <div className="filter-group">
        <details className="filter-dropdown">
          <summary className="filter-toggle">Deadline</summary>
          <div className="filter-options">
            <label className="date-input-label">
              Start Date
              <input
                type="date"
                value={deadlineStart}
                onChange={(e) => handleDeadlineChange(e.target.value, deadlineEnd)}
              />
            </label>
            <label className="date-input-label">
              End Date
              <input
                type="date"
                value={deadlineEnd}
                onChange={(e) => handleDeadlineChange(deadlineStart, e.target.value)}
              />
            </label>
            <button className="quick-filter-btn" onClick={handleThisWeek}>
              This Week
            </button>
          </div>
        </details>
      </div>

      {activeFilterBadges.length > 0 && (
        <div className="active-filters" aria-label="Active filters">
          {activeFilterBadges.map((badge) => (
            <span key={badge} className="filter-badge">
              {badge}
            </span>
          ))}
        </div>
      )}

      {hasActiveFilters && (
        <button className="clear-filters-btn" onClick={handleClearFilters}>
          Clear Filters
        </button>
      )}

      <style jsx>{`
        .filter-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          padding: 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .search-group {
          flex: 1;
          min-width: 200px;
        }

        .search-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 0.94rem;
          transition: border-color 140ms ease;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(15, 93, 130, 0.1);
        }

        .filter-group {
          position: relative;
        }

        .active-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .filter-badge {
          padding: 4px 8px;
          border-radius: 999px;
          background: var(--brand-soft);
          color: var(--brand-strong);
          font-size: 0.82rem;
          font-weight: 600;
        }

        .filter-dropdown {
          cursor: pointer;
        }

        .filter-toggle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg);
          font-size: 0.94rem;
          font-weight: 500;
          cursor: pointer;
          user-select: none;
          transition: all 140ms ease;
        }

        .filter-toggle:hover {
          border-color: var(--brand);
          background: var(--brand-soft);
        }

        .filter-dropdown[open] .filter-toggle {
          border-color: var(--brand);
          background: var(--brand-soft);
        }

        .filter-options {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 4px;
          min-width: 200px;
          background: var(--surface-strong);
          border: 1px solid var(--border);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(15, 32, 55, 0.15);
          z-index: 10;
          padding: 8px;
        }

        .filter-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.94rem;
          transition: background 100ms ease;
        }

        .filter-checkbox:hover {
          background: var(--bg-alt);
        }

        .filter-checkbox input {
          cursor: pointer;
        }

        .date-input-label {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 8px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .date-input-label input {
          padding: 6px;
          border: 1px solid var(--border);
          border-radius: 4px;
          font-size: 0.94rem;
        }

        .quick-filter-btn {
          width: 100%;
          padding: 8px;
          margin-top: 8px;
          background: var(--brand-soft);
          border: 1px solid var(--border-strong);
          border-radius: 6px;
          color: var(--brand-strong);
          font-weight: 500;
          cursor: pointer;
          transition: all 100ms ease;
        }

        .quick-filter-btn:hover {
          background: rgba(15, 93, 130, 0.2);
        }

        .clear-filters-btn {
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg);
          font-size: 0.94rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 140ms ease;
        }

        .clear-filters-btn:hover {
          background: rgba(180, 35, 24, 0.12);
          border-color: var(--danger);
          color: var(--danger);
        }

        @media (max-width: 768px) {
          .filter-toolbar {
            flex-direction: column;
          }

          .filter-options {
            position: fixed;
            top: auto;
            left: 16px;
            right: 16px;
            bottom: auto;
          }
        }
      `}</style>
    </div>
  );
}
