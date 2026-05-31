'use client';

import { type CSSProperties, FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authStore } from '@/store/authStore';
import { useAuthStore } from '@/store/useAuthStore';
import { type BreadcrumbItem, type DangerousAction, type HelpArticle, useSettings } from '@/hooks/useSettings';

const dayOptions = [
  { value: 'mon', label: 'Thứ 2' },
  { value: 'tue', label: 'Thứ 3' },
  { value: 'wed', label: 'Thứ 4' },
  { value: 'thu', label: 'Thứ 5' },
  { value: 'fri', label: 'Thứ 6' },
  { value: 'sat', label: 'Thứ 7' },
  { value: 'sun', label: 'Chủ nhật' }
];

export default function SettingsPage() {
  const router = useRouter();
  const { accessToken, me } = useAuthStore();
  const {
    loading,
    fetchCompany,
    updateCompany,
    fetchWorkSchedule,
    updateWorkSchedule,
    fetchIsWorkingTime,
    fetchLanguage,
    setLanguage,
    fetchHelp,
    fetchDangerousActions,
    fetchBreadcrumb
  } = useSettings();

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

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setError('');

    const [company, schedule, lang, help, working, breadcrumb] = await Promise.all([
      fetchCompany(),
      fetchWorkSchedule(),
      fetchLanguage(),
      fetchHelp(),
      fetchIsWorkingTime(),
      fetchBreadcrumb('/settings')
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
    } else {
      setDangerousActions([]);
    }
  }, [accessToken, fetchBreadcrumb, fetchCompany, fetchDangerousActions, fetchHelp, fetchIsWorkingTime, fetchLanguage, fetchWorkSchedule, me?.role]);

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
    loadData().catch((err) => setError(err instanceof Error ? err.message : 'Không tải được cài đặt'));
  }, [ready, loadData]);

  function toggleDay(value: string) {
    setWorkDays((prev) => (prev.includes(value) ? prev.filter((day) => day !== value) : [...prev, value]));
  }

  async function onUpdateCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      await updateCompany({ name: companyName, logo_url: logoUrl || undefined });
      setNotice('Đã cập nhật thông tin công ty.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật công ty thất bại');
    }
  }

  async function onUpdateSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      await updateWorkSchedule({ work_days: workDays, work_start: workStart, work_end: workEnd });
      const working = await fetchIsWorkingTime();
      setWorkingState(working);
      setNotice('Đã cập nhật lịch làm việc.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật lịch làm việc thất bại');
    }
  }

  async function onUpdateLanguage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      await setLanguage(language);
      setNotice('Đã cập nhật ngôn ngữ.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật ngôn ngữ thất bại');
    }
  }

  async function onSearchHelp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const data = await fetchHelp(helpSearch || undefined);
      setHelpArticles(data.articles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tìm kiếm hướng dẫn thất bại');
    }
  }

  async function onBuildBreadcrumb(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const data = await fetchBreadcrumb(breadcrumbPath);
      setBreadcrumbs(data.breadcrumbs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được breadcrumb');
    }
  }

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24, display: 'grid', gap: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Cài đặt & Hệ thống</h1>
          <p style={{ margin: '4px 0 0', color: '#475569' }}>Quản lý cấu hình hệ thống và trợ giúp sử dụng</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => router.push('/dashboard')} style={btnSecondary}>Dashboard</button>
          <button type="button" onClick={() => router.push('/notifications')} style={btnSecondary}>Thông báo</button>
          <button type="button" onClick={() => router.push('/onboarding')} style={btnSecondary}>Onboarding</button>
          <button type="button" onClick={() => authStore.signOut().then(() => router.replace('/auth/login'))} style={btnSecondary}>Đăng xuất</button>
        </div>
      </header>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Thông tin công ty</h2>
        <form onSubmit={onUpdateCompany} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr auto', gap: 8 }}>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Tên công ty" style={inputStyle} disabled={me?.role !== 'ceo'} />
          <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="Logo URL" style={inputStyle} disabled={me?.role !== 'ceo'} />
          <button type="submit" disabled={loading || me?.role !== 'ceo'} style={btnPrimary}>{loading ? 'Đang lưu...' : 'Lưu'}</button>
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
            <button type="submit" disabled={loading || me?.role !== 'ceo'} style={btnPrimary}>{loading ? 'Đang lưu...' : 'Cập nhật'}</button>
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
          <button type="submit" disabled={loading} style={btnPrimary}>Lưu ngôn ngữ</button>
        </form>
      </section>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Trung tâm trợ giúp</h2>
        <form onSubmit={onSearchHelp} style={{ display: 'grid', gridTemplateColumns: '2fr auto', gap: 8 }}>
          <input value={helpSearch} onChange={(e) => setHelpSearch(e.target.value)} placeholder="Tìm theo tiêu đề, danh mục, tag" style={inputStyle} />
          <button type="submit" disabled={loading} style={btnSecondary}>Tìm kiếm</button>
        </form>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {helpArticles.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong> — {item.category} ({item.content_url})
            </li>
          ))}
        </ul>
      </section>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Breadcrumb hệ thống</h2>
        <form onSubmit={onBuildBreadcrumb} style={{ display: 'grid', gridTemplateColumns: '2fr auto', gap: 8 }}>
          <input value={breadcrumbPath} onChange={(e) => setBreadcrumbPath(e.target.value)} placeholder="/settings" style={inputStyle} />
          <button type="submit" disabled={loading} style={btnSecondary}>Tạo breadcrumb</button>
        </form>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {breadcrumbs.map((item, idx) => (
            <span key={`${item.url}-${idx}`} style={{ border: '1px solid #cbd5e1', borderRadius: 999, padding: '4px 10px' }}>
              {item.label}
            </span>
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
