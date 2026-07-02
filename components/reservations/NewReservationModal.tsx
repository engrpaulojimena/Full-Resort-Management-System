'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Reservation, Room, Guest } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface NewReservationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (reservation: Reservation) => void;
}

const SOURCES = ['walk_in', 'phone', 'online', 'referral', 'other'];

export default function NewReservationModal({ open, onOpenChange, onCreate }: NewReservationModalProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [guestMode, setGuestMode] = useState<'existing' | 'new'>('existing');
  const [newGuest, setNewGuest] = useState({ firstName: '', lastName: '', email: '', phone: '' });

  const [form, setForm] = useState({
    guestId: '',
    roomId: '',
    checkIn: '',
    checkOut: '',
    adults: '2',
    children: '0',
    specialRequests: '',
    source: 'walk_in',
  });

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetch('/api/rooms').then(r => r.json()),
      fetch('/api/guests').then(r => r.json()),
    ]).then(([r, g]) => {
      setRooms(Array.isArray(r) ? r.filter((rm: Room) => rm.status === 'available') : []);
      setGuests(Array.isArray(g) ? g : []);
    }).catch(() => {
      setError('Failed to load rooms or guests.');
    }).finally(() => setLoading(false));
  }, [open]);

  const selectedRoom = rooms.find(r => String(r.id) === form.roomId);

  function calcTotal(): number {
    if (!selectedRoom || !form.checkIn || !form.checkOut) return 0;
    const nights = Math.ceil((new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86400000);
    return nights > 0 ? nights * parseFloat(selectedRoom.pricePerNight) : 0;
  }

  async function handleSubmit() {
    setError('');

    if (guestMode === 'new' && (!newGuest.firstName.trim() || !newGuest.lastName.trim())) {
      setError('Please enter the new guest\'s first and last name.');
      return;
    }
    if (guestMode === 'existing' && !form.guestId) {
      setError('Please select a guest.');
      return;
    }
    if (!form.roomId || !form.checkIn || !form.checkOut) {
      setError('Please fill in all required fields.');
      return;
    }
    if (new Date(form.checkOut) <= new Date(form.checkIn)) {
      setError('Check-out must be after check-in.');
      return;
    }

    setSubmitting(true);
    try {
      let guestId = form.guestId;

      if (guestMode === 'new') {
        const guestRes = await fetch('/api/guests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: newGuest.firstName.trim(),
            lastName: newGuest.lastName.trim(),
            email: newGuest.email || undefined,
            phone: newGuest.phone || undefined,
          }),
        });
        if (!guestRes.ok) throw new Error('Failed to create guest');
        const createdGuest: Guest = await guestRes.json();
        guestId = String(createdGuest.id);
      }

      const total = calcTotal();
      const checkInDate = new Date(form.checkIn);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      checkInDate.setHours(0, 0, 0, 0);
      const isToday = checkInDate.getTime() === today.getTime();

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, guestId, totalAmount: total, status: isToday ? 'confirmed' : 'pending' }),
      });
      if (!res.ok) throw new Error('Failed to create reservation');
      const data: Reservation = await res.json();
      onCreate(data);
      onOpenChange(false);
      setForm({ guestId: '', roomId: '', checkIn: '', checkOut: '', adults: '2', children: '0', specialRequests: '', source: 'walk_in' });
      setNewGuest({ firstName: '', lastName: '', email: '', phone: '' });
      setGuestMode('existing');
    } catch {
      setError('Failed to save reservation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={() => onOpenChange(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'relative', background: 'var(--bg-surface)', borderRadius: '16px', width: '100%', maxWidth: '520px', margin: '16px', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', maxHeight: '90dvh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>New Reservation</h2>
          <button onClick={() => onOpenChange(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>Loading rooms and guests…</div>
          ) : (
            <>
              {error && <div style={{ fontSize: '12.5px', color: '#B71C1C', background: '#FFEBEE', padding: '10px 14px', borderRadius: '8px' }}>{error}</div>}

              <Field label="Guest *">
                <div style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}>
                  <button
                    type="button"
                    onClick={() => setGuestMode('existing')}
                    className={`btn ${guestMode === 'existing' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1, padding: '6px', fontSize: '12px', justifyContent: 'center' }}
                  >
                    Existing Guest
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuestMode('new')}
                    className={`btn ${guestMode === 'new' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1, padding: '6px', fontSize: '12px', justifyContent: 'center' }}
                  >
                    New Guest
                  </button>
                </div>

                {guestMode === 'existing' ? (
                  <select className="input" value={form.guestId} onChange={e => setForm(f => ({ ...f, guestId: e.target.value }))}>
                    <option value="">Select guest…</option>
                    {guests.map(g => (
                      <option key={g.id} value={String(g.id)}>{g.firstName} {g.lastName} {g.phone ? `· ${g.phone}` : ''}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <input className="input" placeholder="First name *" value={newGuest.firstName} onChange={e => setNewGuest(g => ({ ...g, firstName: e.target.value }))} />
                      <input className="input" placeholder="Last name *" value={newGuest.lastName} onChange={e => setNewGuest(g => ({ ...g, lastName: e.target.value }))} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <input className="input" type="email" placeholder="Email (optional)" value={newGuest.email} onChange={e => setNewGuest(g => ({ ...g, email: e.target.value }))} />
                      <input className="input" placeholder="Phone (optional)" value={newGuest.phone} onChange={e => setNewGuest(g => ({ ...g, phone: e.target.value }))} />
                    </div>
                  </div>
                )}
              </Field>

              <Field label="Room *">
                <select className="input" value={form.roomId} onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}>
                  <option value="">Select room…</option>
                  {rooms.map(r => (
                    <option key={r.id} value={String(r.id)}>Room {r.roomNumber} — {r.type} · {formatCurrency(r.pricePerNight)}/night</option>
                  ))}
                </select>
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Check-in *">
                  <input type="date" className="input" value={form.checkIn} onChange={e => setForm(f => ({ ...f, checkIn: e.target.value }))} />
                </Field>
                <Field label="Check-out *">
                  <input type="date" className="input" value={form.checkOut} onChange={e => setForm(f => ({ ...f, checkOut: e.target.value }))} />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Adults">
                  <input type="number" min="1" max="10" className="input" value={form.adults} onChange={e => setForm(f => ({ ...f, adults: e.target.value }))} />
                </Field>
                <Field label="Children">
                  <input type="number" min="0" max="10" className="input" value={form.children} onChange={e => setForm(f => ({ ...f, children: e.target.value }))} />
                </Field>
              </div>

              <Field label="Source">
                <select className="input" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                  {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </Field>

              <Field label="Special Requests">
                <textarea className="input" rows={2} style={{ resize: 'vertical', minHeight: '60px' }} value={form.specialRequests} onChange={e => setForm(f => ({ ...f, specialRequests: e.target.value }))} placeholder="Any special requests…" />
              </Field>

              {calcTotal() > 0 && (
                <div style={{ background: 'var(--accent-dim)', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Estimated Total</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent)' }}>{formatCurrency(calcTotal())}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button className="btn btn-ghost" onClick={() => onOpenChange(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : 'Create Reservation'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  );
}
