'use client';

import { useEffect, useMemo, useState } from 'react';
import { BedDouble, CalendarCheck, CreditCard, Users, TrendingUp, LogIn, LogOut, Loader2, AlertTriangle } from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate, formatDateTime, activityIcon } from '@/lib/utils';
import { getReservationPaymentSummary } from '@/lib/payments';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Room, Reservation, Payment, Guest, ActivityLog } from '@/types';

const OCCUPANCY_COLORS: Record<string, string> = {
  occupied: '#234E43',
  available: '#6FA39A',
  reserved: '#D2A24C',
  maintenance: '#E57373',
};
const OCCUPANCY_LABELS: Record<string, string> = {
  occupied: 'Occupied', available: 'Available', reserved: 'Reserved', maintenance: 'Maintenance',
};

function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-PH', { month: 'short' }).format(date);
}

export default function DashboardPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function fetchAll() {
      setLoading(true);
      Promise.all([
        fetch('/api/rooms',          { cache: 'no-store' }).then(r => r.json()).catch(() => []),
        fetch('/api/reservations',   { cache: 'no-store' }).then(r => r.json()).catch(() => []),
        fetch('/api/payments',       { cache: 'no-store' }).then(r => r.json()).catch(() => []),
        fetch('/api/guests',         { cache: 'no-store' }).then(r => r.json()).catch(() => []),
        fetch('/api/activity-logs',  { cache: 'no-store' }).then(r => r.json()).catch(() => []),
      ]).then(([r, res, pay, g, l]) => {
        setRooms(Array.isArray(r) ? r : []);
        setReservations(Array.isArray(res) ? res : []);
        setPayments(Array.isArray(pay) ? pay : []);
        setGuests(Array.isArray(g) ? g : []);
        setLogs(Array.isArray(l) ? l : []);
      }).finally(() => setLoading(false));
    }

    fetchAll();

    // Re-fetch whenever the user navigates back to this tab/page
    function onVisible() { if (document.visibilityState === 'visible') fetchAll(); }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const stats = useMemo(() => {
    const availableRooms = rooms.filter(r => r.status === 'available').length;
    const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
    const activeReservations = reservations.filter(r => r.status !== 'cancelled' && r.status !== 'checked_out').length;
    const pendingReservations = reservations.filter(r => r.status === 'pending').length;
    const todayCheckIns = reservations.filter(r => isToday(r.checkIn) && (r.status === 'confirmed' || r.status === 'checked_in')).length;
    const todayCheckOuts = reservations.filter(r => isToday(r.checkOut) && (r.status === 'checked_in' || r.status === 'checked_out')).length;
    const now = new Date();
    const monthlyRevenue = payments
      .filter(p => p.status === 'verified' && p.createdAt && new Date(p.createdAt).getMonth() === now.getMonth() && new Date(p.createdAt).getFullYear() === now.getFullYear())
      .reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);
    const pendingPayments = payments.filter(p => p.status === 'pending').length;

    return {
      totalRooms: rooms.length,
      availableRooms,
      occupiedRooms,
      totalReservations: activeReservations,
      pendingReservations,
      todayCheckIns,
      todayCheckOuts,
      monthlyRevenue,
      pendingPayments,
      totalGuests: guests.length,
    };
  }, [rooms, reservations, payments, guests]);

  const occupancyRate = stats.totalRooms > 0 ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) : 0;

  const occupancyData = useMemo(() => {
    const counts: Record<string, number> = {};
    rooms.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return Object.entries(counts).map(([status, value]) => ({
      name: OCCUPANCY_LABELS[status] || status,
      value,
      color: OCCUPANCY_COLORS[status] || '#B0B0A6',
    }));
  }, [rooms]);

  const revenueChartData = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthLabel(d), revenue: 0 });
    }
    payments.filter(p => p.status === 'verified' && p.createdAt).forEach(p => {
      const d = new Date(p.createdAt!);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = months.find(m => m.key === key);
      if (bucket) bucket.revenue += parseFloat(String(p.amount));
    });
    return months.map(({ label, revenue }) => ({ month: label, revenue }));
  }, [payments]);

  const recentReservations = useMemo(() => {
    return [...reservations]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5);
  }, [reservations]);

  const recentLogs = useMemo(() => logs.slice(0, 5), [logs]);

  // Currently checked-in guests (with payment summary + overstay flag)
  const currentlyStaying = useMemo(() => {
    const now = new Date();
    return reservations
      .filter(r => r.status === 'checked_in')
      .map(r => {
        const paymentSummary = getReservationPaymentSummary(r, payments);
        const checkOut = new Date(r.checkOut);
        const overstayHours = checkOut < now ? Math.floor((now.getTime() - checkOut.getTime()) / (1000 * 60 * 60)) : 0;
        return { ...r, paymentSummary, overstayHours };
      })
      .sort((a, b) => b.overstayHours - a.overstayHours); // overstayers first
  }, [reservations, payments]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px' }}>
        <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--text-muted)' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Welcome banner ── */}
      <div className="hero-banner animate-fade-in-up" style={{
        position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', minHeight: '196px',
        display: 'flex', alignItems: 'stretch', boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Image-free signature backdrop — deep ink base with a horizon-arc motif */}
        <div style={{ position: 'absolute', inset: 0, background: 'var(--ink)' }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(120% 140% at 8% 0%, rgba(173,130,55,0.22) 0%, rgba(173,130,55,0) 45%), radial-gradient(90% 120% at 100% 100%, rgba(35,78,67,0.55) 0%, rgba(35,78,67,0) 55%)',
        }} />
        <svg
          aria-hidden="true"
          style={{ position: 'absolute', right: '-6%', bottom: '-38%', width: '62%', minWidth: '340px', height: 'auto', opacity: 0.5 }}
          viewBox="0 0 400 400" fill="none"
        >
          <circle cx="200" cy="200" r="199" stroke="url(#ringGrad)" strokeWidth="1" />
          <circle cx="200" cy="200" r="150" stroke="url(#ringGrad)" strokeWidth="1" />
          <circle cx="200" cy="200" r="101" stroke="url(#ringGrad)" strokeWidth="1" />
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#AD8237" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#AD8237" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '3px', background: 'var(--horizon)' }} />

        <div className="hero-banner-content" style={{
          position: 'relative', padding: '28px 30px', color: 'white',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%',
        }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#CBA054' }}>
              Property Overview
            </p>
            <h1 className="font-display" style={{ fontSize: 'clamp(20px, 4vw, 30px)', fontWeight: 600, marginTop: '6px', letterSpacing: '-0.01em' }}>
              Welcome back, Admin
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', marginTop: '5px' }}>
              Here&apos;s what&apos;s happening across your resort today.
            </p>
          </div>

          {/* ── Stat chips — 2-per-row on mobile via .hero-chips class ── */}
          <div className="hero-chips" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '18px' }}>
            {[
              { label: 'Occupancy', value: `${occupancyRate}%` },
              { label: 'Check-ins today', value: stats.todayCheckIns },
              { label: 'Check-outs today', value: stats.todayCheckOuts },
              { label: 'Pending payments', value: stats.pendingPayments },
            ].map((chip) => (
              <div key={chip.label} className="hero-chip glass" style={{
                borderRadius: '10px', padding: '9px 16px',
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(255,255,255,0.10)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                minWidth: 0,
              }}>
                <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.58)', whiteSpace: 'nowrap' }}>
                  {chip.label}
                </div>
                <div className="font-display" style={{ fontSize: '20px', fontWeight: 600, marginTop: '2px', color: 'white', lineHeight: 1 }}>
                  {chip.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats grid row 1 ── */}
      <div className="grid-cols-4">
        <StatCard label="Available Rooms" value={stats.availableRooms} icon={BedDouble} iconColor="#74875A" iconBg="rgba(116,135,90,0.10)" />
        <StatCard label="Monthly Revenue" value={stats.monthlyRevenue} icon={TrendingUp} isCurrency />
        <StatCard label="Today Check-ins" value={stats.todayCheckIns} icon={LogIn} iconColor="#234E43" iconBg="rgba(35,78,67,0.10)" />
        <StatCard label="Pending Payments" value={stats.pendingPayments} icon={CreditCard} iconColor="#AD8237" iconBg="rgba(173,130,55,0.10)" />
      </div>

      {/* ── Stats grid row 2 ── */}
      <div className="grid-cols-4">
        <StatCard label="Total Rooms" value={stats.totalRooms} icon={BedDouble} />
        <StatCard label="Active Reservations" value={stats.totalReservations} icon={CalendarCheck} iconColor="#7C6CA8" iconBg="rgba(124,108,168,0.10)" />
        <StatCard label="Today Check-outs" value={stats.todayCheckOuts} icon={LogOut} iconColor="#5C90AC" iconBg="rgba(92,144,172,0.10)" />
        <StatCard label="Total Guests" value={stats.totalGuests} icon={Users} iconColor="#B17B93" iconBg="rgba(177,123,147,0.10)" />
      </div>

      {/* ── Charts ── */}
      <div className="grid-split-wide">
        {/* Revenue Chart */}
        <div className="surface horizon-edge active" style={{ borderRadius: 'var(--radius-md)', padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 className="font-display" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Revenue Overview</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>Monthly revenue trend, current fiscal year</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="font-display" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--accent)' }}>{formatCurrency(stats.monthlyRevenue)}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>this month</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={revenueChartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#234E43" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#234E43" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFEBE0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#7A776C' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#7A776C' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#FFFFFF', border: '1px solid #E9E3D4', borderRadius: '10px', fontSize: '12px', boxShadow: '0 8px 24px rgba(12,30,27,0.12)' }}
                formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                labelStyle={{ color: '#7A776C' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#234E43" strokeWidth={2.5} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Occupancy Pie */}
        <div className="surface horizon-edge active" style={{ borderRadius: 'var(--radius-md)', padding: '22px' }}>
          <div style={{ marginBottom: '18px' }}>
            <h2 className="font-display" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Room Occupancy</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>Current status breakdown</p>
          </div>
          <div style={{ position: 'relative' }}>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={occupancyData} cx="50%" cy="50%" innerRadius={48} outerRadius={68} paddingAngle={3} dataKey="value" stroke="none">
                  {occupancyData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E9E3D4', borderRadius: '10px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, calc(-50% - 6px))', textAlign: 'center', pointerEvents: 'none' }}>
              <div className="font-display" style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>{occupancyRate}%</div>
              <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>occupied</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            {occupancyData.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: item.color, display: 'inline-block' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.name}</span>
                </div>
                <span className="font-display" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom section ── */}
      <div className="grid-split-reservations">
        {/* Recent Reservations */}
        <div className="surface" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 className="font-display" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Recent Reservations</h2>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>Latest bookings across all rooms</p>
            </div>
            <a href="/admin/reservations" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>View all →</a>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Guest</th>
                  <th>Room</th>
                  <th>Check In</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentReservations.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '12.5px' }}>No reservations yet.</td></tr>
                )}
                {recentReservations.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>{r.confirmationCode}</td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.guest?.firstName} {r.guest?.lastName}</td>
                    <td>Room {r.room?.roomNumber}</td>
                    <td>{formatDate(r.checkIn)}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="font-display" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(r.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="surface" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="font-display" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Recent Activity</h2>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>Staff actions across the system</p>
            </div>
            <a href="/admin/logs" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>View all →</a>
          </div>
          <div style={{ padding: '14px 22px 6px', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '35px', top: '20px', bottom: '20px', width: '1px', background: 'var(--border)' }} />
            {recentLogs.length === 0 && (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>No activity yet.</div>
            )}
            {recentLogs.map((log, i) => (
              <div key={log.id} style={{ display: 'flex', gap: '12px', paddingBottom: i < recentLogs.length - 1 ? '18px' : '4px', position: 'relative' }}>
                <div style={{
                  width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0, zIndex: 1,
                  background: log.type === 'verify' ? 'rgba(35,78,67,0.12)' : log.type === 'delete' || log.type === 'cancel' ? 'rgba(177,95,73,0.12)' : 'rgba(173,130,55,0.12)',
                  border: `1.5px solid ${log.type === 'verify' ? '#234E43' : log.type === 'delete' || log.type === 'cancel' ? '#B15F49' : '#AD8237'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', color: log.type === 'verify' ? '#234E43' : log.type === 'delete' || log.type === 'cancel' ? '#B15F49' : '#AD8237',
                  fontWeight: 700,
                }}>
                  {activityIcon(log.type)}
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingTop: '2px' }}>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-primary)', lineHeight: 1.4 }}>{log.description}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{log.user ? `${log.user.firstName} • ` : ''}{formatDateTime(log.createdAt!)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Currently Staying ── */}
      <div className="surface" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 className="font-display" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Currently Staying</h2>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {currentlyStaying.length === 0 ? 'No guests checked in' : `${currentlyStaying.length} guest${currentlyStaying.length > 1 ? 's' : ''} currently in-house`}
            </p>
          </div>
          <a href="/admin/reservations" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>Manage →</a>
        </div>

        {currentlyStaying.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No guests currently checked in.
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Room</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Payment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {currentlyStaying.map(r => {
                  const isOverstaying = r.overstayHours > 0;
                  const overstayDays = Math.floor(r.overstayHours / 24);
                  const overstayLabel = overstayDays >= 1
                    ? `${overstayDays}d ${r.overstayHours % 24}h overdue`
                    : `${r.overstayHours}h overdue`;

                  return (
                    <tr key={r.id} style={{ background: isOverstaying ? 'rgba(239,83,80,0.04)' : undefined }}>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '13px' }}>
                          {r.guest?.firstName} {r.guest?.lastName}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.guest?.email}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Room {r.room?.roomNumber}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{r.room?.type}</div>
                      </td>
                      <td>{formatDate(r.checkIn)}</td>
                      <td>
                        <span style={{ color: isOverstaying ? '#EF5350' : 'inherit', fontWeight: isOverstaying ? 600 : 400 }}>
                          {formatDate(r.checkOut)}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '11px', fontWeight: 600,
                          color: r.paymentSummary.status === 'fully_paid' ? '#81C784' : r.paymentSummary.status === 'partially_paid' ? '#FFB74D' : '#E57373',
                          background: r.paymentSummary.status === 'fully_paid' ? 'rgba(129,199,132,0.12)' : r.paymentSummary.status === 'partially_paid' ? 'rgba(255,183,77,0.12)' : 'rgba(229,115,115,0.12)',
                          padding: '2px 8px', borderRadius: '6px',
                        }}>
                          {r.paymentSummary.status === 'fully_paid' ? '✓ Paid' : r.paymentSummary.status === 'partially_paid' ? `Partial (${r.paymentSummary.percentPaid}%)` : 'Unpaid'}
                        </span>
                      </td>
                      <td>
                        {isOverstaying ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            fontSize: '11px', fontWeight: 700, color: '#EF5350',
                            background: 'rgba(239,83,80,0.10)', border: '1px solid rgba(239,83,80,0.3)',
                            padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap',
                            animation: 'pulse 2s infinite',
                          }}>
                            <AlertTriangle size={10} /> {overstayLabel}
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '11px', fontWeight: 600, color: '#6FA39A',
                            background: 'rgba(111,163,154,0.12)', padding: '3px 8px', borderRadius: '6px',
                          }}>
                            Staying
                          </span>
                        )}
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
