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

export interface KpiFinalizeResponse {
  year: number;
  month: number;
  finalized: boolean;
}

export function useKpi() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

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

  const fetchDeptRanking = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      return await apiRequest<DeptScoreItem[]>(`/api/v1/kpi/dept/ranking?year=${year}&month=${month}`, { token: accessToken });
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

  const finalizeKpi = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      return await apiRequest<KpiFinalizeResponse>('/api/v1/kpi/finalize', {
        method: 'POST',
        token: accessToken,
        body: { year, month }
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const unlockKpi = useCallback(async (year: number, month: number, reason: string) => {
    setLoading(true);
    try {
      return await apiRequest<KpiFinalizeResponse>('/api/v1/kpi/unlock', {
        method: 'POST',
        token: accessToken,
        body: { year, month, reason }
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const respondAppeal = useCallback(async (appealId: string, payload: {
    approved: boolean;
    response: string;
    adjusted_score?: number;
  }) => {
    setLoading(true);
    try {
      return await apiRequest<{ id: string; status: string; response: string; adjusted_score?: number }>(
        `/api/v1/kpi/appeals/${appealId}/respond`,
        {
          method: 'PATCH',
          token: accessToken,
          body: payload
        }
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const reviewAdjustment = useCallback(async (adjustmentId: string, payload: {
    approved: boolean;
    comment?: string;
  }) => {
    setLoading(true);
    try {
      return await apiRequest<{ id: string; status: string; comment?: string; requester: string; approver: string }>(
        `/api/v1/kpi/adjustments/${adjustmentId}/review`,
        {
          method: 'PATCH',
          token: accessToken,
          body: payload
        }
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const downloadExportFile = useCallback(async (path: string, filename: string) => {
    if (!accessToken) throw new Error('Bạn chưa đăng nhập.');
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + accessToken },
        cache: 'no-store'
      });
      if (!response.ok) {
        let message = `Request failed with status ${response.status}`;
        try {
          const payload = await response.json();
          message = payload.detail || payload.message || message;
        } catch {
          // ignore parse errors
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }, [accessToken, apiBaseUrl]);

  const exportDeptExcel = useCallback(async (year: number, month?: number) => {
    const period = month ? `${month}-${year}` : `${year}`;
    await downloadExportFile(`/api/v1/kpi/export/dept?year=${year}${month ? `&month=${month}` : ''}`, `kpi-phong-ban-${period}.xlsx`);
  }, [downloadExportFile]);

  const exportCompanyExcel = useCallback(async (year: number, month?: number) => {
    const period = month ? `${month}-${year}` : `${year}`;
    await downloadExportFile(`/api/v1/kpi/export/company?year=${year}${month ? `&month=${month}` : ''}`, `kpi-cong-ty-${period}.xlsx`);
  }, [downloadExportFile]);

  return {
    loading,
    fetchKpi,
    fetchHistory,
    fetchCompare,
    updateTarget,
    fetchDeptSummary,
    fetchDeptScores,
    fetchDeptRanking,
    fetchDistribution,
    createAppeal,
    createAdjustment,
    fetchAdjustmentHistory,
    finalizeKpi,
    unlockKpi,
    respondAppeal,
    reviewAdjustment,
    exportDeptExcel,
    exportCompanyExcel
  };
}
