'use client';

import { type CSSProperties, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authStore } from '@/store/authStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationCenter, type NotificationItem } from '@/hooks/useNotificationCenter';
import { useNotifications } from '@/hooks/useNotifications';

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

export default function NotificationsPage() {
  const router = useRouter();
  const { accessToken, me } = useAuthStore();
  const { loading, listNotifications, markRead, markAllRead, cleanupNotifications } = useNotificationCenter();
  const { messages } = useNotifications();

  const [ready, setReady] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [cleanupDays, setCleanupDays] = useState('30');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const role = me?.role === 'ceo' || me?.role === 'manager' ? me.role : null;
  const visibleTabs = tabs.filter((tab) => role && tab.roles.includes(role));

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setError('');
    const data = await listNotifications({ type: typeFilter || undefined, unreadOnly, page, pageSize });
    setNotifications(data.items || []);
    setUnreadCount(data.unread_count || 0);
    setTotal(data.total || 0);
  }, [accessToken, listNotifications, page, pageSize, typeFilter, unreadOnly]);

  useEffect(() => {
    if (!accessToken) { router.replace('/auth/login'); return; }
    authStore.bootstrap().then((profile) => {
      if (!profile) router.replace('/auth/login');
      else setReady(true);
    }).catch(() => router.replace('/auth/login'));
  }, [accessToken, router]);

  useEffect(() => {
    if (!ready) return;
    loadData().catch((err) => setError(err instanceof Error ? err.message : 'Không tải được thông báo'));
  }, [ready, loadData]);

  async function onMarkRead(notifId: string) {
    setError(''); setNotice('');
    try { await markRead(notifId); await loadData(); setNotice('Đã đánh dấu đã đọc.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Đánh dấu đã đọc thất bại'); }
  }

  async function onMarkAllRead() {
    setError(''); setNotice('');
    try { const data = await markAllRead(); await loadData(); setNotice(`Đã đánh dấu ${data.marked_count} thông báo đã đọc.`); }
    catch (err) { setError(err instanceof Error ? err.message : 'Đánh dấu tất cả thất bại'); }
  }

  async function onCleanup() {
    setError(''); setNotice('');
    try { const data = await cleanupNotifications(Number(cleanupDays)); await loadData(); setNotice(`Đã xóa ${data.deleted_count} thông báo cũ hơn ${data.older_than_days} ngày.`); }
    catch (err) { setError(err instanceof Error ? err.message : 'Dọn dẹp thông báo thất bại'); }
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

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
              className={tab.key === 'notifications' ? 'navItem active' : 'navItem'}
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
            <h1>Thông báo <small style={{ fontWeight: 400, fontSize: 16, color: '#64748b' }}>({unreadCount} chưa đọc / {total} tổng)</small></h1>
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
            <h2 style={{ margin: 0, fontSize: 18 }}>Realtime (WebSocket)</h2>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {messages.slice(0, 5).map((msg, idx) => <li key={`${msg}-${idx}`}>{msg}</li>)}
              {messages.length === 0 ? <li>Chưa có thông báo realtime.</li> : null}
            </ul>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Bộ lọc</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr auto auto auto', gap: 8 }}>
              <input value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} placeholder="Lọc theo type (vd: new_task)" style={inputStyle} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #cbd5e1', borderRadius: 6, padding: '0 10px' }}>
                <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
                Chưa đọc
              </label>
              <button type="button" className="primaryButton" onClick={() => { setPage(1); loadData().catch(() => undefined); }}>Lọc</button>
              <button type="button" className="secondaryButton" onClick={onMarkAllRead} disabled={loading}>Đánh dấu tất cả đã đọc</button>
            </div>
          </section>

          {me?.role === 'ceo' ? (
            <section style={cardStyle}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Dọn dẹp thông báo cũ (CEO)</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <input type="number" min={1} max={365} value={cleanupDays} onChange={(e) => setCleanupDays(e.target.value)} style={inputStyle} />
                <button type="button" className="secondaryButton" onClick={onCleanup} disabled={loading}>Dọn dẹp</button>
              </div>
            </section>
          ) : null}

          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Danh sách thông báo</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                    <th style={{ padding: 8 }}>Tiêu đề</th>
                    <th style={{ padding: 8 }}>Nội dung</th>
                    <th style={{ padding: 8 }}>Type</th>
                    <th style={{ padding: 8 }}>Thời gian</th>
                    <th style={{ padding: 8 }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((item) => (
                    <tr key={item.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                      <td style={{ padding: 8 }}>{item.title}</td>
                      <td style={{ padding: 8 }}>{item.body}</td>
                      <td style={{ padding: 8 }}>{item.type}</td>
                      <td style={{ padding: 8 }}>{item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '-'}</td>
                      <td style={{ padding: 8 }}>
                        {item.is_read ? 'Đã đọc' : (
                          <button type="button" className="secondaryButton" onClick={() => onMarkRead(item.id)}>Đánh dấu đã đọc</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="button" className="secondaryButton" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>Trang trước</button>
              <span>Trang {page} / {pageCount}</span>
              <button type="button" className="secondaryButton" onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))} disabled={page >= pageCount}>Trang sau</button>
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

const cardStyle: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, display: 'grid', gap: 10 };
const inputStyle: CSSProperties = { padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 };