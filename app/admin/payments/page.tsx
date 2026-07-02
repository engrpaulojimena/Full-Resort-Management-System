'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, CheckCircle, XCircle, Eye, Loader2, FileDown, Plus } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import RecordPaymentModal from '@/components/payments/RecordPaymentModal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { generateReceiptPDF } from '@/lib/generateReceipt';
import { PAYMENT_TYPE_LABELS } from '@/lib/payments';
import { useNotifications } from '@/components/providers/NotificationProvider';
import { Payment } from '@/types';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', gcash: 'GCash', bank_transfer: 'Bank Transfer', credit_card: 'Credit Card', maya: 'Maya',
};
const METHOD_COLORS: Record<string, string> = {
  cash: '#7FAE93', gcash: '#8CB9CE', bank_transfer: '#A79BC9', credit_card: '#D2A24C', maya: '#8CB9CE',
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [refundConfirm, setRefundConfirm] = useState<Payment | null>(null);
  const [refunding, setRefunding] = useState(false);
  const { showToast, addNotification } = useNotifications();

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payments');
      if (!res.ok) throw new Error('Failed');
      const data: Payment[] = await res.json();
      // Sort newest first
      setPayments(data.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
    } catch {
      showToast({ title: 'Error', description: 'Could not load payments from database.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

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

      // Update local state
      setPayments(prev => prev.map(p => p.id === payment.id ? { ...p, ...updated } : p));

      // ── Auto check-in: if payment is now verified and the reservation is
      // fully paid + check-in is today or earlier + still pending/confirmed ──
      if (decision === 'verified' && payment.reservationId) {
        const reservation = payment.reservation;
        if (reservation && (reservation.status === 'pending' || reservation.status === 'confirmed')) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const checkInDate = new Date(reservation.checkIn);
          checkInDate.setHours(0, 0, 0, 0);

          if (checkInDate <= today) {
            // Recalculate total paid including this newly verified payment
            const allPayments = payments.map(p => p.id === payment.id ? { ...p, status: 'verified' as const } : p);
            const totalPaid = allPayments
              .filter(p => p.reservationId === payment.reservationId && p.status === 'verified')
              .reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);
            const totalAmount = parseFloat(String(reservation.totalAmount));

            if (totalPaid >= totalAmount) {
              // Auto check-in
              await fetch('/api/reservations', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: reservation.id, status: 'checked_in' }),
              }).then(r => {
                if (r.ok) {
                  addNotification({
                    type: 'check_in_today',
                    title: 'Auto Check-in',
                    message: `${reservation.guest?.firstName ?? 'Guest'} ${reservation.guest?.lastName ?? ''} (${reservation.confirmationCode}) was automatically checked in — fully paid.`,
                    entity: 'reservation',
                    entityId: reservation.id,
                    emailSent: false,
                  });
                  showToast({
                    title: '✅ Guest auto checked-in',
                    description: `${reservation.guest?.firstName} ${reservation.guest?.lastName} is now checked in — full payment received.`,
                    variant: 'success',
                  });
                }
              }).catch(() => {});
            }
          }
        }
      }

      // Activity log
      const code = payment.reservation?.confirmationCode || `#${payment.id}`;
      await fetch('/api/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'verify',
          entity: 'payment',
          entityId: payment.id,
          description: `Payment of ${formatCurrency(payment.amount)} for ${code} was ${decision}.`,
        }),
      }).catch(() => {});

      // In-app notification
      addNotification({
        type: decision === 'verified' ? 'payment_verified' : 'payment_rejected',
        title: decision === 'verified' ? 'Payment verified' : 'Payment rejected',
        message: `${formatCurrency(payment.amount)} for ${code} was marked ${decision}.`,
        entity: 'payment',
        entityId: payment.id,
        emailSent: !!payment.reservation?.guest?.email,
      });

      // Guest email (non-blocking)
      const guestEmail = payment.reservation?.guest?.email;
      if (guestEmail) {
        fetch('/api/notifications/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: decision === 'verified' ? 'payment_verified' : 'payment_rejected',
            to: guestEmail,
            payment: { ...payment, status: decision },
          }),
        }).catch(() => {});
      }

      showToast({
        title: decision === 'verified' ? 'Payment verified' : 'Payment rejected',
        description: guestEmail ? `Guest notified at ${guestEmail}.` : 'Guest has no email on file.',
        variant: decision === 'verified' ? 'success' : 'error',
      });
    } catch {
      showToast({ title: 'Error', description: 'Failed to update payment status.', variant: 'error' });
    } finally {
      setActioningId(null);
    }
  }

  async function handleReceipt(payment: Payment) {
    setGeneratingId(payment.id);
    try {
      await generateReceiptPDF(payment, payment.reservation);
    } catch {
      showToast({ title: 'Could not generate receipt', description: 'Please try again.', variant: 'error' });
    } finally {
      setGeneratingId(null);
    }
  }

  function handleRecordPayment(payment: Payment) {
    setPayments(prev => [payment, ...prev]);

    // Notify guest that we received their payment and it's awaiting verification
    const guestEmail = payment.reservation?.guest?.email;
    if (guestEmail) {
      fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'payment_pending', to: guestEmail, payment }),
      }).catch(() => {});
    }

    showToast({
      title: 'Payment recorded',
      description: `${formatCurrency(payment.amount)} logged. Awaiting verification.${guestEmail ? ` Guest notified at ${guestEmail}.` : ''}`,
      variant: 'success',
    });
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
        body: JSON.stringify({
          type: 'update',
          entity: 'payment',
          entityId: payment.id,
          description: `Payment of ${formatCurrency(payment.amount)} for ${code} was marked as refunded.`,
        }),
      }).catch(() => {});

      addNotification({
        type: 'payment_rejected',
        title: 'Payment refunded',
        message: `${formatCurrency(payment.amount)} for ${code} has been marked as refunded.`,
        entity: 'payment',
        entityId: payment.id,
        emailSent: false,
      });

      showToast({ title: 'Refund processed', description: `${formatCurrency(payment.amount)} marked as refunded.`, variant: 'success' });
    } catch {
      showToast({ title: 'Error', description: 'Failed to process refund.', variant: 'error' });
    } finally {
      setRefunding(false);
      setRefundConfirm(null);
    }
  }

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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by booking code or ref#..." className="input" style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }} />
          </div>
          <button className="btn btn-primary" style={{ height: '36px', fontSize: '12.5px' }} onClick={() => setRecordModalOpen(true)}>
            <Plus size={14} /> Record Payment
          </button>
        </div>
      </div>

      <RecordPaymentModal open={recordModalOpen} onOpenChange={setRecordModalOpen} onCreate={handleRecordPayment} />

      {/* Refund confirmation dialog */}
      {refundConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => !refunding && setRefundConfirm(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
          <div style={{ position: 'relative', background: 'var(--bg-surface)', borderRadius: '14px', width: '100%', maxWidth: '400px', margin: '16px', padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>↩</div>
            <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Process Refund?</h3>
            <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              You're about to mark this payment as <strong>refunded</strong>:
            </p>
            <div style={{ margin: '12px 0', padding: '10px 14px', borderRadius: '8px', background: 'rgba(186,104,200,0.07)', border: '1px solid rgba(186,104,200,0.2)', fontSize: '13px' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '16px' }}>{formatCurrency(refundConfirm.amount)}</div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                {refundConfirm.reservation?.confirmationCode ?? `Payment #${refundConfirm.id}`}
                {refundConfirm.reservation?.guest && ` · ${refundConfirm.reservation.guest.firstName} ${refundConfirm.reservation.guest.lastName}`}
              </div>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--text-muted)' }}>This will change the payment status to <em>refunded</em> and cannot be undone here. Make sure the actual refund has been processed externally.</p>
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

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--text-muted)' }} />
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="surface" style={{ borderRadius: '12px', overflow: 'hidden' }}>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Guest</th>
                  <th>Type</th>
                  <th>Method</th>
                  <th>Reference #</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>{p.reservation?.confirmationCode ?? '—'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.reservation?.guest ? `${p.reservation.guest.firstName} ${p.reservation.guest.lastName}` : '—'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{PAYMENT_TYPE_LABELS[p.paymentType || 'full']}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '6px', background: `${METHOD_COLORS[p.method]}18`, fontSize: '12px', fontWeight: 500, color: METHOD_COLORS[p.method] }}>
                        {METHOD_LABELS[p.method]}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>{p.referenceNumber || '—'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>{formatCurrency(p.amount)}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td style={{ fontSize: '12px' }}>{formatDate(p.createdAt!)}</td>
                    <td>
                      {p.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleDecision(p, 'verified')} disabled={actioningId === p.id} className="btn"
                            style={{ padding: '4px 10px', fontSize: '11px', height: '28px', background: 'rgba(127,174,147,0.1)', color: '#7FAE93', border: '1px solid rgba(127,174,147,0.2)', opacity: actioningId === p.id ? 0.6 : 1 }}>
                            {actioningId === p.id ? <Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle size={11} />} Verify
                          </button>
                          <button onClick={() => handleDecision(p, 'rejected')} disabled={actioningId === p.id} className="btn btn-danger"
                            style={{ padding: '4px 10px', fontSize: '11px', height: '28px', opacity: actioningId === p.id ? 0.6 : 1 }}>
                            {actioningId === p.id ? <Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite' }} /> : <XCircle size={11} />} Reject
                          </button>
                        </div>
                      )}
                      {p.status !== 'pending' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {p.status === 'verified' && (
                            <>
                              <button onClick={() => handleReceipt(p)} disabled={generatingId === p.id} className="btn btn-ghost"
                                style={{ padding: '4px 10px', fontSize: '11px', height: '26px', opacity: generatingId === p.id ? 0.6 : 1 }}>
                                {generatingId === p.id ? <Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FileDown size={11} />} Receipt
                              </button>
                              <button onClick={() => setRefundConfirm(p)} className="btn"
                                style={{ padding: '4px 10px', fontSize: '11px', height: '26px', background: 'rgba(186,104,200,0.1)', color: '#BA68C8', border: '1px solid rgba(186,104,200,0.25)' }}>
                                ↩ Refund
                              </button>
                            </>
                          )}
                          {p.status === 'refunded' && (
                            <span style={{ fontSize: '11px', color: '#BA68C8', fontStyle: 'italic' }}>Refunded</span>
                          )}
                          {p.status === 'rejected' && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>—</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '13px' }}>No payments found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}