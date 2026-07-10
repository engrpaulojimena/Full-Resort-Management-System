'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, CalendarCheck, BedDouble, Users,
  CreditCard, Bell, Activity, Settings, X, UserCog, BarChart2,
} from 'lucide-react';
import { useNotifications } from '@/components/providers/NotificationProvider';
import { useAuth } from '@/components/providers/AuthProvider';

const NAV_ITEMS = [
  { href: '/admin/dashboard',     icon: LayoutDashboard, label: 'Dashboard',       adminOnly: true  },
  { href: '/admin/reservations',  icon: CalendarCheck,   label: 'Reservations',    adminOnly: false },
  { href: '/admin/rooms',         icon: BedDouble,       label: 'Rooms',           adminOnly: false },
  { href: '/admin/guests',        icon: Users,           label: 'Guests',          adminOnly: false },
  { href: '/admin/payments',      icon: CreditCard,      label: 'Payments',        adminOnly: false },
  { href: '/admin/financials',    icon: BarChart2,       label: 'Financials',      adminOnly: true  },
  { href: '/admin/notifications', icon: Bell,            label: 'Notifications',   adminOnly: false, badge: true },
  { href: '/admin/logs',          icon: Activity,        label: 'Activity Logs',   adminOnly: true  },
  { href: '/admin/users',         icon: UserCog,         label: 'User Management', adminOnly: true  },
  { href: '/admin/settings',      icon: Settings,        label: 'Settings',        adminOnly: true  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';

  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      <div className={`sidebar-overlay${isOpen ? ' open' : ''}`} onClick={onClose} />

      <aside className={`sidebar${isOpen ? ' open' : ''}`} style={{ width: '220px' }}>
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
          {visibleItems.map(({ href, icon: Icon, label, badge }) => {
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

        {/* User role badge */}
        {user && (
          <div style={{
            margin: '0 8px 8px',
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--ink-line)',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
              {user.firstName} {user.lastName}
            </div>
            <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.28)', marginTop: '2px', textTransform: 'capitalize' }}>
              {user.role.replace('_', ' ')}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: '10px 16px', borderTop: '1px solid var(--ink-line)',
          fontSize: '10.5px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em',
        }}>
          Kekamiya Management v2
        </div>
      </aside>
    </>
  );
}