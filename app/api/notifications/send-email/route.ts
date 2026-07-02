import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import {
  reservationConfirmationEmail,
  paymentReceivedEmail,
  paymentVerifiedEmail,
  paymentRejectedEmail,
  checkInReminderEmail,
  checkOutReceiptEmail,
} from '@/lib/email';
import { generateReceiptBuffer } from '@/lib/generateReceipt';
import { db } from '@/lib/db';
import { emailLogs } from '@/lib/schema';
import type { Reservation, Payment } from '@/types';

async function logEmail({
  toEmail,
  subject,
  template,
  status,
  entity,
  entityId,
  errorMessage,
}: {
  toEmail: string;
  subject: string;
  template: string;
  status: 'sent' | 'failed' | 'pending';
  entity?: string;
  entityId?: number;
  errorMessage?: string;
}) {
  try {
    await db.insert(emailLogs).values({
      toEmail,
      subject,
      template,
      status,
      entity: entity ?? null,
      entityId: entityId ?? null,
      errorMessage: errorMessage ?? null,
    });
  } catch (err) {
    console.error('Failed to log email to DB:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, to, reservation, payment, payments } = body as {
      event: string;
      to: string;
      reservation?: Reservation;
      payment?: Payment;
      payments?: Payment[];
    };

    if (!to || !event) {
      return NextResponse.json({ error: 'event and to are required' }, { status: 400 });
    }

    let template: { subject: string; html: string } | null = null;
    let pdfAttachment: { buffer: Buffer; filename: string } | null = null;

    switch (event) {
      case 'new_reservation':
      case 'reservation_confirmed':
        if (reservation) template = reservationConfirmationEmail(reservation);
        break;
      case 'payment_pending':
        if (payment) template = paymentReceivedEmail(payment);
        break;
      case 'payment_verified':
        if (payment) {
          template = paymentVerifiedEmail(payment);
          // Attach PDF receipt for verified payment
          try {
            pdfAttachment = await generateReceiptBuffer(payment, payment.reservation ?? reservation);
          } catch (err) {
            console.error('Failed to generate receipt PDF for attachment:', err);
          }
        }
        break;
      case 'payment_rejected':
        if (payment) template = paymentRejectedEmail(payment);
        break;
      case 'check_in_today':
        if (reservation) template = checkInReminderEmail(reservation);
        break;
      case 'check_out':
        if (reservation) {
          template = checkOutReceiptEmail(reservation, payments ?? []);
          // Attach PDF receipt on checkout — use the most recent verified payment,
          // or create a synthetic one representing the full stay
          try {
            const verifiedPayments = (payments ?? []).filter(
              p => p.reservationId === reservation.id && p.status === 'verified'
            );
            if (verifiedPayments.length > 0) {
              // Use the last verified payment for the PDF; reservation gives the stay context
              const syntheticPayment: Payment = {
                ...verifiedPayments[verifiedPayments.length - 1],
                // Show total paid as amount
                amount: verifiedPayments.reduce((s, p) => s + parseFloat(String(p.amount)), 0) as unknown as string,
                status: 'verified',
              };
              pdfAttachment = await generateReceiptBuffer(syntheticPayment, reservation);
            } else {
              // No verified payment yet — still generate a receipt showing 0 paid
              const dummyPayment: Payment = {
                id: 0,
                reservationId: reservation.id,
                amount: '0' as unknown as string,
                method: 'cash',
                status: 'pending',
                paymentType: undefined,
                referenceNumber: undefined,
                proofUrl: undefined,
                verifiedBy: undefined,
                verifiedAt: undefined,
                notes: undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
                reservation,
              };
              pdfAttachment = await generateReceiptBuffer(dummyPayment, reservation);
            }
          } catch (err) {
            console.error('Failed to generate receipt PDF for checkout email:', err);
          }
        }
        break;
      default:
        break;
    }

    if (!template) {
      return NextResponse.json({ success: false, message: `No email template for event "${event}"` }, { status: 200 });
    }

    const entityId = reservation?.id ?? payment?.id;
    const entity = reservation ? 'reservation' : payment ? 'payment' : undefined;

    const result = await sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      attachments: pdfAttachment
        ? [{ filename: pdfAttachment.filename, content: pdfAttachment.buffer, contentType: 'application/pdf' }]
        : undefined,
    });

    // Log to DB regardless of success/failure
    await logEmail({
      toEmail: to,
      subject: template.subject,
      template: event,
      status: result.success ? 'sent' : 'failed',
      entity,
      entityId,
      errorMessage: result.success ? undefined : result.error,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 502 });
    }
    return NextResponse.json({ success: true, id: result.id, dryRun: result.id === 'dry-run' });
  } catch (error) {
    console.error('POST /api/notifications/send-email error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
