'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Shield,
  ShieldCheck,
  User,
  Eye,
  Trash2,
  Loader2,
  X,
  XCircle,
  Check
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { getInitials, formatDateTime } from '@/lib/utils';
import { User as UserType, UserRole } from '@/types';
import { useAuth } from '@/components/providers/AuthProvider';

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string; icon: typeof Shield }> = {
  super_admin: { label: 'Super Admin', color: '#C45C3A', bg: 'rgba(196,92,58,0.14)',  icon: ShieldCheck },
  admin:       { label: 'Admin',       color: '#A9803C', bg: 'rgba(210,162,76,0.14)', icon: ShieldCheck },
  manager:     { label: 'Manager',     color: '#6FA39A', bg: 'rgba(111,163,154,0.1)', icon: Shield },
  staff:       { label: 'Staff',       color: '#83837B', bg: 'rgba(176,176,166,0.1)', icon: User },
  receptionist:{ label: 'Receptionist',color: '#8CB9CE', bg: 'rgba(140,185,206,0.1)', icon: User },
};
const AVATAR_COLORS = ['#6FA39A', '#A79BC9', '#7FAE93', '#D2A24C', '#CFA0B5'];

type ModalMode = 'invite' | 'edit' | null;

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
}

const EMPTY_FORM: UserFormData = { firstName: '', lastName: '', email: '', password: '', role: 'staff', isActive: true };

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editTarget, setEditTarget] = useState<UserType | null>(null);
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  function loadUsers() {
    fetch('/api/users', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setUsers(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadUsers(); }, []);

  const filtered = users
    .filter(u => {
    const name = `${u.firstName} ${u.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      if (a.id === currentUser?.id) return -1;
      if (b.id === currentUser?.id) return 1;
      return 0;
    });

  function openInvite() {
    setForm(EMPTY_FORM);
    setFormError('');
    setShowPw(false);
    setEditTarget(null);
    setModalMode('invite');
  }

  function openEdit(u: UserType) {
    setForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, password: '', role: u.role, isActive: u.isActive ?? true });
    setFormError('');
    setShowPw(false);
    setEditTarget(u);
    setModalMode('edit');
  }

  async function handleSave() {
    setFormError('');
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setFormError('First name, last name and email are required.');
      return;
    }
    if (modalMode === 'invite' && !form.password) {
      setFormError('Password is required for new users.');
      return;
    }
    setSaving(true);
    try {
      let res: Response;
      if (modalMode === 'invite') {
        res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        const body: Record<string, unknown> = { id: editTarget!.id, role: form.role, isActive: form.isActive };
        if (form.password) body.password = form.password;
        res = await fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Failed to save'); return; }
      setModalMode(null);
      loadUsers();
    } catch {
      setFormError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      loadUsers();
    } catch { /* ignore */ }
  }

  const isOpen = modalMode !== null;

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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="input" style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }} autoComplete="off" name="user-search" />
        </div>
        {canManage && (
          <button className="btn btn-primary" style={{ height: '36px', fontSize: '12.5px' }} onClick={openInvite}>
            <Plus size={15} /> Add User
          </button>
        )}
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
              {canManage && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((user, i) => {
              const roleConfig = ROLE_CONFIG[user.role];
              const RoleIcon = roleConfig.icon;
              const isMe = user.id === currentUser?.id;
              return (
                <tr key={user.id} style={isMe ? { background: 'rgba(111,163,154,0.07)', borderLeft: '2px solid var(--accent)' } : {}}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: AVATAR_COLORS[i % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: 'white', flexShrink: 0 }}>
                        {getInitials(user.firstName, user.lastName)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '13px' }}>
                          {user.firstName} {user.lastName}{isMe && <span style={{ marginLeft: '6px', fontSize: '10px', color: 'var(--accent)', fontWeight: 600, background: 'var(--accent-dim)', padding: '1px 6px', borderRadius: '4px' }}>You</span>}
                        </div>
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
                  {canManage && (
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '12px', height: '30px' }} onClick={() => openEdit(user)}>
                          <Eye size={12} /> Edit
                        </button>
                        {user.role !== 'admin' && !isMe && (
                          deleteConfirm === user.id ? (
                            <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '12px', height: '30px' }} onClick={() => handleDelete(user.id)}>
                              <Check size={12} /> Confirm
                            </button>
                          ) : (
                            <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '12px', height: '30px' }} onClick={() => setDeleteConfirm(user.id)}>
                              <Trash2 size={12} />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={canManage ? 6 : 5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px', fontSize: '13px' }}>No users found</td></tr>
            )}
          </tbody>
        </table>
        </div>
        )}
      </div>

      {/* Modal */}
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,28,25,0.45)' }} onClick={() => setModalMode(null)} />
          <div className="animate-fade-in surface" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {modalMode === 'invite' ? 'Add New User' : 'Edit User'}
              </div>
              <button onClick={() => setModalMode(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}><X size={16} /></button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {formError && (
                <div style={{ background: 'rgba(160,82,60,0.09)', border: '1px solid rgba(160,82,60,0.22)', borderRadius: '8px', padding: '10px 13px', fontSize: '12.5px', color: 'var(--red)' }}>
                  {formError}
                </div>
              )}
              {modalMode === 'invite' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>First Name</label>
                      <input className="input" style={{ width: '100%', height: '38px', fontSize: '13px' }} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Juan" />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Last Name</label>
                      <input className="input" style={{ width: '100%', height: '38px', fontSize: '13px' }} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="dela Cruz" />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Email</label>
                    <input className="input" style={{ width: '100%', height: '38px', fontSize: '13px' }} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="juan@resort.com" autoComplete="off" name="user-email" />
                  </div>
                </>
              )}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                  {modalMode === 'edit' ? 'New Password (leave blank to keep)' : 'Password'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input className="input" style={{ width: '100%', height: '38px', fontSize: '13px', paddingRight: '38px' }} type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={modalMode === 'edit' ? '••••••••' : 'Min. 8 characters'} autoComplete="new-password" name="user-password" />
                  <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                    {showPw ? <XCircle size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Role</label>
                <select className="input" style={{ width: '100%', height: '38px', fontSize: '13px' }} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}>
                  {(Object.entries(ROLE_CONFIG) as [UserRole, typeof ROLE_CONFIG[UserRole]][]).map(([r, c]) => (
                    <option key={r} value={r}>{c.label}</option>
                  ))}
                </select>
              </div>
              {modalMode === 'edit' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }} />
                  <label htmlFor="isActive" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>Account is active</label>
                </div>
              )}
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-ghost" onClick={() => setModalMode(null)} style={{ height: '36px', fontSize: '13px' }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ height: '36px', fontSize: '13px', minWidth: '90px', justifyContent: 'center' }}>
                {saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : modalMode === 'invite' ? 'Create User' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}