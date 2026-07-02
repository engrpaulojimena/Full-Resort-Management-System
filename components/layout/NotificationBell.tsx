'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Mail, CheckCheck, Settings } from 'lucide-react';
import { useNotifications, notificationTypeMeta } from '@/components/providers/NotificationProvider';
import { timeAgo } from '@/lib/utils';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const recent = notifications.slice(0, 6);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
        style={{ position: 'relative', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex' }}
      >
        <Bell size={16} style={{ color: 'var(--text-secondary)' }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            minWidth: '16px', height: '16px', borderRadius: '9px', padding: '0 4px',
            background: 'var(--gold)', border: '1.5px solid var(--bg-surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '9.5px', fontWeight: 700, color: 'white', lineHeight: 1,
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-fade-in" style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '340px', maxWidth: 'calc(100vw - 32px)',
          background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px',
          boxShadow: '0 16px 40px rgba(30,30,28,0.10)', zIndex: 100, overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="font-display" style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)' }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--gold)', background: 'var(--gold-dim)', padding: '2px 7px', borderRadius: '10px' }}>{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '11.5px', color: 'var(--accent)', fontWeight: 600 }}>
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {recent.length === 0 && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Bell size={22} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p style={{ fontSize: '12.5px' }}>You&apos;re all caught up.</p>
              </div>
            )}
            {recent.map(n => {
              const meta = notificationTypeMeta[n.type];
              return (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  style={{
                    width: '100%', textAlign: 'left', display: 'flex', gap: '10px', padding: '12px 16px',
                    background: n.isRead ? 'transparent' : 'var(--bg-hover)',
                    border: 'none', borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer', font: 'inherit',
                  }}
                >
                  <div style={{ width: '8px', paddingTop: '5px', flexShrink: 0 }}>
                    {!n.isRead && <span style={{ display: 'block', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--gold)' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: meta.color, background: meta.bg, padding: '1.5px 7px', borderRadius: '20px', letterSpacing: '0.02em' }}>{meta.label}</span>
                      {n.emailSent && <Mail size={10} style={{ color: 'var(--text-muted)' }} />}
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: n.isRead ? 500 : 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{n.title}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{n.message}</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px' }}>{timeAgo(n.createdAt)}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', borderTop: '1px solid var(--border-subtle)' }}>
            <Link href="/admin/notifications" onClick={() => setOpen(false)} style={{ flex: 1, textAlign: 'center', padding: '11px', fontSize: '12px', fontWeight: 600, color: 'var(--accent-hover)', textDecoration: 'none' }}>
              View all
            </Link>
            <div style={{ width: '1px', background: 'var(--border-subtle)' }} />
            <Link href="/admin/settings/notifications" onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '11px 16px', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none' }}>
              <Settings size={12} /> Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
