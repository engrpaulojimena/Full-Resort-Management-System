'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X, Loader2, Eye, Upload, Trash2, Eye as ImageIcon,
  BedDouble, Users, CreditCard, Home, Umbrella, Star, ArrowRight, ChevronRight, Plus,
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { Room, RoomType, RoomStatus } from '@/types';
import { formatCurrency } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────
export type ModalMode = 'view' | 'edit' | 'add';

interface RoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ModalMode;
  room?: Room;                        // required for view/edit
  onCreate?: (room: Room) => void;
  onUpdate?: (room: Room) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const TYPES: Array<{ value: RoomType; label: string }> = [
  { value: 'standard', label: 'Standard' },
  { value: 'deluxe',   label: 'Deluxe'   },
  { value: 'suite',    label: 'Suite'     },
  { value: 'villa',    label: 'Villa'     },
  { value: 'cottage',  label: 'Cottage'   },
];

const STATUSES: Array<{ value: RoomStatus; label: string }> = [
  { value: 'available',   label: 'Available'   },
  { value: 'occupied',    label: 'Occupied'    },
  { value: 'reserved',    label: 'Reserved'    },
  { value: 'maintenance', label: 'Maintenance' },
];

const ROOM_VISUALS: Record<RoomType, { icon: typeof BedDouble; gradient: string }> = {
  standard: { icon: BedDouble,  gradient: 'linear-gradient(135deg, #234E43 0%, #2F6656 100%)' },
  deluxe:   { icon: Star,   gradient: 'linear-gradient(135deg, #163832 0%, #234E43 100%)' },
  suite:    { icon: CreditCard,      gradient: 'linear-gradient(135deg, #6E5B25 0%, #AD8237 100%)' },
  villa:    { icon: Home,       gradient: 'linear-gradient(135deg, #0C1E1B 0%, #234E43 100%)' },
  cottage:  { icon: Umbrella,   gradient: 'linear-gradient(135deg, #3A4A2E 0%, #74875A 100%)' },
};

const TYPE_LABELS: Record<RoomType, string> = {
  standard: 'Standard', deluxe: 'Deluxe', suite: 'Suite', villa: 'Villa', cottage: 'Cottage',
};

// ─── Blank form ──────────────────────────────────────────────────────────────
const blankForm = () => ({
  roomNumber:    '',
  type:          'standard' as RoomType,
  status:        'available' as RoomStatus,
  floor:         '1',
  capacity:      '2',
  pricePerNight: '',
  description:   '',
  amenities:     '',
});

// ─── Shared input style ──────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px',
  border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-hover))',
  color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
  boxSizing: 'border-box',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  );
}

// ─── Image carousel (view mode) ──────────────────────────────────────────────
function ImageCarousel({ images, type }: { images: string[]; type: RoomType }) {
  const [idx, setIdx] = useState(0);
  const visual = ROOM_VISUALS[type];
  const Icon = visual.icon;

  if (!images || images.length === 0) {
    return (
      <div style={{ height: '220px', background: visual.gradient, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={72} strokeWidth={0.9} style={{ color: 'rgba(255,255,255,0.18)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.35) 100%)' }} />
        <div style={{ position: 'absolute', bottom: '12px', left: '14px', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>No photos uploaded</div>
      </div>
    );
  }

  return (
    <div style={{ height: '220px', position: 'relative', overflow: 'hidden', background: '#111' }}>
      <img
        src={images[idx]}
        alt={`Room photo ${idx + 1}`}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        onError={e => { (e.currentTarget as HTMLImageElement).src = ''; }}
      />
      {/* Gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.4) 100%)' }} />

      {/* Arrows */}
      {images.length > 1 && (
        <>
          <button onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <ArrowRight size={16} />
          </button>
          <button onClick={() => setIdx(i => (i + 1) % images.length)}
            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {/* Dots */}
      {images.length > 1 && (
        <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '5px' }}>
          {images.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              style={{ width: i === idx ? '16px' : '6px', height: '6px', borderRadius: '3px', background: i === idx ? '#fff' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0 }} />
          ))}
        </div>
      )}

      {/* Counter */}
      <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', color: '#fff' }}>
        {idx + 1} / {images.length}
      </div>
    </div>
  );
}

// ─── Image manager (edit/add mode) ───────────────────────────────────────────
function ImageManager({ images, onChange }: { images: string[]; onChange: (imgs: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError('');

    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload failed');
        const { url } = await res.json();
        uploaded.push(url);
      } catch {
        setUploadError(`Failed to upload ${file.name}`);
      }
    }

    if (uploaded.length > 0) onChange([...images, ...uploaded]);
    setUploading(false);
    // Reset file input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = '';
  }

  function remove(i: number) {
    onChange(images.filter((_, idx) => idx !== i));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Room Photos</label>

      {/* Drag-and-drop zone (when no images) */}
      {images.length === 0 && !uploading && (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          style={{ border: '1.5px dashed var(--border)', borderRadius: '10px', padding: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px' }}>
          <ImageIcon size={28} strokeWidth={1.2} />
          <span>Drop images here or click to upload</span>
          <span style={{ fontSize: '11px', opacity: 0.7 }}>JPG, PNG, WebP — uploaded to Cloudinary</span>
        </div>
      )}

      {/* Uploading state */}
      {uploading && (
        <div style={{ border: '1.5px dashed var(--border)', borderRadius: '10px', padding: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Uploading to Cloudinary…</span>
        </div>
      )}

      {uploadError && <p style={{ fontSize: '11.5px', color: '#C97D6E', margin: 0 }}>{uploadError}</p>}

      {/* Thumbnails grid */}
      {images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
          {images.map((src, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <button type="button" onClick={() => remove(i)}
                style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                <Trash2 size={11} />
              </button>
              {i === 0 && (
                <div style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.55)', borderRadius: '4px', padding: '1px 6px', fontSize: '9px', color: '#fff', fontWeight: 600 }}>COVER</div>
              )}
            </div>
          ))}
          {/* Add more tile */}
          {!uploading && (
            <div onClick={() => fileRef.current?.click()}
              style={{ aspectRatio: '1', borderRadius: '8px', border: '1.5px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <Plus size={20} strokeWidth={1.5} />
            </div>
          )}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)} />

      {/* Upload button always visible */}
      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
        className="btn btn-ghost"
        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', height: '34px', alignSelf: 'flex-start' }}>
        {uploading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={13} />}
        {uploading ? 'Uploading…' : images.length > 0 ? 'Add More Photos' : 'Choose Photos'}
      </button>
    </div>
  );
}

// ─── Main modal ──────────────────────────────────────────────────────────────
export default function RoomModal({ open, onOpenChange, mode: initialMode, room, onCreate, onUpdate }: RoomModalProps) {
  const [mode, setMode] = useState<ModalMode>(initialMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState(blankForm());

  // Sync mode whenever initialMode or open changes
  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setError('');
  }, [open, initialMode]);

  // Populate form whenever the modal opens or the target room changes
  useEffect(() => {
    if (!open) return;
    if (initialMode === 'add') {
      setForm(blankForm());
      setImages([]);
    } else if (room) {
      setForm({
        roomNumber:    room.roomNumber,
        type:          room.type,
        status:        room.status,
        floor:         String(room.floor),
        capacity:      String(room.capacity),
        pricePerNight: String(room.pricePerNight),
        description:   room.description || '',
        amenities:     (room.amenities || []).join(', '),
      });
      setImages(room.images || []);
    }
  }, [open, room, initialMode]);

  async function handleSubmit() {
    setError('');
    if (!form.roomNumber.trim() || !form.pricePerNight) {
      setError('Room number and price are required.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        roomNumber:    form.roomNumber.trim(),
        type:          form.type,
        status:        form.status,
        floor:         form.floor,
        capacity:      form.capacity,
        pricePerNight: form.pricePerNight,
        description:   form.description || undefined,
        amenities:     form.amenities ? form.amenities.split(',').map(a => a.trim()).filter(Boolean) : [],
        images,
      };

      if (mode === 'add') {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        const data: Room = await res.json();
        onCreate?.(data);
      } else {
        const res = await fetch('/api/rooms', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: room!.id, ...payload }),
        });
        if (!res.ok) throw new Error();
        const data: Room = await res.json();
        onUpdate?.(data);
      }

      onOpenChange(false);
    } catch {
      setError('Failed to save room. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isAdd  = mode === 'add';
  const title  = isAdd ? 'Add Room' : isEdit ? `Edit Room ${room?.roomNumber}` : `Room ${room?.roomNumber}`;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={() => onOpenChange(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
      <div style={{
        position: 'relative', background: 'var(--bg-surface)', borderRadius: '16px',
        width: '100%', maxWidth: isView ? '560px' : '560px', margin: '16px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.35)', border: '1px solid var(--border)',
        maxHeight: '92dvh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
      }}>

        {/* ── Image area (view: carousel, edit/add: manager) ── */}
        {isView ? (
          <ImageCarousel images={room?.images || []} type={room?.type || 'standard'} />
        ) : (
          <div style={{ borderRadius: '16px 16px 0 0', overflow: 'hidden' }}>
            {/* Small preview strip if images exist */}
            {images.length > 0 && (
              <div style={{ height: '160px', position: 'relative', overflow: 'hidden', background: '#111' }}>
                <img src={images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
                <div style={{ position: 'absolute', bottom: '10px', left: '14px', fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>Cover photo</div>
              </div>
            )}
          </div>
        )}

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
            {isView && room && (
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                {TYPE_LABELS[room.type]} · Floor {room.floor} · {room.capacity} guests
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isView && (
              <button onClick={() => setMode('edit')} className="btn btn-ghost"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', height: '32px' }}>
                <Eye size={13} /> Edit
              </button>
            )}
            <button onClick={() => onOpenChange(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '18px 22px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ── VIEW MODE ── */}
          {isView && room && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent)' }}>{formatCurrency(room.pricePerNight)}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>per night</div>
                <StatusBadge status={room.status} />
              </div>

              {room.description && (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{room.description}</p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  ['Room Number', room.roomNumber],
                  ['Type',        TYPE_LABELS[room.type]],
                  ['Floor',       `Floor ${room.floor}`],
                  ['Capacity',    `${room.capacity} guests`],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--bg-elevated)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{v}</div>
                  </div>
                ))}
              </div>

              {room.amenities && room.amenities.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Amenities</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {room.amenities.map(a => (
                      <span key={a} style={{ fontSize: '12px', padding: '4px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-secondary)' }}>{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── EDIT / ADD MODE ── */}
          {(isEdit || isAdd) && (
            <>
              {error && (
                <div style={{ fontSize: '12.5px', color: '#C97D6E', background: 'rgba(201,125,110,0.08)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(201,125,110,0.2)' }}>{error}</div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Room Number *">
                  <input style={inp} value={form.roomNumber} onChange={e => setForm(f => ({ ...f, roomNumber: e.target.value }))} placeholder="e.g. 104" />
                </Field>
                <Field label="Floor">
                  <input type="number" min="0" style={inp} value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Type">
                  <select style={{ ...inp, appearance: 'none' }} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as RoomType }))}>
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Status">
                  <select style={{ ...inp, appearance: 'none' }} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as RoomStatus }))}>
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Capacity (guests)">
                  <input type="number" min="1" style={inp} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
                </Field>
                <Field label="Price per Night (₱) *">
                  <input type="number" min="0" step="0.01" style={inp} value={form.pricePerNight} onChange={e => setForm(f => ({ ...f, pricePerNight: e.target.value }))} placeholder="e.g. 2500" />
                </Field>
              </div>

              <Field label="Amenities (comma-separated)">
                <input style={inp} value={form.amenities} onChange={e => setForm(f => ({ ...f, amenities: e.target.value }))} placeholder="WiFi, AC, TV, Hot Tub" />
              </Field>

              <Field label="Description">
                <textarea style={{ ...inp, height: 'auto', padding: '8px 12px', resize: 'vertical', minHeight: '62px' }}
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional notes about the room…" />
              </Field>

              <ImageManager images={images} onChange={setImages} />

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                {isEdit && (
                  <button className="btn btn-ghost" onClick={() => setMode('view')} disabled={submitting}>Cancel</button>
                )}
                {isAdd && (
                  <button className="btn btn-ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</button>
                )}
                <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ minWidth: '120px' }}>
                  {submitting
                    ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                    : isAdd ? 'Add Room' : 'Save Changes'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}