import { apiClient } from "./api";
import { useAuthStore } from "../store/authStore";
import type { LoginResponse, UserProfile } from "../types/auth";

export interface ApiErrorBody {
	detail?: {
		code?: string;
		message?: string;
	};
}

const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

export function validatePasswordStrength(password: string): boolean {
	return PASSWORD_PATTERN.test(password);
}

export async function login(email: string, password: string): Promise<LoginResponse> {
	const response = await apiClient.post<LoginResponse>("/auth/login", { email, password });
	const payload = response.data;
	useAuthStore.getState().setSession({
		accessToken: payload.access_token,
		refreshToken: payload.refresh_token,
		role: payload.role,
		userId: payload.user_id,
		fullName: payload.full_name,
		avatarUrl: payload.avatar_url,
		mustChangePassword: payload.must_change_pw,
	});
	return payload;
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
	await apiClient.post("/auth/change-password", {
		old_password: oldPassword,
		new_password: newPassword,
	});
	useAuthStore.getState().clearSession();
}

export async function getMyProfile(): Promise<UserProfile> {
	const response = await apiClient.get<UserProfile>("/users/me");
	useAuthStore.getState().setProfile(response.data);
	return response.data;
}

export async function updateMyPhone(phone: string): Promise<string> {
	const response = await apiClient.patch<{ phone: string }>("/users/me/phone", { phone });
	return response.data.phone;
}

export async function updateMyAvatar(avatarUrl: string): Promise<string> {
	const response = await apiClient.patch<{ avatar_url: string }>("/users/me/avatar", {
		avatar_url: avatarUrl,
	});
	return response.data.avatar_url;
}

export function mapAuthErrorCode(code?: string): string {
	switch (code) {
		case "EMAIL_NOT_FOUND":
			return "Email khong ton tai.";
		case "WRONG_PASSWORD":
			return "Mat khau khong dung.";
		case "ACCOUNT_LOCKED":
			return "Tai khoan da bi khoa tam thoi.";
		case "ACCOUNT_DISABLED":
			return "Tai khoan da bi vo hieu hoa.";
		default:
			return "Dang nhap that bai. Vui long thu lai.";
	}
}
