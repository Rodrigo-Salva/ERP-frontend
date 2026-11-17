import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers/app-providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Tendio', template: '%s · Tendio' },
  description: 'Gestión de inventario, compras, ventas y caja para tiendas.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        {/* Aplica el tema guardado antes de pintar, para evitar el parpadeo. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
