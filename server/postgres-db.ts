import dns from 'dns';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
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

  // Disable prefetch/prepare for compatibility with some pool modes
  const client = postgres(connectionString, { prepare: false });

  const db = drizzle(client, { schema });
  return db;
}
