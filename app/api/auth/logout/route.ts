import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { activityLogs } from '@/lib/schema';
import { getSessionUser } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = getSessionUser(req);
    if (sessionUser) {
      await db.insert(activityLogs).values({
        userId: sessionUser.id,
        type: 'logout',
        entity: 'user',
        entityId: sessionUser.id,
        description: `${sessionUser.firstName} ${sessionUser.lastName} logged out`,
      });
    }
  } catch {
    // ignore
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('resort_session', '', { maxAge: 0, path: '/' });
  return res;
}
