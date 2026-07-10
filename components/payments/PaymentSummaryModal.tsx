'use client';

import React, { useState, useEffect } from 'react';
import {
  X, FileDown, Loader2, AlertTriangle, CheckCircle,
  XCircle, Eye, RotateCcw, BedDouble, CalendarCheck, Users, Waves,
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
  cash:          '#16a34a',
  gcash:         '#2563eb',
  bank_transfer: '#d97706',
  credit_card:   '#7c3aed',
  maya:          '#0284c7',
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  verified: <CheckCircle size={11} />,
  pending:  <AlertTriangle size={11} />,
  rejected: <XCircle size={11} />,
  refunded: <RotateCcw size={11} />,
};
const STATUS_COLOR: Record<string, string> = {
  verified: '#16a34a',
  pending:  '#d97706',
  rejected: '#dc2626',
  refunded: '#7c3aed',
};
const STATUS_BG: Record<string, string> = {
  verified: '#f0fdf4',
  pending:  '#fffbeb',
  rejected: '#fef2f2',
  refunded: '#f5f3ff',
};
const STATUS_BORDER: Record<string, string> = {
  verified: '#bbf7d0',
  pending:  '#fde68a',
  rejected: '#fecaca',
  refunded: '#ddd6fe',
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
function ProgressArc({ percent, status, size = 80 }: { percent: number; status: string; size?: number }) {
  const R = size * 0.38;
  const STROKE = size * 0.07;
  const C = 2 * Math.PI * R;
  const filled = C * Math.min(percent, 100) / 100;
  const color = STATUS_COLOR[status === 'fully_paid' ? 'verified' : status] ?? '#16a34a';
  const isSettled = status === 'fully_paid' || status === 'overpaid';
  const cx = size / 2, cy = size / 2;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#e5e7eb" strokeWidth={STROKE} />
        <circle cx={cx} cy={cy} r={R} fill="none"
          stroke={color} strokeWidth={STROKE}
          strokeDasharray={`${filled} ${C}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 800, color, lineHeight: 1, letterSpacing: '-1px' }}>
          {isSettled ? '✓' : `${Math.round(percent)}%`}
        </span>
        <span style={{ fontSize: size * 0.11, color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '1px' }}>
          {isSettled ? 'Settled' : 'Paid'}
        </span>
      </div>
    </div>
  );
}

// ── Payment card ──────────────────────────────────────────────────────────────
function PaymentCard({
  p, actioningId,
  onVerify, onReject, onViewProof, onRefund,
}: {
  p: Payment;
  actioningId: number | null;
  onVerify?: (p: Payment) => void;
  onReject?: (p: Payment) => void;
  onViewProof?: (p: Payment) => void;
  onRefund?: (p: Payment) => void;
}) {
  const isActioning = actioningId === p.id;
  const sc = STATUS_COLOR[p.status] ?? '#6b7280';
  const sbg = STATUS_BG[p.status] ?? '#f9fafb';
  const sborder = STATUS_BORDER[p.status] ?? '#e5e7eb';
  const mc = METHOD_COLORS[p.method] ?? '#6b7280';

  return (
    <div style={{
      borderRadius: '12px',
      background: '#ffffff',
      border: `1px solid ${sborder}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      {/* Top accent strip */}
      <div style={{ height: '3px', background: sc, borderRadius: '12px 12px 0 0' }} />

      <div style={{ padding: '14px 16px' }}>
        {/* Amount + Status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '17px', fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>
            {formatCurrency(p.amount)}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontSize: '11px', fontWeight: 600, color: sc,
            padding: '3px 10px', borderRadius: '20px',
            background: sbg, border: `1px solid ${sborder}`,
          }}>
            {STATUS_ICON[p.status]}
            {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
          </span>
        </div>

        {/* Tags + meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <span style={{
            fontSize: '10px', padding: '2px 8px', borderRadius: '6px',
            fontWeight: 600, background: `${mc}12`, color: mc,
            border: `1px solid ${mc}25`,
          }}>
            {METHOD_LABELS[p.method] ?? p.method}
          </span>
          <span style={{
            fontSize: '10px', padding: '2px 8px', borderRadius: '6px',
            background: '#f3f4f6', color: '#6b7280', fontWeight: 500,
            border: '1px solid #e5e7eb',
          }}>
            {PAYMENT_TYPE_LABELS[p.paymentType ?? 'full'] ?? p.paymentType}
          </span>
          {p.notes?.includes('website') && (
            <span style={{
              fontSize: '9px', padding: '2px 7px', borderRadius: '5px',
              background: '#eff6ff', color: '#2563eb', fontWeight: 600,
              border: '1px solid #bfdbfe',
            }}>web</span>
          )}
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {p.referenceNumber && (
              <span style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'monospace' }}>
                ref: {p.referenceNumber}
              </span>
            )}
            <span style={{ fontSize: '10px', color: '#9ca3af' }}>
              {formatDate(p.createdAt!)}
            </span>
          </span>
        </div>

        {/* Actions */}
        {p.status === 'pending' && (onVerify || onReject || onViewProof) && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid #f3f4f6' }}>
            {p.proofUrl && onViewProof && <ActionBtn onClick={() => onViewProof(p)} color="#2563eb" icon={<Eye size={10} />} label="View Proof" />}
            {onVerify && <ActionBtn onClick={() => onVerify(p)} color="#16a34a" icon={isActioning ? <Spin /> : <CheckCircle size={10} />} label="Verify" disabled={isActioning} />}
            {onReject && <ActionBtn onClick={() => onReject(p)} color="#dc2626" icon={isActioning ? <Spin /> : <XCircle size={10} />} label="Reject" disabled={isActioning} />}
          </div>
        )}
        {p.status === 'verified' && onRefund && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #f3f4f6' }}>
            <ActionBtn onClick={() => onRefund(p)} color="#7c3aed" icon={<RotateCcw size={10} />} label="Refund" disabled={isActioning} />
          </div>
        )}
        {p.status === 'rejected' && onRefund && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: '11px', color: '#dc262680', fontStyle: 'italic', flex: 1 }}>Payment rejected</span>
            <ActionBtn onClick={() => onRefund(p)} color="#7c3aed" icon={<RotateCcw size={10} />} label="Mark Refunded" disabled={isActioning} />
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
      padding: '5px 12px', borderRadius: '7px',
      fontSize: '11px', fontWeight: 600, color,
      background: `${color}0F`, border: `1px solid ${color}30`,
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

  const [printingAll, setPrintingAll] = useState(false);
  const [receiptType, setReceiptType] = useState<'partial' | 'full'>('partial');
  const [activeTab, setActiveTab] = useState<'payments' | 'summary'>('payments');
  const isMobile = useIsMobile(700);

  const summary     = reservation ? getReservationPaymentSummary(reservation, payments) : null;
  const isFullyPaid = summary ? summary.status === 'fully_paid' || summary.status === 'overpaid' : false;
  const nights      = reservation ? calculateNights(reservation.checkIn, reservation.checkOut) : 0;
  const paidColor   = isFullyPaid ? '#16a34a' : '#d97706';

  const verified = payments.filter(p => p.status === 'verified');
  const pending  = payments.filter(p => p.status === 'pending');
  const rejected = payments.filter(p => p.status === 'rejected');
  const sorted   = [...payments].sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());

  const guestName = (() => {
    const g = reservation?.guest;
    return (g ? `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim() : '') || reservation?.guestName || 'Payment Summary';
  })();

  async function handlePrintAll() {
    if (!verified.length) return;
    setPrintingAll(true);
    try {
      const anchor = verified[0];
      await generateReceiptPDF(anchor, reservation, payments.filter(p => p.id !== anchor.id));
    } finally { setPrintingAll(false); }
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const balance = summary?.balance ?? 0;
  const totalPaid = summary?.totalPaid ?? 0;
  const totalAmount = summary?.totalAmount ?? 0;
  const totalPending = summary?.totalPending ?? 0;

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.97) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .psm-scroll::-webkit-scrollbar { width: 4px; }
        .psm-scroll::-webkit-scrollbar-track { background: transparent; }
        .psm-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
      `}</style>

      {/* Overlay — flex column so modal can be centered but also scrollable */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(15,23,42,0.5)',
          backdropFilter: 'blur(8px)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: isMobile ? 'stretch' : 'flex-start',
          padding: isMobile ? '0' : '20px',
        }}
      >
        {/* Modal */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '980px',
            /* Let height be driven by viewport, shrinks at low zoom, grows at high zoom */
            height: isMobile ? '100dvh' : 'calc(100dvh - 40px)',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            background: '#ffffff',
            borderRadius: isMobile ? '0' : '16px',
            overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
            animation: 'modalIn 0.2s ease-out',
            /* Centers vertically when viewport is taller than modal */
            margin: isMobile ? '0' : 'auto',
            flexShrink: 0,
          }}
        >
          {/* ── HEADER ─────────────────────────────────────────────────────── */}
          <div style={{
            flexShrink: 0,
            background: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            padding: isMobile ? '14px 16px' : '18px 28px',
          }}>
            {/* Top bar: code + close */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Waves size={14} style={{ color: '#9ca3af' }} />
                {reservation?.confirmationCode && (
                  <span style={{
                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
                    color: '#6b7280', background: '#f3f4f6',
                    padding: '3px 10px', borderRadius: '20px',
                    border: '1px solid #e5e7eb',
                  }}>
                    {reservation.confirmationCode}
                  </span>
                )}
              </div>
              <button onClick={onClose} style={{
                background: '#f3f4f6', border: '1px solid #e5e7eb',
                borderRadius: '9px', width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#6b7280', transition: 'all 0.15s',
              }}>
                <X size={14} />
              </button>
            </div>

            {/* Guest name + arc */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{
                  margin: '0 0 2px',
                  fontSize: isMobile ? '22px' : '26px',
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '-0.6px',
                  lineHeight: 1.1,
                }}>
                  {guestName}
                </h2>
                {reservation?.guest?.email && (
                  <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#9ca3af' }}>
                    {reservation.guest.email}
                  </p>
                )}

                {/* Stat cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                  gap: '8px',
                }}>
                  {[
                    { label: 'Total',   value: formatCurrency(totalAmount),  color: '#374151', bg: '#f9fafb', border: '#e5e7eb' },
                    { label: 'Paid',    value: formatCurrency(totalPaid),    color: paidColor, bg: isFullyPaid ? '#f0fdf4' : '#fffbeb', border: isFullyPaid ? '#bbf7d0' : '#fde68a' },
                    ...(totalPending > 0 ? [{ label: 'Pending', value: formatCurrency(totalPending), color: '#d97706', bg: '#fffbeb', border: '#fde68a' }] : []),
                    { label: 'Balance', value: balance <= 0 ? 'Settled ✓' : formatCurrency(balance), color: balance <= 0 ? '#16a34a' : '#dc2626', bg: balance <= 0 ? '#f0fdf4' : '#fef2f2', border: balance <= 0 ? '#bbf7d0' : '#fecaca' },
                  ].map(stat => (
                    <div key={stat.label} style={{
                      padding: '8px 14px', borderRadius: '10px',
                      background: stat.bg, border: `1px solid ${stat.border}`,
                    }}>
                      <div style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px' }}>
                        {stat.label}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: stat.color, letterSpacing: '-0.3px' }}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Arc gauge */}
              {summary && (
                <ProgressArc
                  percent={summary.percentPaid}
                  status={summary.status}
                  size={isMobile ? 60 : 76}
                />
              )}
            </div>

            {/* Booking chips */}
            {reservation && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '6px',
                marginTop: '14px', paddingTop: '12px',
                borderTop: '1px solid #f3f4f6',
              }}>
                {reservation.room && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', padding: '3px 10px', borderRadius: '20px' }}>
                    <BedDouble size={10} />
                    Room {reservation.room.roomNumber} · {reservation.room.type}
                  </span>
                )}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', padding: '3px 10px', borderRadius: '20px' }}>
                  <CalendarCheck size={10} />
                  {formatDate(reservation.checkIn)} → {formatDate(reservation.checkOut)}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', padding: '3px 10px', borderRadius: '20px' }}>
                  <BedDouble size={10} />
                  {nights} night{nights !== 1 ? 's' : ''}
                </span>
                {reservation.adults && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', padding: '3px 10px', borderRadius: '20px' }}>
                    <Users size={10} />
                    {reservation.adults} adult{reservation.adults !== 1 ? 's' : ''}{reservation.children ? ` +${reservation.children} child${reservation.children !== 1 ? 'ren' : ''}` : ''}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── MOBILE TABS ──────────────────────────────────────────────────── */}
          {isMobile && (
            <div style={{
              flexShrink: 0,
              display: 'flex',
              background: '#ffffff',
              borderBottom: '1px solid #e5e7eb',
            }}>
              {(['payments', 'summary'] as const).map(tab => {
                const active = activeTab === tab;
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    flex: 1, padding: '11px 8px',
                    fontSize: '12px', fontWeight: 700,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: active ? '#0f172a' : '#9ca3af',
                    borderBottom: active ? '2px solid #0f172a' : '2px solid transparent',
                    transition: 'all 0.15s',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {tab === 'payments' ? `Payments (${payments.length})` : 'Summary'}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── BODY ─────────────────────────────────────────────────────────── */}
          <div style={{
            flex: 1,
            minHeight: 0,
            display: isMobile ? 'flex' : 'grid',
            flexDirection: 'column',
            gridTemplateColumns: 'minmax(0,1fr) minmax(280px,340px)',
            overflow: 'hidden',
          }}>

            {/* LEFT — Payments list */}
            <div className="psm-scroll" style={{
              overflowY: 'auto',
              flex: isMobile ? 1 : undefined,
              minHeight: 0,
              display: isMobile && activeTab !== 'payments' ? 'none' : 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: isMobile ? '14px' : '20px 24px',
              background: '#f8fafc',
            }}>
              {/* Section header */}
              {!isMobile && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Payments
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', background: '#f3f4f6', padding: '2px 8px', borderRadius: '20px' }}>
                    {payments.length}
                  </span>
                </div>
              )}

              {/* Alert banners */}
              {pending.length > 0 && (
                <div style={{
                  padding: '10px 13px', borderRadius: '10px',
                  background: '#fffbeb', border: '1px solid #fde68a',
                  display: 'flex', alignItems: 'center', gap: '9px',
                }}>
                  <AlertTriangle size={13} style={{ color: '#d97706', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: '#92400e', fontWeight: 500 }}>
                    {pending.length} payment{pending.length !== 1 ? 's' : ''} awaiting verification
                  </span>
                </div>
              )}
              {rejected.length > 0 && (
                <div style={{
                  padding: '10px 13px', borderRadius: '10px',
                  background: '#fef2f2', border: '1px solid #fecaca',
                  display: 'flex', alignItems: 'center', gap: '9px',
                }}>
                  <XCircle size={13} style={{ color: '#dc2626', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: '#991b1b', fontWeight: 500 }}>
                    {rejected.length} rejected payment{rejected.length !== 1 ? 's' : ''}
                    {onRefund && ' · Mark as refunded below if a refund was issued.'}
                  </span>
                </div>
              )}

              {/* Payment cards */}
              {sorted.map(p => (
                <PaymentCard
                  key={p.id} p={p}
                  actioningId={actioningId}
                  onVerify={onVerify} onReject={onReject}
                  onViewProof={onViewProof} onRefund={onRefund}
                />
              ))}

              {payments.length === 0 && (
                <div style={{
                  textAlign: 'center', padding: '60px 0',
                  color: '#9ca3af', fontSize: '13px',
                }}>
                  No payments recorded yet.
                </div>
              )}
            </div>

            {/* RIGHT — Summary panel */}
            <div className="psm-scroll" style={{
              overflowY: 'auto',
              flex: isMobile ? 1 : undefined,
              minHeight: 0,
              display: isMobile && activeTab !== 'summary' ? 'none' : 'flex',
              flexDirection: 'column',
              gap: '14px',
              padding: isMobile ? '14px' : '20px',
              background: '#ffffff',
              borderLeft: isMobile ? 'none' : '1px solid #e5e7eb',
            }}>

              {/* Breakdown section */}
              {summary && (
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                    Breakdown
                  </p>
                  <div style={{ borderRadius: '10px', border: '1px solid #e5e7eb', overflow: 'hidden', background: '#f9fafb' }}>
                    {[
                      { label: 'Subtotal', value: formatCurrency(totalAmount), color: '#374151', bold: false },
                      { label: 'Verified payments', value: `−${formatCurrency(totalPaid)}`, color: '#16a34a', bold: false },
                      ...(totalPending > 0 ? [{ label: 'Pending (unverified)', value: formatCurrency(totalPending), color: '#d97706', bold: false }] : []),
                    ].map((row, i, arr) => (
                      <div key={row.label} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '9px 12px',
                        borderBottom: i < arr.length - 1 ? '1px solid #e5e7eb' : 'none',
                      }}>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>{row.label}</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: row.color }}>{row.value}</span>
                      </div>
                    ))}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px',
                      background: balance <= 0 ? '#f0fdf4' : '#fef2f2',
                      borderTop: '1px solid #e5e7eb',
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>Balance due</span>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: balance <= 0 ? '#16a34a' : '#dc2626', letterSpacing: '-0.3px' }}>
                        {balance <= 0 ? 'Settled ✓' : formatCurrency(balance)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Receipt section */}
              {verified.length > 0 && (
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                    Print Receipt
                  </p>
                  <div style={{ borderRadius: '10px', border: '1px solid #e5e7eb', padding: '14px', background: '#f9fafb', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
                      {(['partial', 'full'] as const).map(type => {
                        const active = receiptType === type;
                        const disabled = type === 'full' && !isFullyPaid;
                        return (
                          <button key={type} onClick={() => !disabled && setReceiptType(type)} disabled={disabled}
                            title={disabled ? 'Only available when fully paid' : undefined}
                            style={{
                              padding: '9px 8px', borderRadius: '8px',
                              fontSize: '12px', fontWeight: 600,
                              cursor: disabled ? 'not-allowed' : 'pointer',
                              background: active ? '#0f172a' : '#ffffff',
                              color: active ? '#ffffff' : disabled ? '#d1d5db' : '#6b7280',
                              border: active ? '1px solid #0f172a' : '1px solid #e5e7eb',
                              opacity: disabled ? 0.5 : 1,
                              transition: 'all 0.15s', textAlign: 'center',
                            }}>
                            {type === 'partial' ? '📄 Partial' : '✅ Full'}
                          </button>
                        );
                      })}
                    </div>

                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>
                      {receiptType === 'full'
                        ? 'Consolidated receipt. Shows all verified payments.'
                        : isFullyPaid
                          ? 'Single payment receipt.'
                          : 'Progress receipt. Full receipt available once fully paid.'}
                    </p>

                    <button onClick={handlePrintAll}
                      disabled={printingAll || (receiptType === 'full' && !isFullyPaid)}
                      style={{
                        width: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '7px', padding: '11px',
                        borderRadius: '9px',
                        fontSize: '12px', fontWeight: 700,
                        background: '#0f172a', color: '#ffffff',
                        border: 'none',
                        cursor: (printingAll || (receiptType === 'full' && !isFullyPaid)) ? 'not-allowed' : 'pointer',
                        opacity: (printingAll || (receiptType === 'full' && !isFullyPaid)) ? 0.4 : 1,
                        transition: 'all 0.15s',
                      }}>
                      {printingAll
                        ? <><Spin /> Generating…</>
                        : <><FileDown size={14} /> Download {receiptType === 'full' ? 'Full' : 'Partial'} Receipt</>}
                    </button>
                  </div>
                </div>
              )}

              {/* Verified payments list */}
              {verified.length > 0 && (
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                    Verified ({verified.length})
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {verified.map(p => (
                      <div key={p.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '9px 12px', borderRadius: '9px',
                        background: '#f0fdf4', border: '1px solid #bbf7d0',
                      }}>
                        <span style={{ fontSize: '11px', color: '#374151' }}>
                          {METHOD_LABELS[p.method] ?? p.method} · {formatDate(p.createdAt!)}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>
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