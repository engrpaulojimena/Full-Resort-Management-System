import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const data = await db.select().from(users).orderBy(users.firstName);
    return NextResponse.json(data.map(({ passwordHash: _, ...u }) => u));
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isActive, role } = body;
    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (isActive !== undefined) updateData.isActive = isActive;
    if (role     !== undefined) updateData.role     = role;

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, parseInt(id)))
      .returning();

    if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const { passwordHash: _, ...safe } = updated;
    return NextResponse.json(safe);
  } catch (error) {
    console.error('PATCH /api/users error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
