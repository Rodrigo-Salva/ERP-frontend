import type { NextRequest } from 'next/server';
import { registerSchema } from '@/lib/schemas/auth';
import { handlePublicAuth } from '@/server/public-auth';

/** Crea la tienda y su propietario, e inicia sesión con la cookie httpOnly. */
export function POST(request: NextRequest) {
  return handlePublicAuth(request, {
    schema: registerSchema,
    backendPath: '/auth/register',
    startsSession: true,
    messages: {
      409: 'No se pudo registrar la cuenta con esos datos. Prueba con otro correo.',
      400: 'Revisa los datos. La contraseña debe tener entre 12 y 128 caracteres.',
    },
  });
}
