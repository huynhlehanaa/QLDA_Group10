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
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  must_change_pw: boolean;
  dept_id?: string | null;
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
  return apiRequest<{ access_token: string; refresh_token: string; token_type: string }>('/api/v1/auth/refresh', {
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
