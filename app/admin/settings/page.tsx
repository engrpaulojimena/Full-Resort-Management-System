'use client';

import Link from 'next/link';
import { Bell, User, ChevronRight, ShieldCheck } from 'lucide-react';

const SETTINGS_LINKS = [
  { href: '/admin/settings/notifications', icon: Bell, title: 'Notifications', description: 'Email alerts, event preferences, and test delivery.' },
];

export default function SettingsPage() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '720px' }}>
      <div className="surface" style={{ borderRadius: '12px', padding: '22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #6FA39A, #D2A24C)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', fontWeight: 600, color: 'white', flexShrink: 0,
        }}>A</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="font-display" style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>Admin User</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>admin@resort.com</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 600, color: '#5C8B82', background: 'var(--accent-dim)', padding: '5px 12px', borderRadius: '20px' }}>
          <ShieldCheck size={13} /> Super Admin
        </span>
      </div>

      <div className="surface" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        {SETTINGS_LINKS.map(link => (
          <Link key={link.href} href={link.href} style={{
            display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px',
            textDecoration: 'none', borderBottom: '1px solid var(--border-subtle)',
          }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <link.icon size={17} color="var(--accent-hover)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{link.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{link.description}</div>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </Link>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', opacity: 0.5 }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={17} color="var(--text-muted)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>Profile &amp; Security</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Coming soon</div>
          </div>
        </div>
      </div>
    </div>
  );
}
