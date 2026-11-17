import type { Metadata } from 'next';
import { AuditView } from '@/features/audit';
import { ADMINS, requireRole } from '@/server/guards';

export const metadata: Metadata = { title: 'Auditoría' };

export default async function AuditPage({
  params,
}: PageProps<'/[organizationId]/audit'>) {
  await requireRole((await params).organizationId, ADMINS, 'audit');
  return <AuditView />;
}
