import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Decimal, Page } from '@/lib/api/types';

export interface CashSession {
  id: string;
  branchId: string;
  cashRegisterId: string;
  actorId: string;
  opening: Decimal;
  expected: Decimal | null;
  counted: Decimal | null;
  difference: Decimal | null;
  closedBy: string | null;
  closedAt: string | null;
  createdAt: string;
}

export const cashKeys = {
  all: (organizationId: string) =>
    ['organizations', organizationId, 'cash'] as const,
  open: (organizationId: string) =>
    ['organizations', organizationId, 'cash', 'open'] as const,
};

/**
 * Sesiones de caja abiertas visibles para el usuario (un cajero ve solo las suyas).
 * El backend no filtra por estado, así que se piden las más recientes y se filtran aquí.
 */
export const useOpenCashSessions = (organizationId: string) =>
  useQuery({
    queryKey: cashKeys.open(organizationId),
    queryFn: ({ signal }) =>
      api.get<Page<CashSession>>(
        `/organizations/${organizationId}/cash-sessions`,
        { query: { limit: 100 }, signal },
      ),
    select: (page) => page.items.filter((session) => !session.closedAt),
  });
