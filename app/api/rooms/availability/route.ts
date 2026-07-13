import { sql } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'


/**
 * GET /api/rooms/availability
 *
 * Query params:
 *   checkIn  — ISO date string  e.g. 2026-08-01
 *   checkOut — ISO date string  e.g. 2026-08-03
 *   roomId   — numeric DB id   e.g. 1   (optional — omit to get all rooms)
 *
 * Returns:
 *   { rooms: Array<{ id, roomNumber, type, status, capacity, pricePerNight, description, amenities, images, available: boolean }> }
 *
 * A room is considered unavailable for the requested window if it has at least
 * one reservation whose status is NOT 'cancelled' or 'checked_out' and whose
 * date range overlaps the requested window (standard half-open interval overlap:
 *   existing.checkIn < requested.checkOut AND existing.checkOut > requested.checkIn)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const checkIn  = searchParams.get('checkIn')
  const checkOut = searchParams.get('checkOut')
  const roomIdParam = searchParams.get('roomId')

  // ── 1. Fetch rooms (all, or just the one requested) ────────────────────────
  const roomRows = roomIdParam
    ? await sql`
        SELECT id, room_number, type, status, floor, capacity,
               price_per_night, description, amenities, images
        FROM rooms
        WHERE id = ${parseInt(roomIdParam)}
        ORDER BY room_number
      `
    : await sql`
        SELECT id, room_number, type, status, floor, capacity,
               price_per_night, description, amenities, images
        FROM rooms
        WHERE status != 'maintenance'
        ORDER BY room_number
      `

  // ── 2. If no dates supplied, just return rooms with their DB status ─────────
  if (!checkIn || !checkOut) {
    return NextResponse.json({
      rooms: roomRows.map((r) => ({
        id: r.id,
        roomNumber: r.room_number,
        type: r.type,
        status: r.status,
        floor: r.floor,
        capacity: r.capacity,
        pricePerNight: r.price_per_night,
        description: r.description,
        amenities: r.amenities ?? [],
        images: r.images ?? [],
        // Only 'maintenance' is a blanket (date-independent) block. 'reserved'/'occupied'
        // are tied to specific reservation date ranges, so without a date range to check
        // against we can't say this room is unavailable — pass checkIn/checkOut to get
        // a real per-date availability answer.
        available: r.status !== 'maintenance',
      })),
    })
  }

  // ── 3. Validate dates ───────────────────────────────────────────────────────
  const inDate  = new Date(checkIn)
  const outDate = new Date(checkOut)

  if (isNaN(inDate.getTime()) || isNaN(outDate.getTime()) || outDate <= inDate) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  }

  // ── 4. Find all room IDs that are already booked for the requested window ───
  const conflictRows = await sql`
    SELECT DISTINCT room_id
    FROM reservations
    WHERE status NOT IN ('cancelled', 'checked_out')
      AND room_id IS NOT NULL
      AND check_in  < ${checkOut}::timestamptz
      AND check_out > ${checkIn}::timestamptz
  `
  const bookedRoomIds = new Set(conflictRows.map((r) => r.room_id))

  // ── 5. Return rooms annotated with availability ─────────────────────────────
  return NextResponse.json({
    rooms: roomRows.map((r) => ({
      id: r.id,
      roomNumber: r.room_number,
      type: r.type,
      status: r.status,
      floor: r.floor,
      capacity: r.capacity,
      pricePerNight: r.price_per_night,
      description: r.description,
      amenities: r.amenities ?? [],
      images: r.images ?? [],
      // A room is available for the requested dates if it isn't physically out of
      // service (maintenance) AND it has no reservation whose dates overlap the
      // requested window. Being 'reserved'/'occupied' for a DIFFERENT date range
      // must NOT block booking — that's what the overlap check below is for.
      available: r.status !== 'maintenance' && !bookedRoomIds.has(r.id),
    })),
  })
}
