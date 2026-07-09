'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, CalendarCheck, BedDouble, Users,
  CreditCard, Bell, Activity, Settings, X,
} from 'lucide-react';
import { useNotifications } from '@/components/providers/NotificationProvider';

const NAV_ITEMS = [
  { href: '/admin/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/reservations',  icon: CalendarCheck,   label: 'Reservations' },
  { href: '/admin/rooms',         icon: BedDouble,       label: 'Rooms' },
  { href: '/admin/guests',        icon: Users,           label: 'Guests' },
  { href: '/admin/payments',      icon: CreditCard,      label: 'Payments' },
  { href: '/admin/notifications', icon: Bell,            label: 'Notifications', badge: true },
  { href: '/admin/logs',          icon: Activity,        label: 'Activity Logs' },
  { href: '/admin/users',         icon: Users,           label: 'Users' },
  { href: '/admin/settings',      icon: Settings,        label: 'Settings' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay${isOpen ? ' open' : ''}`}
        onClick={onClose}
      />

      <aside
        className={`sidebar${isOpen ? ' open' : ''}`}
        style={{ width: '220px' }}
      >
        {/* Logo */}
        <div style={{
          padding: '20px 16px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--ink-line)',
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flex: 1, minWidth: 0 }}>
            <div style={{ position: 'relative', width: '34px', height: '34px', flexShrink: 0 }}>
              <Image src="/icon.png" alt="Kekamiya" fill className="object-contain" sizes="34px" priority />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, minWidth: 0 }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'white', letterSpacing: '0.02em' }}>Kekamiya</span>
              <span style={{ fontSize: '8.5px', fontWeight: 600, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Beach Resort</span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="sidebar-close-btn"
            aria-label="Close menu"
            style={{ color: 'rgba(255,255,255,0.35)', padding: '4px', borderRadius: '6px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {NAV_ITEMS.map(({ href, icon: Icon, label, badge }) => {
            const active = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 12px', borderRadius: '8px',
                  textDecoration: 'none', fontSize: '13px',
                  fontWeight: active ? 600 : 400,
                  color: active ? '#BF9A50' : 'rgba(255,255,255,0.52)',
                  background: active ? 'var(--ink-active)' : 'transparent',
                  boxShadow: active ? 'inset 2px 0 0 var(--gold)' : 'none',
                  transition: 'all 0.13s ease',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--ink-hover)'; (e.currentTarget as HTMLElement).style.color = active ? '#BF9A50' : 'rgba(255,255,255,0.80)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = active ? '#BF9A50' : 'rgba(255,255,255,0.52)'; }}
              >
                <Icon size={15} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{label}</span>
                {badge && unreadCount > 0 && (
                  <span style={{
                    fontSize: '10px', fontWeight: 700, background: '#C06050', color: 'white',
                    borderRadius: '10px', padding: '1px 6px', minWidth: '18px', textAlign: 'center',
                  }}>
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid var(--ink-line)',
          fontSize: '10.5px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em',
        }}>
          Kekamiya Management v2
        </div>
      </aside>
    </>
  );
}
