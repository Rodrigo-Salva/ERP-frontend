import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAllPages } from '@/lib/api/paging';

const get = vi.fn();
vi.mock('@/lib/api/client', () => ({
  api: { get: (...args: unknown[]) => get(...args) },
}));

const rows = (from: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: from + i }));

describe('fetchAllPages', () => {
  beforeEach(() => get.mockReset());

  it('junta todas las páginas hasta recibir una incompleta', async () => {
    get
      .mockResolvedValueOnce({ items: rows(0, 100), page: 1, limit: 100 })
      .mockResolvedValueOnce({ items: rows(100, 100), page: 2, limit: 100 })
      .mockResolvedValueOnce({ items: rows(200, 37), page: 3, limit: 100 });
    const result = await fetchAllPages<{ id: number }>('/x', { status: 'a' });
    expect(result.items).toHaveLength(237);
    expect(get).toHaveBeenCalledTimes(3);
    expect(get.mock.calls[1]![1].query).toMatchObject({
      status: 'a',
      page: 2,
      limit: 100,
    });
  });

  it('con una sola página incompleta hace una única petición', async () => {
    get.mockResolvedValueOnce({ items: rows(0, 3), page: 1, limit: 100 });
    expect((await fetchAllPages('/x')).items).toHaveLength(3);
    expect(get).toHaveBeenCalledTimes(1);
  });
});
