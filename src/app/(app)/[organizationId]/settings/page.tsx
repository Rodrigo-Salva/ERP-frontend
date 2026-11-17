import type { Metadata } from 'next';
import { SettingsView } from '@/features/settings';
import { ADMINS, requireRole } from '@/server/guards';

export const metadata: Metadata = { title: 'Configuración' };

export default async function SettingsPage({
  params,
}: PageProps<'/[organizationId]/settings'>) {
  await requireRole((await params).organizationId, ADMINS, 'settings');
  return <SettingsView />;
}
