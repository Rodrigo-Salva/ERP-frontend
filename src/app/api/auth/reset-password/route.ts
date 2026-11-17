import type { NextRequest } from 'next/server';
import { resetSchema } from '@/lib/schemas/auth';
import { handlePublicAuth } from '@/server/public-auth';

/** Cambia la contraseña con el enlace de un solo uso recibido por correo. */
export function POST(request: NextRequest) {
  return handlePublicAuth(request, {
    schema: resetSchema,
    backendPath: '/auth/reset-password',
    messages: {
      400: 'El enlace no es válido o ya venció. Solicita uno nuevo.',
    },
  });
}
