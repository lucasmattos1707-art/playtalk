const { Pool } = require('pg');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL nao definida no ambiente.');
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DROP TABLE IF EXISTS public.users');
    await client.query(`
      CREATE TABLE public.users (
        id serial4 PRIMARY KEY,
        email text UNIQUE NOT NULL,
        password_hash text NOT NULL,
        avatar_image text,
        created_at timestamp DEFAULT now()
      )
    `);
    await client.query('COMMIT');
    console.log('Tabela public.users recriada com sucesso.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Falha ao resetar tabela users:', error.message);
  process.exit(1);
});
