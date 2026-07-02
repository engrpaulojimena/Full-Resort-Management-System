import { Payment, Reservation } from '@/types';
import { formatDate, formatDateTime, calculateNights } from './utils';

// ─── Safe currency: jsPDF Helvetica has no ₱ glyph → use "PHP" prefix ──────
function php(amount: string | number): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return 'PHP ' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Colour palette ──────────────────────────────────────────────────────────
type RGB = [number, number, number];
const DEEP:    RGB = [22,  32,  44];   // near-black (header/footer bg)
const GOLD:    RGB = [178, 140, 80];   // warm gold accent
const GOLD2:   RGB = [210, 175, 110];  // lighter gold (text on dark)
const CREAM:   RGB = [250, 247, 242];  // warm off-white section bg
const MID:     RGB = [115, 122, 132];  // muted label
const DARK:    RGB = [32,  40,  50];   // body text
const WHITE:   RGB = [255, 255, 255];
const GREEN:   RGB = [72,  158, 100];  // verified
const AMBER:   RGB = [195, 125, 50];   // pending / balance
const PURPLE:  RGB = [138, 98,  200];  // refunded
const RED:     RGB = [200, 72,  65];   // rejected
const SILVER:  RGB = [165, 168, 172];  // fine print

// ─── jsPDF type shorthand ────────────────────────────────────────────────────
type Doc = InstanceType<typeof import('jspdf')['jsPDF']>;

const C = {
  text: (d: Doc, rgb: RGB) => d.setTextColor(...rgb),
  fill: (d: Doc, rgb: RGB) => d.setFillColor(...rgb),
  draw: (d: Doc, rgb: RGB) => d.setDrawColor(...rgb),
};

function box(d: Doc, x: number, y: number, w: number, h: number, fill: RGB) {
  C.fill(d, fill); d.rect(x, y, w, h, 'F');
}

function line(d: Doc, y: number, x1: number, x2: number, color: RGB = GOLD, lw = 0.35) {
  C.draw(d, color); d.setLineWidth(lw); d.line(x1, y, x2, y);
}

function diamonds(d: Doc, y: number, cx: number) {
  // Three small diamond decorations around a centre point
  const s = 1.4;
  C.fill(d, GOLD);
  [[cx - 7, y], [cx, y], [cx + 7, y]].forEach(([dx, dy]) => {
    d.rect(dx - s / 2, dy - s / 2, s, s, 'F'); // jsPDF doesn't rotate natively, use square as diamond proxy
  });
}

function label(d: Doc, y: number, text: string, x = 22) {
  d.setFontSize(7.5); d.setFont('helvetica', 'bold'); C.text(d, GOLD);
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

// ─── "PAID" watermark stamp in the summary area ──────────────────────────────
function stampPaid(d: Doc, cx: number, cy: number) {
  C.draw(d, GREEN); d.setLineWidth(1.8);
  d.roundedRect(cx - 24, cy - 8, 48, 16, 3, 3);
  d.setFontSize(18); d.setFont('helvetica', 'bold'); C.text(d, GREEN);
  d.text('PAID', cx, cy + 6, { align: 'center' });
}

// ════════════════════════════════════════════════════════════════════════════
export async function generateReceiptPDF(payment: Payment, reservation?: Reservation): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const resort = process.env.NEXT_PUBLIC_RESORT_NAME || process.env.RESORT_NAME || 'The Resort';
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const LM = 18, RM = W - 18; // left / right margin

  const nights   = reservation ? calculateNights(reservation.checkIn, reservation.checkOut) : 0;
  const paid     = parseFloat(String(payment.amount));
  const total    = reservation ? parseFloat(String(reservation.totalAmount)) : paid;
  const balance  = total - paid;
  const isVerified = payment.status === 'verified';

  // ── A. Full-bleed dark header (64mm) ────────────────────────────────────
  box(doc, 0, 0, W, 64, DEEP);

  // Top gold rule (2 px)
  box(doc, 0, 0, W, 1.8, GOLD);

  // Thin inner rule below top stripe
  line(doc, 4, LM, RM, GOLD2, 0.2);

  // Resort name — large centred
  doc.setFontSize(26); doc.setFont('helvetica', 'bold'); C.text(doc, WHITE);
  doc.text(resort, W / 2, 26, { align: 'center' });

  // Subtitle letter-spaced
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); C.text(doc, GOLD2);
  doc.text('O F F I C I A L   P A Y M E N T   R E C E I P T', W / 2, 34, { align: 'center' });

  // Thin gold rule under subtitle
  line(doc, 38, LM + 20, RM - 20, GOLD2, 0.25);

  // Receipt # and date — bottom-left of header
  doc.setFontSize(7.2); C.text(doc, SILVER);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt No.  ${String(payment.id).padStart(6, '0')}`, LM, 48);
  doc.text(`Issued  ${formatDateTime(new Date())}`, LM, 54);

  // Status pill — bottom-right of header
  const statusText  = (payment.status || 'pending').toUpperCase();
  const statusColor: RGB =
    payment.status === 'verified' ? GREEN :
    payment.status === 'refunded' ? PURPLE :
    payment.status === 'rejected' ? RED : AMBER;
  pill(doc, statusText, RM - 34, 45, statusColor);

  // Bottom gold rule of header
  box(doc, 62, 0, W, 2, GOLD);

  // ── B. Three-diamond ornament on header edge ─────────────────────────────
  // (drawn as small tilted squares — a jsPDF-compatible approximation)
  const dmX = W / 2, dmY = 64;
  box(doc, dmX - 8,  dmY - 1.2, 2.4, 2.4, GOLD);
  box(doc, dmX - 1.2, dmY - 1.2, 2.4, 2.4, GOLD);
  box(doc, dmX + 5.6, dmY - 1.2, 2.4, 2.4, GOLD);

  // ── C. Payment details section ───────────────────────────────────────────
  let y = 74;

  label(doc, y, 'Payment Details');
  y += 6;

  y = kv(doc, y, 'Payment ID',     `#${payment.id}`);
  y = kv(doc, y, 'Reference No.',  payment.referenceNumber || '—');
  y = kv(doc, y, 'Method',
    (payment.method || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
  y = kv(doc, y, 'Type',
    (payment.paymentType || 'full').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
  if (payment.verifiedAt)
    y = kv(doc, y, 'Verified At', formatDateTime(payment.verifiedAt));
  if (payment.notes)
    y = kv(doc, y, 'Notes', payment.notes);

  // Ornamental divider
  y += 4;
  line(doc, y, LM, RM);
  box(doc, W / 2 - 1.2, y - 1.2, 2.4, 2.4, GOLD);
  y += 8;

  // ── D. Reservation details ───────────────────────────────────────────────
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

    // Ornamental divider
    y += 4;
    line(doc, y, LM, RM);
    box(doc, W / 2 - 1.2, y - 1.2, 2.4, 2.4, GOLD);
    y += 8;
  }

  // ── E. Payment summary box ───────────────────────────────────────────────
  label(doc, y, 'Payment Summary');
  y += 5;

  const rowH  = 8;
  const rows  = 2 + (balance !== 0 ? 1 : 0);
  const boxH  = rows * rowH + 28; // rows + padding + big amount row
  const boxY  = y;

  // Cream background + border
  box(doc, LM, boxY, W - 36, boxH, CREAM);
  C.draw(doc, [215, 208, 195] as RGB); doc.setLineWidth(0.3);
  doc.rect(LM, boxY, W - 36, boxH);

  // Left gold accent bar
  box(doc, LM, boxY, 2.5, boxH, GOLD);

  y = boxY + 8;

  // Row: total bill
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); C.text(doc, MID);
  doc.text('Total Reservation', LM + 8, y);
  doc.setFont('helvetica', 'normal'); C.text(doc, DARK);
  doc.text(php(total), RM - 4, y, { align: 'right' });
  y += rowH;

  // Row: amount paid
  doc.setFont('helvetica', 'normal'); C.text(doc, MID);
  doc.text('Amount Paid', LM + 8, y);
  doc.setFont('helvetica', 'bold'); C.text(doc, isVerified ? GREEN : DARK);
  doc.text(php(paid), RM - 4, y, { align: 'right' });
  y += rowH;

  // Row: balance / overpayment (optional)
  if (balance !== 0) {
    const balLabel = balance > 0 ? 'Remaining Balance' : 'Overpayment';
    const balColor: RGB = balance > 0 ? AMBER : [55, 115, 200];
    doc.setFont('helvetica', 'normal'); C.text(doc, MID);
    doc.text(balLabel, LM + 8, y);
    doc.setFont('helvetica', 'bold'); C.text(doc, balColor);
    doc.text(php(Math.abs(balance)), RM - 4, y, { align: 'right' });
    y += rowH;
  }

  // Thin gold rule before the hero amount
  y += 2;
  line(doc, y, LM + 4, RM - 4, GOLD, 0.3);
  y += 7;

  // Hero amount (large)
  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); C.text(doc, DEEP);
  doc.text(php(paid), RM - 4, y, { align: 'right' });

  // "AMOUNT PAID" micro-label
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); C.text(doc, GOLD);
  doc.text('AMOUNT PAID', LM + 8, y);

  // PAID stamp — only when verified
  if (isVerified) {
    stampPaid(doc, LM + 54, y - 5);
  }

  y = boxY + boxH + 12;

  // ── F. Double gold rule ornament ─────────────────────────────────────────
  line(doc, y,     LM, RM, GOLD, 0.8);
  line(doc, y + 2, LM, RM, GOLD, 0.2);
  y += 14;

  // ── G. Fine print / thank-you ────────────────────────────────────────────
  doc.setFontSize(8.5); doc.setFont('helvetica', 'italic'); C.text(doc, DARK);
  doc.text(`Thank you for choosing ${resort}.`, W / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); C.text(doc, MID);
  doc.text('This is an official receipt. Please retain a copy for your records.', W / 2, y, { align: 'center' });

  // ── H. Footer ────────────────────────────────────────────────────────────
  const FY = H - 22;
  box(doc, 0, FY, W, H - FY, DEEP);
  box(doc, 0, FY, W, 0.8, GOLD);

  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); C.text(doc, SILVER);
  doc.text(`Generated on ${formatDateTime(new Date())}   ·   ${resort}`, W / 2, FY + 9, { align: 'center' });
  doc.text('For inquiries, please present this receipt together with your booking confirmation.', W / 2, FY + 15, { align: 'center' });

  // ── I. Save ──────────────────────────────────────────────────────────────
  const code = reservation?.confirmationCode || `PAY${payment.id}`;
  doc.save(`receipt-${code}-${payment.id}.pdf`);
}

/**
 * Server-side version: returns the PDF as a Buffer (for email attachments).
 * Does NOT trigger a browser download.
 */
export async function generateReceiptBuffer(payment: Payment, reservation?: Reservation): Promise<{ buffer: Buffer; filename: string }> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const resort = process.env.NEXT_PUBLIC_RESORT_NAME || process.env.RESORT_NAME || 'The Resort';
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const LM = 18, RM = W - 18;

  const nights   = reservation ? calculateNights(reservation.checkIn, reservation.checkOut) : 0;
  const paid     = parseFloat(String(payment.amount));
  const total    = reservation ? parseFloat(String(reservation.totalAmount)) : paid;
  const balance  = total - paid;
  const isVerified = payment.status === 'verified';

  // ── A. Full-bleed dark header (64mm)
  box(doc, 0, 0, W, 64, DEEP);
  box(doc, 0, 0, W, 1.8, GOLD);
  line(doc, 4, LM, RM, GOLD2, 0.2);
  doc.setFontSize(26); doc.setFont('helvetica', 'bold'); C.text(doc, WHITE);
  doc.text(resort, W / 2, 26, { align: 'center' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); C.text(doc, GOLD2);
  doc.text('O F F I C I A L   P A Y M E N T   R E C E I P T', W / 2, 34, { align: 'center' });
  line(doc, 38, LM + 20, RM - 20, GOLD2, 0.25);
  doc.setFontSize(7.2); C.text(doc, SILVER);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt No.  ${String(payment.id).padStart(6, '0')}`, LM, 48);
  doc.text(`Issued  ${formatDateTime(new Date())}`, LM, 54);
  const statusText  = (payment.status || 'pending').toUpperCase();
  const statusColor: RGB =
    payment.status === 'verified' ? GREEN :
    payment.status === 'refunded' ? PURPLE :
    payment.status === 'rejected' ? RED : AMBER;
  pill(doc, statusText, RM - 34, 45, statusColor);
  line(doc, 64, 0, W, GOLD, 1.2);

  let y = 78;

  // ── B. Guest & reservation info
  if (reservation?.guest) {
    label(doc, y, 'Guest');
    y += 5;
    const g = reservation.guest;
    y = kv(doc, y, 'Name', `${g.firstName || ''} ${g.lastName || ''}`.trim(), true);
    if (g.email) y = kv(doc, y, 'Email', g.email);
    if (g.phone) y = kv(doc, y, 'Phone', g.phone);
    y += 4;
    line(doc, y, LM, RM);
    box(doc, W / 2 - 1.2, y - 1.2, 2.4, 2.4, GOLD);
    y += 8;
  }

  // ── C. Reservation details
  if (reservation) {
    label(doc, y, 'Reservation');
    y += 5;
    y = kv(doc, y, 'Confirmation Code', reservation.confirmationCode, true, GOLD);
    if (reservation.room) {
      y = kv(doc, y, 'Room', `${reservation.room.roomNumber} — ${reservation.room.type}`);
    }
    y = kv(doc, y, 'Check-in', formatDate(reservation.checkIn));
    y = kv(doc, y, 'Check-out', formatDate(reservation.checkOut));
    y = kv(doc, y, 'Nights', `${nights}`);
    if (reservation.adults) {
      const g = `${reservation.adults} adult${reservation.adults !== 1 ? 's' : ''}` +
        (reservation.children ? ` + ${reservation.children} child${reservation.children !== 1 ? 'ren' : ''}` : '');
      y = kv(doc, y, 'Guests', g);
    }
    y += 4;
    line(doc, y, LM, RM);
    box(doc, W / 2 - 1.2, y - 1.2, 2.4, 2.4, GOLD);
    y += 8;
  }

  // ── D. Payment details
  label(doc, y, 'Payment Details');
  y += 5;
  y = kv(doc, y, 'Payment Method', payment.method?.replace(/_/g, ' ') || '—');
  if (payment.paymentType) y = kv(doc, y, 'Payment Type', payment.paymentType.replace(/_/g, ' '));
  if (payment.referenceNumber) y = kv(doc, y, 'Reference #', payment.referenceNumber);
  if (payment.verifiedAt) y = kv(doc, y, 'Verified At', formatDateTime(new Date(payment.verifiedAt)));
  y += 4;
  line(doc, y, LM, RM);
  box(doc, W / 2 - 1.2, y - 1.2, 2.4, 2.4, GOLD);
  y += 8;

  // ── E. Payment summary box
  label(doc, y, 'Payment Summary');
  y += 5;
  const rowH = 8;
  const rows = 2 + (balance !== 0 ? 1 : 0);
  const boxH = rows * rowH + 28;
  const boxY = y;
  box(doc, LM, boxY, W - 36, boxH, CREAM);
  C.draw(doc, [215, 208, 195] as RGB); doc.setLineWidth(0.3);
  doc.rect(LM, boxY, W - 36, boxH);
  box(doc, LM, boxY, 2.5, boxH, GOLD);
  y = boxY + 8;
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); C.text(doc, MID);
  doc.text('Total Reservation', LM + 8, y);
  doc.setFont('helvetica', 'normal'); C.text(doc, DARK);
  doc.text(php(total), RM - 4, y, { align: 'right' });
  y += rowH;
  doc.setFont('helvetica', 'normal'); C.text(doc, MID);
  doc.text('Amount Paid', LM + 8, y);
  doc.setFont('helvetica', 'bold'); C.text(doc, isVerified ? GREEN : DARK);
  doc.text(php(paid), RM - 4, y, { align: 'right' });
  y += rowH;
  if (balance !== 0) {
    const balLabel = balance > 0 ? 'Remaining Balance' : 'Overpayment';
    const balColor: RGB = balance > 0 ? AMBER : [55, 115, 200];
    doc.setFont('helvetica', 'normal'); C.text(doc, MID);
    doc.text(balLabel, LM + 8, y);
    doc.setFont('helvetica', 'bold'); C.text(doc, balColor);
    doc.text(php(Math.abs(balance)), RM - 4, y, { align: 'right' });
    y += rowH;
  }
  y += 2;
  line(doc, y, LM + 4, RM - 4, GOLD, 0.3);
  y += 7;
  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); C.text(doc, DEEP);
  doc.text(php(paid), RM - 4, y, { align: 'right' });
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); C.text(doc, GOLD);
  doc.text('AMOUNT PAID', LM + 8, y);
  if (isVerified) {
    stampPaid(doc, LM + 54, y - 5);
  }
  y = boxY + boxH + 12;

  // ── F. Double gold rule ornament
  line(doc, y,     LM, RM, GOLD, 0.8);
  line(doc, y + 2, LM, RM, GOLD, 0.2);
  y += 14;

  // ── G. Fine print / thank-you
  doc.setFontSize(8.5); doc.setFont('helvetica', 'italic'); C.text(doc, DARK);
  doc.text(`Thank you for choosing ${resort}.`, W / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); C.text(doc, MID);
  doc.text('This is an official receipt. Please retain a copy for your records.', W / 2, y, { align: 'center' });

  // ── H. Footer
  const FY = H - 22;
  box(doc, 0, FY, W, H - FY, DEEP);
  box(doc, 0, FY, W, 0.8, GOLD);
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); C.text(doc, SILVER);
  doc.text(`Generated on ${formatDateTime(new Date())}   ·   ${resort}`, W / 2, FY + 9, { align: 'center' });
  doc.text('For inquiries, please present this receipt together with your booking confirmation.', W / 2, FY + 15, { align: 'center' });

  // ── Output as Buffer (server-side, no browser download)
  const code = reservation?.confirmationCode || `PAY${payment.id}`;
  const arrayBuffer = doc.output('arraybuffer');
  return {
    buffer: Buffer.from(arrayBuffer),
    filename: `receipt-${code}-${payment.id}.pdf`,
  };
}