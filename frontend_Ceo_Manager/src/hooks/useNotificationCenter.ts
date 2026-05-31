'use client';

import { useCallback, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at?: string | null;
}

export interface NotificationListResponse {
  total: number;
  unread_count: number;
  page: number;
  page_size: number;
  items: NotificationItem[];
}

export function useNotificationCenter() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const listNotifications = useCallback(async (params: {
    type?: string;
    unreadOnly?: boolean;
    page?: number;
    pageSize?: number;
  } = {}) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (params.type) query.set('type', params.type);
      if (params.unreadOnly) query.set('unread_only', 'true');
      query.set('page', String(params.page || 1));
      query.set('page_size', String(params.pageSize || 20));
      return await apiRequest<NotificationListResponse>(`/api/v1/notifications?${query.toString()}`, { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const markRead = useCallback(async (notifId: string) => {
    setLoading(true);
    try {
      return await apiRequest<{ id: string; is_read: boolean }>(`/api/v1/notifications/${notifId}/read`, {
        method: 'PATCH',
        token: accessToken
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const markAllRead = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest<{ marked_count: number }>('/api/v1/notifications/read-all', {
        method: 'POST',
        token: accessToken
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const cleanupNotifications = useCallback(async (days: number) => {
    setLoading(true);
    try {
      return await apiRequest<{ deleted_count: number; older_than_days: number }>(`/api/v1/notifications/cleanup?days=${days}`, {
        method: 'POST',
        token: accessToken
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  return {
    loading,
    listNotifications,
    markRead,
    markAllRead,
    cleanupNotifications
  };
}
