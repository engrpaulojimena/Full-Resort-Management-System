'use client';

import { usePathname } from 'next/navigation';
import { Menu, Bell } from 'lucide-react';
import Link from 'next/link';
import { useNotifications } from '@/components/providers/NotificationProvider';
import UserMenu from '@/components/layout/UserMenu';

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  '/admin/dashboard':              { title: 'Dashboard',             sub: 'Overview & live stats' },
  '/admin/reservations':           { title: 'Reservations',          sub: 'Manage all bookings' },
  '/admin/rooms':                  { title: 'Rooms',                 sub: 'Inventory & availability' },
  '/admin/guests':                 { title: 'Guests',                sub: 'Guest profiles & history' },
  '/admin/payments':               { title: 'Payments',              sub: 'Transactions & verification' },
  '/admin/notifications':          { title: 'Notifications',         sub: 'Alerts & updates' },
  '/admin/logs':                   { title: 'Activity Logs',         sub: 'System audit trail' },
  '/admin/users':                  { title: 'Users',                 sub: 'Staff accounts & roles' },
  '/admin/settings':               { title: 'Settings',              sub: 'System configuration' },
  '/admin/settings/notifications': { title: 'Notification Settings', sub: 'Email & alert preferences' },
};

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const page = PAGE_TITLES[pathname] ?? { title: 'Admin', sub: '' };

  return (
    <header
      style={{
        height: '56px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 30,
        gap: '12px',
      }}
    >
      {/* Left: hamburger + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <button
          onClick={onMenuClick}
          className="hamburger-btn"
          aria-label="Open menu"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', padding: '6px',
            borderRadius: '7px', display: 'flex', flexShrink: 0,
          }}
        >
          <Menu size={19} />
        </button>

        {/* Desktop title — shown inline next to hamburger on mobile */}
        <div style={{ minWidth: 0 }}>
          <div className="topbar-title" style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {page.title}
          </div>
          {page.sub && (
            <div className="topbar-subtitle" style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1 }}>
              {page.sub}
            </div>
          )}
        </div>
      </div>

      {/* Right: notifications + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <Link
          href="/admin/notifications"
          style={{
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '36px', height: '36px', borderRadius: '8px',
            color: 'var(--text-secondary)', textDecoration: 'none',
            transition: 'background 0.13s',
          }}
          title="Notifications"
        >
          <Bell size={17} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: '6px', right: '6px',
              width: '7px', height: '7px', borderRadius: '50%',
              background: '#C06050', border: '2px solid var(--bg-surface)',
            }} />
          )}
        </Link>

        <UserMenu />
      </div>
    </header>
  );
}
