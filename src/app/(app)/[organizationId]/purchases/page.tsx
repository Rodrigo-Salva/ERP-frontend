import type { Metadata } from 'next';
import { PurchasesView } from '@/features/purchases';
import { MANAGEMENT, requireRole } from '@/server/guards';

export const metadata: Metadata = { title: 'Compras' };

export default async function PurchasesPage({
  params,
}: PageProps<'/[organizationId]/purchases'>) {
  await requireRole((await params).organizationId, MANAGEMENT, 'purchases');
  return <PurchasesView />;
}
