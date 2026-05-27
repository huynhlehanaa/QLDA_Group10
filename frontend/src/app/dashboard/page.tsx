'use client';

import { type CSSProperties, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authStore } from '@/store/authStore';
import { useAuthStore } from '@/store/useAuthStore';
import {
  type CalendarDayResult,
  type CalendarMonthResult,
  type CalendarWeekResult,
  type CeoDashboardResult,
  type CeoHeatmapResult,
  type GanttResult,
  type KpiComparisonResult,
  type ManagerDashboardResult,
  type OverdueByDeptItem,
  type PerformanceReportResult,
  type StaffDashboardResult,
  type UsageResult,
  useDashboard
} from '@/hooks/useDashboard';

export default function DashboardPage() {
  const router = useRouter();
  const { accessToken, me } = useAuthStore();
  const {
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
  } = useDashboard();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [calendarDate, setCalendarDate] = useState(now.toISOString().slice(0, 10));
  const [ganttView, setGanttView] = useState<'day' | 'week' | 'month'>('week');
  const [ready, setReady] = useState(false);

  const [gantt, setGantt] = useState<GanttResult | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<CalendarMonthResult | null>(null);
  const [calendarWeek, setCalendarWeek] = useState<CalendarWeekResult | null>(null);
  const [calendarDay, setCalendarDay] = useState<CalendarDayResult | null>(null);
  const [performance, setPerformance] = useState<PerformanceReportResult | null>(null);
  const [overdueByDept, setOverdueByDept] = useState<OverdueByDeptItem[]>([]);
  const [kpiComparison, setKpiComparison] = useState<KpiComparisonResult | null>(null);
  const [ceoDashboard, setCeoDashboard] = useState<CeoDashboardResult | null>(null);
  const [ceoHeatmap, setCeoHeatmap] = useState<CeoHeatmapResult | null>(null);
  const [usage, setUsage] = useState<UsageResult | null>(null);
  const [managerDashboard, setManagerDashboard] = useState<ManagerDashboardResult | null>(null);
  const [staffDashboard, setStaffDashboard] = useState<StaffDashboardResult | null>(null);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    if (!accessToken || !me) return;
    setError('');

    const calendarTasks = Promise.all([
      fetchCalendarMonth(year, month),
      fetchCalendarWeek(calendarDate),
      fetchCalendarDay(calendarDate)
    ]);

    if (me.role === 'ceo') {
      const [ganttRes, calendarRes, performanceRes, overdueRes, comparisonRes, ceoRes, heatmapRes, usageRes, managerRes] = await Promise.all([
        fetchGantt(ganttView),
        calendarTasks,
        fetchPerformanceReport({ year, month, fromDate: fromDate || undefined, toDate: toDate || undefined }),
        fetchOverdueByDept(year, month),
        fetchKpiComparison(year, quarter),
        fetchCeoDashboard(),
        fetchCeoHeatmap(year, month),
        fetchSystemUsage(),
        fetchManagerDashboard()
      ]);
      setGantt(ganttRes);
      setCalendarMonth(calendarRes[0]);
      setCalendarWeek(calendarRes[1]);
      setCalendarDay(calendarRes[2]);
      setPerformance(performanceRes);
      setOverdueByDept(overdueRes);
      setKpiComparison(comparisonRes);
      setCeoDashboard(ceoRes);
      setCeoHeatmap(heatmapRes);
      setUsage(usageRes);
      setManagerDashboard(managerRes);
      setStaffDashboard(null);
      return;
    }

    if (me.role === 'manager') {
      const [ganttRes, calendarRes, performanceRes, managerRes] = await Promise.all([
        fetchGantt(ganttView),
        calendarTasks,
        fetchPerformanceReport({ year, month, fromDate: fromDate || undefined, toDate: toDate || undefined }),
        fetchManagerDashboard()
      ]);
      setGantt(ganttRes);
      setCalendarMonth(calendarRes[0]);
      setCalendarWeek(calendarRes[1]);
      setCalendarDay(calendarRes[2]);
      setPerformance(performanceRes);
      setManagerDashboard(managerRes);
      setOverdueByDept([]);
      setKpiComparison(null);
      setCeoDashboard(null);
      setCeoHeatmap(null);
      setUsage(null);
      setStaffDashboard(null);
      return;
    }

    const [calendarRes, staffRes] = await Promise.all([calendarTasks, fetchStaffDashboard()]);
    setCalendarMonth(calendarRes[0]);
    setCalendarWeek(calendarRes[1]);
    setCalendarDay(calendarRes[2]);
    setStaffDashboard(staffRes);
    setGantt(null);
    setPerformance(null);
    setOverdueByDept([]);
    setKpiComparison(null);
    setCeoDashboard(null);
    setCeoHeatmap(null);
    setUsage(null);
    setManagerDashboard(null);
  }, [
    accessToken,
    calendarDate,
    fetchCalendarDay,
    fetchCalendarMonth,
    fetchCalendarWeek,
    fetchCeoDashboard,
    fetchCeoHeatmap,
    fetchGantt,
    fetchKpiComparison,
    fetchManagerDashboard,
    fetchOverdueByDept,
    fetchPerformanceReport,
    fetchStaffDashboard,
    fetchSystemUsage,
    fromDate,
    ganttView,
    me,
    month,
    quarter,
    toDate,
    year
  ]);

  useEffect(() => {
    if (!accessToken) {
      router.replace('/auth/login');
      return;
    }
    authStore.bootstrap().then((profile) => {
      if (!profile) router.replace('/auth/login');
      else setReady(true);
    }).catch(() => router.replace('/auth/login'));
  }, [accessToken, router]);

  useEffect(() => {
    if (!ready) return;
    loadData().catch((err) => setError(err instanceof Error ? err.message : 'Không tải được dữ liệu Dashboard'));
  }, [ready, loadData]);

  async function onExportExcel() {
    setError('');
    setNotice('');
    try {
      await exportPerformanceExcel(year, month);
      setNotice('Đã tải báo cáo Excel.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xuất Excel thất bại');
    }
  }

  async function onExportPdf() {
    setError('');
    setNotice('');
    try {
      await exportPerformancePdf(year, month);
      setNotice('Đã tải báo cáo PDF.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xuất PDF thất bại');
    }
  }

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24, display: 'grid', gap: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Báo cáo & Dashboard</h1>
          <p style={{ margin: '4px 0 0', color: '#475569' }}>Xin chào {me?.full_name || 'User'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => router.push('/tasks')} style={btnSecondary}>Task</button>
          <button type="button" onClick={() => router.push('/kpi')} style={btnSecondary}>KPI</button>
          <button type="button" onClick={() => authStore.signOut().then(() => router.replace('/auth/login'))} style={btnSecondary}>Đăng xuất</button>
        </div>
      </header>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Bộ lọc báo cáo</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.5fr 1.5fr auto', gap: 8 }}>
          <input type="number" aria-label="Năm" value={year} onChange={(e) => setYear(Number(e.target.value || now.getFullYear()))} style={inputStyle} />
          <input type="number" aria-label="Tháng" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value || now.getMonth() + 1))} style={inputStyle} />
          <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} style={inputStyle}>
            <option value={1}>Q1</option>
            <option value={2}>Q2</option>
            <option value={3}>Q3</option>
            <option value={4}>Q4</option>
          </select>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
          <button type="button" onClick={() => loadData()} disabled={loading} style={btnPrimary}>{loading ? 'Đang tải...' : 'Tải dữ liệu'}</button>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Lịch công việc</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
          <input type="date" value={calendarDate} onChange={(e) => setCalendarDate(e.target.value)} style={inputStyle} />
          <button type="button" onClick={() => loadData()} style={btnSecondary}>Cập nhật lịch</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
          <Stat label="Task trong tháng" value={calendarMonth?.days.reduce((acc, day) => acc + (day.task_count || day.tasks.length), 0) || 0} />
          <Stat label="Task trong tuần" value={calendarWeek?.days.reduce((acc, day) => acc + day.tasks.length, 0) || 0} />
          <Stat label="Task trong ngày" value={calendarDay?.tasks.length || 0} />
        </div>
      </section>

      {(me?.role === 'manager' || me?.role === 'ceo') ? (
        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Gantt phòng ban</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <select value={ganttView} onChange={(e) => setGanttView(e.target.value as 'day' | 'week' | 'month')} style={inputStyle}>
              <option value="day">Theo ngày</option>
              <option value="week">Theo tuần</option>
              <option value="month">Theo tháng</option>
            </select>
            <button type="button" onClick={() => loadData()} style={btnSecondary}>Làm mới Gantt</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                  <th style={{ padding: 8 }}>Task</th>
                  <th style={{ padding: 8 }}>Trạng thái</th>
                  <th style={{ padding: 8 }}>Deadline</th>
                  <th style={{ padding: 8 }}>Assignee</th>
                </tr>
              </thead>
              <tbody>
                {(gantt?.tasks || []).slice(0, 10).map((task) => (
                  <tr key={task.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 8 }}>{task.title}</td>
                    <td style={{ padding: 8 }}>{task.status}</td>
                    <td style={{ padding: 8 }}>{task.deadline ? new Date(task.deadline).toLocaleString('vi-VN') : '-'}</td>
                    <td style={{ padding: 8 }}>{task.assignees.map((a) => a.full_name).join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {(me?.role === 'manager' || me?.role === 'ceo') ? (
        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Báo cáo hiệu suất</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onExportExcel} disabled={loading} style={btnSecondary}>Xuất Excel</button>
            <button type="button" onClick={onExportPdf} disabled={loading} style={btnSecondary}>Xuất PDF</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                  <th style={{ padding: 8 }}>Nhân sự</th>
                  <th style={{ padding: 8 }}>Tổng task</th>
                  <th style={{ padding: 8 }}>Done</th>
                  <th style={{ padding: 8 }}>Đúng hạn (%)</th>
                  <th style={{ padding: 8 }}>TB hoàn thành (ngày)</th>
                </tr>
              </thead>
              <tbody>
                {(performance?.staff_performance || []).map((item) => (
                  <tr key={item.user_id} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 8 }}>{item.full_name}</td>
                    <td style={{ padding: 8 }}>{item.tasks_total}</td>
                    <td style={{ padding: 8 }}>{item.tasks_done}</td>
                    <td style={{ padding: 8 }}>{item.on_time_rate}</td>
                    <td style={{ padding: 8 }}>{item.avg_completion_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {(me?.role === 'manager' || me?.role === 'ceo') && managerDashboard ? (
        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Dashboard Manager</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 }}>
            <Stat label="Todo" value={managerDashboard.task_stats.todo} />
            <Stat label="In Progress" value={managerDashboard.task_stats.in_progress} />
            <Stat label="Done" value={managerDashboard.task_stats.done} />
            <Stat label="Overdue" value={managerDashboard.overdue_tasks} />
          </div>
        </section>
      ) : null}

      {me?.role === 'ceo' && ceoDashboard ? (
        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Dashboard CEO</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 }}>
            <Stat label="Tổng nhân sự" value={ceoDashboard.total_employees} />
            <Stat label="Tổng task" value={ceoDashboard.task_stats.total} />
            <Stat label="Task overdue" value={ceoDashboard.overdue_tasks} />
            <Stat label="DAU" value={usage?.daily_active_users || 0} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                  <th style={{ padding: 8 }}>Top nhân sự</th>
                  <th style={{ padding: 8 }}>Phòng ban</th>
                  <th style={{ padding: 8 }}>KPI</th>
                </tr>
              </thead>
              <tbody>
                {ceoDashboard.top_employees.slice(0, 10).map((item) => (
                  <tr key={item.user_id} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 8 }}>{item.full_name}</td>
                    <td style={{ padding: 8 }}>{item.dept_name}</td>
                    <td style={{ padding: 8 }}>{item.kpi_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {me?.role === 'ceo' ? (
        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Báo cáo CEO</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
            <Stat label="WAU" value={usage?.weekly_active_users || 0} />
            <Stat label="MAU" value={usage?.monthly_active_users || 0} />
            <Stat label="Heatmap ngày có dữ liệu" value={ceoHeatmap?.heatmap.filter((x) => x.tasks_done > 0).length || 0} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                  <th style={{ padding: 8 }}>Phòng ban</th>
                  <th style={{ padding: 8 }}>Task trễ</th>
                  <th style={{ padding: 8 }}>Tỉ lệ trễ (%)</th>
                </tr>
              </thead>
              <tbody>
                {overdueByDept.map((item) => (
                  <tr key={item.dept_id} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 8 }}>{item.dept_name}</td>
                    <td style={{ padding: 8 }}>{item.overdue_count}</td>
                    <td style={{ padding: 8 }}>{item.overdue_rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                  <th style={{ padding: 8 }}>So sánh KPI quý</th>
                  <th style={{ padding: 8 }}>Điểm TB quý</th>
                </tr>
              </thead>
              <tbody>
                {(kpiComparison?.departments || []).map((item) => (
                  <tr key={item.dept_id} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 8 }}>{item.dept_name}</td>
                    <td style={{ padding: 8 }}>{item.avg_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {me?.role === 'staff' && staffDashboard ? (
        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Dashboard cá nhân</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 }}>
            <Stat label="Task hôm nay" value={staffDashboard.tasks_today.length} />
            <Stat label="Done tháng này" value={staffDashboard.tasks_done_this_month} />
            <Stat label="KPI tháng này" value={staffDashboard.kpi_current_month.total_score} />
            <Stat label="Xếp loại" value={staffDashboard.kpi_current_month.grade} />
          </div>
        </section>
      ) : null}

      {error ? <p style={{ color: '#b91c1c', margin: 0 }}>{error}</p> : null}
      {notice ? <p style={{ color: '#166534', margin: 0 }}>{notice}</p> : null}
    </main>
  );
}

const cardStyle: CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: 16,
  display: 'grid',
  gap: 10
};

const inputStyle: CSSProperties = {
  padding: 8,
  border: '1px solid #cbd5e1',
  borderRadius: 6
};

const btnPrimary: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 6,
  border: 'none',
  background: '#2563eb',
  color: '#fff'
};

const btnSecondary: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  background: '#fff'
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <article style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 22 }}>{value}</div>
    </article>
  );
}
