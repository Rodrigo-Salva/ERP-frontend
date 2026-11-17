import { api } from '@/lib/api/client';
import type { DashboardData } from './types';

export const dashboardKey = (organizationId: string, branchId?: string) =>
  ['organizations', organizationId, 'dashboard', branchId ?? 'all'] as const;

export const fetchDashboard = (
  organizationId: string,
  branchId?: string,
  signal?: AbortSignal,
) =>
  api.get<DashboardData>(`/organizations/${organizationId}/dashboard`, {
    query: { branchId },
    signal,
  });
