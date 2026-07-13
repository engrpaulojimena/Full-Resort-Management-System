/**
 * GET /api/bookings/cancel-expired
 *
 * Auto-cancels reservations that are still "pending" AND have no submitted
 * payment within 30 minutes of creation.
 *
 * Call via Vercel Cron — add to vercel.json:
 *   { "crons": [{ "path": "/api/bookings/cancel-expired", "schedule": "0 0 * * *" }] }
 *
 * Set CRON_SECRET in Vercel env vars. Pass as Authorization: Bearer <secret>.
 */

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import nodemailer from 'nodemailer'

const sql = neon(process.env.DATABASE_URL!)

const CRON_SECRET              = process.env.CRON_SECRET || ''
const GMAIL_USER               = process.env.GMAIL_USER || ''
const GMAIL_APP_PASSWORD       = process.env.GMAIL_APP_PASSWORD || ''
const RESORT_NAME              = process.env.RESORT_NAME || 'Kekamiya Beach Resort'
const PAYMENT_DEADLINE_MINUTES = 30

function getTransporter() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  })
}

async function sendCancellationEmail(opts: {
  guestEmail: string
  guestName: string
  confirmationCode: string
  roomName: string
  checkIn: string
  checkOut: string
}) {
  const transporter = getTransporter()
  if (!transporter) {
    console.log(`[cancel-expired] dry-run: would email ${opts.guestEmail}`)
    return
  }

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f8fafc;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:linear-gradient(135deg,#0c4a6e,#0284c7);padding:32px;border-radius:16px 16px 0 0;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">${RESORT_NAME}</h1>
    <p style="color:#bae6fd;margin:6px 0 0;font-size:13px;">Botolan, Zambales · Philippines</p>
  </div>
  <div style="background:#fff;padding:28px;border-left:1px solid #e0f2fe;border-right:1px solid #e0f2fe;">
    <h2 style="color:#dc2626;margin:0 0 12px;">Booking Cancelled — No Deposit Received</h2>
    <p style="color:#64748b;margin:0 0 20px;">
      Hi ${opts.guestName.split(' ')[0]}, your booking request <strong style="color:#0c4a6e;">${opts.confirmationCode}</strong>
      was automatically cancelled because no deposit was submitted within ${PAYMENT_DEADLINE_MINUTES} minutes.
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin-bottom:20px;font-size:14px;">
      <div style="margin-bottom:8px;"><strong style="color:#0c4a6e;">Villa:</strong> ${opts.roomName}</div>
      <div style="margin-bottom:8px;"><strong style="color:#0c4a6e;">Check-in:</strong> ${opts.checkIn}</div>
      <div><strong style="color:#0c4a6e;">Check-out:</strong> ${opts.checkOut}</div>
    </div>
    <p style="color:#64748b;font-size:14px;">
      No worries — these dates may still be available. Feel free to book again!
    </p>
    <div style="text-align:center;margin-top:20px;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || '#'}/book"
         style="display:inline-block;background:#0284c7;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
        Book Again →
      </a>
    </div>
  </div>
  <div style="background:#0c4a6e;padding:18px;border-radius:0 0 16px 16px;text-align:center;">
    <p style="color:#bae6fd;margin:0;font-size:13px;">
      Questions? Email <a href="mailto:${GMAIL_USER}" style="color:#7dd3fc;">${GMAIL_USER}</a>
    </p>
  </div>
</div>
</body>
</html>`

  try {
    await transporter.sendMail({
      from:    `"${RESORT_NAME}" <${GMAIL_USER}>`,
      to:      opts.guestEmail,
      subject: `Booking Cancelled — ${opts.confirmationCode} | ${RESORT_NAME}`,
      html,
    })
  } catch (err) {
    console.error('[cancel-expired] email failed:', err)
  }
}

export async function GET(req: NextRequest) {
  // Auth check
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  const authHeader   = req.headers.get('authorization')
  const bearerOk     = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`

  if (!isVercelCron && !bearerOk) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const expired = await sql`
      SELECT
        r.id,
        r.confirmation_code,
        r.check_in,
        r.check_out,
        r.created_at,
        g.first_name,
        g.last_name,
        g.email,
        ro.room_number,
        ro.type AS room_type
      FROM reservations r
      JOIN guests g  ON g.id  = r.guest_id
      JOIN rooms  ro ON ro.id = r.room_id
      WHERE r.status = 'pending'
        AND r.created_at < NOW() - (${PAYMENT_DEADLINE_MINUTES} || ' minutes')::interval
        AND NOT EXISTS (
          SELECT 1 FROM payments p
          WHERE p.reservation_id = r.id
            AND p.status IN ('pending', 'verified')
        )
    `

    if (expired.length === 0) {
      return NextResponse.json({ success: true, cancelled: 0, message: 'No expired bookings.' })
    }

    const formatDate = (d: string) =>
      new Date(d).toLocaleDateString('en-PH', {
        weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
      })

    let cancelledCount = 0
    const cancelledCodes: string[] = []

    for (const row of expired) {
      try {
        const roomName = `${row.room_type ?? 'Room'} · ${row.room_number ?? ''}`

        await sql`
          UPDATE reservations
          SET
            status     = 'cancelled',
            updated_at = NOW(),
            special_requests = CASE
              WHEN special_requests IS NULL OR special_requests = '' THEN ${'Auto-cancelled: no deposit within ' + PAYMENT_DEADLINE_MINUTES + ' min'}
              ELSE special_requests || ${ ' | Auto-cancelled: no deposit within ' + PAYMENT_DEADLINE_MINUTES + ' min'}
            END
          WHERE id = ${row.id} AND status = 'pending'
        `

        await sql`
          INSERT INTO activity_logs (type, entity, entity_id, description, created_at)
          VALUES (
            'cancel', 'reservation', ${row.id},
            ${'Auto-cancelled: no deposit submitted within ' + PAYMENT_DEADLINE_MINUTES + ' minutes (' + row.confirmation_code + ')'},
            NOW()
          )
        `.catch(() => {})

        await sql`
          INSERT INTO notifications (user_id, type, title, message, entity, entity_id, is_read, email_sent, created_at)
          SELECT id, 'auto_cancel',
            'Booking Auto-Cancelled',
            ${'Booking ' + row.confirmation_code + ' for ' + row.first_name + ' ' + row.last_name + ' was auto-cancelled — no deposit within ' + PAYMENT_DEADLINE_MINUTES + ' min.'},
            'reservation', ${row.id}, false, false, NOW()
          FROM users WHERE role IN ('admin', 'super_admin') AND is_active = true
        `.catch(() => {})

        await sendCancellationEmail({
          guestEmail:       row.email,
          guestName:        `${row.first_name} ${row.last_name}`,
          confirmationCode: row.confirmation_code,
          roomName,
          checkIn:          formatDate(row.check_in),
          checkOut:         formatDate(row.check_out),
        })

        cancelledCount++
        cancelledCodes.push(row.confirmation_code)
      } catch (innerErr) {
        console.error(`[cancel-expired] failed for ${row.confirmation_code}:`, innerErr)
      }
    }

    return NextResponse.json({ success: true, cancelled: cancelledCount, codes: cancelledCodes })
  } catch (err) {
    console.error('[cancel-expired] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}