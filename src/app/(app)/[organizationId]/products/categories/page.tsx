import type { Metadata } from 'next';
import { TaxonomyView } from '@/features/catalog';
import { requireRole } from '@/server/guards';

export const metadata: Metadata = { title: 'Categorías y unidades' };

export default async function TaxonomyPage({
  params,
}: PageProps<'/[organizationId]/products/categories'>) {
  await requireRole((await params).organizationId, undefined, 'categories');
  return <TaxonomyView />;
}
