'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authStore } from '@/store/authStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useSecurity } from '@/hooks/useSecurity';
import { useUsers } from '@/hooks/useUsers';
import type { Department, DeptStatsItem, LoginLog, OrgChartNode, UserItem } from '@/hooks/types';

type TabKey = 'overview' | 'tasks' | 'accounts' | 'organization' | 'security' | 'profile' | 'kpi' | 'notifications' | 'settings' | 'onboarding';
type AdminRole = 'ceo' | 'manager';
type AdminApi = ReturnType<typeof useUsers> & ReturnType<typeof useOrganizations> & ReturnType<typeof useSecurity>;
type ResetPasswordResponse = { message: string; temp_password: string };

const tabs: Array<{ key: TabKey; label: string; icon: string; roles: AdminRole[] }> = [
  { key: 'overview',      label: 'Tổng quan',  icon: 'O', roles: ['ceo', 'manager'] },
  { key: 'tasks',         label: 'Công việc',  icon: 'T', roles: ['ceo', 'manager'] },
  { key: 'kpi',           label: 'KPI',        icon: 'K', roles: ['ceo', 'manager'] },
  { key: 'accounts',      label: 'Tài khoản',  icon: 'U', roles: ['ceo', 'manager'] },
  { key: 'organization',  label: 'Tổ chức',    icon: 'D', roles: ['ceo', 'manager'] },
  { key: 'notifications', label: 'Thông báo',  icon: 'N', roles: ['ceo', 'manager'] },
  { key: 'onboarding',    label: 'Onboarding', icon: 'B', roles: ['ceo', 'manager'] },
  { key: 'security',      label: 'Bảo mật',    icon: 'S', roles: ['ceo', 'manager'] },
  { key: 'settings',      label: 'Cài đặt',    icon: 'C', roles: ['ceo', 'manager'] },
  { key: 'profile',       label: 'Hồ sơ',      icon: 'P', roles: ['ceo', 'manager'] }
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const { accessToken, me } = useAuthStore();
  const usersApi = useUsers();
  const orgApi = useOrganizations();
  const securityApi = useSecurity();
  const api = useMemo(() => ({ ...usersApi, ...orgApi, ...securityApi }), [usersApi, orgApi, securityApi]);

  const {
    listDepartments,
    listManagers,
    departmentsWithoutManager,
    getOrgChart,
    getDeptStats,
    getLoginLogs,
    listStaff
  } = api;

  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<UserItem[]>([]);
  const [staff, setStaff] = useState<UserItem[]>([]);
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [orgChart, setOrgChart] = useState<OrgChartNode | null>(null);
  const [deptStats, setDeptStats] = useState<DeptStatsItem[]>([]);
  const [missingManagers, setMissingManagers] = useState<Array<{ id: string; name: string }>>([]);
  const [search, setSearch] = useState('');
  const [chartSearch, setChartSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const role = me?.role === 'ceo' || me?.role === 'manager' ? me.role : null;
  const visibleTabs = useMemo(() => tabs.filter((tab) => role && tab.roles.includes(role)), [role]);

  const loadData = useCallback(async () => {
    if (!role) return;
    setError('');
    const departmentList = await listDepartments();
    setDepartments(departmentList);

    if (role === 'ceo') {
      const [managerPage, noManager, chart, stats, loginLogs] = await Promise.all([
        listManagers(search),
        departmentsWithoutManager(),
        getOrgChart(),
        getDeptStats(),
        getLoginLogs()
      ]);
      setManagers(managerPage.items);
      setMissingManagers(noManager.departments);
      setOrgChart(chart);
      setDeptStats(stats);
      setLogs(loginLogs.items);
      setStaff([]);
      return;
    }

    const staffList = await listStaff(search);
    setStaff(staffList);
    setManagers([]);
    setMissingManagers([]);
    setOrgChart(null);
    setDeptStats([]);
    setLogs([]);
  }, [departmentsWithoutManager, getDeptStats, getLoginLogs, getOrgChart, listDepartments, listManagers, listStaff, role, search]);

  useEffect(() => {
    if (!accessToken) {
      router.replace('/auth/login');
      return;
    }
    authStore.bootstrap().then((profile) => {
      if (!profile || (profile.role !== 'ceo' && profile.role !== 'manager')) {
        authStore.clear();
        router.replace('/auth/login');
        return;
      }
      setReady(true);
    }).catch(() => router.replace('/auth/login'));
  }, [accessToken, router]);

  useEffect(() => {
    if (!ready || !role) return;
    loadData().catch((err) => setError(err instanceof Error ? err.message : 'Không tải được dữ liệu.'));
  }, [ready, role, loadData]);

  async function runAction<T>(action: () => Promise<T>, success: string | ((result: T) => string)) {
    setError('');
    setNotice('');
    try {
      const result = await action();
      setNotice(typeof success === 'function' ? success(result) : success);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Thao tác thất bại.');
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
            <span>Quản trị hệ thống</span>
          </div>
        </div>
        <nav className="navList">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? 'navItem active' : 'navItem'}
              onClick={() => {
                if (tab.key === 'tasks') {
                  router.push('/tasks');
                  return;
                }
                if (tab.key === 'kpi') {
                  router.push('/kpi');
                  return;
                }
                if (tab.key === 'notifications') {
                  router.push('/notifications');
                  return;
                }
                if (tab.key === 'settings') {
                  router.push('/settings');
                  return;
                }
                if (tab.key === 'onboarding') {
                  router.push('/onboarding');
                  return;
                }
                setActiveTab(tab.key);
              }}
              title={tab.label}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
        <button type="button" className="ghostButton" onClick={() => authStore.signOut().then(() => router.replace('/auth/login'))}>
          Đăng xuất
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Hệ thống quản trị công việc và KPI nội bộ</p>
            <h1>{tabs.find((tab) => tab.key === activeTab)?.label}</h1>
          </div>
          <div className="userChip">
            <Avatar name={me?.full_name || 'User'} src={me?.avatar_url} />
            <div>
              <strong>{me?.full_name}</strong>
              <span>{role.toUpperCase()}</span>
            </div>
          </div>
        </header>

        {notice ? <div className="notice success">{notice}</div> : null}
        {error ? <div className="notice error">{error}</div> : null}

        {activeTab === 'overview' ? (
          <Overview
            role={role}
            departments={departments}
            managers={managers}
            staff={staff}
            logs={logs}
            missingManagers={missingManagers}
            deptStats={deptStats}
          />
        ) : null}

        {activeTab === 'accounts' ? (
          <Accounts
            role={role}
            departments={departments}
            managers={managers}
            staff={staff}
            search={search}
            loading={usersApi.loading}
            setSearch={setSearch}
            onReload={() => loadData()}
            onRun={runAction}
            api={api}
          />
        ) : null}

        {activeTab === 'organization' ? (
          <Organization
            role={role}
            departments={departments}
            managers={managers}
            missingManagers={missingManagers}
            orgChart={orgChart}
            chartSearch={chartSearch}
            setChartSearch={setChartSearch}
            onRun={runAction}
            api={api}
          />
        ) : null}

        {activeTab === 'security' ? (
          <Security role={role} logs={logs} email={me?.email || ''} onRun={runAction} api={api} />
        ) : null}

        {activeTab === 'profile' ? (
          <Profile me={me} onRun={runAction} api={api} />
        ) : null}
      </section>
    </main>
  );
}

function Overview(props: {
  role: AdminRole;
  departments: Department[];
  managers: UserItem[];
  staff: UserItem[];
  logs: LoginLog[];
  missingManagers: Array<{ id: string; name: string }>;
  deptStats: DeptStatsItem[];
}) {
  const activeManagers = props.managers.filter((user) => user.is_active).length;
  const activeStaff = props.staff.filter((user) => user.is_active).length;
  const failedLogs = props.logs.filter((log) => !log.success).length;

  return (
    <div className="gridStack">
      {props.role === 'ceo' && props.missingManagers.length ? (
        <section className="alertBand">
          <strong>Phòng ban thiếu Manager</strong>
          <span>{props.missingManagers.map((dept) => dept.name).join(', ')}</span>
        </section>
      ) : null}
      <section className="metricGrid">
        <Metric label="Phòng ban" value={props.departments.length} />
        <Metric label={props.role === 'ceo' ? 'Manager active' : 'Nhân viên active'} value={props.role === 'ceo' ? activeManagers : activeStaff} />
        <Metric label="Tài khoản inactive" value={(props.role === 'ceo' ? props.managers : props.staff).filter((user) => !user.is_active).length} />
        <Metric label={props.role === 'ceo' ? 'Đăng nhập lỗi' : 'Chưa đăng nhập'} value={props.role === 'ceo' ? failedLogs : props.staff.filter((user) => !user.first_login_at).length} />
      </section>
      {props.role === 'ceo' ? (
        <section className="panel">
          <h2>Thống kê tài khoản theo phòng ban</h2>
          <DataTable
            headers={['Phòng ban', 'Manager', 'Nhân viên', 'Đang hoạt động']}
            rows={props.deptStats.map((item) => [
              item.dept_name || item.name || '-',
              item.manager_count ?? '-',
              item.staff_count ?? item.employee_count ?? item.member_count ?? '-',
              item.active_count ?? '-'
            ])}
          />
        </section>
      ) : null}
    </div>
  );
}

function Accounts(props: {
  role: AdminRole;
  departments: Department[];
  managers: UserItem[];
  staff: UserItem[];
  search: string;
  loading: boolean;
  setSearch: (value: string) => void;
  onReload: () => Promise<void>;
  onRun: <T,>(action: () => Promise<T>, success: string | ((result: T) => string)) => Promise<void>;
  api: AdminApi;
}) {
  const users = props.role === 'ceo' ? props.managers : props.staff;
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [editPhone, setEditPhone] = useState('');

  return (
    <div className="gridStack">
      <section className="panel">
        <div className="sectionHead">
          <div>
            <h2>{props.role === 'ceo' ? 'Tạo tài khoản Manager' : 'Tạo tài khoản nhân viên'}</h2>
            <p>{props.role === 'ceo' ? 'Chọn phòng ban phụ trách khi tạo Manager.' : 'Nhân viên mới sẽ thuộc phòng ban của Manager hiện tại.'}</p>
          </div>
        </div>
        {props.role === 'ceo' ? (
          <ManagerForm departments={props.departments} onSubmit={(payload) => props.onRun(() => props.api.createManager(payload), 'Đã tạo Manager và gửi thông tin đăng nhập qua email.')} />
        ) : (
          <StaffForm onSubmit={(payload) => props.onRun(() => props.api.createStaff(payload), 'Đã tạo nhân viên và gửi email chào mừng.')} />
        )}
      </section>

      {props.role === 'manager' ? (
        <section className="panel splitActions">
          <div>
            <h2>Import nhân viên hàng loạt</h2>
            <p>Tải file Excel mẫu, điền danh sách nhân viên rồi upload để hệ thống kiểm tra và tạo tài khoản.</p>
          </div>
          <div className="actionRow">
            <button type="button" className="secondaryButton" onClick={() => props.onRun(() => props.api.downloadStaffTemplate(), 'Đã tải template Excel.')}>Tải template</button>
            <label className="fileButton">
              Import Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) props.onRun(() => props.api.importStaff(file), 'Import nhân viên hoàn tất.');
                  event.currentTarget.value = '';
                }}
              />
            </label>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="sectionHead">
          <div>
            <h2>{props.role === 'ceo' ? 'Danh sách Manager' : 'Danh sách nhân viên'}</h2>
            <p>Tìm kiếm theo tên, email hoặc phòng ban.</p>
          </div>
          <div className="toolbar">
            <input value={props.search} onChange={(event) => props.setSearch(event.target.value)} placeholder="Tìm kiếm..." />
            <button type="button" className="secondaryButton" onClick={() => props.onReload()} disabled={props.loading}>Lọc</button>
          </div>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Email</th>
                <th>{props.role === 'ceo' ? 'Phòng ban' : 'Điện thoại'}</th>
                <th>Trạng thái</th>
                <th>Lần đầu đăng nhập</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td><UserCell user={user} /></td>
                  <td>{user.email}</td>
                  <td>{props.role === 'ceo' ? user.dept_name || departmentName(props.departments, user.dept_id) : user.phone || '-'}</td>
                  <td><StatusBadge active={user.is_active} /></td>
                  <td>{user.first_login_at ? formatDate(user.first_login_at) : <span className="mutedTag">Chưa đăng nhập</span>}</td>
                  <td>
                    <div className="rowActions">
                      <button type="button" title="Sửa" onClick={() => {
                        setEditingUser(user);
                        setEditFullName(user.full_name || '');
                        setEditDeptId(user.dept_id || '');
                        setEditPhone(user.phone || '');
                      }}>Edit</button>
                      <button
                        type="button"
                        title="Reset mật khẩu"
                        onClick={() => props.onRun<ResetPasswordResponse>(
                          () => props.role === 'ceo' ? props.api.resetManagerPassword(user.id) : props.api.resetStaffPassword(user.id),
                          (result) => result.temp_password
                            ? `Đã reset mật khẩu. Mật khẩu mới: ${result.temp_password}`
                            : result.message || 'Đã reset mật khẩu và gửi email tạm.'
                        )}
                      >
                        Reset
                      </button>
                      <button type="button" title={user.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'} onClick={() => props.onRun(() => props.role === 'ceo' ? props.api.setManagerActive(user.id, !user.is_active) : props.api.setStaffActive(user.id, !user.is_active), user.is_active ? 'Đã vô hiệu hóa tài khoản.' : 'Đã kích hoạt tài khoản.')}>{user.is_active ? 'Off' : 'On'}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length ? <tr><td colSpan={6} className="emptyCell">Không có dữ liệu.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
      {editingUser ? (
        <div className="modalOverlay">
          <div className="modal">
            <h3>Chỉnh sửa {editingUser.role === 'ceo' ? 'Manager' : 'Nhân viên'}</h3>
            <label>Họ tên</label>
            <input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
            {props.role === 'ceo' ? (
              <>
                <label>Phòng ban (ID)</label>
                <select value={editDeptId} onChange={(e) => setEditDeptId(e.target.value)}>
                  <option value="">(Không thay đổi)</option>
                  {props.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </>
            ) : (
              <>
                <label>Số điện thoại</label>
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </>
            )}
            <div className="modalActions">
              <button type="button" className="secondaryButton" onClick={() => setEditingUser(null)}>Hủy</button>
              <button type="button" className="primaryButton" onClick={() => {
                if (!editingUser) return;
                if (props.role === 'ceo') {
                  props.onRun(() => props.api.updateManager(editingUser.id, { full_name: editFullName, dept_id: editDeptId || undefined }), 'Đã cập nhật Manager.');
                } else {
                  props.onRun(() => props.api.updateStaff(editingUser.id, { full_name: editFullName, phone: editPhone || undefined }), 'Đã cập nhật nhân viên.');
                }
                setEditingUser(null);
              }}>Lưu</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Organization(props: {
  role: AdminRole;
  departments: Department[];
  managers: UserItem[];
  missingManagers: Array<{ id: string; name: string }>;
  orgChart: OrgChartNode | null;
  chartSearch: string;
  setChartSearch: (value: string) => void;
  onRun: <T,>(action: () => Promise<T>, success: string | ((result: T) => string)) => Promise<void>;
  api: AdminApi;
}) {
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptDescription, setEditDeptDescription] = useState('');
  return (
    <div className="gridStack">
      {props.role === 'ceo' ? (
        <section className="panel">
          <h2>Tạo phòng ban mới</h2>
          <DepartmentForm managers={props.managers} onSubmit={(payload) => props.onRun(() => props.api.createDepartment(payload), 'Đã tạo phòng ban.')} />
        </section>
      ) : null}

      <section className="panel">
        <div className="sectionHead">
          <div>
            <h2>Danh sách phòng ban</h2>
            <p>Hiển thị Manager phụ trách, trạng thái và số lượng nhân viên.</p>
          </div>
        </div>
        <div className="departmentGrid">
          {props.departments.map((dept) => (
            <article className="departmentCard" key={dept.id}>
              <div>
                <h3>{dept.name}</h3>
                <p>{dept.description || 'Chưa có mô tả'}</p>
              </div>
              <dl>
                <div><dt>Manager</dt><dd>{dept.manager_name || 'Chưa gán'}</dd></div>
                <div><dt>Nhân sự</dt><dd>{dept.member_count}</dd></div>
                <div><dt>Trạng thái</dt><dd><StatusBadge active={dept.is_active} /></dd></div>
              </dl>
              {props.role === 'ceo' ? (
                <>
                  <select
                    value={dept.manager_id || ''}
                    onChange={(event) => {
                      if (event.target.value) props.onRun(() => props.api.assignDepartmentManager(dept.id, event.target.value), 'Đã gán Manager phụ trách phòng ban.');
                    }}
                    aria-label="Gán Manager phụ trách"
                  >
                    <option value="">Chọn Manager phụ trách</option>
                    {props.managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.full_name}</option>)}
                  </select>
                  <div className="rowActions">
                    <button type="button" title="Sửa phòng ban" onClick={() => { setEditingDept(dept); setEditDeptName(dept.name || ''); setEditDeptDescription(dept.description || ''); }}>Sửa</button>
                    <button type="button" title="Vô hiệu hóa phòng ban" onClick={() => props.onRun(() => props.api.deactivateDepartment(dept.id), 'Đã vô hiệu hóa phòng ban.')}>Vô hiệu hóa</button>
                  </div>
                </>
              ) : null}
            </article>
          ))}
        </div>
      </section>
      {editingDept ? (
        <div className="modalOverlay">
          <div className="modal">
            <h3>Chỉnh sửa phòng ban</h3>
            <label>Tên</label>
            <input value={editDeptName} onChange={(e) => setEditDeptName(e.target.value)} />
            <label>Mô tả</label>
            <input value={editDeptDescription} onChange={(e) => setEditDeptDescription(e.target.value)} />
            <div className="modalActions">
              <button type="button" className="secondaryButton" onClick={() => setEditingDept(null)}>Hủy</button>
              <button type="button" className="primaryButton" onClick={() => {
                if (!editingDept) return;
                props.onRun(() => props.api.updateDepartment(editingDept.id, { name: editDeptName, description: editDeptDescription || undefined }), 'Đã cập nhật phòng ban.');
                setEditingDept(null);
              }}>Lưu</button>
            </div>
          </div>
        </div>
      ) : null}

      {props.role === 'ceo' ? (
        <section className="panel">
          <div className="sectionHead">
            <div>
              <h2>Sơ đồ tổ chức</h2>
              <p>Tìm kiếm và làm nổi bật vị trí nhân sự trong cơ cấu tổ chức.</p>
            </div>
            <input value={props.chartSearch} onChange={(event) => props.setChartSearch(event.target.value)} placeholder="Tìm người trong sơ đồ..." />
          </div>
          {props.missingManagers.length ? <div className="alertBand compact">Thiếu Manager: {props.missingManagers.map((dept) => dept.name).join(', ')}</div> : null}
          {props.orgChart ? <OrgNode node={props.orgChart} query={props.chartSearch.trim().toLowerCase()} /> : <p className="emptyCell">Chưa có dữ liệu sơ đồ tổ chức.</p>}
        </section>
      ) : null}
    </div>
  );
}

function Security(props: {
  role: AdminRole;
  logs: LoginLog[];
  email: string;
  onRun: <T,>(action: () => Promise<T>, success: string | ((result: T) => string)) => Promise<void>;
  api: AdminApi;
}) {
  const [forgotEmail, setForgotEmail] = useState(props.email);
  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [otpEmail, setOtpEmail] = useState(props.email);

  return (
    <div className="gridStack">
      <section className="panel twoCol">
        <PasswordForm onSubmit={(oldPassword, newPassword) => props.onRun(() => props.api.changePassword(oldPassword, newPassword), 'Đã đổi mật khẩu. Vui lòng đăng nhập lại nếu phiên bị kết thúc.')} />
        <div className="securityActions">
          <h2>Phiên đăng nhập</h2>
          <p>Đăng xuất khỏi toàn bộ thiết bị khi nghi ngờ tài khoản bị truy cập trái phép.</p>
          <button type="button" className="dangerButton" onClick={() => props.onRun(() => props.api.logoutAll(), 'Đã đăng xuất khỏi tất cả thiết bị.')}>Đăng xuất tất cả thiết bị</button>
        </div>
      </section>

      <section className="panel threeCol">
        <MiniForm title="Quên mật khẩu" submitLabel="Gửi link reset" onSubmit={() => props.onRun(() => props.api.forgotPassword(forgotEmail), 'Nếu email tồn tại, link reset đã được gửi.')}>
          <input type="email" value={forgotEmail} onChange={(event) => setForgotEmail(event.target.value)} placeholder="email@company.com" required />
        </MiniForm>
        <MiniForm title="Đặt mật khẩu mới" submitLabel="Đặt lại" onSubmit={() => props.onRun(() => props.api.resetPassword(resetToken, resetPassword), 'Đặt lại mật khẩu thành công.')}>
          <input value={resetToken} onChange={(event) => setResetToken(event.target.value)} placeholder="Token reset" required />
          <input type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} placeholder="Mật khẩu mới" required />
        </MiniForm>
        <MiniForm title="OTP email" submitLabel="Gửi OTP" onSubmit={() => props.onRun(() => props.api.sendOtp(otpEmail), 'OTP đã được gửi qua email.')}>
          <input type="email" value={otpEmail} onChange={(event) => setOtpEmail(event.target.value)} placeholder="email@company.com" required />
        </MiniForm>
      </section>

      {props.role === 'ceo' ? (
        <section className="panel">
          <h2>Log đăng nhập</h2>
          <DataTable
            headers={['Email', 'Kết quả', 'IP', 'Thiết bị', 'Thời điểm']}
            rows={props.logs.map((log) => [
              log.email_attempted,
              log.success ? 'Thành công' : 'Thất bại',
              log.ip_address || '-',
              log.user_agent || '-',
              formatDate(log.created_at)
            ])}
          />
        </section>
      ) : null}
    </div>
  );
}

function Profile(props: {
  me: ReturnType<typeof useAuthStore>['me'];
  onRun: <T,>(action: () => Promise<T>, success: string | ((result: T) => string)) => Promise<void>;
  api: AdminApi;
}) {
  const [avatarUrl, setAvatarUrl] = useState(props.me?.avatar_url || '');
  const [phone, setPhone] = useState(props.me?.phone || '');

  return (
    <div className="gridStack">
      <section className="panel profilePanel">
        <Avatar name={props.me?.full_name || 'User'} src={props.me?.avatar_url} />
        <div>
          <h2>{props.me?.full_name}</h2>
          <p>{props.me?.email}</p>
          <div className="badgeLine">
            <StatusBadge active={Boolean(props.me?.is_active)} />
            <span className="mutedTag">{props.me?.role.toUpperCase()}</span>
            {props.me?.must_change_pw ? <span className="warnTag">Cần đổi mật khẩu</span> : null}
          </div>
        </div>
      </section>
      <section className="panel twoCol">
        <MiniForm title="Cập nhật ảnh đại diện" submitLabel="Lưu ảnh" onSubmit={() => props.onRun(() => props.api.updateAvatar(avatarUrl), 'Đã cập nhật ảnh đại diện.')}>
          <input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://..." required />
        </MiniForm>
        <MiniForm title="Cập nhật số điện thoại" submitLabel="Lưu số" onSubmit={() => props.onRun(() => props.api.updatePhone(phone), 'Đã cập nhật số điện thoại.')}>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="0901234567" required />
        </MiniForm>
      </section>
    </div>
  );
}

function ManagerForm(props: { departments: Department[]; onSubmit: (payload: { full_name: string; email: string; dept_id: string }) => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [deptId, setDeptId] = useState('');

  return (
    <form className="formGrid" onSubmit={(event) => {
      event.preventDefault();
      props.onSubmit({ full_name: fullName, email, dept_id: deptId });
      setFullName('');
      setEmail('');
      setDeptId('');
    }}>
      <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Họ tên Manager" required />
      <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email công ty" required />
      <select value={deptId} onChange={(event) => setDeptId(event.target.value)} required>
        <option value="">Chọn phòng ban</option>
        {props.departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
      </select>
      <button type="submit" className="primaryButton">Tạo Manager</button>
    </form>
  );
}

function StaffForm(props: { onSubmit: (payload: { full_name: string; email: string; phone?: string }) => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <form className="formGrid" onSubmit={(event) => {
      event.preventDefault();
      props.onSubmit({ full_name: fullName, email, phone: phone || undefined });
      setFullName('');
      setEmail('');
      setPhone('');
    }}>
      <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Họ tên nhân viên" required />
      <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email công ty" required />
      <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Số điện thoại" />
      <button type="submit" className="primaryButton">Tạo nhân viên</button>
    </form>
  );
}

function DepartmentForm(props: { managers: UserItem[]; onSubmit: (payload: { name: string; description?: string; manager_id?: string }) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState('');

  return (
    <form className="formGrid" onSubmit={(event) => {
      event.preventDefault();
      props.onSubmit({ name, description: description || undefined, manager_id: managerId || undefined });
      setName('');
      setDescription('');
      setManagerId('');
    }}>
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Tên phòng ban" required />
      <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả" />
      <select value={managerId} onChange={(event) => setManagerId(event.target.value)}>
        <option value="">Chọn Manager phụ trách</option>
        {props.managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.full_name}</option>)}
      </select>
      <button type="submit" className="primaryButton">Tạo phòng ban</button>
    </form>
  );
}

function PasswordForm(props: { onSubmit: (oldPassword: string, newPassword: string) => void }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  return (
    <form className="miniForm" onSubmit={(event) => {
      event.preventDefault();
      props.onSubmit(oldPassword, newPassword);
      setOldPassword('');
      setNewPassword('');
    }}>
      <h2>Đổi mật khẩu</h2>
      <input type="password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} placeholder="Mật khẩu hiện tại" required />
      <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Mật khẩu mới" required />
      <button type="submit" className="primaryButton">Đổi mật khẩu</button>
    </form>
  );
}

function MiniForm(props: { title: string; submitLabel: string; children: ReactNode; onSubmit: () => void }) {
  return (
    <form className="miniForm" onSubmit={(event: FormEvent) => {
      event.preventDefault();
      props.onSubmit();
    }}>
      <h2>{props.title}</h2>
      {props.children}
      <button type="submit" className="secondaryButton">{props.submitLabel}</button>
    </form>
  );
}

function Metric(props: { label: string; value: string | number }) {
  return (
    <article className="metricCard">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}

function DataTable(props: { headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div className="tableWrap">
      <table>
        <thead><tr>{props.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>
          {props.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}
          {!props.rows.length ? <tr><td colSpan={props.headers.length} className="emptyCell">Không có dữ liệu.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

function OrgNode(props: { node: OrgChartNode; query: string }) {
  const matched = props.query && props.node.full_name.toLowerCase().includes(props.query);
  return (
    <div className="orgNode">
      <div className={matched ? 'orgPerson highlighted' : 'orgPerson'}>
        <Avatar name={props.node.full_name} src={props.node.avatar_url} />
        <div>
          <strong>{props.node.full_name}</strong>
          <span>{props.node.role.toUpperCase()} {props.node.dept_name ? `- ${props.node.dept_name}` : ''}</span>
        </div>
      </div>
      {props.node.children?.length ? (
        <div className="orgChildren">
          {props.node.children.map((child) => <OrgNode key={child.id} node={child} query={props.query} />)}
        </div>
      ) : null}
    </div>
  );
}

function UserCell(props: { user: UserItem }) {
  return (
    <div className="userCell">
      <Avatar name={props.user.full_name} src={props.user.avatar_url} />
      <div>
        <strong>{props.user.full_name}</strong>
        <span>{props.user.role.toUpperCase()}</span>
      </div>
    </div>
  );
}

function Avatar(props: { name: string; src?: string | null }) {
  if (props.src) return <img className="avatar" src={props.src} alt="" />;
  return <div className="avatar">{props.name.trim().charAt(0).toUpperCase() || 'U'}</div>;
}

function StatusBadge(props: { active: boolean }) {
  return <span className={props.active ? 'status activeStatus' : 'status inactiveStatus'}>{props.active ? 'Active' : 'Inactive'}</span>;
}

function departmentName(departments: Department[], id?: string | null) {
  return departments.find((dept) => dept.id === id)?.name || '-';
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('vi-VN');
}

// Prompts removed: replaced by in-page modals inside `Accounts` and `Organization` components.