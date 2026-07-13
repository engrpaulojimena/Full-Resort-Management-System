/**
 * Centralised database clients.
 *
 * - `db`  — Drizzle ORM instance (use for simple CRUD, type-safe queries)
 * - `sql` — raw neon tagged-template client (use only for complex SQL that
 *            Drizzle cannot express cleanly: multi-table joins with computed
 *            columns, interval arithmetic, CTEs, bulk upserts)
 *
 * #13 — Both clients share the same underlying neon connection so the app
 * never opens two separate pools. Import from here; never instantiate neon()
 * directly in route files.
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export const sql = neon(process.env.DATABASE_URL!);
export const db  = drizzle(sql, { schema });
