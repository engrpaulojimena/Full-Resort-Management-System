'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Shield, ShieldCheck, User, Edit, Trash2, Loader2 } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { getInitials, formatDateTime } from '@/lib/utils';
import { User as UserType, UserRole } from '@/types';

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string; icon: typeof Shield }> = {
  super_admin: { label: 'Super Admin', color: '#A9803C', bg: 'rgba(210,162,76,0.14)', icon: ShieldCheck },
  admin: { label: 'Admin', color: '#6FA39A', bg: 'rgba(111,163,154,0.1)', icon: Shield },
  staff: { label: 'Staff', color: '#83837B', bg: 'rgba(176,176,166,0.1)', icon: User },
  receptionist: { label: 'Receptionist', color: '#8CB9CE', bg: 'rgba(140,185,206,0.1)', icon: User },
};
const AVATAR_COLORS = ['#6FA39A', '#A79BC9', '#7FAE93', '#D2A24C', '#CFA0B5'];

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setUsers(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u => {
    const name = `${u.firstName} ${u.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Role summary */}
      <div className="grid-cols-4" style={{ gap: '12px' }}>
        {(Object.entries(ROLE_CONFIG) as [UserRole, typeof ROLE_CONFIG[UserRole]][]).map(([role, config]) => {
          const count = users.filter(u => u.role === role).length;
          const IconComp = config.icon;
          return (
            <div key={role} className="surface" style={{ borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconComp size={16} color={config.color} />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: config.color }}>{count}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{config.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div className="search-field">
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="input" style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }} />
        </div>
        <button className="btn btn-primary" style={{ height: '36px', fontSize: '12.5px' }}>
          <Plus size={15} /> Invite User
        </button>
      </div>

      {/* Table */}
      <div className="surface" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : (
        <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Email</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user, i) => {
              const roleConfig = ROLE_CONFIG[user.role];
              const RoleIcon = roleConfig.icon;
              return (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: AVATAR_COLORS[i % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: 'white', flexShrink: 0 }}>
                        {getInitials(user.firstName, user.lastName)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '13px' }}>{user.firstName} {user.lastName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>#{user.id.toString().padStart(4, '0')}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '6px', background: roleConfig.bg, fontSize: '11.5px', fontWeight: 500, color: roleConfig.color }}>
                      <RoleIcon size={11} /> {roleConfig.label}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px' }}>{user.email}</td>
                  <td><StatusBadge status={user.isActive ? 'active' : 'inactive'} /></td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '12px', height: '30px' }}>
                        <Edit size={12} /> Edit
                      </button>
                      {user.role !== 'super_admin' && (
                        <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '12px', height: '30px' }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        )}
      </div>
    </div>
  );
}
