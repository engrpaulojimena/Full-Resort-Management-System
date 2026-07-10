import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id));
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const { passwordHash: _, ...safe } = user;
    return NextResponse.json(safe);
  } catch {
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}
