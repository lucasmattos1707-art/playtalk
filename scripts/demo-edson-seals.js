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
  if (process.env.DATABASE_SSL) return process.env.DATABASE_SSL === 'true';
  return typeof databaseUrl === 'string' && databaseUrl.includes('render.com');
}

const PHASES = [
  { phase: 3, sealImage: 'medalhas/rubi.png' },
  { phase: 5, sealImage: 'medalhas/emerald.png' },
  { phase: 6, sealImage: 'medalhas/ouro.png' },
  { phase: 8, sealImage: 'medalhas/diamante.png' }
];

const MEMORIZING_PROGRESS = [0.2, 0.45, 0.7, 0.85];

function pickPattern(index) {
  const phaseMeta = PHASES[index % PHASES.length];
  const isMemorizing = index % 3 !== 0;
  const progress = MEMORIZING_PROGRESS[index % MEMORIZING_PROGRESS.length];
  return { phaseMeta, isMemorizing, progress };
}

async function main() {
  loadDotEnv();
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) throw new Error('DATABASE_URL nao definida no ambiente.');

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: isDatabaseSslEnabled(databaseUrl) ? { rejectUnauthorized: false } : false
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `SELECT id, username
         FROM public.users
        WHERE LOWER(COALESCE(username, '')) = LOWER($1)
        LIMIT 1`,
      ['Edson']
    );
    if (!userResult.rows.length) {
      throw new Error('Usuario "Edson" nao encontrado.');
    }

    const userId = Number(userResult.rows[0].id);
    const cardsResult = await client.query(
      `SELECT card_id
         FROM public.user_flashcard_progress
        WHERE user_id = $1
        ORDER BY updated_at DESC, card_id ASC`,
      [userId]
    );

    if (!cardsResult.rows.length) {
      throw new Error('O usuario Edson nao possui cartas em user_flashcard_progress.');
    }

    const nowMs = Date.now();
    let memorizingCount = 0;
    let readyCount = 0;

    for (let i = 0; i < cardsResult.rows.length; i += 1) {
      const cardId = String(cardsResult.rows[i].card_id || '').trim();
      if (!cardId) continue;

      const { phaseMeta, isMemorizing, progress } = pickPattern(i);
      const durationMs = 12 * 60 * 60 * 1000;
      const startedAtMs = nowMs - Math.floor(durationMs * progress);
      const availableAtMs = startedAtMs + durationMs;

      const status = isMemorizing ? 'memorizing' : 'ready';
      if (isMemorizing) memorizingCount += 1;
      else readyCount += 1;

      await client.query(
        `UPDATE public.user_flashcard_progress
            SET phase_index = $1,
                target_phase_index = $2,
                status = $3,
                memorizing_started_at = $4,
                memorizing_duration_ms = $5,
                available_at = $6,
                returned_at = NULL,
                seal_image = $7,
                updated_at = now()
          WHERE user_id = $8
            AND card_id = $9`,
        [
          phaseMeta.phase,
          phaseMeta.phase,
          status,
          isMemorizing ? new Date(startedAtMs) : null,
          isMemorizing ? durationMs : 0,
          isMemorizing ? new Date(availableAtMs) : null,
          phaseMeta.sealImage,
          userId,
          cardId
        ]
      );
    }

    await client.query('COMMIT');

    const summary = await client.query(
      `SELECT
         COALESCE(seal_image, '') AS seal_image,
         status,
         COUNT(*)::int AS total
       FROM public.user_flashcard_progress
       WHERE user_id = $1
       GROUP BY seal_image, status
       ORDER BY seal_image ASC, status ASC`,
      [userId]
    );

    console.log(`Usuario: Edson (id=${userId})`);
    console.log(`Cartas atualizadas: ${cardsResult.rows.length}`);
    console.log(`Ready: ${readyCount} | Memorizing: ${memorizingCount}`);
    console.log('Distribuicao final (seal_image + status):');
    for (const row of summary.rows) {
      console.log(`- ${row.seal_image || '(vazio)'} | ${row.status} | ${row.total}`);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Falha ao preparar demo de selos do Edson:', error.message);
  process.exit(1);
});

