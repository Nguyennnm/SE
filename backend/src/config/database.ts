import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

// pg tra NUMERIC (1700) va BIGINT (20) ve dang chuoi theo mac dinh.
// Chuyen ve number de gia/id dung duoc trong so sanh va JSON tra ve
// (gia < 2^53 nen an toan; neu vuot nguong nay thi can xem lai).
pg.types.setTypeParser(20, (v) => parseInt(v, 10));
pg.types.setTypeParser(1700, (v) => parseFloat(v));

export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err.message);
});

let dbConnected = false;

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    dbConnected = true;
    console.log(`[DB] Connected to PostgreSQL at ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
    return true;
  } catch (error: any) {
    dbConnected = false;
    console.warn(`[DB] PostgreSQL not reachable (${error.message}). Running in mock/standalone mode.`);
    return false;
  }
}

export function isDatabaseConnected(): boolean {
  return dbConnected;
}

export async function query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}
