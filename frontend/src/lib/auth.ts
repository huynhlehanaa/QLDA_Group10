import { apiRequest } from '@/lib/api';

export type UserRole = 'ceo' | 'manager' | 'staff';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  role: UserRole;
  must_change_pw: boolean;
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  session_expires_at?: string | null;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  must_change_pw: boolean;
  dept_id?: string | null;
  avatar_url?: string | null;
  first_login_at?: string | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  session_expires_at?: string | null;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password }
  });
}

export async function fetchMe(token: string): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/v1/users/me', { token });
}

export async function refreshToken(refreshTokenValue: string) {
  return apiRequest<TokenResponse>('/api/v1/auth/refresh', {
    method: 'POST',
    body: { refresh_token: refreshTokenValue }
  });
}

export async function logout(token: string, refreshTokenValue: string) {
  return apiRequest<null>('/api/v1/auth/logout', {
    method: 'POST',
    token,
    body: { refresh_token: refreshTokenValue }
  });
}

export async function logoutAll(token: string) {
  return apiRequest<null>('/api/v1/auth/logout-all', {
    method: 'POST',
    token
  });
}

export async function forgotPassword(email: string) {
  return apiRequest<{ message: string }>('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: { email }
  });
}

export async function resetPassword(token: string, newPassword: string) {
  return apiRequest<{ message: string }>('/api/v1/auth/reset-password', {
    method: 'POST',
    body: { token, new_password: newPassword }
  });
}

export async function changePassword(token: string, oldPassword: string, newPassword: string) {
  return apiRequest<{ message: string }>('/api/v1/auth/change-password', {
    method: 'POST',
    token,
    body: { old_password: oldPassword, new_password: newPassword }
  });
}

export async function sendOtp(email: string) {
  return apiRequest<{ message: string }>('/api/v1/auth/otp/send', {
    method: 'POST',
    body: { email }
  });
}

export async function verifyOtp(email: string, otp: string) {
  return apiRequest<TokenResponse>('/api/v1/auth/otp/verify', {
    method: 'POST',
    body: { email, otp }
  });
}
