'use client';

import { useCallback, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { authStore } from '@/store/authStore';

export function useKpi() {
  const [loading, setLoading] = useState(false);

  const fetchKpi = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest('/api/v1/kpi', { token: authStore.state.accessToken });
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, fetchKpi };
}
