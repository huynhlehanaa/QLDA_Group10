'use client';

import { useCallback, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

export interface KpiScoreBreakdown {
  criteria_id: string;
  name: string;
  weight: number;
  score: number;
  weighted_score: number;
  formula_type: string;
}

export interface MyKpiResult {
  user_id: string;
  full_name: string;
  year: number;
  month: number;
  total_score: number;
  grade: string;
  target_score: number;
  breakdown: KpiScoreBreakdown[];
}

export interface KpiHistoryItem {
  year: number;
  month: number;
  total_score: number;
}

export interface KpiCompareResult {
  my_score: number;
  dept_average: number;
}

export interface DeptKpiSummary {
  year: number;
  month: number;
  member_count: number;
  average_score: number;
  summary: {
    average: number;
    target: number;
  };
}

export interface DeptScoreItem {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  total_score: number;
  grade: string;
  rank: number;
  breakdown: KpiScoreBreakdown[];
}

export interface GradeDistribution {
  excellent: number;
  good: number;
  pass: number;
  fail: number;
  total: number;
}

export interface KpiAdjustmentHistoryItem {
  id: string;
  requester: string;
  approver?: string | null;
  staff_name: string;
  criteria_name: string;
  original_score?: number | null;
  proposed_score: number;
  status: string;
  comment?: string | null;
  created_at: string;
}

export function useKpi() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const fetchKpi = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      return await apiRequest<MyKpiResult>(`/api/v1/kpi/me?year=${year}&month=${month}`, { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchHistory = useCallback(async (months = 12) => {
    setLoading(true);
    try {
      return await apiRequest<KpiHistoryItem[]>(`/api/v1/kpi/me/history?months=${months}`, { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchCompare = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      return await apiRequest<KpiCompareResult>(`/api/v1/kpi/me/compare?year=${year}&month=${month}`, { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const updateTarget = useCallback(async (year: number, month: number, targetScore: number) => {
    setLoading(true);
    try {
      return await apiRequest<{ user_id: string; year: number; month: number; target_score: number }>('/api/v1/kpi/me/target', {
        method: 'POST',
        token: accessToken,
        body: { year, month, target_score: targetScore }
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchDeptSummary = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      return await apiRequest<DeptKpiSummary>(`/api/v1/kpi/dept?year=${year}&month=${month}`, { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchDeptScores = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      return await apiRequest<DeptScoreItem[]>(`/api/v1/kpi/dept/scores?year=${year}&month=${month}`, { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchDistribution = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      return await apiRequest<GradeDistribution>(`/api/v1/kpi/dept/distribution?year=${year}&month=${month}`, { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const createAppeal = useCallback(async (payload: {
    year: number;
    month: number;
    criteria_name: string;
    current_score: number;
    proposed_score: number;
    reason: string;
  }) => {
    setLoading(true);
    try {
      return await apiRequest<{ id: string; status: string }>('/api/v1/kpi/appeals', {
        method: 'POST',
        token: accessToken,
        body: payload
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const createAdjustment = useCallback(async (payload: {
    user_id: string;
    year: number;
    month: number;
    criteria_name: string;
    proposed_score: number;
    reason: string;
  }) => {
    setLoading(true);
    try {
      return await apiRequest<{ id: string; status: string }>('/api/v1/kpi/adjustments', {
        method: 'POST',
        token: accessToken,
        body: payload
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchAdjustmentHistory = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest<KpiAdjustmentHistoryItem[]>('/api/v1/kpi/adjustments/history', { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  return {
    loading,
    fetchKpi,
    fetchHistory,
    fetchCompare,
    updateTarget,
    fetchDeptSummary,
    fetchDeptScores,
    fetchDistribution,
    createAppeal,
    createAdjustment,
    fetchAdjustmentHistory
  };
}
