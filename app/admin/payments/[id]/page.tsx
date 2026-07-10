'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, FileDown, Loader2, AlertTriangle, CheckCircle,
  XCircle, Eye, RotateCcw, BedDouble, CalendarCheck, Users, Waves,
  CheckSquare,
} from 'lucide-react';
import { Payment, Reservation } from '@/types';
import { formatCurrency, formatDate, calculateNights } from '@/lib/utils';
import { generateReceiptPDF } from '@/lib/generateReceipt';
import {
  getReservationPaymentSummary,
  PAYMENT_TYPE_LABELS,
} from '@/lib/payments';
import { useNotifications } from '@/components/providers/NotificationProvider';

// ── Constants ─────────────────────────────────────────────────────────────────
const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', gcash: 'GCash', bank_transfer: 'Bank Transfer',
  credit_card: 'Credit Card', maya: 'Maya',
};
const METHOD_COLORS: Record<string, string> = {
  cash: '#7FAE93', gcash: '#8CB9CE', bank_transfer: '#D2A24C',
  credit_card: '#A79BC9', maya: '#8CB9CE',
};
const STATUS_COLOR: Record<string, string> = {
  verified: '#7FAE93', pending: '#D2A24C',
  rejected: '#E07878', refunded: '#A79BC9',
};
const STATUS_BG: Record<string, string> = {
  verified: 'rgba(127,174,147,0.12)', pending: 'rgba(210,162,76,0.12)',
  rejected: 'rgba(220,120,120,0.12)', refunded: 'rgba(167,155,201,0.12)',
};
const STATUS_BORDER: Record<string, string> = {
  verified: 'rgba(127,174,147,0.3)', pending: 'rgba(210,162,76,0.3)',
  rejected: 'rgba(220,120,120,0.3)',  refunded: 'rgba(167,155,201,0.3)',
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  verified: <CheckCircle size={12} />,
  pending:  <AlertTriangle size={12} />,
  rejected: <XCircle size={12} />,
  refunded: <RotateCcw size={12} />,
};

// ── Arc gauge ─────────────────────────────────────────────────────────────────
function ProgressArc({ percent, status, size = 100 }: { percent: number; status: string; size?: number }) {
  const R = size * 0.38;
  const STROKE = size * 0.07;
  const C = 2 * Math.PI * R;
  const filled = C * Math.min(percent, 100) / 100;
  const color = STATUS_COLOR[status === 'fully_paid' ? 'verified' : status] ?? '#7FAE93';
  const isSettled = status === 'fully_paid' || status === 'overpaid';
  const cx = size / 2, cy = size / 2;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--border)" strokeWidth={STROKE} />
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
        <span style={{ fontSize: size * 0.11, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '1px' }}>
          {isSettled ? 'Settled' : 'Paid'}
        </span>
      </div>
    </div>
  );
}

// ── Verify modal ──────────────────────────────────────────────────────────────
function VerifyModal({
  payment, onClose, onConfirm, loading,
}: {
  payment: Payment;
  onClose: () => void;
  onConfirm: (amount: string, note: string) => Promise<void>;
  loading: boolean;
}) {
  const [amount, setAmount] = useState(parseFloat(String(payment.amount)).toFixed(2));
  const [note, setNote] = useState('');
  const original = parseFloat(String(payment.amount));
  const actual = parseFloat(amount || '0');
  const diff = actual - original;
  const hasDiff = Math.abs(diff) > 0.01;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={() => !loading && onClose()} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
      <div style={{ position: 'relative', background: 'var(--bg-surface)', borderRadius: '16px', width: '100%', maxWidth: '420px', padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>✅ Verify Payment</h3>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Confirm the actual amount received for{' '}
          <strong style={{ color: 'var(--accent)' }}>{payment.reservation?.confirmationCode}</strong>
        </p>
        <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', background: STATUS_BG.verified, border: STATUS_BORDER.verified, fontSize: '13px', color: 'var(--text-secondary)' }}>
          Guest submitted: <strong style={{ color: 'var(--text-primary)' }}>₱{original.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
          {' · '}{payment.method?.replace('_', ' ')}
          {payment.referenceNumber ? ` · Ref: ${payment.referenceNumber}` : ''}
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Actual Amount Received (₱)</label>
          <input
            type="number" min="0" step="0.01" value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: `1px solid ${hasDiff ? 'rgba(210,162,76,0.5)' : 'var(--border)'}`, background: 'var(--bg-input, var(--bg-hover))', color: 'var(--text-primary)', fontSize: '16px', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        {hasDiff && (
          <div style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(210,162,76,0.08)', border: '1px solid rgba(210,162,76,0.3)', fontSize: '12px', color: '#D2A24C' }}>
            <div style={{ marginBottom: '6px' }}>
              ⚠️ {diff > 0
                ? `₱${Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2 })} more than submitted (overpayment)`
                : `₱${Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2 })} less than submitted (underpayment)`}
            </div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#D2A24C', display: 'block', marginBottom: '4px' }}>Reason (optional)</label>
            <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
              placeholder="e.g. Guest short-paid, accepted partial..."
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(210,162,76,0.3)', background: 'rgba(210,162,76,0.05)', color: 'var(--text-primary)', fontSize: '12px', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading} style={{ fontSize: '13px' }}>Cancel</button>
          <button onClick={() => onConfirm(amount, note)}
            disabled={loading || !amount || parseFloat(amount) <= 0}
            className="btn"
            style={{ fontSize: '13px', background: 'rgba(127,174,147,0.15)', color: '#7FAE93', border: '1px solid rgba(127,174,147,0.3)', minWidth: '130px' }}>
            {loading ? <><Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Verifying…</> : '✅ Confirm & Verify'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Payment card ──────────────────────────────────────────────────────────────
function PaymentCard({
  p, actioningId, onVerify, onReject, onViewProof, onRefund,
}: {
  p: Payment; actioningId: number | null;
  onVerify?: (p: Payment) => void;
  onReject?: (p: Payment) => void;
  onViewProof?: (p: Payment) => void;
  onRefund?: (p: Payment) => void;
}) {
  const isActioning = actioningId === p.id;
  const sc = STATUS_COLOR[p.status] ?? 'var(--text-muted)';
  const sbg = STATUS_BG[p.status] ?? 'transparent';
  const sborder = STATUS_BORDER[p.status] ?? 'var(--border)';
  const mc = METHOD_COLORS[p.method] ?? 'var(--text-muted)';

  return (
    <div style={{ borderRadius: '12px', background: 'var(--bg-surface)', border: `1px solid ${sborder}`, overflow: 'hidden' }}>
      <div style={{ height: '3px', background: sc }} />
      <div style={{ padding: '16px 18px' }}>
        {/* Amount + Status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            {formatCurrency(p.amount)}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            fontSize: '12px', fontWeight: 600, color: sc,
            padding: '4px 12px', borderRadius: '20px', background: sbg, border: `1px solid ${sborder}`,
          }}>
            {STATUS_ICON[p.status]}
            {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
          </span>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', fontWeight: 600, background: `${mc}18`, color: mc, border: `1px solid ${mc}30` }}>
            {METHOD_LABELS[p.method] ?? p.method}
          </span>
          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', background: 'var(--bg-hover)', color: 'var(--text-secondary)', fontWeight: 500, border: '1px solid var(--border)' }}>
            {PAYMENT_TYPE_LABELS[p.paymentType ?? 'full'] ?? p.paymentType}
          </span>
          {p.notes?.includes('website') && (
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '5px', background: 'rgba(140,185,206,0.12)', color: '#8CB9CE', fontWeight: 600, border: '1px solid rgba(140,185,206,0.25)' }}>web</span>
          )}
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {p.referenceNumber && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ref: {p.referenceNumber}</span>
            )}
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(p.createdAt!)}</span>
          </span>
        </div>

        {/* Actions */}
        {p.status === 'pending' && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
            {p.proofUrl && onViewProof && (
              <button onClick={() => onViewProof(p)} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#8CB9CE', background: 'rgba(140,185,206,0.1)', border: '1px solid rgba(140,185,206,0.3)', cursor: 'pointer' }}>
                <Eye size={12} /> View Proof
              </button>
            )}
            {onVerify && (
              <button onClick={() => onVerify(p)} disabled={isActioning} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#7FAE93', background: 'rgba(127,174,147,0.1)', border: '1px solid rgba(127,174,147,0.3)', cursor: isActioning ? 'not-allowed' : 'pointer', opacity: isActioning ? 0.5 : 1 }}>
                {isActioning ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle size={12} />} Verify
              </button>
            )}
            {onReject && (
              <button onClick={() => onReject(p)} disabled={isActioning} className="btn btn-danger" style={{ padding: '6px 14px', fontSize: '12px', opacity: isActioning ? 0.5 : 1 }}>
                {isActioning ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <XCircle size={12} />} Reject
              </button>
            )}
          </div>
        )}
        {p.status === 'verified' && onRefund && (
          <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
            <button onClick={() => onRefund(p)} disabled={isActioning} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#A79BC9', background: 'rgba(167,155,201,0.1)', border: '1px solid rgba(167,155,201,0.3)', cursor: 'pointer' }}>
              <RotateCcw size={12} /> Refund
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Proof modal ───────────────────────────────────────────────────────────────
function ProofModal({ payment, onClose, onVerify, onReject, actioningId }: {
  payment: Payment; onClose: () => void;
  onVerify: (p: Payment) => void; onReject: (p: Payment) => void;
  actioningId: number | null;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', padding: '24px', maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Proof of Payment</h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              {payment.reservation?.confirmationCode} · {payment.referenceNumber}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '6px', fontSize: '18px', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-hover)', borderRadius: '10px', fontSize: '13px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Amount: </span><strong style={{ color: '#7FAE93' }}>{formatCurrency(payment.amount)}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Method: </span><strong style={{ color: 'var(--text-primary)' }}>{METHOD_LABELS[payment.method]}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Ref #: </span><strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{payment.referenceNumber || '—'}</strong></div>
        </div>
        {payment.proofUrl ? (
          payment.proofUrl.startsWith('data:image') ? (
            <img src={payment.proofUrl} alt="Proof of payment" style={{ width: '100%', borderRadius: '10px', border: '1px solid var(--border)', display: 'block' }} />
          ) : payment.proofUrl.startsWith('data:application/pdf') ? (
            <div style={{ textAlign: 'center', padding: '32px', background: 'var(--bg-hover)', borderRadius: '10px' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>PDF proof of payment</p>
              <a href={payment.proofUrl} download={`proof-${payment.reservation?.confirmationCode}.pdf`} className="btn btn-ghost" style={{ fontSize: '13px' }}>⬇ Download PDF</a>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px', background: 'var(--bg-hover)', borderRadius: '10px' }}>
              <p style={{ color: 'var(--text-muted)' }}>Preview not available.</p>
            </div>
          )
        ) : (
          <div style={{ textAlign: 'center', padding: '32px', background: 'var(--bg-hover)', borderRadius: '10px' }}>
            <p style={{ color: 'var(--text-muted)' }}>No proof uploaded.</p>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button onClick={() => { onVerify(payment); onClose(); }} disabled={actioningId === payment.id} className="btn"
            style={{ flex: 1, background: 'rgba(127,174,147,0.1)', color: '#7FAE93', border: '1px solid rgba(127,174,147,0.3)', fontSize: '13px' }}>
            <CheckCircle size={13} /> Verify Payment
          </button>
          <button onClick={() => { onReject(payment); onClose(); }} disabled={actioningId === payment.id} className="btn btn-danger" style={{ flex: 1, fontSize: '13px' }}>
            <XCircle size={13} /> Reject
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reservationId = params?.id as string;
  const { showToast, addNotification } = useNotifications();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [reservation, setReservation] = useState<Reservation | undefined>();
  const [loading, setLoading] = useState(true);

  // Action states
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<Payment | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [proofTarget, setProofTarget] = useState<Payment | null>(null);
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [printingAll, setPrintingAll] = useState(false);
  const [receiptType, setReceiptType] = useState<'partial' | 'full'>('partial');

  // Post-verify receipt flash
  const [justVerified, setJustVerified] = useState(false);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payments', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed');
      const data: Payment[] = await res.json();

      // Filter by reservationId
      const rid = parseInt(reservationId, 10);
      const filtered = isNaN(rid)
        ? data
        : data.filter(p => p.reservationId === rid);

      const sorted = filtered.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
      setPayments(sorted);
      if (sorted[0]?.reservation) setReservation(sorted[0].reservation);
    } catch {
      showToast({ title: 'Error', description: 'Could not load payments.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [reservationId, showToast]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const summary = reservation ? getReservationPaymentSummary(reservation, payments) : null;
  const isFullyPaid = summary?.status === 'fully_paid' || summary?.status === 'overpaid';
  const nights = reservation ? calculateNights(reservation.checkIn, reservation.checkOut) : 0;

  const verified = payments.filter(p => p.status === 'verified');
  const pending  = payments.filter(p => p.status === 'pending');
  const rejected = payments.filter(p => p.status === 'rejected');

  const balance     = summary?.balance ?? 0;
  const totalPaid   = summary?.totalPaid ?? 0;
  const totalAmount = summary?.totalAmount ?? 0;
  const totalPending = summary?.totalPending ?? 0;
  const paidColor = isFullyPaid ? '#7FAE93' : '#D2A24C';

  const guestName = (() => {
    const g = reservation?.guest;
    return (g ? `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim() : '') || reservation?.guestName || 'Payment Detail';
  })();

  async function handleDecision(payment: Payment, decision: 'verified' | 'rejected') {
    setActioningId(payment.id);
    try {
      const res = await fetch('/api/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payment.id, status: decision }),
      });
      if (!res.ok) throw new Error('Failed');
      const updated: Payment = await res.json();
      setPayments(prev => prev.map(p => p.id === payment.id ? { ...p, ...updated } : p));

      const code = payment.reservation?.confirmationCode || `#${payment.id}`;
      addNotification({
        type: decision === 'verified' ? 'payment_verified' : 'payment_rejected',
        title: decision === 'verified' ? 'Payment verified' : 'Payment rejected',
        message: `${formatCurrency(payment.amount)} for ${code} was marked ${decision}.`,
        entity: 'payment', entityId: payment.id, emailSent: !!payment.reservation?.guest?.email,
      });

      const guestEmail = payment.reservation?.guest?.email;
      if (guestEmail) {
        fetch('/api/notifications/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: decision === 'verified' ? 'payment_verified' : 'payment_rejected', to: guestEmail, payment: { ...payment, status: decision } }),
        }).catch(() => {});
      }

      showToast({
        title: decision === 'verified' ? 'Payment verified ✅' : 'Payment rejected',
        description: guestEmail ? `Guest notified at ${guestEmail}.` : 'Guest has no email on file.',
        variant: decision === 'verified' ? 'success' : 'error',
      });

      // Short loading flash before receipt appears
      if (decision === 'verified') {
        setJustVerified(true);
        setTimeout(() => setJustVerified(false), 1800);
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to update payment status.', variant: 'error' });
    } finally {
      setActioningId(null);
    }
  }

  async function handleVerifyConfirm(amount: string, note: string) {
    if (!verifyTarget) return;
    setVerifying(true);
    try {
      const actualAmount = parseFloat(amount);
      const originalAmount = parseFloat(String(verifyTarget.amount));
      if (Math.abs(actualAmount - originalAmount) > 0.01) {
        const adjustNote = note
          ? `Amount adjusted from ₱${originalAmount.toLocaleString()} to ₱${actualAmount.toLocaleString()}. Note: ${note}`
          : `Amount adjusted from ₱${originalAmount.toLocaleString()} to ₱${actualAmount.toLocaleString()}.`;
        await fetch('/api/payments', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: verifyTarget.id, amount: String(actualAmount), notes: adjustNote }),
        });
      }
      await handleDecision({ ...verifyTarget, amount: String(actualAmount) }, 'verified');
    } finally {
      setVerifying(false);
      setVerifyTarget(null);
    }
  }

  async function handleRefund(payment: Payment) {
    setRefunding(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payment.id, status: 'refunded' }),
      });
      if (!res.ok) throw new Error('Failed');
      const updated: Payment = await res.json();
      setPayments(prev => prev.map(p => p.id === payment.id ? { ...p, ...updated } : p));
      showToast({ title: 'Refund processed', description: `${formatCurrency(payment.amount)} marked as refunded.`, variant: 'success' });
    } catch {
      showToast({ title: 'Error', description: 'Failed to process refund.', variant: 'error' });
    } finally {
      setRefunding(false);
      setRefundTarget(null);
    }
  }

  async function handlePrintAll() {
    if (!verified.length) return;
    setPrintingAll(true);
    try {
      const anchor = verified[0];
      await generateReceiptPDF(anchor, reservation, payments.filter(p => p.id !== anchor.id));
    } finally { setPrintingAll(false); }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <Loader2 size={28} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--text-muted)' }} />
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Back button + header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <button onClick={() => router.push('/admin/payments')} className="btn btn-ghost"
            style={{ padding: '8px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <ArrowLeft size={15} /> Back
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <Waves size={16} style={{ color: 'var(--text-muted)' }} />
              {reservation?.confirmationCode && (
                <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', background: 'var(--bg-hover)', padding: '3px 12px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                  {reservation.confirmationCode}
                </span>
              )}
            </div>
            <h1 style={{ margin: '6px 0 0', fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
              {guestName}
            </h1>
            {reservation?.guest?.email && (
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>{reservation.guest.email}</p>
            )}
          </div>
        </div>

        {/* Stat bar */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { label: 'Total',   value: formatCurrency(totalAmount), color: 'var(--text-primary)', bg: 'var(--bg-surface)', border: 'var(--border)' },
            { label: 'Paid',    value: formatCurrency(totalPaid),   color: paidColor, bg: isFullyPaid ? 'rgba(127,174,147,0.08)' : 'rgba(210,162,76,0.08)', border: isFullyPaid ? 'rgba(127,174,147,0.25)' : 'rgba(210,162,76,0.25)' },
            ...(totalPending > 0 ? [{ label: 'Pending', value: formatCurrency(totalPending), color: '#D2A24C', bg: 'rgba(210,162,76,0.08)', border: 'rgba(210,162,76,0.25)' }] : []),
            { label: 'Balance', value: balance <= 0 ? 'Settled ✓' : formatCurrency(balance), color: balance <= 0 ? '#7FAE93' : '#E07878', bg: balance <= 0 ? 'rgba(127,174,147,0.08)' : 'rgba(220,120,120,0.08)', border: balance <= 0 ? 'rgba(127,174,147,0.25)' : 'rgba(220,120,120,0.25)' },
          ].map(stat => (
            <div key={stat.label} style={{ padding: '10px 16px', borderRadius: '12px', background: stat.bg, border: `1px solid ${stat.border}` }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '3px' }}>{stat.label}</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: stat.color, letterSpacing: '-0.3px' }}>{stat.value}</div>
            </div>
          ))}
          {summary && (
            <div style={{ marginLeft: 'auto' }}>
              <ProgressArc percent={summary.percentPaid} status={summary.status} size={72} />
            </div>
          )}
        </div>

        {/* Booking chips */}
        {reservation && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {reservation.room && (
              <span className="surface" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: '20px' }}>
                <BedDouble size={11} /> Room {reservation.room.roomNumber} · {reservation.room.type}
              </span>
            )}
            <span className="surface" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: '20px' }}>
              <CalendarCheck size={11} /> {formatDate(reservation.checkIn)} → {formatDate(reservation.checkOut)}
            </span>
            <span className="surface" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: '20px' }}>
              <BedDouble size={11} /> {nights} night{nights !== 1 ? 's' : ''}
            </span>
            {reservation.adults && (
              <span className="surface" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: '20px' }}>
                <Users size={11} /> {reservation.adults} adult{reservation.adults !== 1 ? 's' : ''}{reservation.children ? ` +${reservation.children} child${reservation.children !== 1 ? 'ren' : ''}` : ''}
              </span>
            )}
          </div>
        )}

        {/* Body: two columns on desktop */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: '16px', alignItems: 'start' }}>

          {/* LEFT — Payments */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Payments ({payments.length})
            </div>

            {/* Alert banners */}
            {pending.length > 0 && (
              <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(210,162,76,0.08)', border: '1px solid rgba(210,162,76,0.25)', display: 'flex', alignItems: 'center', gap: '9px' }}>
                <AlertTriangle size={14} style={{ color: '#D2A24C', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {pending.length} payment{pending.length !== 1 ? 's' : ''} awaiting verification
                </span>
              </div>
            )}
            {rejected.length > 0 && (
              <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(220,120,120,0.08)', border: '1px solid rgba(220,120,120,0.25)', display: 'flex', alignItems: 'center', gap: '9px' }}>
                <XCircle size={14} style={{ color: '#E07878', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {rejected.length} rejected payment{rejected.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {payments.map(p => (
              <PaymentCard key={p.id} p={p} actioningId={actioningId}
                onVerify={p => setVerifyTarget(p)}
                onReject={p => handleDecision(p, 'rejected')}
                onViewProof={p => setProofTarget(p)}
                onRefund={p => setRefundTarget(p)}
              />
            ))}

            {payments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No payments found.
              </div>
            )}
          </div>

          {/* RIGHT — Summary + Receipt */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'sticky', top: '20px' }}>

            {/* Breakdown */}
            {summary && (
              <div className="surface" style={{ borderRadius: '12px', padding: '18px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Breakdown</p>
                <div style={{ borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  {[
                    { label: 'Subtotal', value: formatCurrency(totalAmount), color: 'var(--text-primary)' },
                    { label: 'Verified payments', value: `−${formatCurrency(totalPaid)}`, color: '#7FAE93' },
                    ...(totalPending > 0 ? [{ label: 'Pending (unverified)', value: formatCurrency(totalPending), color: '#D2A24C' }] : []),
                  ].map((row, i, arr) => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.label}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: balance <= 0 ? 'rgba(127,174,147,0.08)' : 'rgba(220,120,120,0.08)', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Balance due</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: balance <= 0 ? '#7FAE93' : '#E07878', letterSpacing: '-0.3px' }}>
                      {balance <= 0 ? 'Settled ✓' : formatCurrency(balance)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Receipt */}
            {verified.length > 0 && (
              <div className="surface" style={{ borderRadius: '12px', padding: '18px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Print Receipt</p>

                {/* Loading flash post-verify */}
                {justVerified ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '20px', animation: 'fadeSlideIn 0.3s ease-out' }}>
                    <CheckSquare size={28} style={{ color: '#7FAE93' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#7FAE93' }}>Payment verified!</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Preparing receipt…</span>
                    <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--text-muted)', marginTop: '4px' }} />
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px', marginBottom: '10px' }}>
                      {(['partial', 'full'] as const).map(type => {
                        const active = receiptType === type;
                        const disabled = type === 'full' && !isFullyPaid;
                        return (
                          <button key={type} onClick={() => !disabled && setReceiptType(type)} disabled={disabled}
                            title={disabled ? 'Only available when fully paid' : undefined}
                            style={{ padding: '9px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', background: active ? 'var(--text-primary)' : 'var(--bg-hover)', color: active ? 'var(--bg-surface)' : disabled ? 'var(--border)' : 'var(--text-secondary)', border: active ? '1px solid var(--text-primary)' : '1px solid var(--border)', opacity: disabled ? 0.5 : 1, transition: 'all 0.15s', textAlign: 'center' }}>
                            {type === 'partial' ? '📄 Partial' : '✅ Full'}
                          </button>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
                      {receiptType === 'full'
                        ? 'Consolidated receipt showing all verified payments.'
                        : isFullyPaid
                          ? 'Single payment receipt.'
                          : 'Progress receipt. Full receipt available once fully paid.'}
                    </p>
                    <button onClick={handlePrintAll}
                      disabled={printingAll || (receiptType === 'full' && !isFullyPaid)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '11px', borderRadius: '9px', fontSize: '13px', fontWeight: 700, background: 'var(--text-primary)', color: 'var(--bg-surface)', border: 'none', cursor: (printingAll || (receiptType === 'full' && !isFullyPaid)) ? 'not-allowed' : 'pointer', opacity: (printingAll || (receiptType === 'full' && !isFullyPaid)) ? 0.4 : 1, transition: 'all 0.15s' }}>
                      {printingAll ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Generating…</> : <><FileDown size={14} /> Download {receiptType === 'full' ? 'Full' : 'Partial'} Receipt</>}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Verified list */}
            {verified.length > 0 && (
              <div className="surface" style={{ borderRadius: '12px', padding: '18px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Verified ({verified.length})</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {verified.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: '8px', background: 'rgba(127,174,147,0.08)', border: '1px solid rgba(127,174,147,0.2)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {METHOD_LABELS[p.method] ?? p.method} · {formatDate(p.createdAt!)}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#7FAE93' }}>
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

      {/* Verify Modal */}
      {verifyTarget && (
        <VerifyModal
          payment={verifyTarget}
          onClose={() => setVerifyTarget(null)}
          onConfirm={handleVerifyConfirm}
          loading={verifying}
        />
      )}

      {/* Proof Modal */}
      {proofTarget && (
        <ProofModal
          payment={proofTarget}
          onClose={() => setProofTarget(null)}
          onVerify={p => setVerifyTarget(p)}
          onReject={p => handleDecision(p, 'rejected')}
          actioningId={actioningId}
        />
      )}

      {/* Refund confirm */}
      {refundTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={() => !refunding && setRefundTarget(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
          <div style={{ position: 'relative', background: 'var(--bg-surface)', borderRadius: '14px', width: '100%', maxWidth: '380px', padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>↩</div>
            <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Process Refund?</h3>
            <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-secondary)' }}>You're about to mark this as <strong>refunded</strong>:</p>
            <div style={{ margin: '12px 0', padding: '12px 14px', borderRadius: '8px', background: 'rgba(167,155,201,0.08)', border: '1px solid rgba(167,155,201,0.25)', fontSize: '13px' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '17px' }}>{formatCurrency(refundTarget.amount)}</div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                {refundTarget.reservation?.confirmationCode ?? `Payment #${refundTarget.id}`}
              </div>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--text-muted)' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setRefundTarget(null)} disabled={refunding} style={{ fontSize: '13px' }}>Cancel</button>
              <button onClick={() => handleRefund(refundTarget)} disabled={refunding} className="btn"
                style={{ fontSize: '13px', background: 'rgba(167,155,201,0.15)', color: '#A79BC9', border: '1px solid rgba(167,155,201,0.3)', minWidth: '110px' }}>
                {refunding ? <><Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Processing…</> : '↩ Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
