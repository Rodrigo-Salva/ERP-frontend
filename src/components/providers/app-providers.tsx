'use client';

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ApiError } from '@/lib/api/errors';
import { ToastProvider } from '@/components/ui/overlays/toast';

function makeQueryClient(
  onUnauthorized: (client: QueryClient) => void,
): QueryClient {
  /** Sesión terminada en cualquier consulta o mutación: se vuelve al inicio de sesión. */
  const handle = (error: unknown) => {
    if (error instanceof ApiError && error.isUnauthorized)
      onUnauthorized(client);
  };
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: handle }),
    mutationCache: new MutationCache({ onError: handle }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Reintentar solo fallos transitorios: un 4xx no se arregla repitiéndolo.
        retry: (count, error) =>
          count < 2 &&
          !(
            error instanceof ApiError &&
            error.status >= 400 &&
            error.status < 500
          ),
      },
    },
  });
  return client;
}

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter(); // estable entre renders
  const [client] = useState(() =>
    makeQueryClient((expired) => {
      // Los datos en caché pertenecen a la sesión que terminó.
      expired.clear();
      router.replace('/login');
    }),
  );
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
