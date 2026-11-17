import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/layout/auth/auth-card';
import { LoginForm } from '@/features/auth';
import { getProfile } from '@/server/profile';

export const metadata: Metadata = { title: 'Iniciar sesión' };

export default async function LoginPage() {
  // Solo se redirige con una sesión comprobada: una cookie vencida no debe crear un bucle.
  if (await getProfile().catch(() => null)) redirect('/');

  return (
    <AuthCard
      title="Iniciar sesión"
      description="Accede a tu tienda para continuar."
      footer={
        <div className="flex flex-wrap justify-between gap-2">
          <Link href="/forgot-password" className="underline">
            ¿Olvidaste tu contraseña?
          </Link>
          <Link href="/register" className="underline">
            Crear una tienda
          </Link>
        </div>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
