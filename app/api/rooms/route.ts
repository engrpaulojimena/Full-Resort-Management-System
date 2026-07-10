import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rooms } from '@/lib/schema';
import { eq } from 'drizzle-orm';
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
    const data = await db.select().from(rooms).orderBy(rooms.roomNumber);
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/rooms error:', error);
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    const { roomNumber, type, status, floor, capacity, pricePerNight, description, amenities, images } = body;

    if (!roomNumber || !type || !pricePerNight) {
      return NextResponse.json({ error: 'Room number, type, and price are required' }, { status: 400 });
    }

    const [newRoom] = await db
      .insert(rooms)
      .values({
        roomNumber,
        type,
        status: status || 'available',
        floor: parseInt(floor) || 1,
        capacity: parseInt(capacity) || 2,
        pricePerNight: String(pricePerNight),
        description,
        amenities: amenities || [],
        images: images || [],
      })
      .returning();

    return NextResponse.json(newRoom, { status: 201 });
  } catch (error) {
    console.error('POST /api/rooms error:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    const { id, roomNumber, type, status, floor, capacity, pricePerNight, description, amenities, images } = body;

    if (!id) return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (roomNumber    !== undefined) updateData.roomNumber    = roomNumber;
    if (type          !== undefined) updateData.type          = type;
    if (status        !== undefined) updateData.status        = status;
    if (floor         !== undefined) updateData.floor         = parseInt(floor) || 1;
    if (capacity      !== undefined) updateData.capacity      = parseInt(capacity) || 2;
    if (pricePerNight !== undefined) updateData.pricePerNight = String(pricePerNight);
    if (description   !== undefined) updateData.description   = description;
    if (amenities     !== undefined) updateData.amenities     = amenities;
    if (images        !== undefined) updateData.images        = images;

    const [updated] = await db
      .update(rooms)
      .set(updateData)
      .where(eq(rooms.id, parseInt(id)))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/rooms error:', error);
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}
