import { type CSSProperties, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useDashboard } from '../hooks/useDashboard';
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
  type UsageResult,
} from '../hooks/useDashboard';

export default function CeoManagerDashboardPage() {
  const navigate = useNavigate();
  
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
  } = useDashboard();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [calendarDate, setCalendarDate] = useState(now.toISOString().slice(0, 10));
  const [ganttView, setGanttView] = useState<'day' | 'week' | 'month'>('week');

  const [gantt, setGantt] = useState<GanttResult | null>(null);
  const [, setCalendarMonth] = useState<CalendarMonthResult | null>(null);
  const [, setCalendarWeek] = useState<CalendarWeekResult | null>(null);
  const [, setCalendarDay] = useState<CalendarDayResult | null>(null);
  const [, setPerformance] = useState<PerformanceReportResult | null>(null);
  const [, setOverdueByDept] = useState<OverdueByDeptItem[]>([]);
  const [kpiComparison, setKpiComparison] = useState<KpiComparisonResult | null>(null);
  const [, setCeoDashboard] = useState<CeoDashboardResult | null>(null);
  const [, setCeoHeatmap] = useState<CeoHeatmapResult | null>(null);
  const [, setUsage] = useState<UsageResult | null>(null);
  const [, setManagerDashboard] = useState<ManagerDashboardResult | null>(null);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // STATE ĐIỀU HƯỚNG TAB TRÁNH TẠO FILE MỚI (SP4)
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'settings' | 'notifications'>('dashboard');

  // STATE MOCK PHỤC VỤ CÁC TÍNH NĂNG CÀI ĐẶT SP4
  const [companyName, setCompanyName] = useState('Công ty Công nghệ Toàn Cầu QLDA');
  const [notifyInApp, setNotifyInApp] = useState(true);

  // STATE MOCK TRUNG TÂM THÔNG BÁO SP4
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
      return;
    }
  }, [accessToken, calendarDate, fetchCalendarDay, fetchCalendarMonth, fetchCalendarWeek, fetchCeoDashboard, fetchCeoHeatmap, fetchGantt, fetchKpiComparison, fetchManagerDashboard, fetchOverdueByDept, fetchPerformanceReport, fromDate, ganttView, me, month, quarter, toDate, year]);

  useEffect(() => {
    if (!accessToken) {
      navigate('/login');
      return;
    }
    loadData().catch((err) => setError(err instanceof Error ? err.message : 'Không tải được dữ liệu Dashboard'));
  }, [accessToken, loadData, navigate]);

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    setNotice('Đã đánh dấu đọc toàn bộ thông báo hệ thống.');
  };

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24, display: 'grid', gap: 16, color: '#1e293b' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Báo cáo & Dashboard (CEO/Manager)</h1>
          <p style={{ margin: '4px 0 0', color: '#475569' }}>Xin chào {me?.full_name || 'User'} ({me?.role?.toUpperCase()})</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setCurrentTab('dashboard')} style={currentTab === 'dashboard' ? btnPrimary : btnSecondary}>Dashboard</button>
          <button type="button" onClick={() => navigate('/tasks')} style={btnSecondary}>Task</button>
          <button type="button" onClick={() => navigate('/kpi')} style={btnSecondary}>KPI</button>
          <button type="button" onClick={() => setCurrentTab('settings')} style={currentTab === 'settings' ? btnPrimary : btnSecondary}>Cài đặt</button>
          <button type="button" onClick={() => setCurrentTab('notifications')} style={currentTab === 'notifications' ? btnPrimary : btnSecondary}>
            Thông báo ({notifications.filter(n => !n.isRead).length})
          </button>
          <button type="button" onClick={() => navigate('/login')} style={btnSecondary}>Đăng xuất</button>
        </div>
      </header>

      {/* VIEW 1: DASHBOARD CHÍNH CHỨA BIỂU ĐỒ SVG GANTT & KPI COMLUMN CHART */}
      {currentTab === 'dashboard' && (
        <>
          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Bộ lọc báo cáo</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.5fr 1.5fr auto', gap: 8 }}>
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={inputStyle} />
              <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} style={inputStyle} />
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
            <h2 style={{ margin: 0, fontSize: 18 }}>Gantt tiến độ phòng ban</h2>
            <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0', marginTop: 10 }}>
              {gantt?.tasks && gantt.tasks.length > 0 ? (
                <svg width="100%" height={45 + Math.min(gantt.tasks.length, 10) * 40} style={{ display: 'block', minWidth: '800px' }}>
                  <rect x="0" y="0" width="100%" height="35" fill="#f8fafc" />
                  {Array.from({ length: 14 }, (_, i) => i).map((col) => (
                    <g key={col}>
                      <text x={200 + col * 45 + 22.5} y="22" textAnchor="middle" fontSize="10" fill="#64748b">
                        {ganttView === 'day' ? `N+${col}` : ganttView === 'week' ? `W+${col}` : `M+${col}`}
                      </text>
                    </g>
                  ))}
                  {gantt.tasks.slice(0, 10).map((task, idx) => {
                    const yRow = 35 + idx * 40;
                    const startX = 200 + ((idx * 1.3) % 6) * 45;
                    const barW = Math.max(45 * 2.5, (task.progress_pct || 40) * 2.2);
                    const statusColor: Record<string, string> = { todo: "#94a3b8", in_progress: "#3b82f6", done: "#10b981", cancelled: "#ef4444" };
                    
                    return (
                      <g key={task.id}>
                        <text x="12" y={yRow + 24} fontSize="12" fontWeight="500" fill="#1e293b">
                          {task.title.length > 20 ? task.title.slice(0, 20) + '...' : task.title}
                        </text>
                        <rect x={startX} y={yRow + 10} width={barW} height="20" rx="4" fill={statusColor[task.status] || "#3b82f6"} opacity="0.15" />
                        <rect x={startX} y={yRow + 10} width={barW * (task.progress_pct || 0) / 100} height="20" rx="4" fill={statusColor[task.status] || "#3b82f6"} />
                      </g>
                    );
                  })}
                </svg>
              ) : (
                <p style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>Không có dữ liệu tiến độ Gantt.</p>
              )}
            </div>
          </section>

          {me?.role === 'ceo' && kpiComparison && (
            <section style={cardStyle}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>So sánh dữ liệu biến động KPI phòng ban quý {quarter}</h3>
              <svg width="100%" viewBox="0 0 600 160" style={{ marginTop: 12 }}>
                {kpiComparison.departments.map((item, idx) => {
                  const barH = (item.avg_score || 0) * 1.1;
                  return (
                    <rect key={item.dept_id} x={60 + idx * 56} y={140 - barH} width="32" height={barH} rx="4" fill="#6366f1" />
                  );
                })}
              </svg>
            </section>
          )}
        </>
      )}

      {/* VIEW 2: PHÂN HỆ CÀI ĐẶT HỆ THỐNG SP4 */}
      {currentTab === 'settings' && (
        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 20 }}>⚙️ Cài đặt hệ thống (Sprint 4)</h2>
          {me?.role === 'ceo' && (
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginTop: 10 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>Tên công ty nhận diện</label>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={{ ...inputStyle, width: '100%', maxWidth: 400, marginTop: 4 }} />
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={notifyInApp} onChange={(e) => setNotifyInApp(e.target.checked)} /> Nhận thông báo nổi trong ứng dụng (In-app)
            </label>
          </div>
          <button type="button" onClick={() => setNotice('Đã cập nhật toàn bộ cấu hình.')} style={{ ...btnPrimary, width: 'fit-content', marginTop: 12 }}>Lưu thay đổi</button>
        </section>
      )}

      {/* VIEW 3: TRUNG TÂM THÔNG BÁO SP4 */}
      {currentTab === 'notifications' && (
        <section style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>🔔 Trung tâm thông báo hệ thống</h2>
            <button type="button" onClick={handleMarkAllAsRead} style={btnSecondary}>✓ Đánh dấu đã đọc tất cả</button>
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {notifications.map((n) => (
              <div key={n.id} style={{ padding: 12, borderRadius: 6, border: '1px solid #e2e8f0', background: n.isRead ? '#fff' : '#eff6ff' }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: n.isRead ? 400 : 600 }}>{n.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {notice && <p style={{ color: '#166534', margin: 0 }}>{notice}</p>}
      {error && <p style={{ color: '#b91c1c', margin: 0 }}>{error}</p>}
    </main>
  );
}

const cardStyle: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, display: 'grid', gap: 10 };
const inputStyle: CSSProperties = { padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 };
const btnPrimary: CSSProperties = { padding: '8px 12px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' };
const btnSecondary: CSSProperties = { padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' };