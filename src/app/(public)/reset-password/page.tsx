import type { Metadata } from 'next';
import { AuthCard } from '@/components/layout/auth/auth-card';
import { ResetPasswordForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Nueva contraseña' };

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Nueva contraseña"
      description="Elige una contraseña de al menos 12 caracteres."
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
