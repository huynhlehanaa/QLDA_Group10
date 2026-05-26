'use client';

import { useCallback, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { authStore } from '@/store/authStore';

export function useTasks() {
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest('/api/v1/tasks', { token: authStore.state.accessToken });
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, fetchTasks };
}
