import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/layout/auth/auth-card';
import { RegisterForm } from '@/features/auth';
import { getProfile } from '@/server/profile';

export const metadata: Metadata = { title: 'Crear tienda' };

export default async function RegisterPage() {
  if (await getProfile().catch(() => null)) redirect('/');
  return (
    <AuthCard
      wide
      title="Crea tu tienda"
      description="Serás el propietario. Podrás invitar a tu equipo después."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
