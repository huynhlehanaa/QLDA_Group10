'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPassword } from '@/lib/auth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await resetPassword(token, newPassword);
      setNotice('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <section style={{ width: '100%', maxWidth: 440, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20, display: 'grid', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Đặt lại mật khẩu</h1>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Token reset từ email"
            required
            style={{ padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mật khẩu mới"
            required
            style={{ padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
          />
          <button type="submit" disabled={loading} style={btnPrimary}>
            {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
          </button>
        </form>

        <button type="button" onClick={() => router.push('/auth/login')} style={btnSecondary}>
          Quay lại đăng nhập
        </button>

        {error ? <p style={{ color: '#b91c1c', margin: 0 }}>{error}</p> : null}
        {notice ? <p style={{ color: '#166534', margin: 0 }}>{notice}</p> : null}
      </section>
    </main>
  );
}

const btnPrimary = {
  padding: 10,
  borderRadius: 6,
  border: 'none',
  background: '#2563eb',
  color: '#fff',
  cursor: 'pointer'
};

const btnSecondary = {
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  background: '#fff',
  cursor: 'pointer'
};
