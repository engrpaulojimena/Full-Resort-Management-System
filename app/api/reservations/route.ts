import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reservations, guests, rooms, activityLogs, payments } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { generateConfirmationCode } from '@/lib/utils';

export async function GET() {
  try {
    const data = await db
      .select()
      .from(reservations)
      .leftJoin(guests, eq(reservations.guestId, guests.id))
      .leftJoin(rooms, eq(reservations.roomId, rooms.id))
      .orderBy(desc(reservations.createdAt));

    // Fetch all payments and group by reservationId
    const allPayments = await db.select().from(payments);
    const paymentsByResId: Record<number, typeof allPayments> = {};
    for (const p of allPayments) {
      if (p.reservationId == null) continue;
      if (!paymentsByResId[p.reservationId]) paymentsByResId[p.reservationId] = [];
      paymentsByResId[p.reservationId].push(p);
    }

    const result = data.map(({ reservations: r, guests: g, rooms: rm }) => {
      const resPayments = paymentsByResId[r.id] ?? [];
      const amountPaid = resPayments
        .filter(p => p.status === 'verified')
        .reduce((s, p) => s + parseFloat(String(p.amount)), 0);
      return {
        ...r,
        guest: g ?? undefined,
        room: rm ?? undefined,
        payments: resPayments,
        amountPaid,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/reservations error:', error);
    return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      guestId,
      roomId,
      checkIn,
      checkOut,
      adults,
      children,
      totalAmount,
      specialRequests,
      source,
      guestName,
      status = 'pending',
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

    // A room now has an active booking against it — reflect that on the room record
    // (unless the reservation was created as already cancelled, which shouldn't
    // normally happen from this endpoint, but guard for safety).
    if (newReservation.roomId && status !== 'cancelled') {
      await db.update(rooms).set({ status: 'reserved', updatedAt: new Date() }).where(eq(rooms.id, newReservation.roomId));
    }

    // Fetch joined data for the response
    const [joined] = await db
      .select()
      .from(reservations)
      .leftJoin(guests, eq(reservations.guestId, guests.id))
      .leftJoin(rooms, eq(reservations.roomId, rooms.id))
      .where(eq(reservations.id, newReservation.id));

    const displayName = guestName || (joined.guests ? `${joined.guests.firstName} ${joined.guests.lastName}` : 'Guest');
    const roomLabel = joined.rooms ? `Room ${joined.rooms.roomNumber}` : 'a room';
    await db.insert(activityLogs).values({
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

    // Keep the room's status in sync with the reservation lifecycle.
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