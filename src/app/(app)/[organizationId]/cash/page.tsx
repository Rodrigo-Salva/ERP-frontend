import type { Metadata } from 'next';
import { SessionsView } from '@/features/cash';
import { requireRole, SELLING } from '@/server/guards';

export const metadata: Metadata = { title: 'Caja' };

export default async function CashPage({
  params,
}: PageProps<'/[organizationId]/cash'>) {
  await requireRole((await params).organizationId, SELLING, 'cash');
  return <SessionsView />;
}
