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
      {isOpen && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }}
        />
      )}

      <aside
        className="sidebar"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100dvh',
          width: '220px',
          background: 'var(--sidebar-bg, #0C1E1B)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          transition: 'transform 0.25s ease',
          transform: isOpen ? 'translateX(0)' : undefined,
        }}
      >
        {/* Logo */}
        <div style={{ padding: '20px 18px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{ position: 'relative', width: '36px', height: '36px', flexShrink: 0 }}>
              <Image
                src="/icon.png"
                alt="Kekamiya Beach Resort"
                fill
                className="object-contain drop-shadow"
                sizes="36px"
                priority
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'white', letterSpacing: '0.02em' }}>Kekamiya</span>
              <span style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Beach Resort</span>
            </div>
          </Link>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'none' }} className="sidebar-close">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV_ITEMS.map(({ href, icon: Icon, label, badge }) => {
            const active = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: active ? 600 : 400,
                  color: active ? 'white' : 'rgba(255,255,255,0.55)',
                  background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                  transition: 'all 0.15s',
                  position: 'relative',
                }}
              >
                <Icon size={16} />
                <span style={{ flex: 1 }}>{label}</span>
                {badge && unreadCount > 0 && (
                  <span style={{ fontSize: '10px', fontWeight: 700, background: '#E57373', color: 'white', borderRadius: '10px', padding: '1px 6px', minWidth: '18px', textAlign: 'center' }}>
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          Kekamiya Management System
        </div>
      </aside>
    </>
  );
}
