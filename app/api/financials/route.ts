import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { monthlyExpenses, monthlyExpenseItems, payments } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { getSessionUser } from '@/lib/session';

async function requireAdmin(req: NextRequest) {
  const u = await getSessionUser(req);
  if (!u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (u.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return u;
}

/**
 * GET /api/financials?month=2026-07
 *
 * Returns revenue (auto from verified payments) and expenses (itemized) for
 * one month, plus the full historical list for the trend table.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');

  try {
    // ── 1. All expense items grouped by month ─────────────────────────────
    const allItems = await db
      .select()
      .from(monthlyExpenseItems)
      .orderBy(monthlyExpenseItems.month, monthlyExpenseItems.id);

    // Group items by month
    const itemsByMonth = allItems.reduce<Record<string, typeof allItems>>((acc, item) => {
      if (!acc[item.month]) acc[item.month] = [];
      acc[item.month].push(item);
      return acc;
    }, {});

    // ── 2. Revenue per month: sum of verified payments ────────────────────
    const revenueRows = await db
      .select({
        month: sql<string>`to_char(coalesce(${payments.verifiedAt}, ${payments.createdAt}), 'YYYY-MM')`,
        revenue: sql<string>`coalesce(sum(${payments.amount}::numeric), 0)`,
      })
      .from(payments)
      .where(eq(payments.status, 'verified'))
      .groupBy(sql`to_char(coalesce(${payments.verifiedAt}, ${payments.createdAt}), 'YYYY-MM')`);

    const revenueMap = Object.fromEntries(
      revenueRows.map((r) => [r.month, parseFloat(r.revenue)])
    );

    // ── 3. Build combined rows ────────────────────────────────────────────
    const allMonths = new Set([
      ...Object.keys(itemsByMonth),
      ...revenueRows.map((r) => r.month),
    ]);

    const history = Array.from(allMonths)
      .sort()
      .reverse()
      .map((m) => {
        const revenue = revenueMap[m] ?? 0;
        const items = itemsByMonth[m] ?? [];
        const expenses = items.reduce((s, i) => s + parseFloat(i.amount), 0);
        return {
          month: m,
          revenue,
          expenses,
          netIncome: revenue - expenses,
          items,
        };
      });

    // ── 4. Focused data for selected month ────────────────────────────────
    let selected = null;
    if (month) {
      const revenue = revenueMap[month] ?? 0;
      const items = itemsByMonth[month] ?? [];
      const expenses = items.reduce((s, i) => s + parseFloat(i.amount), 0);
      selected = {
        month,
        revenue,
        expenses,
        netIncome: revenue - expenses,
        items,
      };
    }

    return NextResponse.json({ history, selected });
  } catch (error) {
    console.error('GET /api/financials error:', error);
    return NextResponse.json({ error: 'Failed to fetch financials' }, { status: 500 });
  }
}

/**
 * POST /api/financials
 * Body: { month: "2026-07", description: "Utilities", amount: 4000 }
 * Adds a new expense line item for the month.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { month, description, amount } = body;

    if (!month || !description || amount === undefined) {
      return NextResponse.json({ error: 'month, description, and amount are required' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'month must be in YYYY-MM format' }, { status: 400 });
    }

    const [row] = await db
      .insert(monthlyExpenseItems)
      .values({ month, description, amount: String(amount) })
      .returning();

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error('POST /api/financials error:', error);
    return NextResponse.json({ error: 'Failed to save expense item' }, { status: 500 });
  }
}

/**
 * PATCH /api/financials
 * Body: { id: 3, description?: "...", amount?: 5000 }
 * Updates an existing expense line item.
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id, description, amount } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (description !== undefined) updates.description = description;
    if (amount !== undefined) updates.amount = String(amount);

    const [updated] = await db
      .update(monthlyExpenseItems)
      .set(updates)
      .where(eq(monthlyExpenseItems.id, parseInt(id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Expense item not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/financials error:', error);
    return NextResponse.json({ error: 'Failed to update expense item' }, { status: 500 });
  }
}

/**
 * DELETE /api/financials
 * Body: { id: 3 }
 * Deletes an expense line item.
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db
      .delete(monthlyExpenseItems)
      .where(eq(monthlyExpenseItems.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/financials error:', error);
    return NextResponse.json({ error: 'Failed to delete expense item' }, { status: 500 });
  }
}
