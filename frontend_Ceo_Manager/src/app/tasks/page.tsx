'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authStore } from '@/store/authStore';
import { apiRequest } from '@/lib/api';
import { type KanbanResponse, type TaskListItem, type TaskStats, useTasks } from '@/hooks/useTasks';

type StaffOption = { id: string; full_name: string };

export default function TasksPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const { loading, fetchTasks, fetchStats, fetchKanban, createTask, updateTaskStatus } = useTasks();

  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [kanban, setKanban] = useState<KanbanResponse | null>(null);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [ready, setReady] = useState(false);

  // State hỗ trợ tính năng xem chi tiết Drawer nâng cao
  const [selectedTask, setSelectedTask] = useState<TaskListItem | null>(null);

  // Hàm bóc tách Token trực tiếp từ trình duyệt
  const getBrowserToken = (): string => {
    if (typeof window === 'undefined') return '';
    const token = 
      sessionStorage.getItem('kpi_access_token') || 
      localStorage.getItem('kpi_access_token') ||
      sessionStorage.getItem('token') ||
      localStorage.getItem('token') ||
      '';
    return token.replace(/^["']|["']$/g, '');
  };

  const loadData = useCallback(async (filters?: { search?: string; status?: string; priority?: string }) => {
    const currentToken = getBrowserToken();
    if (!currentToken) return;

    const taskSearch = filters?.search ?? search;
    const taskStatus = filters?.status ?? statusFilter;
    const taskPriority = filters?.priority ?? priorityFilter;

    try {
      const [tasksData, statsData, kanbanData] = await Promise.all([
        fetchTasks({ search: taskSearch, status: taskStatus, priority: taskPriority }),
        fetchStats(),
        fetchKanban({ search: taskSearch, priority: taskPriority })
      ]);
      setTasks(tasksData || []);
      setStats(statsData);
      setKanban(kanbanData);

      // Đồng bộ lại dữ liệu nếu đang mở Drawer chi tiết công việc
      if (selectedTask && tasksData) {
        const updated = tasksData.find(t => t.id === selectedTask.id);
        if (updated) setSelectedTask(updated);
      }
    } catch (err) {
      setError('Không tải được dữ liệu task từ hệ thống.');
    }
  }, [fetchKanban, fetchStats, fetchTasks, priorityFilter, search, statusFilter, selectedTask]);

  useEffect(() => {
    const currentToken = getBrowserToken();
    if (!currentToken) {
      router.replace('/auth/login');
      return;
    }

    authStore.bootstrap().then(async (profile) => {
      if (!profile) {
        router.replace('/auth/login');
        return;
      }
      if (profile.role !== 'manager' && profile.role !== 'ceo') {
        await authStore.signOut();
        router.replace('/auth/login');
        return;
      }
      
      setMe(profile);

      try {
        // ✅ ĐÃ SỬA: Đồng bộ gọi đường dẫn gốc /api/v1 kèm tham số token chuẩn mã nguồn fetch
        const staffData = await apiRequest<StaffOption[]>('/api/v1/users/staff', {
          method: 'GET',
          token: currentToken
        });
        setStaff(staffData || []);
      } catch {
        setStaff([]);
      }
      setReady(true);
    }).catch(() => router.replace('/auth/login'));
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    loadData().catch(() => setError('Không tải được dữ liệu task.'));
  }, [ready, search, statusFilter, priorityFilter, loadData]);

  function normalizeDeadline(value: string) {
    if (!value) return undefined;
    const normalized = value.length === 16 ? `${value}:00` : value;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) {
      throw new Error('Định dạng deadline không hợp lệ.');
    }
    return normalized;
  }

  async function onCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');

    try {
      if (!me || me.role !== 'manager') {
        setError('Chỉ Manager được phép tạo task.');
        return;
      }

      const created = await createTask({
        title,
        description: description || undefined,
        assignee_ids: assigneeId ? [assigneeId] : [],
        deadline: normalizeDeadline(deadline),
        priority
      });
      setNotice(created.warning || 'Tạo task thành công.');
      setTitle('');
      setDescription('');
      setDeadline('');
      setAssigneeId('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo task thất bại');
    }
  }

  async function onChangeStatus(taskId: string, nextStatus: 'todo' | 'in_progress' | 'done' | 'cancelled') {
    setError('');
    setNotice('');
    try {
      await updateTaskStatus(taskId, nextStatus, nextStatus === 'done' ? 100 : undefined);
      setNotice('Đã cập nhật trạng thái task.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật trạng thái thất bại');
    }
  }

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24, display: 'grid', gap: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Quản lý Task</h1>
          <p style={{ margin: '4px 0 0', color: '#475569' }}>Xin chào {me?.full_name || 'Manager'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => router.push('/kpi')}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
          >
            KPI
          </button>
          <button
            type="button"
            onClick={() => router.push('/settings')}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
          >
            Cài đặt
          </button>
          <button
            type="button"
            onClick={() => router.push('/notifications')}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
          >
            Thông báo
          </button>
          <button
            type="button"
            onClick={() => router.push('/onboarding')}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
          >
            Onboarding
          </button>
          <button
            type="button"
            onClick={() => authStore.signOut().then(() => router.replace('/auth/login'))}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Bộ lọc</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8 }}>
          <input aria-label="Tìm kiếm task" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tiêu đề task" style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}>
            <option value="">Tất cả trạng thái</option>
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}>
            <option value="">Tất cả ưu tiên</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button type="button" onClick={() => loadData()} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>Lọc</button>
        </div>
      </section>

      <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, display: 'grid', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Thống kê</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
          <Stat label="Tổng task" value={stats?.total || 0} />
          <Stat label="Đúng hạn" value={stats?.done_on_time || 0} />
          <Stat label="Trễ hạn" value={stats?.done_late || 0} />
          <Stat label="Đang làm" value={stats?.in_progress || 0} />
          <Stat label="Quá hạn" value={stats?.overdue || 0} />
          <Stat label="Đã hủy" value={stats?.cancelled || 0} />
        </div>
      </section>

      <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, display: 'grid', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Tạo task mới (Manager)</h2>
        <form onSubmit={onCreateTask} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1.4fr 1fr auto', gap: 8 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề" required style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }} />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả ngắn" style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }} />
          <select value={priority} onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')} style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }} />
          <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}>
            <option value="">Chưa gán</option>
            {staff.map((item) => (
              <option key={item.id} value={item.id}>{item.full_name}</option>
            ))}
          </select>
          <button disabled={loading} type="submit" style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: '#0f766e', color: '#fff', cursor: 'pointer' }}>
            {loading ? 'Đang lưu...' : 'Tạo'}
          </button>
        </form>
      </section>

      <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, display: 'grid', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Danh sách task</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                <th style={{ padding: 8 }}>Tiêu đề</th>
                <th style={{ padding: 8 }}>Assignee</th>
                <th style={{ padding: 8 }}>Ưu tiên</th>
                <th style={{ padding: 8 }}>Tiến độ</th>
                <th style={{ padding: 8 }}>Deadline</th>
                <th style={{ padding: 8 }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr 
                  key={task.id} 
                  style={{ borderTop: '1px solid #e2e8f0', cursor: 'pointer' }}
                  onClick={() => setSelectedTask(task)}
                >
                  <td style={{ padding: 8 }}>
                    <div style={{ fontWeight: 600 }}>{task.title}</div>
                    {task.is_overdue ? <small style={{ color: '#b91c1c' }}>Quá hạn</small> : null}
                  </td>
                  <td style={{ padding: 8 }}>{task.assignees?.map((a) => a.full_name).join(', ') || '-'}</td>
                  <td style={{ padding: 8 }}>{task.priority}</td>
                  <td style={{ padding: 8 }}>{task.progress_pct}%</td>
                  <td style={{ padding: 8 }}>{task.deadline ? new Date(task.deadline).toLocaleString('vi-VN') : '-'}</td>
                  <td style={{ padding: 8 }} onClick={(e) => e.stopPropagation()}>
                    <select value={task.status} onChange={(e) => onChangeStatus(task.id, e.target.value as 'todo' | 'in_progress' | 'done' | 'cancelled')} style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 6 }}>
                      <option value="todo">Todo</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Kanban tổng quan</h2>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {(['todo', 'in_progress', 'done'] as const).map((status) => (
            <article key={status} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
              <h3 style={{ marginTop: 0, textTransform: 'capitalize' }}>
                {status} ({kanban?.[status]?.count || 0})
              </h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {(kanban?.[status]?.tasks || []).slice(0, 8).map((task) => (
                  <li key={task.id}>{task.title}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* TÍCH HỢP DRAWER CHI TIẾT TASK NÂNG CAO */}
      {selectedTask && (
        <TaskDetailDrawerExtended
          task={selectedTask}
          currentUser={me?.full_name || 'Quản lý'}
          onClose={() => setSelectedTask(null)}
          onChangeStatus={onChangeStatus}
        />
      )}

      {error ? <p style={{ color: '#b91c1c', margin: 0 }}>{error}</p> : null}
      {notice ? <p style={{ color: '#166534', margin: 0 }}>{notice}</p> : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <article style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 24 }}>{value}</div>
    </article>
  );
}

function TaskDetailDrawerExtended({ task, currentUser, onClose, onChangeStatus }: any) {
  const [activeSection, setActiveSection] = useState('info');
  
  const [checklist, setChecklist] = useState([
    { id: 'c1', text: 'Kiểm tra nghiệp vụ phân hệ công việc', done: true },
    { id: 'c2', text: 'Tối ưu hóa các truy vấn danh sách', done: false }
  ]);
  const [comments, setComments] = useState([
    { id: 'cm1', text: 'Đã hoàn thành phân tích luồng dữ liệu.', author: 'Nhân viên phụ trách', date: '31/05/2026', time: '14:00', replies: [] }
  ]);

  const [newItem, setNewItem] = useState('');
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const doneCheck = checklist.filter(c => c.done).length;
  const pctCheck = checklist.length > 0 ? Math.round((doneCheck / checklist.length) * 100) : 0;

  const addChecklistItem = () => {
    if (!newItem.trim()) return;
    setChecklist([...checklist, { id: 'c' + Date.now(), text: newItem.trim(), done: false }]);
    setNewItem('');
  };

  const addCommentItem = () => {
    if (!newComment.trim()) return;
    setComments([...comments, {
      id: 'cm' + Date.now(),
      text: newComment.trim(),
      author: currentUser,
      date: new Date().toLocaleDateString('vi-VN'),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      replies: []
    }]);
    setNewComment('');
  };

  const addReplyItem = (commentId: string) => {
    if (!replyText.trim()) return;
    setComments(comments.map(c => c.id === commentId ? {
      ...c,
      replies: [...(c.replies || []), {
        id: 'r' + Date.now(),
        text: replyText.trim(),
        author: currentUser,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }] as any
    } : c));
    setReplyText('');
    setReplyTo(null);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
      <div 
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 460, background: '#fff', boxShadow: '-4px 0 30px rgba(0,0,0,0.12)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{task.title}</h3>
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 11, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 12, fontWeight: 600, textTransform: 'uppercase' }}>
                {task.status}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          {[
            { id: 'info', label: 'Thông tin' },
            { id: 'checklist', label: `Checklist (${doneCheck}/${checklist.length})` },
            { id: 'comments', label: `Ghi chú (${comments.length})` },
            { id: 'history', label: 'Lịch sử' }
          ].map(s => (
            <button 
              key={s.id} 
              onClick={() => setActiveSection(s.id)} 
              style={{ flex: 1, padding: '12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: activeSection === s.id ? '#2563eb' : '#64748b', fontWeight: activeSection === s.id ? 600 : 400, borderBottom: activeSection === s.id ? '2px solid #2563eb' : 'none' }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 20, flex: 1 }}>
          {activeSection === 'info' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <span style={{ fontSize: 12, color: '#94a3b8', display: 'block' }}>Người thực hiện</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{task.assignees?.map((a: any) => a.full_name).join(', ') || 'Chưa phân công'}</span>
              </div>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                <span style={{ fontSize: 12, color: '#94a3b8', display: 'block' }}>Hạn chót (Deadline)</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{task.deadline ? new Date(task.deadline).toLocaleString('vi-VN') : '-'}</span>
              </div>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                <span style={{ fontSize: 12, color: '#94a3b8', display: 'block' }}>Mức độ ưu tiên</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: task.priority === 'high' ? '#dc2626' : '#d97706' }}>{task.priority?.toUpperCase()}</span>
              </div>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Tiến độ hệ thống</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{task.progress_pct}%</span>
                </div>
                <div style={{ background: '#e2e8f0', borderRadius: 4, height: 6 }}>
                  <div style={{ width: `${task.progress_pct}%`, background: '#2563eb', height: '100%', borderRadius: 4 }} />
                </div>
              </div>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                <span style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Cập nhật trạng thái xử lý</span>
                <select value={task.status} onChange={(e) => onChangeStatus(task.id, e.target.value)} style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, width: '100%', outline: 'none' }}>
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          )}

          {activeSection === 'checklist' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Tiến độ Checklist con (PB071)</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>{pctCheck}%</span>
              </div>
              <div style={{ background: '#e2e8f0', borderRadius: 4, height: 6, marginBottom: 12 }}>
                <div style={{ width: `${pctCheck}%`, background: '#10b981', height: '100%', borderRadius: 4 }} />
              </div>
              {checklist.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
                  <input 
                    type="checkbox" 
                    checked={item.done} 
                    onChange={() => setChecklist(checklist.map(c => c.id === item.id ? { ...c, done: !c.done } : c))} 
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#2563eb' }} 
                  />
                  <span style={{ flex: 1, fontSize: 13, color: item.done ? '#94a3b8' : '#1e293b', textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
                  <button onClick={() => setChecklist(checklist.filter(c => c.id !== item.id))} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}>×</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                <input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Thêm mục checklist mới..." style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }} />
                <button onClick={addChecklistItem} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Thêm</button>
              </div>
            </div>
          )}

          {activeSection === 'comments' && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
                {comments.map(c => (
                  <div key={c.id} style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 10px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                      <span style={{ fontWeight: 600 }}>{c.author}</span>
                      <span>{c.date} {c.time}</span>
                    </div>
                    <p style={{ fontSize: 13, color: '#1e293b', margin: '2px 0' }}>{c.text}</p>
                    
                    {c.replies?.map((r: any) => (
                      <div key={r.id} style={{ background: '#fff', padding: 6, borderRadius: 4, marginTop: 4, borderLeft: '3px solid #cbd5e1', fontSize: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 10 }}>
                          <span style={{ fontWeight: 600, color: '#2563eb' }}>↪ {r.author}</span>
                          <span>{r.time}</span>
                        </div>
                        <p style={{ margin: '2px 0', color: '#334155' }}>{r.text}</p>
                      </div>
                    ))}

                    {replyTo === c.id ? (
                      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                        <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Nhập phản hồi..." style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 12 }} />
                        <button onClick={() => addReplyItem(c.id)} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>Gửi</button>
                      </div>
                    ) : (
                      <button onClick={() => setReplyTo(c.id)} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 11, cursor: 'pointer', marginTop: 4, padding: 0 }}>↪ Phản hồi</button>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Nhập ghi chú tiến độ..." style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }} />
                <button onClick={addCommentItem} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 13 }}>Gửi</button>
              </div>
            </div>
          )}

          {activeSection === 'history' && (
            <div style={{ position: 'relative', paddingLeft: 20, borderLeft: '2px solid #e2e8f0', marginLeft: 10 }}>
              <div style={{ marginBottom: 14, position: 'relative' }}>
                <span style={{ position: 'absolute', left: -26, background: '#2563eb', color: '#fff', borderRadius: '50%', width: 10, height: 10, display: 'inline-block' }} />
                <div style={{ fontSize: 12, color: '#64748b' }}>{task.created_at ? new Date(task.created_at).toLocaleString('vi-VN') : 'Vừa xong'}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>Hệ thống khởi tạo công việc ban đầu</div>
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: -26, background: '#f59e0b', color: '#fff', borderRadius: '50%', width: 10, height: 10, display: 'inline-block' }} />
                <div style={{ fontSize: 12, color: '#64748b' }}>Hiện tại</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>Đồng bộ trạng thái: <span style={{ color: '#2563eb' }}>{task.status}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}