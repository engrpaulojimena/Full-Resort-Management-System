'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Mail, Settings } from 'lucide-react';
import { useNotifications, notificationTypeMeta } from '@/components/providers/NotificationProvider';
import { timeAgo, formatDateTime } from '@/lib/utils';
import { NotificationType } from '@/types';

const FILTERS: Array<{ value: 'all' | 'unread' | NotificationType; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'new_reservation', label: 'Reservations' },
  { value: 'payment_pending', label: 'Payments' },
  { value: 'check_in_today', label: 'Check-ins' },
  { value: 'check_out_today', label: 'Check-outs' },
  { value: 'cancellation', label: 'Cancellations' },
];

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationType>('all');

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.isRead;
    return n.type === filter;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div className="table-scroll" style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '4px', width: 'fit-content', maxWidth: '100%' }}>
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              style={{
                padding: '6px 14px', borderRadius: '7px', fontSize: '12.5px', fontWeight: filter === f.value ? 600 : 400,
                cursor: 'pointer', border: 'none', transition: 'all 0.15s', whiteSpace: 'nowrap',
                background: filter === f.value ? 'var(--accent)' : 'transparent',
                color: filter === f.value ? 'white' : 'var(--text-secondary)',
              }}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="btn btn-ghost" style={{ height: '36px', fontSize: '12.5px' }}>
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
          <Link href="/admin/settings/notifications" className="btn btn-primary" style={{ height: '36px', fontSize: '12.5px', textDecoration: 'none' }}>
            <Settings size={14} /> Preferences
          </Link>
        </div>
      </div>

      {/* List */}
      <div className="surface" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <Bell size={28} style={{ marginBottom: '10px', opacity: 0.3 }} />
            <p style={{ fontSize: '13px' }}>No notifications here.</p>
          </div>
        ) : (
          filtered.map(n => {
            const meta = notificationTypeMeta[n.type];
            return (
              <div
                key={n.id}
                onClick={() => markAsRead(n.id)}
                style={{
                  display: 'flex', gap: '14px', padding: '16px 20px', cursor: 'pointer',
                  borderBottom: '1px solid var(--border-subtle)', background: n.isRead ? 'transparent' : 'var(--bg-hover)',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bell size={16} color={meta.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 600, color: meta.color, background: meta.bg, padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.02em' }}>{meta.label}</span>
                    {!n.isRead && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold)' }} />}
                    {n.emailSent && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                        <Mail size={10} /> Emailed
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: n.isRead ? 500 : 600, color: 'var(--text-primary)', marginBottom: '3px' }}>{n.title}</div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{n.message}</div>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }} title={formatDateTime(n.createdAt)}>
                  {timeAgo(n.createdAt)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
