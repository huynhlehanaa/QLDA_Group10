'use client';

import { type CSSProperties, FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authStore } from '@/store/authStore';
import { useAuthStore } from '@/store/useAuthStore';
import { type BreadcrumbItem, type DangerousAction, type HelpArticle, useSettings } from '@/hooks/useSettings';

type AdminRole = 'ceo' | 'manager';
type TabKey = 'overview' | 'tasks' | 'accounts' | 'organization' | 'security' | 'profile' | 'kpi' | 'notifications' | 'settings' | 'onboarding';

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
  { key: 'profile',       label: 'Hồ sơ',      icon: 'P', roles: ['ceo', 'manager'] },
];

const routeMap: Partial<Record<TabKey, string>> = {
  tasks: '/tasks', kpi: '/kpi', notifications: '/notifications',
  settings: '/settings', onboarding: '/onboarding',
  overview: '/dashboard', accounts: '/dashboard',
  organization: '/dashboard', security: '/dashboard', profile: '/dashboard',
};

const dayOptions = [
  { value: 'mon', label: 'Thứ 2' }, { value: 'tue', label: 'Thứ 3' },
  { value: 'wed', label: 'Thứ 4' }, { value: 'thu', label: 'Thứ 5' },
  { value: 'fri', label: 'Thứ 6' }, { value: 'sat', label: 'Thứ 7' },
  { value: 'sun', label: 'Chủ nhật' }
];

export default function SettingsPage() {
  const router = useRouter();
  const { accessToken, me } = useAuthStore();
  const { loading, fetchCompany, updateCompany, fetchWorkSchedule, updateWorkSchedule, fetchIsWorkingTime, fetchLanguage, setLanguage, fetchHelp, fetchDangerousActions, fetchBreadcrumb } = useSettings();

  const [ready, setReady] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [workDays, setWorkDays] = useState<string[]>([]);
  const [workStart, setWorkStart] = useState('08:00');
  const [workEnd, setWorkEnd] = useState('17:30');
  const [language, setLanguageState] = useState<'vi' | 'en'>('vi');
  const [helpSearch, setHelpSearch] = useState('');
  const [helpArticles, setHelpArticles] = useState<HelpArticle[]>([]);
  const [dangerousActions, setDangerousActions] = useState<DangerousAction[]>([]);
  const [workingState, setWorkingState] = useState<{ is_working_time: boolean; reason?: string } | null>(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState('/settings');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const role = me?.role === 'ceo' || me?.role === 'manager' ? me.role : null;
  const visibleTabs = tabs.filter((tab) => role && tab.roles.includes(role));

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setError('');
    const [company, schedule, lang, help, working, breadcrumb] = await Promise.all([
      fetchCompany(), fetchWorkSchedule(), fetchLanguage(), fetchHelp(), fetchIsWorkingTime(), fetchBreadcrumb('/settings')
    ]);
    setCompanyName(company.name || '');
    setLogoUrl(company.logo_url || '');
    setWorkDays(schedule.work_days || []);
    setWorkStart(schedule.work_start || '08:00');
    setWorkEnd(schedule.work_end || '17:30');
    setLanguageState(lang.language || 'vi');
    setHelpArticles(help.articles || []);
    setWorkingState(working);
    setBreadcrumbs(breadcrumb.breadcrumbs || []);
    if (me?.role === 'ceo') {
      const data = await fetchDangerousActions();
      setDangerousActions(data.actions || []);
    } else { setDangerousActions([]); }
  }, [accessToken, fetchBreadcrumb, fetchCompany, fetchDangerousActions, fetchHelp, fetchIsWorkingTime, fetchLanguage, fetchWorkSchedule, me?.role]);

  useEffect(() => {
    if (!accessToken) { router.replace('/auth/login'); return; }
    authStore.bootstrap().then((profile) => {
      if (!profile) router.replace('/auth/login');
      else setReady(true);
    }).catch(() => router.replace('/auth/login'));
  }, [accessToken, router]);

  useEffect(() => {
    if (!ready) return;
    loadData().catch((err) => setError(err instanceof Error ? err.message : 'Không tải được cài đặt'));
  }, [ready, loadData]);

  function toggleDay(value: string) {
    setWorkDays((prev) => prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]);
  }

  async function onUpdateCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice('');
    try { await updateCompany({ name: companyName, logo_url: logoUrl || undefined }); setNotice('Đã cập nhật thông tin công ty.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Cập nhật công ty thất bại'); }
  }

  async function onUpdateSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice('');
    try {
      await updateWorkSchedule({ work_days: workDays, work_start: workStart, work_end: workEnd });
      const working = await fetchIsWorkingTime();
      setWorkingState(working);
      setNotice('Đã cập nhật lịch làm việc.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Cập nhật lịch làm việc thất bại'); }
  }

  async function onUpdateLanguage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice('');
    try { await setLanguage(language); setNotice('Đã cập nhật ngôn ngữ.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Cập nhật ngôn ngữ thất bại'); }
  }

  async function onSearchHelp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    try { const data = await fetchHelp(helpSearch || undefined); setHelpArticles(data.articles || []); }
    catch (err) { setError(err instanceof Error ? err.message : 'Tìm kiếm hướng dẫn thất bại'); }
  }

  async function onBuildBreadcrumb(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    try { const data = await fetchBreadcrumb(breadcrumbPath); setBreadcrumbs(data.breadcrumbs || []); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không tạo được breadcrumb'); }
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
              className={tab.key === 'settings' ? 'navItem active' : 'navItem'}
              onClick={() => router.push(routeMap[tab.key] || '/dashboard')}
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
            <h1>Cài đặt & Hệ thống</h1>
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

        <div className="gridStack">
          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Thông tin công ty</h2>
            <form onSubmit={onUpdateCompany} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr auto', gap: 8 }}>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Tên công ty" style={inputStyle} disabled={me?.role !== 'ceo'} />
              <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="Logo URL" style={inputStyle} disabled={me?.role !== 'ceo'} />
              <button type="submit" className="primaryButton" disabled={loading || me?.role !== 'ceo'}>{loading ? 'Đang lưu...' : 'Lưu'}</button>
            </form>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Lịch làm việc hệ thống</h2>
            <form onSubmit={onUpdateSchedule} style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {dayOptions.map((day) => (
                  <label key={day.value} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 10px' }}>
                    <input type="checkbox" checked={workDays.includes(day.value)} onChange={() => toggleDay(day.value)} disabled={me?.role !== 'ceo'} />
                    {day.label}
                  </label>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
                <input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} style={inputStyle} disabled={me?.role !== 'ceo'} />
                <input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} style={inputStyle} disabled={me?.role !== 'ceo'} />
                <button type="submit" className="primaryButton" disabled={loading || me?.role !== 'ceo'}>{loading ? 'Đang lưu...' : 'Cập nhật'}</button>
              </div>
            </form>
            {workingState ? (
              <p style={{ margin: 0, color: workingState.is_working_time ? '#166534' : '#b45309' }}>
                {workingState.is_working_time ? 'Hệ thống đang trong giờ làm việc.' : `Ngoài giờ làm việc${workingState.reason ? `: ${workingState.reason}` : ''}`}
              </p>
            ) : null}
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Ngôn ngữ</h2>
            <form onSubmit={onUpdateLanguage} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <select value={language} onChange={(e) => setLanguageState(e.target.value as 'vi' | 'en')} style={inputStyle}>
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
              <button type="submit" className="primaryButton" disabled={loading}>Lưu ngôn ngữ</button>
            </form>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Trung tâm trợ giúp</h2>
            <form onSubmit={onSearchHelp} style={{ display: 'grid', gridTemplateColumns: '2fr auto', gap: 8 }}>
              <input value={helpSearch} onChange={(e) => setHelpSearch(e.target.value)} placeholder="Tìm theo tiêu đề, danh mục, tag" style={inputStyle} />
              <button type="submit" className="secondaryButton" disabled={loading}>Tìm kiếm</button>
            </form>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {helpArticles.map((item) => (
                <li key={item.id}><strong>{item.title}</strong> — {item.category} ({item.content_url})</li>
              ))}
            </ul>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Breadcrumb hệ thống</h2>
            <form onSubmit={onBuildBreadcrumb} style={{ display: 'grid', gridTemplateColumns: '2fr auto', gap: 8 }}>
              <input value={breadcrumbPath} onChange={(e) => setBreadcrumbPath(e.target.value)} placeholder="/settings" style={inputStyle} />
              <button type="submit" className="secondaryButton" disabled={loading}>Tạo breadcrumb</button>
            </form>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {breadcrumbs.map((item, idx) => (
                <span key={`${item.url}-${idx}`} style={{ border: '1px solid #cbd5e1', borderRadius: 999, padding: '4px 10px' }}>{item.label}</span>
              ))}
            </div>
          </section>

          {me?.role === 'ceo' ? (
            <section style={cardStyle}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Hành động nguy hiểm</h2>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {dangerousActions.map((item) => (
                  <li key={item.action_type}>
                    <strong>{item.label}</strong>: {item.confirmation_message} {item.cannot_undo ? '(Không hoàn tác)' : '(Có thể mở khóa)'}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Avatar(props: { name: string; src?: string | null }) {
  if (props.src) return <img className="avatar" src={props.src} alt="" />;
  return <div className="avatar">{props.name.trim().charAt(0).toUpperCase() || 'U'}</div>;
}

const cardStyle: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, display: 'grid', gap: 10 };
const inputStyle: CSSProperties = { padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 };