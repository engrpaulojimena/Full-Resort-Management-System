import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, activityLogs } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Your account has been deactivated. Contact an administrator.' }, { status: 403 });
    }

    if (!user.passwordHash) {
      return NextResponse.json({ error: 'Account not set up for login. Contact an administrator.' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Update last login (non-blocking)
    db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id)).catch(console.error);

    // Log activity (non-blocking — don't crash login if this fails)
    db.insert(activityLogs).values({
      userId: user.id,
      type: 'login',
      entity: 'user',
      entityId: user.id,
      description: `${user.firstName} ${user.lastName} logged in`,
      ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown',
    }).catch(console.error);

    const { passwordHash: _, ...safeUser } = user;

    const sessionData = JSON.stringify({ id: user.id, role: user.role, email: user.email, firstName: user.firstName, lastName: user.lastName });
    const encoded = Buffer.from(sessionData).toString('base64');

    const res = NextResponse.json({ user: safeUser });
    res.cookies.set('resort_session', encoded, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
