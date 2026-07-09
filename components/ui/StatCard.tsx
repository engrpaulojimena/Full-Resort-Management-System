'use client';

import { LucideIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  isCurrency?: boolean;
  trend?: { value: number; positive: boolean };
  subtitle?: string;
}

export default function StatCard({
  label, value, icon: Icon,
  iconColor = 'var(--accent)', iconBg = 'var(--accent-dim)',
  isCurrency, trend, subtitle,
}: StatCardProps) {
  const displayValue = isCurrency ? formatCurrency(value) : value;

  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow-muted" style={{ marginBottom: '8px' }}>{label}</div>
          <div
            className="stat-value"
            style={{
              fontSize: isCurrency ? '21px' : '26px',
              fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1,
              fontFamily: "'Sora', sans-serif",
            }}
          >
            {displayValue}
          </div>
          {subtitle && (
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>{subtitle}</div>
          )}
        </div>
        {Icon && (
          <div
            className="stat-icon"
            style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: iconBg, display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
            }}
          >
            <Icon size={19} color={iconColor} />
          </div>
        )}
      </div>
      {trend && (
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontSize: '11px', fontWeight: 600,
            color:      trend.positive ? 'var(--accent)'  : 'var(--red)',
            background: trend.positive ? 'var(--accent-dim)' : 'rgba(160,82,60,0.10)',
            padding: '2px 8px', borderRadius: '20px',
          }}>
            {trend.positive ? '▲' : '▼'} {Math.abs(trend.value)}%
          </span>
        </div>
      )}
    </div>
  );
}
