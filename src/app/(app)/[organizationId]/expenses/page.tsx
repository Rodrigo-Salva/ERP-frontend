import type { Metadata } from 'next';
import { ExpensesView } from '@/features/cash';
import { MANAGEMENT, requireRole } from '@/server/guards';

export const metadata: Metadata = { title: 'Gastos' };

export default async function ExpensesPage({
  params,
}: PageProps<'/[organizationId]/expenses'>) {
  await requireRole((await params).organizationId, MANAGEMENT, 'expenses');
  return <ExpensesView />;
}
