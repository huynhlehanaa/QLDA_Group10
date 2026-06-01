'use client';

import { useCallback, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

type DashboardTaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

export interface DashboardTaskAssignee {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface DashboardTaskItem {
  id: string;
  title: string;
  status: DashboardTaskStatus;
  priority: 'low' | 'medium' | 'high';
  progress_pct: number;
  deadline?: string | null;
  created_at?: string | null;
  is_overdue: boolean;
  days_late: number;
  assignees: DashboardTaskAssignee[];
}

export interface GanttResult {
  view: 'day' | 'week' | 'month';
  start: string;
  end: string;
  tasks: DashboardTaskItem[];
}

export interface CalendarDayItem {
  day?: number;
  date: string;
  weekday?: string;
  task_count?: number;
  tasks: DashboardTaskItem[];
}

export interface CalendarMonthResult {
  year: number;
  month: number;
  days: CalendarDayItem[];
}

export interface CalendarWeekResult {
  week_start: string;
  days: CalendarDayItem[];
}

export interface CalendarDayResult {
  date: string;
  tasks: DashboardTaskItem[];
}

export interface StaffPerformanceItem {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  tasks_total: number;
  tasks_done: number;
  on_time_rate: number;
  avg_completion_days: number;
}

export interface PerformanceReportResult {
  year: number;
  month: number;
  from_date: string;
  to_date: string;
  staff_performance: StaffPerformanceItem[];
}

export interface OverdueByDeptItem {
  dept_id: string;
  dept_name: string;
  total_tasks: number;
  overdue_count: number;
  overdue_rate: number;
}

export interface KpiComparisonDept {
  dept_id: string;
  dept_name: string;
  avg_score: number;
  months: Array<{ month: number; avg_score: number }>;
}

export interface KpiComparisonResult {
  year: number;
  quarter: number;
  departments: KpiComparisonDept[];
}

export interface CeoDashboardResult {
  total_employees: number;
  task_stats: { todo: number; in_progress: number; done: number; total: number };
  overdue_tasks: number;
  kpi_by_dept: Array<{ dept_id: string; dept_name: string; avg_kpi_score: number; member_count: number }>;
  top_employees: Array<{ user_id: string; full_name: string; avatar_url?: string | null; dept_name: string; kpi_score: number }>;
}

export interface CeoHeatmapResult {
  year: number;
  month: number;
  heatmap: Array<{ date: string; day: number; tasks_done: number }>;
}

export interface UsageResult {
  daily_active_users: number;
  weekly_active_users: number;
  monthly_active_users: number;
}

export interface ManagerDashboardResult {
  task_stats: { todo: number; in_progress: number; done: number; total: number };
  overdue_tasks: number;
  overdue_task_list: DashboardTaskItem[];
  workload: Array<{ user_id: string; full_name: string; avatar_url?: string | null; task_count: number }>;
  weekly_progress: { done_this_week: number; total_this_week: number; completion_rate: number };
  top_overdue_tasks: DashboardTaskItem[];
  month_comparison: {
    tasks_done_this_month: number;
    tasks_done_last_month: number;
    tasks_done_change: number;
    on_time_rate_change: number;
    direction: 'up' | 'down' | 'same';
  };
}

export interface StaffDashboardResult {
  tasks_today: DashboardTaskItem[];
  tasks_done_this_month: number;
  tasks_done_last_month: number;
  tasks_done_change: number;
  change_direction: 'up' | 'down' | 'same';
  kpi_current_month: { total_score: number; target_score: number; grade: string };
}

export function useDashboard() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  const fetchGantt = useCallback(async (view: 'day' | 'week' | 'month' = 'week') => {
    setLoading(true);
    try {
      return await apiRequest<GanttResult>(`/api/v1/dashboard/gantt?view=${view}`, { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchCalendarMonth = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      return await apiRequest<CalendarMonthResult>(`/api/v1/dashboard/calendar?year=${year}&month=${month}`, { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchCalendarWeek = useCallback(async (dateIso: string) => {
    setLoading(true);
    try {
      return await apiRequest<CalendarWeekResult>(`/api/v1/dashboard/calendar/week?date=${encodeURIComponent(dateIso)}`, { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchCalendarDay = useCallback(async (dateIso: string) => {
    setLoading(true);
    try {
      return await apiRequest<CalendarDayResult>(`/api/v1/dashboard/calendar/day?date=${encodeURIComponent(dateIso)}`, { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchPerformanceReport = useCallback(async (params: {
    year?: number;
    month?: number;
    fromDate?: string;
    toDate?: string;
  }) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (params.year) query.set('year', String(params.year));
      if (params.month) query.set('month', String(params.month));
      if (params.fromDate) query.set('from_date', params.fromDate);
      if (params.toDate) query.set('to_date', params.toDate);
      const suffix = query.toString() ? `?${query.toString()}` : '';
      return await apiRequest<PerformanceReportResult>(`/api/v1/dashboard/report/performance${suffix}`, { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchOverdueByDept = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      return await apiRequest<OverdueByDeptItem[]>(`/api/v1/dashboard/report/overdue-by-dept?year=${year}&month=${month}`, { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchKpiComparison = useCallback(async (year: number, quarter: number) => {
    setLoading(true);
    try {
      return await apiRequest<KpiComparisonResult>(`/api/v1/dashboard/report/kpi-comparison?year=${year}&quarter=${quarter}`, { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchCeoDashboard = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest<CeoDashboardResult>('/api/v1/dashboard/ceo', { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchCeoHeatmap = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      return await apiRequest<CeoHeatmapResult>(`/api/v1/dashboard/ceo/heatmap?year=${year}&month=${month}`, { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchSystemUsage = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest<UsageResult>('/api/v1/dashboard/ceo/usage', { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchManagerDashboard = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest<ManagerDashboardResult>('/api/v1/dashboard/manager', { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchStaffDashboard = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest<StaffDashboardResult>('/api/v1/dashboard/staff', { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const downloadReport = useCallback(async (path: string, filename: string) => {
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

  const exportPerformanceExcel = useCallback(async (year: number, month: number) => {
    await downloadReport(`/api/v1/dashboard/report/export/excel?year=${year}&month=${month}`, `bao-cao-hieu-suat-${month}-${year}.xlsx`);
  }, [downloadReport]);

  const exportPerformancePdf = useCallback(async (year: number, month: number) => {
    await downloadReport(`/api/v1/dashboard/report/export/pdf?year=${year}&month=${month}`, `bao-cao-hieu-suat-${month}-${year}.pdf`);
  }, [downloadReport]);

  return {
    loading,
    fetchGantt,
    fetchCalendarMonth,
    fetchCalendarWeek,
    fetchCalendarDay,
    fetchPerformanceReport,
    fetchOverdueByDept,
    fetchKpiComparison,
    fetchCeoDashboard,
    fetchCeoHeatmap,
    fetchSystemUsage,
    fetchManagerDashboard,
    fetchStaffDashboard,
    exportPerformanceExcel,
    exportPerformancePdf
  };
}
