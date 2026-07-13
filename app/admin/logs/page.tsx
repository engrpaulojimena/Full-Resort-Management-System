'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Loader2 } from 'lucide-react';
import { formatDateTime, getInitials, activityIcon } from '@/lib/utils';
import { ActivityLog, ActivityType } from '@/types';

const TYPE_COLORS: Record<ActivityType, { color: string; bg: string }> = {
  create: { color: '#7FAE93', bg: 'rgba(127,174,147,0.1)' },
  update: { color: '#6FA39A', bg: 'rgba(111,163,154,0.1)' },
  delete: { color: '#C97D6E', bg: 'rgba(201,125,110,0.1)' },
  login:  { color: '#8CB9CE', bg: 'rgba(140,185,206,0.1)' },
  logout: { color: '#83837B', bg: 'rgba(176,176,166,0.1)' },
  verify: { color: '#7FAE93', bg: 'rgba(127,174,147,0.1)' },
  cancel: { color: '#D2A24C', bg: 'rgba(210,162,76,0.1)' },
};
const AVATAR_COLORS = ['#6FA39A', '#A79BC9', '#7FAE93', '#D2A24C'];

export default function LogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      const res = await fetch(`/api/activity-logs?${params}`);
      if (!res.ok) throw new Error('Failed');
      setLogs(await res.json());
    } catch {
      // silently fail – empty state shown below
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  // Debounced refetch whenever search / filter changes
  useEffect(() => {
    const t = setTimeout(fetchLogs, 300);
    return () => clearTimeout(t);
  }, [fetchLogs]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(['all', 'create', 'update', 'delete', 'login', 'logout', 'verify', 'cancel'] as const).map(type => (
            <button key={type} onClick={() => setTypeFilter(type)}
              style={{
                padding: '5px 12px', borderRadius: '7px', fontSize: '12px', cursor: 'pointer',
                border: '1px solid var(--border)',
                background: typeFilter === type
                  ? (type === 'all' ? 'var(--accent)' : TYPE_COLORS[type as ActivityType]?.bg || 'var(--accent)')
                  : 'var(--bg-surface)',
                color: typeFilter === type
                  ? (type === 'all' ? 'white' : TYPE_COLORS[type as ActivityType]?.color || 'white')
                  : 'var(--text-secondary)',
                fontWeight: typeFilter === type ? 600 : 400,
                textTransform: 'capitalize',
              }}>
              {type}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div className="search-field">
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..." className="input" style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }} autoComplete="off" name="logs-search" />
          </div>
          <button className="btn btn-ghost" style={{ height: '36px', fontSize: '12.5px' }}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Logs list */}
      <div className="surface" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{loading ? 'Loading…' : `${logs.length} events`}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Showing latest first</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <Loader2 size={22} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--text-muted)' }} />
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '13px' }}>
              {search || typeFilter !== 'all' ? 'No logs match your filters.' : 'No activity yet. Logs will appear here as actions are performed.'}
            </p>
          </div>
        ) : (
          <div style={{ padding: '8px 0' }}>
            {logs.map((log, i) => {
              const typeConfig = TYPE_COLORS[log.type] ?? { color: 'var(--text-muted)', bg: 'var(--bg-hover)' };
              return (
                <div key={log.id} style={{ padding: '14px 20px', borderBottom: i < logs.length - 1 ? '1px solid var(--border-subtle)' : 'none', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: typeConfig.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: typeConfig.color, fontWeight: 700, flexShrink: 0 }}>
                    {activityIcon(log.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>{log.description}</p>
                      <span style={{ fontSize: '10px', textTransform: 'capitalize', padding: '2px 8px', borderRadius: '4px', background: typeConfig.bg, color: typeConfig.color, fontWeight: 600, flexShrink: 0 }}>{log.type}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                      {log.user && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: AVATAR_COLORS[(log.userId ?? 0) % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: 'white' }}>
                            {getInitials(log.user.firstName, log.user.lastName)}
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{log.user.firstName} {log.user.lastName}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>({log.user.role?.replace('_', ' ')})</span>
                        </div>
                      )}
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.entity} {log.entityId ? `#${log.entityId}` : ''}</span>
                      {log.ipAddress && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{log.ipAddress}</span>}
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{formatDateTime(log.createdAt!)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}