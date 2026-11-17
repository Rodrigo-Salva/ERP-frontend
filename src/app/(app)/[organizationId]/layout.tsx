import { notFound, redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/shell/app-shell';
import { OrganizationProvider } from '@/components/providers/organization-context';
import { visibleNavigation } from '@/config/navigation';
import { LogoutButton } from '@/features/auth';
import { getProfile } from '@/server/profile';

export default async function OrganizationLayout({
  children,
  params,
}: LayoutProps<'/[organizationId]'>) {
  const { organizationId } = await params;
  const profile = await getProfile();
  if (!profile) redirect('/login');

  // La URL nunca da acceso por sí sola: la organización debe estar entre las membresías.
  const membership = profile.memberships.find(
    (m) => m.organizationId === organizationId,
  );
  if (!membership) notFound();

  return (
    <OrganizationProvider
      value={{
        organizationId,
        name: membership.organization.name,
        currency: membership.organization.currency,
        locale: membership.organization.locale,
        timeZone: membership.organization.timeZone,
        role: membership.role,
        allBranches: membership.allBranches,
        permissions: membership.permissions,
      }}
    >
      <AppShell
        organizationId={organizationId}
        organizationName={membership.organization.name}
        userName={profile.name}
        navigation={visibleNavigation(membership.role)}
        userMenu={<LogoutButton />}
      >
        {children}
      </AppShell>
    </OrganizationProvider>
  );
}
