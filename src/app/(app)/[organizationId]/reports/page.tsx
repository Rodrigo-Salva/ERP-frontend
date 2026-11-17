import type { Metadata } from 'next';
import { ReportsView } from '@/features/reports';
import { requireRole } from '@/server/guards';

export const metadata: Metadata = { title: 'Reportes' };

export default async function ReportsPage({
  params,
}: PageProps<'/[organizationId]/reports'>) {
  await requireRole((await params).organizationId, undefined, 'reports');
  return <ReportsView />;
}
