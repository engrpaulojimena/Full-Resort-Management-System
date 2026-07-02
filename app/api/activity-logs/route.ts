import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { activityLogs, users } from '@/lib/schema';
import { eq, desc, ilike, or } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const type = searchParams.get('type');

    const data = await db
      .select()
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(200);

    let result = data.map(({ activity_logs: log, users: u }) => ({
      ...log,
      user: u ?? undefined,
    }));

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l => l.description.toLowerCase().includes(q));
    }
    if (type && type !== 'all') {
      result = result.filter(l => l.type === type);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/activity-logs error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, type, entity, entityId, description, metadata, ipAddress } = body;

    if (!type || !entity || !description) {
      return NextResponse.json({ error: 'type, entity, and description are required' }, { status: 400 });
    }

    const [log] = await db
      .insert(activityLogs)
      .values({ userId, type, entity, entityId, description, metadata, ipAddress })
      .returning();

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error('POST /api/activity-logs error:', error);
    return NextResponse.json({ error: 'Failed to create activity log' }, { status: 500 });
  }
}