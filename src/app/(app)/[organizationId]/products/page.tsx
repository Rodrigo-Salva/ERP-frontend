import type { Metadata } from 'next';
import { ProductsView } from '@/features/catalog';
import { requireRole } from '@/server/guards';

export const metadata: Metadata = { title: 'Productos' };

export default async function ProductsPage({
  params,
}: PageProps<'/[organizationId]/products'>) {
  await requireRole((await params).organizationId, undefined, 'products');
  return <ProductsView />;
}
