/**
 * Session helpers — cookies are signed JWTs (HS256) via `jose`.
 *
 * The signing secret comes from SESSION_SECRET env var (≥ 32 chars).
 * Fail-closed: if the secret is absent, every session read returns null
 * and every write throws, so the app refuses to run insecurely.
 *
 * Migration note: old base64 cookies will fail HMAC verification and
 * the user will simply be redirected to /login to get a fresh one.
 */
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@/types';

export interface SessionUser {
  id: number;
  role: UserRole;
  email: string;
  firstName: string;
  lastName: string;
}

const COOKIE_NAME = 'resort_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** Returns the signing key or throws if SESSION_SECRET is not set. */
function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      '[session] SESSION_SECRET env var must be set to at least 32 characters. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return new TextEncoder().encode(secret);
}

/** Sign a session payload and return the JWT string. */
export async function encodeSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...(user as unknown as JWTPayload) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .sign(getSecret());
}

/** Verify + decode a JWT session string. Returns null on any failure. */
export async function decodeSession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const data = payload as unknown as SessionUser;
    if (!data.id || !data.role) return null;
    return data;
  } catch {
    return null;
  }
}

/** Read and verify the session cookie from an incoming request. */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  try {
    const cookie = req.cookies.get(COOKIE_NAME)?.value;
    if (!cookie) return null;
    return await decodeSession(cookie);
  } catch {
    return null;
  }
}

/** Attach a signed session cookie to a NextResponse. */
export async function setSessionCookie(
  res: NextResponse,
  user: SessionUser
): Promise<void> {
  const token = await encodeSession(user);
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

/** Clear the session cookie. */
export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
