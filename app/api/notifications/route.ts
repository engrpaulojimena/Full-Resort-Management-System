import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifications } from '@/lib/schema';
import { desc, eq } from 'drizzle-orm';
import { getSessionUser } from '@/lib/session';

function requireAuth(req: NextRequest) {
  const u = getSessionUser(req);
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return u;
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const data = await db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(100);
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    const { type, title, message, entity, entityId, emailSent, userId } = body;

    if (!type || !title || !message) {
      return NextResponse.json({ error: 'type, title, and message are required' }, { status: 400 });
    }

    const [created] = await db
      .insert(notifications)
      .values({
        type, title, message, entity, entityId,
        emailSent: !!emailSent,
        userId: userId ?? undefined,
        isRead: false,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    const { id, all } = body;

    if (all) {
      const updated = await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.isRead, false))
        .returning();
      return NextResponse.json(updated);
    }

    if (!id) {
      return NextResponse.json({ error: 'id (or all=true) is required' }, { status: 400 });
    }

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
