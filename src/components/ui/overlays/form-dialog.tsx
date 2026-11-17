'use client';

import type { FormEventHandler, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/overlays/dialog';

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  submitLabel?: string;
  pending?: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
}

/** Diálogo con formulario: pie con Cancelar/Guardar y botón deshabilitado mientras envía. */
export function FormDialog({
  open,
  onClose,
  title,
  description,
  submitLabel = 'Guardar',
  pending = false,
  onSubmit,
  children,
}: FormDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      confirmOnClose
      canClose={!pending}
    >
      {(requestClose) => (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {children}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={requestClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando…' : submitLabel}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
