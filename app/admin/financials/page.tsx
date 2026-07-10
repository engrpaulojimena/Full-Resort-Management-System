'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Edit2, Check, X, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { FinancialsSkeleton } from '@/components/ui/Skeleton';

interface ExpenseItem {
  id: number;
  month: string;
  description: string;
  amount: string;
}

interface MonthRow {
  month: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  items: ExpenseItem[];
}

interface FinancialData {
  history: MonthRow[];
  selected: MonthRow | null;
}

function toMonthLabel(yyyymm: string | null | undefined): string {
  if (!yyyymm || !yyyymm.includes('-')) return 'Unknown';
  const [year, month] = yyyymm.split('-');
  return new Date(parseInt(year), parseInt(month) - 1)
    .toLocaleString('en-PH', { month: 'long', year: 'numeric' });
}

function currentYYYYMM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function last24Months(): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return result;
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, accent, sub }: {
  label: string; value: number; icon: React.ElementType;
  accent: string; sub?: string;
}) {
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px 22px',
      flex: 1, minWidth: 0,
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <div style={{
          width: '30px', height: '30px', borderRadius: '8px',
          background: `${accent}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={14} color={accent} />
        </div>
      </div>
      <div style={{ fontSize: 'clamp(15px, 4vw, 22px)', fontWeight: 700, color: accent, letterSpacing: '-0.02em', wordBreak: 'break-word' }}>
        {formatCurrency(value)}
      </div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function FinancialsPage() {
  const [selectedMonth, setSelectedMonth] = useState(currentYYYYMM());
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New line item form state
  const [addingItem, setAddingItem] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  // Inline edit state per item
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/financials?month=${selectedMonth}`);
      if (!res.ok) throw new Error('Failed to load');
      setData(await res.json());
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [selectedMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleAddItem() {
    if (!newDesc.trim() || !newAmount || isNaN(parseFloat(newAmount))) return;
    setSavingNew(true);
    try {
      const res = await fetch('/api/financials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, description: newDesc.trim(), amount: parseFloat(newAmount) }),
      });
      if (!res.ok) throw new Error('Failed');
      setNewDesc(''); setNewAmount(''); setAddingItem(false);
      await fetchData();
    } finally { setSavingNew(false); }
  }

  function startEdit(item: ExpenseItem) {
    setEditingId(item.id);
    setEditDesc(item.description);
    setEditAmount(item.amount);
  }

  async function handleSaveEdit() {
    if (!editingId || !editDesc.trim() || isNaN(parseFloat(editAmount))) return;
    setSavingEdit(true);
    try {
      const res = await fetch('/api/financials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, description: editDesc.trim(), amount: parseFloat(editAmount) }),
      });
      if (!res.ok) throw new Error('Failed');
      setEditingId(null);
      await fetchData();
    } finally { setSavingEdit(false); }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await fetch('/api/financials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await fetchData();
    } finally { setDeletingId(null); }
  }

  const active = data?.selected;
  const net = active?.netIncome ?? 0;
  const netColor = !active ? 'var(--text-muted)' : net >= 0 ? '#1E7A54' : '#A0523C';
  const items = active?.items ?? [];

  const inp: React.CSSProperties = {
    background: 'var(--bg-base)',
    border: '1px solid var(--border)',
    borderRadius: '7px',
    padding: '7px 11px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
  };

  if (loading) return <FinancialsSkeleton />;

  return (
    <div style={{ padding: '28px 24px', maxWidth: '960px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Financial Overview
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Revenue is auto-computed from verified payments. Expenses are entered manually per month.
        </p>
      </div>

      {/* Month Selector */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          Select Month
        </label>
        <select
          value={selectedMonth}
          onChange={e => { setSelectedMonth(e.target.value); setAddingItem(false); setEditingId(null); }}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '14px', fontWeight: 600,
            padding: '9px 14px', cursor: 'pointer', outline: 'none',
            minWidth: '200px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {last24Months().map(m => (
            <option key={m} value={m}>{toMonthLabel(m)}</option>
          ))}
        </select>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <StatCard label="Total Revenue" value={active?.revenue ?? 0}
          icon={TrendingUp} accent="var(--amber)"
          sub={'From verified payments'} />
        <StatCard label="Total Expenses" value={active?.expenses ?? 0}
          icon={DollarSign} accent="var(--violet)"
          sub={items.length > 0 ? `${items.length} item${items.length !== 1 ? 's' : ''}` : 'No entries yet'} />
        <StatCard
          label="Net Income" value={net}
          icon={net >= 0 ? TrendingUp : TrendingDown}
          accent={netColor}
          sub={active
            ? net >= 0 ? 'Profitable month 🎉' : 'Expenses exceed revenue'
            : undefined}
        />
      </div>

      {/* Expense Items Panel */}
      <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '16px 18px',
          marginBottom: '28px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Expenses — {toMonthLabel(selectedMonth)}
            </span>
            {!addingItem && (
              <button
                onClick={() => setAddingItem(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: 'var(--gold-dim)', border: '1px solid var(--gold)',
                  borderRadius: '7px', color: 'var(--gold)',
                  fontSize: '12px', fontWeight: 700, padding: '6px 13px', cursor: 'pointer',
                }}
              >
                <Plus size={12} /> Add Expense
              </button>
            )}
          </div>

          {/* Existing items */}
          {items.length === 0 && !addingItem && (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              No expense entries for this month yet. Click "Add Expense" to get started.
            </div>
          )}

          {items.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 0',
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              {editingId === item.id ? (
                <>
                  <input
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    placeholder="Description"
                    style={{ ...inp, flex: 2 }}
                    autoFocus
                  />
                  <input
                    type="number"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    placeholder="Amount"
                    style={{ ...inp, width: '120px' }}
                    min="0" step="0.01"
                  />
                  <button onClick={handleSaveEdit} disabled={savingEdit} style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    background: 'var(--accent)', border: 'none', borderRadius: '6px',
                    color: 'white', fontSize: '12px', fontWeight: 700,
                    padding: '6px 12px', cursor: 'pointer',
                  }}>
                    <Check size={12} /> {savingEdit ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingId(null)} style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    background: 'var(--bg-hover)', border: '1px solid var(--border)',
                    borderRadius: '6px', color: 'var(--text-secondary)',
                    fontSize: '12px', fontWeight: 600, padding: '6px 12px', cursor: 'pointer',
                  }}>
                    <X size={12} /> Cancel
                  </button>
                </>
              ) : (
                <>
                  <span style={{ flex: 2, fontSize: '13px', color: 'var(--text-primary)' }}>
                    {item.description}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', minWidth: '100px', textAlign: 'right' }}>
                    {formatCurrency(parseFloat(item.amount))}
                  </span>
                  <button onClick={() => startEdit(item)} style={{
                    display: 'flex', alignItems: 'center', gap: '3px',
                    background: 'var(--bg-hover)', border: '1px solid var(--border)',
                    borderRadius: '6px', color: 'var(--text-secondary)',
                    fontSize: '11px', fontWeight: 600, padding: '4px 9px', cursor: 'pointer',
                  }}>
                    <Edit2 size={11} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    style={{
                      display: 'flex', alignItems: 'center',
                      background: '#fdecea', border: 'none',
                      borderRadius: '6px', color: '#c62828',
                      fontSize: '11px', padding: '4px 8px', cursor: 'pointer',
                    }}>
                    <Trash2 size={11} />
                  </button>
                </>
              )}
            </div>
          ))}

          {/* Total row */}
          {items.length > 0 && !addingItem && (
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', fontSize: '13px', fontWeight: 700 }}>
              <span>Total</span>
              <span>{formatCurrency(active?.expenses ?? 0)}</span>
            </div>
          )}

          {/* Add new item form */}
          {addingItem && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: items.length > 0 ? '12px' : '0', flexWrap: 'wrap' }}>
              <input
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Description (e.g. Utilities)"
                style={{ ...inp, flex: 2, minWidth: '140px' }}
                autoFocus
              />
              <input
                type="number"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                placeholder="Amount (PHP)"
                style={{ ...inp, width: '140px' }}
                min="0" step="0.01"
              />
              <button onClick={handleAddItem} disabled={savingNew} style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                background: 'var(--accent)', border: 'none', borderRadius: '7px',
                color: 'white', fontSize: '12px', fontWeight: 700,
                padding: '7px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                <Check size={13} /> {savingNew ? 'Saving…' : 'Add'}
              </button>
              <button onClick={() => { setAddingItem(false); setNewDesc(''); setNewAmount(''); }} style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                background: 'var(--bg-hover)', border: '1px solid var(--border)',
                borderRadius: '7px', color: 'var(--text-secondary)',
                fontSize: '12px', fontWeight: 600, padding: '7px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                <X size={13} /> Cancel
              </button>
            </div>
          )}
        </div>

      {error && <div style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

      {/* History Table */}
      <h2 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
        Monthly Trend
      </h2>

      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '10px', overflow: 'auto',
        boxShadow: 'var(--shadow-sm)',
        WebkitOverflowScrolling: 'touch',
      }}>
        <div style={{ minWidth: '380px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-base)' }}>
          {['Month', 'Revenue', 'Expenses', 'Net Income'].map((h, i) => (
            <div key={i} style={{ ...cell, textAlign: i === 0 ? 'left' : 'right', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              {h}
            </div>
          ))}
        </div>

        {!data?.history?.filter(r => !!r.month).length ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No financial data yet. Add expenses above to get started.
          </div>
        ) : (
          data.history.filter(r => !!r.month).map((row, idx) => {
            const rowNet = row.netIncome;
            const rowNetColor = rowNet >= 0 ? '#1E7A54' : '#A0523C';
            const isSelected = row.month === selectedMonth;

            return (
              <div
                key={row.month}
                style={{
                  display: 'flex',
                  background: isSelected ? 'var(--gold-dim)' : idx % 2 === 0 ? 'var(--bg-elevated)' : 'var(--bg-base)',
                  borderBottom: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                }}
                onClick={() => { setSelectedMonth(row.month); setAddingItem(false); setEditingId(null); }}
              >
                <div style={{ ...cell, textAlign: 'left', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--gold)' : 'var(--text-primary)' }}>
                  {toMonthLabel(row.month)}
                </div>
                <div style={{ ...cell, textAlign: 'right', color: 'var(--amber)', fontWeight: 500 }}>
                  {formatCurrency(row.revenue)}
                </div>
                <div style={{ ...cell, textAlign: 'right', color: row.items.length > 0 ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                  {row.items.length > 0 ? formatCurrency(row.expenses) : '—'}
                </div>
                <div style={{ ...cell, textAlign: 'right', color: row.items.length > 0 ? rowNetColor : 'var(--text-muted)', fontWeight: 600 }}>
                  {row.items.length > 0 ? formatCurrency(rowNet) : '—'}
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>
    </div>
  );
}

const cell: React.CSSProperties = {
  fontSize: '13px', padding: '11px 14px', flex: 1, minWidth: 0,
};
