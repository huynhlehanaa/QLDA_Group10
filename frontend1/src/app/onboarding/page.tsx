'use client';

import { type CSSProperties, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authStore } from '@/store/authStore';
import { useAuthStore } from '@/store/useAuthStore';
import { type OnboardingChecklist, useOnboarding } from '@/hooks/useOnboarding';

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

export default function OnboardingPage() {
  const router = useRouter();
  const { accessToken, me } = useAuthStore();
  const { loading, fetchChecklist, markStep, downloadGuide } = useOnboarding();

  const [ready, setReady] = useState(false);
  const [checklist, setChecklist] = useState<OnboardingChecklist | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const role = me?.role === 'ceo' || me?.role === 'manager' ? me.role : null;
  const visibleTabs = tabs.filter((tab) => role && tab.roles.includes(role));

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setError('');
    const data = await fetchChecklist();
    setChecklist(data);
  }, [accessToken, fetchChecklist]);

  useEffect(() => {
    if (!accessToken) { router.replace('/auth/login'); return; }
    authStore.bootstrap().then((profile) => {
      if (!profile) router.replace('/auth/login');
      else setReady(true);
    }).catch(() => router.replace('/auth/login'));
  }, [accessToken, router]);

  useEffect(() => {
    if (!ready) return;
    loadData().catch((err) => setError(err instanceof Error ? err.message : 'Không tải được onboarding'));
  }, [ready, loadData]);

  async function onToggleStep(stepId: string, isDone: boolean) {
    setError(''); setNotice('');
    try { await markStep(stepId, isDone); await loadData(); setNotice('Đã cập nhật bước onboarding.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Cập nhật bước thất bại'); }
  }

  async function onDownload(r: 'staff' | 'manager' | 'ceo') {
    setError(''); setNotice('');
    try { await downloadGuide(r); setNotice(`Đã tải hướng dẫn ${r.toUpperCase()}.`); }
    catch (err) { setError(err instanceof Error ? err.message : 'Tải hướng dẫn thất bại'); }
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
              className={tab.key === 'onboarding' ? 'navItem active' : 'navItem'}
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
            <h1>Onboarding</h1>
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
            <h2 style={{ margin: 0, fontSize: 18 }}>Tiến độ onboarding</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 }}>
              <Stat label="Hoàn thành" value={checklist?.done_count || 0} />
              <Stat label="Tổng bước" value={checklist?.total || 0} />
              <Stat label="Tỉ lệ" value={`${checklist?.completion_pct || 0}%`} />
              <Stat label="Trạng thái" value={checklist?.is_complete ? 'Done' : 'In progress'} />
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Checklist</h2>
            <div style={{ display: 'grid', gap: 8 }}>
              {(checklist?.items || []).map((step) => (
                <article key={step.step_id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <strong>{step.order}. {step.title}</strong>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="checkbox" checked={step.is_done} onChange={(e) => onToggleStep(step.step_id, e.target.checked)} disabled={loading} />
                      Hoàn thành
                    </label>
                  </div>
                  <span>{step.description}</span>
                  <small style={{ color: '#64748b' }}>Đường dẫn: {step.action_url}</small>
                </article>
              ))}
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Tải hướng dẫn sử dụng</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="secondaryButton" onClick={() => onDownload('staff')} disabled={loading}>Guide Staff</button>
              <button type="button" className="secondaryButton" onClick={() => onDownload('manager')} disabled={loading}>Guide Manager</button>
              {me?.role === 'ceo' ? <button type="button" className="secondaryButton" onClick={() => onDownload('ceo')} disabled={loading}>Guide CEO</button> : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Avatar(props: { name: string; src?: string | null }) {
  if (props.src) return <img className="avatar" src={props.src} alt="" />;
  return <div className="avatar">{props.name.trim().charAt(0).toUpperCase() || 'U'}</div>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <article style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 22 }}>{value}</div>
    </article>
  );
}

const cardStyle: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, display: 'grid', gap: 10 };