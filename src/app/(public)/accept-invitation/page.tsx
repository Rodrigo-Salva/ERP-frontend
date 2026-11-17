import type { Metadata } from 'next';
import { AuthCard } from '@/components/layout/auth/auth-card';
import { AcceptInvitationForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Aceptar invitación' };

export default function AcceptInvitationPage() {
  return (
    <AuthCard
      title="Te invitaron a una tienda"
      description="Crea tu acceso para unirte al equipo."
    >
      <AcceptInvitationForm />
    </AuthCard>
  );
}
