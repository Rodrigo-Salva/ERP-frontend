import 'server-only';

import { isIP } from 'node:net';

/**
 * Política del proxy BFF (/api/bff/*). El navegador solo puede alcanzar los recursos de
 * negocio del backend. Las rutas de /auth quedan fuera a propósito: devuelven el token
 * de sesión, que nunca debe llegar al JavaScript del navegador. Esas operaciones
 * tienen rutas propias (/api/auth/*) que guardan el token en la cookie httpOnly.
 */

const SEGMENT = /^[A-Za-z0-9._~-]{1,100}$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_METHODS = new Set(['GET', 'HEAD']);

export const BFF_METHODS = ['GET', 'POST', 'PATCH'] as const;

/** Convierte los segmentos de la URL en una ruta del backend, o null si no está permitida. */
export function resolveBackendPath(segments: string[]): string | null {
  if (segments.length === 0) return null;
  for (const segment of segments) {
    if (!SEGMENT.test(segment) || segment === '.' || segment === '..')
      return null;
  }
  const [root, organizationId] = segments;
  const allowed =
    (root === 'me' && segments.length === 1) ||
    (root === 'organizations' &&
      organizationId !== undefined &&
      UUID.test(organizationId));
  return allowed ? `/${segments.join('/')}` : null;
}

/**
 * Defensa contra CSRF para escrituras: el origen declarado por el navegador debe ser
 * esta misma aplicación. La cookie SameSite=Lax es la primera barrera; esta es la segunda.
 */
export function isTrustedRequest(
  method: string,
  headers: Headers,
  appOrigin: string,
): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return true;
  const origin = headers.get('origin');
  if (origin !== null) return origin === appOrigin;
  return headers.get('sec-fetch-site') === 'same-origin';
}

/**
 * IP del cliente según X-Forwarded-For, contando `hops` proxies de confianza desde la
 * derecha: cada proxy añade la dirección que vio, así que solo las entradas de la derecha
 * son fiables y lo que el cliente escribió a la izquierda se ignora. Devuelve undefined si
 * no hay saltos de confianza o el valor no es una IP válida.
 */
export function clientIpFromForwarded(
  forwardedFor: string | null,
  hops: number,
): string | undefined {
  if (!forwardedFor || hops < 1) return undefined;
  const list = forwardedFor.split(',').map((part) => part.trim());
  const candidate = list[list.length - hops];
  return candidate && isIP(candidate) ? candidate : undefined;
}

const REQUEST_HEADERS = ['content-type', 'accept', 'idempotency-key'] as const;
const RESPONSE_HEADERS = [
  'content-type',
  'content-disposition',
  'x-request-id',
] as const;

export function backendRequestHeaders(
  incoming: Headers,
): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const name of REQUEST_HEADERS) {
    const value = incoming.get(name);
    if (value !== null) headers[name] = value;
  }
  return headers;
}

export function clientResponseHeaders(upstream: Headers): Headers {
  const headers = new Headers();
  for (const name of RESPONSE_HEADERS) {
    const value = upstream.get(name);
    if (value !== null) headers.set(name, value);
  }
  // Son datos por usuario: ni el navegador ni intermediarios deben guardarlos.
  headers.set('cache-control', 'no-store');
  return headers;
}
