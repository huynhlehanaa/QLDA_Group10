'use client';

import { useCallback, useMemo } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { toQuery, useApiLoading } from '@/hooks/apiUtils';
import type { LoginLogResult } from '@/hooks/types';

export function useSecurity() {
  const { accessToken } = useAuthStore();
  const { loading, run } = useApiLoading();

  const getLoginLogs = useCallback((success?: boolean) => run(() => (
    apiRequest<LoginLogResult>(`/api/v1/logs/login${toQuery({ success, page: 1, page_size: 30 })}`, { token: accessToken })
  )), [accessToken, run]);

  const changePassword = useCallback((old_password: string, new_password: string) => run(() => (
    apiRequest<{ message: string }>('/api/v1/auth/change-password', {
      method: 'POST',
      token: accessToken,
      body: { old_password, new_password }
    })
  )), [accessToken, run]);

  const logoutAll = useCallback(() => run(() => (
    apiRequest<null>('/api/v1/auth/logout-all', { method: 'POST', token: accessToken })
  )), [accessToken, run]);

  const forgotPassword = useCallback((email: string) => run(() => (
    apiRequest<{ message: string }>('/api/v1/auth/forgot-password', { method: 'POST', body: { email } })
  )), [run]);

  const resetPassword = useCallback((token: string, new_password: string) => run(() => (
    apiRequest<{ message: string }>('/api/v1/auth/reset-password', { method: 'POST', body: { token, new_password } })
  )), [run]);

  const sendOtp = useCallback((email: string) => run(() => (
    apiRequest<{ message: string }>('/api/v1/auth/otp/send', { method: 'POST', body: { email } })
  )), [run]);

  return useMemo(() => ({
    loading,
    getLoginLogs,
    changePassword,
    logoutAll,
    forgotPassword,
    resetPassword,
    sendOtp
  }), [loading, getLoginLogs, changePassword, logoutAll, forgotPassword, resetPassword, sendOtp]);
}
