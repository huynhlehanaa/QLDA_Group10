'use client';

import { useCallback, useMemo } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { toQuery, useApiLoading } from '@/hooks/apiUtils';
import type { PaginatedUsers, UserItem } from '@/hooks/types';

type ResetPasswordResponse = {
  message: string;
  temp_password: string;
};

export function useUsers() {
  const { accessToken } = useAuthStore();
  const { loading, run } = useApiLoading();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  const listManagers = useCallback((search = '', page = 1) => run(() => (
    apiRequest<PaginatedUsers>(`/api/v1/users/managers${toQuery({ search, page, page_size: 20 })}`, { token: accessToken })
  )), [accessToken, run]);

  const createManager = useCallback((payload: { full_name: string; email: string; dept_id: string }) => run(() => (
    apiRequest<UserItem>('/api/v1/users/managers', { method: 'POST', token: accessToken, body: payload })
  )), [accessToken, run]);

  const updateManager = useCallback((id: string, payload: { full_name?: string; dept_id?: string }) => run(() => (
    apiRequest<UserItem>(`/api/v1/users/managers/${id}`, { method: 'PATCH', token: accessToken, body: payload })
  )), [accessToken, run]);

  const setManagerActive = useCallback((id: string, active: boolean) => run(() => (
    apiRequest<{ message: string }>(`/api/v1/users/managers/${id}/${active ? 'activate' : 'deactivate'}`, { method: 'PATCH', token: accessToken })
  )), [accessToken, run]);

  const resetManagerPassword = useCallback((id: string) => run(() => (
    apiRequest<ResetPasswordResponse>(`/api/v1/users/managers/${id}/reset-password`, { method: 'POST', token: accessToken })
  )), [accessToken, run]);

  const listStaff = useCallback((search = '') => run(() => (
    apiRequest<UserItem[]>(`/api/v1/users/staff${toQuery({ search })}`, { token: accessToken })
  )), [accessToken, run]);

  const createStaff = useCallback((payload: { full_name: string; email: string; phone?: string }) => run(() => (
    apiRequest<UserItem>('/api/v1/users/staff', { method: 'POST', token: accessToken, body: payload })
  )), [accessToken, run]);

  const updateStaff = useCallback((id: string, payload: { full_name?: string; phone?: string }) => run(() => (
    apiRequest<UserItem>(`/api/v1/users/staff/${id}`, { method: 'PATCH', token: accessToken, body: payload })
  )), [accessToken, run]);

  const setStaffActive = useCallback((id: string, active: boolean) => run(() => (
    apiRequest<{ message: string }>(`/api/v1/users/staff/${id}/${active ? 'activate' : 'deactivate'}`, { method: 'PATCH', token: accessToken })
  )), [accessToken, run]);

  const resetStaffPassword = useCallback((id: string) => run(() => (
    apiRequest<ResetPasswordResponse>(`/api/v1/users/staff/${id}/reset-password`, { method: 'POST', token: accessToken })
  )), [accessToken, run]);

  const updateAvatar = useCallback((avatar_url: string) => run(() => (
    apiRequest<{ avatar_url: string }>('/api/v1/users/me/avatar', { method: 'PATCH', token: accessToken, body: { avatar_url } })
  )), [accessToken, run]);

  const updatePhone = useCallback((phone: string) => run(() => (
    apiRequest<{ phone: string }>('/api/v1/users/me/phone', { method: 'PATCH', token: accessToken, body: { phone } })
  )), [accessToken, run]);

  const downloadStaffTemplate = useCallback(async () => {
    if (!accessToken) throw new Error('Bạn chưa đăng nhập.');
    const response = await fetch(`${apiBaseUrl}/api/v1/users/staff/template/download`, {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    if (!response.ok) throw new Error('Không tải được file template.');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_nhan_vien.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [accessToken, apiBaseUrl]);

  const importStaff = useCallback(async (file: File) => {
    if (!accessToken) throw new Error('Bạn chưa đăng nhập.');
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(`${apiBaseUrl}/api/v1/users/staff/import`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken },
      body: form
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.detail || payload?.message || 'Import nhân viên thất bại.');
    }
    return response.json();
  }, [accessToken, apiBaseUrl]);

  return useMemo(() => ({
    loading,
    listManagers,
    createManager,
    updateManager,
    setManagerActive,
    resetManagerPassword,
    listStaff,
    createStaff,
    updateStaff,
    setStaffActive,
    resetStaffPassword,
    updateAvatar,
    updatePhone,
    downloadStaffTemplate,
    importStaff
  }), [
    loading,
    listManagers,
    createManager,
    updateManager,
    setManagerActive,
    resetManagerPassword,
    listStaff,
    createStaff,
    updateStaff,
    setStaffActive,
    resetStaffPassword,
    updateAvatar,
    updatePhone,
    downloadStaffTemplate,
    importStaff
  ]);
}
