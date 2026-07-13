import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/admin')) return NextResponse.next();

  // Verify the real signed JWT session cookie (same check used by every
  // /api/* route via lib/session.ts) instead of the old base64-JSON decode,
  // which always fails against a JWT and was bouncing every login back to
  // /login while silently clearing the (valid) session cookie.
  const sessionUser = await getSessionUser(req);

  if (!sessionUser) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.set('resort_session', '', { maxAge: 0, path: '/' });
    return res;
  }

  const isAdmin = sessionUser.role === 'admin' || sessionUser.role === 'super_admin';

  // Admin-only routes: user management, dashboard, activity logs, settings
  const adminOnlyPaths = ['/admin/users', '/admin/dashboard', '/admin/logs', '/admin/settings'];
  const isAdminOnly = adminOnlyPaths.some((p) => pathname.startsWith(p));

  if (isAdminOnly && !isAdmin) {
    return NextResponse.redirect(new URL('/admin/reservations', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
