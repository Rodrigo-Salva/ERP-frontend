import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { getProfile } from '@/server/profile';

/** Raíz autenticada: lleva al panel de la primera organización del usuario. */
export default async function HomePage() {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const first = profile.memberships[0];
  if (first) redirect(`/${first.organizationId}/dashboard`);

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="max-w-md space-y-2">
        <h1 className="text-lg font-semibold">Sin organizaciones</h1>
        <p className="text-sm text-muted-foreground">
          Tu cuenta no pertenece a ninguna tienda activa. Pide una invitación al
          administrador.
        </p>
      </Card>
    </main>
  );
}
