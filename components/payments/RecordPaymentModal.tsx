'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Search } from 'lucide-react';
import { Payment, Reservation } from '@/types';

interface RecordPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation?: Reservation;       // pre-selected (e.g. from reservations page)
  onSuccess?: (payment: Payment) => void;
  // payments page passes these instead:
  onCreate?: (payment: Payment) => void;
}

const METHODS = ['cash', 'gcash', 'bank_transfer', 'credit_card', 'maya'] as const;
const TYPES   = ['deposit', 'partial', 'balance', 'full'] as const;

export default function RecordPaymentModal({
  open, onOpenChange, reservation: preselected, onSuccess, onCreate,
}: RecordPaymentModalProps) {
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState('');
  const [reservations, setReservations]   = useState<Reservation[]>([]);
  const [resSearch, setResSearch]         = useState('');
  const [selectedRes, setSelectedRes]     = useState<Reservation | undefined>(preselected);
  const [showDropdown, setShowDropdown]   = useState(false);
  const [form, setForm] = useState({
    amount: '',
    method: 'cash' as typeof METHODS[number],
    paymentType: 'deposit' as typeof TYPES[number],
    referenceNumber: '',
    notes: '',
  });

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setSelectedRes(preselected);
      setResSearch(preselected ? `${preselected.confirmationCode} – ${preselected.guestName || `${preselected.guest?.firstName ?? ''} ${preselected.guest?.lastName ?? ''}`.trim()}` : '');
      setForm({ amount: '', method: 'cash', paymentType: 'deposit', referenceNumber: '', notes: '' });
      setError('');
    }
  }, [open, preselected]);

  // Fetch reservations for dropdown when no preselected
  useEffect(() => {
    if (open && !preselected) {
      fetch('/api/reservations')
        .then(r => r.json())
        .then(data => {
          const list = Array.isArray(data) ? data : [];
          // Newest bookings first, so the latest additions show up right away
          // when the field is focused (before the guest types anything).
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setReservations(list);
        })
        .catch(() => setReservations([]));
    }
  }, [open, preselected]);

  const filteredRes = reservations.filter(r => {
    const q = resSearch.toLowerCase();
    return (
      r.confirmationCode.toLowerCase().includes(q) ||
      `${r.guest?.firstName} ${r.guest?.lastName}`.toLowerCase().includes(q)
    );
  }).slice(0, 8);

  async function handleSubmit() {
    setError('');
    if (!selectedRes?.id) { setError('Please select a reservation.'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Please enter a valid amount.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: selectedRes.id, ...form }),
      });
      if (!res.ok) throw new Error('Failed');
      const data: Payment = await res.json();

      // Log the activity
      await fetch('/api/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'create',
          entity: 'payment',
          entityId: data.id,
          description: `Payment of ₱${parseFloat(form.amount).toLocaleString()} recorded for reservation ${selectedRes.confirmationCode} via ${form.method.replace('_', ' ')}.`,
        }),
      }).catch(() => {});

      onSuccess?.(data);
      onCreate?.(data);
      onOpenChange(false);
    } catch {
      setError('Failed to record payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const inputStyle = {
    width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px',
    border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-hover))',
    color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={() => onOpenChange(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
      <div style={{ position: 'relative', background: 'var(--bg-surface)', borderRadius: '16px', width: '100%', maxWidth: '460px', margin: '16px', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Record Payment</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Saved to database.</p>
          </div>
          <button onClick={() => onOpenChange(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{ fontSize: '12.5px', color: '#C97D6E', background: 'rgba(201,125,110,0.08)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(201,125,110,0.2)' }}>{error}</div>
          )}

          {/* Reservation selector */}
          {preselected ? (
            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', background: 'var(--bg-hover)', padding: '10px 14px', borderRadius: '8px' }}>
              Reservation <strong style={{ color: 'var(--accent)' }}>{preselected.confirmationCode}</strong>
              {' · '}{preselected.guestName || `${preselected.guest?.firstName ?? ''} ${preselected.guest?.lastName ?? ''}`.trim() || 'Guest'}
              {(() => {
                const total = parseFloat(String(preselected.totalAmount || 0));
                const paid = (preselected as any).payments
                  ? (preselected as any).payments.filter((p: any) => p.status === 'verified').reduce((s: number, p: any) => s + parseFloat(p.amount), 0)
                  : 0;
                const remaining = total - paid;
                return (
                  <>
                    {' · '}Total: <strong>₱{total.toLocaleString()}</strong>
                    {paid > 0 && <> · Paid: <strong style={{color:'#7FAE93'}}>₱{paid.toLocaleString()}</strong> · <strong style={{color:'var(--accent)'}}>Balance: ₱{remaining.toLocaleString()}</strong></>}
                  </>
                );
              })()}
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Reservation *</label>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  value={resSearch}
                  onChange={e => { setResSearch(e.target.value); setSelectedRes(undefined); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search by booking code or guest name…"
                  style={{ ...inputStyle, paddingLeft: '30px' }}
                />
              </div>
              {showDropdown && filteredRes.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', marginTop: '4px', overflow: 'hidden' }}>
                  {filteredRes.map(r => (
                    <div key={r.id}
                      onClick={() => { setSelectedRes(r); setResSearch(`${r.confirmationCode} – ${r.guest?.firstName} ${r.guest?.lastName}`); setShowDropdown(false); }}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace' }}>{r.confirmationCode}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{r.guestName || `${r.guest?.firstName ?? ''} ${r.guest?.lastName ?? ''}`.trim() || 'Guest'}</div>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>₱{parseFloat(String(r.totalAmount)).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
              {selectedRes && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)', padding: '6px 10px', background: 'rgba(111,163,154,0.06)', borderRadius: '6px', border: '1px solid rgba(111,163,154,0.2)' }}>
                  {(() => {
                    const total = parseFloat(String(selectedRes.totalAmount || 0));
                    const paid = (selectedRes as any).payments
                      ? (selectedRes as any).payments.filter((p: any) => p.status === 'verified').reduce((s: number, p: any) => s + parseFloat(p.amount), 0)
                      : 0;
                    const remaining = total - paid;
                    return <>Total: <strong>₱{total.toLocaleString()}</strong>{paid > 0 && <> · Paid: <strong style={{color:'#7FAE93'}}>₱{paid.toLocaleString()}</strong> · <strong style={{color:'var(--accent)'}}>Balance: ₱{remaining.toLocaleString()}</strong></>} · Status: {selectedRes.status}</>;
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Amount (₱) *</label>
            <input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              style={{ ...inputStyle, borderColor: (() => { const total = parseFloat(String(selectedRes?.totalAmount || 0)); const paid = (selectedRes as any)?.payments ? (selectedRes as any).payments.filter((p: any) => p.status === 'verified').reduce((s: number, p: any) => s + parseFloat(p.amount), 0) : 0; const remaining = total - paid; const amt = parseFloat(form.amount || '0'); return amt > remaining && remaining > 0 ? 'rgba(210,162,76,0.6)' : undefined; })() }} />
            {(() => {
              const total = parseFloat(String(selectedRes?.totalAmount || 0));
              const alreadyPaid = (selectedRes as any)?.payments
                ? (selectedRes as any).payments.filter((p: any) => p.status === 'verified').reduce((s: number, p: any) => s + parseFloat(p.amount), 0)
                : 0;
              const remaining = total - alreadyPaid;
              const amt = parseFloat(form.amount || '0');
              if (!selectedRes || !form.amount || amt <= 0 || remaining <= 0) return null;
              const overage = amt - remaining;
              if (overage > 0) return (
                <div style={{ marginTop: '6px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(210,162,76,0.08)', border: '1px solid rgba(210,162,76,0.3)', fontSize: '12px', color: '#D2A24C', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '14px', lineHeight: 1 }}>⚠️</span>
                  <span><strong>Overpayment alert:</strong> This amount exceeds the remaining balance (₱{remaining.toLocaleString()}) by <strong>₱{overage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>. Double-check before saving.</span>
                </div>
              );
              return null;
            })()}
          </div>

          {/* Method + Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Method</label>
              <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value as typeof METHODS[number] }))} style={{ ...inputStyle, appearance: 'none' as const }}>
                {METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Type</label>
              <select value={form.paymentType} onChange={e => setForm(f => ({ ...f, paymentType: e.target.value as typeof TYPES[number] }))} style={{ ...inputStyle, appearance: 'none' as const }}>
                {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          {/* Reference */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Reference Number</label>
            <input type="text" placeholder="e.g. GCash ref, bank transfer no." value={form.referenceNumber}
              onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))} style={inputStyle} />
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Notes</label>
            <textarea rows={2} style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }}
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes…" />
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button className="btn btn-ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ minWidth: '130px' }}>
              {submitting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : 'Record Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}