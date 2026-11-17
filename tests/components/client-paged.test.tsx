import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ClientPaged } from '@/components/ui/data/client-paged';

const items = Array.from({ length: 25 }, (_, i) => `fila-${i + 1}`);

function show() {
  render(
    <ClientPaged items={items} size={10}>
      {(rows) => (
        <ul>
          {rows.map((row) => (
            <li key={row}>{row}</li>
          ))}
        </ul>
      )}
    </ClientPaged>,
  );
}

describe('ClientPaged', () => {
  it('muestra la primera página y navega hasta la última', () => {
    show();
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    expect(screen.getByText('fila-1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(screen.getByText('fila-11')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(
      (screen.getByRole('button', { name: /Siguiente/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('con una sola página muestra la paginación con los botones desactivados', () => {
    render(
      <ClientPaged items={['a', 'b']} size={20}>
        {(rows) => <p>{rows.join(',')}</p>}
      </ClientPaged>,
    );
    expect(screen.getByRole('navigation', { name: 'Paginación' })).toBeTruthy();
    expect(screen.getByText(/2 registros/)).toBeTruthy();
    for (const name of [/Anterior/, /Siguiente/])
      expect(
        (screen.getByRole('button', { name }) as HTMLButtonElement).disabled,
      ).toBe(true);
  });

  it('con un múltiplo exacto del tamaño no ofrece una página vacía', () => {
    render(
      <ClientPaged items={Array.from({ length: 20 }, (_, i) => i)} size={10}>
        {(rows) => <p>{rows.length}</p>}
      </ClientPaged>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(
      (screen.getByRole('button', { name: /Siguiente/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText('10')).toBeTruthy();
  });
});
