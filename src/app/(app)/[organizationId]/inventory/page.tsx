import type { Metadata } from 'next';
import { InventoryView } from '@/features/inventory';
import { requireRole } from '@/server/guards';

export const metadata: Metadata = { title: 'Inventario' };

export default async function InventoryPage({
  params,
}: PageProps<'/[organizationId]/inventory'>) {
  await requireRole((await params).organizationId, undefined, 'inventory');
  return <InventoryView />;
}
