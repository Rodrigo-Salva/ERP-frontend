import { describe, expect, it } from 'vitest';
import { ApiError, toApiError } from '@/lib/api/errors';

const response = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status });

describe('toApiError', () => {
  it('usa el mensaje y el requestId del backend', async () => {
    const error = await toApiError(
      response(409, {
        statusCode: 409,
        message: 'Existencias insuficientes',
        requestId: 'req-1',
      }),
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.message).toBe('Existencias insuficientes');
    expect(error.requestId).toBe('req-1');
    expect(error.isConflict).toBe(true);
  });

  it('une los mensajes de validación en una lista', async () => {
    const error = await toApiError(
      response(400, { message: ['email: inválido', 'password: corta'] }),
    );
    expect(error.message).toBe('email: inválido. password: corta');
  });

  it('usa un mensaje en español cuando no hay cuerpo utilizable', async () => {
    expect((await toApiError(response(403))).message).toMatch(/permiso/i);
    expect((await toApiError(response(401))).isUnauthorized).toBe(true);
    expect((await toApiError(response(500))).message).toBe(
      'Ocurrió un error inesperado.',
    );
  });

  it('no falla con un cuerpo que no es JSON', async () => {
    const error = await toApiError(new Response('<html>', { status: 502 }));
    expect(error.status).toBe(502);
    expect(error.message).toMatch(/servidor/i);
  });
});
