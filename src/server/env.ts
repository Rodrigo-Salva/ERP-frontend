import 'server-only';
import { z } from 'zod';

const origin = z.url().refine((value) => {
  const url = URL.parse(value);
  return (
    url !== null &&
    ['http:', 'https:'].includes(url.protocol) &&
    url.origin === value &&
    !url.username &&
    !url.password
  );
}, 'Debe ser un origen HTTP/HTTPS sin ruta ni barra final');

const schema = z.object({
  BACKEND_URL: origin,
  APP_ORIGIN: origin,
  /**
   * Proxies de confianza delante de esta aplicación que añaden la IP del cliente a
   * X-Forwarded-For (0 = ninguno: no se reenvía ninguna IP y el backend ve la del BFF).
   */
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  SESSION_COOKIE: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,64}$/)
    .default('erp_session'),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | undefined;

/**
 * Se valida al primer uso, no al importar, para que `next build` no exija
 * variables de entorno de ejecución.
 */
export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const result = schema.safeParse(process.env);
  if (!result.success) {
    // Solo nombres de campos: los valores podrían contener datos sensibles.
    const fields = [
      ...new Set(result.error.issues.map((i) => i.path.join('.'))),
    ];
    throw new Error(`Configuración inválida. Revisa: ${fields.join(', ')}`);
  }
  cached = result.data;
  return cached;
}
