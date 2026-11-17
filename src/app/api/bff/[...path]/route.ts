import { NextResponse, type NextRequest } from 'next/server';
import { backendFetch } from '@/server/backend';
import {
  backendRequestHeaders,
  clientResponseHeaders,
  isTrustedRequest,
  resolveBackendPath,
} from '@/server/bff-policy';
import { serverEnv } from '@/server/env';
import { getSessionToken } from '@/server/session';

type Context = RouteContext<'/api/bff/[...path]'>;

function fail(status: number, message: string): NextResponse {
  return NextResponse.json({ statusCode: status, message }, { status });
}

/** Proxy autenticado: añade el token de la cookie httpOnly y reenvía al backend. */
async function proxy(request: NextRequest, context: Context) {
  const { path } = await context.params;
  const backendPath = resolveBackendPath(path);
  if (!backendPath) return fail(404, 'Recurso no encontrado');

  if (
    !isTrustedRequest(request.method, request.headers, serverEnv().APP_ORIGIN)
  )
    return fail(403, 'Origen no permitido');

  const token = await getSessionToken();
  if (!token) return fail(401, 'Sesión requerida');

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  let upstream: Response;
  try {
    upstream = await backendFetch(`${backendPath}${request.nextUrl.search}`, {
      method: request.method,
      headers: backendRequestHeaders(request.headers),
      body: hasBody ? await request.arrayBuffer() : null,
      token,
      signal: request.signal,
    });
  } catch {
    return fail(502, 'No se pudo contactar con el servidor');
  }

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: clientResponseHeaders(upstream.headers),
  });
  // Sesión vencida o revocada en el backend: se descarta la cookie para no reintentar.
  if (upstream.status === 401)
    response.cookies.delete(serverEnv().SESSION_COOKIE);
  return response;
}

export { proxy as GET, proxy as POST, proxy as PATCH };
