import nodemailer from 'nodemailer';
import type { Reservation, Payment } from '@/types';
import { formatCurrency, formatDate, calculateNights } from '@/lib/utils';

const RESORT_NAME = process.env.RESORT_NAME || 'Your Resort';
const RESORT_LOGO_URL = process.env.RESORT_LOGO_URL || '';
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';

function getTransporter() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

interface Attachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  attachments?: Attachment[];
}

export async function sendEmail({ to, subject, html, attachments }: SendEmailArgs): Promise<SendEmailResult> {
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`[email:dry-run] would send "${subject}" to ${to}${attachments?.length ? ` (+${attachments.length} attachment(s))` : ''}`);
    return { success: true, id: 'dry-run' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${RESORT_NAME}" <${GMAIL_USER}>`,
      to,
      subject,
      html,
      attachments: attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
    return { success: true, id: info.messageId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown email error' };
  }
}

/* ------------------------------------------------------------------ */
/*  Shared email chrome                                                */
/* ------------------------------------------------------------------ */

function emailShell(bodyHtml: string, previewText = ''): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#FDFDFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;font-size:1px;color:#FDFDFC;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${previewText}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FDFDFC;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #EDEEEA;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#6FA39A,#5C8B82);padding:28px 32px;">
              ${RESORT_LOGO_URL ? `<img src="${RESORT_LOGO_URL}" alt="${RESORT_NAME}" height="36" style="display:block;margin-bottom:8px;" />` : ''}
              <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:22px;font-weight:600;color:#ffffff;letter-spacing:-0.01em;">${RESORT_NAME}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #F4F5F2;background:#FAFAF8;">
              <p style="margin:0;font-size:12px;color:#B0B0A6;">This is an automated message from ${RESORT_NAME} Admin. Please do not reply directly to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;font-size:13px;color:#83837B;">${label}</td>
    <td style="padding:8px 0;font-size:13px;color:#2B2B28;font-weight:600;text-align:right;">${value}</td>
  </tr>`;
}

function ctaButton(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#6FA39A;color:#ffffff;text-decoration:none;font-size:13.5px;font-weight:600;padding:12px 24px;border-radius:8px;margin-top:8px;">${label}</a>`;
}

/* ------------------------------------------------------------------ */
/*  Guest-facing templates                                             */
/* ------------------------------------------------------------------ */

export function reservationConfirmationEmail(reservation: Reservation) {
  const guestName = `${reservation.guest?.firstName || ''} ${reservation.guest?.lastName || ''}`.trim();
  const nights = calculateNights(reservation.checkIn, reservation.checkOut);
  const body = `
    <h1 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:20px;color:#2B2B28;margin:0 0 6px;">Booking confirmed 🌴</h1>
    <p style="font-size:14px;color:#83837B;line-height:1.6;margin:0 0 20px;">Hi ${guestName || 'there'}, thank you for booking with us. Here are your reservation details:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #F4F5F2;">
      ${infoRow('Confirmation Code', reservation.confirmationCode)}
      ${infoRow('Room', `${reservation.room?.roomNumber || ''} (${reservation.room?.type || ''})`)}
      ${infoRow('Check-in', formatDate(reservation.checkIn))}
      ${infoRow('Check-out', formatDate(reservation.checkOut))}
      ${infoRow('Nights', `${nights}`)}
      ${infoRow('Guests', `${reservation.adults} adults${reservation.children ? `, ${reservation.children} children` : ''}`)}
      ${infoRow('Total Amount', formatCurrency(reservation.totalAmount))}
    </table>
    <p style="font-size:13px;color:#83837B;line-height:1.6;margin:20px 0 0;">Please keep your confirmation code handy at check-in. If you have any special requests, just reply to your booking confirmation or contact the front desk.</p>
  `;
  return {
    subject: `Your ${RESORT_NAME} booking is confirmed — ${reservation.confirmationCode}`,
    html: emailShell(body, `Your reservation ${reservation.confirmationCode} is confirmed.`),
  };
}

export function paymentReceivedEmail(payment: Payment) {
  const code = payment.reservation?.confirmationCode || '';
  const body = `
    <h1 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:20px;color:#2B2B28;margin:0 0 6px;">Payment received</h1>
    <p style="font-size:14px;color:#83837B;line-height:1.6;margin:0 0 20px;">We've received your payment details for booking <strong style="color:#2B2B28;">${code}</strong> and it's now being reviewed by our team.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #F4F5F2;">
      ${infoRow('Amount', formatCurrency(payment.amount))}
      ${infoRow('Method', payment.method.replace(/_/g, ' '))}
      ${infoRow('Reference #', payment.referenceNumber || '—')}
      ${infoRow('Status', 'Pending verification')}
    </table>
    <p style="font-size:13px;color:#83837B;line-height:1.6;margin:20px 0 0;">We'll email you again as soon as it's verified — usually within 24 hours.</p>
  `;
  return {
    subject: `We received your payment reference — ${code}`,
    html: emailShell(body, `Payment for ${code} is pending verification.`),
  };
}

export function paymentVerifiedEmail(payment: Payment) {
  const code = payment.reservation?.confirmationCode || '';
  const body = `
    <h1 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:20px;color:#2B2B28;margin:0 0 6px;">Payment verified ✓</h1>
    <p style="font-size:14px;color:#83837B;line-height:1.6;margin:0 0 20px;">Good news — your payment for booking <strong style="color:#2B2B28;">${code}</strong> has been verified. Your reservation is all set.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #F4F5F2;">
      ${infoRow('Amount Verified', formatCurrency(payment.amount))}
      ${infoRow('Method', payment.method.replace(/_/g, ' '))}
    </table>
    <p style="font-size:13px;color:#83837B;line-height:1.6;margin:20px 0 0;">We look forward to welcoming you. Safe travels!</p>
  `;
  return {
    subject: `Payment verified — see you soon at ${RESORT_NAME}!`,
    html: emailShell(body, `Payment for ${code} has been verified.`),
  };
}

export function paymentRejectedEmail(payment: Payment, reason?: string) {
  const code = payment.reservation?.confirmationCode || '';
  const body = `
    <h1 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:20px;color:#2B2B28;margin:0 0 6px;">Payment could not be verified</h1>
    <p style="font-size:14px;color:#83837B;line-height:1.6;margin:0 0 20px;">We were unable to verify your recent payment for booking <strong style="color:#2B2B28;">${code}</strong>.</p>
    ${reason ? `<p style="font-size:13px;color:#C97D6E;background:rgba(201,125,110,0.08);border:1px solid rgba(201,125,110,0.2);border-radius:8px;padding:10px 14px;margin:0 0 16px;">${reason}</p>` : ''}
    <p style="font-size:13px;color:#83837B;line-height:1.6;margin:0;">Please double-check your payment reference or reach out to our front desk so we can help resolve this quickly.</p>
  `;
  return {
    subject: `Action needed: payment issue for ${code}`,
    html: emailShell(body, `Payment for ${code} could not be verified.`),
  };
}

export function checkInReminderEmail(reservation: Reservation) {
  const guestName = `${reservation.guest?.firstName || ''}`.trim();
  const body = `
    <h1 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:20px;color:#2B2B28;margin:0 0 6px;">See you today! 🌊</h1>
    <p style="font-size:14px;color:#83837B;line-height:1.6;margin:0 0 20px;">Hi ${guestName || 'there'}, this is a friendly reminder that your check-in at ${RESORT_NAME} is today.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #F4F5F2;">
      ${infoRow('Confirmation Code', reservation.confirmationCode)}
      ${infoRow('Room', `${reservation.room?.roomNumber || ''} (${reservation.room?.type || ''})`)}
      ${infoRow('Check-in Date', formatDate(reservation.checkIn))}
    </table>
    <p style="font-size:13px;color:#83837B;line-height:1.6;margin:20px 0 0;">Standard check-in is from 2:00 PM. We can't wait to host you!</p>
  `;
  return {
    subject: `Reminder: your check-in at ${RESORT_NAME} is today`,
    html: emailShell(body, `Check-in reminder for ${reservation.confirmationCode}.`),
  };
}

/* ------------------------------------------------------------------ */
/*  Staff / admin-facing templates                                     */
/* ------------------------------------------------------------------ */

export function adminNewReservationEmail(reservation: Reservation, dashboardUrl = '') {
  const guestName = `${reservation.guest?.firstName || ''} ${reservation.guest?.lastName || ''}`.trim();
  const body = `
    <h1 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:20px;color:#2B2B28;margin:0 0 6px;">New reservation</h1>
    <p style="font-size:14px;color:#83837B;line-height:1.6;margin:0 0 20px;"><strong style="color:#2B2B28;">${guestName}</strong> just made a new booking (source: ${reservation.source || 'unknown'}).</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #F4F5F2;">
      ${infoRow('Confirmation Code', reservation.confirmationCode)}
      ${infoRow('Room', `${reservation.room?.roomNumber || ''} (${reservation.room?.type || ''})`)}
      ${infoRow('Check-in', formatDate(reservation.checkIn))}
      ${infoRow('Check-out', formatDate(reservation.checkOut))}
      ${infoRow('Total Amount', formatCurrency(reservation.totalAmount))}
    </table>
    ${dashboardUrl ? `<div style="margin-top:20px;">${ctaButton('View in Admin', dashboardUrl)}</div>` : ''}
  `;
  return {
    subject: `[Admin] New reservation from ${guestName}`,
    html: emailShell(body, `New reservation ${reservation.confirmationCode} from ${guestName}.`),
  };
}

export function adminPaymentPendingEmail(payment: Payment, dashboardUrl = '') {
  const code = payment.reservation?.confirmationCode || '';
  const body = `
    <h1 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:20px;color:#2B2B28;margin:0 0 6px;">Payment needs verification</h1>
    <p style="font-size:14px;color:#83837B;line-height:1.6;margin:0 0 20px;">A new payment was submitted for booking <strong style="color:#2B2B28;">${code}</strong> and is awaiting your review.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #F4F5F2;">
      ${infoRow('Amount', formatCurrency(payment.amount))}
      ${infoRow('Method', payment.method.replace(/_/g, ' '))}
      ${infoRow('Reference #', payment.referenceNumber || '—')}
    </table>
    ${dashboardUrl ? `<div style="margin-top:20px;">${ctaButton('Review Payment', dashboardUrl)}</div>` : ''}
  `;
  return {
    subject: `[Admin] Payment pending review — ${code}`,
    html: emailShell(body, `Payment for ${code} is pending review.`),
  };
}

export function testEmail(recipientLabel = 'Admin') {
  const body = `
    <h1 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:20px;color:#2B2B28;margin:0 0 6px;">Test email 🎉</h1>
    <p style="font-size:14px;color:#83837B;line-height:1.6;margin:0;">Hi ${recipientLabel}, if you're reading this, your ${RESORT_NAME} email notifications are configured correctly and ready to go.</p>
  `;
  return {
    subject: `${RESORT_NAME} — test email notification`,
    html: emailShell(body, 'This is a test email from your resort admin panel.'),
  };
}

export function checkOutReceiptEmail(reservation: Reservation, payments: Payment[]) {
  const guestName = `${reservation.guest?.firstName || ''} ${reservation.guest?.lastName || ''}`.trim();
  const nights = calculateNights(reservation.checkIn, reservation.checkOut);
  const totalAmount = parseFloat(String(reservation.totalAmount)) || 0;
  const verifiedPayments = payments.filter(p => p.reservationId === reservation.id && p.status === 'verified');
  const totalPaid = verifiedPayments.reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);
  const balance = totalAmount - totalPaid;

  const paymentRows = verifiedPayments.map(p =>
    infoRow(
      `${p.paymentType ? p.paymentType.replace(/_/g, ' ') : 'Payment'} (${p.method.replace(/_/g, ' ')})`,
      formatCurrency(p.amount)
    )
  ).join('');

  const body = `
    <h1 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:20px;color:#2B2B28;margin:0 0 6px;">Thank you for staying with us 🌴</h1>
    <p style="font-size:14px;color:#83837B;line-height:1.6;margin:0 0 20px;">Hi ${guestName || 'there'}, here is your official receipt for your stay at ${RESORT_NAME}.</p>

    <div style="background:#F7F8F5;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#B0B0A6;margin-bottom:10px;font-weight:600;">Stay Summary</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Confirmation Code', reservation.confirmationCode)}
        ${infoRow('Room', `${reservation.room?.roomNumber || ''} (${reservation.room?.type || ''})`)}
        ${infoRow('Check-in', formatDate(reservation.checkIn))}
        ${infoRow('Check-out', formatDate(reservation.checkOut))}
        ${infoRow('Nights', `${nights}`)}
        ${infoRow('Guests', `${reservation.adults} adults${reservation.children ? `, ${reservation.children} children` : ''}`)}
      </table>
    </div>

    <div style="background:#F7F8F5;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#B0B0A6;margin-bottom:10px;font-weight:600;">Payment Breakdown</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${paymentRows || infoRow('No payments recorded', '—')}
        <tr><td colspan="2" style="padding:6px 0;"><div style="border-top:1px solid #EDEEEA;"></div></td></tr>
        ${infoRow('Total Charge', formatCurrency(reservation.totalAmount))}
        ${infoRow('Total Paid', formatCurrency(String(totalPaid)))}
        ${balance > 0 ? infoRow('Outstanding Balance', formatCurrency(String(balance))) : ''}
      </table>
    </div>

    <p style="font-size:13px;color:#83837B;line-height:1.6;margin:0;">We hope you had a wonderful stay. We'd love to welcome you back soon!</p>
  `;

  return {
    subject: `Your ${RESORT_NAME} receipt — ${reservation.confirmationCode}`,
    html: emailShell(body, `Check-out receipt for ${reservation.confirmationCode}.`),
  };
}
