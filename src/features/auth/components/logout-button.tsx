'use client';

import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Dialog } from '@/components/ui/overlays/dialog';
import { logout } from '../api';

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Salir"
        title="Salir"
        className={cn(
          'size-9 shrink-0 px-0 text-sidebar-muted hover:bg-sidebar-active hover:text-sidebar-foreground',
          className,
        )}
        onClick={() => setConfirming(true)}
      >
        <LogOut aria-hidden className="size-[18px]" />
      </Button>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        canClose={!pending}
        title="¿Seguro que quieres salir?"
        description="Cerrarás la sesión en este dispositivo."
        className="w-[min(92vw,26rem)]"
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setConfirming(false)}
          >
            Cancelar
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await logout().catch(() => undefined);
                // Los datos en caché pertenecen al usuario que sale.
                queryClient.clear();
                router.replace('/login');
                router.refresh();
              })
            }
          >
            {pending ? 'Saliendo…' : 'Sí, salir'}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
