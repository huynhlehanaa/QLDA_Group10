'use client';

import { useCallback, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

export function useKpi() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const fetchKpi = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest('/api/v1/kpi', { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  return { loading, fetchKpi };
}
