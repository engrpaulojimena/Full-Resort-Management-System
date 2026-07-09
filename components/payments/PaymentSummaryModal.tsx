'use client';

import React, { useState, useEffect } from 'react';
import {
  X, FileDown, Loader2, AlertTriangle, CheckCircle,
  XCircle, Eye, RotateCcw, ChevronRight,
  BedDouble, CalendarCheck, Users, Waves,
} from 'lucide-react';
import { Payment, Reservation } from '@/types';
import { formatCurrency, formatDate, calculateNights } from '@/lib/utils';
import { generateReceiptPDF } from '@/lib/generateReceipt';
import {
  getReservationPaymentSummary,
  PAYMENT_STATUS_COLORS,
  PAYMENT_TYPE_LABELS,
} from '@/lib/payments';

// ── Constants ─────────────────────────────────────────────────────────────────
const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', gcash: 'GCash', bank_transfer: 'Bank Transfer',
  credit_card: 'Credit Card', maya: 'Maya',
};
const METHOD_COLORS: Record<string, string> = {
  cash: '#52C48A', gcash: '#4A9EE8', bank_transfer: '#F0A84B',
  credit_card: '#B97FD8', maya: '#3EB8E8',
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  verified: <CheckCircle size={11} />,
  pending:  <AlertTriangle size={11} />,
  rejected: <XCircle size={11} />,
  refunded: <RotateCcw size={11} />,
};
const STATUS_COLOR: Record<string, string> = {
  verified: '#52C48A', pending: '#E8B84B', rejected: '#E05B5B', refunded: '#B97FD8',
};

// ── Responsive hook ───────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 700) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
}

// ── Arc gauge ─────────────────────────────────────────────────────────────────
function ProgressArc({ percent, status, size = 88 }: { percent: number; status: string; size?: number }) {
  const R = size * 0.41;
  const STROKE = size * 0.065;
  const C = 2 * Math.PI * R;
  const filled = C * Math.min(percent, 100) / 100;
  const color = PAYMENT_STATUS_COLORS[status as keyof typeof PAYMENT_STATUS_COLORS] ?? '#52C48A';
  const isSettled = status === 'fully_paid' || status === 'overpaid';
  const cx = size / 2, cy = size / 2;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id="arc-glow">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="arc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={STROKE} />
        <circle cx={cx} cy={cy} r={R} fill="none"
          stroke="url(#arc-grad)" strokeWidth={STROKE}
          strokeDasharray={`${filled} ${C}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} filter="url(#arc-glow)"
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: size * 0.2, fontWeight: 800, color, lineHeight: 1, letterSpacing: '-1px' }}>
          {isSettled ? '✓' : `${Math.round(percent)}%`}
        </span>
        <span style={{ fontSize: size * 0.1, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '2px' }}>
          {isSettled ? 'Settled' : status === 'refunded' ? 'Refund' : 'Partial'}
        </span>
      </div>
    </div>
  );
}

// ── Payment card ──────────────────────────────────────────────────────────────
function PaymentCard({
  p, siblings, onPrint, printing, actioningId,
  onVerify, onReject, onViewProof, onRefund,
}: {
  p: Payment; siblings: Payment[];
  onPrint: (p: Payment, s: Payment[]) => void;
  printing: boolean; actioningId: number | null;
  onVerify?: (p: Payment) => void;
  onReject?: (p: Payment) => void;
  onViewProof?: (p: Payment) => void;
  onRefund?: (p: Payment) => void;
}) {
  const isActioning = actioningId === p.id;
  const sc = STATUS_COLOR[p.status] ?? '#aaa';
  const mc = METHOD_COLORS[p.method] ?? '#aaa';

  return (
    <div style={{
      borderRadius: '12px',
      background: 'rgba(255,255,255,0.035)',
      border: `1px solid ${sc}22`,
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* Color accent line */}
      <div style={{ height: '2px', background: `linear-gradient(90deg, ${sc}BB, ${sc}11)` }} />

      <div style={{ padding: '12px 14px' }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#EDF2F7', letterSpacing: '-0.5px' }}>
              {formatCurrency(p.amount)}
            </span>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace' }}>#{p.id}</span>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontSize: '10px', fontWeight: 700, color: sc,
            padding: '3px 10px', borderRadius: '20px',
            background: `${sc}12`, border: `1px solid ${sc}28`,
          }}>
            {STATUS_ICON[p.status]}
            {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
          </span>
        </div>

        {/* Tags row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, background: `${mc}15`, color: mc, border: `1px solid ${mc}20` }}>
            {METHOD_LABELS[p.method] ?? p.method}
          </span>
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
            {PAYMENT_TYPE_LABELS[p.paymentType ?? 'full'] ?? p.paymentType}
          </span>
          {p.notes?.includes('website') && (
            <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '5px', background: 'rgba(74,158,232,0.12)', color: '#4A9EE8', fontWeight: 600 }}>web</span>
          )}
          {p.referenceNumber && (
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginLeft: 'auto' }}>
              ref: {p.referenceNumber}
            </span>
          )}
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.22)' }}>
            {formatDate(p.createdAt!)}
          </span>
        </div>

        {/* Actions */}
        {p.status === 'pending' && (onVerify || onReject || onViewProof) && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {p.proofUrl && onViewProof && <ActionBtn onClick={() => onViewProof(p)} color="#4A9EE8" icon={<Eye size={10} />} label="View Proof" />}
            {onVerify && <ActionBtn onClick={() => onVerify(p)} color="#52C48A" icon={isActioning ? <Spin /> : <CheckCircle size={10} />} label="Verify" disabled={isActioning} />}
            {onReject && <ActionBtn onClick={() => onReject(p)} color="#E05B5B" icon={isActioning ? <Spin /> : <XCircle size={10} />} label="Reject" disabled={isActioning} />}
          </div>
        )}
        {p.status === 'verified' && (
          <div style={{ display: 'flex', gap: '5px' }}>
            <ActionBtn onClick={() => onPrint(p, siblings)} color="#52C48A" icon={printing ? <Spin /> : <FileDown size={10} />} label="Receipt" disabled={printing} />
            {onRefund && <ActionBtn onClick={() => onRefund(p)} color="#B97FD8" icon={<RotateCcw size={10} />} label="Refund" disabled={isActioning} />}
          </div>
        )}
        {p.status === 'rejected' && onRefund && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'rgba(224,91,91,0.4)', fontStyle: 'italic', flex: 1 }}>Payment rejected</span>
            <ActionBtn onClick={() => onRefund(p)} color="#B97FD8" icon={<RotateCcw size={10} />} label="Mark Refunded" disabled={isActioning} />
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ onClick, color, icon, label, disabled }: {
  onClick: () => void; color: string; icon: React.ReactNode;
  label: string; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '5px 11px', borderRadius: '7px',
      fontSize: '11px', fontWeight: 600, color,
      background: `${color}10`, border: `1px solid ${color}25`,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'all 0.15s',
    }}>
      {icon}{label}
    </button>
  );
}

function Spin() {
  return <Loader2 size={10} style={{ animation: 'spin 0.8s linear infinite' }} />;
}

// ── Main ──────────────────────────────────────────────────────────────────────
interface Props {
  payments: Payment[];
  reservation?: Reservation;
  onClose: () => void;
  onVerify?: (p: Payment) => void;
  onReject?: (p: Payment) => void;
  onViewProof?: (p: Payment) => void;
  onRefund?: (p: Payment) => void;
  actioningId?: number | null;
}

export default function PaymentSummaryModal({
  payments, reservation, onClose,
  onVerify, onReject, onViewProof, onRefund,
  actioningId = null,
}: Props) {
  const [printingId, setPrintingId] = useState<number | null>(null);
  const [printingAll, setPrintingAll] = useState(false);
  const [receiptType, setReceiptType] = useState<'partial' | 'full'>('partial');
  const [activeTab, setActiveTab] = useState<'payments' | 'summary'>('payments');
  const isMobile = useIsMobile(700);

  const summary     = reservation ? getReservationPaymentSummary(reservation, payments) : null;
  const isFullyPaid = summary ? summary.status === 'fully_paid' || summary.status === 'overpaid' : false;
  const nights      = reservation ? calculateNights(reservation.checkIn, reservation.checkOut) : 0;
  const statusColor = summary ? (PAYMENT_STATUS_COLORS[summary.status as keyof typeof PAYMENT_STATUS_COLORS] ?? '#52C48A') : '#52C48A';

  const verified = payments.filter(p => p.status === 'verified');
  const pending  = payments.filter(p => p.status === 'pending');
  const rejected = payments.filter(p => p.status === 'rejected');
  const sorted   = [...payments].sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());

  const guestName = (() => {
    const g = reservation?.guest;
    return (g ? `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim() : '') || reservation?.guestName || 'Payment Summary';
  })();

  async function handlePrintSingle(p: Payment, siblings: Payment[]) {
    setPrintingId(p.id);
    try { await generateReceiptPDF(p, reservation, siblings); } finally { setPrintingId(null); }
  }

  async function handlePrintAll() {
    if (!verified.length) return;
    setPrintingAll(true);
    try {
      if (receiptType === 'full') {
        await generateReceiptPDF(verified[verified.length - 1], reservation, payments);
      } else {
        await generateReceiptPDF(verified[0], reservation, []);
      }
    } finally { setPrintingAll(false); }
  }

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .psm-scroll::-webkit-scrollbar { width: 4px; }
        .psm-scroll::-webkit-scrollbar-track { background: transparent; }
        .psm-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .psm-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }
        .psm-card-hover:hover { background: rgba(255,255,255,0.055) !important; }
      `}</style>

      {/* Full-page overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 300,
        width: '100vw', height: '100vh',
        background: 'rgba(4,10,20,0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
      }} onClick={onClose}>

        {/* Modal container — always fills full viewport height */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '1080px',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: '#080F1A',
            animation: 'fadeSlide 0.22s ease-out',
            overflow: 'hidden',
            position: 'relative',
          }}
        >

          {/* ── HERO HEADER ────────────────────────────────────────────── */}
          <div style={{
            flexShrink: 0,
            background: 'linear-gradient(150deg, #02111F 0%, #011829 45%, #01203A 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            position: 'relative',
            overflow: 'hidden',
            padding: 'clamp(20px, 3vw, 36px) clamp(20px, 4vw, 48px)',
          }}>

            {/* Background texture blobs */}
            <div style={{
              position: 'absolute', top: -80, right: -60,
              width: 'clamp(200px, 30vw, 380px)',
              height: 'clamp(200px, 30vw, 380px)',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${statusColor}14 0%, transparent 65%)`,
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', bottom: -40, left: -20,
              width: 'clamp(100px, 20vw, 220px)',
              height: 'clamp(100px, 20vw, 220px)',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(74,158,232,0.07) 0%, transparent 65%)',
              pointerEvents: 'none',
            }} />

            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'clamp(14px, 2vw, 24px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Waves size={14} style={{ color: statusColor, opacity: 0.7 }} />
                {reservation ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em',
                    color: `${statusColor}CC`,
                    background: `${statusColor}10`, border: `1px solid ${statusColor}25`,
                    padding: '4px 12px', borderRadius: '20px',
                  }}>
                    <ChevronRight size={9} style={{ opacity: 0.5 }} />
                    {reservation.confirmationCode}
                  </span>
                ) : null}
              </div>
              <button onClick={onClose} style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', width: '34px', height: '34px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
                transition: 'all 0.15s',
              }}>
                <X size={15} />
              </button>
            </div>

            {/* Guest + gauge row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'clamp(16px, 3vw, 36px)', flexWrap: 'wrap' }}>
              {/* Left: name + stats */}
              <div style={{ flex: 1, minWidth: '220px' }}>
                <h2 style={{
                  margin: 0,
                  fontSize: 'clamp(22px, 3.5vw, 34px)',
                  fontWeight: 900,
                  color: '#F0F5FA',
                  letterSpacing: '-0.8px',
                  lineHeight: 1.05,
                  marginBottom: '4px',
                }}>
                  {guestName}
                </h2>
                {reservation?.guest?.email && (
                  <p style={{
                    margin: '0 0 clamp(14px, 2vw, 22px)',
                    fontSize: 'clamp(11px, 1.3vw, 13px)',
                    color: 'rgba(255,255,255,0.38)',
                  }}>
                    {reservation.guest.email}
                  </p>
                )}

                {/* Stat row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(100px, auto))',
                  gap: 'clamp(6px, 1.5vw, 12px)',
                }}>
                  <StatPill label="Total"   value={formatCurrency(summary?.totalAmount ?? 0)} color="rgba(240,245,250,0.9)" />
                  <StatPill label="Paid"    value={formatCurrency(summary?.totalPaid ?? 0)}   color={statusColor} accent />
                  {(summary?.totalPending ?? 0) > 0 && (
                    <StatPill label="Pending" value={formatCurrency(summary?.totalPending ?? 0)} color="#E8B84B" />
                  )}
                  <StatPill
                    label="Balance"
                    value={summary && summary.balance <= 0 ? 'Settled ✓' : formatCurrency(summary?.balance ?? 0)}
                    color={summary?.balance === 0 ? '#52C48A' : '#E8B84B'}
                  />
                </div>
              </div>

              {/* Right: arc gauge */}
              {summary && (
                <ProgressArc
                  percent={summary.percentPaid}
                  status={summary.status}
                  size={isMobile ? 64 : 88}
                />
              )}
            </div>

            {/* Booking info chips */}
            {reservation && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '6px',
                marginTop: 'clamp(14px, 2vw, 24px)',
                paddingTop: 'clamp(12px, 1.5vw, 18px)',
                borderTop: '1px solid rgba(255,255,255,0.05)',
              }}>
                {reservation.room && <InfoChip icon={<BedDouble size={10} />} label={`Room ${reservation.room.roomNumber} · ${reservation.room.type}`} />}
                <InfoChip icon={<CalendarCheck size={10} />} label={`${formatDate(reservation.checkIn)} → ${formatDate(reservation.checkOut)}`} />
                <InfoChip icon={<BedDouble size={10} />} label={`${nights} night${nights !== 1 ? 's' : ''}`} />
                {reservation.adults && (
                  <InfoChip icon={<Users size={10} />} label={`${reservation.adults} adult${reservation.adults !== 1 ? 's' : ''}${reservation.children ? ` +${reservation.children} child${reservation.children !== 1 ? 'ren' : ''}` : ''}`} />
                )}
              </div>
            )}
          </div>

          {/* ── MOBILE TABS ──────────────────────────────────────────────── */}
          {isMobile && (
            <div style={{
              flexShrink: 0,
              display: 'flex',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              background: '#060D18',
            }}>
              {(['payments', 'summary'] as const).map(tab => {
                const active = activeTab === tab;
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    flex: 1, padding: '12px 8px',
                    fontSize: '12px', fontWeight: 700,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: active ? '#52C48A' : 'rgba(255,255,255,0.35)',
                    borderBottom: active ? '2px solid #52C48A' : '2px solid transparent',
                    transition: 'all 0.15s', letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}>
                    {tab === 'payments' ? `Payments (${payments.length})` : 'Summary'}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── BODY — two-column on large, single on small ─────────────── */}
          <div style={{
            flex: 1,
            minHeight: 0,          /* critical: lets flex child shrink below content size */
            display: isMobile ? 'flex' : 'grid',
            flexDirection: 'column',
            gridTemplateColumns: 'clamp(240px, 55%, 640px) 1fr',
            overflow: 'hidden',
          }}>

            {/* Left column / Payments tab */}
            <div className="psm-scroll" style={{
              overflowY: 'auto',
              flex: isMobile ? 1 : undefined,
              minHeight: 0,
              display: isMobile && activeTab !== 'payments' ? 'none' : 'flex',
              padding: 'clamp(14px, 2.5vw, 28px)',
              borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.05)',
              flexDirection: 'column',
              gap: '10px',
            }}>
              {!isMobile && <SectionLabel count={payments.length}>Payments</SectionLabel>}

              {pending.length > 0 && (
                <Banner icon={<AlertTriangle size={12} />} color="#E8B84B"
                  msg={`${pending.length} payment${pending.length !== 1 ? 's' : ''} awaiting verification`} />
              )}
              {rejected.length > 0 && (
                <Banner icon={<XCircle size={12} />} color="#E05B5B"
                  msg={`${rejected.length} rejected payment${rejected.length !== 1 ? 's' : ''}`}
                  sub={onRefund ? 'Mark as refunded below if a refund was issued.' : undefined} />
              )}

              {sorted.map(p => (
                <PaymentCard
                  key={p.id} p={p} siblings={payments}
                  onPrint={handlePrintSingle}
                  printing={printingId === p.id}
                  actioningId={actioningId}
                  onVerify={onVerify} onReject={onReject}
                  onViewProof={onViewProof} onRefund={onRefund}
                />
              ))}

              {payments.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>
                  No payments recorded yet.
                </div>
              )}
            </div>

            {/* Right column / Summary tab */}
            <div className="psm-scroll" style={{
              overflowY: 'auto',
              flex: isMobile ? 1 : undefined,
              minHeight: 0,
              display: isMobile && activeTab !== 'summary' ? 'none' : 'flex',
              padding: 'clamp(14px, 2.5vw, 28px)',
              flexDirection: 'column',
              gap: '16px',
              background: 'rgba(0,0,0,0.12)',
            }}>

              {/* Payment breakdown */}
              {summary && (
                <div>
                  <SectionLabel>Breakdown</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                    <BreakdownRow label="Subtotal" value={formatCurrency(summary.totalAmount)} />
                    <BreakdownRow label="Verified payments" value={`−${formatCurrency(summary.totalPaid)}`} valueColor="#52C48A" />
                    {(summary.totalPending ?? 0) > 0 && (
                      <BreakdownRow label="Pending (unverified)" value={formatCurrency(summary.totalPending)} valueColor="#E8B84B" dimmed />
                    )}
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '4px 0' }} />
                    <BreakdownRow
                      label="Balance due"
                      value={summary.balance <= 0 ? 'Settled' : formatCurrency(summary.balance)}
                      valueColor={summary.balance <= 0 ? '#52C48A' : '#F0F5FA'}
                      bold
                    />
                  </div>
                </div>
              )}

              {/* Receipt section */}
              {verified.length > 0 && (
                <div style={{
                  padding: 'clamp(14px, 2vw, 20px)',
                  borderRadius: '14px',
                  background: 'rgba(82,196,138,0.04)',
                  border: '1px solid rgba(82,196,138,0.12)',
                }}>
                  <SectionLabel>Print Receipt</SectionLabel>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px', margin: '12px 0' }}>
                    {(['partial', 'full'] as const).map(type => {
                      const active = receiptType === type;
                      const disabled = type === 'full' && !isFullyPaid;
                      return (
                        <button key={type} onClick={() => !disabled && setReceiptType(type)} disabled={disabled}
                          title={disabled ? 'Only available when fully paid' : undefined}
                          style={{
                            padding: '9px 8px', borderRadius: '9px',
                            fontSize: '11.5px', fontWeight: 600,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            background: active ? 'rgba(82,196,138,0.13)' : 'rgba(255,255,255,0.05)',
                            color: active ? '#52C48A' : disabled ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.48)',
                            border: active ? '1px solid rgba(82,196,138,0.35)' : '1px solid rgba(255,255,255,0.08)',
                            opacity: disabled ? 0.38 : 1,
                            transition: 'all 0.15s', textAlign: 'center',
                          }}>
                          {type === 'partial' ? '📄 Partial' : '✅ Full'}
                        </button>
                      );
                    })}
                  </div>

                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.32)', margin: '0 0 12px', lineHeight: 1.6 }}>
                    {receiptType === 'full'
                      ? 'Consolidated receipt showing all payments with settled balance.'
                      : isFullyPaid
                        ? 'Individual receipt for a single payment.'
                        : 'Progress receipt. Full receipt unlocks once fully paid.'}
                  </p>

                  <button onClick={handlePrintAll}
                    disabled={printingAll || (receiptType === 'full' && !isFullyPaid)}
                    style={{
                      width: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '8px', padding: '11px',
                      borderRadius: '10px',
                      fontSize: '12px', fontWeight: 700,
                      background: 'rgba(82,196,138,0.12)',
                      color: '#52C48A',
                      border: '1px solid rgba(82,196,138,0.28)',
                      cursor: (printingAll || (receiptType === 'full' && !isFullyPaid)) ? 'not-allowed' : 'pointer',
                      opacity: (printingAll || (receiptType === 'full' && !isFullyPaid)) ? 0.38 : 1,
                      transition: 'all 0.15s',
                    }}>
                    {printingAll
                      ? <><Spin /> Generating…</>
                      : <><FileDown size={14} /> Download {receiptType === 'full' ? 'Full' : 'Partial'} Receipt</>}
                  </button>
                </div>
              )}

              {/* Verified payments summary */}
              {verified.length > 0 && (
                <div>
                  <SectionLabel>Verified ({verified.length})</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                    {verified.map(p => (
                      <div key={p.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 11px', borderRadius: '9px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(82,196,138,0.12)',
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
                            {METHOD_LABELS[p.method] ?? p.method} · {formatDate(p.createdAt!)}
                          </span>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#52C48A' }}>
                          {formatCurrency(p.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function StatPill({ label, value, color, accent }: { label: string; value: string; color: string; accent?: boolean }) {
  return (
    <div style={{
      padding: '8px 14px', borderRadius: '10px',
      background: accent ? `${color}10` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${accent ? color + '25' : 'rgba(255,255,255,0.07)'}`,
    }}>
      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: 'clamp(13px, 1.5vw, 15px)', fontWeight: 800, color, letterSpacing: '-0.3px' }}>{value}</div>
    </div>
  );
}

function InfoChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      fontSize: 'clamp(10px, 1vw, 11px)',
      color: 'rgba(255,255,255,0.28)',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      padding: '4px 10px', borderRadius: '20px',
    }}>
      {icon} {label}
    </span>
  );
}

function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
      <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
        {children}
      </span>
      {count !== undefined && (
        <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' }}>
          {count}
        </span>
      )}
    </div>
  );
}

function BreakdownRow({ label, value, valueColor, bold, dimmed }: {
  label: string; value: string; valueColor?: string; bold?: boolean; dimmed?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: '7px', background: bold ? 'rgba(255,255,255,0.04)' : 'transparent' }}>
      <span style={{ fontSize: '12px', color: dimmed ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.45)', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontSize: bold ? '14px' : '12px', fontWeight: bold ? 800 : 600, color: valueColor ?? 'rgba(255,255,255,0.7)', letterSpacing: '-0.2px' }}>{value}</span>
    </div>
  );
}

function Banner({ icon, color, msg, sub }: { icon: React.ReactNode; color: string; msg: string; sub?: string }) {
  return (
    <div style={{
      padding: '10px 13px', borderRadius: '10px',
      background: `${color}0C`, border: `1px solid ${color}22`,
      display: 'flex', alignItems: 'flex-start', gap: '9px',
    }}>
      <span style={{ color, flexShrink: 0, marginTop: '1px' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '12px', color, fontWeight: 600 }}>{msg}</div>
        {sub && <div style={{ fontSize: '10.5px', color: `${color}85`, marginTop: '2px' }}>{sub}</div>}
      </div>
    </div>
  );
}