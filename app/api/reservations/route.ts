import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reservations, guests, rooms, activityLogs, payments } from '@/lib/schema';
import { eq, desc, sql, getTableColumns } from 'drizzle-orm';
import { generateConfirmationCode } from '@/lib/utils';
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
    const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '100'), 200);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Single query: reservations + guest + room + payment aggregate.
    // amountPaid and paymentCount are computed in the DB — no in-memory loops.
    const data = await db
      .select({
        // All reservation columns
        ...getTableColumns(reservations),
        // Guest name fields only (avoid sending all guest columns on every row)
        guestFirstName:  guests.firstName,
        guestLastName:   guests.lastName,
        guestEmail:      guests.email,
        guestPhone:      guests.phone,
        guestNationality: guests.nationality,
        // Room summary
        roomNumber:      rooms.roomNumber,
        roomType:        rooms.type,
        roomFloor:       rooms.floor,
        roomCapacity:    rooms.capacity,
        roomPrice:       rooms.pricePerNight,
        // Payment aggregate — no extra round-trip, no in-memory loop
        amountPaid: sql<number>`
          COALESCE(SUM(
            CASE WHEN ${payments.status} = 'verified'
            THEN ${payments.amount}::numeric ELSE 0 END
          ), 0)`,
        paymentCount: sql<number>`COUNT(${payments.id})`,
      })
      .from(reservations)
      .leftJoin(guests,   eq(reservations.guestId,   guests.id))
      .leftJoin(rooms,    eq(reservations.roomId,     rooms.id))
      .leftJoin(payments, eq(payments.reservationId,  reservations.id))
      .groupBy(reservations.id, guests.id, rooms.id)
      .orderBy(desc(reservations.createdAt))
      .limit(limit)
      .offset(offset);

    const result = data.map((r) => ({
      id:               r.id,
      confirmationCode: r.confirmationCode,
      guestId:          r.guestId,
      roomId:           r.roomId,
      status:           r.status,
      checkIn:          r.checkIn,
      checkOut:         r.checkOut,
      adults:           r.adults,
      children:         r.children,
      guestName:        r.guestName,
      totalAmount:      r.totalAmount,
      specialRequests:  r.specialRequests,
      source:           r.source,
      createdAt:        r.createdAt,
      updatedAt:        r.updatedAt,
      amountPaid:       Number(r.amountPaid),
      paymentCount:     Number(r.paymentCount),
      guest: r.guestFirstName ? {
        firstName:   r.guestFirstName,
        lastName:    r.guestLastName,
        email:       r.guestEmail,
        phone:       r.guestPhone,
        nationality: r.guestNationality,
      } : undefined,
      room: r.roomNumber ? {
        roomNumber: r.roomNumber,
        type:       r.roomType,
        floor:      r.roomFloor,
        capacity:   r.roomCapacity,
        pricePerNight: r.roomPrice,
      } : undefined,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/reservations error:', error);
    return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    const {
      guestId, roomId, checkIn, checkOut, adults, children,
      totalAmount, specialRequests, source, guestName, status = 'pending',
    } = body;

    const confirmationCode = generateConfirmationCode();

    const [newReservation] = await db
      .insert(reservations)
      .values({
        confirmationCode,
        guestId: guestId ? parseInt(guestId) : undefined,
        roomId: roomId ? parseInt(roomId) : undefined,
        status,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        adults: parseInt(adults) || 1,
        children: parseInt(children) || 0,
        guestName: guestName || undefined,
        totalAmount: String(totalAmount),
        specialRequests,
        source,
      })
      .returning();

    if (newReservation.roomId && status !== 'cancelled') {
      await db.update(rooms).set({ status: 'reserved', updatedAt: new Date() }).where(eq(rooms.id, newReservation.roomId));
    }

    const [joined] = await db
      .select()
      .from(reservations)
      .leftJoin(guests, eq(reservations.guestId, guests.id))
      .leftJoin(rooms, eq(reservations.roomId, rooms.id))
      .where(eq(reservations.id, newReservation.id));

    const displayName = guestName || (joined.guests ? `${joined.guests.firstName} ${joined.guests.lastName}` : 'Guest');
    const roomLabel = joined.rooms ? `Room ${joined.rooms.roomNumber}` : 'a room';
    await db.insert(activityLogs).values({
      userId: auth.id,
      type: 'create',
      entity: 'reservation',
      entityId: newReservation.id,
      description: `Created reservation ${confirmationCode} for ${displayName} — ${roomLabel}.`,
    }).catch(() => {});

    return NextResponse.json({
      ...joined.reservations,
      guest: joined.guests ?? undefined,
      room: joined.rooms ?? undefined,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/reservations error:', error);
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Reservation ID and status are required' }, { status: 400 });
    }

    const validStatuses = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const [existing] = await db.select().from(reservations).where(eq(reservations.id, parseInt(id)));
    if (!existing) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    const [updated] = await db
      .update(reservations)
      .set({ status, updatedAt: new Date() })
      .where(eq(reservations.id, parseInt(id)))
      .returning();

    if (existing.roomId) {
      const roomStatusByReservationStatus: Record<string, 'available' | 'occupied' | 'reserved'> = {
        pending: 'reserved',
        confirmed: 'reserved',
        checked_in: 'occupied',
        checked_out: 'available',
        cancelled: 'available',
      };
      await db.update(rooms)
        .set({ status: roomStatusByReservationStatus[status], updatedAt: new Date() })
        .where(eq(rooms.id, existing.roomId));
    }

    const [joined] = await db
      .select()
      .from(reservations)
      .leftJoin(guests, eq(reservations.guestId, guests.id))
      .leftJoin(rooms, eq(reservations.roomId, rooms.id))
      .where(eq(reservations.id, updated.id));

    const displayName = joined.reservations.guestName || (joined.guests ? `${joined.guests.firstName} ${joined.guests.lastName}` : 'Guest');
    await db.insert(activityLogs).values({
      userId: auth.id,
      type: status === 'cancelled' ? 'cancel' : 'update',
      entity: 'reservation',
      entityId: updated.id,
      description: `${displayName}'s reservation ${updated.confirmationCode} marked as ${status.replace('_', ' ')}.`,
    }).catch(() => {});

    return NextResponse.json({
      ...joined.reservations,
      guest: joined.guests ?? undefined,
      room: joined.rooms ?? undefined,
    });
  } catch (error) {
    console.error('PATCH /api/reservations error:', error);
    return NextResponse.json({ error: 'Failed to update reservation' }, { status: 500 });
  }
}
