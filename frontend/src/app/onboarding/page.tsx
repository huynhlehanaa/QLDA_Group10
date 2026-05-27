'use client';

import { type CSSProperties, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authStore } from '@/store/authStore';
import { useAuthStore } from '@/store/useAuthStore';
import { type OnboardingChecklist, useOnboarding } from '@/hooks/useOnboarding';

export default function OnboardingPage() {
  const router = useRouter();
  const { accessToken, me } = useAuthStore();
  const { loading, fetchChecklist, markStep, downloadGuide } = useOnboarding();

  const [ready, setReady] = useState(false);
  const [checklist, setChecklist] = useState<OnboardingChecklist | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setError('');
    const data = await fetchChecklist();
    setChecklist(data);
  }, [accessToken, fetchChecklist]);

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
    loadData().catch((err) => setError(err instanceof Error ? err.message : 'Không tải được onboarding'));
  }, [ready, loadData]);

  async function onToggleStep(stepId: string, isDone: boolean) {
    setError('');
    setNotice('');
    try {
      await markStep(stepId, isDone);
      await loadData();
      setNotice('Đã cập nhật bước onboarding.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật bước thất bại');
    }
  }

  async function onDownload(role: 'staff' | 'manager' | 'ceo') {
    setError('');
    setNotice('');
    try {
      await downloadGuide(role);
      setNotice(`Đã tải hướng dẫn ${role.toUpperCase()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tải hướng dẫn thất bại');
    }
  }

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: 24, display: 'grid', gap: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Onboarding</h1>
          <p style={{ margin: '4px 0 0', color: '#475569' }}>Lộ trình làm quen hệ thống cho người dùng mới</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => router.push('/dashboard')} style={btnSecondary}>Dashboard</button>
          <button type="button" onClick={() => router.push('/settings')} style={btnSecondary}>Cài đặt</button>
          <button type="button" onClick={() => router.push('/notifications')} style={btnSecondary}>Thông báo</button>
          <button type="button" onClick={() => authStore.signOut().then(() => router.replace('/auth/login'))} style={btnSecondary}>Đăng xuất</button>
        </div>
      </header>

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
          <button type="button" onClick={() => onDownload('staff')} disabled={loading} style={btnSecondary}>Guide Staff</button>
          <button type="button" onClick={() => onDownload('manager')} disabled={loading} style={btnSecondary}>Guide Manager</button>
          {me?.role === 'ceo' ? <button type="button" onClick={() => onDownload('ceo')} disabled={loading} style={btnSecondary}>Guide CEO</button> : null}
        </div>
      </section>

      {error ? <p style={{ color: '#b91c1c', margin: 0 }}>{error}</p> : null}
      {notice ? <p style={{ color: '#166534', margin: 0 }}>{notice}</p> : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <article style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 22 }}>{value}</div>
    </article>
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

const btnSecondary: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  background: '#fff'
};
