'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Users, Mail, Phone, Star, BedDouble, LogOut, X, Loader2, Eye, Trash2 } from 'lucide-react';
import { getInitials, formatDate } from '@/lib/utils';
import { Guest, Reservation } from '@/types';
import { GuestsSkeleton } from '@/components/ui/Skeleton';

const AVATAR_COLORS = ['#6FA39A', '#A79BC9', '#7FAE93', '#D2A24C', '#CFA0B5', '#8CB9CE'];

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  nationality: '',
  idType: 'Passport',
  idNumber: '',
  address: '',
  notes: '',
};

export default function GuestsPage() {
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<typeof EMPTY_FORM>>({});

  // Edit modal
  const [editGuest, setEditGuest] = useState<Guest | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editErrors, setEditErrors] = useState<Partial<typeof EMPTY_FORM>>({});
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm
  const [deleteGuest, setDeleteGuest] = useState<Guest | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Build a map of guestId → their active (checked_in) reservation
  const activeReservationByGuest = new Map<number, Reservation>(
    reservations
      .filter(r => r.status === 'checked_in' && r.guestId !== undefined)
      .map(r => [r.guestId as number, r])
  );
  const activeCount = activeReservationByGuest.size;

  // Compute real stats from DB data
  const now = new Date();
  const thisMonth = { year: now.getFullYear(), month: now.getMonth() };
  const repeatGuests = guests.filter(g => (g.totalStays ?? 0) >= 2).length;
  const newThisMonth = guests.filter(g => {
    if (!g.createdAt) return false;
    const d = new Date(g.createdAt);
    return d.getFullYear() === thisMonth.year && d.getMonth() === thisMonth.month;
  }).length;

  const [searching, setSearching] = useState(false);

  const fetchAll = useCallback(async (q?: string, isInitial = false) => {
    if (isInitial) setLoading(true); else setSearching(true);
    try {
      const guestUrl = q ? `/api/guests?search=${encodeURIComponent(q)}` : '/api/guests';
      // On initial load, also fetch reservations. On search, only re-fetch guests.
      const fetches: Promise<Response>[] = [fetch(guestUrl, { cache: 'no-store' })];
      if (isInitial) fetches.push(fetch('/api/reservations', { cache: 'no-store' }));
      const [guestRes, resRes] = await Promise.all(fetches);
      if (guestRes.ok) {
        const json = await guestRes.json();
        setGuests(Array.isArray(json) ? json : (json.data ?? []));
      }
      if (resRes?.ok) setReservations(await resRes.json());
    } catch (err) {
      console.error('Failed to fetch guests:', err);
    } finally {
      if (isInitial) setLoading(false); else setSearching(false);
    }
  }, []);

  useEffect(() => { fetchAll(undefined, true); }, [fetchAll]);

  // Debounced search — shows a subtle inline indicator, not the full skeleton
  useEffect(() => {
    const t = setTimeout(() => fetchAll(search || undefined, false), 350);
    return () => clearTimeout(t);
  }, [search, fetchAll]);

  const filtered = activeOnly
    ? guests.filter(g => activeReservationByGuest.has(g.id))
    : guests;

  // ── Add modal ──────────────────────────────────────────────────────────
  function openModal() {
    setForm(EMPTY_FORM);
    setErrors({});
    setShowModal(true);
  }
  function closeModal() { setShowModal(false); }

  function validate() {
    const e: Partial<typeof EMPTY_FORM> = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.idNumber.trim()) e.idNumber = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          nationality: form.nationality.trim() || null,
          idType: form.idType,
          idNumber: form.idNumber.trim(),
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      if (res.ok) {
        const newGuest = await res.json();
        setGuests(prev => [newGuest, ...prev]);
        closeModal();
      } else {
        const data = await res.json();
        setErrors({ firstName: data.error || 'Failed to save guest.' });
      }
    } catch {
      setErrors({ firstName: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  // ── Edit modal ─────────────────────────────────────────────────────────
  function openEdit(g: Guest, e: React.MouseEvent) {
    e.stopPropagation();
    setEditGuest(g);
    setEditForm({
      firstName: g.firstName ?? '',
      lastName: g.lastName ?? '',
      email: g.email ?? '',
      phone: g.phone ?? '',
      nationality: g.nationality ?? '',
      idType: g.idType ?? 'Passport',
      idNumber: g.idNumber ?? '',
      address: g.address ?? '',
      notes: g.notes ?? '',
    });
    setEditErrors({});
  }
  function closeEdit() { setEditGuest(null); }

  function validateEdit() {
    const e: Partial<typeof EMPTY_FORM> = {};
    if (!editForm.firstName.trim()) e.firstName = 'Required';
    if (!editForm.lastName.trim()) e.lastName = 'Required';
    if (editForm.email && !/\S+@\S+\.\S+/.test(editForm.email)) e.email = 'Invalid email';
    if (!editForm.idNumber.trim()) e.idNumber = 'Required';
    setEditErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleEditSubmit() {
    if (!editGuest || !validateEdit()) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/guests?id=${editGuest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: editForm.firstName.trim(),
          lastName: editForm.lastName.trim(),
          email: editForm.email.trim() || null,
          phone: editForm.phone.trim() || null,
          nationality: editForm.nationality.trim() || null,
          idType: editForm.idType,
          idNumber: editForm.idNumber.trim(),
          address: editForm.address.trim() || null,
          notes: editForm.notes.trim() || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setGuests(prev => prev.map(g => g.id === updated.id ? { ...g, ...updated } : g));
        closeEdit();
      } else {
        const data = await res.json();
        setEditErrors({ firstName: data.error || 'Failed to update guest.' });
      }
    } catch {
      setEditErrors({ firstName: 'Network error. Please try again.' });
    } finally {
      setEditSaving(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  function openDelete(g: Guest, e: React.MouseEvent) {
    e.stopPropagation();
    setDeleteGuest(g);
    setDeleteError('');
  }
  function closeDelete() { setDeleteGuest(null); setDeleteError(''); }

  async function handleDelete() {
    if (!deleteGuest) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/guests?id=${deleteGuest.id}`, { method: 'DELETE' });
      if (res.ok) {
        setGuests(prev => prev.filter(g => g.id !== deleteGuest.id));
        closeDelete();
      } else {
        const data = await res.json();
        setDeleteError(data.error || 'Failed to delete guest.');
      }
    } catch {
      setDeleteError('Network error. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  const inputStyle = (hasError?: string) => ({
    width: '100%',
    height: '38px',
    padding: '0 12px',
    borderRadius: '8px',
    border: `1px solid ${hasError ? '#C97D6E' : 'var(--border)'}`,
    background: 'var(--bg-input, var(--bg-hover))',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  });

  if (loading) return <GuestsSkeleton />;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Stats */}
      <div className="grid-cols-4">
        <div className="surface" style={{ borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Total Guests</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>{guests.length.toLocaleString()}</div>
        </div>
        <div className="surface" style={{ borderRadius: '12px', padding: '18px', borderColor: activeCount > 0 ? 'rgba(111,163,154,0.3)' : 'var(--border)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Currently Checked In</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#6FA39A' }}>{activeCount}</div>
        </div>
        <div className="surface" style={{ borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Repeat Guests</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#7FAE93' }}>{repeatGuests}</div>
        </div>
        <div className="surface" style={{ borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>New This Month</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#D2A24C' }}>{newThisMonth}</div>
        </div>
      </div>

      {/* Search & Add */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div className="search-field">
            {searching
              ? <Loader2 size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', animation: 'spin 0.8s linear infinite' }} />
              : <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            }
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guests..." className="input" style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }} autoComplete="off" name="guest-search" />
          </div>
          <button
            onClick={() => setActiveOnly(v => !v)}
            className={`btn ${activeOnly ? 'btn-primary' : 'btn-ghost'}`}
            style={{ height: '36px', fontSize: '12.5px' }}
          >
            <BedDouble size={14} /> Currently Staying {activeOnly ? `(${activeCount})` : ''}
          </button>
        </div>
        <button className="btn btn-primary" style={{ height: '36px', fontSize: '12.5px' }} onClick={openModal}>
          <Plus size={15} /> Add Guest
        </button>
      </div>

      {/* Guest cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {filtered.map((guest, i) => {
          const activeReservation = activeReservationByGuest.get(guest.id);
          return (
            <div key={guest.id} className="surface" style={{ borderRadius: '12px', padding: '20px', transition: 'border-color 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
            >
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: AVATAR_COLORS[i % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: 'white' }}>
                    {getInitials(guest.firstName, guest.lastName)}
                  </div>
                  {activeReservation && (
                    <span style={{ position: 'absolute', bottom: '-1px', right: '-1px', width: '12px', height: '12px', borderRadius: '50%', background: '#6FA39A', border: '2px solid var(--bg-surface)' }} title="Currently staying" />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{guest.firstName} {guest.lastName}</h3>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      {activeReservation && (
                        <span style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px', color: '#6FA39A', background: 'rgba(111,163,154,0.1)', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(111,163,154,0.2)' }}>
                          Active
                        </span>
                      )}
                      {(guest.totalStays || 0) >= 3 && (
                        <span style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px', color: '#D2A24C', background: 'rgba(210,162,76,0.1)', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(210,162,76,0.2)' }}>
                          <Star size={9} fill="#D2A24C" /> VIP
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{guest.nationality}</div>

                  {activeReservation && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(111,163,154,0.06)', border: '1px solid rgba(111,163,154,0.15)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        <BedDouble size={11} /> Room {activeReservation.room?.roomNumber}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        <LogOut size={11} /> Check-out: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatDate(activeReservation.checkOut)}</span>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                    {guest.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <Mail size={11} /> {guest.email}
                      </div>
                    )}
                    {guest.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <Phone size={11} /> {guest.phone}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {guest.idType}: <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{guest.idNumber}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '13px' }}>{guest.totalStays ?? 0}</span> stays
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: '12px', padding: '7px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '5px', color: '#C97D6E' }}
                  onClick={(e) => openDelete(guest, e)}
                >
                  <Trash2 size={12} /> Delete
                </button>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '7px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '5px' }}
                  onClick={(e) => openEdit(guest, e)}
                >
                  <Eye size={12} /> Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <Users size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
          <p>{search ? 'No guests found matching your search.' : 'No guests yet. Add your first guest!'}</p>
        </div>
      )}

      {/* ── Add Guest Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="surface" style={{ borderRadius: '16px', width: '100%', maxWidth: '520px', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div className="font-display" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Add New Guest</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Saved directly to the database.</div>
              </div>
              <button onClick={closeModal} className="btn btn-ghost" style={{ width: '32px', height: '32px', padding: 0, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {errors.firstName && !form.firstName && (
                <div style={{ fontSize: '12.5px', color: '#C97D6E', padding: '10px 12px', borderRadius: '8px', background: 'rgba(201,125,110,0.08)', border: '1px solid rgba(201,125,110,0.2)' }}>
                  {errors.firstName}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>First Name <span style={{ color: '#C97D6E' }}>*</span></label>
                  <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Juan" style={inputStyle(errors.firstName)} />
                  {errors.firstName && <div style={{ fontSize: '11px', color: '#C97D6E', marginTop: '4px' }}>{errors.firstName}</div>}
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Last Name <span style={{ color: '#C97D6E' }}>*</span></label>
                  <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="dela Cruz" style={inputStyle(errors.lastName)} />
                  {errors.lastName && <div style={{ fontSize: '11px', color: '#C97D6E', marginTop: '4px' }}>{errors.lastName}</div>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Email</label>
                  <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="juan@email.com" type="email" style={inputStyle(errors.email)} />
                  {errors.email && <div style={{ fontSize: '11px', color: '#C97D6E', marginTop: '4px' }}>{errors.email}</div>}
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+63 917 000 0000" style={inputStyle()} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Nationality</label>
                <input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} placeholder="Filipino" style={inputStyle()} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>ID Type</label>
                  <select value={form.idType} onChange={e => setForm(f => ({ ...f, idType: e.target.value }))} style={{ ...inputStyle(), appearance: 'none' as const }}>
                    <option>Passport</option>
                    <option>Driver&apos;s License</option>
                    <option>National ID</option>
                    <option>SSS ID</option>
                    <option>PhilHealth ID</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>ID Number <span style={{ color: '#C97D6E' }}>*</span></label>
                  <input value={form.idNumber} onChange={e => setForm(f => ({ ...f, idNumber: e.target.value }))} placeholder="P1234567A" style={inputStyle(errors.idNumber)} />
                  {errors.idNumber && <div style={{ fontSize: '11px', color: '#C97D6E', marginTop: '4px' }}>{errors.idNumber}</div>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px', borderTop: '1px solid var(--border-subtle)' }}>
              <button onClick={closeModal} disabled={saving} className="btn btn-ghost" style={{ height: '38px', fontSize: '13px' }}>Cancel</button>
              <button onClick={handleSubmit} disabled={saving} className="btn btn-primary" style={{ height: '38px', fontSize: '13px', minWidth: '110px' }}>
                {saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Plus size={14} />}
                {saving ? 'Saving…' : 'Add Guest'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Guest Modal ─────────────────────────────────────────────── */}
      {editGuest && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
          onClick={e => { if (e.target === e.currentTarget) closeEdit(); }}
        >
          <div className="surface" style={{ borderRadius: '16px', width: '100%', maxWidth: '520px', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div className="font-display" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Edit Guest</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{editGuest.firstName} {editGuest.lastName}</div>
              </div>
              <button onClick={closeEdit} className="btn btn-ghost" style={{ width: '32px', height: '32px', padding: 0, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {editErrors.firstName && !editForm.firstName && (
                <div style={{ fontSize: '12.5px', color: '#C97D6E', padding: '10px 12px', borderRadius: '8px', background: 'rgba(201,125,110,0.08)', border: '1px solid rgba(201,125,110,0.2)' }}>
                  {editErrors.firstName}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>First Name <span style={{ color: '#C97D6E' }}>*</span></label>
                  <input value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} style={inputStyle(editErrors.firstName)} />
                  {editErrors.firstName && <div style={{ fontSize: '11px', color: '#C97D6E', marginTop: '4px' }}>{editErrors.firstName}</div>}
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Last Name <span style={{ color: '#C97D6E' }}>*</span></label>
                  <input value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} style={inputStyle(editErrors.lastName)} />
                  {editErrors.lastName && <div style={{ fontSize: '11px', color: '#C97D6E', marginTop: '4px' }}>{editErrors.lastName}</div>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Email</label>
                  <input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} type="email" style={inputStyle(editErrors.email)} />
                  {editErrors.email && <div style={{ fontSize: '11px', color: '#C97D6E', marginTop: '4px' }}>{editErrors.email}</div>}
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Phone</label>
                  <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle()} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Nationality</label>
                <input value={editForm.nationality} onChange={e => setEditForm(f => ({ ...f, nationality: e.target.value }))} style={inputStyle()} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>ID Type</label>
                  <select value={editForm.idType} onChange={e => setEditForm(f => ({ ...f, idType: e.target.value }))} style={{ ...inputStyle(), appearance: 'none' as const }}>
                    <option>Passport</option>
                    <option>Driver&apos;s License</option>
                    <option>National ID</option>
                    <option>SSS ID</option>
                    <option>PhilHealth ID</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>ID Number <span style={{ color: '#C97D6E' }}>*</span></label>
                  <input value={editForm.idNumber} onChange={e => setEditForm(f => ({ ...f, idNumber: e.target.value }))} style={inputStyle(editErrors.idNumber)} />
                  {editErrors.idNumber && <div style={{ fontSize: '11px', color: '#C97D6E', marginTop: '4px' }}>{editErrors.idNumber}</div>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px', borderTop: '1px solid var(--border-subtle)' }}>
              <button onClick={closeEdit} disabled={editSaving} className="btn btn-ghost" style={{ height: '38px', fontSize: '13px' }}>Cancel</button>
              <button onClick={handleEditSubmit} disabled={editSaving} className="btn btn-primary" style={{ height: '38px', fontSize: '13px', minWidth: '120px' }}>
                {editSaving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Eye size={14} />}
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ─────────────────────────────────────────── */}
      {deleteGuest && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
          onClick={e => { if (e.target === e.currentTarget) closeDelete(); }}
        >
          <div className="surface" style={{ borderRadius: '16px', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="font-display" style={{ fontSize: '16px', fontWeight: 700, color: '#C97D6E' }}>Delete Guest</div>
              <button onClick={closeDelete} className="btn btn-ghost" style={{ width: '32px', height: '32px', padding: 0, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                Are you sure you want to delete <strong>{deleteGuest.firstName} {deleteGuest.lastName}</strong>? This cannot be undone.
              </p>
              {deleteError && (
                <div style={{ fontSize: '12.5px', color: '#C97D6E', padding: '10px 12px', borderRadius: '8px', background: 'rgba(201,125,110,0.08)', border: '1px solid rgba(201,125,110,0.2)' }}>
                  {deleteError}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px', borderTop: '1px solid var(--border-subtle)' }}>
              <button onClick={closeDelete} disabled={deleting} className="btn btn-ghost" style={{ height: '38px', fontSize: '13px' }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="btn btn-primary" style={{ height: '38px', fontSize: '13px', minWidth: '110px', background: '#C97D6E', borderColor: '#C97D6E' }}>
                {deleting ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Trash2 size={14} />}
                {deleting ? 'Deleting…' : 'Delete Guest'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}