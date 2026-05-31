'use client';

import { useCallback, useState } from 'react';
import { apiRequest } from '../lib/api'; 
import { authStore } from '../store/authStore';

type DashboardTaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

export interface DashboardTaskAssignee { user_id: string; full_name: string; avatar_url?: string | null; }
export interface DashboardTaskItem { id: string; title: string; status: DashboardTaskStatus; priority: 'low' | 'medium' | 'high'; progress_pct: number; deadline?: string | null; created_at?: string | null; is_overdue: boolean; days_late: number; assignees: DashboardTaskAssignee[]; }
export interface GanttResult { view: 'day' | 'week' | 'month'; start: string; end: string; tasks: DashboardTaskItem[]; }
export interface CalendarMonthResult { year: number; month: number; days: any[]; }
export interface CalendarWeekResult { week_start: string; days: any[]; }
export interface CalendarDayResult { date: string; tasks: DashboardTaskItem[]; }
export interface PerformanceReportResult { year: number; month: number; from_date: string; to_date: string; staff_performance: any[]; }
export interface OverdueByDeptItem { dept_id: string; dept_name: string; total_tasks: number; overdue_count: number; overdue_rate: number; }
export interface KpiComparisonResult { year: number; quarter: number; departments: any[]; }
export interface CeoDashboardResult { total_employees: number; task_stats: any; overdue_tasks: number; kpi_by_dept: any[]; top_employees: any[]; }
export interface CeoHeatmapResult { year: number; month: number; heatmap: any[]; }
export interface UsageResult { daily_active_users: number; weekly_active_users: number; monthly_active_users: number; }
export interface ManagerDashboardResult { task_stats: { todo: number; in_progress: number; done: number; total: number }; overdue_tasks: number; overdue_task_list: DashboardTaskItem[]; workload: any[]; weekly_progress: any; top_overdue_tasks: DashboardTaskItem[]; month_comparison: any; }
export interface StaffDashboardResult { tasks_today: DashboardTaskItem[]; tasks_done_this_month: number; tasks_done_change: number; change_direction: string; kpi_current_month: any; }

export function useDashboard() {
  const [loading, setLoading] = useState(false);

  // ✅ Trích xuất token chính xác từ mô hình Vanilla Store gốc của bạn
  const getValidToken = (): string => {
    const snapshot = authStore.getSnapshot();
    return snapshot?.accessToken || '';
  };

  const fetchGantt = useCallback(async (view: 'day' | 'week' | 'month' = 'week') => {
    setLoading(true);
    try {
      return await apiRequest<GanttResult>(`/api/v1/dashboard/gantt?view=${view}`, { method: 'GET', token: getValidToken() });
    } finally { setLoading(false); }
  }, []);

  const fetchCalendarMonth = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      return await apiRequest<CalendarMonthResult>(`/api/v1/dashboard/calendar?year=${year}&month=${month}`, { method: 'GET', token: getValidToken() });
    } finally { setLoading(false); }
  }, []);

  const fetchCalendarWeek = useCallback(async (dateIso: string) => {
    setLoading(true);
    try {
      return await apiRequest<CalendarWeekResult>(`/api/v1/dashboard/calendar/week?date=${encodeURIComponent(dateIso)}`, { method: 'GET', token: getValidToken() });
    } finally { setLoading(false); }
  }, []);

  const fetchCalendarDay = useCallback(async (dateIso: string) => {
    setLoading(true);
    try {
      return await apiRequest<CalendarDayResult>(`/api/v1/dashboard/calendar/day?date=${encodeURIComponent(dateIso)}`, { method: 'GET', token: getValidToken() });
    } finally { setLoading(false); }
  }, []);

  const fetchPerformanceReport = useCallback(async (params: { year?: number; month?: number; fromDate?: string; toDate?: string; }) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (params.year) query.set('year', String(params.year));
      if (params.month) query.set('month', String(params.month));
      if (params.fromDate) query.set('from_date', params.fromDate);
      if (params.toDate) query.set('to_date', params.toDate);
      const suffix = query.toString() ? `?${query.toString()}` : '';
      return await apiRequest<PerformanceReportResult>(`/api/v1/dashboard/report/performance${suffix}`, { method: 'GET', token: getValidToken() });
    } finally { setLoading(false); }
  }, []);

  const fetchOverdueByDept = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      return await apiRequest<OverdueByDeptItem[]>(`/api/v1/dashboard/report/overdue-by-dept?year=${year}&month=${month}`, { method: 'GET', token: getValidToken() });
    } finally { setLoading(false); }
  }, []);

  const fetchKpiComparison = useCallback(async (year: number, quarter: number) => {
    setLoading(true);
    try {
      return await apiRequest<KpiComparisonResult>(`/api/v1/dashboard/report/kpi-comparison?year=${year}&quarter=${quarter}`, { method: 'GET', token: getValidToken() });
    } finally { setLoading(false); }
  }, []);

  const fetchCeoDashboard = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest<CeoDashboardResult>('/api/v1/dashboard/ceo', { method: 'GET', token: getValidToken() });
    } finally { setLoading(false);  }
  }, []);

  const fetchCeoHeatmap = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      return await apiRequest<CeoHeatmapResult>(`/api/v1/dashboard/ceo/heatmap?year=${year}&month=${month}`, { method: 'GET', token: getValidToken() });
    } finally { setLoading(false); }
  }, []);

  const fetchSystemUsage = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest<UsageResult>('/api/v1/dashboard/ceo/usage', { method: 'GET', token: getValidToken() });
    } finally { setLoading(false); }
  }, []);

  const fetchManagerDashboard = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest<ManagerDashboardResult>('/api/v1/dashboard/manager', { method: 'GET', token: getValidToken() });
    } finally { setLoading(false); }
  }, []);

  const fetchStaffDashboard = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest<StaffDashboardResult>('/api/v1/dashboard/staff', { method: 'GET', token: getValidToken() });
    } finally { setLoading(false); }
  }, []);

  return { loading, fetchGantt, fetchCalendarMonth, fetchCalendarWeek, fetchCalendarDay, fetchPerformanceReport, fetchOverdueByDept, fetchKpiComparison, fetchCeoDashboard, fetchCeoHeatmap, fetchSystemUsage, fetchManagerDashboard, fetchStaffDashboard };
}