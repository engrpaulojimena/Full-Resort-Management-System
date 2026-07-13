import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { guests } from '@/lib/schema';
import { ilike, or, count } from 'drizzle-orm';
import { getSessionUser } from '@/lib/session';

async function requireAuth(req: NextRequest) {
  const u = await getSessionUser(req);
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return u;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '50'), 200);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const where = search
      ? or(
          ilike(guests.firstName, `%${search}%`),
          ilike(guests.lastName,  `%${search}%`),
          ilike(guests.email,     `%${search}%`),
          ilike(guests.phone,     `%${search}%`)
        )
      : undefined;

    const [data, total] = await Promise.all([
      db
        .select()
        .from(guests)
        .where(where)
        .orderBy(guests.lastName)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(guests)
        .where(where),
    ]);

    return NextResponse.json({ data, total: Number(total[0]?.count ?? 0), limit, offset });
  } catch (error) {
    console.error('GET /api/guests error:', error);
    return NextResponse.json({ error: 'Failed to fetch guests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    const { firstName, lastName, email, phone, address, idType, idNumber, nationality, notes } = body;

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 });
    }

    const [newGuest] = await db
      .insert(guests)
      .values({ firstName, lastName, email, phone, address, idType, idNumber, nationality, notes })
      .returning();

    return NextResponse.json(newGuest, { status: 201 });
  } catch (error) {
    console.error('POST /api/guests error:', error);
    return NextResponse.json({ error: 'Failed to create guest' }, { status: 500 });
  }
}
