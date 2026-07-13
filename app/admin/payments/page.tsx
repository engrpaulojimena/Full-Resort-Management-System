'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CheckCircle, XCircle, Eye, Loader2, FileDown, Plus } from 'lucide-react';
import { PaymentsSkeleton } from '@/components/ui/Skeleton';
import StatusBadge from '@/components/ui/StatusBadge';
import RecordPaymentModal from '@/components/payments/RecordPaymentModal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { generateReceiptPDF } from '@/lib/generateReceipt';
import { PAYMENT_TYPE_LABELS } from '@/lib/payments';
import { useNotifications } from '@/components/providers/NotificationProvider';
import { Payment, Reservation } from '@/types';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', gcash: 'GCash', bank_transfer: 'Bank Transfer', credit_card: 'Credit Card', maya: 'Maya',
};
const METHOD_COLORS: Record<string, string> = {
  cash: '#7FAE93', gcash: '#8CB9CE', bank_transfer: '#A79BC9', credit_card: '#D2A24C', maya: '#8CB9CE',
};

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [refundConfirm, setRefundConfirm] = useState<Payment | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [proofModalPayment, setProofModalPayment] = useState<Payment | null>(null);
  const [verifyConfirm, setVerifyConfirm] = useState<Payment | null>(null);
  const [verifyAmount, setVerifyAmount] = useState('');
  const [verifyNote, setVerifyNote] = useState('');
  const [verifying, setVerifying] = useState(false);
  const { showToast, addNotification } = useNotifications();
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  // ── Responsive: detect mobile width ──────────────────────────────────────
  const [windowW, setWindowW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    const handler = () => setWindowW(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  const isMobile = windowW < 640;

  function toggleGroup(reservationId: number) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(reservationId)) next.delete(reservationId); else next.add(reservationId);
      return next;
    });
  }

  const isMounted = useRef(true);

  const fetchPayments = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const res = await fetch('/api/payments', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed');
      if (!isMounted.current) return;
      const data: Payment[] = await res.json();
      setPayments(data.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
    } catch {
      if (showSpinner) showToast({ title: 'Error', description: 'Could not load payments from database.', variant: 'error' });
    } finally {
      if (isMounted.current && showSpinner) setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    isMounted.current = true;
    fetchPayments(true);

    const interval = setInterval(() => fetchPayments(false), 60_000);
    function onVisible() { if (document.visibilityState === 'visible') fetchPayments(false); }
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchPayments]);

  const filtered = payments.filter(p => {
    const code = p.reservation?.confirmationCode?.toLowerCase() || '';
    const matchSearch = code.includes(search.toLowerCase()) || (p.referenceNumber || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount   = payments.filter(p => p.status === 'pending').length;
  const totalPending   = payments.filter(p => p.status === 'pending').reduce((s, p) => s + parseFloat(p.amount), 0);
  const totalVerified  = payments.filter(p => p.status === 'verified').reduce((s, p) => s + parseFloat(p.amount), 0);

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

      if (decision === 'verified' && payment.reservationId) {
        const reservation = payment.reservation;
        const guestDisplay = reservation?.guestName || `${reservation?.guest?.firstName ?? 'Guest'} ${reservation?.guest?.lastName ?? ''}`.trim();

        if (reservation && (reservation.status === 'pending' || reservation.status === 'confirmed')) {
          const allPayments = payments.map(p => p.id === payment.id ? { ...p, status: 'verified' as const, amount: String(payment.amount) } : p);
          const totalPaid = allPayments
            .filter(p => p.reservationId === payment.reservationId && p.status === 'verified')
            .reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);
          const totalAmount = parseFloat(String(reservation.totalAmount));
          const depositAmount = totalAmount * 0.3;

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const checkInDate = new Date(reservation.checkIn);
          checkInDate.setHours(0, 0, 0, 0);

          if (totalPaid >= totalAmount && checkInDate <= today) {
            await fetch('/api/reservations', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: reservation.id, status: 'checked_in' }),
            }).then(r => {
              if (r.ok) {
                addNotification({ type: 'check_in_today', title: 'Auto Check-in', message: `${guestDisplay} (${reservation.confirmationCode}) was automatically checked in — fully paid.`, entity: 'reservation', entityId: reservation.id, emailSent: false });
                showToast({ title: '✅ Guest auto checked-in', description: `${guestDisplay} is now checked in — full payment received.`, variant: 'success' });
              }
            }).catch(() => {});
          } else if (reservation.status === 'pending' && totalPaid >= depositAmount) {
            await fetch('/api/reservations', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: reservation.id, status: 'confirmed' }),
            }).then(r => {
              if (r.ok) {
                addNotification({ type: 'new_reservation', title: 'Reservation Confirmed', message: `${guestDisplay} (${reservation.confirmationCode}) — deposit verified, reservation auto-confirmed.`, entity: 'reservation', entityId: reservation.id, emailSent: false });
                showToast({ title: '🎉 Reservation confirmed', description: `${guestDisplay}'s deposit verified — booking auto-confirmed.`, variant: 'success' });
              }
            }).catch(() => {});
          }
        }
      }

      const code = payment.reservation?.confirmationCode || `#${payment.id}`;
      await fetch('/api/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'verify', entity: 'payment', entityId: payment.id, description: `Payment of ${formatCurrency(payment.amount)} for ${code} was ${decision}.` }),
      }).catch(() => {});

      addNotification({ type: decision === 'verified' ? 'payment_verified' : 'payment_rejected', title: decision === 'verified' ? 'Payment verified' : 'Payment rejected', message: `${formatCurrency(payment.amount)} for ${code} was marked ${decision}.`, entity: 'payment', entityId: payment.id, emailSent: !!payment.reservation?.guest?.email });

      const guestEmail = payment.reservation?.guest?.email;
      if (guestEmail) {
        fetch('/api/notifications/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: decision === 'verified' ? 'payment_verified' : 'payment_rejected', to: guestEmail, payment: { ...payment, status: decision } }),
        }).catch(() => {});
      }

      showToast({ title: decision === 'verified' ? 'Payment verified' : 'Payment rejected', description: guestEmail ? `Guest notified at ${guestEmail}.` : 'Guest has no email on file.', variant: decision === 'verified' ? 'success' : 'error' });
    } catch {
      showToast({ title: 'Error', description: 'Failed to update payment status.', variant: 'error' });
    } finally {
      setActioningId(null);
    }
  }

  async function handleReceipt(payment: Payment) {
    setGeneratingId(payment.id);
    try {
      const siblings = payment.reservationId ? payments.filter(p => p.reservationId === payment.reservationId) : [];
      await generateReceiptPDF(payment, payment.reservation, siblings);
    } catch {
      showToast({ title: 'Could not generate receipt', description: 'Please try again.', variant: 'error' });
    } finally {
      setGeneratingId(null);
    }
  }

  function handleRecordPayment(payment: Payment) {
    setPayments(prev => [payment, ...prev]);
    const guestEmail = payment.reservation?.guest?.email;
    if (guestEmail) {
      fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'payment_pending', to: guestEmail, payment }),
      }).catch(() => {});
    }
    showToast({ title: 'Payment recorded', description: `${formatCurrency(payment.amount)} logged. Awaiting verification.${guestEmail ? ` Guest notified at ${guestEmail}.` : ''}`, variant: 'success' });
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

      const code = payment.reservation?.confirmationCode || `#${payment.id}`;
      await fetch('/api/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'update', entity: 'payment', entityId: payment.id, description: `Payment of ${formatCurrency(payment.amount)} for ${code} was marked as refunded.` }),
      }).catch(() => {});

      addNotification({ type: 'payment_rejected', title: 'Payment refunded', message: `${formatCurrency(payment.amount)} for ${code} has been marked as refunded.`, entity: 'payment', entityId: payment.id, emailSent: false });
      showToast({ title: 'Refund processed', description: `${formatCurrency(payment.amount)} marked as refunded.`, variant: 'success' });
    } catch {
      showToast({ title: 'Error', description: 'Failed to process refund.', variant: 'error' });
    } finally {
      setRefunding(false);
      setRefundConfirm(null);
    }
  }

  async function handleVerifyConfirm() {
    if (!verifyConfirm) return;
    const actualAmount = parseFloat(verifyAmount);
    if (!actualAmount || actualAmount <= 0) return;
    setVerifying(true);
    try {
      const originalAmount = parseFloat(String(verifyConfirm.amount));
      if (Math.abs(actualAmount - originalAmount) > 0.01) {
        const adjustNote = verifyNote ? `Amount adjusted from ₱${originalAmount.toLocaleString()} to ₱${actualAmount.toLocaleString()}. Note: ${verifyNote}` : `Amount adjusted from ₱${originalAmount.toLocaleString()} to ₱${actualAmount.toLocaleString()}.`;
        await fetch('/api/payments', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: verifyConfirm.id, amount: String(actualAmount), notes: adjustNote }),
        });
      }
      await handleDecision({ ...verifyConfirm, amount: String(actualAmount) }, 'verified');
    } finally {
      setVerifying(false);
      setVerifyConfirm(null);
    }
  }

  if (loading) return <PaymentsSkeleton />;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Summary cards */}
      <div className="grid-cols-3">
        <div className="surface" style={{ borderRadius: '12px', padding: '18px', borderColor: pendingCount > 0 ? 'rgba(210,162,76,0.3)' : 'var(--border)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Pending Verification</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#D2A24C' }}>{pendingCount}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Total: {formatCurrency(totalPending)}</div>
        </div>
        <div className="surface" style={{ borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Verified</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#7FAE93' }}>{payments.filter(p => p.status === 'verified').length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Total: {formatCurrency(totalVerified)}</div>
        </div>
        <div className="surface" style={{ borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Total Payments</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>{payments.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>All time</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['all', 'pending', 'verified', 'rejected', 'refunded'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '6px 14px', fontSize: '12px', textTransform: 'capitalize' }}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div className="search-field">
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by booking code or ref#..." className="input" style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }} autoComplete="off" name="payments-search" />
          </div>
          <button className="btn btn-primary" style={{ height: '36px', fontSize: '12.5px' }} onClick={() => setRecordModalOpen(true)}>
            <Plus size={14} /> Record Payment
          </button>
        </div>
      </div>

      <RecordPaymentModal open={recordModalOpen} onOpenChange={setRecordModalOpen} onCreate={handleRecordPayment} />

      {/* Verify confirmation modal */}
      {verifyConfirm && (() => {
        const original = parseFloat(String(verifyConfirm.amount));
        const actual = parseFloat(verifyAmount || '0');
        const diff = actual - original;
        const hasDiff = Math.abs(diff) > 0.01;
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}>
            <div onClick={() => !verifying && setVerifyConfirm(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
            <div style={{ position: 'relative', background: 'var(--bg-surface)', borderRadius: '16px', width: '100%', maxWidth: '420px', margin: '16px', padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: '1px solid var(--border)' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>✅ Verify Payment</h3>
              <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Confirm the actual amount received for <strong style={{ color: 'var(--accent)' }}>{verifyConfirm.reservation?.confirmationCode}</strong>
                {' — '}{verifyConfirm.reservation?.guestName || `${verifyConfirm.reservation?.guest?.firstName ?? ''} ${verifyConfirm.reservation?.guest?.lastName ?? ''}`.trim() || 'Guest'}
              </p>
              <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(127,174,147,0.06)', border: '1px solid rgba(127,174,147,0.2)', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Guest submitted: <strong style={{ color: 'var(--text-primary)' }}>₱{original.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                {' · '}{verifyConfirm.method?.replace('_', ' ')} {verifyConfirm.referenceNumber ? `· Ref: ${verifyConfirm.referenceNumber}` : ''}
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Actual Amount Received (₱)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={verifyAmount}
                  onChange={e => setVerifyAmount(e.target.value)}
                  style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: `1px solid ${hasDiff ? 'rgba(210,162,76,0.5)' : 'var(--border)'}`, background: 'var(--bg-input, var(--bg-hover))', color: 'var(--text-primary)', fontSize: '15px', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              {hasDiff && (
                <div style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(210,162,76,0.08)', border: '1px solid rgba(210,162,76,0.3)', fontSize: '12px', color: '#D2A24C' }}>
                  <div style={{ marginBottom: '6px' }}>
                    ⚠️ {diff > 0 ? `₱${Math.abs(diff).toLocaleString(undefined,{minimumFractionDigits:2})} more than submitted (overpayment)` : `₱${Math.abs(diff).toLocaleString(undefined,{minimumFractionDigits:2})} less than submitted (underpayment)`}
                  </div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#D2A24C', display: 'block', marginBottom: '4px' }}>Reason for adjustment (optional)</label>
                  <textarea rows={2} value={verifyNote} onChange={e => setVerifyNote(e.target.value)}
                    placeholder="e.g. Guest short-paid, accepted partial..."
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(210,162,76,0.3)', background: 'rgba(210,162,76,0.05)', color: 'var(--text-primary)', fontSize: '12px', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setVerifyConfirm(null)} disabled={verifying} style={{ fontSize: '13px' }}>Cancel</button>
                <button onClick={handleVerifyConfirm} disabled={verifying || !verifyAmount || parseFloat(verifyAmount) <= 0} className="btn"
                  style={{ fontSize: '13px', background: 'rgba(127,174,147,0.15)', color: '#7FAE93', border: '1px solid rgba(127,174,147,0.3)', minWidth: '120px' }}>
                  {verifying ? <><Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Verifying…</> : '✅ Confirm & Verify'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Refund confirmation dialog */}
      {refundConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}>
          <div onClick={() => !refunding && setRefundConfirm(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
          <div style={{ position: 'relative', background: 'var(--bg-surface)', borderRadius: '14px', width: '100%', maxWidth: '400px', margin: '16px', padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>↩</div>
            <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Process Refund?</h3>
            <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-secondary)' }}>You're about to mark this payment as <strong>refunded</strong>:</p>
            <div style={{ margin: '12px 0', padding: '10px 14px', borderRadius: '8px', background: 'rgba(186,104,200,0.07)', border: '1px solid rgba(186,104,200,0.2)', fontSize: '13px' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '16px' }}>{formatCurrency(refundConfirm.amount)}</div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                {refundConfirm.reservation?.confirmationCode ?? `Payment #${refundConfirm.id}`}
                {(refundConfirm.reservation?.guestName || refundConfirm.reservation?.guest) && ` · ${refundConfirm.reservation.guestName || `${refundConfirm.reservation.guest?.firstName ?? ''} ${refundConfirm.reservation.guest?.lastName ?? ''}`.trim()}`}
              </div>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--text-muted)' }}>This will change the payment status to <em>refunded</em> and cannot be undone here.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setRefundConfirm(null)} disabled={refunding} style={{ fontSize: '13px' }}>Cancel</button>
              <button onClick={() => handleRefund(refundConfirm)} disabled={refunding} className="btn"
                style={{ fontSize: '13px', background: 'rgba(186,104,200,0.15)', color: '#BA68C8', border: '1px solid rgba(186,104,200,0.3)', minWidth: '110px' }}>
                {refunding ? <><Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Processing…</> : '↩ Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table — grouped by reservation */}
      {(() => {
        const groupMap = new Map<number | string, Payment[]>();
        filtered.forEach(p => {
          const key = p.reservationId ?? `no-res-${p.id}`;
          if (!groupMap.has(key)) groupMap.set(key, []);
          groupMap.get(key)!.push(p);
        });
        const groups = Array.from(groupMap.entries()).map(([key, rows]) => ({
          key,
          reservationId: typeof key === 'number' ? key : null,
          rows: rows.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()),
          reservation: rows[0].reservation,
          guestName: rows[0].reservation?.guestName || (rows[0].reservation?.guest ? `${rows[0].reservation.guest.firstName} ${rows[0].reservation.guest.lastName}`.trim() : '—'),
          totalPaid: rows.filter(r => r.status === 'verified').reduce((s, r) => s + parseFloat(String(r.amount)), 0),
          hasPending: rows.some(r => r.status === 'pending'),
          latestDate: Math.max(...rows.map(r => new Date(r.createdAt!).getTime())),
        })).sort((a, b) => b.latestDate - a.latestDate);

        return (
          <div className="surface" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '28px' }}></th>
                    <th>Booking</th>
                    {/* Hide Guest + Payments columns on mobile — tap row opens summary */}
                    <th style={{ display: isMobile ? 'none' : undefined }}>Guest</th>
                    <th style={{ display: isMobile ? 'none' : undefined }}>Payments</th>
                    <th>Total Verified</th>
                    <th>Latest Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(group => {
                    const isExpanded = expandedGroups.has(group.key as number);
                    const latestPayment = group.rows[group.rows.length - 1];
                    const pendingRows = group.rows.filter(r => r.status === 'pending');
                    const statuses = group.rows.map(r => r.status);
                    const summaryStatus = statuses.includes('pending') ? 'pending'
                      : statuses.includes('rejected') ? 'rejected'
                      : statuses.every(s => s === 'refunded') ? 'refunded'
                      : statuses.some(s => s === 'verified') ? 'verified'
                      : statuses[statuses.length - 1];

                    return (
                      <React.Fragment key={group.key}>
                        <tr
                          onClick={() => group.reservationId && router.push(`/admin/payments/${group.reservationId}`)}
                          style={{ cursor: 'pointer', background: isExpanded ? 'rgba(111,163,154,0.04)' : undefined }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = isExpanded ? 'rgba(111,163,154,0.04)' : ''; }}
                        >
                          <td style={{ textAlign: 'center', padding: '0 4px' }}>
                            {group.rows.length > 1 && (
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', userSelect: 'none' }}>
                                {isExpanded ? '▾' : '▸'}
                              </span>
                            )}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                            {group.reservation?.confirmationCode ?? '—'}
                          </td>
                          {/* Hidden on mobile */}
                          <td style={{ fontSize: '12px', color: 'var(--text-secondary)', display: isMobile ? 'none' : undefined }}>
                            {group.guestName}
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text-muted)', display: isMobile ? 'none' : undefined }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{group.rows.length}</span> payment{group.rows.length !== 1 ? 's' : ''}
                              {group.hasPending && (
                                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(210,162,76,0.12)', color: '#D2A24C', fontWeight: 600 }}>
                                  {pendingRows.length} pending
                                </span>
                              )}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: '#7FAE93', fontSize: '13px' }}>
                            {group.totalPaid > 0 ? formatCurrency(group.totalPaid) : '—'}
                          </td>
                          <td><StatusBadge status={summaryStatus} /></td>
                          <td style={{ fontSize: '12px' }}>{formatDate(latestPayment.createdAt!)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', alignItems: 'center' }}>
                              {/* Quick verify/reject: desktop only — on mobile just tap the row */}
                              {!isMobile && pendingRows.length === 1 && (
                                <>
                                  {pendingRows[0].proofUrl && (
                                    <button onClick={e => { e.stopPropagation(); setProofModalPayment(pendingRows[0]); }} className="btn btn-ghost"
                                      style={{ padding: '4px 10px', fontSize: '11px', height: '28px', background: 'rgba(140,185,206,0.1)', color: '#8CB9CE', border: '1px solid rgba(140,185,206,0.3)' }}>
                                      <Eye size={11} /> Proof
                                    </button>
                                  )}
                                  <button onClick={e => { e.stopPropagation(); setVerifyConfirm(pendingRows[0]); setVerifyAmount(parseFloat(String(pendingRows[0].amount)).toFixed(2)); setVerifyNote(''); }} disabled={actioningId === pendingRows[0].id} className="btn"
                                    style={{ padding: '4px 10px', fontSize: '11px', height: '28px', background: 'rgba(127,174,147,0.1)', color: '#7FAE93', border: '1px solid rgba(127,174,147,0.2)', opacity: actioningId === pendingRows[0].id ? 0.6 : 1 }}>
                                    <CheckCircle size={11} /> Verify
                                  </button>
                                  <button onClick={e => { e.stopPropagation(); handleDecision(pendingRows[0], 'rejected'); }} disabled={actioningId === pendingRows[0].id} className="btn btn-danger"
                                    style={{ padding: '4px 10px', fontSize: '11px', height: '28px', opacity: actioningId === pendingRows[0].id ? 0.6 : 1 }}>
                                    {actioningId === pendingRows[0].id ? <Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite' }} /> : <XCircle size={11} />} Reject
                                  </button>
                                </>
                              )}
                              {/* View button — always visible; on mobile shows pending count badge */}
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  if (group.reservationId) router.push(`/admin/payments/${group.reservationId}`);
                                }}
                                className="btn btn-ghost"
                                style={{ padding: '4px 10px', fontSize: '11px', height: '28px', whiteSpace: 'nowrap' }}>
                                <Eye size={11} />
                                {isMobile
                                  ? pendingRows.length > 0 ? `View (${pendingRows.length})` : 'View'
                                  : pendingRows.length > 1 ? `View & Verify (${pendingRows.length})` : 'View'
                                }
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded sub-rows */}
                        {isExpanded && group.rows.map(p => (
                          <tr key={`sub-${p.id}`} style={{ background: 'rgba(111,163,154,0.025)' }}>
                            <td></td>
                            <td style={{ paddingLeft: '20px' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                #{p.id} · {PAYMENT_TYPE_LABELS[p.paymentType || 'full']}
                                {p.notes?.includes('website') ? <span style={{ marginLeft: '4px', fontSize: '9px', padding: '1px 4px', borderRadius: '3px', background: 'rgba(140,185,206,0.15)', color: '#8CB9CE' }}>web</span> : <span style={{ marginLeft: '4px', fontSize: '9px', padding: '1px 4px', borderRadius: '3px', background: 'rgba(167,155,201,0.15)', color: '#A79BC9' }}>admin</span>}
                              </span>
                            </td>
                            <td style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', display: isMobile ? 'none' : undefined }}>{p.referenceNumber || '—'}</td>
                            <td style={{ display: isMobile ? 'none' : undefined }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '5px', background: `${METHOD_COLORS[p.method]}18`, fontSize: '11px', fontWeight: 500, color: METHOD_COLORS[p.method] }}>
                                {METHOD_LABELS[p.method]}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>{formatCurrency(p.amount)}</td>
                            <td><StatusBadge status={p.status} /></td>
                            <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(p.createdAt!)}</td>
                            <td>
                              {p.status === 'pending' && (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
                                  {!isMobile && p.proofUrl && (
                                    <button onClick={() => setProofModalPayment(p)} className="btn btn-ghost"
                                      style={{ padding: '4px 10px', fontSize: '11px', height: '28px', background: 'rgba(140,185,206,0.1)', color: '#8CB9CE', border: '1px solid rgba(140,185,206,0.3)' }}>
                                      <Eye size={11} /> Proof
                                    </button>
                                  )}
                                  <button onClick={() => { setVerifyConfirm(p); setVerifyAmount(parseFloat(String(p.amount)).toFixed(2)); setVerifyNote(''); }} disabled={actioningId === p.id} className="btn"
                                    style={{ padding: '4px 10px', fontSize: '11px', height: '28px', background: 'rgba(127,174,147,0.1)', color: '#7FAE93', border: '1px solid rgba(127,174,147,0.2)', opacity: actioningId === p.id ? 0.6 : 1 }}>
                                    <CheckCircle size={11} /> {isMobile ? '✓' : 'Verify'}
                                  </button>
                                  <button onClick={() => handleDecision(p, 'rejected')} disabled={actioningId === p.id} className="btn btn-danger"
                                    style={{ padding: '4px 10px', fontSize: '11px', height: '28px', opacity: actioningId === p.id ? 0.6 : 1 }}>
                                    {actioningId === p.id ? <Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite' }} /> : <XCircle size={11} />} {isMobile ? '✕' : 'Reject'}
                                  </button>
                                </div>
                              )}
                              {p.status === 'verified' && (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button onClick={() => handleReceipt(p)} disabled={generatingId === p.id} className="btn btn-ghost"
                                    style={{ padding: '4px 10px', fontSize: '11px', height: '26px', opacity: generatingId === p.id ? 0.6 : 1 }}>
                                    {generatingId === p.id ? <Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FileDown size={11} />} {isMobile ? '' : 'Receipt'}
                                  </button>
                                  {!isMobile && (
                                    <button onClick={() => setRefundConfirm(p)} className="btn"
                                      style={{ padding: '4px 10px', fontSize: '11px', height: '26px', background: 'rgba(186,104,200,0.1)', color: '#BA68C8', border: '1px solid rgba(186,104,200,0.25)' }}>
                                      ↩ Refund
                                    </button>
                                  )}
                                </div>
                              )}
                              {p.status === 'refunded' && <span style={{ fontSize: '11px', color: '#BA68C8', fontStyle: 'italic' }}>Refunded</span>}
                              {p.status === 'rejected' && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>—</span>}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                  {groups.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '13px' }}>No payments found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Proof of Payment Modal */}
      {proofModalPayment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 24px' }}
          onClick={() => setProofModalPayment(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '24px', maxWidth: '560px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Proof of Payment</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{proofModalPayment.reservation?.confirmationCode} · {proofModalPayment.referenceNumber}</p>
              </div>
              <button onClick={() => setProofModalPayment(null)} className="btn btn-ghost" style={{ padding: '6px', fontSize: '18px', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--surface-alt)', borderRadius: '10px', fontSize: '13px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Guest: </span><strong style={{ color: 'var(--text-primary)' }}>{proofModalPayment.reservation?.guestName || (proofModalPayment.reservation?.guest ? `${proofModalPayment.reservation.guest.firstName} ${proofModalPayment.reservation.guest.lastName}`.trim() : '—')}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Amount: </span><strong style={{ color: '#7FAE93' }}>{formatCurrency(proofModalPayment.amount)}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Method: </span><strong style={{ color: 'var(--text-primary)' }}>{METHOD_LABELS[proofModalPayment.method]}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Ref #: </span><strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{proofModalPayment.referenceNumber || '—'}</strong></div>
            </div>
            {proofModalPayment.proofUrl ? (
              proofModalPayment.proofUrl.startsWith('data:image') ? (
                <img src={proofModalPayment.proofUrl} alt="Proof of payment" style={{ width: '100%', borderRadius: '10px', border: '1px solid var(--border)', display: 'block' }} />
              ) : proofModalPayment.proofUrl.startsWith('data:application/pdf') ? (
                <div style={{ textAlign: 'center', padding: '32px', background: 'var(--surface-alt)', borderRadius: '10px' }}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>PDF proof of payment</p>
                  <a href={proofModalPayment.proofUrl} download={`proof-${proofModalPayment.reservation?.confirmationCode}.pdf`} className="btn btn-ghost" style={{ fontSize: '13px' }}>⬇ Download PDF</a>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px', background: 'var(--surface-alt)', borderRadius: '10px' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Preview not available for this file type.</p>
                </div>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', background: 'var(--surface-alt)', borderRadius: '10px' }}>
                <p style={{ color: 'var(--text-muted)' }}>No proof uploaded for this payment.</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => { setVerifyConfirm(proofModalPayment); setVerifyAmount(parseFloat(String(proofModalPayment.amount)).toFixed(2)); setVerifyNote(''); setProofModalPayment(null); }} disabled={actioningId === proofModalPayment.id} className="btn"
                style={{ flex: 1, background: 'rgba(127,174,147,0.1)', color: '#7FAE93', border: '1px solid rgba(127,174,147,0.3)', fontSize: '13px' }}>
                <CheckCircle size={13} /> Verify Payment
              </button>
              <button onClick={() => { handleDecision(proofModalPayment, 'rejected'); setProofModalPayment(null); }} disabled={actioningId === proofModalPayment.id} className="btn btn-danger" style={{ flex: 1, fontSize: '13px' }}>
                <XCircle size={13} /> Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment detail now lives at /admin/payments/[id] */}
    </div>
  );
}