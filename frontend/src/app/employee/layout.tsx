"use client";

import Link from "next/link";

import { AuthGuard } from "../../components/AuthGuard";
import { Avatar } from "../../components/Avatar";
import { useAuth } from "../../hooks/useAuth";
import { useAuthStore } from "../../store/authStore";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const clearSession = useAuthStore((state) => state.clearSession);
  const { fullName, role, avatarUrl } = useAuth();

  const roleLabel =
    role === "ceo" ? "Tổng giám đốc" : role === "manager" ? "Quản lý" : "Nhân viên";

  return (
    <AuthGuard>
      <div className="shell">
        <header className="topbar panel">
          <div className="brand-block">
            <div className="brand-mark">KP</div>
            <div className="brand-copy">
              <strong>KPI Nội Bộ</strong>
              <span>Không gian làm việc cho đội ngũ</span>
            </div>
          </div>
          <div className="row">
            <div className="badge-row">
              <span className="badge">{roleLabel}</span>
              {fullName ? <span className="badge">{fullName}</span> : null}
            </div>
            <Link className="ghost-button" href="/employee/profile">
              Hồ sơ
            </Link>
            <Avatar name={fullName ?? "Người dùng"} src={avatarUrl} size="sm" />
            <button
              type="button"
              onClick={() => {
                clearSession();
              }}
            >
              Đăng xuất
            </button>
          </div>
        </header>
        {children}
      </div>
    </AuthGuard>
  );
}
