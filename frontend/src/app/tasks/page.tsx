'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authStore } from '@/store/authStore';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { type KanbanResponse, type TaskListItem, type TaskStats, useTasks } from '@/hooks/useTasks';

type StaffOption = { id: string; full_name: string };

export default function TasksPage() {
  const router = useRouter();
  const { accessToken, me } = useAuthStore();
  const { loading, fetchTasks, fetchKanban, fetchStats, createTask, updateTaskStatus } = useTasks();

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

  const loadData = useCallback(async (filters?: { search?: string; status?: string; priority?: string }) => {
    if (!accessToken) return;
    const taskSearch = filters?.search ?? search;
    const taskStatus = filters?.status ?? statusFilter;
    const taskPriority = filters?.priority ?? priorityFilter;

    const [tasksData, statsData, kanbanData] = await Promise.all([
      fetchTasks({ search: taskSearch, status: taskStatus, priority: taskPriority }),
      fetchStats(),
      fetchKanban({ search: taskSearch, priority: taskPriority })
    ]);
    setTasks(tasksData);
    setStats(statsData);
    setKanban(kanbanData);
  }, [accessToken, fetchKanban, fetchStats, fetchTasks, priorityFilter, search, statusFilter]);

  useEffect(() => {
    if (!accessToken) {
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
      try {
        const staffData = await apiRequest<StaffOption[]>('/api/v1/users/staff', { token: accessToken });
        setStaff(staffData);
      } catch {
        setStaff([]);
      }
      setReady(true);
    }).catch(() => router.replace('/auth/login'));
  }, [accessToken, router]);

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
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => router.push('/kpi')}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
          >
            KPI
          </button>
          <button
            type="button"
            onClick={() => authStore.signOut().then(() => router.replace('/auth/login'))}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
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
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}>
            <option value="">Tất cả ưu tiên</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button type="button" onClick={() => loadData()} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff' }}>Lọc</button>
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
          <button disabled={loading} type="submit" style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: '#0f766e', color: '#fff' }}>
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
                <tr key={task.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: 8 }}>
                    <div style={{ fontWeight: 600 }}>{task.title}</div>
                    {task.is_overdue ? <small style={{ color: '#b91c1c' }}>Quá hạn</small> : null}
                  </td>
                  <td style={{ padding: 8 }}>{task.assignees.map((a) => a.full_name).join(', ') || '-'}</td>
                  <td style={{ padding: 8 }}>{task.priority}</td>
                  <td style={{ padding: 8 }}>{task.progress_pct}%</td>
                  <td style={{ padding: 8 }}>{task.deadline ? new Date(task.deadline).toLocaleString('vi-VN') : '-'}</td>
                  <td style={{ padding: 8 }}>
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
                {status} ({kanban?.[status].count || 0})
              </h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {(kanban?.[status].tasks || []).slice(0, 8).map((task) => (
                  <li key={task.id}>{task.title}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

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
