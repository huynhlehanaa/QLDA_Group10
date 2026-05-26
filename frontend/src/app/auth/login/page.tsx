'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    authStore.bootstrap().then((me) => {
      if (me && (me.role === 'ceo' || me.role === 'manager')) {
        setNotice(`Đã đăng nhập với vai trò ${me.role.toUpperCase()}.`);
      }
    }).catch(() => undefined);
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const me = await authStore.signIn(email, password);
      if (!me) {
        setError('Không lấy được thông tin người dùng.');
        return;
      }
      if (me.role !== 'ceo' && me.role !== 'manager') {
        await authStore.signOut();
        setError('Chỉ CEO hoặc Manager mới được truy cập frontend này.');
        return;
      }
      setNotice(`Đăng nhập thành công (${me.role.toUpperCase()}).`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <section style={{ width: '100%', maxWidth: 420, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20 }}>
        <h1 style={{ marginTop: 0 }}>Đăng nhập CEO / Manager</h1>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            style={{ padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu"
            required
            style={{ padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{ padding: 10, borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}
          >
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>
        {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
        {notice ? <p style={{ color: '#166534' }}>{notice}</p> : null}
      </section>
    </main>
  );
}
