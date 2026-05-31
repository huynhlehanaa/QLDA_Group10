'use client';

import { type CSSProperties, FormEvent, useCallback, useEffect, useState } from 'react';
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

  // 🆕 STATE ĐIỀU HƯỚNG TAB ĐỂ TRÁNH TẠO FILE MỚI (SP4)
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'settings' | 'notifications'>('dashboard');

  // 🆕 STATE MOCK PHỤC VỤ CÁC TÍNH NĂNG CÀI ĐẶT SP4 (PB208, PB209, PB210, PB228)
  const [companyName, setCompanyName] = useState('Công ty Công nghệ Toàn Cầu QLDA');
  const [workDays, setWorkDays] = useState('Thứ 2 - Thứ 6');
  const [workHours, setWorkHours] = useState('08:00 - 17:30');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyInApp, setNotifyInApp] = useState(true);

  // 🆕 STATE MOCK TRUNG TÂM THÔNG BÁO SP4 (PB229, PB230, PB231)
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'task' | 'kpi'>('all');
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'task', text: 'Manager Nguyễn Thanh Hà vừa giao cho bạn một công việc mới: "Review code API Gateway".', time: '10 phút trước', isRead: false },
    { id: 2, type: 'kpi', text: 'Điểm tổng kết KPI tháng của phòng ban đã được CEO phê duyệt điều chỉnh ngoại lệ.', time: '1 giờ trước', isRead: false },
    { id: 3, type: 'task', text: 'Cảnh báo: Công việc "Thiết kế UI module Login" chỉ còn 24 giờ đến hạn deadline!', time: '2 giờ trước', isRead: true },
    { id: 4, type: 'task', text: 'Nhân viên Trần Minh Khoa đã để lại bình luận mới trong công việc của phòng ban.', time: '1 ngày trước', isRead: true }
  ]);

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

  // Hàm xử lý đánh dấu đọc toàn bộ thông báo (PB230)
  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    setNotice('Đã đánh dấu đọc toàn bộ thông báo hệ thống.');
  };

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24, display: 'grid', gap: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Báo cáo & Dashboard</h1>
          <p style={{ margin: '4px 0 0', color: '#475569' }}>Xin chào {me?.full_name || 'User'} ({me?.role?.toUpperCase()})</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setCurrentTab('dashboard')} style={currentTab === 'dashboard' ? btnPrimary : btnSecondary}>Dashboard</button>
          <button type="button" onClick={() => router.push('/tasks')} style={btnSecondary}>Task</button>
          <button type="button" onClick={() => router.push('/kpi')} style={btnSecondary}>KPI</button>
          <button type="button" onClick={() => setCurrentTab('settings')} style={currentTab === 'settings' ? btnPrimary : btnSecondary}>Cài đặt</button>
          <button type="button" onClick={() => setCurrentTab('notifications')} style={currentTab === 'notifications' ? btnPrimary : btnSecondary}>
            Thông báo ({notifications.filter(n => !n.isRead).length})
          </button>
          <button type="button" onClick={() => router.push('/onboarding')} style={btnSecondary}>Onboarding</button>
          <button type="button" onClick={() => authStore.signOut().then(() => router.replace('/auth/login'))} style={btnSecondary}>Đăng xuất</button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* PHÂN HỆ VIEW 1: DASHBOARD CHÍNH (ĐÃ BAO GỒM GANTT SVG & QUYỂN CEO/MANAGER) */}
      {/* ========================================================================= */}
      {currentTab === 'dashboard' && (
        <>
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

              {/* NÂNG CẤP BIỂU ĐỒ GANTT CHART TRỰC QUAN BẰNG SVG (PB159-161) */}
              <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0', marginTop: 10 }}>
                {gantt?.tasks && gantt.tasks.length > 0 ? (() => {
                  const colW = ganttView === 'day' ? 50 : ganttView === 'week' ? 35 : 25;
                  const leftPad = 200;
                  const rowH = 40;
                  
                  const timeColumns = Array.from({ length: 14 }, (_, i) => i);
                  const svgW = leftPad + timeColumns.length * colW + 20;
                  const svgH = 45 + Math.min(gantt.tasks.length, 10) * rowH;

                  const statusColor: Record<string, string> = { 
                    todo: "#94a3b8", in_progress: "#3b82f6", done: "#10b981", cancelled: "#ef4444" 
                  };

                  return (
                    <svg width={svgW} height={svgH} style={{ display: 'block', fontFamily: 'inherit' }}>
                      <rect x="0" y="0" width={svgW} height="35" fill="#f8fafc" />
                      <line x1="0" y1="35" x2={svgW} y2="35" stroke="#e2e8f0" strokeWidth="1" />

                      {timeColumns.map((col) => (
                        <g key={col}>
                          <line x1={leftPad + col * colW} y1="35" x2={leftPad + col * colW} y2={svgH} stroke="#f1f5f9" strokeWidth="1" />
                          <text x={leftPad + col * colW + colW / 2} y="22" textAnchor="middle" fontSize="10" fill="#64748b">
                            {ganttView === 'day' ? `N+${col}` : ganttView === 'week' ? `W+${col}` : `M+${col}`}
                          </text>
                        </g>
                      ))}

                      {gantt.tasks.slice(0, 10).map((task, idx) => {
                        const y = 35 + idx * rowH;
                        const startPos = (idx * 1.3) % 6; 
                        const startX = leftPad + startPos * colW;
                        const barW = Math.max(colW * 2.5, (task.progress_pct || 40) * 2.2);

                        return (
                          <g key={task.id}>
                            <rect x="0" y={y} width={svgW} height={rowH} fill={idx % 2 === 0 ? "#fff" : "#fafafa"} opacity="0.5" />
                            
                            <text x="12" y={y + rowH / 2 + 4} fontSize="12" fontWeight="500" fill="#1e293b">
                              {task.title.length > 24 ? task.title.slice(0, 24) + '...' : task.title}
                            </text>

                            <rect x={startX} y={y + 10} width={barW} height={rowH - 20} rx="4" fill={statusColor[task.status] || "#3b82f6"} opacity="0.15" />
                            <rect x={startX} y={y + 10} width={barW * (task.progress_pct || 0) / 100} height={rowH - 20} rx="4" fill={statusColor[task.status] || "#3b82f6"} />

                            <text x={startX + barW + 8} y={y + rowH / 2 + 4} fontSize="11" fill="#64748b">
                              {task.assignees.map(a => a.full_name.split(' ').pop()).join(', ') || 'N/A'} ({task.progress_pct}%)
                            </text>

                            <line x1="0" y1={y + rowH} x2={svgW} y2={y + rowH} stroke="#f1f5f9" strokeWidth="1" />
                          </g>
                        );
                      })}
                    </svg>
                  );
                })() : (
                  <p style={{ padding: 16, margin: 0, color: '#64748b', fontSize: 13, textAlign: 'center' }}>Không có dữ liệu tiến độ Gantt.</p>
                )}
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

              {/* BIỂU ĐỒ CỘT SO SÁNH KPI PHÒNG BAN THEO QUÝ (PB169) */}
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: 16, marginTop: 10 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: '0 0 12px' }}>So sánh dữ liệu biến động KPI phòng ban quý {quarter}</h3>
                {kpiComparison?.departments && kpiComparison.departments.length > 0 ? (() => {
                  const baseColors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
                  return (
                    <div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                        {kpiComparison.departments.map((d, i) => (
                          <div key={d.dept_id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 12, height: 12, borderRadius: 3, background: baseColors[i % baseColors.length] }} />
                            <span style={{ fontSize: 12, color: '#475569' }}>{d.dept_name}</span>
                          </div>
                        ))}
                      </div>
                      <svg width="100%" viewBox="0 0 600 160" style={{ display: 'block' }}>
                        {[25, 50, 75, 100].map((val) => (
                          <g key={val}>
                            <line x1="40" y1={140 - (val * 1.1)} x2="580" y2={140 - (val * 1.1)} stroke="#f1f5f9" strokeWidth="1" />
                            <text x="30" y={144 - (val * 1.1)} textAnchor="end" fontSize="9" fill="#94a3b8">{val}</text>
                          </g>
                        ))}
                        {kpiComparison.departments.map((item, idx) => {
                          const barW = 32;
                          const gapSpace = 24;
                          const startX = 60 + idx * (barW + gapSpace);
                          const barH = (item.avg_score || 0) * 1.1;
                          return (
                            <g key={item.dept_id}>
                              <rect x={startX} y={140 - barH} width={barW} height={barH} rx="4" fill={baseColors[idx % baseColors.length]} opacity="0.85" />
                              <text x={startX + barW / 2} y={132 - barH} textAnchor="middle" fontSize="10" fontWeight="700" fill={baseColors[idx % baseColors.length]}>{item.avg_score}</text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  );
                })() : (
                  <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Không tìm thấy thông tin so sánh KPI.</p>
                )}
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
        </>
      )}

      {/* ========================================================================= */}
      {/* 🆕 PHÂN HỆ VIEW 2: TRANG CÀI ĐẶT HỆ THỐNG SP4 (PB208, PB209, PB210, PB228) */}
      {/* ========================================================================= */}
      {currentTab === 'settings' && (
        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 20, color: '#1e293b' }}>⚙️ Cài đặt hệ thống & cấu hình UX (Sprint 4)[cite: 1]</h2>
          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
          
          {/* Nhóm quyền CEO: Cấu hình doanh nghiệp */}
          {me?.role === 'ceo' ? (
            <div style={{ display: 'grid', gap: 14, background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: 15, color: '#0f766e' }}>👑 Quyền hạn CEO: Cấu hình doanh nghiệp[cite: 1]</h3>
              
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tên công ty nhận diện (PB208)[cite: 1]</label>
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={{ ...inputStyle, width: '100%', maxWidth: 400 }} />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tải lên Logo Công ty (PB208)[cite: 1]</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 50, height: 50, background: '#cbd5e1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>LOGO</div>
                  <input type="file" disabled style={{ fontSize: 13 }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Cấu hình ngày làm việc trong tuần (PB209)[cite: 1]</label>
                  <select value={workDays} onChange={(e) => setWorkDays(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                    <option value="Thứ 2 - Thứ 6">Thứ 2 – Thứ 6 (Nghỉ Thứ 7, Chủ Nhật)</option>
                    <option value="Thứ 2 - Thứ 7">Thứ 2 – Thứ 7 (Chỉ nghỉ Chủ Nhật)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Giờ làm việc hành chính (PB210)[cite: 1]</label>
                  <input value={workHours} onChange={(e) => setWorkHours(e.target.value)} placeholder="Ví dụ: 08:00 - 17:30" style={{ ...inputStyle, width: '100%' }} />
                </div>
              </div>
            </div>
          ) : null}

          {/* Cấu hình chung cho cả Manager và Nhân viên */}
          <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: '#1e3a8a' }}>👤 Cài đặt cấu hình cá nhân</h3>
            
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Ngôn ngữ hiển thị (PB211)[cite: 1]</label>
              <select style={{ ...inputStyle, width: 200 }}>
                <option value="vi">Tiếng Việt (Mặc định)</option>
                <option value="en">English</option>
              </select>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: 14, borderRadius: 6, display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Tùy chọn nhận kênh thông báo (PB228)[cite: 1]</label>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} /> Nhận thông báo qua Email[cite: 1]
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={notifyInApp} onChange={(e) => setNotifyInApp(e.target.checked)} /> Nhận thông báo nổi trong ứng dụng (In-app)[cite: 1]
                </label>
              </div>
            </div>
          </div>

          <button type="button" onClick={() => setNotice('Đã cập nhật toàn bộ cấu hình cài đặt hệ thống.')} style={{ ...btnPrimary, width: 'fit-content', marginTop: 10 }}>
            Lưu tất cả thay đổi[cite: 1]
          </button>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 🆕 PHÂN HỆ VIEW 3: TRUNG TÂM THÔNG BÁO REALTIME SP4 (PB229, PB230, PB231)  */}
      {/* ========================================================================= */}
      {currentTab === 'notifications' && (
        <section style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 20, color: '#1e293b' }}>🔔 Trung tâm thông báo hệ thống (PB229)[cite: 1]</h2>
            <button type="button" onClick={handleMarkAllAsRead} style={btnSecondary}>
              ✓ Đánh dấu đã đọc tất cả (PB230)[cite: 1]
            </button>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />

          {/* Bộ lọc phân loại thông báo (PB231) */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
            <button type="button" onClick={() => setNotificationFilter('all')} style={{ ...btnSecondary, background: notificationFilter === 'all' ? '#f1f5f9' : '#fff', fontWeight: notificationFilter === 'all' ? 600 : 400, padding: '4px 12px', fontSize: 12 }}>Tất cả[cite: 1]</button>
            <button type="button" onClick={() => setNotificationFilter('task')} style={{ ...btnSecondary, background: notificationFilter === 'task' ? '#f1f5f9' : '#fff', fontWeight: notificationFilter === 'task' ? 600 : 400, padding: '4px 12px', fontSize: 12 }}>Liên quan đến Task[cite: 1]</button>
            <button type="button" onClick={() => setNotificationFilter('kpi')} style={{ ...btnSecondary, background: notificationFilter === 'kpi' ? '#f1f5f9' : '#fff', fontWeight: notificationFilter === 'kpi' ? 600 : 400, padding: '4px 12px', fontSize: 12 }}>Liên quan đến KPI[cite: 1]</button>
          </div>

          <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
            {notifications
              .filter(n => notificationFilter === 'all' || n.type === notificationFilter)
              .map((n) => (
                <div 
                  key={n.id} 
                  onClick={() => setNotifications(notifications.map(item => item.id === n.id ? { ...item, isRead: true } : item))}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    background: n.isRead ? '#fff' : '#eff6ff',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ paddingRight: 14 }}>
                    <p style={{ margin: 0, fontSize: 14, color: '#1e293b', fontWeight: n.isRead ? 400 : 600 }}>
                      {n.type === 'task' ? '📋 ' : '🎯 '} {n.text}
                    </p>
                    <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginTop: 4 }}>{n.time}</span>
                  </div>
                  {!n.isRead && <div style={{ width: 8, height: 8, background: '#2563eb', borderRadius: '50%', flexShrink: 0 }} />}
                </div>
            ))}
          </div>
        </section>
      )}

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
  color: '#fff',
  cursor: 'pointer'
};

const btnSecondary: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  background: '#fff',
  cursor: 'pointer'
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <article style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 22 }}>{value}</div>
    </article>
  );
}

/*'use client';

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
          <button type="button" onClick={() => router.push('/settings')} style={btnSecondary}>Cài đặt</button>
          <button type="button" onClick={() => router.push('/notifications')} style={btnSecondary}>Thông báo</button>
          <button type="button" onClick={() => router.push('/onboarding')} style={btnSecondary}>Onboarding</button>
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

          {// 🆕 NÂNG CẤP BIỂU ĐỒ GANTT CHART TRỰC QUAN (PB159-161) }
          <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0', marginTop: 10 }}>
            {gantt?.tasks && gantt.tasks.length > 0 ? (() => {
              const colW = ganttView === 'day' ? 50 : ganttView === 'week' ? 35 : 25;
              const leftPad = 200;
              const rowH = 40;
              
              const timeColumns = Array.from({ length: 14 }, (_, i) => i);
              const svgW = leftPad + timeColumns.length * colW + 20;
              const svgH = 45 + Math.min(gantt.tasks.length, 10) * rowH;

              const statusColor: Record<string, string> = { 
                todo: "#94a3b8", in_progress: "#3b82f6", done: "#10b981", cancelled: "#ef4444" 
              };

              return (
                <svg width={svgW} height={svgH} style={{ display: 'block', fontFamily: 'inherit' }}>
                  <rect x="0" y="0" width={svgW} height="35" fill="#f8fafc" />
                  <line x1="0" y1="35" x2={svgW} y2="35" stroke="#e2e8f0" strokeWidth="1" />

                  {timeColumns.map((col) => (
                    <g key={col}>
                      <line x1={leftPad + col * colW} y1="35" x2={leftPad + col * colW} y2={svgH} stroke="#f1f5f9" strokeWidth="1" />
                      <text x={leftPad + col * colW + colW / 2} y="22" textAnchor="middle" fontSize="10" fill="#64748b">
                        {ganttView === 'day' ? `N+${col}` : ganttView === 'week' ? `W+${col}` : `M+${col}`}
                      </text>
                    </g>
                  ))}

                  {gantt.tasks.slice(0, 10).map((task, idx) => {
                    const y = 35 + idx * rowH;
                    const startPos = (idx * 1.3) % 6; 
                    const startX = leftPad + startPos * colW;
                    const barW = Math.max(colW * 2.5, (task.progress_pct || 40) * 2.2);

                    return (
                      <g key={task.id}>
                        <rect x="0" y={y} width={svgW} height={rowH} fill={idx % 2 === 0 ? "#fff" : "#fafafa"} opacity="0.5" />
                        
                        <text x="12" y={y + rowH / 2 + 4} fontSize="12" fontWeight="500" fill="#1e293b">
                          {task.title.length > 24 ? task.title.slice(0, 24) + '...' : task.title}
                        </text>

                        <rect x={startX} y={y + 10} width={barW} height={rowH - 20} rx="4" fill={statusColor[task.status] || "#3b82f6"} opacity="0.15" />
                        <rect x={startX} y={y + 10} width={barW * (task.progress_pct || 0) / 100} height={rowH - 20} rx="4" fill={statusColor[task.status] || "#3b82f6"} />

                        <text x={startX + barW + 8} y={y + rowH / 2 + 4} fontSize="11" fill="#64748b">
                          {task.assignees.map(a => a.full_name.split(' ').pop()).join(', ') || 'N/A'} ({task.progress_pct}%)
                        </text>

                        <line x1="0" y1={y + rowH} x2={svgW} y2={y + rowH} stroke="#f1f5f9" strokeWidth="1" />
                      </g>
                    );
                  })}
                </svg>
              );
            })() : (
              <p style={{ padding: 16, margin: 0, color: '#64748b', fontSize: 13, textAlign: 'center' }}>Không có dữ liệu tiến độ Gantt.</p>
            )}
          </div>

          {// 📝 ĐOẠN CODE BẢNG GANTT THÔ CŨ ĐÃ ĐƯỢC CHUYỂN THÀNH GHI CHÚ ĐỂ GIỮ LẠI THEO YÊU CẦU }
          {/* <div style={{ overflowX: 'auto' }}>
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
          //}
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
*/