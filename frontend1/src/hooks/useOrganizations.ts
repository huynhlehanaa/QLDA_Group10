'use client';

import { useCallback, useMemo } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useApiLoading } from '@/hooks/apiUtils';
import type { Department, DeptStatsItem, OrgChartNode } from '@/hooks/types';

export function useOrganizations() {
  const { accessToken } = useAuthStore();
  const { loading, run } = useApiLoading();

  const listDepartments = useCallback(() => run(() => (
    apiRequest<Department[]>('/api/v1/organizations/departments', { token: accessToken })
  )), [accessToken, run]);

  const createDepartment = useCallback((payload: { name: string; description?: string; manager_id?: string }) => run(() => (
    apiRequest<Department>('/api/v1/organizations/departments', { method: 'POST', token: accessToken, body: payload })
  )), [accessToken, run]);

  const updateDepartment = useCallback((id: string, payload: { name?: string; description?: string }) => run(() => (
    apiRequest<Department>(`/api/v1/organizations/departments/${id}`, { method: 'PATCH', token: accessToken, body: payload })
  )), [accessToken, run]);

  const assignDepartmentManager = useCallback((id: string, manager_id: string) => run(() => (
    apiRequest<Department>(`/api/v1/organizations/departments/${id}/assign-manager`, {
      method: 'PATCH',
      token: accessToken,
      body: { manager_id }
    })
  )), [accessToken, run]);

  const deactivateDepartment = useCallback((id: string) => run(() => (
    apiRequest<{ message: string }>(`/api/v1/organizations/departments/${id}`, { method: 'DELETE', token: accessToken })
  )), [accessToken, run]);

  const departmentsWithoutManager = useCallback(() => run(() => (
    apiRequest<{ count: number; departments: Array<{ id: string; name: string }> }>('/api/v1/organizations/departments/without-manager', { token: accessToken })
  )), [accessToken, run]);

  const getOrgChart = useCallback(() => run(() => (
    apiRequest<OrgChartNode>('/api/v1/organizations/org-chart', { token: accessToken })
  )), [accessToken, run]);

  const getDeptStats = useCallback(() => run(() => (
    apiRequest<DeptStatsItem[]>('/api/v1/organizations/stats', { token: accessToken })
  )), [accessToken, run]);

  return useMemo(() => ({
    loading,
    listDepartments,
    createDepartment,
    updateDepartment,
    assignDepartmentManager,
    deactivateDepartment,
    departmentsWithoutManager,
    getOrgChart,
    getDeptStats
  }), [
    loading,
    listDepartments,
    createDepartment,
    updateDepartment,
    assignDepartmentManager,
    deactivateDepartment,
    departmentsWithoutManager,
    getOrgChart,
    getDeptStats
  ]);
}
