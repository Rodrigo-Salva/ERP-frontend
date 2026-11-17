'use client';

import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';
import { useToast } from '@/components/ui/overlays/toast';

interface Options<TVariables, TResult> {
  mutationFn: (variables: TVariables) => Promise<TResult>;
  /** Prefijos de clave a invalidar tras el éxito (p. ej. todo lo de inventario). */
  invalidate?: QueryKey[];
  successMessage?: string | ((result: TResult) => string);
  onSuccess?: (result: TResult, variables: TVariables) => void;
}

/**
 * Mutación estándar: invalida las consultas afectadas y avisa del resultado. Los 401 los
 * gestiona el proveedor global; aquí solo se muestra el mensaje de los demás errores.
 */
export function useApiMutation<TVariables, TResult>({
  mutationFn,
  invalidate = [],
  successMessage,
  onSuccess,
}: Options<TVariables, TResult>) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn,
    onSuccess: async (result, variables) => {
      await Promise.all(
        invalidate.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
      if (successMessage)
        toast.success(
          typeof successMessage === 'function'
            ? successMessage(result)
            : successMessage,
        );
      onSuccess?.(result, variables);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.isUnauthorized) return;
      toast.error(error.message);
    },
  });
}
