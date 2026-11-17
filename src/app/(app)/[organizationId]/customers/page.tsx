import type { Metadata } from 'next';
import { CustomersView } from '@/features/customers';
import { requireRole, SELLING } from '@/server/guards';

export const metadata: Metadata = { title: 'Clientes' };

export default async function CustomersPage({
  params,
}: PageProps<'/[organizationId]/customers'>) {
  await requireRole((await params).organizationId, SELLING, 'customers');
  return <CustomersView />;
}
