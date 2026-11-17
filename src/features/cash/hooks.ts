import { useQuery } from '@tanstack/react-query';
import type { ListParams } from '@/lib/api/types';
import {
  expensesKey,
  fetchExpenses,
  fetchSession,
  fetchSessions,
  sessionKey,
  sessionsKey,
} from './api';

export const useSessions = (organizationId: string, params: ListParams) =>
  useQuery({
    queryKey: sessionsKey(organizationId, params),
    queryFn: ({ signal }) => fetchSessions(organizationId, params, signal),
  });

export const useSessionDetail = (organizationId: string, id: string | null) =>
  useQuery({
    queryKey: sessionKey(organizationId, id ?? ''),
    queryFn: ({ signal }) => fetchSession(organizationId, id!, signal),
    enabled: id !== null,
  });

export const useExpenses = (organizationId: string, params: ListParams) =>
  useQuery({
    queryKey: expensesKey(organizationId, params),
    queryFn: ({ signal }) => fetchExpenses(organizationId, params, signal),
  });
