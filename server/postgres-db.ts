import dns from 'dns';
import pg from 'pg';
const { Pool } = pg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema.pg';

export function createPostgresDb() {
  console.log('[db] createPostgresDb() invoked');
  const connectionString = "postgresql://postgres:Dev12345Raj123@db.rqtggqtglxaiencrttnm.supabase.co:5432/postgres";
  try {
    const masked = connectionString?.replace(/:\/\/([^:]+):[^@]+@/, '://$1:****@');
    console.log('[db] DATABASE_URL:', masked ?? '(undefined)');
  } catch {}
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for Postgres connection');
  }

  try {
    if (typeof (dns as any).setDefaultResultOrder === 'function') {
      (dns as any).setDefaultResultOrder('ipv4first');
    }
  } catch {}

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    keepAlive: true,
    connectionTimeoutMillis: 20000,
  });
  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });

  const db = drizzle(pool, { schema });
  return db;
}
