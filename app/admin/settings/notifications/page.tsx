'use client';

import { useState, useEffect } from 'react';
import { Mail, Send, Loader2, Info, CheckCircle2, XCircle } from 'lucide-react';
import Toggle from '@/components/ui/Toggle';
import { useNotifications } from '@/components/providers/NotificationProvider';
import { NotificationPreferences, EmailLog } from '@/types';

const defaultNotificationPreferences: NotificationPreferences = {
  emailNewReservation: true,
  emailPaymentPending: true,
  emailPaymentVerified: true,
  emailCheckInReminder: true,
  emailCheckOutReminder: false,
  emailCancellation: true,
  emailLowAvailability: false,
  guestConfirmationEmails: true,
};
import { timeAgo } from '@/lib/utils';

const PREF_ROWS: Array<{ key: keyof NotificationPreferences; label: string; description: string; audience: 'Staff' | 'Guest' }> = [
  { key: 'emailNewReservation', label: 'New reservation', description: 'Alert staff when a new booking comes in from any source.', audience: 'Staff' },
  { key: 'emailPaymentPending', label: 'Payment awaiting verification', description: 'Alert staff when a guest submits a payment reference.', audience: 'Staff' },
  { key: 'emailPaymentVerified', label: 'Payment verified', description: 'Notify the guest once their payment has been verified.', audience: 'Guest' },
  { key: 'emailCheckInReminder', label: 'Check-in reminder', description: 'Remind guests on the morning of their check-in date.', audience: 'Guest' },
  { key: 'emailCheckOutReminder', label: 'Check-out reminder', description: 'Remind guests the evening before their check-out date.', audience: 'Guest' },
  { key: 'emailCancellation', label: 'Cancellations', description: 'Alert staff whenever a reservation is cancelled.', audience: 'Staff' },
  { key: 'emailLowAvailability', label: 'Low room availability', description: 'Alert staff when a room type drops below 3 available units.', audience: 'Staff' },
  { key: 'guestConfirmationEmails', label: 'Guest booking confirmations', description: 'Automatically email guests a confirmation when a reservation is created.', audience: 'Guest' },
];

export default function NotificationSettingsPage() {
  const { showToast } = useNotifications();
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const [testEmail, setTestEmail] = useState('admin@resort.com');
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

  useEffect(() => {
    fetch('/api/email-logs', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setEmailLogs(data); })
      .catch(() => {});
  }, []);

  function togglePref(key: keyof NotificationPreferences) {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function savePrefs() {
    // In the connected app this persists to notification_preferences via a
    // server action / API route. Kept local-only here since this build runs
    // on mock data.
    showToast({ title: 'Preferences saved', description: 'Your email notification settings have been updated.', variant: 'success' });
  }

  async function sendTestEmail() {
    setSending(true);
    setLastResult(null);
    try {
      const res = await fetch('/api/notifications/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail, name: 'Admin' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLastResult({ ok: true, message: data.dryRun ? 'Dry-run mode: check server logs (RESEND_API_KEY not set).' : `Sent to ${testEmail}.` });
        showToast({ title: 'Test email sent', description: `Delivery attempted to ${testEmail}.`, variant: 'success' });
      } else {
        setLastResult({ ok: false, message: data.error || 'Failed to send test email.' });
        showToast({ title: 'Test email failed', description: data.error || 'Please check your email configuration.', variant: 'error' });
      }
    } catch {
      setLastResult({ ok: false, message: 'Network error while sending test email.' });
      showToast({ title: 'Test email failed', description: 'Network error.', variant: 'error' });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '860px' }}>
      {/* Configuration status */}
      <div className="surface" style={{ borderRadius: '12px', padding: '18px 20px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Mail size={17} color="var(--accent-hover)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Email delivery</div>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            Emails send through Resend. Set <code style={{ background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: '4px', fontSize: '11.5px' }}>RESEND_API_KEY</code> and{' '}
            <code style={{ background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: '4px', fontSize: '11.5px' }}>EMAIL_FROM</code> in your environment variables to go live —
            until then, sends run in dry-run mode and are logged to the server console instead of delivered.
          </p>
        </div>
      </div>

      {/* Preferences list */}
      <div className="surface" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="font-display" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Notification events</div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Choose which events trigger an automatic email.</p>
        </div>
        {PREF_ROWS.map(row => (
          <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{row.label}</span>
                <span style={{
                  fontSize: '10px', fontWeight: 600, padding: '1.5px 7px', borderRadius: '20px',
                  color: row.audience === 'Guest' ? '#5C8B82' : '#A79BC9',
                  background: row.audience === 'Guest' ? 'rgba(111,163,154,0.1)' : 'rgba(167,155,201,0.1)',
                }}>{row.audience}</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{row.description}</p>
            </div>
            <Toggle checked={prefs[row.key]} onChange={() => togglePref(row.key)} />
          </div>
        ))}
        <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={savePrefs} className="btn btn-primary" style={{ height: '36px', fontSize: '12.5px' }}>Save Preferences</button>
        </div>
      </div>

      {/* Test email */}
      <div className="surface" style={{ borderRadius: '12px', padding: '18px 20px' }}>
        <div className="font-display" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>Send a test email</div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>Confirm your configuration by sending yourself a sample notification.</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input value={testEmail} onChange={e => setTestEmail(e.target.value)} type="email" placeholder="you@resort.com" className="input" style={{ flex: 1, minWidth: '220px', height: '38px' }} />
          <button onClick={sendTestEmail} disabled={sending || !testEmail} className="btn btn-primary" style={{ height: '38px', fontSize: '12.5px' }}>
            {sending ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={14} />}
            {sending ? 'Sending…' : 'Send Test Email'}
          </button>
        </div>
        {lastResult && (
          <div style={{
            marginTop: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px',
            padding: '10px 12px', borderRadius: '8px',
            color: lastResult.ok ? '#5C8B82' : '#C97D6E',
            background: lastResult.ok ? 'rgba(111,163,154,0.08)' : 'rgba(201,125,110,0.08)',
            border: `1px solid ${lastResult.ok ? 'rgba(111,163,154,0.2)' : 'rgba(201,125,110,0.2)'}`,
          }}>
            {lastResult.ok ? <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: '1px' }} /> : <XCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />}
            <span>{lastResult.message}</span>
          </div>
        )}
      </div>

      {/* Recent email activity */}
      <div className="surface" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={14} style={{ color: 'var(--text-muted)' }} />
          <div className="font-display" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Recent email activity</div>
        </div>
        <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>To</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Sent</th>
            </tr>
          </thead>
          <tbody>
            {emailLogs.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No email logs yet.</td></tr>
            ) : emailLogs.map(log => (
              <tr key={log.id}>
                <td style={{ fontSize: '12.5px' }}>{log.toEmail}</td>
                <td style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>{log.subject}</td>
                <td>
                  <span className="badge" style={{
                    color: log.status === 'sent' ? '#5C8B82' : log.status === 'failed' ? '#C97D6E' : '#D2A24C',
                    background: log.status === 'sent' ? 'rgba(111,163,154,0.08)' : log.status === 'failed' ? 'rgba(201,125,110,0.08)' : 'rgba(210,162,76,0.08)',
                    borderColor: 'transparent',
                  }}>
                    {log.status}
                  </span>
                </td>
                <td style={{ fontSize: '12px' }}>{timeAgo(log.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
