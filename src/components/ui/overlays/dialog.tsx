'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode | ((requestClose: () => void) => ReactNode);
  className?: string;
  /** Pide confirmación antes de perder cambios escritos dentro del diálogo. */
  confirmOnClose?: boolean;
  /** Impide cerrar, por ejemplo mientras una operación se está guardando. */
  canClose?: boolean;
}

/**
 * Diálogo modal sobre el elemento nativo <dialog>: el navegador ya gestiona el foco
 * atrapado, la tecla Escape y el rol accesible.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  confirmOnClose = false,
  canClose = true,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [changed, setChanged] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Al cerrarse, el diálogo olvida los cambios pendientes (se ajusta durante el render).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setChanged(false);
      setConfirmingDiscard(false);
    }
  }

  function requestClose() {
    if (!canClose) return;
    if (confirmOnClose && changed) {
      setConfirmingDiscard(true);
      return;
    }
    onClose();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        // Clic en el fondo (fuera del contenido) cierra el diálogo.
        if (event.target === ref.current) requestClose();
      }}
      className={cn(
        'm-auto w-[min(92vw,40rem)] rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm',
        className,
      )}
    >
      {open ? (
        <div
          className="max-h-[85vh] overflow-y-auto p-5"
          onChangeCapture={() => {
            if (confirmOnClose) setChanged(true);
          }}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
              {description ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Cerrar"
              className="rounded-md p-1 hover:bg-muted"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
          {typeof children === 'function' ? children(requestClose) : children}
        </div>
      ) : null}
      {confirmOnClose ? (
        <Dialog
          open={confirmingDiscard}
          onClose={() => setConfirmingDiscard(false)}
          title="¿Descartar los cambios?"
          description="Lo que escribiste no se guardará."
          className="w-[min(92vw,26rem)]"
        >
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmingDiscard(false)}
            >
              Seguir editando
            </Button>
            <Button
              onClick={() => {
                setConfirmingDiscard(false);
                onClose();
              }}
            >
              Descartar cambios
            </Button>
          </div>
        </Dialog>
      ) : null}
    </dialog>
  );
}
