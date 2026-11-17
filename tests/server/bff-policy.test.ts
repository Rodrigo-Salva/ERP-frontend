import { describe, expect, it } from 'vitest';
import {
  backendRequestHeaders,
  clientIpFromForwarded,
  clientResponseHeaders,
  isTrustedRequest,
  resolveBackendPath,
} from '@/server/bff-policy';

const ORG = '3442c665-da11-4458-ab35-14dee63ccff5';

describe('resolveBackendPath', () => {
  it('permite el perfil y los recursos de una organización', () => {
    expect(resolveBackendPath(['me'])).toBe('/me');
    expect(resolveBackendPath(['organizations', ORG, 'dashboard'])).toBe(
      `/organizations/${ORG}/dashboard`,
    );
    expect(
      resolveBackendPath(['organizations', ORG, 'sales', ORG, 'receipt']),
    ).toBe(`/organizations/${ORG}/sales/${ORG}/receipt`);
  });

  it('bloquea /auth: devuelve tokens que no deben llegar al navegador', () => {
    expect(resolveBackendPath(['auth', 'login'])).toBeNull();
    expect(resolveBackendPath(['auth', 'refresh'])).toBeNull();
    expect(resolveBackendPath(['auth', 'register'])).toBeNull();
  });

  it('bloquea rutas desconocidas, la salud y la documentación', () => {
    expect(resolveBackendPath([])).toBeNull();
    expect(resolveBackendPath(['health'])).toBeNull();
    expect(resolveBackendPath(['docs'])).toBeNull();
    expect(resolveBackendPath(['me', 'extra'])).toBeNull();
  });

  it('exige un UUID como organización', () => {
    expect(resolveBackendPath(['organizations'])).toBeNull();
    expect(
      resolveBackendPath(['organizations', 'otra', 'dashboard']),
    ).toBeNull();
  });

  it('rechaza recorridos de directorio y caracteres peligrosos', () => {
    expect(resolveBackendPath(['organizations', ORG, '..', 'auth'])).toBeNull();
    expect(resolveBackendPath(['organizations', ORG, '.'])).toBeNull();
    expect(resolveBackendPath(['organizations', ORG, 'a/b'])).toBeNull();
    expect(resolveBackendPath(['organizations', ORG, 'a?b=1'])).toBeNull();
    expect(resolveBackendPath(['organizations', ORG, '%2e%2e'])).toBeNull();
    expect(resolveBackendPath(['organizations', ORG, 'a\\b'])).toBeNull();
  });
});

describe('isTrustedRequest', () => {
  const app = 'http://localhost:5173';
  const headers = (init: Record<string, string>) => new Headers(init);

  it('no exige origen en lecturas', () => {
    expect(isTrustedRequest('GET', headers({}), app)).toBe(true);
    expect(
      isTrustedRequest('HEAD', headers({ origin: 'https://evil.test' }), app),
    ).toBe(true);
  });

  it('acepta escrituras solo desde el origen de la aplicación', () => {
    expect(isTrustedRequest('POST', headers({ origin: app }), app)).toBe(true);
    expect(isTrustedRequest('PATCH', headers({ origin: app }), app)).toBe(true);
    expect(
      isTrustedRequest('POST', headers({ origin: 'https://evil.test' }), app),
    ).toBe(false);
    expect(isTrustedRequest('POST', headers({ origin: 'null' }), app)).toBe(
      false,
    );
  });

  it('sin Origin, acepta solo peticiones del mismo origen según el navegador', () => {
    expect(
      isTrustedRequest(
        'POST',
        headers({ 'sec-fetch-site': 'same-origin' }),
        app,
      ),
    ).toBe(true);
    expect(
      isTrustedRequest(
        'POST',
        headers({ 'sec-fetch-site': 'cross-site' }),
        app,
      ),
    ).toBe(false);
    expect(isTrustedRequest('POST', headers({}), app)).toBe(false);
  });
});

describe('cabeceras', () => {
  it('reenvía al backend solo las cabeceras necesarias', () => {
    const forwarded = backendRequestHeaders(
      new Headers({
        'content-type': 'application/json',
        accept: 'application/json',
        'idempotency-key': 'web-123',
        cookie: 'erp_session=secreto',
        authorization: 'Bearer falso',
        'x-forwarded-for': '1.2.3.4',
      }),
    );
    expect(forwarded).toEqual({
      'content-type': 'application/json',
      accept: 'application/json',
      'idempotency-key': 'web-123',
    });
  });

  it('devuelve solo cabeceras seguras y desactiva la caché', () => {
    const headers = clientResponseHeaders(
      new Headers({
        'content-type': 'text/csv',
        'content-disposition': 'attachment; filename="sales.csv"',
        'set-cookie': 'otra=1',
        'x-powered-by': 'express',
        'x-request-id': 'abc',
      }),
    );
    expect(headers.get('content-type')).toBe('text/csv');
    expect(headers.get('content-disposition')).toContain('sales.csv');
    expect(headers.get('x-request-id')).toBe('abc');
    expect(headers.get('cache-control')).toBe('no-store');
    expect(headers.has('set-cookie')).toBe(false);
    expect(headers.has('x-powered-by')).toBe(false);
  });
});

describe('clientIpFromForwarded', () => {
  it('no reenvía nada sin proxies de confianza', () => {
    expect(clientIpFromForwarded('203.0.113.9', 0)).toBeUndefined();
    expect(clientIpFromForwarded(null, 1)).toBeUndefined();
  });

  it('toma la dirección que añadió el proxy de confianza, no lo escrito por el cliente', () => {
    expect(clientIpFromForwarded('203.0.113.9', 1)).toBe('203.0.113.9');
    expect(clientIpFromForwarded('1.2.3.4, 203.0.113.9', 1)).toBe(
      '203.0.113.9',
    );
    expect(clientIpFromForwarded('203.0.113.9, 10.0.0.2', 2)).toBe(
      '203.0.113.9',
    );
  });

  it('descarta valores que no son una IP', () => {
    expect(clientIpFromForwarded('no-es-ip', 1)).toBeUndefined();
    expect(clientIpFromForwarded('203.0.113.9', 3)).toBeUndefined();
  });
});
