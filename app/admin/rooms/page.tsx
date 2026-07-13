'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, BedDouble, Users, CreditCard, Home, Umbrella, Star, Wrench, CheckCircle, Loader2 } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import RoomModal, { ModalMode } from '@/components/rooms/AddRoomModal';
import { RoomsSkeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils';
import { Room, RoomType, RoomStatus } from '@/types';

const TYPE_LABELS: Record<RoomType, string> = {
  standard: 'Standard', deluxe: 'Deluxe', suite: 'Suite', villa: 'Villa', cottage: 'Cottage',
};

const ROOM_VISUALS: Record<RoomType, { icon: typeof BedDouble; gradient: string }> = {
  standard: { icon: BedDouble,  gradient: 'linear-gradient(135deg, #234E43 0%, #2F6656 100%)' },
  deluxe:   { icon: Star,   gradient: 'linear-gradient(135deg, #163832 0%, #234E43 100%)' },
  suite:    { icon: CreditCard,      gradient: 'linear-gradient(135deg, #6E5B25 0%, #AD8237 100%)' },
  villa:    { icon: Home,       gradient: 'linear-gradient(135deg, #0C1E1B 0%, #234E43 100%)' },
  cottage:  { icon: Umbrella,   gradient: 'linear-gradient(135deg, #3A4A2E 0%, #74875A 100%)' },
};

const STATUS_FILTERS = [
  { value: 'all',         label: 'All Rooms'    },
  { value: 'available',   label: 'Available'    },
  { value: 'occupied',    label: 'Occupied'     },
  { value: 'reserved',    label: 'Reserved'     },
  { value: 'maintenance', label: 'Maintenance'  },
];

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Quick-toggle state (available ↔ maintenance, per card)
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Modal state
  const [modalOpen, setModalOpen]   = useState(false);
  const [modalMode, setModalMode]   = useState<ModalMode>('add');
  const [activeRoom, setActiveRoom] = useState<Room | undefined>();

  useEffect(() => {
    setLoading(true);
    fetch('/api/rooms')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRooms(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function openAdd() {
    setActiveRoom(undefined);
    setModalMode('add');
    setModalOpen(true);
  }

  function openView(room: Room) {
    setActiveRoom(room);
    setModalMode('view');
    setModalOpen(true);
  }

  function openEdit(room: Room, e: React.MouseEvent) {
    e.stopPropagation();
    setActiveRoom(room);
    setModalMode('edit');
    setModalOpen(true);
  }

  function handleCreate(room: Room) {
    setRooms(prev => [room, ...prev]);
  }

  function handleUpdate(updated: Room) {
    setRooms(prev => prev.map(r => r.id === updated.id ? updated : r));
  }

  // Only allow toggling between available and maintenance.
  // Occupied / reserved rooms are controlled by the reservation flow.
  async function handleQuickToggle(room: Room, e: React.MouseEvent) {
    e.stopPropagation();
    if (room.status === 'occupied' || room.status === 'reserved') return;
    const nextStatus: RoomStatus = room.status === 'maintenance' ? 'available' : 'maintenance';
    setTogglingId(room.id);
    try {
      const res = await fetch('/api/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: room.id, status: nextStatus }),
      });
      if (!res.ok) throw new Error('Failed');
      const updated: Room = await res.json();
      setRooms(prev => prev.map(r => r.id === updated.id ? updated : r));
    } catch {
      // silently ignore — user can try again
    } finally {
      setTogglingId(null);
    }
  }

  const filtered = rooms.filter(room => {
    const q = search.toLowerCase();
    const matchSearch = room.roomNumber.toLowerCase().includes(q) || room.type.includes(q);
    const matchStatus = statusFilter === 'all' || room.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <RoomsSkeleton />;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`btn ${statusFilter === f.value ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 14px', fontSize: '12px' }}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div className="search-field">
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rooms…"
              className="input" style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }} autoComplete="off" name="rooms-search" />
          </div>
          <button className="btn btn-primary" style={{ height: '36px' }} onClick={openAdd}>
            <Plus size={15} /> Add Room
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid-cols-4" style={{ gap: '12px' }}>
        {[
          { label: 'Total',       value: rooms.length,                                          color: 'var(--text-primary)' },
          { label: 'Available',   value: rooms.filter(r => r.status === 'available').length,   color: '#7FAE93' },
          { label: 'Occupied',    value: rooms.filter(r => r.status === 'occupied').length,    color: '#6FA39A' },
          { label: 'Maintenance', value: rooms.filter(r => r.status === 'maintenance').length, color: '#D2A24C' },
        ].map(s => (
          <div key={s.label} className="surface" style={{ borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label} rooms</div>
          </div>
        ))}
      </div>

      {/* Room grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
        {filtered.map(room => {
          const visual = ROOM_VISUALS[room.type];
          const Icon   = visual.icon;
          const cover  = room.images?.[0];

          return (
            <div key={room.id} onClick={() => openView(room)}
              className="surface"
              style={{ borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s, transform 0.15s' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}>

              {/* Thumbnail */}
              <div style={{ height: '132px', position: 'relative', overflow: 'hidden', background: visual.gradient }}>
                {cover ? (
                  <img src={cover} alt={`Room ${room.roomNumber}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <Icon size={64} strokeWidth={1.1} style={{ position: 'absolute', right: '-8px', bottom: '-10px', color: 'rgba(255,255,255,0.16)' }} />
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,32,29,0.1) 0%, rgba(15,32,29,0.05) 50%, rgba(15,32,29,0.3) 100%)' }} />
                <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  <StatusBadge status={room.status} />
                </div>
                <div style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.95)', background: 'rgba(15,32,29,0.35)', padding: '3px 8px', borderRadius: '6px', backdropFilter: 'blur(2px)' }}>
                  Floor {room.floor}
                </div>
                {room.images && room.images.length > 1 && (
                  <div style={{ position: 'absolute', bottom: '8px', right: '10px', fontSize: '10px', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.4)', padding: '2px 7px', borderRadius: '5px' }}>
                    +{room.images.length - 1} photos
                  </div>
                )}
              </div>

              {/* Card body */}
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Room {room.roomNumber}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', marginBottom: 0 }}>{TYPE_LABELS[room.type]}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>{formatCurrency(room.pricePerNight)}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>per night</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  <Users size={12} /> {room.capacity} guests
                </div>

                {room.amenities && room.amenities.length > 0 && (
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {room.amenities.slice(0, 4).map(a => (
                      <span key={a} style={{ fontSize: '10px', padding: '2px 7px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-muted)' }}>{a}</span>
                    ))}
                    {room.amenities.length > 4 && (
                      <span style={{ fontSize: '10px', padding: '2px 7px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-muted)' }}>+{room.amenities.length - 4}</span>
                    )}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '7px' }}>
                  <button
                    onClick={e => openEdit(room, e)}
                    className="btn btn-ghost"
                    style={{ fontSize: '11.5px', padding: '7px', justifyContent: 'center' }}>
                    Edit
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); openView(room); }}
                    className="btn btn-primary"
                    style={{ fontSize: '11.5px', padding: '7px', justifyContent: 'center' }}>
                    View
                  </button>
                  {/* Quick-toggle: available ↔ maintenance only */}
                  {(room.status === 'available' || room.status === 'maintenance') ? (
                    <button
                      onClick={e => handleQuickToggle(room, e)}
                      disabled={togglingId === room.id}
                      title={room.status === 'maintenance' ? 'Mark as available' : 'Set to maintenance'}
                      className="btn btn-ghost"
                      style={{
                        fontSize: '11.5px', padding: '7px', justifyContent: 'center',
                        color: room.status === 'maintenance' ? 'var(--accent)' : 'var(--gold)',
                      }}>
                      {togglingId === room.id
                        ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                        : room.status === 'maintenance'
                          ? <CheckCircle size={13} />
                          : <Wrench size={13} />
                      }
                    </button>
                  ) : (
                    <div /> /* placeholder to keep grid alignment */
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <BedDouble size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
          <p>No rooms found matching your filters.</p>
        </div>
      )}

      <RoomModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        room={activeRoom}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
    </div>
  );
}