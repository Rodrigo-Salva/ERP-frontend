import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useIdempotency } from '@/lib/hooks/use-idempotency';

const VALID = /^[A-Za-z0-9._:-]{8,100}$/; // formato que exige el backend

describe('useIdempotency', () => {
  it('reutiliza la clave al reintentar la misma petición', () => {
    const { result } = renderHook(() => useIdempotency());
    const body = { saleId: '1', payments: [{ amount: '5.00' }] };
    expect(result.current.keyFor(body)).toBe(
      result.current.keyFor({ ...body }),
    );
  });

  it('cambia la clave cuando cambian los datos (el backend rechaza otro contenido con la misma clave)', () => {
    const { result } = renderHook(() => useIdempotency());
    expect(result.current.keyFor({ amount: '5.00' })).not.toBe(
      result.current.keyFor({ amount: '6.00' }),
    );
  });

  it('genera una operación nueva tras renovar, aunque los datos sean iguales', () => {
    const { result } = renderHook(() => useIdempotency());
    const first = result.current.keyFor({ opening: '100' });
    result.current.renew();
    expect(result.current.keyFor({ opening: '100' })).not.toBe(first);
  });

  it('produce claves con el formato válido para el backend', () => {
    const { result } = renderHook(() => useIdempotency());
    expect(result.current.keyFor({ a: 1 })).toMatch(VALID);
  });

  it('dos formularios distintos no comparten clave', () => {
    const a = renderHook(() => useIdempotency()).result.current.keyFor({
      x: 1,
    });
    const b = renderHook(() => useIdempotency()).result.current.keyFor({
      x: 1,
    });
    expect(a).not.toBe(b);
  });
});
