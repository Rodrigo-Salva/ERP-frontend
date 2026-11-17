import { NextResponse, type NextRequest } from 'next/server';
import { loginSchema } from '@/lib/schemas/auth';
import { backendFetch } from '@/server/backend';
import { isTrustedRequest } from '@/server/bff-policy';
import { serverEnv } from '@/server/env';
import { setSessionToken } from '@/server/session';

function fail(status: number, message: string): NextResponse {
  return NextResponse.json(
    { statusCode: status, message },
    { status, headers: { 'cache-control': 'no-store' } },
  );
}

/**
 * Inicia sesión en el backend y guarda el token en la cookie httpOnly. El token no se
 * devuelve al navegador: la respuesta solo confirma que la sesión quedó creada.
 */
export async function POST(request: NextRequest) {
  if (
    !isTrustedRequest(request.method, request.headers, serverEnv().APP_ORIGIN)
  )
    return fail(403, 'Origen no permitido');

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, 'Revisa tu correo y contraseña.');

  let upstream: Response;
  try {
    upstream = await backendFetch('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
  } catch {
    return fail(502, 'No se pudo contactar con el servidor.');
  }

  // El backend responde 400 si la clave no cumple el formato y 401 si es incorrecta;
  // para el usuario ambos casos son lo mismo y no revelan nada sobre la cuenta.
  if (upstream.status === 400 || upstream.status === 401)
    return fail(401, 'Correo o contraseña incorrectos.');
  if (upstream.status === 429)
    return fail(
      429,
      'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
    );
  if (!upstream.ok)
    return fail(502, 'No se pudo iniciar sesión. Inténtalo más tarde.');

  const session = (await upstream.json()) as {
    accessToken: string;
    expiresAt: string;
  };
  await setSessionToken(session.accessToken, new Date(session.expiresAt));
  return NextResponse.json(
    { ok: true },
    { headers: { 'cache-control': 'no-store' } },
  );
}
