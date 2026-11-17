import { useCallback, useRef } from 'react';

/** Hash FNV-1a de 32 bits: basta para distinguir cuerpos distintos dentro de un intento. */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Claves de idempotencia para operaciones que el backend protege contra duplicados.
 *
 * - Reintentar la MISMA petición (p. ej. tras un corte de red) reutiliza la clave, de modo
 *   que el servidor devuelve el resultado original en lugar de repetir la operación.
 * - Si el usuario cambia los datos, la clave cambia: el backend rechaza reutilizar una
 *   clave con otro contenido.
 * - `renew()` se llama tras un éxito para que la siguiente operación sea nueva.
 */
export function useIdempotency() {
  const attempt = useRef<string | null>(null);

  const keyFor = useCallback((payload: unknown): string => {
    attempt.current ??= crypto.randomUUID();
    return `web-${attempt.current}-${fnv1a(JSON.stringify(payload))}`;
  }, []);

  const renew = useCallback(() => {
    attempt.current = null;
  }, []);

  return { keyFor, renew };
}
