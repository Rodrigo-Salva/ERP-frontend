import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

/**
 * Token de los enlaces de correo (`/ruta#token=...`). Va en el fragmento para que no
 * llegue al servidor ni a sus registros. En el servidor devuelve null.
 */
export function useHashToken(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.hash.slice(1)).get('token'),
    () => null,
  );
}
