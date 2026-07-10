'use client';

import React from 'react';

/* ─────────────────────────────────────────────
   Base shimmer block — use as building block
───────────────────────────────────────────── */
export function SkeletonBlock({
  width = '100%',
  height = 16,
  borderRadius = 6,
  style = {},
}: {
  width?: string | number;
  height?: number;
  borderRadius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, var(--border-subtle) 25%, var(--bg-hover) 50%, var(--border-subtle) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s ease-in-out infinite',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

/* ─────────────────────────────────────────────
   Stat cards row  (4 cards)
───────────────────────────────────────────── */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid-cols-4" style={{ gap: '12px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="surface"
          style={{ borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}
        >
          <SkeletonBlock height={26} width="40%" />
          <SkeletonBlock height={11} width="65%" />
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Table skeleton  (rows of shimmering cells)
───────────────────────────────────────────── */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="surface" style={{ borderRadius: '12px', overflow: 'hidden' }}>
      {/* Fake header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '16px',
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock key={i} height={11} width="70%" />
        ))}
      </div>

      {/* Fake rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            padding: '14px 16px',
            borderBottom: rowIdx < rows - 1 ? '1px solid var(--border-subtle)' : 'none',
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: '16px',
            alignItems: 'center',
          }}
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <SkeletonBlock
              key={colIdx}
              height={13}
              width={colIdx === 0 ? '85%' : colIdx === cols - 1 ? '50%' : '75%'}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Room card skeletons  (grid of cards)
───────────────────────────────────────────── */
export function RoomCardsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '16px',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="surface"
          style={{ borderRadius: '12px', overflow: 'hidden' }}
        >
          {/* Image area */}
          <SkeletonBlock height={132} borderRadius={0} />

          {/* Card body */}
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <SkeletonBlock height={15} width={80} />
                <SkeletonBlock height={11} width={55} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                <SkeletonBlock height={14} width={60} />
                <SkeletonBlock height={10} width={45} />
              </div>
            </div>

            <SkeletonBlock height={12} width="50%" />

            {/* Amenity chips */}
            <div style={{ display: 'flex', gap: '5px' }}>
              {[55, 40, 50, 35].map((w, j) => (
                <SkeletonBlock key={j} height={20} width={w} borderRadius={4} />
              ))}
            </div>

            {/* Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <SkeletonBlock height={32} borderRadius={8} />
              <SkeletonBlock height={32} borderRadius={8} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Dashboard full skeleton
───────────────────────────────────────────── */
export function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Hero banner */}
      <SkeletonBlock height={196} borderRadius={12} />

      {/* Stat cards */}
      <StatCardsSkeleton count={4} />

      {/* Two-column charts area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="surface" style={{ borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <SkeletonBlock height={14} width="40%" />
          <SkeletonBlock height={180} borderRadius={8} />
        </div>
        <div className="surface" style={{ borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <SkeletonBlock height={14} width="40%" />
          <SkeletonBlock height={180} borderRadius={8} />
        </div>
      </div>

      {/* Table section */}
      <TableSkeleton rows={5} cols={6} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Reservations page skeleton
───────────────────────────────────────────── */
export function ReservationsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <StatCardsSkeleton count={4} />
      <TableSkeleton rows={8} cols={10} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Payments page skeleton
───────────────────────────────────────────── */
export function PaymentsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <StatCardsSkeleton count={4} />
      <TableSkeleton rows={7} cols={7} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Guests page skeleton
───────────────────────────────────────────── */
export function GuestsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <StatCardsSkeleton count={3} />
      <TableSkeleton rows={8} cols={6} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Financials page skeleton
───────────────────────────────────────────── */
export function FinancialsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <StatCardsSkeleton count={4} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="surface" style={{ borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <SkeletonBlock height={14} width="45%" />
          <SkeletonBlock height={200} borderRadius={8} />
        </div>
        <div className="surface" style={{ borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <SkeletonBlock height={14} width="45%" />
          <SkeletonBlock height={200} borderRadius={8} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Rooms page skeleton  (stats + grid)
───────────────────────────────────────────── */
export function RoomsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <StatCardsSkeleton count={4} />
      <RoomCardsSkeleton count={8} />
    </div>
  );
}
