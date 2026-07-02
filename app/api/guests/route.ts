import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { guests } from '@/lib/schema';
import { ilike, or } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    let data;
    if (search) {
      data = await db
        .select()
        .from(guests)
        .where(
          or(
            ilike(guests.firstName, `%${search}%`),
            ilike(guests.lastName, `%${search}%`),
            ilike(guests.email, `%${search}%`),
            ilike(guests.phone, `%${search}%`)
          )
        )
        .orderBy(guests.lastName);
    } else {
      data = await db.select().from(guests).orderBy(guests.lastName);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/guests error:', error);
    return NextResponse.json({ error: 'Failed to fetch guests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
