import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import nodemailer from 'nodemailer'

// ─── DB ───────────────────────────────────────────────────────────────────────
const sql = neon(process.env.DATABASE_URL!)

// ─── Email (Nodemailer/Gmail) ─────────────────────────────────────────────────
const GMAIL_USER        = process.env.GMAIL_USER || ''
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || ''
const RESORT_NAME       = process.env.RESORT_NAME || 'Kekamiya Beach Resort'
const ADMIN_EMAIL       = process.env.ADMIN_EMAIL || GMAIL_USER

function getTransporter() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  })
}

async function sendEmail(to: string, subject: string, html: string) {
  const transporter = getTransporter()
  if (!transporter) {
    console.log(`[bookings:dry-run] would send "${subject}" to ${to}`)
    return
  }
  try {
    await transporter.sendMail({ from: `"${RESORT_NAME}" <${GMAIL_USER}>`, to, subject, html })
  } catch (err) {
    console.error('[bookings] sendEmail failed:', err)
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'RSV-'
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  return code
}

function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  )
}

function formatDatePH(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
  })
}

// ─── Email templates ──────────────────────────────────────────────────────────
function guestConfirmationHtml(opts: {
  guestName: string; roomName: string; checkIn: string; checkOut: string
  nights: number; guests: number; totalAmount: number; confirmationCode: string
  specialRequests?: string
}) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f0f9ff;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:linear-gradient(135deg,#0c4a6e,#0284c7);padding:32px;border-radius:16px 16px 0 0;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">${RESORT_NAME}</h1>
    <p style="color:#bae6fd;margin:6px 0 0;font-size:13px;">Botolan, Zambales · Philippines</p>
  </div>
  <div style="background:#fff;padding:28px;border-left:1px solid #e0f2fe;border-right:1px solid #e0f2fe;">
    <h2 style="color:#0c4a6e;margin:0 0 4px;">Booking Request Received! 🎉</h2>
    <p style="color:#64748b;margin:0 0 24px;">Hi ${opts.guestName.split(' ')[0]}, we got your request and will confirm within 24 hours.</p>
    <div style="background:#f0f9ff;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #bae6fd;text-align:center;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#0284c7;letter-spacing:1px;text-transform:uppercase;">Confirmation Code</p>
      <p style="margin:0;font-size:30px;font-weight:bold;color:#0c4a6e;letter-spacing:4px;">${opts.confirmationCode}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Keep this code — we'll reference it when we reach out.</p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Villa / Room</td>
          <td style="padding:10px 0;font-weight:600;text-align:right;color:#0c4a6e;">${opts.roomName}</td></tr>
      <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Check-in</td>
          <td style="padding:10px 0;font-weight:600;text-align:right;color:#0c4a6e;">${opts.checkIn}</td></tr>
      <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Check-out</td>
          <td style="padding:10px 0;font-weight:600;text-align:right;color:#0c4a6e;">${opts.checkOut}</td></tr>
      <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Duration</td>
          <td style="padding:10px 0;font-weight:600;text-align:right;color:#0c4a6e;">${opts.nights} night${opts.nights > 1 ? 's' : ''}</td></tr>
      <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Guests</td>
          <td style="padding:10px 0;font-weight:600;text-align:right;color:#0c4a6e;">${opts.guests}</td></tr>
      ${opts.specialRequests ? `<tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Special Requests</td>
          <td style="padding:10px 0;font-weight:600;text-align:right;color:#0c4a6e;">${opts.specialRequests}</td></tr>` : ''}
      <tr><td style="padding:14px 0 4px;color:#0c4a6e;font-weight:700;">Estimated Total</td>
          <td style="padding:14px 0 4px;font-weight:700;text-align:right;font-size:20px;color:#0284c7;">₱${opts.totalAmount.toLocaleString()}</td></tr>
    </table>
    <p style="font-size:12px;color:#94a3b8;margin:4px 0 20px;">*Final pricing confirmed upon booking approval.</p>
    <div style="background:#ecfdf5;border-radius:12px;padding:14px;border:1px solid #d1fae5;">
      <p style="margin:0;font-size:13px;color:#047857;">📍 <strong>Botolan, Zambales</strong> · ~3–4 hours from Manila via NLEX/SCTEX<br>
      🕑 Check-in: 2:00 PM &nbsp;·&nbsp; Check-out: 12:00 PM</p>
    </div>
  </div>
  <div style="background:#0c4a6e;padding:18px;border-radius:0 0 16px 16px;text-align:center;">
    <p style="color:#bae6fd;margin:0;font-size:13px;">Questions? Email us at <a href="mailto:${GMAIL_USER}" style="color:#7dd3fc;">${GMAIL_USER}</a></p>
  </div>
</div>
</body>
</html>`
}

function adminNotificationHtml(opts: {
  guestName: string; guestEmail: string; guestPhone: string; roomName: string
  checkIn: string; checkOut: string; nights: number; guests: number
  totalAmount: number; confirmationCode: string; specialRequests?: string
}) {
  const dashboardUrl = process.env.ADMIN_DASHBOARD_URL || '#'
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f8fafc;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:24px 32px;border-radius:16px 16px 0 0;">
    <h2 style="color:#fff;margin:0;font-size:20px;">🔔 New Booking from Website</h2>
    <p style="color:#ddd6fe;margin:4px 0 0;font-size:13px;">${RESORT_NAME} · source: website</p>
  </div>
  <div style="background:#fff;padding:28px;border:1px solid #e2e8f0;border-top:none;">
    <div style="margin-bottom:20px;">
      <p style="margin:0;font-size:20px;font-weight:700;color:#1e293b;">${opts.guestName}</p>
      <p style="margin:2px 0 0;font-size:14px;color:#64748b;">${opts.guestEmail}${opts.guestPhone ? ' · ' + opts.guestPhone : ''}</p>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;text-align:center;margin-bottom:20px;">
      <p style="margin:0;font-size:11px;color:#16a34a;font-weight:700;letter-spacing:1px;">CONFIRMATION CODE</p>
      <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#15803d;letter-spacing:3px;">${opts.confirmationCode}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr style="background:#f8fafc;"><td style="padding:10px 12px;color:#64748b;font-weight:600;">Villa</td>
          <td style="padding:10px 12px;color:#1e293b;font-weight:600;">${opts.roomName}</td></tr>
      <tr><td style="padding:10px 12px;color:#64748b;font-weight:600;">Check-in</td>
          <td style="padding:10px 12px;color:#1e293b;">${opts.checkIn}</td></tr>
      <tr style="background:#f8fafc;"><td style="padding:10px 12px;color:#64748b;font-weight:600;">Check-out</td>
          <td style="padding:10px 12px;color:#1e293b;">${opts.checkOut}</td></tr>
      <tr><td style="padding:10px 12px;color:#64748b;font-weight:600;">Duration</td>
          <td style="padding:10px 12px;color:#1e293b;">${opts.nights} night${opts.nights > 1 ? 's' : ''} · ${opts.guests} guest${opts.guests > 1 ? 's' : ''}</td></tr>
      ${opts.specialRequests ? `<tr style="background:#f8fafc;"><td style="padding:10px 12px;color:#64748b;font-weight:600;vertical-align:top;">Requests</td>
          <td style="padding:10px 12px;color:#1e293b;">${opts.specialRequests}</td></tr>` : ''}
      <tr style="background:#fefce8;"><td style="padding:12px;color:#854d0e;font-weight:700;font-size:15px;">Estimated Total</td>
          <td style="padding:12px;color:#854d0e;font-weight:700;font-size:18px;">₱${opts.totalAmount.toLocaleString()}</td></tr>
    </table>
    <div style="margin-top:20px;text-align:center;">
      <a href="${dashboardUrl}/admin/reservations" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View in Dashboard →</a>
    </div>
  </div>
  <div style="background:#1e293b;padding:16px;border-radius:0 0 16px 16px;text-align:center;">
    <p style="color:#94a3b8;margin:0;font-size:12px;">${RESORT_NAME} Admin Notification</p>
  </div>
</div>
</body>
</html>`
}

// ─── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { checkIn, checkOut, guests, roomId, name, firstName: fName, lastName: lName, email, phone, notes } = body

    // ── Validate ──
    if (!checkIn || !checkOut || !name || !email || !roomId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const nights = nightsBetween(checkIn, checkOut)
    if (nights <= 0) {
      return NextResponse.json({ error: 'Invalid dates' }, { status: 400 })
    }

    // ── Resolve room from DB using numeric ID ─────────────────────────────────
    // roomId is now a numeric DB id (e.g. "3"), not the old string key ('ground').
    const dbRoomId = parseInt(roomId)
    if (isNaN(dbRoomId)) {
      return NextResponse.json({ error: 'Invalid room selection' }, { status: 400 })
    }

    const roomRows = await sql`
      SELECT id, room_number, type, price_per_night, description, status
      FROM rooms
      WHERE id = ${dbRoomId}
      LIMIT 1
    `
    if (roomRows.length === 0) {
      return NextResponse.json({ error: 'Room not found' }, { status: 400 })
    }
    const room = roomRows[0]

    if (room.status === 'maintenance') {
      return NextResponse.json({ error: 'This room is currently under maintenance and cannot be booked.' }, { status: 400 })
    }

    // ── Double-check availability (server-side guard) ─────────────────────────
    const conflictRows = await sql`
      SELECT id FROM reservations
      WHERE room_id = ${dbRoomId}
        AND status NOT IN ('cancelled', 'checked_out')
        AND check_in  < ${checkOut}::timestamptz
        AND check_out > ${checkIn}::timestamptz
      LIMIT 1
    `
    if (conflictRows.length > 0) {
      return NextResponse.json(
        { error: 'Sorry, this room is no longer available for the selected dates. Please choose another room or different dates.' },
        { status: 409 }
      )
    }

    // ── Build display name & total ────────────────────────────────────────────
    const TYPE_LABEL: Record<string, string> = {
      standard: 'Standard Room', deluxe: 'Deluxe Room', suite: 'Suite',
      villa: 'Villa', cottage: 'Cottage',
    }
    const roomName    = `${TYPE_LABEL[room.type] ?? room.type} · Room ${room.room_number}`
    const pricePerNight = parseFloat(room.price_per_night)
    const totalAmount = nights * pricePerNight
    const confirmationCode = generateConfirmationCode()

    // ── Name ──────────────────────────────────────────────────────────────────
    const fullName  = name?.trim() || `${fName ?? ''} ${lName ?? ''}`.trim()
    const firstName = fName?.trim() || fullName.split(/\s+/)[0]
    const lastName  = lName?.trim() || fullName.split(/\s+/).slice(1).join(' ') || '-'

    // ── Upsert guest ──────────────────────────────────────────────────────────
    let guestId: number
    const existingGuest = await sql`SELECT id FROM guests WHERE email = ${email} LIMIT 1`
    if (existingGuest.length > 0) {
      guestId = existingGuest[0].id
      if (phone) {
        await sql`UPDATE guests SET phone = ${phone}, updated_at = NOW() WHERE id = ${guestId}`
      }
    } else {
      const newGuest = await sql`
        INSERT INTO guests (first_name, last_name, email, phone, created_at, updated_at)
        VALUES (${firstName}, ${lastName}, ${email}, ${phone || null}, NOW(), NOW())
        RETURNING id
      `
      guestId = newGuest[0].id
    }

    // ── Create reservation ────────────────────────────────────────────────────
    const newReservation = await sql`
      INSERT INTO reservations (
        confirmation_code, guest_id, room_id, status,
        check_in, check_out, adults, children,
        guest_name, total_amount, special_requests, source,
        created_at, updated_at
      ) VALUES (
        ${confirmationCode}, ${guestId}, ${dbRoomId}, 'pending',
        ${checkIn}, ${checkOut}, ${Math.max(1, guests)}, 0,
        ${fullName}, ${totalAmount.toFixed(2)}, ${notes || null}, 'website',
        NOW(), NOW()
      )
      RETURNING id
    `
    const reservationId = newReservation[0].id

    // ── Mark room as reserved ─────────────────────────────────────────────────
    await sql`
      UPDATE rooms SET status = 'reserved', updated_at = NOW() WHERE id = ${dbRoomId}
    `.catch(() => {})

    // ── Notify all admin/super_admin users ────────────────────────────────────
    try {
      const adminUsers = await sql`
        SELECT id FROM users WHERE role IN ('admin', 'super_admin') AND is_active = true
      `
      for (const adminUser of adminUsers) {
        await sql`
          INSERT INTO notifications (user_id, type, title, message, entity, entity_id, is_read, email_sent, created_at)
          VALUES (
            ${adminUser.id}, 'new_reservation',
            'New Booking from Website',
            ${`${fullName} booked ${roomName} — ${nights} night${nights > 1 ? 's' : ''} (${checkIn} → ${checkOut}). Code: ${confirmationCode}`},
            'reservation', ${reservationId}, false, false, NOW()
          )
        `
      }
    } catch (err) {
      console.error('[bookings] notification insert failed (non-fatal):', err)
    }

    // ── Activity log ──────────────────────────────────────────────────────────
    await sql`
      INSERT INTO activity_logs (type, entity, entity_id, description, created_at)
      VALUES (
        'create', 'reservation', ${reservationId},
        ${`Website booking ${confirmationCode} by ${fullName} — ${roomName}, ${nights} night${nights > 1 ? 's' : ''}.`},
        NOW()
      )
    `.catch(() => {})

    // ── Send emails (fire-and-forget) ─────────────────────────────────────────
    const checkInFmt  = formatDatePH(checkIn)
    const checkOutFmt = formatDatePH(checkOut)

    Promise.allSettled([
      sendEmail(
        email,
        `Booking Request · ${confirmationCode} — ${RESORT_NAME}`,
        guestConfirmationHtml({
          guestName: fullName, roomName,
          checkIn: checkInFmt, checkOut: checkOutFmt,
          nights, guests, totalAmount, confirmationCode,
          specialRequests: notes || undefined,
        })
      ),
      sendEmail(
        ADMIN_EMAIL,
        `🔔 New Booking: ${fullName} · ${roomName} · ${checkInFmt}`,
        adminNotificationHtml({
          guestName: fullName, guestEmail: email, guestPhone: phone || '',
          roomName, checkIn: checkInFmt, checkOut: checkOutFmt,
          nights, guests, totalAmount, confirmationCode,
          specialRequests: notes || undefined,
        })
      ),
    ])

    return NextResponse.json({ success: true, confirmationCode, reservationId })
  } catch (err) {
    console.error('[bookings] error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
