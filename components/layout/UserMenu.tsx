'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Settings, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getInitials } from '@/lib/utils';

const AVATAR_COLORS = ['#6FA39A', '#A79BC9', '#7FAE93', '#D2A24C', '#CFA0B5'];

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const initials = user ? getInitials(user.firstName, user.lastName) : '?';
  const avatarColor = AVATAR_COLORS[(user?.id ?? 0) % AVATAR_COLORS.length];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px 2px 2px', borderRadius: '20px' }}
      >
        <div style={{
          width: '30px', height: '30px', borderRadius: '50%',
          background: avatarColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 600, color: 'white', flexShrink: 0,
        }}>{initials}</div>
        <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
      </button>

      {open && (
        <div className="animate-fade-in" style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '220px',
          background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px',
          boxShadow: '0 16px 40px rgba(30,30,28,0.10)', zIndex: 100, overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {user ? `${user.firstName} ${user.lastName}` : 'Loading…'}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
          {isAdmin && (
            <div style={{ padding: '6px' }}>
              <Link href="/admin/settings" onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                <User size={14} /> My Profile
              </Link>
              <Link href="/admin/settings/notifications" onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                <Settings size={14} /> Notification Settings
              </Link>
            </div>
          )}
          <div style={{ padding: '6px', borderTop: isAdmin ? '1px solid var(--border-subtle)' : 'none' }}>
            <button
              onClick={() => { setOpen(false); logout(); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '8px', fontSize: '13px', color: 'var(--red)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <LogOut size={14} /> Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
