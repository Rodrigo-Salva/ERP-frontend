import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { FormDialog } from '@/components/ui/overlays/form-dialog';
import { Input } from '@/components/ui/forms/input';

function Example() {
  const [open, setOpen] = useState(true);
  return (
    <FormDialog
      open={open}
      onClose={() => setOpen(false)}
      title="Editar producto"
      onSubmit={(event) => event.preventDefault()}
    >
      <Input aria-label="Nombre" />
    </FormDialog>
  );
}

describe('FormDialog', () => {
  it('cierra inmediatamente si no hubo cambios', async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(
      screen.queryByRole('dialog', { name: 'Editar producto' }),
    ).not.toBeInTheDocument();
  });

  it('pide confirmación al cancelar cambios escritos y conserva el formulario si se continúa editando', async () => {
    render(<Example />);
    await userEvent.type(screen.getByLabelText('Nombre'), 'Café');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(
      screen.getByRole('dialog', { name: '¿Descartar los cambios?' }),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: 'Seguir editando' }),
    );
    expect(screen.getByLabelText('Nombre')).toHaveValue('Café');

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Descartar cambios' }),
    );
    expect(
      screen.queryByRole('dialog', { name: 'Editar producto' }),
    ).not.toBeInTheDocument();
  });

  it('intercepta Escape tras editar', async () => {
    render(<Example />);
    await userEvent.type(screen.getByLabelText('Nombre'), 'Café');
    fireEvent(
      screen.getByRole('dialog', { name: 'Editar producto' }),
      new Event('cancel', { cancelable: true }),
    );
    expect(
      screen.getByRole('dialog', { name: '¿Descartar los cambios?' }),
    ).toBeVisible();
  });
});
