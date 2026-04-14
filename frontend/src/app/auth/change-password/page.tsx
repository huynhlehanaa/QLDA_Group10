"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { useAuth } from "../../../hooks/useAuth";
import { changePassword, validatePasswordStrength } from "../../../lib/auth";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { isAuthenticated, mustChangePassword } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invalidPassword = useMemo(() => {
    return newPassword.length > 0 && !validatePasswordStrength(newPassword);
  }, [newPassword]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    if (!mustChangePassword) {
      router.replace("/employee/profile");
    }
  }, [isAuthenticated, mustChangePassword, router]);

  if (!isAuthenticated || !mustChangePassword) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalidPassword) {
      setError("Mật khẩu mới chưa đạt độ mạnh tối thiểu.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await changePassword(oldPassword, newPassword);
      router.push("/auth/login");
    } catch (cause) {
      if (axios.isAxiosError(cause)) {
        const detail = cause.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Doi mat khau that bai.");
      } else {
        setError("Doi mat khau that bai.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <section className="auth-shell">
        <aside className="auth-hero">
          <div className="hero-pill">Bảo vệ tài khoản</div>
          <h1>Đổi mật khẩu đầu tiên trước khi tiếp tục.</h1>
          <p>
            Mật khẩu mạnh giúp bảo vệ dữ liệu KPI, thông tin cá nhân và toàn bộ quyền truy cập nội bộ của bạn.
          </p>
          <div className="hero-metrics">
            <div className="metric">
              <strong>8+</strong>
              <span>Ký tự tối thiểu</span>
            </div>
            <div className="metric">
              <strong>A-Z</strong>
              <span>Có chữ hoa, số và ký tự đặc biệt</span>
            </div>
            <div className="metric">
              <strong>An toàn</strong>
              <span>Khóa luồng cho đến khi cập nhật xong</span>
            </div>
          </div>
        </aside>

        <section className="card auth-card">
          <h1 className="title">Đổi mật khẩu lần đầu</h1>
          <p className="muted">Bạn cần đổi mật khẩu trước khi sử dụng hệ thống.</p>
          <form className="stack" onSubmit={handleSubmit}>
            <label>
              Mật khẩu hiện tại
              <input
                type="password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                required
              />
            </label>

            <label>
              Mật khẩu mới
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </label>

            <p className="helper-text">Tối thiểu 8 ký tự, có chữ hoa, chữ số và ký tự đặc biệt.</p>
            {error ? <p className="error">{error}</p> : null}
            <button type="submit" disabled={submitting}>
              {submitting ? "Đang cập nhật..." : "Xác nhận đổi mật khẩu"}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
