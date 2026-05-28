import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TaskFilterToolbar from './TaskFilterToolbar';

describe('Task Filter & Search Toolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // User Journey: As an employee, I want search and filters
  describe('search functionality', () => {
    it('debounces search input before applying query', async () => {
      const onFilterChangeMock = vi.fn();

      render(
        <TaskFilterToolbar
          filters={{}}
          onFiltersChange={onFilterChangeMock}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);

      // Type quickly
      await userEvent.type(searchInput, 'test query');

      // Should not have called immediately due to debounce
      expect(onFilterChangeMock).not.toHaveBeenCalled();

      // Wait for debounce (default 300-500ms)
      await waitFor(
        () => {
          expect(onFilterChangeMock).toHaveBeenCalledWith(
            expect.objectContaining({
              search: 'test query',
            })
          );
        },
        { timeout: 1000 }
      );
    });

    it('filters by status when status checkbox is selected', async () => {
      const onFilterChangeMock = vi.fn();

      render(
        <TaskFilterToolbar
          filters={{}}
          onFiltersChange={onFilterChangeMock}
        />
      );

      const todoCheckbox = screen.getByLabelText(/to do/i);
      await userEvent.click(todoCheckbox);

      expect(onFilterChangeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['todo'],
        })
      );
    });

    it('filters by priority when priority is selected', async () => {
      const onFilterChangeMock = vi.fn();

      render(
        <TaskFilterToolbar
          filters={{}}
          onFiltersChange={onFilterChangeMock}
        />
      );

      const highPriorityCheckbox = screen.getByLabelText(/high priority/i);
      await userEvent.click(highPriorityCheckbox);

      expect(onFilterChangeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: ['high'],
        })
      );
    });

    it('filters by deadline range when date picker is used', async () => {
      const onFilterChangeMock = vi.fn();

      render(
        <TaskFilterToolbar
          filters={{}}
          onFiltersChange={onFilterChangeMock}
        />
      );

      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      await userEvent.type(startDateInput, '2026-05-01');
      await userEvent.type(endDateInput, '2026-05-31');

      await waitFor(() => {
        expect(onFilterChangeMock).toHaveBeenCalledWith(
          expect.objectContaining({
            deadlineStart: '2026-05-01',
            deadlineEnd: '2026-05-31',
          })
        );
      });
    });

    it('combines multiple filters without losing previous selections', async () => {
      const onFilterChangeMock = vi.fn();

      render(
        <TaskFilterToolbar
          filters={{}}
          onFiltersChange={onFilterChangeMock}
        />
      );

      // First filter
      const todoCheckbox = screen.getByLabelText(/to do/i);
      await userEvent.click(todoCheckbox);

      expect(onFilterChangeMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: ['todo'],
        })
      );

      // Add another filter
      const highPriorityCheckbox = screen.getByLabelText(/high priority/i);
      await userEvent.click(highPriorityCheckbox);

      expect(onFilterChangeMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          priority: ['high'],
          status: ['todo'],
        })
      );
    });

    it('clears filters back to default state', async () => {
      const onFilterChangeMock = vi.fn();

      render(
        <TaskFilterToolbar
          filters={{ status: ['todo', 'in_progress'], priority: ['high'] }}
          onFiltersChange={onFilterChangeMock}
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear|reset/i });
      await userEvent.click(clearButton);

      expect(onFilterChangeMock).toHaveBeenCalledWith({});
    });

    it('applies quick filter "This Week" button', async () => {
      const onFilterChangeMock = vi.fn();

      render(
        <TaskFilterToolbar
          filters={{}}
          onFiltersChange={onFilterChangeMock}
        />
      );

      const thisWeekButton = screen.getByRole('button', { name: /this week/i });
      await userEvent.click(thisWeekButton);

      expect(onFilterChangeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          deadlineStart: expect.any(String),
          deadlineEnd: expect.any(String),
        })
      );

      // Verify dates are approximately 7 days apart
      const call = onFilterChangeMock.mock.calls[0][0];
      const start = new Date(call.deadlineStart);
      const end = new Date(call.deadlineEnd);
      const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      expect(diffDays).toBeLessThanOrEqual(7);
      expect(diffDays).toBeGreaterThanOrEqual(6);
    });
  });

  // Multi-select
  describe('multi-select filtering', () => {
    it('supports checkbox multi-select for status', async () => {
      const onFilterChangeMock = vi.fn();

      render(
        <TaskFilterToolbar
          filters={{}}
          onFiltersChange={onFilterChangeMock}
        />
      );

      const todoCheckbox = screen.getByLabelText(/^to do$/i);
      const inProgressCheckbox = screen.getByLabelText(/in progress/i);

      await userEvent.click(todoCheckbox);
      await userEvent.click(inProgressCheckbox);

      expect(onFilterChangeMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: expect.arrayContaining(['todo', 'in_progress']),
        })
      );
    });

    it('removes filter when checkbox is unchecked', async () => {
      const onFilterChangeMock = vi.fn();

      const { rerender } = render(
        <TaskFilterToolbar
          filters={{ status: ['todo', 'in_progress'] }}
          onFiltersChange={onFilterChangeMock}
        />
      );

      const todoCheckbox = screen.getByLabelText(/^to do$/i) as HTMLInputElement;
      expect(todoCheckbox.checked).toBe(true);

      await userEvent.click(todoCheckbox);

      expect(onFilterChangeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['in_progress'],
        })
      );
    });
  });

  // Filter persistence
  describe('filter state management', () => {
    it('displays applied filters as badges', async () => {
      const activeFiltersLabel = 'Active filters';

      render(
        <TaskFilterToolbar
          filters={{
            status: ['todo'],
            priority: ['high', 'medium'],
          }}
          onFiltersChange={vi.fn()}
        />
      );

      const activeFilters = screen.getByLabelText(activeFiltersLabel);
      expect(within(activeFilters).getByText(/to do/i)).toBeInTheDocument();
      expect(within(activeFilters).getByText(/high priority/i)).toBeInTheDocument();
      expect(within(activeFilters).getByText(/medium priority/i)).toBeInTheDocument();
    });

    it('reflects prop changes in UI when filters are updated externally', async () => {
      const { rerender } = render(
        <TaskFilterToolbar
          filters={{}}
          onFiltersChange={vi.fn()}
        />
      );

      let todoCheckbox = screen.getByLabelText(/^to do$/i) as HTMLInputElement;
      expect(todoCheckbox.checked).toBe(false);

      rerender(
        <TaskFilterToolbar
          filters={{ status: ['todo'] }}
          onFiltersChange={vi.fn()}
        />
      );

      todoCheckbox = screen.getByLabelText(/^to do$/i) as HTMLInputElement;
      expect(todoCheckbox.checked).toBe(true);
    });
  });
});
