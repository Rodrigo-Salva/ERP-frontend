import { NextResponse, type NextRequest } from 'next/server';
import { backendFetch } from '@/server/backend';
import { isTrustedRequest } from '@/server/bff-policy';
import { serverEnv } from '@/server/env';
import { clearSessionToken, getSessionToken } from '@/server/session';

/** Revoca la sesión en el backend y elimina la cookie, aunque el backend no responda. */
export async function POST(request: NextRequest) {
  if (
    !isTrustedRequest(request.method, request.headers, serverEnv().APP_ORIGIN)
  )
    return NextResponse.json(
      { statusCode: 403, message: 'Origen no permitido' },
      { status: 403 },
    );

  const token = await getSessionToken();
  if (token) {
    try {
      await backendFetch('/auth/logout', { method: 'POST', token });
    } catch {
      // La cookie se elimina igualmente; la sesión del backend vence sola.
    }
  }
  await clearSessionToken();
  return new NextResponse(null, {
    status: 204,
    headers: { 'cache-control': 'no-store' },
  });
}
