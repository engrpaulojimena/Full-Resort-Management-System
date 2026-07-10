import { Payment, Reservation } from '@/types';
import { formatDate, formatDateTime, calculateNights } from './utils';

function php(amount: string | number): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return 'PHP ' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type RGB = [number, number, number];

// ── Design Tokens (clean, white, navy/blue accent — matches reference) ───────
const NAVY:        RGB = [17,  49,  103];  // headings / brand text
const NAVY_DEEP:   RGB = [10,  30,  70];   // table header bg
const TEAL:        RGB = [0,   120, 150];  // section labels / links
const GREEN:       RGB = [20,  115, 55];   // paid
const GREEN_LIGHT: RGB = [228, 248, 234];
const AMBER:       RGB = [178, 98,  0];    // partial / pending
const AMBER_LIGHT: RGB = [255, 244, 214];
const PURPLE:      RGB = [100, 30,  200];  // refund / overpaid
const PURPLE_LIGHT: RGB = [240, 232, 255];
const WHITE:       RGB = [255, 255, 255];
const BODY_TEXT:   RGB = [30,  36,  50];
const MUTED:       RGB = [110, 118, 135];
const LIGHT_RULE:  RGB = [222, 228, 238];
const ROW_ALT:     RGB = [246, 249, 253];
const TOTAL_BG:    RGB = [232, 240, 250];

type Doc = InstanceType<typeof import('jspdf')['jsPDF']>;
const C = {
  text: (d: Doc, rgb: RGB) => d.setTextColor(...rgb),
  fill: (d: Doc, rgb: RGB) => d.setFillColor(...rgb),
  draw: (d: Doc, rgb: RGB) => d.setDrawColor(...rgb),
};

function hRule(d: Doc, y: number, x1: number, x2: number, color: RGB = LIGHT_RULE, lw = 0.25) {
  C.draw(d, color); d.setLineWidth(lw); d.line(x1, y, x2, y);
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
  } catch { return null; }
}

interface DrawOptions {
  payment: Payment;
  reservation?: Reservation;
  siblingPayments?: Payment[];
  logoB64?: string | null;
}

function drawReceipt(doc: Doc, opts: DrawOptions): void {
  const { payment, reservation, siblingPayments = [], logoB64 } = opts;

  const W  = doc.internal.pageSize.getWidth();
  const H  = doc.internal.pageSize.getHeight();
  const LM = 16, RM = W - 16, CW = RM - LM;
  const CX = W / 2;

  const resort   = process.env.NEXT_PUBLIC_RESORT_NAME    || process.env.RESORT_NAME    || 'Kekamiya Beach Resort';
  const address  = process.env.NEXT_PUBLIC_RESORT_ADDRESS || process.env.RESORT_ADDRESS || '';
  const phone    = process.env.NEXT_PUBLIC_RESORT_PHONE   || process.env.RESORT_PHONE   || '';
  const email    = process.env.NEXT_PUBLIC_RESORT_EMAIL   || process.env.RESORT_EMAIL   || '';
  const website  = process.env.NEXT_PUBLIC_RESORT_WEBSITE || process.env.RESORT_WEBSITE || '';

  const nights = reservation ? calculateNights(reservation.checkIn, reservation.checkOut) : 0;
  const total  = reservation ? parseFloat(String(reservation.totalAmount)) : parseFloat(String(payment.amount));

  const allPayments = [payment, ...siblingPayments].filter(
    (p, i, arr) => arr.findIndex(x => x.id === p.id) === i
  );

  const allVerified = allPayments.filter(p => p.status === 'verified');
  const totalPaid   = allVerified.reduce((s, p) => s + parseFloat(String(p.amount)), 0);
  const balance     = total - totalPaid;
  const isFullyPaid = balance <= 0;
  const isOverpaid  = balance < 0;

  const refundedPayments = allPayments.filter(p => p.status === 'refunded');
  const totalRefunded    = refundedPayments.reduce((s, p) => s + parseFloat(String(p.amount)), 0);

  const historyPayments = allPayments
    .filter(p => p.status === 'verified' || p.status === 'refunded')
    .sort((a, b) => {
      const da = new Date(a.verifiedAt ?? a.createdAt ?? 0).getTime();
      const db = new Date(b.verifiedAt ?? b.createdAt ?? 0).getTime();
      return da - db;
    });

  // ── Page background ────────────────────────────────────────────────────────
  C.fill(doc, WHITE); doc.rect(0, 0, W, H, 'F');

  let y = 15;

  // ── A. Header — small icon badge + resort name, centered ──────────────────
  const BADGE_R = 6.5;
  if (logoB64) {
    try {
      // just the logo image itself, no circle/border behind it
      doc.addImage(logoB64, 'PNG', CX - BADGE_R, y - 1, BADGE_R * 2, BADGE_R * 2);
    } catch { /* skip */ }
  } else {
    // fallback only when no logo is available: initial letter in a plain navy circle
    C.fill(doc, NAVY); doc.circle(CX, y + BADGE_R - 1, BADGE_R, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); C.text(doc, WHITE);
    doc.text(resort.charAt(0).toUpperCase(), CX, y + BADGE_R + 1.3, { align: 'center' });
  }
  y += BADGE_R * 2 + 4;

  doc.setFontSize(19); doc.setFont('helvetica', 'bold'); C.text(doc, NAVY);
  doc.text(resort, CX, y, { align: 'center' });
  y += 6.5;

  // Contact row — address · phone · email
  const contactParts = [
    address ? address : null,
    phone   ? phone   : null,
    email   ? email   : null,
  ].filter(Boolean) as string[];

  if (contactParts.length) {
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); C.text(doc, MUTED);
    const line = contactParts.join('     ·     ');
    doc.text(line, CX, y, { align: 'center' });
    y += 4.5;
  }
  if (website) {
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); C.text(doc, TEAL);
    doc.text(website, CX, y, { align: 'center' });
    y += 4.5;
  }

  y += 3;
  hRule(doc, y, LM, RM, LIGHT_RULE, 0.4);
  y += 9;

  // ── B. Paid By  /  RECEIPT ─────────────────────────────────────────────────
  const guestName  = reservation?.guest ? `${reservation.guest.firstName} ${reservation.guest.lastName}` : '—';
  const guestEmail = reservation?.guest?.email || '';
  const receiptRef = reservation?.confirmationCode || `PAY-${payment.id}`;

  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); C.text(doc, TEAL);
  doc.text('PAID BY', LM, y);

  doc.setFontSize(15.5); doc.setFont('helvetica', 'bold'); C.text(doc, NAVY);
  doc.text('RECEIPT', RM, y, { align: 'right' });

  y += 5.5;
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); C.text(doc, BODY_TEXT);
  doc.text(guestName, LM, y);
  y += 4.5;
  if (guestEmail) {
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); C.text(doc, MUTED);
    doc.text(guestEmail, LM, y);
  }

  y += 9;

  // ── C. Booking Details grid ────────────────────────────────────────────────
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); C.text(doc, TEAL);
  doc.text('BOOKING DETAILS', LM, y);
  y += 6;

  const gLabelX = LM, gValX = LM + 26;
  const gLabelX2 = LM + CW * 0.55, gValX2 = LM + CW * 0.55 + 26;
  const rowGap = 6;

  function gridRow(label: string, val: string, ly: number, labelX: number, valX: number) {
    doc.setFontSize(7.3); doc.setFont('helvetica', 'normal'); C.text(doc, MUTED);
    doc.text(label, labelX, ly);
    doc.setFontSize(7.6); doc.setFont('helvetica', 'bold'); C.text(doc, BODY_TEXT);
    doc.text(val || '—', valX, ly);
  }

  if (reservation) {
    gridRow('Check in',  formatDate(reservation.checkIn),  y, gLabelX, gValX);
    y += rowGap;
    gridRow('Check-out', formatDate(reservation.checkOut), y, gLabelX, gValX);

    const guestsStr = reservation.adults
      ? `${reservation.adults} adult${reservation.adults !== 1 ? 's' : ''}` +
        (reservation.children ? `, ${reservation.children} child${reservation.children !== 1 ? 'ren' : ''}` : '')
      : '—';
    gridRow('Receipt #', receiptRef, y, gLabelX2, gValX2);
    y += rowGap;
    gridRow('Guests', guestsStr, y, gLabelX, gValX);
    gridRow('Receipt Date', formatDate(new Date()), y, gLabelX2, gValX2);
    y += rowGap;
    if (reservation.room) {
      gridRow('Unit', `Room ${reservation.room.roomNumber} · ${reservation.room.type.charAt(0).toUpperCase() + reservation.room.type.slice(1)}`, y, gLabelX, gValX);
    }
  } else {
    gridRow('Receipt #', receiptRef, y, gLabelX2, gValX2);
    y += rowGap;
    gridRow('Receipt Date', formatDate(new Date()), y, gLabelX2, gValX2);
  }

  y += rowGap + 4;
  hRule(doc, y, LM, RM, LIGHT_RULE, 0.3);
  y += 8;

  // ── D. Payment history table ───────────────────────────────────────────────
  const col1 = LM + 4;            // ref / type
  const col2 = LM + CW * 0.42;    // method
  const col3 = LM + CW * 0.62;    // date
  const headH = 8;
  const tableTop = y;

  C.fill(doc, NAVY_DEEP); doc.rect(LM, y, CW, headH, 'F');
  doc.setFontSize(6.6); doc.setFont('helvetica', 'bold'); C.text(doc, WHITE);
  doc.text('REF / TYPE', col1, y + 5.3);
  doc.text('METHOD',     col2, y + 5.3);
  doc.text('DATE',       col3, y + 5.3);
  doc.text('AMOUNT',     RM - 3, y + 5.3, { align: 'right' });
  y += headH;

  const rowH = 7.5;
  historyPayments.forEach((p, i) => {
    if (i % 2 !== 0) { C.fill(doc, ROW_ALT); doc.rect(LM, y, CW, rowH, 'F'); }

    const date = p.verifiedAt
      ? formatDate(new Date(p.verifiedAt))
      : (p.createdAt ? formatDate(new Date(p.createdAt)) : '—');
    const typeLabel   = (p.paymentType || 'payment').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const methodLabel = (p.method || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const isRefund    = p.status === 'refunded';
    const amtColor: RGB = isRefund ? PURPLE : BODY_TEXT;

    doc.setFontSize(7.3); doc.setFont('helvetica', 'normal'); C.text(doc, BODY_TEXT);
    doc.text(`#${p.id} · ${typeLabel}`, col1, y + 5);
    C.text(doc, MUTED);
    doc.text(methodLabel, col2, y + 5);
    doc.text(date, col3, y + 5);
    doc.setFont('helvetica', 'bold'); C.text(doc, amtColor);
    doc.text((isRefund ? '− ' : '') + php(p.amount), RM - 3, y + 5, { align: 'right' });

    hRule(doc, y + rowH, LM, RM, LIGHT_RULE, 0.2);
    y += rowH;
  });

  C.draw(doc, LIGHT_RULE); doc.setLineWidth(0.3);
  doc.rect(LM, tableTop, CW, y - tableTop, 'D');

  y += 6;

  // ── E. Totals ───────────────────────────────────────────────────────────────
  const totLabelX = LM + CW * 0.55;
  function totRow(lbl: string, val: string, vc: RGB = BODY_TEXT, bold = false) {
    doc.setFontSize(7.3); doc.setFont('helvetica', 'normal'); C.text(doc, MUTED);
    doc.text(lbl, totLabelX, y, { align: 'left' });
    doc.setFontSize(7.6); doc.setFont('helvetica', bold ? 'bold' : 'normal'); C.text(doc, vc);
    doc.text(val, RM - 3, y, { align: 'right' });
    y += 6;
  }

  totRow('Reservation Amount', php(total));
  totRow('Total Paid', php(totalPaid), GREEN, true);
  if (totalRefunded > 0) totRow('Total Refunded', `− ${php(totalRefunded)}`, PURPLE, true);

  y += 3;

  // Highlighted Total bar (status-colored, like the reference's blue Total row)
  const heroStatus = isOverpaid ? 'OVERPAID' : isFullyPaid ? 'TOTAL PAID' : 'BALANCE DUE';
  const heroVal     = isOverpaid ? Math.abs(balance) : isFullyPaid ? totalPaid : balance;
  const heroColor: RGB = isFullyPaid && !isOverpaid ? GREEN : isOverpaid ? PURPLE : AMBER;
  const heroBg: RGB    = isFullyPaid && !isOverpaid ? GREEN_LIGHT : isOverpaid ? PURPLE_LIGHT : AMBER_LIGHT;

  const barH = 11;
  C.fill(doc, TOTAL_BG); doc.rect(LM, y - 7, CW, barH, 'F');
  C.fill(doc, NAVY); doc.rect(LM, y - 7, 2.2, barH, 'F');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); C.text(doc, NAVY);
  doc.text('TOTAL', LM + 6, y);
  doc.setFontSize(10); C.text(doc, NAVY);
  doc.text(php(total), RM - 4, y, { align: 'right' });
  y += barH - 1;

  // small status chip beneath the total bar
  y += 4;
  const chipLabel = `${heroStatus} · ${php(heroVal)}`;
  doc.setFontSize(6.6); doc.setFont('helvetica', 'bold');
  const chipW = doc.getTextWidth(chipLabel) + 12;
  const chipX = RM - chipW;
  C.fill(doc, heroBg);
  doc.roundedRect(chipX, y, chipW, 6.5, 1.4, 1.4, 'F');
  C.text(doc, heroColor);
  doc.text(chipLabel, chipX + chipW / 2, y + 4.3, { align: 'center' });

  y += 14;

  // ── F. Notes ────────────────────────────────────────────────────────────────
  if (y + 20 > H - 30) { doc.addPage(); C.fill(doc, WHITE); doc.rect(0, 0, W, H, 'F'); y = 20; }

  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); C.text(doc, NAVY);
  doc.text('Notes', LM, y);
  y += 5;
  doc.setFontSize(7.3); doc.setFont('helvetica', 'normal'); C.text(doc, BODY_TEXT);
  doc.text(`Thank you for staying with us. We look forward to your next visit :)`, LM, y);
  y += 9;

  hRule(doc, y, LM, RM, LIGHT_RULE, 0.3);
  y += 6;

  // ── G. Payment Terms & Conditions (small print) ───────────────────────────
  if (y + 26 > H - 14) { doc.addPage(); C.fill(doc, WHITE); doc.rect(0, 0, W, H, 'F'); y = 20; }

  doc.setFontSize(6.4); doc.setFont('helvetica', 'bold'); C.text(doc, MUTED);
  doc.text('PAYMENT TERMS & CONDITIONS', LM, y);
  y += 4;

  const terms = [
    `Payment is considered confirmed only upon verification by ${resort}.`,
    'This receipt serves as valid proof of payment and must be presented together with your booking confirmation.',
    'Refunds, if applicable, are processed in accordance with the resort\u2019s cancellation and refund policy.',
    'Rates reflected are inclusive of applicable taxes and service charges unless otherwise stated.',
  ];

  doc.setFontSize(5.8); doc.setFont('helvetica', 'normal'); C.text(doc, MUTED);
  terms.forEach(t => {
    const lines = doc.splitTextToSize(`•  ${t}`, CW - 4);
    doc.text(lines, LM, y);
    y += lines.length * 3;
  });

  // ── H. Footer ───────────────────────────────────────────────────────────────
  const FY = H - 10;
  hRule(doc, FY - 4, LM, RM, LIGHT_RULE, 0.25);
  doc.setFontSize(6); doc.setFont('helvetica', 'normal'); C.text(doc, MUTED);
  doc.text(`Generated ${formatDateTime(new Date())}`, LM, FY);
  doc.text(resort, RM, FY, { align: 'right' });
}

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
  doc.save(`receipt-${code}.pdf`);
}

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
  return { buffer: Buffer.from(arrayBuffer), filename: `receipt-${code}.pdf` };
}