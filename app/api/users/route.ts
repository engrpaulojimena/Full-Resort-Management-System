import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { getSessionUser } from '@/lib/session';

function requireAdmin(req: NextRequest) {
  const u = getSessionUser(req);
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (u.role !== 'admin' && u.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return u;
}

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const data = await db.select().from(users).orderBy(users.firstName);
    return NextResponse.json(data.map(({ passwordHash: _, ...u }) => u));
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    const { firstName, lastName, email, password, role } = body;
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const [newUser] = await db
      .insert(users)
      .values({ firstName, lastName, email: email.toLowerCase().trim(), passwordHash, role: role ?? 'staff', isActive: true })
      .returning();
    const { passwordHash: _, ...safe } = newUser;
    return NextResponse.json(safe, { status: 201 });
  } catch (error: unknown) {
    console.error('POST /api/users error:', error);
    const msg = error instanceof Error && error.message.includes('unique') ? 'Email already exists' : 'Failed to create user';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    const { id, isActive, role, password } = body;
    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    // Prevent self-demotion or self-deactivation
    if (parseInt(id) === auth.id && (role !== undefined || isActive === false)) {
      return NextResponse.json({ error: 'Cannot modify your own role or status' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (isActive !== undefined) updateData.isActive = isActive;
    if (role !== undefined) updateData.role = role;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 12);

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

export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    // Prevent self-deletion
    if (parseInt(id) === auth.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 403 });
    }

    await db.delete(users).where(eq(users.id, parseInt(id)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/users error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
