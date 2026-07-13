import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rooms, reservations, payments, guests, activityLogs, users } from '@/lib/schema';
import { eq, desc, count, sum, and, sql } from 'drizzle-orm';
import { getSessionUser } from '@/lib/session';

// GET /api/dashboard
// Returns aggregated stats + small recent-data slices.
// Replaces 5 separate full-table fetches on the dashboard page.
export async function GET(req: NextRequest) {
  const u = getSessionUser(req);
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      roomStats,
      resStats,
      payStats,
      monthlyRevenue,
      guestCount,
      recentReservations,
      recentLogs,
    ] = await Promise.all([

      // Room counts grouped by status
      db
        .select({ status: rooms.status, count: count() })
        .from(rooms)
        .groupBy(rooms.status),

      // Reservation counts grouped by status
      db
        .select({ status: reservations.status, count: count() })
        .from(reservations)
        .groupBy(reservations.status),

      // Payment counts + pending count
      db
        .select({ status: payments.status, count: count() })
        .from(payments)
        .groupBy(payments.status),

      // Monthly revenue: verified payments this calendar month
      db
        .select({ total: sum(payments.amount) })
        .from(payments)
        .where(
          and(
            eq(payments.status, 'verified'),
            sql`${payments.createdAt} >= ${monthStart}`
          )
        ),

      // Total guest count (single number — no row data)
      db.select({ count: count() }).from(guests),

      // Last 5 reservations with minimal columns (no images)
      db
        .select({
          id: reservations.id,
          confirmationCode: reservations.confirmationCode,
          guestName: reservations.guestName,
          status: reservations.status,
          checkIn: reservations.checkIn,
          checkOut: reservations.checkOut,
          totalAmount: reservations.totalAmount,
          roomNumber: rooms.roomNumber,
          guestFirstName: guests.firstName,
          guestLastName: guests.lastName,
        })
        .from(reservations)
        .leftJoin(rooms, eq(reservations.roomId, rooms.id))
        .leftJoin(guests, eq(reservations.guestId, guests.id))
        .orderBy(desc(reservations.createdAt))
        .limit(5),

      // Last 5 activity logs with user name only
      db
        .select({
          id: activityLogs.id,
          type: activityLogs.type,
          entity: activityLogs.entity,
          entityId: activityLogs.entityId,
          description: activityLogs.description,
          createdAt: activityLogs.createdAt,
          userFirstName: users.firstName,
        })
        .from(activityLogs)
        .leftJoin(users, eq(activityLogs.userId, users.id))
        .orderBy(desc(activityLogs.createdAt))
        .limit(5),
    ]);

    // Build stat counters from grouped rows
    const roomCounts = Object.fromEntries(roomStats.map((r) => [r.status, Number(r.count)]));
    const resCounts  = Object.fromEntries(resStats.map((r)  => [r.status, Number(r.count)]));
    const payCounts  = Object.fromEntries(payStats.map((p)  => [p.status, Number(p.count)]));

    // Today check-ins / check-outs require minimal date check — done in SQL
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    const [todayCheckIns, todayCheckOuts] = await Promise.all([
      db
        .select({ count: count() })
        .from(reservations)
        .where(
          and(
            sql`${reservations.checkIn} >= ${todayStart}`,
            sql`${reservations.checkIn} < ${todayEnd}`,
            sql`${reservations.status} IN ('confirmed', 'checked_in')`
          )
        ),
      db
        .select({ count: count() })
        .from(reservations)
        .where(
          and(
            sql`${reservations.checkOut} >= ${todayStart}`,
            sql`${reservations.checkOut} < ${todayEnd}`,
            sql`${reservations.status} IN ('checked_in', 'checked_out')`
          )
        ),
    ]);

    return NextResponse.json({
      stats: {
        totalRooms:          Object.values(roomCounts).reduce((a, b) => a + b, 0),
        availableRooms:      roomCounts['available']    ?? 0,
        occupiedRooms:       roomCounts['occupied']     ?? 0,
        reservedRooms:       roomCounts['reserved']     ?? 0,
        maintenanceRooms:    roomCounts['maintenance']  ?? 0,
        totalReservations:   Object.values(resCounts).reduce((a, b) => a + b, 0),
        pendingReservations: resCounts['pending']       ?? 0,
        confirmedRes:        resCounts['confirmed']     ?? 0,
        checkedInRes:        resCounts['checked_in']    ?? 0,
        pendingPayments:     payCounts['pending']       ?? 0,
        monthlyRevenue:      parseFloat(String(monthlyRevenue[0]?.total ?? '0')),
        totalGuests:         Number(guestCount[0]?.count ?? 0),
        todayCheckIns:       Number(todayCheckIns[0]?.count ?? 0),
        todayCheckOuts:      Number(todayCheckOuts[0]?.count ?? 0),
        // Occupancy breakdown for pie chart
        roomOccupancy: roomStats.map((r) => ({ status: r.status, value: Number(r.count) })),
      },
      recentReservations: recentReservations.map((r) => ({
        ...r,
        guest: r.guestFirstName
          ? { firstName: r.guestFirstName, lastName: r.guestLastName }
          : undefined,
        room: r.roomNumber ? { roomNumber: r.roomNumber } : undefined,
      })),
      recentLogs: recentLogs.map((l) => ({
        ...l,
        user: l.userFirstName ? { firstName: l.userFirstName } : undefined,
      })),
    });
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
