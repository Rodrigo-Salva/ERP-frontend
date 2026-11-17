import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DashboardView } from '@/features/dashboard';
import { getProfile } from '@/server/profile';

export const metadata: Metadata = { title: 'Panel' };

export default async function DashboardPage({
  params,
}: PageProps<'/[organizationId]/dashboard'>) {
  const { organizationId } = await params;
  const membership = (await getProfile())?.memberships.find(
    (m) => m.organizationId === organizationId,
  );
  if (!membership) notFound();

  return (
    <DashboardView
      organizationId={organizationId}
      currency={membership.organization.currency}
      locale={membership.organization.locale}
    />
  );
}
