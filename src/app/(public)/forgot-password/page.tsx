import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/layout/auth/auth-card';
import { ForgotPasswordForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Recuperar contraseña' };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Recuperar contraseña"
      description="Te enviaremos un enlace de un solo uso para crear una nueva."
      footer={
        <Link href="/login" className="underline">
          Volver a iniciar sesión
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
