import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useKpi } from './useKpi';
import { apiClient } from '../lib/api';

vi.mock('../lib/api', () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

describe('useKpi Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches KPI data from API on mount', async () => {
    const mockKpiData = {
      summary: {
        user_id: 'user-1',
        current_month: 5,
        current_year: 2026,
        total_score: 85,
        average_score: 85,
        target_score: 80,
        status: 'on_track' as const,
        scores: [],
        criteria: [],
      },
      breakdown: [],
    };

    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: mockKpiData },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const { result } = renderHook(() => useKpi());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockKpiData);
    expect(apiClient.get).toHaveBeenCalled();
  });

  it('sets error state when API rejects', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('KPI API error'));

    const { result } = renderHook(() => useKpi());

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.loading).toBe(false);
  });

  it('supports criteria selection lifecycle', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        data: {
          summary: {
            user_id: 'user-1',
            current_month: 5,
            current_year: 2026,
            total_score: 85,
            average_score: 85,
            target_score: 80,
            status: 'on_track' as const,
            scores: [],
            criteria: [],
          },
          breakdown: [
            {
              criteria_id: 'criteria-1',
              criteria_name: 'Quality',
              weight: 0.3,
              current_score: 90,
              previous_score: 85,
              trend: 'up' as const,
              change_percent: 5.9,
            },
          ],
        },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const { result } = renderHook(() => useKpi());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.selectCriteria('criteria-1');

    await waitFor(() => {
      expect(result.current.selectedCriteriaId).toBe('criteria-1');
    });

    result.current.deselectCriteria();

    await waitFor(() => {
      expect(result.current.selectedCriteriaId).toBeNull();
    });
  });
});
