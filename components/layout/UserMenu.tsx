'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Settings, User, LogOut, ChevronDown } from 'lucide-react';

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px 2px 2px', borderRadius: '20px' }}
      >
        <div style={{
          width: '30px', height: '30px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #6FA39A, #D2A24C)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 600, color: 'white', flexShrink: 0,
        }}>A</div>
        <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
      </button>

      {open && (
        <div className="animate-fade-in" style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '220px',
          background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px',
          boxShadow: '0 16px 40px rgba(30,30,28,0.10)', zIndex: 100, overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Admin User</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>admin@resort.com</div>
          </div>
          <div style={{ padding: '6px' }}>
            <Link href="/admin/settings" onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
              <User size={14} /> My Profile
            </Link>
            <Link href="/admin/settings/notifications" onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
              <Settings size={14} /> Notification Settings
            </Link>
          </div>
          <div style={{ padding: '6px', borderTop: '1px solid var(--border-subtle)' }}>
            <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '8px', fontSize: '13px', color: 'var(--red)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <LogOut size={14} /> Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
