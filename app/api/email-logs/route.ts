import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailLogs } from '@/lib/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const data = await db.select().from(emailLogs).orderBy(desc(emailLogs.createdAt)).limit(50);
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/email-logs error:', error);
    return NextResponse.json({ error: 'Failed to fetch email logs' }, { status: 500 });
  }
}
