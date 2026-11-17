import { cn } from '@/lib/utils';

/**
 * Isotipo de Tendio: una “T” inclinada cuya barra superior se extiende como el borde de un
 * toldo, y un punto ámbar que cierra la marca (el mismo punto del nombre).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 40 40"
      className={cn('size-10 shrink-0 drop-shadow-sm', className)}
    >
      <defs>
        <linearGradient
          id="tendio-mark"
          gradientUnits="userSpaceOnUse"
          x1="4"
          y1="2"
          x2="36"
          y2="40"
        >
          <stop offset="0" stopColor="#ff6a5c" />
          <stop offset="1" stopColor="#c41f35" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#tendio-mark)" />
      {/* T inclinada: barra con la punta derecha cortada en diagonal */}
      <path
        d="M9 10.5H31.5L28.6 17.6H23.9L21.6 31H15.3L17.6 17.6H6.2Z"
        fill="#fff"
      />
      <circle cx="31.4" cy="29.6" r="3.1" fill="#ffc83d" />
    </svg>
  );
}

/** Marca completa: isotipo, nombre y, opcionalmente, la frase de apoyo. */
export function Logo({
  tagline = false,
  className,
}: {
  tagline?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('flex items-center gap-3', className)}>
      <LogoMark />
      <span className="leading-none">
        <span className="block text-[1.4rem] font-bold tracking-tight">
          Tendio<span className="text-sidebar-accent">.</span>
        </span>
        {tagline ? (
          <span className="mt-1.5 block text-[10px] font-medium tracking-[0.14em] text-sidebar-muted uppercase">
            Tu negocio, en orden
          </span>
        ) : null}
      </span>
    </span>
  );
}
