import 'server-only';
import { headers as requestHeaders } from 'next/headers';
import { clientIpFromForwarded } from './bff-policy';
import { serverEnv } from './env';

export interface BackendRequest {
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  /** Token de sesión; si falta, la petición se envía sin autenticación. */
  token?: string | null;
  signal?: AbortSignal;
}

/**
 * Único punto de salida hacia la API del backend. Añade el prefijo /api/v1 y el
 * token, y nunca guarda respuestas en caché (son datos por usuario).
 */
/** IP del cliente de la petición en curso, solo si hay proxies de confianza declarados. */
async function clientAddress(): Promise<string | undefined> {
  const hops = serverEnv().TRUSTED_PROXY_HOPS;
  if (hops < 1) return undefined;
  try {
    return clientIpFromForwarded(
      (await requestHeaders()).get('x-forwarded-for'),
      hops,
    );
  } catch {
    return undefined; // fuera de una petición (por ejemplo, una prueba)
  }
}

export async function backendFetch(
  path: string,
  { method = 'GET', headers = {}, body, token, signal }: BackendRequest = {},
): Promise<Response> {
  const url = `${serverEnv().BACKEND_URL}/api/v1${path}`;
  const ip = await clientAddress();
  return fetch(url, {
    method,
    headers: {
      ...headers,
      ...(ip ? { 'X-Forwarded-For': ip } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
    signal,
    cache: 'no-store',
    redirect: 'manual',
  });
}
