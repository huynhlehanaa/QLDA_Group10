'use client';

import { useCallback, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

export function useTasks() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest('/api/v1/tasks', { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  return { loading, fetchTasks };
}
