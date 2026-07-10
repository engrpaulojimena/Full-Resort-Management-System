import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailLogs } from '@/lib/schema';
import { desc } from 'drizzle-orm';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  const u = getSessionUser(req);
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (u.role !== 'admin' && u.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const data = await db.select().from(emailLogs).orderBy(desc(emailLogs.createdAt)).limit(50);
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/email-logs error:', error);
    return NextResponse.json({ error: 'Failed to fetch email logs' }, { status: 500 });
  }
}
