'use client';

import { X, CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';
import { useNotifications } from '@/components/providers/NotificationProvider';

const VARIANT_CONFIG = {
  success: { icon: CheckCircle, color: '#2E7D32', bg: '#E8F5E9', border: '#A5D6A7' },
  error:   { icon: XCircle,     color: '#B71C1C', bg: '#FFEBEE', border: '#EF9A9A' },
  warning: { icon: AlertTriangle,color: '#E65100', bg: '#FFF3E0', border: '#FFCC80' },
  info:    { icon: Info,         color: '#1565C0', bg: '#E3F2FD', border: '#90CAF9' },
};

export default function Toaster() {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '360px',
        width: '100%',
      }}
    >
      {toasts.map((toast) => {
        const variant = toast.variant ?? 'info';
        const cfg = VARIANT_CONFIG[variant];
        const Icon = cfg.icon;

        return (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '14px 16px',
              background: 'var(--bg-surface, #fff)',
              border: `1px solid ${cfg.border}`,
              borderLeft: `4px solid ${cfg.color}`,
              borderRadius: '10px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              animation: 'slideInRight 0.2s ease',
            }}
          >
            <Icon size={18} color={cfg.color} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary, #111)', marginBottom: toast.description ? '2px' : 0 }}>
                {toast.title}
              </div>
              {toast.description && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted, #666)', lineHeight: 1.4 }}>
                  {toast.description}
                </div>
              )}
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #999)', padding: '0', flexShrink: 0 }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
