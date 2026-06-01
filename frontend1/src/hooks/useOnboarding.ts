'use client';

import { useCallback, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

export interface OnboardingStep {
  step_id: string;
  title: string;
  description: string;
  action_url: string;
  is_done: boolean;
  order: number;
}

export interface OnboardingChecklist {
  items: OnboardingStep[];
  done_count: number;
  total: number;
  completion_pct: number;
  is_complete: boolean;
}

export function useOnboarding() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  const fetchChecklist = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest<OnboardingChecklist>('/api/v1/onboarding/checklist', { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const markStep = useCallback(async (stepId: string, isDone: boolean) => {
    setLoading(true);
    try {
      return await apiRequest<{ step_id: string; title: string; is_done: boolean }>(`/api/v1/onboarding/checklist/${stepId}`, {
        method: 'PATCH',
        token: accessToken,
        body: { is_done: isDone }
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const downloadGuide = useCallback(async (role: 'staff' | 'manager' | 'ceo') => {
    if (!accessToken) throw new Error('Bạn chưa đăng nhập.');
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/onboarding/guide/${role}`, {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + accessToken },
        cache: 'no-store'
      });
      if (!response.ok) {
        let message = `Request failed with status ${response.status}`;
        try {
          const payload = await response.json();
          message = payload.detail || payload.message || message;
        } catch {
          // ignore parse errors
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `huong-dan-${role}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }, [accessToken, apiBaseUrl]);

  return {
    loading,
    fetchChecklist,
    markStep,
    downloadGuide
  };
}
