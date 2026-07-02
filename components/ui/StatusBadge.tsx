'use client';

import { ReservationStatus, RoomStatus, PaymentStatus, UserRole } from '@/types';

type BadgeStatus = ReservationStatus | RoomStatus | PaymentStatus | UserRole | string;

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  // Reservation
  pending:      { label: 'Pending',      bg: '#FFF3E0', color: '#E65100' },
  confirmed:    { label: 'Confirmed',    bg: '#E8F5E9', color: '#2E7D32' },
  checked_in:   { label: 'Checked In',  bg: '#E3F2FD', color: '#1565C0' },
  checked_out:  { label: 'Checked Out', bg: '#F3E5F5', color: '#6A1B9A' },
  cancelled:    { label: 'Cancelled',   bg: '#FFEBEE', color: '#B71C1C' },
  // Room
  available:    { label: 'Available',   bg: '#E8F5E9', color: '#2E7D32' },
  occupied:     { label: 'Occupied',    bg: '#E3F2FD', color: '#1565C0' },
  maintenance:  { label: 'Maintenance', bg: '#FFEBEE', color: '#B71C1C' },
  reserved:     { label: 'Reserved',    bg: '#FFF3E0', color: '#E65100' },
  // Payment
  verified:     { label: 'Verified',    bg: '#E8F5E9', color: '#2E7D32' },
  rejected:     { label: 'Rejected',    bg: '#FFEBEE', color: '#B71C1C' },
  refunded:     { label: 'Refunded',    bg: '#F3E5F5', color: '#6A1B9A' },
  // User roles
  super_admin:  { label: 'Super Admin', bg: '#FCE4EC', color: '#880E4F' },
  admin:        { label: 'Admin',       bg: '#F3E5F5', color: '#4A148C' },
  staff:        { label: 'Staff',       bg: '#E8EAF6', color: '#1A237E' },
  receptionist: { label: 'Receptionist',bg: '#E0F7FA', color: '#006064' },
  // Generic
  active:       { label: 'Active',      bg: '#E8F5E9', color: '#2E7D32' },
  inactive:     { label: 'Inactive',    bg: '#FAFAFA', color: '#757575' },
};

interface StatusBadgeProps {
  status: BadgeStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status.replace(/_/g, ' '),
    bg: '#F5F5F5',
    color: '#616161',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'sm' ? '2px 9px' : '4px 12px',
        borderRadius: '20px',
        fontSize: size === 'sm' ? '11px' : '12.5px',
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.color,
        whiteSpace: 'nowrap',
        textTransform: 'capitalize',
        letterSpacing: '0.01em',
      }}
    >
      {cfg.label}
    </span>
  );
}
