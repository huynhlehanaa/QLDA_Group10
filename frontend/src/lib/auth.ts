import { apiRequest } from './api';
import type { LoginResponse, UserProfile } from '../types/auth';

export async function login(email: string, password: string): Promise<LoginResponse> {
  // Thay đổi cấu trúc truyền tham số: (method, url, data)
  return apiRequest('POST', '/auth/login', { email, password });
}

export async function fetchMe(): Promise<UserProfile> {
  // Đồng bộ theo endpoint thực tế của Backend FastAPI của nhóm bạn
  return apiRequest('GET', '/users/me');
}

export async function refreshToken(refreshSessionToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  token_type: string;
}> {
  return apiRequest('POST', '/auth/refresh', { refresh_token: refreshSessionToken });
}

export async function logout(refreshSessionToken: string): Promise<void> {
  return apiRequest('POST', '/auth/logout', { refresh_token: refreshSessionToken });
}