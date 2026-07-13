import { NextRequest, NextResponse } from 'next/server';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/admin')) return NextResponse.next();

  const session = req.cookies.get('resort_session')?.value;
  if (!session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const decoded = Buffer.from(session, 'base64').toString('utf-8');
    const data = JSON.parse(decoded);
    if (!data.id || !data.role) throw new Error('Invalid session');

    const isAdmin = data.role === 'admin' || data.role === 'super_admin';

    // Admin-only routes: user management, dashboard, activity logs, settings
    const adminOnlyPaths = ['/admin/users', '/admin/dashboard', '/admin/logs', '/admin/settings'];
    const isAdminOnly = adminOnlyPaths.some(p => pathname.startsWith(p));

    if (isAdminOnly && !isAdmin) {
      return NextResponse.redirect(new URL('/admin/reservations', req.url));
    }

    return NextResponse.next();
  } catch {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.set('resort_session', '', { maxAge: 0, path: '/' });
    return res;
  }
}

export const config = {
  matcher: ['/admin/:path*'],
};
