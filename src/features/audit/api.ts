import { api } from '@/lib/api/client';
import { fetchAllPages } from '@/lib/api/paging';
import type { ListParams, Page } from '@/lib/api/types';
import type { AuditEvent } from './types';

const base = (o: string) => `/organizations/${o}`;

export const auditKey = (o: string, params: unknown) =>
  ['organizations', o, 'audit', params] as const;

export const fetchAudit = (
  o: string,
  params: ListParams,
  signal?: AbortSignal,
) =>
  api.get<Page<AuditEvent>>(`${base(o)}/audit-events`, {
    query: { ...params },
    signal,
  });

/** id de usuario → nombre, para mostrar quién hizo cada operación. */
export async function fetchMemberNames(
  o: string,
  signal?: AbortSignal,
): Promise<Map<string, string>> {
  const page = await fetchAllPages<{ user: { id: string; name: string } }>(
    `${base(o)}/members`,
    {},
    signal,
  );
  return new Map(page.items.map((m) => [m.user.id, m.user.name]));
}
