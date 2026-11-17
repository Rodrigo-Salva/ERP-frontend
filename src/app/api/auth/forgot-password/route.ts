import type { NextRequest } from 'next/server';
import { forgotSchema } from '@/lib/schemas/auth';
import { handlePublicAuth } from '@/server/public-auth';

/** Solicita el enlace de recuperación; la respuesta no revela si la cuenta existe. */
export function POST(request: NextRequest) {
  return handlePublicAuth(request, {
    schema: forgotSchema,
    backendPath: '/auth/forgot-password',
  });
}
