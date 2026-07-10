'use client';

import { ReservationStatus, RoomStatus, PaymentStatus, UserRole } from '@/types';

type BadgeStatus = ReservationStatus | RoomStatus | PaymentStatus | UserRole | string;

// All colors are harmonized with the brand palette (emerald + gold + earth tones)
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  // Reservation
  pending:      { label: 'Pending',      bg: 'rgba(158,114,48,0.11)',  color: '#7D5824' },
  confirmed:    { label: 'Confirmed',    bg: 'rgba(30,74,62,0.11)',    color: '#1A4035' },
  checked_in:   { label: 'Checked In',  bg: 'rgba(74,130,160,0.11)',  color: '#2A5C7A' },
  checked_out:  { label: 'Checked Out', bg: 'rgba(107,91,156,0.10)',  color: '#4A3A78' },
  cancelled:    { label: 'Cancelled',   bg: 'rgba(160,82,60,0.10)',   color: '#7A2E1C' },
  expired:      { label: 'Expired',     bg: 'rgba(130,120,110,0.10)', color: '#5A5248' },
  // Room
  available:    { label: 'Available',   bg: 'rgba(30,74,62,0.11)',    color: '#1A4035' },
  occupied:     { label: 'Occupied',    bg: 'rgba(74,130,160,0.11)',  color: '#2A5C7A' },
  maintenance:  { label: 'Maintenance', bg: 'rgba(160,82,60,0.10)',   color: '#7A2E1C' },
  reserved:     { label: 'Reserved',    bg: 'rgba(158,114,48,0.11)',  color: '#7D5824' },
  // Payment
  verified:     { label: 'Verified',    bg: 'rgba(30,74,62,0.11)',    color: '#1A4035' },
  rejected:     { label: 'Rejected',    bg: 'rgba(160,82,60,0.10)',   color: '#7A2E1C' },
  refunded:     { label: 'Refunded',    bg: 'rgba(107,91,156,0.10)',  color: '#4A3A78' },
  // User roles
  admin:        { label: 'Admin',       bg: 'rgba(158,114,48,0.14)',  color: '#7D5824' },
  manager:      { label: 'Manager',     bg: 'rgba(30,74,62,0.11)',    color: '#1A4035' },
  staff:        { label: 'Staff',       bg: 'rgba(130,120,110,0.10)', color: '#5A5248' },
  receptionist: { label: 'Receptionist',bg: 'rgba(74,130,160,0.11)',  color: '#2A5C7A' },
  // Generic
  active:       { label: 'Active',      bg: 'rgba(30,74,62,0.11)',    color: '#1A4035' },
  inactive:     { label: 'Inactive',    bg: 'rgba(130,120,110,0.08)', color: '#7A7670' },
};

interface StatusBadgeProps {
  status: BadgeStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status.replace(/_/g, ' '),
    bg:    'rgba(130,120,110,0.08)',
    color: '#7A7670',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding:    size === 'sm' ? '2px 9px' : '4px 12px',
        borderRadius: '20px',
        fontSize:   size === 'sm' ? '11px' : '12.5px',
        fontWeight: 600,
        background: cfg.bg,
        color:      cfg.color,
        whiteSpace: 'nowrap',
        textTransform: 'capitalize',
        letterSpacing: '0.01em',
      }}
    >
      {cfg.label}
    </span>
  );
}
