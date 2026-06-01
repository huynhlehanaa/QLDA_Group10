'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authStore } from '@/store/authStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUsers } from '@/hooks/useUsers';
import {
  type Epic,
  type KanbanResponse,
  type CreateTaskPayload,
  type TaskDetail,
  type TaskFilters,
  type TaskListItem,
  type TaskPriority,
  type TaskStats,
  type TaskStatus,
  type WorkloadItem,
  useTasks
} from '@/hooks/useTasks';
import type { UserItem } from '@/hooks/types';

type TaskApi = ReturnType<typeof useTasks>;

const statusLabels: Record<TaskStatus, string> = {
  todo: 'Chưa làm',
  in_progress: 'Đang làm',
  done: 'Hoàn thành',
  cancelled: 'Đã hủy'
};

const priorityLabels: Record<TaskPriority, string> = {
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp'
};

const draftKey = 'task_create_draft';

export default function TasksPage() {
  const router = useRouter();
  const { accessToken, me } = useAuthStore();
  const taskApi = useTasks();
  const userApi = useUsers();
  const { fetchTasks, fetchKanban, fetchStats, fetchEpics, fetchWorkload } = taskApi;
  const { listStaff } = userApi;
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [kanban, setKanban] = useState<KanbanResponse | null>(null);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [staff, setStaff] = useState<UserItem[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [workload, setWorkload] = useState<WorkloadItem[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({ sort_by: 'deadline', sort_dir: 'asc' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const role = me?.role === 'ceo' || me?.role === 'manager' ? me.role : null;
  const isManager = role === 'manager';

  const loadData = useCallback(async () => {
    if (!role) return;
    setError('');
    const [taskList, kanbanData, statData, epicList] = await Promise.all([
      fetchTasks(filters),
      fetchKanban(filters),
      fetchStats(filters.deadline_from, filters.deadline_to),
      fetchEpics().catch(() => [])
    ]);
    setTasks(taskList);
    setKanban(kanbanData);
    setStats(statData);
    setEpics(epicList);

    if (isManager) {
      const [staffList, workloadData] = await Promise.all([
        listStaff().catch(() => []),
        fetchWorkload().catch(() => [])
      ]);
      setStaff(staffList);
      setWorkload(workloadData);
    }
  }, [fetchEpics, fetchKanban, fetchStats, fetchTasks, fetchWorkload, filters, isManager, listStaff, role]);

  useEffect(() => {
    if (!accessToken) {
      router.replace('/auth/login');
      return;
    }
    authStore.bootstrap().then(async (profile) => {
      if (!profile || (profile.role !== 'manager' && profile.role !== 'ceo')) {
        await authStore.signOut();
        router.replace('/auth/login');
        return;
      }
      setReady(true);
    }).catch(() => router.replace('/auth/login'));
  }, [accessToken, router]);

  useEffect(() => {
    if (!ready || !role) return;
    loadData().catch((err) => setError(err instanceof Error ? err.message : 'Không tải được dữ liệu công việc.'));
  }, [ready, role, loadData]);

  async function runAction(action: () => Promise<unknown>, success: string, reload = true) {
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(success);
      if (reload) await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Thao tác thất bại.');
    }
  }

  async function openTask(taskId: string) {
    setError('');
    try {
      setSelectedTask(await taskApi.fetchTaskDetail(taskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không mở được chi tiết công việc.');
    }
  }

  if (!ready || !role) {
    return <main className="shell"><section className="panel">Đang kiểm tra phiên đăng nhập...</section></main>;
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">K</div>
          <div>
            <strong>KPI Nội Bộ</strong>
            <span>Quản lý công việc</span>
          </div>
        </div>
        <nav className="navList">
          <button type="button" className="navItem" onClick={() => router.push('/dashboard')}><span>O</span>Tổng quan</button>
          <button type="button" className="navItem active"><span>T</span>Công việc</button>
          <button type="button" className="navItem" onClick={() => router.push('/kpi')}><span>K</span>KPI</button>
        </nav>
        <button type="button" className="ghostButton" onClick={() => authStore.signOut().then(() => router.replace('/auth/login'))}>
          Đăng xuất
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Hệ thống quản trị công việc và KPI nội bộ</p>
            <h1>Quản lý công việc</h1>
          </div>
          <div className="userChip">
            <div className="avatar">{me?.full_name?.charAt(0).toUpperCase() || 'U'}</div>
            <div>
              <strong>{me?.full_name}</strong>
              <span>{role.toUpperCase()}</span>
            </div>
          </div>
        </header>

        {notice ? <div className="notice success">{notice}</div> : null}
        {error ? <div className="notice error">{error}</div> : null}

        <TaskMetrics stats={stats} />

        {isManager ? (
          <TaskCreatePanel
            staff={staff}
            tasks={tasks}
            epics={epics}
            loading={taskApi.loading}
            onCreate={(payload) => runAction(async () => {
              const created = await taskApi.createTask(payload);
              if (created.warning) setNotice(created.warning);
              localStorage.removeItem(draftKey);
            }, 'Đã tạo công việc.')}
            onCreateEpic={(name) => runAction(() => taskApi.createEpic(name), 'Đã tạo dự án.')}
          />
        ) : null}

        <TaskToolbar
          filters={filters}
          staff={staff}
          view={view}
          setView={setView}
          setFilters={setFilters}
          onExport={isManager ? () => runAction(() => taskApi.exportTasks({ status: filters.status, assignee_id: filters.assignee_id }), 'Đã xuất danh sách công việc.', false) : undefined}
        />

        {isManager ? <WorkloadPanel workload={workload} onAssignee={(id) => setFilters((prev) => ({ ...prev, assignee_id: id }))} /> : null}

        {view === 'list' ? (
          <TaskList
            tasks={tasks}
            search={filters.search || ''}
            onOpen={openTask}
            onSort={(sortBy) => setFilters((prev) => ({
              ...prev,
              sort_by: sortBy,
              sort_dir: prev.sort_by === sortBy && prev.sort_dir === 'asc' ? 'desc' : 'asc'
            }))}
            isManager={isManager}
            api={taskApi}
            onRun={runAction}
          />
        ) : (
          <KanbanBoard
            kanban={kanban}
            onOpen={openTask}
            onStatus={(taskId, status) => runAction(() => taskApi.updateTaskStatus(taskId, status, status === 'done' ? 100 : undefined), 'Đã cập nhật trạng thái.')}
            currentUserId={me?.id}
            currentUserRole={me?.role}
          />
        )}
      </section>

      {selectedTask ? (
        <TaskDrawer
          task={selectedTask}
          staff={staff}
          isManager={isManager}
          onClose={() => setSelectedTask(null)}
          onReload={async () => setSelectedTask(await taskApi.fetchTaskDetail(selectedTask.id))}
          onRun={runAction}
          api={taskApi}
        />
      ) : null}
    </main>
  );
}

function TaskMetrics({ stats }: { stats: TaskStats | null }) {
  return (
    <section className="metricGrid">
      <Metric label="Tổng công việc" value={stats?.total || 0} />
      <Metric label="Đúng hạn" value={stats?.done_on_time || 0} />
      <Metric label="Trễ hạn" value={stats?.done_late || 0} />
      <Metric label="Đang làm" value={stats?.in_progress || 0} />
      <Metric label="Quá hạn" value={stats?.overdue || 0} />
      <Metric label="Đã hủy" value={stats?.cancelled || 0} />
    </section>
  );
}

function TaskCreatePanel(props: {
  staff: UserItem[];
  tasks: TaskListItem[];
  epics: Epic[];
  loading: boolean;
  onCreate: (payload: CreateTaskPayload) => Promise<void>;
  onCreateEpic: (name: string) => Promise<void>;
}) {
  const restored = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return JSON.parse(localStorage.getItem(draftKey) || 'null') as Partial<FormState> | null;
  }, []);
  const [form, setForm] = useState<FormState>({
    title: restored?.title || '',
    description: restored?.description || '',
    assigneeIds: restored?.assigneeIds || [],
    deadline: restored?.deadline || '',
    priority: restored?.priority || 'medium',
    epicId: restored?.epicId || '',
    blockedById: restored?.blockedById || '',
    recurring: restored?.recurring || false,
    recurPattern: restored?.recurPattern || 'daily',
    recurDay: restored?.recurDay || ''
  });
  const [titleError, setTitleError] = useState('');
  const [epicName, setEpicName] = useState('');

  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(form));
  }, [form]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTitleError('');
    if (!form.title.trim()) {
      setTitleError('Tiêu đề không được để trống.');
      return;
    }
    if (form.deadline && new Date(form.deadline) < new Date()) {
      setTitleError('Deadline không được trong quá khứ.');
      return;
    }
    props.onCreate({
      title: form.title.trim(),
      description: form.description || undefined,
      assignee_ids: form.assigneeIds,
      deadline: normalizeDateTime(form.deadline),
      priority: form.priority,
      epic_id: form.epicId || undefined,
      blocked_by_id: form.blockedById || undefined,
      is_recurring: form.recurring,
      recur_pattern: form.recurring ? form.recurPattern : undefined,
      recur_day: form.recurring ? form.recurDay || undefined : undefined
    }).then(() => setForm({
      title: '',
      description: '',
      assigneeIds: [],
      deadline: '',
      priority: 'medium',
      epicId: '',
      blockedById: '',
      recurring: false,
      recurPattern: 'daily',
      recurDay: ''
    }));
  }

  return (
    <section className="panel">
      <div className="sectionHead">
        <div>
          <h2>Tạo công việc mới</h2>
          <p>Giao việc cho một hoặc nhiều nhân viên trong phòng ban.</p>
        </div>
        <div className="toolbar">
          <input value={epicName} onChange={(event) => setEpicName(event.target.value)} placeholder="Tên dự án mới" />
          <button type="button" className="secondaryButton" onClick={() => {
            if (epicName.trim()) props.onCreateEpic(epicName.trim()).then(() => setEpicName(''));
          }}>Tạo dự án</button>
        </div>
      </div>
      <form className="taskForm" onSubmit={submit}>
        <div>
          <input value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Tiêu đề công việc" />
          {titleError ? <small className="fieldError">{titleError}</small> : null}
        </div>
        <textarea value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Mô tả chi tiết, yêu cầu, kết quả mong đợi" rows={4} />
        <AssigneeDropdown
          users={props.staff.filter((user) => user.is_active)}
          value={form.assigneeIds}
          onChange={(assigneeIds) => update('assigneeIds', assigneeIds)}
          placeholder="Chọn người thực hiện"
          emptyLabel="Không có nhân viên khả dụng"
        />
        <input type="datetime-local" value={form.deadline} onChange={(event) => update('deadline', event.target.value)} />
        <select value={form.priority} onChange={(event) => update('priority', event.target.value as TaskPriority)}>
          <option value="high">Cao</option>
          <option value="medium">Trung bình</option>
          <option value="low">Thấp</option>
        </select>
        <select value={form.epicId} onChange={(event) => update('epicId', event.target.value)}>
          <option value="">Không thuộc dự án</option>
          {props.epics.map((epic) => <option key={epic.id} value={epic.id}>{epic.name} ({epic.progress_pct}%)</option>)}
        </select>
        <select value={form.blockedById} onChange={(event) => update('blockedById', event.target.value)}>
          <option value="">Không phụ thuộc task khác</option>
          {props.tasks.filter((task) => task.status !== 'done').map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
        </select>
        <label className="checkboxLine">
          <input type="checkbox" checked={form.recurring} onChange={(event) => update('recurring', event.target.checked)} />
          Lặp lại
        </label>
        {form.recurring ? (
          <>
            <select value={form.recurPattern} onChange={(event) => update('recurPattern', event.target.value as FormState['recurPattern'])}>
              <option value="daily">Hằng ngày</option>
              <option value="weekly">Hằng tuần</option>
              <option value="monthly">Hằng tháng</option>
            </select>
            <input value={form.recurDay} onChange={(event) => update('recurDay', event.target.value)} placeholder="Thứ/ngày áp dụng" />
          </>
        ) : null}
        <button type="submit" className="primaryButton" disabled={props.loading}>{props.loading ? 'Đang lưu...' : 'Tạo công việc'}</button>
      </form>
    </section>
  );
}

type FormState = {
  title: string;
  description: string;
  assigneeIds: string[];
  deadline: string;
  priority: TaskPriority;
  epicId: string;
  blockedById: string;
  recurring: boolean;
  recurPattern: 'daily' | 'weekly' | 'monthly';
  recurDay: string;
};

function TaskToolbar(props: {
  filters: TaskFilters;
  staff: UserItem[];
  view: 'list' | 'kanban';
  setView: (view: 'list' | 'kanban') => void;
  setFilters: (updater: TaskFilters | ((prev: TaskFilters) => TaskFilters)) => void;
  onExport?: () => void;
}) {
  function setFilter(key: keyof TaskFilters, value: string | boolean) {
    props.setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  function thisWeek() {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 0, 0);
    props.setFilters((prev) => ({
      ...prev,
      deadline_from: toInputDateTime(start),
      deadline_to: toInputDateTime(end)
    }));
  }

  return (
    <section className="panel">
      <div className="taskToolbar">
        <input value={props.filters.search || ''} onChange={(event) => setFilter('search', event.target.value)} placeholder="Tìm theo tiêu đề công việc" />
        <select value={props.filters.status || ''} onChange={(event) => setFilter('status', event.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="todo">Chưa làm</option>
          <option value="in_progress">Đang làm</option>
          <option value="done">Hoàn thành</option>
          <option value="cancelled">Đã hủy</option>
        </select>
        <select value={props.filters.assignee_id || ''} onChange={(event) => setFilter('assignee_id', event.target.value)}>
          <option value="">Tất cả người thực hiện</option>
          {props.staff.map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
        </select>
        <select value={props.filters.priority || ''} onChange={(event) => setFilter('priority', event.target.value)}>
          <option value="">Tất cả ưu tiên</option>
          <option value="high">Cao</option>
          <option value="medium">Trung bình</option>
          <option value="low">Thấp</option>
        </select>
        <input type="datetime-local" value={props.filters.deadline_from || ''} onChange={(event) => setFilter('deadline_from', event.target.value)} />
        <input type="datetime-local" value={props.filters.deadline_to || ''} onChange={(event) => setFilter('deadline_to', event.target.value)} />
        <button type="button" className="secondaryButton" onClick={thisWeek}>Tuần này</button>
        <label className="checkboxLine">
          <input type="checkbox" checked={Boolean(props.filters.overdue_only)} onChange={(event) => setFilter('overdue_only', event.target.checked)} />
          Quá hạn
        </label>
        <div className="segmented">
          <button type="button" className={props.view === 'list' ? 'active' : ''} onClick={() => props.setView('list')}>List</button>
          <button type="button" className={props.view === 'kanban' ? 'active' : ''} onClick={() => props.setView('kanban')}>Kanban</button>
        </div>
        {props.onExport ? <button type="button" className="secondaryButton" onClick={props.onExport}>Xuất Excel</button> : null}
      </div>
    </section>
  );
}

function WorkloadPanel({ workload, onAssignee }: { workload: WorkloadItem[]; onAssignee: (id: string) => void }) {
  if (!workload.length) return null;
  return (
    <section className="panel">
      <h2>Workload nhân viên</h2>
      <div className="workloadGrid">
        {workload.map((item) => (
          <button type="button" className="workloadCard" key={item.user_id} onClick={() => onAssignee(item.user_id)}>
            <strong>{item.full_name}</strong>
            <span>{item.total} task</span>
            <small>Todo {item.todo_count} - Đang làm {item.in_progress_count} - Quá hạn {item.overdue_count}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function TaskList(props: { tasks: TaskListItem[]; search: string; onOpen: (id: string) => void; onSort: (sortBy: string) => void; isManager: boolean; api: TaskApi; onRun: (action: () => Promise<unknown>, success: string, reload?: boolean) => Promise<void> }) {
  const [cancelOpen, setCancelOpen] = useState<string | null>(null);
  const [cancelReasons, setCancelReasons] = useState<Record<string, string>>({});

  async function doCancel(taskId: string) {
    const reason = cancelReasons[taskId] || '';
    await props.onRun(() => props.api.cancelTask(taskId, reason), 'Đã hủy công việc.');
    setCancelOpen(null);
    setCancelReasons((prev) => { const next = { ...prev }; delete next[taskId]; return next; });
  }

  return (
    <section className="panel">
      <div className="sectionHead">
        <h2>Danh sách công việc</h2>
        <div className="actionRow">
          <button type="button" className="secondaryButton" onClick={() => props.onSort('deadline')}>Sắp xếp deadline</button>
          <button type="button" className="secondaryButton" onClick={() => props.onSort('priority')}>Sắp xếp ưu tiên</button>
        </div>
      </div>
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>Người thực hiện</th>
              <th>Ưu tiên</th>
              <th>Checklist</th>
              <th>Tiến độ</th>
              <th>Deadline</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {props.tasks.map((task) => (
              <tr key={task.id} className={task.is_overdue ? 'overdueRow' : ''}>
                <td>
                  <strong>{highlight(task.title, props.search)}</strong>
                  {task.is_overdue ? <span className="warnTag">Quá hạn</span> : null}
                </td>
                <td>{task.assignees.map((item) => item.full_name).join(', ') || '-'}</td>
                <td><PriorityBadge priority={task.priority} /></td>
                <td>{task.checklist_done}/{task.checklist_total}</td>
                <td>{task.progress_pct}%</td>
                <td>{task.deadline ? formatDate(task.deadline) : '-'}</td>
                <td><StatusBadge status={task.status} /></td>
                <td>
                  <div className="actionCell">
                    {props.isManager ? (
                      <>
                        <button type="button" className="dangerButton" onClick={() => setCancelOpen(task.id)}>Hủy</button>
                        {cancelOpen === task.id ? (
                          <div className="cancelInline">
                            <input value={cancelReasons[task.id] || ''} onChange={(e) => setCancelReasons((prev) => ({ ...prev, [task.id]: e.target.value }))} placeholder="Lý do hủy (tùy chọn)" />
                            <button type="button" className="dangerButton" onClick={() => doCancel(task.id)}>Xác nhận</button>
                            <button type="button" className="secondaryButton" onClick={() => setCancelOpen(null)}>Huỷ</button>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!props.tasks.length ? <tr><td colSpan={7} className="emptyCell">Không có dữ liệu.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function KanbanBoard({
  kanban,
  onOpen,
  onStatus,
  currentUserId,
  currentUserRole
}: {
  kanban: KanbanResponse | null;
  onOpen: (id: string) => void;
  onStatus: (id: string, status: TaskStatus) => void;
  currentUserId?: string | null;
  currentUserRole?: string | null;
}) {
  const columns: Array<keyof KanbanResponse> = ['todo', 'in_progress', 'done'];

  return (
    <section className="kanbanGrid">
      {columns.map((status) => {
        const column = kanban?.[status];
        const tasks = column?.tasks || [];
        const count = column?.count || 0;

        return (
          <article className="kanbanColumn" key={status}>
            <h2>
              {statusLabels[status as TaskStatus]}
              <span>{count}</span>
            </h2>
            <div className="kanbanCards">
              {tasks.map((task) => {
                const isEmployee = currentUserRole === 'employee';
                const isAssigned = task.assignees.some((a) => a.user_id === currentUserId);
                const editable = isEmployee && isAssigned && task.status !== 'cancelled';

                return (
                  <div className="taskCard" key={task.id}>
                    <button type="button" onClick={() => onOpen(task.id)}>
                      <strong>{task.title}</strong>
                      <small>{task.checklist_done}/{task.checklist_total} checklist - {task.progress_pct}%</small>
                    </button>
                    <select
                      value={task.status}
                      disabled={!editable}
                      onChange={(event) => onStatus(task.id, event.target.value as TaskStatus)}
                    >
                      <option value="todo">Chưa làm</option>
                      <option value="in_progress">Đang làm</option>
                      <option value="done">Hoàn thành</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function TaskDrawer(props: {
  task: TaskDetail;
  staff: UserItem[];
  isManager: boolean;
  onClose: () => void;
  onReload: () => Promise<void>;
  onRun: (action: () => Promise<unknown>, success: string, reload?: boolean) => Promise<void>;
  api: TaskApi;
}) {
  const [comment, setComment] = useState('');
  const [checklist, setChecklist] = useState('');
  const [edit, setEdit] = useState({
    title: props.task.title,
    description: props.task.description || '',
    deadline: props.task.deadline ? props.task.deadline.slice(0, 16) : '',
    priority: props.task.priority,
    assigneeIds: props.task.assignees.map((item) => item.user_id)
  });
  const [cancelReason, setCancelReason] = useState('');
  const [attachment, setAttachment] = useState({ file_url: '', file_name: '', file_size: 0 });

  useEffect(() => {
    setEdit({
      title: props.task.title,
      description: props.task.description || '',
      deadline: props.task.deadline ? props.task.deadline.slice(0, 16) : '',
      priority: props.task.priority,
      assigneeIds: props.task.assignees.map((item) => item.user_id)
    });
  }, [props.task]);

  async function runAndRefresh(action: () => Promise<unknown>, success: string) {
    await props.onRun(action, success, false);
    await props.onReload();
  }

  return (
    <aside className="drawerOverlay">
      <section className="drawer">
        <div className="sectionHead">
          <div>
            <h2>{props.task.title}</h2>
            <p>{props.task.assignees.map((item) => item.full_name).join(', ') || 'Chưa gán người thực hiện'}</p>
          </div>
          <button type="button" className="secondaryButton" onClick={props.onClose}>Đóng</button>
        </div>

        <div className="badgeLine">
          <StatusBadge status={props.task.status} />
          <PriorityBadge priority={props.task.priority} />
          {props.task.is_overdue ? <span className="warnTag">Quá hạn</span> : null}
          {props.task.is_recurring ? <span className="mutedTag">Lặp lại {props.task.recur_pattern}</span> : null}
        </div>

        {props.isManager ? (
          <section className="drawerSection">
            <h3>Chỉnh sửa</h3>
            <div className="drawerForm">
              <input value={edit.title} onChange={(event) => setEdit((prev) => ({ ...prev, title: event.target.value }))} />
              <textarea value={edit.description} onChange={(event) => setEdit((prev) => ({ ...prev, description: event.target.value }))} rows={3} />
              <input type="datetime-local" value={edit.deadline} onChange={(event) => setEdit((prev) => ({ ...prev, deadline: event.target.value }))} />
              <select value={edit.priority} onChange={(event) => setEdit((prev) => ({ ...prev, priority: event.target.value as TaskPriority }))}>
                <option value="high">Cao</option>
                <option value="medium">Trung bình</option>
                <option value="low">Thấp</option>
              </select>
              <AssigneeDropdown
                users={props.staff.filter((user) => user.is_active)}
                value={edit.assigneeIds}
                onChange={(assigneeIds) => setEdit((prev) => ({ ...prev, assigneeIds }))}
                placeholder="Chọn người thực hiện"
                emptyLabel="Không có nhân viên khả dụng"
              />
              <button type="button" className="primaryButton" onClick={() => runAndRefresh(() => props.api.updateTask(props.task.id, {
                title: edit.title,
                description: edit.description,
                deadline: normalizeDateTime(edit.deadline),
                priority: edit.priority,
                assignee_ids: edit.assigneeIds,
                deadline_change_reason: 'Cập nhật từ màn hình quản lý'
              }), 'Đã cập nhật công việc.')}>Lưu thay đổi</button>
            </div>
          </section>
        ) : null}

        <section className="drawerSection">
          <h3>Tiến độ</h3>
          <div className="actionRow">
            <select value={props.task.status} onChange={(event) => runAndRefresh(() => props.api.updateTaskStatus(props.task.id, event.target.value as TaskStatus, event.target.value === 'done' ? 100 : undefined), 'Đã cập nhật trạng thái.')}>
              <option value="todo">Chưa làm</option>
              <option value="in_progress">Đang làm</option>
              <option value="done">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
            <input type="number" min={0} max={100} defaultValue={props.task.progress_pct} onBlur={(event) => runAndRefresh(() => props.api.updateTaskProgress(props.task.id, Number(event.target.value)), 'Đã cập nhật tiến độ.')} />
          </div>
        </section>

        <section className="drawerSection">
          <h3>Checklist</h3>
          {props.task.checklists.map((item) => (
            <label className="checkboxLine" key={item.id}>
              <input type="checkbox" checked={item.is_done} onChange={(event) => runAndRefresh(() => props.api.updateChecklist(item.id, { is_done: event.target.checked }), 'Đã cập nhật checklist.')} />
              {item.content}
            </label>
          ))}
          <div className="actionRow">
            <input value={checklist} onChange={(event) => setChecklist(event.target.value)} placeholder="Thêm checklist" />
            <button type="button" className="secondaryButton" onClick={() => {
              if (checklist.trim()) runAndRefresh(() => props.api.addChecklist(props.task.id, checklist.trim(), props.task.checklists.length), 'Đã thêm checklist.').then(() => setChecklist(''));
            }}>Thêm</button>
          </div>
        </section>

        <section className="drawerSection">
          <h3>Ghi chú</h3>
          <div className="commentList">
            {props.task.comments.map((item) => <CommentItem key={item.id} comment={item} onReply={(content) => runAndRefresh(() => props.api.addComment(props.task.id, content, item.id), 'Đã phản hồi ghi chú.')} />)}
          </div>
          <div className="actionRow">
            <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Thêm ghi chú tiến độ" />
            <button type="button" className="secondaryButton" onClick={() => {
              if (comment.trim()) runAndRefresh(() => props.api.addComment(props.task.id, comment.trim()), 'Đã thêm ghi chú.').then(() => setComment(''));
            }}>Gửi</button>
          </div>
        </section>

        <section className="drawerSection">
          <h3>Tài liệu đính kèm</h3>
          {props.task.attachments.map((item) => <a key={item.id} href={item.file_url} target="_blank" rel="noreferrer">{item.file_name || item.file_url}</a>)}
          <div className="drawerForm">
            <input value={attachment.file_url} onChange={(event) => setAttachment((prev) => ({ ...prev, file_url: event.target.value }))} placeholder="URL file" />
            <input value={attachment.file_name} onChange={(event) => setAttachment((prev) => ({ ...prev, file_name: event.target.value }))} placeholder="Tên file" />
            <input type="number" value={attachment.file_size} onChange={(event) => setAttachment((prev) => ({ ...prev, file_size: Number(event.target.value) }))} placeholder="Dung lượng byte" />
            <button type="button" className="secondaryButton" onClick={() => {
              if (attachment.file_url && attachment.file_name) runAndRefresh(() => props.api.addAttachment(props.task.id, attachment), 'Đã thêm tài liệu.').then(() => setAttachment({ file_url: '', file_name: '', file_size: 0 }));
            }}>Thêm tài liệu</button>
          </div>
        </section>

        {props.isManager ? (
          <section className="drawerSection">
            <h3>Thao tác quản lý</h3>
            <div className="actionRow">
              {props.task.is_recurring ? <button type="button" className="secondaryButton" onClick={() => runAndRefresh(() => props.api.stopRecurring(props.task.id), 'Đã dừng lặp lại.')}>Dừng lặp lại</button> : null}
              <input value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Lý do hủy (tùy chọn)" />
              <button type="button" className="dangerButton" onClick={() => {
                runAndRefresh(() => props.api.cancelTask(props.task.id, cancelReason || ''), 'Đã hủy công việc.').then(() => setCancelReason(''));
              }}>Hủy công việc</button>
            </div>
          </section>
        ) : null}

        <section className="drawerSection">
          <h3>Lịch sử thay đổi</h3>
          <div className="timeline">
            {props.task.history.map((item) => (
              <div key={item.id}>
                <strong>{item.changer_name || 'Hệ thống'}</strong>
                <span>{item.field}: {item.old_value || '-'} → {item.new_value || '-'}</span>
                <small>{formatDate(item.created_at)}</small>
              </div>
            ))}
          </div>
        </section>
      </section>
    </aside>
  );
}

function AssigneeDropdown(props: {
  users: UserItem[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  emptyLabel: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target && !target.closest('[data-assignee-dropdown]')) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedUsers = props.users.filter((user) => props.value.includes(user.id));
  const summary = selectedUsers.length
    ? selectedUsers.length <= 2
      ? selectedUsers.map((user) => user.full_name).join(', ')
      : `${selectedUsers[0].full_name} +${selectedUsers.length - 1}`
    : props.placeholder;

  function toggleUser(userId: string) {
    if (props.value.includes(userId)) {
      props.onChange(props.value.filter((id) => id !== userId));
      return;
    }
    props.onChange([...props.value, userId]);
  }

  return (
    <div className="assigneeDropdown" data-assignee-dropdown>
      <button
        type="button"
        className={open ? 'assigneeTrigger open' : 'assigneeTrigger'}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={selectedUsers.length ? 'assigneeSummary' : 'assigneePlaceholder'}>{summary}</span>
        <span className="assigneeChevron">▾</span>
      </button>
      {open ? (
        <div className="assigneePanel">
          {props.users.length ? (
            props.users.map((user) => (
              <label className="assigneeOption" key={user.id}>
                <input
                  type="checkbox"
                  checked={props.value.includes(user.id)}
                  onChange={() => toggleUser(user.id)}
                />
                <span>
                  <strong>{user.full_name}</strong>
                  <small>{user.email}</small>
                </span>
              </label>
            ))
          ) : (
            <div className="assigneeEmpty">{props.emptyLabel}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CommentItem({ comment, onReply }: { comment: TaskDetail['comments'][number]; onReply: (content: string) => void }) {
  const [reply, setReply] = useState('');
  return (
    <article className="commentItem">
      <strong>{comment.full_name}</strong>
      <p>{comment.content}</p>
      <small>{formatDate(comment.created_at)}</small>
      {comment.replies.map((item) => <div className="replyItem" key={item.id}><strong>{item.full_name}</strong><p>{item.content}</p></div>)}
      <div className="actionRow">
        <input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Phản hồi" />
        <button type="button" className="secondaryButton" onClick={() => {
          if (reply.trim()) {
            onReply(reply.trim());
            setReply('');
          }
        }}>Reply</button>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="metricCard">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`status taskStatus-${status}`}>{statusLabels[status]}</span>;
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <span className={`status priority-${priority}`}>{priorityLabels[priority]}</span>;
}

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

function normalizeDateTime(value: string) {
  if (!value) return undefined;
  return value.length === 16 ? `${value}:00` : value;
}

function toInputDateTime(value: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('vi-VN');
}
