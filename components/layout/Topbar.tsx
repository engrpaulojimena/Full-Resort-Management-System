'use client';

import { usePathname } from 'next/navigation';
import { Menu, Bell } from 'lucide-react';
import Link from 'next/link';
import { useNotifications } from '@/components/providers/NotificationProvider';

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard':              'Dashboard',
  '/admin/reservations':           'Reservations',
  '/admin/rooms':                  'Rooms',
  '/admin/guests':                 'Guests',
  '/admin/payments':               'Payments',
  '/admin/notifications':          'Notifications',
  '/admin/logs':                   'Activity Logs',
  '/admin/users':                  'Users',
  '/admin/settings':               'Settings',
  '/admin/settings/notifications': 'Notification Settings',
};

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const title = PAGE_TITLES[pathname] ?? 'Admin';

  return (
    <header
      style={{
        height: '58px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onMenuClick}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', borderRadius: '6px', display: 'flex' }}
          className="sidebar-toggle"
        >
          <Menu size={20} />
        </button>
        <h1 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{title}</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link href="/admin/notifications" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
          <Bell size={18} />
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', borderRadius: '50%', background: '#E57373', border: '2px solid var(--bg-surface)' }} />
          )}
        </Link>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #6FA39A, #D2A24C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
          A
        </div>
      </div>
    </header>
  );
}
