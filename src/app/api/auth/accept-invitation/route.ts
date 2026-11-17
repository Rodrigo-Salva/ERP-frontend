import type { NextRequest } from 'next/server';
import { acceptSchema } from '@/lib/schemas/auth';
import { handlePublicAuth } from '@/server/public-auth';

/** Acepta una invitación: crea la cuenta (o vincula la existente) y su membresía. */
export function POST(request: NextRequest) {
  return handlePublicAuth(request, {
    schema: acceptSchema,
    backendPath: '/auth/accept-invitation',
    messages: {
      400: 'La invitación no es válida o ya venció. Pide una nueva al administrador.',
      409: 'Ya perteneces a esta tienda.',
    },
  });
}
