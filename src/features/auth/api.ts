import { ApiError, toApiError } from '@/lib/api/errors';
import type {
  AcceptInput,
  ForgotInput,
  LoginPayload,
  RegisterInput,
  ResetInput,
} from '@/lib/schemas/auth';

/** Las rutas /api/auth/* guardan o borran la cookie httpOnly; no devuelven el token. */
async function post(path: string, body?: unknown): Promise<void> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Sin conexión con el servidor.');
  }
  if (!response.ok) throw await toApiError(response);
}

export const login = (credentials: LoginPayload) =>
  post('/api/auth/login', credentials);

export const logout = () => post('/api/auth/logout');

export const register = (input: RegisterInput) =>
  post('/api/auth/register', input);

export const requestPasswordReset = (input: ForgotInput) =>
  post('/api/auth/forgot-password', input);

export const resetPassword = (input: ResetInput) =>
  post('/api/auth/reset-password', input);

export const acceptInvitation = (input: AcceptInput) =>
  post('/api/auth/accept-invitation', input);
