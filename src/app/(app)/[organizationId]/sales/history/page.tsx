import type { Metadata } from 'next';
import { SalesHistory } from '@/features/sales';
import { requireRole, SELLING } from '@/server/guards';

export const metadata: Metadata = { title: 'Ventas' };

export default async function SalesHistoryPage({
  params,
}: PageProps<'/[organizationId]/sales/history'>) {
  await requireRole((await params).organizationId, SELLING, 'sales');
  return <SalesHistory />;
}
