import { execFileSync } from 'node:child_process';
import pg from 'pg';
import { testEnv } from './env.js';

export async function setup() {
  const url = new URL(testEnv.DATABASE_URL);
  const database = url.pathname.slice(1);
  const admin = new URL(url);
  admin.pathname = '/postgres';
  admin.search = '';

  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  const { rowCount } = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [database],
  );
  if (!rowCount) {
    await client.query(`CREATE DATABASE "${database}"`);
  }
  await client.end();

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: testEnv.DATABASE_URL },
    stdio: 'inherit',
  });
}
