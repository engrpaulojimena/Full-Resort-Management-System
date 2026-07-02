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
  label, value, icon: Icon, iconColor = 'var(--accent)', iconBg = 'rgba(35,78,67,0.10)',
  isCurrency, trend, subtitle,
}: StatCardProps) {
  const displayValue = isCurrency ? formatCurrency(value) : value;

  return (
    <div
      className="surface"
      style={{
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            {label}
          </div>
          <div style={{ fontSize: isCurrency ? '22px' : '28px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {displayValue}
          </div>
          {subtitle && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{subtitle}</div>
          )}
        </div>
        {Icon && (
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={20} color={iconColor} />
          </div>
        )}
      </div>
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 600,
              color: trend.positive ? '#2E7D32' : '#B71C1C',
              background: trend.positive ? '#E8F5E9' : '#FFEBEE',
              padding: '2px 7px',
              borderRadius: '20px',
            }}
          >
            {trend.positive ? '▲' : '▼'} {Math.abs(trend.value)}%
          </span>
        </div>
      )}
    </div>
  );
}
