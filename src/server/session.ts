import 'server-only';
import { cookies } from 'next/headers';
import { serverEnv } from './env';

/**
 * La sesión del backend es un token opaco. Aquí vive en una cookie httpOnly: el
 * JavaScript del navegador nunca lo ve, por lo que un XSS no puede robarlo.
 */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(serverEnv().SESSION_COOKIE)?.value ?? null;
}

export async function setSessionToken(
  token: string,
  expiresAt: Date,
): Promise<void> {
  const store = await cookies();
  store.set(serverEnv().SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // Lax permite entrar desde un enlace externo (por ejemplo, un correo); las
    // escrituras se protegen además con la validación de origen del BFF.
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function clearSessionToken(): Promise<void> {
  const store = await cookies();
  store.delete(serverEnv().SESSION_COOKIE);
}
