import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

const DEPOSIT_RATE = 0.3
const PAYMENT_DEADLINE_MINUTES = 30

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')?.trim().toUpperCase()
  const email = searchParams.get('email')?.trim().toLowerCase()

  if (!code || !email) {
    return NextResponse.json({ error: 'Missing confirmation code or email.' }, { status: 400 })
  }

  try {
    const rows = await sql`
      SELECT
        r.id,
        r.confirmation_code,
        r.check_in,
        r.check_out,
        r.adults,
        r.children,
        r.room_id,
        r.status,
        r.total_amount,
        r.created_at,
        r.updated_at,
        g.first_name,
        g.last_name,
        g.email,
        ro.room_number,
        ro.type             AS room_type,
        ro.price_per_night,
        -- compute deadline and minutes left entirely in DB (avoids timezone issues)
        (r.created_at + (${PAYMENT_DEADLINE_MINUTES} || ' minutes')::interval)
                            AS payment_deadline,
        GREATEST(0, CEIL(
          EXTRACT(EPOCH FROM (
            r.created_at + (${PAYMENT_DEADLINE_MINUTES} || ' minutes')::interval - NOW()
          )) / 60
        ))                  AS minutes_left
      FROM reservations r
      JOIN guests g  ON g.id  = r.guest_id
      JOIN rooms  ro ON ro.id = r.room_id
      WHERE r.confirmation_code = ${code}
        AND LOWER(g.email) = ${email}
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No booking found with that confirmation code and email.' },
        { status: 404 }
      )
    }

    const res = rows[0]

    // Fetch payments
    const payments = await sql`
      SELECT id, status, method, reference_number, amount, payment_type, created_at
      FROM payments
      WHERE reservation_id = ${res.id}
      ORDER BY created_at DESC
    `

    // Determine payment status
    let paymentStatus: 'unpaid' | 'pending_verification' | 'deposit_paid' | 'fully_paid' = 'unpaid'
    let paymentMethod: string | undefined
    let paymentRef: string | undefined

    if (payments.length > 0) {
      const latestPending   = payments.find((p) => p.status === 'pending')
      const verifiedDeposit = payments.find((p) => p.status === 'verified' && p.payment_type === 'deposit')
      const totalVerified   = payments
        .filter((p) => p.status === 'verified')
        .reduce((s, p) => s + parseFloat(p.amount), 0)
      const totalAmount = parseFloat(res.total_amount)

      if (totalVerified >= totalAmount) {
        paymentStatus = 'fully_paid'
      } else if (verifiedDeposit) {
        paymentStatus = 'deposit_paid'
      } else if (latestPending) {
        paymentStatus = 'pending_verification'
        paymentMethod = latestPending.method
        paymentRef    = latestPending.reference_number
      }
    }

    // Amounts
    const nights        = Math.round(
      (new Date(res.check_out).getTime() - new Date(res.check_in).getTime()) / (1000 * 60 * 60 * 24)
    )
    const pricePerNight = parseFloat(res.price_per_night)
    const totalAmount   = res.total_amount ? parseFloat(res.total_amount) : nights * pricePerNight
    const depositAmount = Math.ceil(totalAmount * DEPOSIT_RATE)
    const amountPaid    = payments
      .filter((p) => p.status === 'verified')
      .reduce((s, p) => s + parseFloat(p.amount), 0)
    const roomName      = `${res.room_type ?? 'Room'} · ${res.room_number ?? ''}`
    const minutesLeft   = parseInt(res.minutes_left ?? '0')

    return NextResponse.json({
      success: true,
      booking: {
        confirmationCode: res.confirmation_code,
        reservationId:    res.id,
        guestName:        `${res.first_name} ${res.last_name}`,
        guestEmail:       res.email,
        checkIn:          res.check_in,
        checkOut:         res.check_out,
        guests:           (res.adults ?? 0) + (res.children ?? 0),
        roomName,
        status:           res.status,
        totalAmount,
        depositAmount,
        amountPaid,
        paymentStatus,
        paymentMethod,
        paymentRef,
        paymentDeadline:  res.payment_deadline,
        minutesLeft:      paymentStatus === 'unpaid' ? minutesLeft : undefined,
        cancelledAt:      res.status === 'cancelled' ? res.updated_at : undefined,
      },
    })
  } catch (err) {
    console.error('[booking-status] error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}