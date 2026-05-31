import { useCallback, useState } from 'react';
import { apiRequest } from '../lib/api';

// --- ĐỊNH NGHĨA CÁC KIỂU DỮ LIỆU ĐỒNG BỘ FRONTEND VITE ---
export type DashboardTaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

export interface DashboardTaskAssignee {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface DashboardTaskItem {
  id: string;
  title: string;
  status: DashboardTaskStatus;
  progress_pct: number;
  start_date?: string | null;
  due_date?: string | null;
  assignee?: DashboardTaskAssignee | null;
}

export interface GanttResult {
  tasks: DashboardTaskItem[];
}

export interface CalendarMonthResult {
  days: Record<string, any>;
}
export interface CalendarWeekResult {
  days: Record<string, any>;
}
export interface CalendarDayResult {
  events: any[];
}
export interface PerformanceReportResult {
  report_data: any;
}
export interface OverdueByDeptItem {
  dept_id: string;
  dept_name: string;
  count: number;
}
export interface KpiComparisonResult {
  departments: Array<{ dept_id: string; dept_name: string; avg_score: number }>;
}
export interface CeoDashboardResult {
  summary: any;
}
export interface CeoHeatmapResult {
  heatmap: any;
}
export interface UsageResult {
  stats: any;
}
export interface ManagerDashboardResult {
  summary: any;
}

export function useDashboard() {
  const [loading, setLoading] = useState(false);

  const fetchGantt = useCallback(async (view: 'day' | 'week' | 'month' = 'week'): Promise<GanttResult> => {
    setLoading(true);
    try {
      return await apiRequest('GET', `/dashboard/gantt?view=${view}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCalendarMonth = useCallback(async (year: number, month: number): Promise<CalendarMonthResult> => {
    setLoading(true);
    try {
      return await apiRequest('GET', `/dashboard/calendar?year=${year}&month=${month}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCalendarWeek = useCallback(async (dateIso: string): Promise<CalendarWeekResult> => {
    setLoading(true);
    try {
      return await apiRequest('GET', `/dashboard/calendar/week?date=${encodeURIComponent(dateIso)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCalendarDay = useCallback(async (dateIso: string): Promise<CalendarDayResult> => {
    setLoading(true);
    try {
      return await apiRequest('GET', `/dashboard/calendar/day?date=${encodeURIComponent(dateIso)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPerformanceReport = useCallback(async (params: { year: number; month: number; fromDate?: string; toDate?: string }): Promise<PerformanceReportResult> => {
    setLoading(true);
    try {
      let url = `/dashboard/performance?year=${params.year}&month=${params.month}`;
      if (params.fromDate) url += `&from_date=${params.fromDate}`;
      if (params.toDate) url += `&to_date=${params.toDate}`;
      return await apiRequest('GET', url);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOverdueByDept = useCallback(async (year: number, month: number): Promise<OverdueByDeptItem[]> => {
    setLoading(true);
    try {
      return await apiRequest('GET', `/dashboard/overdue-by-dept?year=${year}&month=${month}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchKpiComparison = useCallback(async (year: number, quarter: number): Promise<KpiComparisonResult> => {
    setLoading(true);
    try {
      return await apiRequest('GET', `/dashboard/kpi-comparison?year=${year}&quarter=${quarter}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCeoDashboard = useCallback(async (): Promise<CeoDashboardResult> => {
    setLoading(true);
    try {
      return await apiRequest('GET', '/dashboard/ceo');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCeoHeatmap = useCallback(async (year: number, month: number): Promise<CeoHeatmapResult> => {
    setLoading(true);
    try {
      return await apiRequest('GET', `/dashboard/ceo-heatmap?year=${year}&month=${month}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSystemUsage = useCallback(async (): Promise<UsageResult> => {
    setLoading(true);
    try {
      return await apiRequest('GET', '/dashboard/usage-stats');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchManagerDashboard = useCallback(async (): Promise<ManagerDashboardResult> => {
    setLoading(true);
    try {
      return await apiRequest('GET', '/dashboard/manager');
    } finally {
      setLoading(false);
    }
  }, []);

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
  };
}