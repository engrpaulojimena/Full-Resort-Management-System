import { Payment, Reservation } from '@/types';
import { formatDate, formatDateTime, calculateNights } from './utils';

// ─── Safe currency: jsPDF Helvetica has no ₱ glyph → use "PHP" prefix ──────
function php(amount: string | number): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return 'PHP ' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Colour palette — matched to Kekamiya Beach Resort logo ─────────────────
type RGB = [number, number, number];
const NAVY:   RGB = [0,   40,  100];
const TEAL:   RGB = [0,   160, 160];
const GREEN:  RGB = [0,   110, 50];
const AMBER:  RGB = [220, 140, 0];
const CREAM:  RGB = [248, 251, 252];
const MID:    RGB = [100, 115, 130];
const DARK:   RGB = [20,  35,  55];
const WHITE:  RGB = [255, 255, 255];
const SILVER: RGB = [160, 170, 180];
const PURPLE: RGB = [110, 70,  190];
const RED:    RGB = [200, 55,  55];
const ORANGE: RGB = [230, 90,  0];

type Doc = InstanceType<typeof import('jspdf')['jsPDF']>;

const C = {
  text: (d: Doc, rgb: RGB) => d.setTextColor(...rgb),
  fill: (d: Doc, rgb: RGB) => d.setFillColor(...rgb),
  draw: (d: Doc, rgb: RGB) => d.setDrawColor(...rgb),
};

function box(d: Doc, x: number, y: number, w: number, h: number, fill: RGB) {
  C.fill(d, fill); d.rect(x, y, w, h, 'F');
}

function line(d: Doc, y: number, x1: number, x2: number, color: RGB = TEAL, lw = 0.35) {
  C.draw(d, color); d.setLineWidth(lw); d.line(x1, y, x2, y);
}

function label(d: Doc, y: number, text: string, x = 22) {
  d.setFontSize(7.5); d.setFont('helvetica', 'bold'); C.text(d, TEAL);
  d.text(text.toUpperCase(), x, y);
}

function kv(d: Doc, y: number, key: string, val: string, bold = false, vc: RGB = DARK) {
  d.setFontSize(8.8); d.setFont('helvetica', 'normal'); C.text(d, MID);
  d.text(key, 24, y);
  d.setFont('helvetica', bold ? 'bold' : 'normal'); C.text(d, vc);
  d.text(val, 112, y);
  return y + 6.2;
}

function pill(d: Doc, text: string, x: number, y: number, color: RGB) {
  const W = 34, H = 8;
  C.fill(d, color); C.draw(d, color);
  d.roundedRect(x, y, W, H, 2, 2, 'F');
  d.setFontSize(6.5); d.setFont('helvetica', 'bold'); C.text(d, WHITE);
  d.text(text, x + W / 2, y + 5.5, { align: 'center' });
}

function stampPaid(d: Doc, cx: number, cy: number) {
  C.draw(d, GREEN); d.setLineWidth(1.8);
  d.roundedRect(cx - 24, cy - 8, 48, 16, 3, 3);
  d.setFontSize(18); d.setFont('helvetica', 'bold'); C.text(d, GREEN);
  d.text('PAID', cx, cy + 6, { align: 'center' });
}

async function loadLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch('/icon.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── Shared receipt drawing logic ────────────────────────────────────────────
interface DrawOptions {
  payment: Payment;
  reservation?: Reservation;
  /** All verified payments for this reservation (used to compute running totals) */
  siblingPayments?: Payment[];
  logoB64?: string | null;
}

function drawReceipt(doc: Doc, opts: DrawOptions): void {
  const { payment, reservation, siblingPayments = [], logoB64 } = opts;

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const LM = 18, RM = W - 18;

  const resort = process.env.NEXT_PUBLIC_RESORT_NAME || process.env.RESORT_NAME || 'Kekamiya Beach Resort';

  const nights     = reservation ? calculateNights(reservation.checkIn, reservation.checkOut) : 0;
  const thisPaid   = parseFloat(String(payment.amount));
  const total      = reservation ? parseFloat(String(reservation.totalAmount)) : thisPaid;
  const isVerified = payment.status === 'verified';

  // All verified payments for this reservation EXCLUDING this payment (previous ones)
  const prevPayments = siblingPayments.filter(
    p => p.id !== payment.id && p.status === 'verified'
  );
  const prevPaid    = prevPayments.reduce((s, p) => s + parseFloat(String(p.amount)), 0);
  const totalPaid   = prevPaid + (isVerified ? thisPaid : 0);
  const balance     = total - totalPaid;

  // ── A. Full-bleed dark header (68mm) ──────────────────────────────────────
  box(doc, 0, 0, W, 68, NAVY);
  box(doc, 0, 0, W, 2, TEAL);

  if (logoB64) {
    try { doc.addImage(logoB64, 'PNG', LM, 10, 20, 20); } catch { /* skip */ }
  }

  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); C.text(doc, WHITE);
  doc.text(resort, W / 2 + 6, 22, { align: 'center' });

  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); C.text(doc, TEAL);
  doc.text('O F F I C I A L   P A Y M E N T   R E C E I P T', W / 2 + 6, 30, { align: 'center' });

  line(doc, 35, LM + 18, RM - 2, TEAL, 0.25);

  doc.setFontSize(7.2); C.text(doc, SILVER);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt No.  ${String(payment.id).padStart(6, '0')}`, LM, 48);
  doc.text(`Issued  ${formatDateTime(new Date())}`, LM, 55);

  const statusText  = (payment.status || 'pending').toUpperCase();
  const statusColor: RGB =
    payment.status === 'verified' ? GREEN :
    payment.status === 'refunded' ? PURPLE :
    payment.status === 'rejected' ? RED : AMBER;
  pill(doc, statusText, RM - 34, 46, statusColor);

  box(doc, 0, 66, W, 2, TEAL);

  const dmX = W / 2, dmY = 68;
  box(doc, dmX - 8,   dmY - 1.2, 2.4, 2.4, TEAL);
  box(doc, dmX - 1.2, dmY - 1.2, 2.4, 2.4, AMBER);
  box(doc, dmX + 5.6, dmY - 1.2, 2.4, 2.4, TEAL);

  // ── B. Payment details ────────────────────────────────────────────────────
  let y = 80;

  label(doc, y, 'Payment Details');
  y += 6;

  y = kv(doc, y, 'Payment ID',    `#${payment.id}`);
  y = kv(doc, y, 'Reference No.', payment.referenceNumber || '—');
  y = kv(doc, y, 'Method',
    (payment.method || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
  y = kv(doc, y, 'Type',
    (payment.paymentType || 'full').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
  if (payment.verifiedAt)
    y = kv(doc, y, 'Verified At', formatDateTime(payment.verifiedAt));
  if (payment.notes)
    y = kv(doc, y, 'Notes', payment.notes);

  y += 4;
  line(doc, y, LM, RM);
  box(doc, W / 2 - 1.2, y - 1.2, 2.4, 2.4, TEAL);
  y += 8;

  // ── C. Reservation details ────────────────────────────────────────────────
  if (reservation) {
    label(doc, y, 'Reservation Details');
    y += 6;

    y = kv(doc, y, 'Confirmation Code', reservation.confirmationCode, true);

    if (reservation.guest) {
      const name = `${reservation.guest.firstName} ${reservation.guest.lastName}`;
      y = kv(doc, y, 'Guest', name, true);
      if (reservation.guest.email) y = kv(doc, y, 'Email', reservation.guest.email);
      if (reservation.guest.phone) y = kv(doc, y, 'Phone', reservation.guest.phone);
    }

    if (reservation.room) {
      const roomLabel = `Room ${reservation.room.roomNumber}  ·  ${reservation.room.type.charAt(0).toUpperCase() + reservation.room.type.slice(1)}`;
      y = kv(doc, y, 'Accommodation', roomLabel);
      y = kv(doc, y, 'Rate / Night', php(reservation.room.pricePerNight));
    }

    y = kv(doc, y, 'Check-in',  formatDate(reservation.checkIn));
    y = kv(doc, y, 'Check-out', formatDate(reservation.checkOut));
    y = kv(doc, y, 'Duration',  `${nights} night${nights !== 1 ? 's' : ''}`);

    if (reservation.adults) {
      const g = `${reservation.adults} adult${reservation.adults !== 1 ? 's' : ''}` +
        (reservation.children ? ` + ${reservation.children} child${reservation.children !== 1 ? 'ren' : ''}` : '');
      y = kv(doc, y, 'Guests', g);
    }

    y += 4;
    line(doc, y, LM, RM);
    box(doc, W / 2 - 1.2, y - 1.2, 2.4, 2.4, AMBER);
    y += 8;
  }

  // ── D. Payment History (previous payments for this reservation) ───────────
  if (prevPayments.length > 0) {
    label(doc, y, 'Payment History');
    y += 6;

    for (const p of prevPayments) {
      const date = p.verifiedAt ? formatDate(new Date(p.verifiedAt)) : (p.createdAt ? formatDate(new Date(p.createdAt)) : '—');
      const typeLabel = (p.paymentType || 'payment').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      doc.setFontSize(8.2); doc.setFont('helvetica', 'normal'); C.text(doc, MID);
      doc.text(`#${p.id}  ·  ${typeLabel}  ·  ${date}`, 24, y);
      doc.setFont('helvetica', 'normal'); C.text(doc, DARK);
      doc.text(php(p.amount), RM - 4, y, { align: 'right' });
      y += 5.8;
    }

    // Subtotal of previous payments
    y += 1;
    line(doc, y, LM + 4, RM - 4, SILVER, 0.2);
    y += 5;
    doc.setFontSize(8.2); doc.setFont('helvetica', 'normal'); C.text(doc, MID);
    doc.text('Previous Payments Subtotal', 24, y);
    doc.setFont('helvetica', 'bold'); C.text(doc, DARK);
    doc.text(php(prevPaid), RM - 4, y, { align: 'right' });
    y += 8;

    line(doc, y, LM, RM);
    box(doc, W / 2 - 1.2, y - 1.2, 2.4, 2.4, TEAL);
    y += 8;
  }

  // ── E. Payment Summary box ────────────────────────────────────────────────
  label(doc, y, 'Payment Summary');
  y += 5;

  // Rows: Total Reservation, Previous Paid (if any), This Payment, Remaining Balance (if any)
  const summaryRows = 2 + (prevPayments.length > 0 ? 1 : 0) + (balance !== 0 ? 1 : 0);
  const rowH  = 8;
  const boxH  = summaryRows * rowH + 28;
  const boxY  = y;

  box(doc, LM, boxY, W - 36, boxH, CREAM);
  C.draw(doc, TEAL as RGB); doc.setLineWidth(0.3);
  doc.rect(LM, boxY, W - 36, boxH);
  box(doc, LM, boxY, 2.5, boxH, NAVY);

  y = boxY + 8;

  // Total Reservation
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); C.text(doc, MID);
  doc.text('Total Reservation', LM + 8, y);
  doc.setFont('helvetica', 'normal'); C.text(doc, DARK);
  doc.text(php(total), RM - 4, y, { align: 'right' });
  y += rowH;

  // Previous payments subtotal (only if there are any)
  if (prevPayments.length > 0) {
    doc.setFont('helvetica', 'normal'); C.text(doc, MID);
    doc.text('Previously Paid', LM + 8, y);
    doc.setFont('helvetica', 'normal'); C.text(doc, DARK);
    doc.text(`− ${php(prevPaid)}`, RM - 4, y, { align: 'right' });
    y += rowH;
  }

  // This payment
  doc.setFont('helvetica', 'normal'); C.text(doc, MID);
  doc.text('This Payment', LM + 8, y);
  doc.setFont('helvetica', 'bold'); C.text(doc, isVerified ? GREEN : DARK);
  doc.text(php(thisPaid), RM - 4, y, { align: 'right' });
  y += rowH;

  // Remaining balance
  if (balance !== 0) {
    const balLabel = balance > 0 ? 'Remaining Balance' : 'Overpayment';
    const balColor: RGB = balance > 0 ? AMBER : ORANGE;
    doc.setFont('helvetica', 'normal'); C.text(doc, MID);
    doc.text(balLabel, LM + 8, y);
    doc.setFont('helvetica', 'bold'); C.text(doc, balColor);
    doc.text(php(Math.abs(balance)), RM - 4, y, { align: 'right' });
    y += rowH;
  }

  y += 2;
  line(doc, y, LM + 4, RM - 4, TEAL, 0.3);
  y += 7;

  // Big amount
  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); C.text(doc, NAVY);
  doc.text(php(thisPaid), RM - 4, y, { align: 'right' });

  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); C.text(doc, TEAL);
  doc.text('AMOUNT PAID THIS RECEIPT', LM + 8, y);

  if (isVerified && balance <= 0) {
    stampPaid(doc, LM + 60, y - 5);
  }

  y = boxY + boxH + 12;

  // ── F. Double rule ornament ───────────────────────────────────────────────
  line(doc, y,     LM, RM, NAVY, 0.8);
  line(doc, y + 2, LM, RM, TEAL, 0.2);
  y += 14;

  // ── G. Fine print / thank-you ─────────────────────────────────────────────
  doc.setFontSize(8.5); doc.setFont('helvetica', 'italic'); C.text(doc, DARK);
  doc.text(`Thank you for choosing ${resort}.`, W / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); C.text(doc, MID);
  doc.text('This is an official receipt. Please retain a copy for your records.', W / 2, y, { align: 'center' });

  // ── H. Footer ─────────────────────────────────────────────────────────────
  const FY = H - 22;
  box(doc, 0, FY, W, H - FY, NAVY);
  box(doc, 0, FY, W, 1.2, TEAL);

  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); C.text(doc, SILVER);
  doc.text(`Generated on ${formatDateTime(new Date())}   ·   ${resort}`, W / 2, FY + 9, { align: 'center' });
  doc.text('For inquiries, please present this receipt together with your booking confirmation.', W / 2, FY + 15, { align: 'center' });
}

// ════════════════════════════════════════════════════════════════════════════
/**
 * Browser: downloads the PDF.
 * Pass siblingPayments = all payments for the same reservation so the
 * receipt can show correct "previously paid" and remaining balance.
 */
export async function generateReceiptPDF(
  payment: Payment,
  reservation?: Reservation,
  siblingPayments: Payment[] = [],
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logoB64 = await loadLogoBase64();

  drawReceipt(doc, { payment, reservation, siblingPayments, logoB64 });

  const code = reservation?.confirmationCode || `PAY${payment.id}`;
  doc.save(`receipt-${code}-${payment.id}.pdf`);
}

/**
 * Server-side: returns a Buffer (for email attachments).
 * Pass siblingPayments = all payments for the same reservation.
 */
export async function generateReceiptBuffer(
  payment: Payment,
  reservation?: Reservation,
  siblingPayments: Payment[] = [],
): Promise<{ buffer: Buffer; filename: string }> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  drawReceipt(doc, { payment, reservation, siblingPayments });

  const code = reservation?.confirmationCode || `PAY${payment.id}`;
  const arrayBuffer = doc.output('arraybuffer');
  return {
    buffer: Buffer.from(arrayBuffer),
    filename: `receipt-${code}-${payment.id}.pdf`,
  };
}