'use client';

import { useCallback, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

export interface CompanyInfo {
  name: string;
  logo_url?: string | null;
  work_days?: string[];
  work_start?: string;
  work_end?: string;
}

export interface WorkSchedule {
  work_days: string[];
  work_start: string;
  work_end: string;
}

export interface LanguageSetting {
  language: 'vi' | 'en';
}

export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content_url: string;
  tags?: string[];
}

export interface HelpResponse {
  role: string;
  articles: HelpArticle[];
  total: number;
}

export interface DangerousAction {
  action_type: string;
  label: string;
  confirmation_message: string;
  cannot_undo: boolean;
}

export interface BreadcrumbItem {
  label: string;
  url: string;
}

export function useSettings() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const fetchCompany = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest<CompanyInfo>('/api/v1/settings/company', { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const updateCompany = useCallback(async (payload: { name?: string; logo_url?: string }) => {
    setLoading(true);
    try {
      return await apiRequest<CompanyInfo>('/api/v1/settings/company', {
        method: 'PATCH',
        token: accessToken,
        body: payload
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchWorkSchedule = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest<WorkSchedule>('/api/v1/settings/work-schedule', { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const updateWorkSchedule = useCallback(async (payload: {
    work_days?: string[];
    work_start?: string;
    work_end?: string;
  }) => {
    setLoading(true);
    try {
      return await apiRequest<WorkSchedule>('/api/v1/settings/work-schedule', {
        method: 'PATCH',
        token: accessToken,
        body: payload
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchIsWorkingTime = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest<{ is_working_time: boolean; reason?: string }>('/api/v1/settings/is-working-time', { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchLanguage = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest<LanguageSetting>('/api/v1/settings/language', { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const setLanguage = useCallback(async (language: 'vi' | 'en') => {
    setLoading(true);
    try {
      return await apiRequest<LanguageSetting>('/api/v1/settings/language', {
        method: 'PATCH',
        token: accessToken,
        body: { language }
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchHelp = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      return await apiRequest<HelpResponse>(`/api/v1/settings/help${query}`, { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchDangerousActions = useCallback(async () => {
    setLoading(true);
    try {
      return await apiRequest<{ actions: DangerousAction[] }>('/api/v1/settings/dangerous-actions', { token: accessToken });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchBreadcrumb = useCallback(async (path: string) => {
    setLoading(true);
    try {
      return await apiRequest<{ path: string; breadcrumbs: BreadcrumbItem[] }>(`/api/v1/settings/breadcrumb?path=${encodeURIComponent(path)}`, {
        token: accessToken
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  return {
    loading,
    fetchCompany,
    updateCompany,
    fetchWorkSchedule,
    updateWorkSchedule,
    fetchIsWorkingTime,
    fetchLanguage,
    setLanguage,
    fetchHelp,
    fetchDangerousActions,
    fetchBreadcrumb
  };
}
