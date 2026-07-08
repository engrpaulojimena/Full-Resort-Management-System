import { Payment, Reservation } from '@/types';
import { formatDate, formatDateTime, calculateNights } from './utils';

// ─── Safe currency: jsPDF Helvetica has no ₱ glyph → use "PHP" prefix ──────
function php(amount: string | number): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return 'PHP ' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Colour palette — matched to Kekamiya Beach Resort logo ─────────────────
type RGB = [number, number, number];
const NAVY:   RGB = [0,   40,  100];  // deep navy (primary header bg)
const TEAL:   RGB = [0,   160, 160];  // ocean teal accent
const GREEN:  RGB = [0,   110, 50];   // forest green (verified)
const AMBER:  RGB = [220, 140, 0];    // warm yellow-orange (balance/pending)
const ORANGE: RGB = [230, 90,  0];    // sunset orange (accent detail)
const CREAM:  RGB = [248, 251, 252];  // cool off-white section bg
const MID:    RGB = [100, 115, 130];  // muted label
const DARK:   RGB = [20,  35,  55];   // body text (dark navy)
const WHITE:  RGB = [255, 255, 255];
const SILVER: RGB = [160, 170, 180];  // fine print
const PURPLE: RGB = [110, 70,  190];  // refunded
const RED:    RGB = [200, 55,  55];   // rejected

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

// ─── Load logo as base64 for embedding ───────────────────────────────────────
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

// ════════════════════════════════════════════════════════════════════════════
export async function generateReceiptPDF(payment: Payment, reservation?: Reservation): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const LM = 18, RM = W - 18;

  const resort = process.env.NEXT_PUBLIC_RESORT_NAME || process.env.RESORT_NAME || 'Kekamiya Beach Resort';

  const nights   = reservation ? calculateNights(reservation.checkIn, reservation.checkOut) : 0;
  const paid     = parseFloat(String(payment.amount));
  const total    = reservation ? parseFloat(String(reservation.totalAmount)) : paid;
  const balance  = total - paid;
  const isVerified = payment.status === 'verified';

  // Load logo ahead of drawing
  const logoB64 = await loadLogoBase64();

  // ── A. Full-bleed dark header (68mm) ────────────────────────────────────
  box(doc, 0, 0, W, 68, NAVY);

  // Top teal stripe
  box(doc, 0, 0, W, 2, TEAL);

  // Logo — left of centre in header
  if (logoB64) {
    try {
      doc.addImage(logoB64, 'PNG', LM, 10, 20, 20);
    } catch { /* skip if image fails */ }
  }

  // Resort name — centred (shifted right of logo area)
  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); C.text(doc, WHITE);
  doc.text(resort, W / 2 + 6, 22, { align: 'center' });

  // Subtitle
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); C.text(doc, TEAL);
  doc.text('O F F I C I A L   P A Y M E N T   R E C E I P T', W / 2 + 6, 30, { align: 'center' });

  // Thin teal rule under subtitle
  line(doc, 35, LM + 18, RM - 2, TEAL, 0.25);

  // Receipt # and date
  doc.setFontSize(7.2); C.text(doc, SILVER);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt No.  ${String(payment.id).padStart(6, '0')}`, LM, 48);
  doc.text(`Issued  ${formatDateTime(new Date())}`, LM, 55);

  // Status pill
  const statusText  = (payment.status || 'pending').toUpperCase();
  const statusColor: RGB =
    payment.status === 'verified' ? GREEN :
    payment.status === 'refunded' ? PURPLE :
    payment.status === 'rejected' ? RED : AMBER;
  pill(doc, statusText, RM - 34, 46, statusColor);

  // Bottom teal accent bar of header
  box(doc, 0, 66, W, 2, TEAL);

  // ── B. Diamond ornaments on header edge ─────────────────────────────────
  const dmX = W / 2, dmY = 68;
  box(doc, dmX - 8,   dmY - 1.2, 2.4, 2.4, TEAL);
  box(doc, dmX - 1.2, dmY - 1.2, 2.4, 2.4, AMBER);
  box(doc, dmX + 5.6, dmY - 1.2, 2.4, 2.4, TEAL);

  // ── C. Payment details section ───────────────────────────────────────────
  let y = 80;

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

  y += 4;
  line(doc, y, LM, RM);
  box(doc, W / 2 - 1.2, y - 1.2, 2.4, 2.4, TEAL);
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

    y += 4;
    line(doc, y, LM, RM);
    box(doc, W / 2 - 1.2, y - 1.2, 2.4, 2.4, AMBER);
    y += 8;
  }

  // ── E. Payment summary box ───────────────────────────────────────────────
  label(doc, y, 'Payment Summary');
  y += 5;

  const rowH  = 8;
  const rows  = 2 + (balance !== 0 ? 1 : 0);
  const boxH  = rows * rowH + 28;
  const boxY  = y;

  box(doc, LM, boxY, W - 36, boxH, CREAM);
  C.draw(doc, TEAL as RGB); doc.setLineWidth(0.3);
  doc.rect(LM, boxY, W - 36, boxH);

  // Left navy accent bar
  box(doc, LM, boxY, 2.5, boxH, NAVY);

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
    const balColor: RGB = balance > 0 ? AMBER : TEAL;
    doc.setFont('helvetica', 'normal'); C.text(doc, MID);
    doc.text(balLabel, LM + 8, y);
    doc.setFont('helvetica', 'bold'); C.text(doc, balColor);
    doc.text(php(Math.abs(balance)), RM - 4, y, { align: 'right' });
    y += rowH;
  }

  y += 2;
  line(doc, y, LM + 4, RM - 4, TEAL, 0.3);
  y += 7;

  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); C.text(doc, NAVY);
  doc.text(php(paid), RM - 4, y, { align: 'right' });

  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); C.text(doc, TEAL);
  doc.text('AMOUNT PAID', LM + 8, y);

  if (isVerified) {
    stampPaid(doc, LM + 54, y - 5);
  }

  y = boxY + boxH + 12;

  // ── F. Double rule ornament ──────────────────────────────────────────────
  line(doc, y,     LM, RM, NAVY, 0.8);
  line(doc, y + 2, LM, RM, TEAL, 0.2);
  y += 14;

  // ── G. Fine print / thank-you ────────────────────────────────────────────
  doc.setFontSize(8.5); doc.setFont('helvetica', 'italic'); C.text(doc, DARK);
  doc.text(`Thank you for choosing ${resort}.`, W / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); C.text(doc, MID);
  doc.text('This is an official receipt. Please retain a copy for your records.', W / 2, y, { align: 'center' });

  // ── H. Footer ────────────────────────────────────────────────────────────
  const FY = H - 22;
  box(doc, 0, FY, W, H - FY, NAVY);
  box(doc, 0, FY, W, 1.2, TEAL);

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

  const resort = process.env.NEXT_PUBLIC_RESORT_NAME || process.env.RESORT_NAME || 'Kekamiya Beach Resort';
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const LM = 18, RM = W - 18;

  const nights   = reservation ? calculateNights(reservation.checkIn, reservation.checkOut) : 0;
  const paid     = parseFloat(String(payment.amount));
  const total    = reservation ? parseFloat(String(reservation.totalAmount)) : paid;
  const balance  = total - paid;
  const isVerified = payment.status === 'verified';

  // ── A. Full-bleed dark header (68mm)
  box(doc, 0, 0, W, 68, NAVY);
  box(doc, 0, 0, W, 2, TEAL);

  // Resort name
  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); C.text(doc, WHITE);
  doc.text(resort, W / 2, 24, { align: 'center' });
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); C.text(doc, TEAL);
  doc.text('O F F I C I A L   P A Y M E N T   R E C E I P T', W / 2, 32, { align: 'center' });
  line(doc, 37, LM + 20, RM - 20, TEAL, 0.25);

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
    box(doc, W / 2 - 1.2, y - 1.2, 2.4, 2.4, TEAL);
    y += 8;
  }

  // ── C. Reservation details
  if (reservation) {
    label(doc, y, 'Reservation');
    y += 5;
    y = kv(doc, y, 'Confirmation Code', reservation.confirmationCode, true, TEAL);
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
    box(doc, W / 2 - 1.2, y - 1.2, 2.4, 2.4, AMBER);
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
  box(doc, W / 2 - 1.2, y - 1.2, 2.4, 2.4, TEAL);
  y += 8;

  // ── E. Payment summary box
  label(doc, y, 'Payment Summary');
  y += 5;
  const rowH = 8;
  const rows = 2 + (balance !== 0 ? 1 : 0);
  const boxH = rows * rowH + 28;
  const boxY = y;
  box(doc, LM, boxY, W - 36, boxH, CREAM);
  C.draw(doc, TEAL as RGB); doc.setLineWidth(0.3);
  doc.rect(LM, boxY, W - 36, boxH);
  box(doc, LM, boxY, 2.5, boxH, NAVY);
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
    const balColor: RGB = balance > 0 ? AMBER : TEAL;
    doc.setFont('helvetica', 'normal'); C.text(doc, MID);
    doc.text(balLabel, LM + 8, y);
    doc.setFont('helvetica', 'bold'); C.text(doc, balColor);
    doc.text(php(Math.abs(balance)), RM - 4, y, { align: 'right' });
    y += rowH;
  }
  y += 2;
  line(doc, y, LM + 4, RM - 4, TEAL, 0.3);
  y += 7;
  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); C.text(doc, NAVY);
  doc.text(php(paid), RM - 4, y, { align: 'right' });
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); C.text(doc, TEAL);
  doc.text('AMOUNT PAID', LM + 8, y);
  if (isVerified) {
    stampPaid(doc, LM + 54, y - 5);
  }
  y = boxY + boxH + 12;

  // ── F. Double rule ornament
  line(doc, y,     LM, RM, NAVY, 0.8);
  line(doc, y + 2, LM, RM, TEAL, 0.2);
  y += 14;

  // ── G. Fine print / thank-you
  doc.setFontSize(8.5); doc.setFont('helvetica', 'italic'); C.text(doc, DARK);
  doc.text(`Thank you for choosing ${resort}.`, W / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); C.text(doc, MID);
  doc.text('This is an official receipt. Please retain a copy for your records.', W / 2, y, { align: 'center' });

  // ── H. Footer
  const FY = H - 22;
  box(doc, 0, FY, W, H - FY, NAVY);
  box(doc, 0, FY, W, 1.2, TEAL);
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); C.text(doc, SILVER);
  doc.text(`Generated on ${formatDateTime(new Date())}   ·   ${resort}`, W / 2, FY + 9, { align: 'center' });
  doc.text('For inquiries, please present this receipt together with your booking confirmation.', W / 2, FY + 15, { align: 'center' });

  const code = reservation?.confirmationCode || `PAY${payment.id}`;
  const arrayBuffer = doc.output('arraybuffer');
  return {
    buffer: Buffer.from(arrayBuffer),
    filename: `receipt-${code}-${payment.id}.pdf`,
  };
}