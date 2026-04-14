"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { login, mapAuthErrorCode } from "../../../lib/auth";

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const result = await login(email, password);
			if (result.must_change_pw) {
				router.push("/auth/change-password");
				return;
			}
			router.push("/employee/profile");
		} catch (cause) {
			if (axios.isAxiosError(cause)) {
				const code = cause.response?.data?.detail?.code as string | undefined;
				setError(mapAuthErrorCode(code));
			} else {
				setError("Dang nhap that bai. Vui long thu lai.");
			}
		} finally {
			setLoading(false);
		}
	}

	return (
		<main className="page">
			<section className="auth-shell">
				<aside className="auth-hero">
					<div className="hero-pill">Cổng đăng nhập nội bộ</div>
					<h1>Quản lý KPI rõ ràng, nhanh và chuyên nghiệp hơn.</h1>
					<p>
						Đăng nhập bằng email công ty để xem hồ sơ, cập nhật thông tin cá nhân và xử lý quy trình ngay trên một màn hình.
					</p>
					<div className="hero-metrics">
						<div className="metric">
							<strong>1 lần</strong>
							<span>Đăng nhập cho toàn bộ luồng công việc</span>
						</div>
						<div className="metric">
							<strong>Avatar</strong>
							<span>Hiển thị nhận diện nhân viên rõ ràng</span>
						</div>
						<div className="metric">
							<strong>24/7</strong>
							<span>Sẵn sàng cho PWA và truy cập di động</span>
						</div>
					</div>
				</aside>

				<section className="card auth-card">
					<h1 className="title">Đăng nhập</h1>
					<p className="muted">Nhập email công ty và mật khẩu để tiếp tục.</p>
					<form className="stack" onSubmit={handleSubmit}>
						<label>
							Email công ty
							<input
								type="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								required
								autoComplete="email"
								placeholder="staff@company.com"
							/>
						</label>

						<label>
							Mật khẩu
							<input
								type="password"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								required
								autoComplete="current-password"
								placeholder="Nhập mật khẩu"
							/>
						</label>

						{error ? <p className="error">{error}</p> : null}

						<button type="submit" disabled={loading}>
							{loading ? "Đang đăng nhập..." : "Đăng nhập"}
						</button>
					</form>
				</section>
			</section>
		</main>
	);
}
