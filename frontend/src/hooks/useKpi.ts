'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiClient } from '../lib/api';
import type { KPIDashboard } from '../types/kpi';

interface UseKpiState {
  data: KPIDashboard | null;
  loading: boolean;
  error: Error | null;
  isEmpty: boolean | undefined;
  selectedCriteriaId: string | null;
}

interface UseKpiReturn extends UseKpiState {
  selectCriteria: (id: string) => void;
  deselectCriteria: () => void;
  refetch: () => Promise<void>;
}

export function useKpi(): UseKpiReturn {
  const [state, setState] = useState<UseKpiState>({
    data: null,
    loading: false,
    error: null,
    isEmpty: undefined,
    selectedCriteriaId: null,
  });

  // Fetch KPI data
  const fetchKpiData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiClient.get<{ data: KPIDashboard }>('/kpi/me');

      const kpiData = response.data.data;
      const isEmpty =
        (!kpiData.summary || !kpiData.summary.scores || kpiData.summary.scores.length === 0) &&
        (!kpiData.breakdown || kpiData.breakdown.length === 0);

      setState((prev) => ({
        ...prev,
        data: kpiData,
        loading: false,
        isEmpty,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to fetch KPI data'),
        loading: false,
      }));
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    void fetchKpiData();
  }, [fetchKpiData]);

  const selectCriteria = useCallback((id: string) => {
    setState((prev) => ({ ...prev, selectedCriteriaId: id }));
  }, []);

  const deselectCriteria = useCallback(() => {
    setState((prev) => ({ ...prev, selectedCriteriaId: null }));
  }, []);

  const refetch = useCallback(async () => {
    await fetchKpiData();
  }, [fetchKpiData]);

  return {
    ...state,
    selectCriteria,
    deselectCriteria,
    refetch,
  };
}
