import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payments, reservations, guests, rooms } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

async function fetchPaymentWithJoins(paymentId: number) {
  const joined = await db
    .select()
    .from(payments)
    .leftJoin(reservations, eq(payments.reservationId, reservations.id))
    .leftJoin(guests, eq(reservations.guestId, guests.id))
    .leftJoin(rooms, eq(reservations.roomId, rooms.id))
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (joined.length === 0) return null;
  const row = joined[0];
  const g = row.guests;
  const r = row.reservations;
  return {
    ...row.payments,
    reservation: r
      ? {
          ...r,
          guestName: r.guestName || (g ? `${g.firstName} ${g.lastName}`.trim() : undefined),
          guest: g ?? undefined,
          room: row.rooms ?? undefined,
        }
      : undefined,
  };
}

export async function GET() {
  try {
    const data = await db
      .select()
      .from(payments)
      .leftJoin(reservations, eq(payments.reservationId, reservations.id))
      .leftJoin(guests, eq(reservations.guestId, guests.id))
      .leftJoin(rooms, eq(reservations.roomId, rooms.id))
      .orderBy(desc(payments.createdAt));

    const result = data.map(({ payments: p, reservations: r, guests: g, rooms: rm }) => {
      const resolvedName = r?.guestName || (g ? `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim() : undefined);
      console.log('[payments-debug]', r?.confirmationCode, '| r.guestName:', r?.guestName, '| g.firstName:', g?.firstName, '| resolved:', resolvedName);
      return {
        ...p,
        reservation: r
          ? {
              ...r,
              guestName: resolvedName,
              guest: g ?? undefined,
              room: rm ?? undefined,
            }
          : undefined,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/payments error:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reservationId, amount, method, paymentType, referenceNumber, notes } = body;

    if (!reservationId || !amount || !method) {
      return NextResponse.json({ error: 'Reservation ID, amount, and method are required' }, { status: 400 });
    }

    const [newPayment] = await db
      .insert(payments)
      .values({
        reservationId: parseInt(reservationId),
        amount: String(amount),
        method,
        status: 'pending',
        paymentType,
        referenceNumber,
        notes,
      })
      .returning();

    // Re-fetch with joins so the client gets guest/room/reservation data
    // immediately — no hard refresh needed.
    const full = await fetchPaymentWithJoins(newPayment.id);
    return NextResponse.json(full ?? newPayment, { status: 201 });
  } catch (error) {
    console.error('POST /api/payments error:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, amount, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      if (status === 'verified') updateData.verifiedAt = new Date();
    }
    if (amount !== undefined) updateData.amount = String(amount);
    if (notes !== undefined) updateData.notes = notes;
    updateData.updatedAt = new Date();

    if (Object.keys(updateData).length === 1) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const [updated] = await db
      .update(payments)
      .set(updateData)
      .where(eq(payments.id, parseInt(id)))
      .returning();

    // Re-fetch with joins so status changes (verify/reject/refund) also
    // reflect correctly in the UI without a refresh.
    const full = await fetchPaymentWithJoins(updated.id);
    return NextResponse.json(full ?? updated);
  } catch (error) {
    console.error('PATCH /api/payments error:', error);
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}