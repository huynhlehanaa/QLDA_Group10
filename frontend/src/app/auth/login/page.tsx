'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { forgotPassword, sendOtp, verifyOtp } from '@/lib/auth';
import { authStore } from '@/store/authStore';

function roleLandingPath(role: string) {
  if (role === 'staff') return '/tasks';
  return '/dashboard';
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [otpMode, setOtpMode] = useState(false);

  useEffect(() => {
    authStore.bootstrap().then((me) => {
      if (me) {
        router.replace(roleLandingPath(me.role));
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
      if (me.must_change_pw) {
        setNotice('Bạn cần đổi mật khẩu lần đầu trong mục Cài đặt.');
      }
      sessionStorage.setItem('kpi_welcome_notice', `Xin chào ${me.full_name}!`);
      router.replace(roleLandingPath(me.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await forgotPassword(email);
      setNotice('Nếu email tồn tại, hệ thống đã gửi link đặt lại mật khẩu.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yêu cầu reset mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  }

  async function onSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await sendOtp(email);
      setNotice('OTP đã được gửi qua email, vui lòng kiểm tra hộp thư.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gửi OTP thất bại');
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const tokenData = await verifyOtp(email, otp);
      const me = await authStore.signInWithTokens(tokenData);
      if (!me) {
        setError('Không lấy được thông tin người dùng.');
        return;
      }
      sessionStorage.setItem('kpi_welcome_notice', `Xin chào ${me.full_name}!`);
      router.replace(roleLandingPath(me.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xác thực OTP thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <section style={{ width: '100%', maxWidth: 460, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20, display: 'grid', gap: 12 }}>
        <h1 style={{ marginTop: 0, marginBottom: 0 }}>Đăng nhập hệ thống KPI</h1>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
          <input
            aria-label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            style={{ padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
          />
          <input
            aria-label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu"
            required
            style={{ padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
          />
          <button type="submit" disabled={loading} style={btnPrimary}>
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => { setForgotMode((v) => !v); setOtpMode(false); }} style={btnSecondary}>
            {forgotMode ? 'Ẩn quên mật khẩu' : 'Quên mật khẩu'}
          </button>
          <button type="button" onClick={() => { setOtpMode((v) => !v); setForgotMode(false); }} style={btnSecondary}>
            {otpMode ? 'Ẩn đăng nhập OTP' : 'Đăng nhập bằng OTP'}
          </button>
          <button type="button" onClick={() => router.push('/auth/reset-password')} style={btnSecondary}>
            Đặt lại mật khẩu bằng token
          </button>
        </div>

        {forgotMode ? (
          <form onSubmit={onForgotPassword} style={{ display: 'grid', gap: 8, border: '1px solid #e5e7eb', borderRadius: 6, padding: 12 }}>
            <strong>Yêu cầu reset mật khẩu</strong>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email tài khoản"
              required
              style={{ padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
            />
            <button type="submit" disabled={loading} style={btnPrimary}>Gửi link reset</button>
          </form>
        ) : null}

        {otpMode ? (
          <div style={{ display: 'grid', gap: 8, border: '1px solid #e5e7eb', borderRadius: 6, padding: 12 }}>
            <strong>Xác thực OTP qua email</strong>
            <form onSubmit={onSendOtp} style={{ display: 'grid', gap: 8 }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                style={{ padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
              />
              <button type="submit" disabled={loading} style={btnSecondary}>Gửi OTP</button>
            </form>
            <form onSubmit={onVerifyOtp} style={{ display: 'grid', gap: 8 }}>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Nhập OTP 6 số"
                required
                minLength={6}
                maxLength={6}
                style={{ padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
              />
              <button type="submit" disabled={loading} style={btnPrimary}>Xác thực OTP</button>
            </form>
          </div>
        ) : null}

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
