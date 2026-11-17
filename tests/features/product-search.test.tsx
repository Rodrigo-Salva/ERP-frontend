import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductSearch } from '@/features/sales/components/product-search';

const mocks = vi.hoisted(() => ({ search: vi.fn(), notify: vi.fn() }));
vi.mock('@/features/sales/api', () => ({ searchVariants: mocks.search }));
vi.mock('@/components/providers/organization-context', () => ({
  useOrganization: () => ({
    organizationId: 'test-store',
    money: (value: string) => `S/ ${value}`,
  }),
}));
vi.mock('@/components/ui/overlays/toast', () => ({
  useToast: () => ({ error: mocks.notify }),
}));

function renderSearch() {
  const onPick = vi.fn();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ProductSearch onPick={onPick} />
    </QueryClientProvider>,
  );
  return onPick;
}

beforeEach(() => {
  mocks.search.mockReset();
});

describe('búsqueda del punto de venta', () => {
  it('avisa cuando falla una búsqueda por Enter sin añadir artículos', async () => {
    mocks.search.mockRejectedValue(new Error('No hay conexión'));
    const onPick = renderSearch();
    await userEvent.type(
      screen.getByLabelText('Buscar artículo'),
      'AGUA{Enter}',
    );
    await waitFor(() =>
      expect(mocks.notify).toHaveBeenCalledWith('No hay conexión'),
    );
    expect(onPick).not.toHaveBeenCalled();
  });

  it('distingue un error de búsqueda de la ausencia de resultados', async () => {
    mocks.search.mockRejectedValue(
      new Error('No se pudo consultar el catálogo'),
    );
    renderSearch();
    await userEvent.type(screen.getByLabelText('Buscar artículo'), 'AGUA');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo consultar el catálogo',
    );
    expect(screen.queryByText('Sin resultados')).not.toBeInTheDocument();
  });
});
