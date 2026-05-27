'use client';

import { type CSSProperties, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authStore } from '@/store/authStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationCenter, type NotificationItem } from '@/hooks/useNotificationCenter';
import { useNotifications } from '@/hooks/useNotifications';

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

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setError('');
    const data = await listNotifications({
      type: typeFilter || undefined,
      unreadOnly,
      page,
      pageSize
    });
    setNotifications(data.items || []);
    setUnreadCount(data.unread_count || 0);
    setTotal(data.total || 0);
  }, [accessToken, listNotifications, page, pageSize, typeFilter, unreadOnly]);

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
    loadData().catch((err) => setError(err instanceof Error ? err.message : 'Không tải được thông báo'));
  }, [ready, loadData]);

  async function onMarkRead(notifId: string) {
    setError('');
    setNotice('');
    try {
      await markRead(notifId);
      await loadData();
      setNotice('Đã đánh dấu đã đọc.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đánh dấu đã đọc thất bại');
    }
  }

  async function onMarkAllRead() {
    setError('');
    setNotice('');
    try {
      const data = await markAllRead();
      await loadData();
      setNotice(`Đã đánh dấu ${data.marked_count} thông báo đã đọc.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đánh dấu tất cả thất bại');
    }
  }

  async function onCleanup() {
    setError('');
    setNotice('');
    try {
      const data = await cleanupNotifications(Number(cleanupDays));
      await loadData();
      setNotice(`Đã xóa ${data.deleted_count} thông báo cũ hơn ${data.older_than_days} ngày.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dọn dẹp thông báo thất bại');
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24, display: 'grid', gap: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Thông báo</h1>
          <p style={{ margin: '4px 0 0', color: '#475569' }}>Unread: {unreadCount} / Tổng: {total}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => router.push('/dashboard')} style={btnSecondary}>Dashboard</button>
          <button type="button" onClick={() => router.push('/settings')} style={btnSecondary}>Cài đặt</button>
          <button type="button" onClick={() => router.push('/onboarding')} style={btnSecondary}>Onboarding</button>
          <button type="button" onClick={() => authStore.signOut().then(() => router.replace('/auth/login'))} style={btnSecondary}>Đăng xuất</button>
        </div>
      </header>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Realtime (WebSocket)</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {messages.slice(0, 5).map((msg, idx) => (
            <li key={`${msg}-${idx}`}>{msg}</li>
          ))}
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
          <button type="button" onClick={() => { setPage(1); loadData().catch(() => undefined); }} style={btnPrimary}>Lọc</button>
          <button type="button" onClick={onMarkAllRead} disabled={loading} style={btnSecondary}>Đánh dấu tất cả đã đọc</button>
        </div>
      </section>

      {me?.role === 'ceo' ? (
        <section style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Dọn dẹp thông báo cũ (CEO)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <input type="number" min={1} max={365} value={cleanupDays} onChange={(e) => setCleanupDays(e.target.value)} style={inputStyle} />
            <button type="button" onClick={onCleanup} disabled={loading} style={btnSecondary}>Dọn dẹp</button>
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
                      <button type="button" onClick={() => onMarkRead(item.id)} style={btnSecondary}>Đánh dấu đã đọc</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1} style={btnSecondary}>Trang trước</button>
          <span>Trang {page} / {pageCount}</span>
          <button type="button" onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))} disabled={page >= pageCount} style={btnSecondary}>Trang sau</button>
        </div>
      </section>

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
