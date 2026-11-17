import { useQuery } from '@tanstack/react-query';
import type { ListParams } from '@/lib/api/types';
import { useDebounced } from '@/lib/hooks/use-debounced';
import { fetchReceipt, fetchSales, salesKey, searchVariants } from './api';

export function useVariantSearch(organizationId: string, text: string) {
  const q = useDebounced(text.trim(), 250);
  return useQuery({
    queryKey: ['organizations', organizationId, 'variant-search', q],
    queryFn: ({ signal }) => searchVariants(organizationId, q, signal),
    enabled: q.length > 0,
    select: (page) => page.items,
    staleTime: 15_000,
  });
}

export const useSales = (
  organizationId: string,
  params: ListParams & { customerId?: string },
) =>
  useQuery({
    queryKey: salesKey(organizationId, params),
    queryFn: ({ signal }) => fetchSales(organizationId, params, signal),
  });

export const useReceipt = (organizationId: string, id: string | null) =>
  useQuery({
    queryKey: ['organizations', organizationId, 'receipt', id],
    queryFn: ({ signal }) => fetchReceipt(organizationId, id!, signal),
    enabled: id !== null,
  });
