import { useQuery } from '@tanstack/react-query';
import { dashboardKey, fetchDashboard } from './api';

export function useDashboard(organizationId: string, branchId?: string) {
  return useQuery({
    queryKey: dashboardKey(organizationId, branchId),
    queryFn: ({ signal }) => fetchDashboard(organizationId, branchId, signal),
    // El panel refleja la operación del día: se refresca solo cada minuto.
    refetchInterval: 60_000,
  });
}
