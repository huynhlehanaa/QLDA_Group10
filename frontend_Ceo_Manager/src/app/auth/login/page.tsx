'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api';
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
        router.replace('/dashboard');
      }
    }).catch(() => undefined);
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const me = await authStore.signIn(email, password);
      if (!me) {
        setError('Không lấy được thông tin người dùng.');
        return;
      }
      if (me.role !== 'ceo' && me.role !== 'manager') {
        await authStore.signOut();
        setError('Frontend này chỉ mở cho CEO hoặc Manager.');
        return;
      }
      setNotice(`Đăng nhập thành công với vai trò ${me.role.toUpperCase()}.`);
      router.replace('/dashboard');
    } catch (err) {
      setError(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="panel" style={{ width: '100%', maxWidth: 440 }}>
        <div className="brand" style={{ color: '#172033', padding: 0, marginBottom: 18 }}>
          <div className="brandMark">K</div>
          <div>
            <strong>KPI Nội Bộ</strong>
            <span style={{ color: '#66758a' }}>CEO / Manager</span>
          </div>
        </div>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Đăng nhập</h1>
        <p>Truy cập hệ thống quản trị công việc và KPI nội bộ.</p>
        <form onSubmit={onSubmit} className="miniForm">
          <input
            aria-label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email công ty"
            required
          />
          <input
            aria-label="Mật khẩu"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mật khẩu"
            required
          />
          <button type="submit" disabled={loading} className="primaryButton">
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>
        {error ? <div className="notice error" style={{ marginTop: 12 }}>{error}</div> : null}
        {notice ? <div className="notice success" style={{ marginTop: 12 }}>{notice}</div> : null}
      </section>
    </main>
  );
}

function getLoginErrorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.code === 'EMAIL_NOT_FOUND') return 'Email không tồn tại trong hệ thống.';
    if (err.code === 'WRONG_PASSWORD') return err.message || 'Sai mật khẩu.';
    if (err.code === 'ACCOUNT_LOCKED') return err.message || 'Tài khoản đang bị khóa.';
    if (err.code === 'ACCOUNT_DISABLED') return 'Tài khoản đã bị vô hiệu hóa.';
    return err.message;
  }

  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return 'Không kết nối được backend. Hãy kiểm tra API đang chạy và cấu hình CORS/port.';
  }

  return err instanceof Error ? err.message : 'Đăng nhập thất bại.';
}