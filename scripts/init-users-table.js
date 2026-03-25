const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function loadDotEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function isDatabaseSslEnabled(databaseUrl) {
  if (process.env.DATABASE_SSL) {
    return process.env.DATABASE_SSL === 'true';
  }

  return typeof databaseUrl === 'string' && databaseUrl.includes('render.com');
}

async function ensureUsersTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.users (
      id serial4 PRIMARY KEY,
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      avatar_image text,
      created_at timestamp DEFAULT now()
    )
  `);

  const avatarColumn = await client.query(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'avatar_image'
    LIMIT 1
  `);

  if (!avatarColumn.rows.length) {
    await client.query('ALTER TABLE public.users ADD COLUMN avatar_image text');
  }

  const createdAtColumn = await client.query(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'created_at'
    LIMIT 1
  `);

  if (!createdAtColumn.rows.length) {
    await client.query('ALTER TABLE public.users ADD COLUMN created_at timestamp DEFAULT now()');
  }
}

async function main() {
  loadDotEnv();

  const databaseUrl = typeof process.env.DATABASE_URL === 'string'
    ? process.env.DATABASE_URL.trim()
    : '';

  if (!databaseUrl) {
    throw new Error('DATABASE_URL nao definida no ambiente.');
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: isDatabaseSslEnabled(databaseUrl) ? { rejectUnauthorized: false } : false
  });

  const client = await pool.connect();
  try {
    await ensureUsersTable(client);
    console.log('Tabela public.users pronta para uso.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Falha ao inicializar tabela users:', error.message);
  process.exit(1);
});
