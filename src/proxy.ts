import { NextResponse, type NextRequest } from 'next/server';

/**
 * Comprobación optimista: redirige a /login si ni siquiera hay cookie de sesión. No
 * valida el token (eso lo hace el layout al pedir /me); solo evita renderizar de más.
 */
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/accept-invitation',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const cookie = process.env.SESSION_COOKIE ?? 'erp_session';
  if (!isPublic && !request.cookies.has(cookie))
    return NextResponse.redirect(new URL('/login', request.url));
  return NextResponse.next();
}

export const config = {
  // Excluye la API (tiene su propia autenticación), los recursos de Next, el ícono y los archivos estáticos.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
