'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, CalendarCheck, Download, Loader2, LogIn, LogOut, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import NewReservationModal from '@/components/reservations/NewReservationModal';
import { ReservationsSkeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatDate, calculateNights } from '@/lib/utils';
import { getReservationPaymentSummary, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '@/lib/payments';
import { Reservation, Payment, ReservationStatus } from '@/types';
import { useNotifications } from '@/components/providers/NotificationProvider';

/** Returns the name to display for a reservation — prefers the name typed at booking time. */
function getDisplayName(r: { guestName?: string; guest?: { firstName: string; lastName: string } }): string {
  if (r.guestName) return r.guestName;
  if (r.guest) return `${r.guest.firstName} ${r.guest.lastName}`;
  return 'Guest';
}

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'expired', label: 'Expired' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'checked_out', label: 'Checked Out' },
  { value: 'cancelled', label: 'Cancelled' },
];

// The next logical action(s) available from each reservation status.
const NEXT_ACTIONS: Record<ReservationStatus, Array<{ label: string; next: ReservationStatus; icon: typeof LogIn }>> = {
  pending: [{ label: 'Confirm', next: 'confirmed', icon: CheckCircle }],
  confirmed: [{ label: 'Check In', next: 'checked_in', icon: LogIn }],
  checked_in: [{ label: 'Check Out', next: 'checked_out', icon: LogOut }],
  checked_out: [],
  cancelled: [],
};

/**
 * Returns true if a reservation is pending, has no payments, and was created
 * more than 30 minutes ago — meaning the booking window has lapsed.
 */
function isExpiredPending(reservation: Reservation, payments: Payment[]): boolean {
  if (reservation.status !== 'pending') return false;
  const hasPayment = payments.some(p => p.reservationId === reservation.id);
  if (hasPayment) return false;
  // If no createdAt recorded, we can't determine expiry — treat as not expired
  if (!reservation.createdAt) return false;
  const minutesElapsed = (Date.now() - new Date(reservation.createdAt).getTime()) / (1000 * 60);
  return minutesElapsed > 30;
}

/** Returns how many hours a checked-in guest is past their check-out, or 0. */
function getOverstayHours(reservation: Reservation): number {
  if (reservation.status !== 'checked_in') return 0;
  const now = new Date();
  const checkOut = new Date(reservation.checkOut);
  if (checkOut >= now) return 0;
  return Math.floor((now.getTime() - checkOut.getTime()) / (1000 * 60 * 60));
}

export default function ReservationsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const { showToast, addNotification } = useNotifications();

  const isMounted = useRef(true);

  const fetchAll = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const [resR, resP] = await Promise.all([
        fetch('/api/reservations', { cache: 'no-store' }),
        fetch('/api/payments',     { cache: 'no-store' }),
      ]);
      if (!resR.ok) throw new Error('Failed to fetch reservations');
      if (!isMounted.current) return;
      const data: Reservation[] = await resR.json();
      setReservations(data);
      if (resP.ok) setPayments(await resP.json());
    } catch (err) {
      console.error(err);
      if (showSpinner) showToast({ title: 'Error', description: 'Could not load reservations from database.', variant: 'error' });
    } finally {
      if (isMounted.current && showSpinner) setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    isMounted.current = true;
    fetchAll(true);

    const interval = setInterval(() => fetchAll(false), 120_000);
    function onVisible() { if (document.visibilityState === 'visible') fetchAll(false); }
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchAll]);

  const filtered = reservations.filter(r => {
    const guestName = getDisplayName(r).toLowerCase();
    const matchSearch =
      r.confirmationCode.toLowerCase().includes(search.toLowerCase()) ||
      guestName.includes(search.toLowerCase());
    const expired = isExpiredPending(r, payments);
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'expired' && expired) ||
      (statusFilter === 'pending' && r.status === 'pending' && !expired) ||
      (statusFilter !== 'expired' && statusFilter !== 'pending' && r.status === statusFilter);
    return matchSearch && matchStatus;
  });

  function handleCreate(reservation: Reservation) {
    setReservations(prev => [reservation, ...prev]);
    showToast({
      title: 'Reservation created',
      description: `${reservation.confirmationCode} for ${getDisplayName(reservation)} saved to database. Click "Confirm" to send the guest a confirmation email.`,
      variant: 'success',
    });
    // Add internal notification — no guest email yet; email is sent when staff clicks "Confirm"
    addNotification({
      type: 'new_reservation',
      title: 'New Reservation',
      message: `${getDisplayName(reservation)} booked Room ${reservation.room?.roomNumber} for ${formatDate(reservation.checkIn)}–${formatDate(reservation.checkOut)}. Pending confirmation.`,
      entity: 'reservation',
      entityId: reservation.id,
      emailSent: false,
    });
    // Room now shows as reserved elsewhere in the app (handled server-side).
  }

  async function handleStatusChange(reservation: Reservation, next: ReservationStatus) {
    // Block check-in if reservation is unpaid
    if (next === 'checked_in') {
      const paymentSummary = getReservationPaymentSummary(reservation, payments);
      if (paymentSummary.status === 'unpaid') {
        showToast({
          title: 'Check-in blocked',
          description: `${getDisplayName(reservation)} has no recorded payment. Please collect at least a deposit before checking in.`,
          variant: 'error',
        });
        return;
      }
    }

    // Warn before check-out if not fully paid
    if (next === 'checked_out') {
      const paymentSummary = getReservationPaymentSummary(reservation, payments);
      if (paymentSummary.status !== 'fully_paid' && paymentSummary.status !== 'overpaid') {
        const balance = paymentSummary.balance;
        const confirmed = window.confirm(
          `⚠️ Outstanding Balance\n\n${getDisplayName(reservation)} still has an unpaid balance of ${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(balance)}.\n\nDo you want to proceed with check-out anyway?`
        );
        if (!confirmed) return;
      }
    }

    setActioningId(reservation.id);
    try {
      const res = await fetch('/api/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reservation.id, status: next }),
      });
      if (!res.ok) throw new Error('Failed to update reservation');
      const updated: Reservation = await res.json();
      setReservations(prev => prev.map(r => r.id === reservation.id ? { ...r, ...updated } : r));

      addNotification({
        type: next === 'cancelled' ? 'cancellation' : next === 'checked_in' ? 'check_in_today' : next === 'checked_out' ? 'check_out_today' : 'system',
        title: next === 'cancelled' ? 'Reservation Cancelled' : `Reservation ${next.replace('_', ' ')}`,
        message: `${getDisplayName(reservation)}'s reservation ${reservation.confirmationCode} is now ${next.replace('_', ' ')}.`,
        entity: 'reservation',
        entityId: reservation.id,
        emailSent: false,
      });

      // Send guest email based on the new status
      const guestEmail = reservation.guest?.email;
      if (guestEmail) {
        if (next === 'confirmed') {
          fetch('/api/notifications/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'reservation_confirmed', to: guestEmail, reservation }),
          }).catch(() => {});
        } else if (next === 'checked_in') {
          fetch('/api/notifications/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'check_in_today', to: guestEmail, reservation }),
          }).catch(() => {});
        } else if (next === 'checked_out') {
          fetch('/api/notifications/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'check_out', to: guestEmail, reservation, payments }),
          }).catch(() => {});
        }
      }

      const emailTriggerStatuses = ['confirmed', 'checked_in', 'checked_out'];
      showToast({
        title: 'Reservation updated',
        description: `${reservation.confirmationCode} marked as ${next.replace('_', ' ')}.${
          emailTriggerStatuses.includes(next)
            ? reservation.guest?.email
              ? ` Email sent to ${reservation.guest.email}.`
              : ' No guest email on file.'
            : ''
        }`,
        variant: next === 'cancelled' ? 'warning' : 'success',
      });
    } catch {
      showToast({ title: 'Error', description: 'Failed to update reservation status.', variant: 'error' });
    } finally {
      setActioningId(null);
    }
  }

  if (loading) return <ReservationsSkeleton />;

  // Guests currently overstaying
  const overstayingReservations = reservations.filter(r => getOverstayHours(r) > 0);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Overstay Alert Banner */}
      {overstayingReservations.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          background: 'rgba(239,83,80,0.08)',
          border: '1px solid rgba(239,83,80,0.35)',
          borderRadius: '10px',
          padding: '14px 16px',
        }}>
          <AlertTriangle size={18} style={{ color: '#EF5350', flexShrink: 0, marginTop: '1px' }} />
          <div>
            <div style={{ fontWeight: 700, color: '#EF5350', fontSize: '13px', marginBottom: '4px' }}>
              {overstayingReservations.length === 1
                ? '1 guest is overstaying'
                : `${overstayingReservations.length} guests are overstaying`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {overstayingReservations.map(r => {
                const hours = getOverstayHours(r);
                const days = Math.floor(hours / 24);
                const lateSummary = days >= 1 ? `${days} day${days > 1 ? 's' : ''} ${hours % 24}h` : `${hours} hour${hours > 1 ? 's' : ''}`;
                return (
                  <span key={r.id} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <strong>{getDisplayName(r)}</strong> — Room {r.room?.roomNumber} ({r.confirmationCode}) · {lateSummary} past check-out
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Status tabs */}
      <div className="table-scroll" style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '4px', width: 'fit-content', maxWidth: '100%' }}>
        {STATUS_TABS.map(t => (
          <button key={t.value} onClick={() => setStatusFilter(t.value)}
            style={{
              padding: '6px 14px', borderRadius: '7px', fontSize: '12.5px', fontWeight: statusFilter === t.value ? 600 : 400,
              cursor: 'pointer', border: 'none', transition: 'all 0.15s',
              background: statusFilter === t.value ? 'var(--accent)' : 'transparent',
              color: statusFilter === t.value ? 'white' : 'var(--text-secondary)',
            }}>
            {t.label}
            <span style={{ marginLeft: '6px', fontSize: '10px', background: statusFilter === t.value ? 'rgba(255,255,255,0.22)' : 'var(--bg-hover)', padding: '1px 6px', borderRadius: '10px' }}>
              {t.value === 'all' ? reservations.length : t.value === 'expired' ? reservations.filter(r => isExpiredPending(r, payments)).length : t.value === 'pending' ? reservations.filter(r => r.status === 'pending' && !isExpiredPending(r, payments)).length : reservations.filter(r => r.status === t.value).length}
            </span>
          </button>
        ))}
      </div>

      {/* Search & actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div className="search-field">
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by code or guest name..." className="input" style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }} autoComplete="off" name="reservations-search" />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost" style={{ height: '36px', fontSize: '12.5px' }}>
            <Download size={14} /> Export
          </button>
          <button className="btn btn-primary" style={{ height: '36px', fontSize: '12.5px' }} onClick={() => setModalOpen(true)}>
            <Plus size={15} /> New Reservation
          </button>
        </div>
      </div>

      <NewReservationModal open={modalOpen} onOpenChange={setModalOpen} onCreate={handleCreate} />

      {/* Table */}
      <div className="surface" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Confirmation</th>
                  <th>Guest</th>
                  <th>Room</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Nights</th>
                  <th>Guests</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>{r.confirmationCode}</div>
                      {r.createdAt && (
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {new Date(r.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}{' '}{new Date(r.createdAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '13px' }}>{getDisplayName(r)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.guest?.email}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Room {r.room?.roomNumber}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{r.room?.type}</div>
                    </td>
                    <td>{formatDate(r.checkIn)}</td>
                    <td>{formatDate(r.checkOut)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{calculateNights(r.checkIn, r.checkOut)}N</td>
                    <td>{r.adults + (r.children || 0)} pax</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        {isExpiredPending(r, payments) ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: '#9E9E9E',
                            background: 'rgba(158,158,158,0.12)',
                            border: '1px solid rgba(158,158,158,0.3)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            whiteSpace: 'nowrap',
                          }}>
                            <XCircle size={10} /> Expired
                          </span>
                        ) : (
                          <StatusBadge status={r.status} />
                        )}
                        {(() => {
                          const hours = getOverstayHours(r);
                          if (hours <= 0) return null;
                          const days = Math.floor(hours / 24);
                          const label = days >= 1
                            ? `Overstay: ${days}d ${hours % 24}h`
                            : `Overstay: ${hours}h`;
                          return (
                            <span
                              title={`${getDisplayName(r)} was supposed to check out ${days >= 1 ? `${days} day(s)` : `${hours} hour(s)`} ago.`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                color: '#EF5350',
                                background: 'rgba(239,83,80,0.1)',
                                border: '1px solid rgba(239,83,80,0.3)',
                                padding: '2px 7px',
                                borderRadius: '6px',
                                whiteSpace: 'nowrap',
                                animation: 'pulse 2s infinite',
                              }}
                            >
                              <AlertTriangle size={10} /> {label}
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td>
                      {isExpiredPending(r, payments) ? (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>—</span>
                      ) : (() => {
                        const s = getReservationPaymentSummary(r, (r as any).payments?.length ? (r as any).payments : payments.filter(p => p.reservationId === r.id));
                        return (
                          <div style={{ minWidth: '90px' }}>
                            <span style={{ fontSize: '10.5px', fontWeight: 600, color: PAYMENT_STATUS_COLORS[s.status], background: `${PAYMENT_STATUS_COLORS[s.status]}18`, padding: '2px 7px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                              {PAYMENT_STATUS_LABELS[s.status]}
                            </span>
                            <div style={{ height: '4px', borderRadius: '4px', background: 'var(--border)', overflow: 'hidden', marginTop: '5px' }}>
                              <div style={{ height: '100%', width: `${s.percentPaid}%`, background: PAYMENT_STATUS_COLORS[s.status], borderRadius: '4px' }} />
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(r.totalAmount)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {isExpiredPending(r, payments) ? (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No actions</span>
                        ) : (
                          <>
                            {NEXT_ACTIONS[r.status].map(action => (
                              <button
                                key={action.next}
                                onClick={() => handleStatusChange(r, action.next)}
                                disabled={actioningId === r.id}
                                className="btn"
                                style={{ padding: '4px 10px', fontSize: '11px', height: '28px', background: 'rgba(127,174,147,0.1)', color: '#7FAE93', border: '1px solid rgba(127,174,147,0.2)', opacity: actioningId === r.id ? 0.6 : 1 }}
                              >
                                {actioningId === r.id ? <Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite' }} /> : <action.icon size={11} />} {action.label}
                              </button>
                            ))}
                            {(r.status === 'pending' || r.status === 'confirmed') && (
                              <button
                                onClick={() => handleStatusChange(r, 'cancelled')}
                                disabled={actioningId === r.id}
                                className="btn btn-danger"
                                style={{ padding: '4px 10px', fontSize: '11px', height: '28px', opacity: actioningId === r.id ? 0.6 : 1 }}
                              >
                                <XCircle size={11} /> Cancel
                              </button>
                            )}
                            {(r.status === 'checked_out' || r.status === 'cancelled') && (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No actions</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <CalendarCheck size={28} style={{ marginBottom: '10px', opacity: 0.3 }} />
            <p style={{ fontSize: '13px' }}>No reservations found.</p>
          </div>
        )}
      </div>
    </div>
  );
}