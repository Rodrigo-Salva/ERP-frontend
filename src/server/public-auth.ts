import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import type { ZodType } from 'zod';
import { backendFetch } from './backend';
import { isTrustedRequest } from './bff-policy';
import { serverEnv } from './env';
import { setSessionToken } from './session';

function fail(status: number, message: string): NextResponse {
  return NextResponse.json(
    { statusCode: status, message },
    { status, headers: { 'cache-control': 'no-store' } },
  );
}

interface PublicAuthOptions {
  schema: ZodType;
  /** Ruta del backend (sin /api/v1). */
  backendPath: string;
  /** Si el backend devuelve una sesión (registro), se guarda en la cookie httpOnly. */
  startsSession?: boolean;
  /** Mensajes por estado del backend; el resto usa un mensaje genérico. */
  messages?: Partial<Record<number, string>>;
}

/**
 * Reenvía un formulario público de acceso (registro, recuperación, invitación) al
 * backend. Valida el origen (CSRF) y el cuerpo, y nunca devuelve tokens al navegador.
 */
export async function handlePublicAuth(
  request: NextRequest,
  {
    schema,
    backendPath,
    startsSession = false,
    messages = {},
  }: PublicAuthOptions,
): Promise<NextResponse> {
  if (
    !isTrustedRequest(request.method, request.headers, serverEnv().APP_ORIGIN)
  )
    return fail(403, 'Origen no permitido');

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, 'Revisa los datos ingresados.');

  let upstream: Response;
  try {
    upstream = await backendFetch(backendPath, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
  } catch {
    return fail(502, 'No se pudo contactar con el servidor.');
  }

  if (!upstream.ok) {
    const status = upstream.status;
    return fail(
      status === 429 ? 429 : status === 409 ? 409 : status === 400 ? 400 : 502,
      messages[status] ??
        (status === 429
          ? 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.'
          : status === 400
            ? 'Revisa los datos ingresados.'
            : 'No se pudo completar la solicitud. Inténtalo más tarde.'),
    );
  }

  if (startsSession) {
    const session = (await upstream.json()) as {
      accessToken: string;
      expiresAt: string;
    };
    await setSessionToken(session.accessToken, new Date(session.expiresAt));
  }
  return NextResponse.json(
    { ok: true },
    { headers: { 'cache-control': 'no-store' } },
  );
}
