import { ApiError, toApiError } from './errors';

const BASE = '/api/bff';

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Obligatoria en operaciones que el backend protege contra reintentos duplicados. */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

function buildUrl(path: string, query: RequestOptions['query']): string {
  const url = `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value !== undefined && value !== null && value !== '')
      params.set(key, String(value));
  const text = params.toString();
  return text ? `${url}?${text}` : url;
}

/** Clave nueva por intento de usuario; se reutiliza al reintentar la misma acción. */
export function newIdempotencyKey(): string {
  return `web-${crypto.randomUUID()}`;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  { query, body, idempotencyKey, signal }: RequestOptions = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw error;
    throw new ApiError(0, 'Sin conexión con el servidor.');
  }
  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Cliente del navegador. Siempre pasa por el BFF; nunca conoce el token ni el backend. */
export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>('GET', path, options),
  post: <T>(path: string, options?: RequestOptions) =>
    request<T>('POST', path, options),
  patch: <T>(path: string, options?: RequestOptions) =>
    request<T>('PATCH', path, options),
};
