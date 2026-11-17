import 'server-only';
import { cache } from 'react';
import type { Profile } from '@/lib/api/types';
import { backendFetch } from './backend';
import { getSessionToken } from './session';

/** El backend no respondió bien: no significa que la sesión sea inválida. */
export class BackendUnavailableError extends Error {
  constructor() {
    super('El servicio no está disponible por ahora');
    this.name = 'BackendUnavailableError';
  }
}

/**
 * Perfil del usuario autenticado, o null si no hay sesión válida (sin cookie o rechazada
 * con 401/403). Cualquier otro fallo (caída, 5xx, red) lanza BackendUnavailableError para
 * no confundir una indisponibilidad temporal con una sesión terminada. `cache` de React
 * lo comparte entre layouts y páginas de una misma petición (una sola llamada a /me).
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const token = await getSessionToken();
  if (!token) return null;
  let response: Response;
  try {
    response = await backendFetch('/me', { token });
  } catch {
    throw new BackendUnavailableError();
  }
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new BackendUnavailableError();
  return (await response.json()) as Profile;
});
