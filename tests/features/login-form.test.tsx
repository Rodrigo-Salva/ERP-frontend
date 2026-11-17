import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '@/features/auth';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <LoginForm />
    </QueryClientProvider>,
  );
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('LoginForm', () => {
  it('valida los campos antes de llamar al servidor', async () => {
    renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(
      await screen.findByText('Ingresa un correo válido'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu contraseña')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('envía credenciales normalizadas y navega a la raíz al iniciar sesión', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    renderForm();
    await userEvent.type(
      screen.getByLabelText('Correo'),
      '  Demo@Example.TEST ',
    );
    await userEvent.type(screen.getByLabelText('Contraseña'), 'clave-segura');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/auth/login');
    expect(JSON.parse(init!.body as string)).toEqual({
      email: 'demo@example.test',
      password: 'clave-segura',
    });
  });

  it('muestra el error del servidor sin navegar', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ message: 'Correo o contraseña incorrectos.' }),
        { status: 401 },
      ),
    );
    renderForm();
    await userEvent.type(screen.getByLabelText('Correo'), 'demo@example.test');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'mala');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Correo o contraseña incorrectos.',
    );
    expect(router.replace).not.toHaveBeenCalled();
  });
});
