const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sharp = require('sharp');
const {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand
} = require('@aws-sdk/client-s3');
const app = express();

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, true);
  },
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
const PORT = process.env.PORT || 3000;
const env = (value) => (typeof value === 'string' ? value.trim() : value);

const loadDotEnv = () => {
  const envPath = path.join(__dirname, '.env');
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
};

loadDotEnv();

const DATABASE_URL = env(process.env.DATABASE_URL);
const DATABASE_SSL = process.env.DATABASE_SSL
  ? process.env.DATABASE_SSL === 'true'
  : Boolean(DATABASE_URL && DATABASE_URL.includes('render.com'));
const JWT_SECRET = process.env.JWT_SECRET;
const ELEVENLABS_API_KEY = env(process.env.ELEVENLABS_API_KEY);
const ELEVENLABS_VOICE_ID_HARRY = env(process.env.ELEVENLABS_VOICE_ID_HARRY);
const ELEVENLABS_VOICE_ID_BURT_RAYNALDS = env(process.env.ELEVENLABS_VOICE_ID_BURT_RAYNALDS) || '4YYIPFl9wE5c4L2eu2Gb';
const ELEVENLABS_MODEL_ID = env(process.env.ELEVENLABS_MODEL_ID) || 'eleven_multilingual_v2';
const OPENAI_API_KEY = env(process.env.OPENAI_API_KEY);
const OPENAI_IMAGE_MODEL = env(process.env.OPENAI_IMAGE_MODEL) || 'gpt-image-1-mini';
const OPENAI_AVATAR_IMAGE_MODEL = env(process.env.OPENAI_AVATAR_IMAGE_MODEL) || 'gpt-image-1-mini';
const OPENAI_TEXT_MODEL = env(process.env.OPENAI_TEXT_MODEL) || 'gpt-5.4-nano';
const OPENAI_FLASHCARD_ADMIN_TEXT_MODEL = env(process.env.OPENAI_FLASHCARD_ADMIN_TEXT_MODEL) || 'gpt-5-nano';
const OPENAI_FLASHCARD_ADMIN_IMAGE_MODEL = env(process.env.OPENAI_FLASHCARD_ADMIN_IMAGE_MODEL) || 'gpt-image-1-mini';
const OPENAI_STORY_MODEL = env(process.env.OPENAI_STORY_MODEL) || 'gpt-5.4-nano';
const OPENAI_TTS_MODEL = env(process.env.OPENAI_TTS_MODEL) || 'gpt-4o-mini-tts';
const OPENAI_STT_MODEL = env(process.env.OPENAI_STT_MODEL) || 'gpt-4o-mini-transcribe';
const OPENAI_CHAT_FAST_MODEL = env(process.env.OPENAI_CHAT_FAST_MODEL) || 'gpt-5-mini';
const PLAYTALK_PUBLIC_BASE_URL = env(process.env.PLAYTALK_PUBLIC_BASE_URL);
const STRIPE_SECRET_KEY = env(process.env.STRIPE_SECRET_KEY);
const STRIPE_PUBLISHABLE_KEY = env(process.env.STRIPE_PUBLISHABLE_KEY);

const DATABASE_CONFIG = DATABASE_URL
  ? {
    connectionString: DATABASE_URL,
    ssl: DATABASE_SSL ? { rejectUnauthorized: false } : false
  }
  : {
    host: env(process.env.DATABASE_HOST),
    port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : 5432,
    database: env(process.env.DATABASE_NAME),
    user: env(process.env.DATABASE_USER),
    password: env(process.env.DATABASE_PASSWORD),
    ssl: DATABASE_SSL ? { rejectUnauthorized: false } : false
  };

const describeDatabaseTarget = () => {
  if (DATABASE_URL) {
    try {
      const parsedUrl = new URL(DATABASE_URL);
      return {
        source: 'DATABASE_URL',
        host: parsedUrl.hostname,
        port: parsedUrl.port || '5432',
        database: parsedUrl.pathname ? parsedUrl.pathname.replace(/^\//, '') : null
      };
    } catch (_error) {
      return {
        source: 'DATABASE_URL',
        host: '(URL inválida)',
        port: null,
        database: null
      };
    }
  }

  return {
    source: 'DATABASE_HOST',
    host: DATABASE_CONFIG.host || null,
    port: DATABASE_CONFIG.port || null,
    database: DATABASE_CONFIG.database || null
  };
};

const databaseTarget = describeDatabaseTarget();
const pool = (DATABASE_URL || DATABASE_CONFIG.host)
  ? new Pool(DATABASE_CONFIG)
  : null;
let flashcardRankingsTableReadyPromise = null;
let usersAvatarColumnReadyPromise = null;
let flashcardUserStateTablesReadyPromise = null;
let premiumAccessTablesReadyPromise = null;
let speakingRealtimeTablesReadyPromise = null;
let miniBookJsonTablesReadyPromise = null;
let booksSpeakingStatsTablesReadyPromise = null;
let userBooksLibraryStatsReadyPromise = null;
let userBooksConsumptionStatsReadyPromise = null;
let publicFlashcardDecksTableReadyPromise = null;
let publicFlashcardDecksSeedPromise = null;
let speakingCardsCache = {
  stories: [],
  updatedAt: 0
};

function invalidateSpeakingCardsCache() {
  speakingCardsCache = {
    stories: [],
    updatedAt: 0
  };
}

const FLASHCARD_RANKING_TIMEZONE = 'America/Sao_Paulo';
const SPEAKING_CHALLENGE_ONLINE_WINDOW_SECONDS = 45;
const SPEAKING_CHALLENGE_PENDING_TTL_SECONDS = 120;
const SPEAKING_DUEL_DEFAULT_CARDS = 25;
const SPEAKING_DUEL_INACTIVE_TIMEOUT_SECONDS = 20;
const SPEAKING_DUEL_INTRO_SECONDS = 10;
const SPEAKING_DUEL_BATTLE_SECONDS = 180;
const BOT_DAILY_FLASHCARD_TRAINING_MINUTES = 5;
const BOT_PRONUNCIATION_VARIANCE_PERCENT = 3;
const BOT_FLASHCARDS_SPEED_VARIANCE_PERCENT = 6;
const BOT_RESPONSE_VARIANCE_SECONDS = 1;
const SPEAKING_CARD_CACHE_TTL_MS = 60 * 1000;
const BATTLE_STORIES_ROOT_CANDIDATES = Array.from(new Set([
  path.join(__dirname, 'battle-stories'),
  path.join(process.cwd(), 'battle-stories')
]));
const FLASHCARD_RANKING_PLACEHOLDER_NAME = 'Usuario';
const FLASHCARD_RANKING_PLACEHOLDER_AVATAR = '/Avatar/avatar-man-person-svgrepo-com.svg';
const FLASHCARD_RANKING_PERIODS = {
  weekly: {
    id: 'weekly',
    countAlias: 'weekly_flashcards_count',
    periodLabel: 'Rank Semanal'
  },
  monthly: {
    id: 'monthly',
    countAlias: 'monthly_flashcards_count',
    periodLabel: 'Rank Mensal'
  },
  allTime: {
    id: 'allTime',
    countAlias: 'all_time_flashcards_count',
    periodLabel: 'Rank Geral'
  }
};
const FLASHCARD_RANKING_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: FLASHCARD_RANKING_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short'
});
const FLASHCARD_RANKING_WEEKDAY_INDEX = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};
const BOOKS_PRONUNCIATION_TAG = 'speak-books';
const FLASHCARD_REVIEW_PHASES = {
  1: { key: 'first-star', label: 'First star', durationMs: 6 * 60 * 60 * 1000, sealImage: 'medalhas/prata.png' },
  2: { key: 'second-star', label: 'Second star', durationMs: 3 * 24 * 60 * 60 * 1000, sealImage: 'medalhas/quartz.png' },
  3: { key: 'third-star', label: 'Third star', durationMs: 7 * 24 * 60 * 60 * 1000, sealImage: 'medalhas/ouro.png' },
  4: { key: 'fourth-star', label: 'Fourth star', durationMs: 12 * 24 * 60 * 60 * 1000, sealImage: 'medalhas/platina.png' },
  5: { key: 'fifth-star', label: 'Fifth star', durationMs: 30 * 24 * 60 * 60 * 1000, sealImage: 'medalhas/diamante.png' }
};
const PREMIUM_BILLING_PLANS = {
  semana: {
    key: 'semana',
    label: '1 semana',
    durationDays: 7,
    priceEnvKey: 'STRIPE_PRICE_ID_PREMIUM_SEMANA'
  },
  mes: {
    key: 'mes',
    label: '1 mes',
    durationDays: 30,
    priceEnvKey: 'STRIPE_PRICE_ID_PREMIUM_MES'
  },
  ano: {
    key: 'ano',
    label: '1 ano',
    durationDays: 365,
    priceEnvKey: 'STRIPE_PRICE_ID_PREMIUM_ANO'
  }
};

app.use(express.json({ limit: '100mb' }));

const normalizeFlashcardsCount = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
};

const clampPercent = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const clampBotUpdateHour = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 6;
  return Math.max(6, Math.min(22, parsed));
};

const padFlashcardRankingNumber = (value) => String(value).padStart(2, '0');

const formatFlashcardRankingDateKey = (date) => (
  `${date.getUTCFullYear()}-${padFlashcardRankingNumber(date.getUTCMonth() + 1)}-${padFlashcardRankingNumber(date.getUTCDate())}`
);

const getFlashcardRankingPeriodKeys = (value = new Date()) => {
  const parts = FLASHCARD_RANKING_DATE_FORMATTER.formatToParts(value).reduce((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});
  const year = Number.parseInt(parts.year, 10);
  const month = Number.parseInt(parts.month, 10);
  const day = Number.parseInt(parts.day, 10);
  const weekdayIndex = FLASHCARD_RANKING_WEEKDAY_INDEX[parts.weekday] ?? 0;
  const localDate = new Date(Date.UTC(year, month - 1, day));
  const mondayDate = new Date(localDate);
  mondayDate.setUTCDate(localDate.getUTCDate() - ((weekdayIndex + 6) % 7));

  return {
    weeklyKey: formatFlashcardRankingDateKey(mondayDate),
    monthlyKey: `${year}-${padFlashcardRankingNumber(month)}`
  };
};

const normalizeFlashcardRankingPeriod = (value) => {
  if (value === 'monthly') return FLASHCARD_RANKING_PERIODS.monthly.id;
  if (value === 'all_time' || value === 'allTime' || value === 'geral') return FLASHCARD_RANKING_PERIODS.allTime.id;
  return FLASHCARD_RANKING_PERIODS.weekly.id;
};

const flashcardRankingCountAliasForPeriod = (periodId) => (
  FLASHCARD_RANKING_PERIODS[normalizeFlashcardRankingPeriod(periodId)]?.countAlias
  || FLASHCARD_RANKING_PERIODS.weekly.countAlias
);

const buildFlashcardRankingCteSql = (periodId) => {
  const countAlias = flashcardRankingCountAliasForPeriod(periodId);
  return `
    WITH progress_counts AS (
      SELECT
        user_id,
        COUNT(*)::int AS total
      FROM public.user_flashcard_progress
      GROUP BY user_id
    ),
    ranking_rows AS (
      SELECT
        player_id,
        user_id,
        player_number,
        flashcards_count,
        weekly_count,
        monthly_count,
        all_time_count,
        last_progress_count,
        weekly_period_key,
        monthly_period_key,
        created_at,
        updated_at
      FROM (
        SELECT
          r.*,
          ROW_NUMBER() OVER (
            PARTITION BY r.user_id
            ORDER BY r.updated_at DESC, r.created_at DESC, r.player_number ASC, r.player_id ASC
          ) AS row_index
        FROM public.flashcard_rankings r
        WHERE r.user_id IS NOT NULL
      ) deduped_rankings
      WHERE row_index = 1
    ),
    ranked_base AS (
      SELECT
        u.id AS user_id,
        COALESCE(r.player_number, 0) AS player_number,
        COALESCE(r.created_at, u.created_at, now()) AS created_at,
        COALESCE(r.updated_at, u.created_at, now()) AS updated_at,
        COALESCE(NULLIF(u.username, ''), u.email) AS username,
        COALESCE(u.avatar_image, '') AS avatar_image,
        CASE
          WHEN COALESCE(r.weekly_period_key, '') = $2 THEN COALESCE(r.weekly_count, 0)
          ELSE 0
        END AS weekly_flashcards_count,
        CASE
          WHEN COALESCE(r.monthly_period_key, '') = $3 THEN COALESCE(r.monthly_count, 0)
          ELSE 0
        END AS monthly_flashcards_count,
        COALESCE(progress_counts.total, r.flashcards_count, r.all_time_count, 0) AS all_time_flashcards_count
      FROM public.users u
      LEFT JOIN ranking_rows r
        ON r.user_id = u.id
      LEFT JOIN progress_counts
        ON progress_counts.user_id = u.id
    ),
    ranked AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          ORDER BY ${countAlias} DESC, updated_at ASC, player_number ASC, user_id ASC
        ) AS rank
      FROM ranked_base
    )
  `;
};

const mapFlashcardRankingRow = (row, periodId) => {
  const selectedPeriod = normalizeFlashcardRankingPeriod(periodId);
  const selectedAlias = flashcardRankingCountAliasForPeriod(selectedPeriod);
  return {
    rank: Number(row?.rank) || 0,
    userId: Number(row?.user_id) || 0,
    username: String(row?.username || '').trim() || FLASHCARD_RANKING_PLACEHOLDER_NAME,
    avatarImage: String(row?.avatar_image || '').trim() || FLASHCARD_RANKING_PLACEHOLDER_AVATAR,
    playerNumber: Number(row?.player_number) || 0,
    flashcardsCount: Number(row?.[selectedAlias]) || 0,
    weeklyFlashcardsCount: Number(row?.weekly_flashcards_count) || 0,
    monthlyFlashcardsCount: Number(row?.monthly_flashcards_count) || 0,
    allTimeFlashcardsCount: Number(row?.all_time_flashcards_count) || 0,
    createdAt: row?.created_at || null,
    updatedAt: row?.updated_at || null,
    isPlaceholder: false
  };
};

const createFlashcardRankingPlaceholder = (rank) => ({
  rank,
  userId: 0,
  username: FLASHCARD_RANKING_PLACEHOLDER_NAME,
  avatarImage: FLASHCARD_RANKING_PLACEHOLDER_AVATAR,
  playerNumber: 0,
  flashcardsCount: 0,
  weeklyFlashcardsCount: 0,
  monthlyFlashcardsCount: 0,
  allTimeFlashcardsCount: 0,
  createdAt: null,
  updatedAt: null,
  isPlaceholder: true
});

const fillFlashcardRankingPlaceholders = (rows, limit) => {
  const ranking = rows.slice(0, limit);
  while (ranking.length < limit) {
    ranking.push(createFlashcardRankingPlaceholder(ranking.length + 1));
  }
  return ranking;
};

const clampInteger = (value, minimum, maximum, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }
  return Math.min(maximum, Math.max(minimum, parsed));
};

const normalizeFlashcardStatus = (value) => (value === 'ready' ? 'ready' : 'memorizing');

const FLASHCARD_PRONUNCIATION_SAMPLE_LIMIT = 200;

const normalizeFlashcardPronunciationSamples = (value) => {
  const source = Array.isArray(value)
    ? value
    : Array.isArray(value?.pronunciationSamples)
      ? value.pronunciationSamples
      : Array.isArray(value?.pronunciation_samples)
        ? value.pronunciation_samples
        : [];
  return source
    .map((sample) => Math.max(0, Math.min(100, Math.round(Number(sample) || 0))))
    .filter((sample) => Number.isFinite(sample))
    .slice(-FLASHCARD_PRONUNCIATION_SAMPLE_LIMIT);
};

const normalizeBooksPronunciationSamples = (value) => {
  const source = Array.isArray(value)
    ? value
    : Array.isArray(value?.pronunciationSamples)
      ? value.pronunciationSamples
      : Array.isArray(value?.pronunciation_samples)
        ? value.pronunciation_samples
        : [];
  return source
    .map((sample) => Math.max(0, Math.min(100, Math.round(Number(sample) || 0))))
    .filter((sample) => Number.isFinite(sample))
    .slice(-1000);
};

const getBooksPronunciationPercentFromAggregate = (sum, count) => {
  const normalizedSum = Math.max(0, Number(sum) || 0);
  const normalizedCount = Math.max(0, Number(count) || 0);
  if (!normalizedCount) {
    return 0;
  }
  return Math.max(0, Math.min(100, Number((normalizedSum / normalizedCount).toFixed(2))));
};

const normalizeBooksPronunciationPayload = (value) => {
  if (Array.isArray(value)) {
    return normalizeBooksPronunciationSamples(value);
  }
  const numeric = Math.round(Number(value));
  if (!Number.isFinite(numeric)) {
    return [];
  }
  return normalizeBooksPronunciationSamples([numeric]);
};

const getBooksPronunciationAggregateFromRow = (row) => {
  const fallbackSamples = normalizeBooksPronunciationSamples(row?.pronunciation_samples);
  const fallbackCount = fallbackSamples.length;
  const fallbackSum = fallbackSamples.reduce((total, sample) => total + sample, 0);
  const count = Math.max(
    0,
    Number.parseInt(row?.pronunciation_samples_count, 10)
      || Number.parseInt(row?.pronunciation_count, 10)
      || fallbackCount
  );
  const sum = Math.max(
    0,
    Number(row?.pronunciation_sum) || (count > 0 ? fallbackSum : 0)
  );
  const latest = Math.max(
    0,
    Math.min(
      100,
      Number.parseInt(row?.latest_pronunciation_percent, 10)
        || (fallbackCount ? fallbackSamples[fallbackCount - 1] : 0)
    )
  );
  return {
    pronunciationSum: sum,
    pronunciationSamplesCount: count,
    generalPronunciationPercent: getBooksPronunciationPercentFromAggregate(sum, count),
    latestPronunciationPercent: latest
  };
};

const getQualifiedUserBookIds = async (db, userId, minimumPercent = 75) => {
  const normalizedUserId = Number.parseInt(userId, 10);
  const normalizedMinimumPercent = Math.max(0, Math.min(100, Math.round(Number(minimumPercent) || 0)));
  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    return [];
  }

  const result = await db.query(
    `SELECT book_id
     FROM public.user_books_library_stats
     WHERE user_id = $1
       AND GREATEST(
         COALESCE(best_speaking_percent, 0),
         COALESCE(best_listening_percent, 0)
       ) >= $2
     ORDER BY updated_at DESC, book_id ASC`,
    [normalizedUserId, normalizedMinimumPercent]
  );

  return result.rows
    .map((row) => normalizeMiniBookId(row?.book_id))
    .filter(Boolean);
};

const getUserBookBestPercentById = async (db, userId) => {
  const normalizedUserId = Number.parseInt(userId, 10);
  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    return {};
  }

  const result = await db.query(
    `SELECT
       book_id,
       GREATEST(
         COALESCE(best_speaking_percent, 0),
         COALESCE(best_listening_percent, 0)
       )::int AS best_percent
     FROM public.user_books_library_stats
     WHERE user_id = $1`,
    [normalizedUserId]
  );

  return result.rows.reduce((accumulator, row) => {
    const bookId = normalizeMiniBookId(row?.book_id);
    if (!bookId) return accumulator;
    accumulator[bookId] = Math.max(0, Math.min(100, Number(row?.best_percent) || 0));
    return accumulator;
  }, {});
};

const upsertUserBooksPronunciationSamples = async (client, userId, samplesInput) => {
  const samplesToAppend = normalizeBooksPronunciationPayload(samplesInput);
  const appendedCount = samplesToAppend.length;
  const appendedSum = samplesToAppend.reduce((total, sample) => total + sample, 0);
  const latestPercent = appendedCount ? samplesToAppend[appendedCount - 1] : 0;

  const existingResult = await client.query(
    `SELECT user_id, book_read, pronunciation_tag, pronunciation_samples,
            pronunciation_sum, pronunciation_samples_count, latest_pronunciation_percent, updated_at
     FROM public.user_books_speaking_stats
     WHERE user_id = $1
     FOR UPDATE`,
    [userId]
  );

  const existingRow = existingResult.rows[0] || null;
  const existingAggregate = getBooksPronunciationAggregateFromRow(existingRow);
  const nextBookReadCount = Math.max(0, Number.parseInt(existingRow?.book_read, 10) || 0);
  const nextPronunciationSum = existingAggregate.pronunciationSum + appendedSum;
  const nextPronunciationCount = existingAggregate.pronunciationSamplesCount + appendedCount;
  const nextLatestPercent = appendedCount
    ? latestPercent
    : existingAggregate.latestPronunciationPercent;

  const upsertResult = await client.query(
    `INSERT INTO public.user_books_speaking_stats (
       user_id,
       book_read,
       pronunciation_tag,
       pronunciation_samples,
       pronunciation_sum,
       pronunciation_samples_count,
       latest_pronunciation_percent,
       updated_at
     )
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, now())
     ON CONFLICT (user_id)
     DO UPDATE
       SET book_read = EXCLUDED.book_read,
           pronunciation_tag = EXCLUDED.pronunciation_tag,
           pronunciation_samples = EXCLUDED.pronunciation_samples,
           pronunciation_sum = EXCLUDED.pronunciation_sum,
           pronunciation_samples_count = EXCLUDED.pronunciation_samples_count,
           latest_pronunciation_percent = EXCLUDED.latest_pronunciation_percent,
           updated_at = now()
     RETURNING
       user_id,
       book_read,
       pronunciation_tag,
       pronunciation_samples,
       pronunciation_sum,
       pronunciation_samples_count,
       latest_pronunciation_percent,
       updated_at`,
    [
      userId,
      nextBookReadCount,
      BOOKS_PRONUNCIATION_TAG,
      '[]',
      nextPronunciationSum,
      nextPronunciationCount,
      nextLatestPercent
    ]
  );

  const saved = upsertResult.rows[0] || {
    user_id: userId,
    book_read: nextBookReadCount,
    pronunciation_tag: BOOKS_PRONUNCIATION_TAG,
    pronunciation_samples: [],
    pronunciation_sum: nextPronunciationSum,
    pronunciation_samples_count: nextPronunciationCount,
    latest_pronunciation_percent: nextLatestPercent,
    updated_at: new Date().toISOString()
  };
  const aggregate = getBooksPronunciationAggregateFromRow(saved);

  return {
    saved,
    pronunciationTag: BOOKS_PRONUNCIATION_TAG,
    pronunciationSum: aggregate.pronunciationSum,
    pronunciationSamplesCount: aggregate.pronunciationSamplesCount,
    generalPronunciationPercent: aggregate.generalPronunciationPercent,
    latestPronunciationPercent: aggregate.latestPronunciationPercent
  };
};

const normalizeBookCompletionMode = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'listening-training') return 'listening-training';
  if (normalized === 'speaking-training') return 'speaking-training';
  return 'free-read';
};

const getFlashcardPronunciationPercent = (samples) => {
  if (!Array.isArray(samples) || !samples.length) {
    return 0;
  }
  const average = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
  return Math.max(0, Math.min(100, Math.round(average + 5)));
};

const getFlashcardSpeedPerHour = (flashcardsCount, trainingTimeMs) => {
  const normalizedCount = Math.max(0, Number(flashcardsCount) || 0);
  const normalizedTrainingTimeMs = Math.max(0, Number(trainingTimeMs) || 0);
  if (!normalizedCount || normalizedTrainingTimeMs <= 0) {
    return 0;
  }
  const perHour = normalizedCount * (60 * 60 * 1000) / normalizedTrainingTimeMs;
  return Math.max(0, Math.round(perHour * 10) / 10);
};

const decorateFlashcardStats = (value, flashcardsCount = 0) => {
  const pronunciationSamples = normalizeFlashcardPronunciationSamples(value);
  const trainingTimeMs = Math.max(
    0,
    Math.round(
      Number(value?.trainingTimeMs ?? value?.training_time_ms) || 0
    )
  );
  return {
    playTimeMs: Math.max(0, Math.round(Number(value?.playTimeMs) || 0)),
    speakings: Math.max(0, Math.round(Number(value?.speakings) || 0)),
    listenings: Math.max(0, Math.round(Number(value?.listenings) || 0)),
    secondStarErrorHeard: Boolean(value?.secondStarErrorHeard || value?.second_star_error_heard),
    trainingTimeMs,
    pronunciationSamples,
    pronunciationPercent: getFlashcardPronunciationPercent(pronunciationSamples),
    speedFlashcardsPerHour: getFlashcardSpeedPerHour(flashcardsCount, trainingTimeMs)
  };
};

const normalizeFlashcardStats = (value, flashcardsCount = 0) => decorateFlashcardStats(value, flashcardsCount);

const flashcardTimestampFromMillis = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return new Date(parsed);
};

const flashcardMillisFromTimestamp = (value) => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const resolveFlashcardSealImage = (record) => {
  if (!record) return '';
  const phaseIndex = record.status === 'memorizing'
    ? clampInteger(record.targetPhaseIndex || record.phaseIndex, 1, 5, 1)
    : clampInteger(record.phaseIndex, 0, 5, 0);
  if (phaseIndex <= 0) return '';
  return FLASHCARD_REVIEW_PHASES[phaseIndex]?.sealImage || '';
};

const normalizeFlashcardProgressRecord = (raw) => {
  const cardId = typeof raw?.cardId === 'string' ? raw.cardId.trim() : '';
  if (!cardId) return null;

  const phaseIndex = clampInteger(raw?.phaseIndex, 0, 5, 0);
  const targetPhaseIndex = clampInteger(raw?.targetPhaseIndex, 1, 5, 1);
  const status = normalizeFlashcardStatus(raw?.status);
  const memorizingDurationMs = Math.max(
    0,
    Math.round(Number(raw?.memorizingDurationMs) || 0)
  ) || FLASHCARD_REVIEW_PHASES[targetPhaseIndex]?.durationMs || FLASHCARD_REVIEW_PHASES[1].durationMs;
  const memorizingStartedAtMs = flashcardMillisFromTimestamp(raw?.memorizingStartedAt) || Math.max(0, Math.round(Number(raw?.memorizingStartedAt) || 0));
  const availableAtMs = flashcardMillisFromTimestamp(raw?.availableAt) || Math.max(0, Math.round(Number(raw?.availableAt) || 0));
  const returnedAtMs = flashcardMillisFromTimestamp(raw?.returnedAt) || Math.max(0, Math.round(Number(raw?.returnedAt) || 0));
  const createdAtMs = flashcardMillisFromTimestamp(raw?.createdAt) || Math.max(0, Math.round(Number(raw?.createdAt) || 0)) || Date.now();

  const normalized = {
    cardId,
    phaseIndex,
    targetPhaseIndex,
    status,
    typePortuguese: Boolean(raw?.typePortuguese || raw?.type_portuguese),
    memorizingStartedAt: status === 'memorizing' ? memorizingStartedAtMs || Date.now() : 0,
    memorizingDurationMs,
    availableAt: status === 'memorizing'
      ? availableAtMs || ((memorizingStartedAtMs || Date.now()) + memorizingDurationMs)
      : availableAtMs || returnedAtMs || createdAtMs,
    returnedAt: status === 'ready' ? (returnedAtMs || availableAtMs || Date.now()) : returnedAtMs,
    createdAt: createdAtMs,
    sealImage: ''
  };

  normalized.sealImage = resolveFlashcardSealImage(normalized);
  return normalized;
};

const mapStoredFlashcardProgressRow = (row) => {
  const mapped = {
    cardId: String(row?.card_id || '').trim(),
    phaseIndex: clampInteger(row?.phase_index, 0, 5, 0),
    targetPhaseIndex: clampInteger(row?.target_phase_index, 1, 5, 1),
    status: normalizeFlashcardStatus(row?.status),
    typePortuguese: Boolean(row?.type_portuguese),
    memorizingStartedAt: flashcardMillisFromTimestamp(row?.memorizing_started_at),
    memorizingDurationMs: Math.max(0, Math.round(Number(row?.memorizing_duration_ms) || 0)),
    availableAt: flashcardMillisFromTimestamp(row?.available_at),
    returnedAt: flashcardMillisFromTimestamp(row?.returned_at),
    createdAt: flashcardMillisFromTimestamp(row?.created_at),
    sealImage: String(row?.seal_image || '').trim()
  };

  if (!mapped.sealImage) {
    mapped.sealImage = resolveFlashcardSealImage(mapped);
  }
  if (mapped.status !== 'memorizing') {
    mapped.memorizingStartedAt = 0;
  }
  return mapped;
};

const ensureFlashcardUserStateTables = async () => {
  if (!pool) return false;

  await ensureUsersAvatarColumn();

  if (!flashcardUserStateTablesReadyPromise) {
    flashcardUserStateTablesReadyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.user_flashcard_progress (
          id bigserial PRIMARY KEY,
          user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          card_id text NOT NULL,
          phase_index integer NOT NULL DEFAULT 0,
          target_phase_index integer NOT NULL DEFAULT 1,
          status text NOT NULL DEFAULT 'memorizing',
          type_portuguese boolean NOT NULL DEFAULT false,
          memorizing_started_at timestamptz,
          memorizing_duration_ms integer NOT NULL DEFAULT 0,
          available_at timestamptz,
          returned_at timestamptz,
          seal_image text NOT NULL DEFAULT '',
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT user_flashcard_progress_unique UNIQUE (user_id, card_id)
        )
      `);
      await pool.query(`
        ALTER TABLE public.user_flashcard_progress
        ADD COLUMN IF NOT EXISTS seal_image text NOT NULL DEFAULT ''
      `);
      await pool.query(`
        ALTER TABLE public.user_flashcard_progress
        ADD COLUMN IF NOT EXISTS type_portuguese boolean NOT NULL DEFAULT false
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS user_flashcard_progress_user_idx
        ON public.user_flashcard_progress (user_id, status, available_at, updated_at DESC)
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.user_flashcard_stats (
          user_id integer PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
          play_time_ms bigint NOT NULL DEFAULT 0,
          speakings integer NOT NULL DEFAULT 0,
          listenings integer NOT NULL DEFAULT 0,
          training_time_ms bigint NOT NULL DEFAULT 0,
          pronunciation_samples jsonb NOT NULL DEFAULT '[]'::jsonb,
          second_star_error_heard boolean NOT NULL DEFAULT false,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`
        ALTER TABLE public.user_flashcard_stats
        ADD COLUMN IF NOT EXISTS second_star_error_heard boolean NOT NULL DEFAULT false
      `);
      await pool.query(`
        ALTER TABLE public.user_flashcard_stats
        ADD COLUMN IF NOT EXISTS training_time_ms bigint NOT NULL DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE public.user_flashcard_stats
        ADD COLUMN IF NOT EXISTS pronunciation_samples jsonb NOT NULL DEFAULT '[]'::jsonb
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.user_flashcard_hidden (
          user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          card_id text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (user_id, card_id)
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS user_flashcard_hidden_user_idx
        ON public.user_flashcard_hidden (user_id, updated_at DESC)
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.user_flashcard_type_portuguese (
          user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          card_id text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (user_id, card_id)
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS user_flashcard_type_portuguese_user_idx
        ON public.user_flashcard_type_portuguese (user_id, updated_at DESC)
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.user_flashcard_reports (
          user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          card_id text NOT NULL,
          report_type text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (user_id, card_id, report_type)
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS user_flashcard_reports_type_idx
        ON public.user_flashcard_reports (report_type, updated_at DESC)
      `);
      return true;
    })().catch((error) => {
      flashcardUserStateTablesReadyPromise = null;
      throw error;
    });
  }

  return flashcardUserStateTablesReadyPromise;
};

const ensurePremiumAccessTables = async () => {
  if (!pool) return false;

  await ensureUsersAvatarColumn();

  if (!premiumAccessTablesReadyPromise) {
    premiumAccessTablesReadyPromise = (async () => {
      await pool.query(`
        ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS premium_full_access boolean NOT NULL DEFAULT false
      `);
      await pool.query(`
        ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS premium_until timestamptz
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.user_access_keys (
          access_code text PRIMARY KEY,
          access_type text NOT NULL,
          duration_days integer NOT NULL,
          source_file text NOT NULL DEFAULT '',
          redeemed_by_user_id integer REFERENCES public.users(id) ON DELETE SET NULL,
          redeemed_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS user_access_keys_redeemed_idx
        ON public.user_access_keys (redeemed_by_user_id, redeemed_at DESC)
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.premium_checkout_sessions (
          stripe_session_id text PRIMARY KEY,
          user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          plan_key text NOT NULL,
          duration_days integer NOT NULL,
          payment_status text NOT NULL DEFAULT 'pending',
          premium_granted_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS premium_checkout_sessions_user_idx
        ON public.premium_checkout_sessions (user_id, created_at DESC)
      `);
      return true;
    })().catch((error) => {
      premiumAccessTablesReadyPromise = null;
      throw error;
    });
  }

  return premiumAccessTablesReadyPromise;
};

const ensureSpeakingRealtimeTables = async () => {
  if (!pool) return false;

  await ensureUsersAvatarColumn();

  if (!speakingRealtimeTablesReadyPromise) {
    speakingRealtimeTablesReadyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.user_presence (
          user_id integer PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
          last_seen_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS user_presence_last_seen_idx
        ON public.user_presence (last_seen_at DESC)
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.speaking_challenges (
          id bigserial PRIMARY KEY,
          challenger_user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          opponent_user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          status text NOT NULL DEFAULT 'pending',
          session_id text,
          created_at timestamptz NOT NULL DEFAULT now(),
          expires_at timestamptz NOT NULL DEFAULT (now() + interval '120 seconds'),
          responded_at timestamptz,
          challenger_notified_at timestamptz,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`
        ALTER TABLE public.speaking_challenges
        ADD COLUMN IF NOT EXISTS challenger_notified_at timestamptz
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS speaking_challenges_opponent_idx
        ON public.speaking_challenges (opponent_user_id, status, created_at DESC)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS speaking_challenges_challenger_idx
        ON public.speaking_challenges (challenger_user_id, status, created_at DESC)
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.speaking_duel_sessions (
          id text PRIMARY KEY,
          challenger_user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          opponent_user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          cards jsonb NOT NULL DEFAULT '[]'::jsonb,
          status text NOT NULL DEFAULT 'active',
          challenger_progress integer NOT NULL DEFAULT 0,
          opponent_progress integer NOT NULL DEFAULT 0,
          challenger_percent integer NOT NULL DEFAULT 0,
          opponent_percent integer NOT NULL DEFAULT 0,
          challenger_finished boolean NOT NULL DEFAULT false,
          opponent_finished boolean NOT NULL DEFAULT false,
          challenger_last_seen_at timestamptz NOT NULL DEFAULT now(),
          opponent_last_seen_at timestamptz NOT NULL DEFAULT now(),
          winner_user_id integer REFERENCES public.users(id) ON DELETE SET NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          finished_at timestamptz
        )
      `);
      await pool.query(`
        ALTER TABLE public.speaking_duel_sessions
        ADD COLUMN IF NOT EXISTS challenger_last_seen_at timestamptz NOT NULL DEFAULT now()
      `);
      await pool.query(`
        ALTER TABLE public.speaking_duel_sessions
        ADD COLUMN IF NOT EXISTS opponent_last_seen_at timestamptz NOT NULL DEFAULT now()
      `);
      await pool.query(`
        ALTER TABLE public.speaking_duel_sessions
        ADD COLUMN IF NOT EXISTS battle_counted boolean NOT NULL DEFAULT false
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS speaking_duel_sessions_challenger_idx
        ON public.speaking_duel_sessions (challenger_user_id, created_at DESC)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS speaking_duel_sessions_opponent_idx
        ON public.speaking_duel_sessions (opponent_user_id, created_at DESC)
      `);
      return true;
    })().catch((error) => {
      speakingRealtimeTablesReadyPromise = null;
      throw error;
    });
  }

  return speakingRealtimeTablesReadyPromise;
};

const ensureMiniBookJsonTables = async () => {
  if (!pool) return false;

  await ensureUsersAvatarColumn();

  if (!miniBookJsonTablesReadyPromise) {
    miniBookJsonTablesReadyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.minibook_json_content (
          book_id text PRIMARY KEY,
          file_name text NOT NULL DEFAULT '',
          title text NOT NULL DEFAULT '',
          level integer NOT NULL DEFAULT 1,
          payload jsonb NOT NULL DEFAULT '{}'::jsonb,
          updated_by_user_id integer REFERENCES public.users(id) ON DELETE SET NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS minibook_json_content_updated_idx
        ON public.minibook_json_content (updated_at DESC)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS minibook_json_content_level_idx
        ON public.minibook_json_content (level, updated_at DESC)
      `);
      return true;
    })().catch((error) => {
      miniBookJsonTablesReadyPromise = null;
      throw error;
    });
  }

  return miniBookJsonTablesReadyPromise;
};

const ensureBooksSpeakingStatsTable = async () => {
  if (!pool) return false;

  await ensureUsersAvatarColumn();

  if (!booksSpeakingStatsTablesReadyPromise) {
    booksSpeakingStatsTablesReadyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.user_books_speaking_stats (
          user_id integer PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
          book_read integer NOT NULL DEFAULT 0,
          pronunciation_tag text NOT NULL DEFAULT '${BOOKS_PRONUNCIATION_TAG}',
          pronunciation_samples jsonb NOT NULL DEFAULT '[]'::jsonb,
          pronunciation_sum bigint NOT NULL DEFAULT 0,
          pronunciation_samples_count bigint NOT NULL DEFAULT 0,
          latest_pronunciation_percent integer NOT NULL DEFAULT 0,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`
        ALTER TABLE public.user_books_speaking_stats
        ADD COLUMN IF NOT EXISTS book_read integer NOT NULL DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE public.user_books_speaking_stats
        ADD COLUMN IF NOT EXISTS pronunciation_tag text NOT NULL DEFAULT '${BOOKS_PRONUNCIATION_TAG}'
      `);
      await pool.query(`
        ALTER TABLE public.user_books_speaking_stats
        ADD COLUMN IF NOT EXISTS pronunciation_samples jsonb NOT NULL DEFAULT '[]'::jsonb
      `);
      await pool.query(`
        ALTER TABLE public.user_books_speaking_stats
        ADD COLUMN IF NOT EXISTS pronunciation_sum bigint NOT NULL DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE public.user_books_speaking_stats
        ADD COLUMN IF NOT EXISTS pronunciation_samples_count bigint NOT NULL DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE public.user_books_speaking_stats
        ADD COLUMN IF NOT EXISTS latest_pronunciation_percent integer NOT NULL DEFAULT 0
      `);
      await pool.query(`
        UPDATE public.user_books_speaking_stats
        SET
          pronunciation_sum = agg.pronunciation_sum,
          pronunciation_samples_count = agg.pronunciation_samples_count,
          latest_pronunciation_percent = agg.latest_pronunciation_percent
        FROM (
          SELECT
            user_id,
            COALESCE(SUM((sample.value)::int), 0)::bigint AS pronunciation_sum,
            COUNT(sample.value)::bigint AS pronunciation_samples_count,
            COALESCE((
              SELECT (last_sample.value)::int
              FROM jsonb_array_elements_text(COALESCE(ubs.pronunciation_samples, '[]'::jsonb)) WITH ORDINALITY AS last_sample(value, ord)
              ORDER BY last_sample.ord DESC
              LIMIT 1
            ), 0)::int AS latest_pronunciation_percent
          FROM public.user_books_speaking_stats ubs
          LEFT JOIN jsonb_array_elements_text(COALESCE(ubs.pronunciation_samples, '[]'::jsonb)) AS sample(value)
            ON TRUE
          GROUP BY user_id, pronunciation_samples
        ) AS agg
        WHERE public.user_books_speaking_stats.user_id = agg.user_id
          AND public.user_books_speaking_stats.pronunciation_samples_count = 0
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS user_books_speaking_stats_updated_idx
        ON public.user_books_speaking_stats (updated_at DESC)
      `);
      return true;
    })().catch((error) => {
      booksSpeakingStatsTablesReadyPromise = null;
      throw error;
    });
  }

  return booksSpeakingStatsTablesReadyPromise;
};

const ensureUserBooksLibraryStatsTable = async () => {
  if (!pool) return false;

  await ensureUsersAvatarColumn();

  if (!userBooksLibraryStatsReadyPromise) {
    userBooksLibraryStatsReadyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.user_books_library_stats (
          user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          book_id text NOT NULL,
          book_title text NOT NULL DEFAULT '',
          cover_image_url text NOT NULL DEFAULT '',
          background_desktop_url text NOT NULL DEFAULT '',
          reads_completed integer NOT NULL DEFAULT 0,
          listened_seconds bigint NOT NULL DEFAULT 0,
          best_speaking_percent integer,
          best_listening_percent integer,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (user_id, book_id)
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS user_books_library_stats_user_idx
        ON public.user_books_library_stats (user_id, updated_at DESC)
      `);
      return true;
    })().catch((error) => {
      userBooksLibraryStatsReadyPromise = null;
      throw error;
    });
  }

  return userBooksLibraryStatsReadyPromise;
};

const ensureUserBooksConsumptionStatsTable = async () => {
  if (!pool) return false;

  await ensureUsersAvatarColumn();

  if (!userBooksConsumptionStatsReadyPromise) {
    userBooksConsumptionStatsReadyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.user_books_consumption_stats (
          user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          speaking_chars bigint NOT NULL DEFAULT 0,
          listening_chars bigint NOT NULL DEFAULT 0,
          practice_seconds bigint NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (user_id)
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS user_books_consumption_stats_updated_idx
        ON public.user_books_consumption_stats (updated_at DESC)
      `);
      return true;
    })().catch((error) => {
      userBooksConsumptionStatsReadyPromise = null;
      throw error;
    });
  }

  return userBooksConsumptionStatsReadyPromise;
};

const ensureFlashcardRankingsTable = async () => {
  if (!pool) return false;

  if (!flashcardRankingsTableReadyPromise) {
    flashcardRankingsTableReadyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.flashcard_rankings (
          player_id text PRIMARY KEY,
          user_id integer,
          player_number integer UNIQUE NOT NULL,
          flashcards_count integer NOT NULL DEFAULT 0,
          weekly_count integer NOT NULL DEFAULT 0,
          monthly_count integer NOT NULL DEFAULT 0,
          all_time_count integer NOT NULL DEFAULT 0,
          last_progress_count integer NOT NULL DEFAULT 0,
          weekly_period_key text,
          monthly_period_key text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`
        ALTER TABLE public.flashcard_rankings
        ADD COLUMN IF NOT EXISTS user_id integer
      `);
      await pool.query(`
        ALTER TABLE public.flashcard_rankings
        ADD COLUMN IF NOT EXISTS weekly_count integer NOT NULL DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE public.flashcard_rankings
        ADD COLUMN IF NOT EXISTS monthly_count integer NOT NULL DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE public.flashcard_rankings
        ADD COLUMN IF NOT EXISTS all_time_count integer NOT NULL DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE public.flashcard_rankings
        ADD COLUMN IF NOT EXISTS last_progress_count integer NOT NULL DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE public.flashcard_rankings
        ADD COLUMN IF NOT EXISTS weekly_period_key text
      `);
      await pool.query(`
        ALTER TABLE public.flashcard_rankings
        ADD COLUMN IF NOT EXISTS monthly_period_key text
      `);
      await pool.query(`
        CREATE SEQUENCE IF NOT EXISTS public.flashcard_rankings_player_number_seq
        START WITH 100000
        INCREMENT BY 1
        MINVALUE 100000
      `);
      await pool.query(`
        WITH duplicate_rows AS (
          SELECT
            player_id,
            ROW_NUMBER() OVER (
              PARTITION BY user_id
              ORDER BY updated_at DESC, created_at DESC, player_number ASC, player_id ASC
            ) AS row_index
          FROM public.flashcard_rankings
          WHERE user_id IS NOT NULL
        )
        DELETE FROM public.flashcard_rankings target
        USING duplicate_rows source
        WHERE target.player_id = source.player_id
          AND source.row_index > 1
      `);
      await pool.query(`
        UPDATE public.flashcard_rankings
        SET player_id = CONCAT('user:', user_id)
        WHERE user_id IS NOT NULL
          AND (
            player_id IS NULL
            OR player_id = ''
            OR player_id !~ '^user:[0-9]+$'
          )
      `);
      await pool.query(`
        UPDATE public.flashcard_rankings
        SET
          all_time_count = GREATEST(COALESCE(all_time_count, 0), COALESCE(flashcards_count, 0)),
          last_progress_count = CASE
            WHEN COALESCE(last_progress_count, 0) > 0 THEN last_progress_count
            ELSE COALESCE(flashcards_count, 0)
          END
        WHERE COALESCE(flashcards_count, 0) > 0
      `);
      await pool.query(`
        SELECT setval(
          'public.flashcard_rankings_player_number_seq',
          GREATEST(
            COALESCE((SELECT MAX(player_number) FROM public.flashcard_rankings), 99999),
            99999
          ),
          true
        )
      `);
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS flashcard_rankings_user_id_idx
        ON public.flashcard_rankings (user_id)
        WHERE user_id IS NOT NULL
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS flashcard_rankings_count_idx
        ON public.flashcard_rankings (flashcards_count DESC, updated_at ASC, player_number ASC)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS flashcard_rankings_weekly_idx
        ON public.flashcard_rankings (weekly_period_key, weekly_count DESC, updated_at ASC, player_number ASC)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS flashcard_rankings_monthly_idx
        ON public.flashcard_rankings (monthly_period_key, monthly_count DESC, updated_at ASC, player_number ASC)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS flashcard_rankings_all_time_idx
        ON public.flashcard_rankings (all_time_count DESC, updated_at ASC, player_number ASC)
      `);
      return true;
    })().catch((error) => {
      flashcardRankingsTableReadyPromise = null;
      throw error;
    });
  }

  return flashcardRankingsTableReadyPromise;
};

const buildFlashcardRankingPlayerId = (userId) => `user:${userId}`;

const syncFlashcardRankingForUser = async (userId, flashcardsCount) => {
  if (!pool) {
    throw new Error('DATABASE_URL nao configurada.');
  }

  await ensureFlashcardRankingsTable();

  const normalizedUserId = Number.parseInt(userId, 10);
  const normalizedCount = normalizeFlashcardsCount(flashcardsCount);
  const normalizedPlayerId = buildFlashcardRankingPlayerId(normalizedUserId);
  const periodKeys = getFlashcardRankingPeriodKeys();

  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    const error = new Error('userId invalido.');
    error.statusCode = 400;
    throw error;
  }

  const existingResult = await pool.query(
    `SELECT
       player_id,
       user_id,
       player_number,
       flashcards_count,
       weekly_count,
       monthly_count,
       all_time_count,
       last_progress_count,
       weekly_period_key,
       monthly_period_key,
       created_at,
       updated_at
     FROM public.flashcard_rankings
     WHERE user_id = $1
     LIMIT 1`,
    [normalizedUserId]
  );

  if (existingResult.rows.length) {
    const existing = existingResult.rows[0];
    const legacyCount = Math.max(
      normalizeFlashcardsCount(existing.flashcards_count),
      normalizeFlashcardsCount(existing.all_time_count),
      normalizeFlashcardsCount(existing.last_progress_count)
    );
    const lastProgressCount = normalizeFlashcardsCount(
      Number(existing.last_progress_count) > 0 ? existing.last_progress_count : legacyCount
    );
    const delta = Math.max(0, normalizedCount - lastProgressCount);
    const weeklyBase = String(existing.weekly_period_key || '') === periodKeys.weeklyKey
      ? normalizeFlashcardsCount(existing.weekly_count)
      : 0;
    const monthlyBase = String(existing.monthly_period_key || '') === periodKeys.monthlyKey
      ? normalizeFlashcardsCount(existing.monthly_count)
      : 0;
    const allTimeBase = Math.max(normalizeFlashcardsCount(existing.all_time_count), legacyCount);
    const nextWeeklyCount = weeklyBase + delta;
    const nextMonthlyCount = monthlyBase + delta;
    const nextAllTimeCount = allTimeBase + delta;

    const updatedResult = await pool.query(
      `UPDATE public.flashcard_rankings
       SET flashcards_count = $2,
           weekly_count = $3,
           monthly_count = $4,
           all_time_count = $5,
           last_progress_count = $6,
           weekly_period_key = $7,
           monthly_period_key = $8,
           player_id = $9,
           updated_at = now()
       WHERE user_id = $1
       RETURNING
         player_id,
         user_id,
         player_number,
         flashcards_count,
         weekly_count,
         monthly_count,
         all_time_count,
         last_progress_count,
         weekly_period_key,
         monthly_period_key,
         created_at,
         updated_at`,
      [
        normalizedUserId,
        normalizedCount,
        nextWeeklyCount,
        nextMonthlyCount,
        nextAllTimeCount,
        normalizedCount,
        periodKeys.weeklyKey,
        periodKeys.monthlyKey,
        normalizedPlayerId
      ]
    );

    if (updatedResult.rows.length) {
      return updatedResult.rows[0];
    }
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const playerNumber = Math.floor(100000 + (Math.random() * 900000));
    try {
      const insertedResult = await pool.query(
        `INSERT INTO public.flashcard_rankings (
           player_id,
           user_id,
           player_number,
           flashcards_count,
           weekly_count,
           monthly_count,
           all_time_count,
           last_progress_count,
           weekly_period_key,
           monthly_period_key
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING
           player_id,
           user_id,
           player_number,
           flashcards_count,
           weekly_count,
           monthly_count,
           all_time_count,
           last_progress_count,
           weekly_period_key,
           monthly_period_key,
           created_at,
           updated_at`,
        [
          normalizedPlayerId,
          normalizedUserId,
          playerNumber,
          normalizedCount,
          normalizedCount,
          normalizedCount,
          normalizedCount,
          normalizedCount,
          periodKeys.weeklyKey,
          periodKeys.monthlyKey
        ]
      );
      return insertedResult.rows[0];
    } catch (error) {
      if (error?.code === '23505') {
        const retryResult = await pool.query(
          `SELECT
             player_id,
             user_id,
             player_number,
             flashcards_count,
             weekly_count,
             monthly_count,
             all_time_count,
             last_progress_count,
             weekly_period_key,
             monthly_period_key,
             created_at,
             updated_at
           FROM public.flashcard_rankings
           WHERE user_id = $1
           LIMIT 1`,
          [normalizedUserId]
        );
        if (retryResult.rows.length) {
          return syncFlashcardRankingForUser(normalizedUserId, normalizedCount);
        }
        continue;
      }
      throw error;
    }
  }

  throw new Error('Nao foi possivel gerar um numero aleatorio para o ranking.');
};

const syncFlashcardRankingTableFromProgressCounts = async () => {
  if (!pool) {
    throw new Error('DATABASE_URL nao configurada.');
  }

  await ensureUsersAvatarColumn();
  await ensureFlashcardUserStateTables();
  await ensureFlashcardRankingsTable();

  const periodKeys = getFlashcardRankingPeriodKeys();
  await pool.query(
    `WITH progress_counts AS (
       SELECT
         user_id,
         COUNT(*)::int AS total
       FROM public.user_flashcard_progress
       GROUP BY user_id
     )
     INSERT INTO public.flashcard_rankings (
       player_id,
       user_id,
       player_number,
       flashcards_count,
       weekly_count,
       monthly_count,
       all_time_count,
       last_progress_count,
       weekly_period_key,
       monthly_period_key
     )
     SELECT
       CONCAT('user:', u.id),
       u.id,
       nextval('public.flashcard_rankings_player_number_seq'),
       COALESCE(progress_counts.total, 0),
       COALESCE(progress_counts.total, 0),
       COALESCE(progress_counts.total, 0),
       COALESCE(progress_counts.total, 0),
       COALESCE(progress_counts.total, 0),
       $1,
       $2
     FROM public.users u
     LEFT JOIN progress_counts
       ON progress_counts.user_id = u.id
     ON CONFLICT (user_id) WHERE user_id IS NOT NULL
     DO UPDATE SET
       player_id = EXCLUDED.player_id,
       flashcards_count = EXCLUDED.flashcards_count,
       all_time_count = GREATEST(
         COALESCE(public.flashcard_rankings.all_time_count, 0),
         COALESCE(EXCLUDED.flashcards_count, 0),
         COALESCE(EXCLUDED.all_time_count, 0)
       ),
       last_progress_count = GREATEST(
         COALESCE(public.flashcard_rankings.last_progress_count, 0),
         COALESCE(EXCLUDED.flashcards_count, 0),
         COALESCE(EXCLUDED.last_progress_count, 0)
       ),
       updated_at = CASE
         WHEN COALESCE(public.flashcard_rankings.flashcards_count, -1) <> COALESCE(EXCLUDED.flashcards_count, -1)
           OR COALESCE(public.flashcard_rankings.player_id, '') <> COALESCE(EXCLUDED.player_id, '')
         THEN now()
         ELSE public.flashcard_rankings.updated_at
       END`,
    [periodKeys.weeklyKey, periodKeys.monthlyKey]
  );
};

const fetchFlashcardRankingSnapshot = async ({
  periodId = FLASHCARD_RANKING_PERIODS.weekly.id,
  limit = 100,
  currentUserId = 0
} = {}) => {
  if (!pool) {
    throw new Error('DATABASE_URL nao configurada.');
  }

  await ensureUsersAvatarColumn();
  await ensureFlashcardUserStateTables();
  await ensureFlashcardRankingsTable();
  await syncFlashcardRankingTableFromProgressCounts();

  const selectedPeriod = normalizeFlashcardRankingPeriod(periodId);
  const cappedLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 5000) : 5000;
  const periodKeys = getFlashcardRankingPeriodKeys();
  const cteSql = buildFlashcardRankingCteSql(selectedPeriod);
  const queryParams = [cappedLimit, periodKeys.weeklyKey, periodKeys.monthlyKey, currentUserId];

  const rankingPromise = pool.query(
    `${cteSql}
     SELECT
       user_id,
       username,
       avatar_image,
       player_number,
       weekly_flashcards_count,
       monthly_flashcards_count,
       all_time_flashcards_count,
       created_at,
       updated_at,
       rank
     FROM ranked
     ORDER BY rank
     LIMIT $1`,
    queryParams.slice(0, 3)
  );

  const playerPromise = currentUserId
    ? pool.query(
      `${cteSql}
       SELECT
         user_id,
         username,
         avatar_image,
         player_number,
         weekly_flashcards_count,
         monthly_flashcards_count,
         all_time_flashcards_count,
         created_at,
         updated_at,
         rank
       FROM ranked
       WHERE user_id = $4
       LIMIT 1`,
      queryParams
    )
    : Promise.resolve({ rows: [] });

  const [rankingResult, playerResult] = await Promise.all([rankingPromise, playerPromise]);
  const ranking = rankingResult.rows.map((row) => mapFlashcardRankingRow(row, selectedPeriod));

  return {
    period: selectedPeriod,
    periodLabel: FLASHCARD_RANKING_PERIODS[selectedPeriod]?.periodLabel || FLASHCARD_RANKING_PERIODS.weekly.periodLabel,
    ranking,
    player: playerResult.rows[0] ? mapFlashcardRankingRow(playerResult.rows[0], selectedPeriod) : null,
    periodKeys
  };
};

const ensureUsersAvatarColumn = async () => {
  if (!pool) return false;

  if (!usersAvatarColumnReadyPromise) {
    usersAvatarColumnReadyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.users (
          id serial4 PRIMARY KEY,
          email text UNIQUE NOT NULL,
          password_hash text NOT NULL,
          avatar_image text,
          created_at timestamp DEFAULT now()
        )
      `);
      await pool.query(`
        ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS avatar_image text
      `);
      await pool.query(`
        ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now()
      `);
      await pool.query(`
        ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS username text
      `);
      await pool.query(`
        ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS avatar_versions jsonb NOT NULL DEFAULT '[]'::jsonb
      `);
      await pool.query(`
        ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS avatar_generation_count integer NOT NULL DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS onboarding_name_completed boolean NOT NULL DEFAULT false
      `);
      await pool.query(`
        ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS onboarding_photo_completed boolean NOT NULL DEFAULT false
      `);
      await pool.query(`
        ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS battle integer NOT NULL DEFAULT 0
      `);
      await pool.query(`
        ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false
      `);
      await pool.query(`
        ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS bot_config jsonb NOT NULL DEFAULT '{}'::jsonb
      `);
      await pool.query(`
        ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS bot_avatar_status text NOT NULL DEFAULT 'ready'
      `);
      await pool.query(`
        ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS bot_avatar_error text
      `);
      await pool.query(`
        ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS created_by_user_id integer REFERENCES public.users(id) ON DELETE SET NULL
      `);
      await pool.query(`
        UPDATE public.users
        SET username = COALESCE(NULLIF(username, ''), email)
      `);
      return true;
    })().catch((error) => {
      usersAvatarColumnReadyPromise = null;
      throw error;
    });
  }

  return usersAvatarColumnReadyPromise;
};

const mapPublicUser = (user) => ({
  id: Number(user?.id) || 0,
  username: String(user?.username || user?.email || '').trim(),
  avatar_image: String(user?.avatar_image || '').trim(),
  avatar_versions: Array.isArray(user?.avatar_versions) ? user.avatar_versions : [],
  avatar_generation_count: Math.max(0, Number.parseInt(user?.avatar_generation_count, 10) || 0),
  onboarding_name_completed: Boolean(user?.onboarding_name_completed),
  onboarding_photo_completed: Boolean(user?.onboarding_photo_completed),
  created_at: user?.created_at || null,
  is_admin: isAdminUserRecord(user),
  is_bot: isBotUserRecord(user),
  bot_config: parseBotConfig(user?.bot_config),
  bot_avatar_status: String(user?.bot_avatar_status || '').trim() || 'ready',
  bot_avatar_error: String(user?.bot_avatar_error || '').trim(),
  has_password: Boolean(user?.password_hash),
  premium_full_access: Boolean(user?.premium_full_access),
  premium_until: user?.premium_until || null
});

const normalizeAdminUsername = (value) => String(value || '').trim().toLowerCase();

const isAdminUsername = (value) => FLASHCARD_ADMIN_USERNAMES.has(normalizeAdminUsername(value));

const isAdminUserRecord = (user) => {
  const username = normalizeAdminUsername(user?.username);
  const email = normalizeAdminUsername(user?.email);
  const emailLocalPart = email.includes('@') ? email.split('@')[0] : email;
  return isAdminUsername(username) || isAdminUsername(email) || isAdminUsername(emailLocalPart);
};

const buildPublicUsersVisibilityWhereClause = (requesterIsAdmin = false, usernameColumn = `COALESCE(NULLIF(u.username, ''), u.email)`) => {
  if (requesterIsAdmin) return '';
  return `WHERE NOT (
    LOWER(${usernameColumn}) IN ('admin', 'adm', 'adminst', 'admin2')
    OR UPPER(${usernameColumn}) LIKE '%USER%'
  )`;
};

const normalizeAccessKeyCode = (value) => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/[^A-P]/g, '');

const isPremiumActiveFromUser = (user) => {
  if (Boolean(user?.premium_full_access)) return true;
  const premiumUntilTime = Date.parse(user?.premium_until || '');
  return Number.isFinite(premiumUntilTime) && premiumUntilTime > Date.now();
};

const resolvePremiumState = (user) => ({
  fullAccess: isPremiumActiveFromUser(user),
  premiumUntil: user?.premium_until || null
});

const getPremiumBillingPlan = (planKey) => {
  const normalized = String(planKey || '').trim().toLowerCase();
  const plan = PREMIUM_BILLING_PLANS[normalized];
  if (!plan) return null;
  const priceId = env(process.env[plan.priceEnvKey]);
  if (!priceId) return null;
  return {
    ...plan,
    priceId
  };
};

const listAvailablePremiumBillingPlans = () => (
  Object.keys(PREMIUM_BILLING_PLANS)
    .map((planKey) => getPremiumBillingPlan(planKey))
    .filter(Boolean)
    .map((plan) => ({
      key: plan.key,
      label: plan.label,
      durationDays: plan.durationDays
    }))
);

const getRequestBaseUrl = (req) => {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'https';
  const host = forwardedHost || req.get('host') || '';
  if (!host) {
    return PLAYTALK_PUBLIC_BASE_URL || '';
  }
  return `${protocol}://${host}`.replace(/\/+$/g, '');
};

const buildPremiumReturnUrl = (req, search) => {
  const baseUrl = (PLAYTALK_PUBLIC_BASE_URL || getRequestBaseUrl(req) || '').replace(/\/+$/g, '');
  if (!baseUrl) {
    const error = new Error('PLAYTALK_PUBLIC_BASE_URL nao configurada.');
    error.statusCode = 500;
    throw error;
  }
  return `${baseUrl}/premium${search}`;
};

const isValidEmailAddress = (value) => (
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
);

const encodeStripeFormBody = (value, prefix = '') => {
  const parts = [];
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      const nextPrefix = `${prefix}[${index}]`;
      parts.push(...encodeStripeFormBody(entry, nextPrefix));
    });
    return parts;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, entry]) => {
      const nextPrefix = prefix ? `${prefix}[${key}]` : key;
      parts.push(...encodeStripeFormBody(entry, nextPrefix));
    });
    return parts;
  }

  if (!prefix) return parts;
  parts.push([prefix, value == null ? '' : String(value)]);
  return parts;
};

const callStripeApi = async (method, endpoint, payload) => {
  if (!STRIPE_SECRET_KEY) {
    const error = new Error('STRIPE_SECRET_KEY nao configurada.');
    error.statusCode = 503;
    throw error;
  }

  const headers = {
    Authorization: `Bearer ${STRIPE_SECRET_KEY}`
  };
  const requestInit = { method, headers };

  if (payload && method !== 'GET') {
    const params = new URLSearchParams();
    encodeStripeFormBody(payload).forEach(([key, value]) => {
      params.append(key, value);
    });
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    requestInit.body = params.toString();
  }

  const response = await fetch(`https://api.stripe.com/v1${endpoint}`, requestInit);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || 'Falha ao falar com o Stripe.');
    error.statusCode = response.status;
    error.details = body;
    throw error;
  }
  return body;
};

const readPremiumCheckoutSession = async (sessionId) => {
  if (!pool) {
    throw new Error('DATABASE_URL nao configurada.');
  }

  await ensurePremiumAccessTables();

  const normalizedSessionId = String(sessionId || '').trim();
  if (!normalizedSessionId) return null;

  const result = await pool.query(
    `SELECT stripe_session_id, user_id, plan_key, duration_days, payment_status,
            premium_granted_at, created_at, updated_at
     FROM public.premium_checkout_sessions
     WHERE stripe_session_id = $1
     LIMIT 1`,
    [normalizedSessionId]
  );
  return result.rows[0] || null;
};

const createPremiumCheckoutSessionRecord = async ({ sessionId, userId, plan }) => {
  if (!pool) {
    throw new Error('DATABASE_URL nao configurada.');
  }

  await ensurePremiumAccessTables();

  await pool.query(
    `INSERT INTO public.premium_checkout_sessions (
       stripe_session_id,
       user_id,
       plan_key,
       duration_days,
       payment_status
     )
     VALUES ($1, $2, $3, $4, 'pending')
     ON CONFLICT (stripe_session_id)
     DO UPDATE SET
       user_id = EXCLUDED.user_id,
       plan_key = EXCLUDED.plan_key,
       duration_days = EXCLUDED.duration_days,
       updated_at = now()`,
    [String(sessionId || '').trim(), Number(userId), plan.key, plan.durationDays]
  );
};

const fulfillPremiumCheckoutSession = async ({ sessionId, paymentStatus }) => {
  if (!pool) {
    throw new Error('DATABASE_URL nao configurada.');
  }

  await ensurePremiumAccessTables();

  const normalizedSessionId = String(sessionId || '').trim();
  if (!normalizedSessionId) {
    const error = new Error('Sessao de pagamento invalida.');
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sessionResult = await client.query(
      `SELECT stripe_session_id, user_id, plan_key, duration_days, payment_status, premium_granted_at
       FROM public.premium_checkout_sessions
       WHERE stripe_session_id = $1
       FOR UPDATE`,
      [normalizedSessionId]
    );
    const session = sessionResult.rows[0];
    if (!session) {
      const error = new Error('Sessao de pagamento nao encontrada.');
      error.statusCode = 404;
      throw error;
    }

    if (paymentStatus) {
      await client.query(
        `UPDATE public.premium_checkout_sessions
         SET payment_status = $2,
             updated_at = now()
         WHERE stripe_session_id = $1`,
        [normalizedSessionId, String(paymentStatus)]
      );
      session.payment_status = String(paymentStatus);
    }

    if (session.premium_granted_at) {
      await client.query('COMMIT');
      return readUserById(session.user_id);
    }

    if (String(session.payment_status).toLowerCase() !== 'paid') {
      const error = new Error('Pagamento ainda nao confirmado.');
      error.statusCode = 409;
      throw error;
    }

    const user = await extendUserPremiumAccess(session.user_id, session.duration_days, {
      accessType: `stripe:${session.plan_key}`,
      sourceFile: normalizedSessionId
    });

    await client.query(
      `UPDATE public.premium_checkout_sessions
       SET premium_granted_at = now(),
           updated_at = now()
       WHERE stripe_session_id = $1`,
      [normalizedSessionId]
    );

    await client.query('COMMIT');
    return user;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const accessKeyCache = {
  loadedAt: 0,
  map: new Map()
};

const buildAccessKeyFilePath = (typeKey) => {
  const config = ACCESS_KEY_TYPES[typeKey];
  return config ? path.join(ACCESSKEY_ROOT, config.fileName) : '';
};

const loadAccessKeyDefinitions = async ({ force = false } = {}) => {
  const now = Date.now();
  if (!force && accessKeyCache.loadedAt && (now - accessKeyCache.loadedAt) < 60_000 && accessKeyCache.map.size) {
    return accessKeyCache.map;
  }

  const nextMap = new Map();
  await fs.promises.mkdir(ACCESSKEY_ROOT, { recursive: true });

  for (const [typeKey, config] of Object.entries(ACCESS_KEY_TYPES)) {
    const filePath = buildAccessKeyFilePath(typeKey);
    try {
      const raw = await fs.promises.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      const keys = Array.isArray(parsed?.keys) ? parsed.keys : Array.isArray(parsed) ? parsed : [];
      keys.forEach((entry) => {
        const code = normalizeAccessKeyCode(typeof entry === 'string' ? entry : entry?.code);
        if (code.length !== 6) return;
        nextMap.set(code, config);
      });
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        console.error(`Falha ao carregar chaves ${config.fileName}:`, error);
      }
    }
  }

  accessKeyCache.loadedAt = now;
  accessKeyCache.map = nextMap;
  return nextMap;
};

const readUserById = async (userId) => {
  if (!pool) {
    throw new Error('DATABASE_URL nao configurada.');
  }

  const normalizedUserId = Number.parseInt(userId, 10);
  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    return null;
  }

  await ensureUsersAvatarColumn();
  await ensurePremiumAccessTables();

  const result = await pool.query(
    `SELECT id, email, username, avatar_image, avatar_versions, avatar_generation_count,
            onboarding_name_completed, onboarding_photo_completed, created_at, password_hash,
            premium_full_access, premium_until, is_bot, bot_config, bot_avatar_status,
            bot_avatar_error, created_by_user_id, battle
     FROM public.users
     WHERE id = $1
     LIMIT 1`,
    [normalizedUserId]
  );

  return result.rows[0] || null;
};

const normalizeAvatarImage = (value) => {
  const avatar = typeof value === 'string' ? value.trim() : '';
  if (!avatar) return '';

  const isDataImage = /^data:image\/(?:png|jpe?g|webp|gif|svg\+xml);base64,[a-z0-9+/=\s]+$/i.test(avatar);
  const isRemoteImage = /^https?:\/\/.+/i.test(avatar);

  if (!isDataImage && !isRemoteImage) {
    const error = new Error('Avatar invalido.');
    error.statusCode = 400;
    throw error;
  }

  const maxLength = isDataImage ? 6_500_000 : 2048;
  if (avatar.length > maxLength) {
    const error = new Error('Avatar muito grande.');
    error.statusCode = 413;
    throw error;
  }

  return avatar;
};

const normalizeBotConfig = (value, options = {}) => {
  const source = value && typeof value === 'object' ? value : {};
  const requirePhoto = options.requirePhoto !== false;
  const username = normalizeUsername(source.username || source.name || '');
  const flashcardsCount = normalizeFlashcardsCount(source.flashcardsCount);
  const pronunciationBase = clampPercent(source.pronunciationBase);
  const flashcardsPerHour = Math.max(0, Math.round(Number(source.flashcardsPerHour) || 0));
  const responseSeconds = Math.max(1, Math.min(30, Number(source.responseSeconds) || 3));
  const updateHour = clampBotUpdateHour(source.updateHour);
  const sourceImageDataUrl = source.sourceImageDataUrl ? normalizeAvatarImage(source.sourceImageDataUrl) : '';

  if (!isValidUsername(username)) {
    const error = new Error('Nome do bot invalido. Use de 3 a 32 caracteres.');
    error.statusCode = 400;
    throw error;
  }
  if (flashcardsCount <= 0) {
    const error = new Error('Numero de flashcards invalido.');
    error.statusCode = 400;
    throw error;
  }
  if (pronunciationBase <= 0) {
    const error = new Error('Pronuncia invalida.');
    error.statusCode = 400;
    throw error;
  }
  if (flashcardsPerHour <= 0) {
    const error = new Error('Flashcards por hora invalido.');
    error.statusCode = 400;
    throw error;
  }
  if (requirePhoto && !sourceImageDataUrl) {
    const error = new Error('Envie uma foto para gerar o avatar do bot.');
    error.statusCode = 400;
    throw error;
  }

  return {
    username,
    flashcardsCount,
    pronunciationBase,
    flashcardsPerHour,
    responseSeconds,
    updateHour,
    sourceImageDataUrl
  };
};

const parseBotConfig = (value) => {
  if (!value) return null;
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch (_error) {
      parsed = null;
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  try {
    return normalizeBotConfig(parsed, { requirePhoto: false });
  } catch (_error) {
    return null;
  }
};

const isBotUserRecord = (user) => Boolean(user?.is_bot);

function seededUnitInterval(seed) {
  const hash = crypto.createHash('sha256').update(String(seed || '')).digest('hex').slice(0, 12);
  const integer = Number.parseInt(hash, 16);
  if (!Number.isFinite(integer) || integer <= 0) return 0.5;
  return integer / 0xffffffffffff;
}

function resolveBotUpdateDateKey(now = new Date(), updateHour = 6) {
  const localNow = new Date(now.toLocaleString('en-US', { timeZone: FLASHCARD_RANKING_TIMEZONE }));
  if (localNow.getHours() < updateHour) {
    localNow.setDate(localNow.getDate() - 1);
  }
  const year = localNow.getFullYear();
  const month = String(localNow.getMonth() + 1).padStart(2, '0');
  const day = String(localNow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function computeBotVariance(baseValue, variance, seed) {
  const unit = seededUnitInterval(seed);
  const swing = (unit * 2) - 1;
  return baseValue + (swing * variance);
}

function buildBotDerivedStats(user, now = new Date()) {
  const botConfig = parseBotConfig(user?.bot_config);
  if (!isBotUserRecord(user) || !botConfig) {
    return {
      flashcardsCount: normalizeFlashcardsCount(user?.flashcards_count),
      pronunciationPercent: clampPercent(user?.pronunciation_percent),
      speedFlashcardsPerHour: Math.max(0, Number(user?.speed_flashcards_per_hour) || 0),
      battlesWon: Math.max(0, Number(user?.battle) || 0)
    };
  }

  const createdAtMs = Date.parse(String(user?.created_at || '').trim());
  const updateDateKey = resolveBotUpdateDateKey(now, botConfig.updateHour);
  const currentDateKey = String(updateDateKey || '');
  let daysSinceCreation = 0;
  if (Number.isFinite(createdAtMs) && createdAtMs > 0) {
    const createdDateKey = resolveBotUpdateDateKey(new Date(createdAtMs), botConfig.updateHour);
    const createdLocal = new Date(`${createdDateKey}T00:00:00`);
    const currentLocal = new Date(`${currentDateKey}T00:00:00`);
    const deltaDays = Math.floor((currentLocal - createdLocal) / 86400000);
    daysSinceCreation = Math.max(0, deltaDays);
  }

  const dailySeedBase = `${user.id}:${currentDateKey}`;
  const dailyFlashcardsGain = Math.max(0, Math.round(botConfig.flashcardsPerHour * (BOT_DAILY_FLASHCARD_TRAINING_MINUTES / 60)));
  const speed = Math.max(
    0,
    Number(computeBotVariance(botConfig.flashcardsPerHour, botConfig.flashcardsPerHour * (BOT_FLASHCARDS_SPEED_VARIANCE_PERCENT / 100), `${dailySeedBase}:speed`).toFixed(1))
  );
  const pronunciationPercent = clampPercent(
    computeBotVariance(botConfig.pronunciationBase, BOT_PRONUNCIATION_VARIANCE_PERCENT, `${dailySeedBase}:pronunciation`)
  );

  return {
    flashcardsCount: botConfig.flashcardsCount + (dailyFlashcardsGain * daysSinceCreation),
    pronunciationPercent,
    speedFlashcardsPerHour: speed,
    battlesWon: Math.max(0, Number(user?.battle) || 0)
  };
};

const readFlashcardProgressCountForUser = async (userId) => {
  if (!pool) {
    throw new Error('DATABASE_URL nao configurada.');
  }

  await ensureFlashcardUserStateTables();

  const normalizedUserId = Number.parseInt(userId, 10);
  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    const error = new Error('userId invalido.');
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM public.user_flashcard_progress
     WHERE user_id = $1`,
    [normalizedUserId]
  );

  return Number(result.rows[0]?.total) || 0;
};

const extendUserPremiumAccess = async (userId, durationDays, options = {}) => {
  if (!pool) {
    throw new Error('DATABASE_URL nao configurada.');
  }

  await ensurePremiumAccessTables();

  const normalizedUserId = Number.parseInt(userId, 10);
  const normalizedDurationDays = Math.max(1, Number.parseInt(durationDays, 10) || 0);
  const accessType = String(options.accessType || '').trim().toLowerCase() || 'manual';
  const accessCode = normalizeAccessKeyCode(options.accessCode);
  const sourceFile = String(options.sourceFile || '').trim();
  const grantFullAccess = Boolean(options.grantFullAccess);

  if (!normalizedUserId || !normalizedDurationDays) {
    const error = new Error('Parametros de premium invalidos.');
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (accessCode) {
      const existing = await client.query(
        `SELECT redeemed_by_user_id
         FROM public.user_access_keys
         WHERE access_code = $1
         LIMIT 1`,
        [accessCode]
      );
      const alreadyRedeemedBy = Number(existing.rows[0]?.redeemed_by_user_id) || 0;
      if (alreadyRedeemedBy) {
        const error = new Error('Essa chave ja foi usada.');
        error.statusCode = 409;
        throw error;
      }

      await client.query(
        `INSERT INTO public.user_access_keys (
           access_code,
           access_type,
           duration_days,
           source_file,
           redeemed_by_user_id,
           redeemed_at
         )
         VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT (access_code)
         DO UPDATE SET
           access_type = EXCLUDED.access_type,
           duration_days = EXCLUDED.duration_days,
           source_file = EXCLUDED.source_file,
           redeemed_by_user_id = EXCLUDED.redeemed_by_user_id,
           redeemed_at = EXCLUDED.redeemed_at`,
        [accessCode, accessType, normalizedDurationDays, sourceFile, normalizedUserId]
      );
    }

    const result = await client.query(
      `UPDATE public.users
       SET premium_full_access = CASE
             WHEN $3::boolean THEN true
             ELSE premium_full_access
           END,
           premium_until = CASE
             WHEN $3::boolean THEN premium_until
             ELSE GREATEST(COALESCE(premium_until, now()), now()) + ($2::text || ' days')::interval
           END
       WHERE id = $1
       RETURNING id, email, username, avatar_image, avatar_versions, avatar_generation_count,
                 onboarding_name_completed, onboarding_photo_completed,
                 created_at, premium_full_access, premium_until`,
      [normalizedUserId, normalizedDurationDays, grantFullAccess]
    );

    if (!result.rows.length) {
      const error = new Error('Usuario nao encontrado.');
      error.statusCode = 404;
      throw error;
    }

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const syncFlashcardRankingFromProgressCount = async (userId) => {
  const count = await readFlashcardProgressCountForUser(userId);
  return syncFlashcardRankingForUser(userId, count);
};

const readFlashcardStateForUser = async (userId) => {
  if (!pool) {
    throw new Error('DATABASE_URL nao configurada.');
  }

  await ensureFlashcardUserStateTables();

  const normalizedUserId = Number.parseInt(userId, 10);
  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    const error = new Error('userId invalido.');
    error.statusCode = 400;
    throw error;
  }

  const [progressResult, statsResult, hiddenResult] = await Promise.all([
    pool.query(
      `SELECT
         card_id,
         phase_index,
         target_phase_index,
         status,
         type_portuguese,
         memorizing_started_at,
         memorizing_duration_ms,
         available_at,
         returned_at,
         seal_image,
         created_at
       FROM public.user_flashcard_progress
       WHERE user_id = $1
       ORDER BY updated_at DESC, created_at DESC, card_id ASC`,
      [normalizedUserId]
    ),
    pool.query(
      `SELECT play_time_ms, speakings, listenings, training_time_ms, pronunciation_samples,
              second_star_error_heard, updated_at
       FROM public.user_flashcard_stats
       WHERE user_id = $1
       LIMIT 1`,
      [normalizedUserId]
    )
    ,
    pool.query(
      `SELECT card_id
       FROM public.user_flashcard_hidden
       WHERE user_id = $1
       ORDER BY updated_at DESC, created_at DESC, card_id ASC`,
      [normalizedUserId]
    )
  ]);

  await syncFlashcardRankingForUser(normalizedUserId, progressResult.rows.length);

  return {
    progress: progressResult.rows.map(mapStoredFlashcardProgressRow).filter((item) => item.cardId),
    stats: statsResult.rows[0]
      ? normalizeFlashcardStats({
        playTimeMs: statsResult.rows[0].play_time_ms,
        speakings: statsResult.rows[0].speakings,
        listenings: statsResult.rows[0].listenings,
        trainingTimeMs: statsResult.rows[0].training_time_ms,
        pronunciationSamples: statsResult.rows[0].pronunciation_samples,
        secondStarErrorHeard: statsResult.rows[0].second_star_error_heard
      }, progressResult.rows.length)
      : normalizeFlashcardStats({}, progressResult.rows.length),
    meta: {
      hasProgress: progressResult.rows.length > 0,
      hasStats: Boolean(statsResult.rows[0]),
      hiddenCardIds: hiddenResult.rows
        .map((row) => typeof row?.card_id === 'string' ? row.card_id.trim() : '')
        .filter(Boolean)
    }
  };
};

const saveFlashcardStateForUser = async (userId, payload) => {
  if (!pool) {
    throw new Error('DATABASE_URL nao configurada.');
  }

  await ensureFlashcardUserStateTables();

  const normalizedUserId = Number.parseInt(userId, 10);
  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    const error = new Error('userId invalido.');
    error.statusCode = 400;
    throw error;
  }

  const rawProgress = Array.isArray(payload?.progress) ? payload.progress : [];
  if (rawProgress.length > 5000) {
    const error = new Error('Quantidade de flashcards acima do limite suportado.');
    error.statusCode = 413;
    throw error;
  }

  const dedupedProgress = new Map();
  rawProgress.forEach((item) => {
    const normalized = normalizeFlashcardProgressRecord(item);
    if (normalized) {
      dedupedProgress.set(normalized.cardId, normalized);
    }
  });
  const progress = Array.from(dedupedProgress.values());
  const stats = normalizeFlashcardStats(payload?.stats, progress.length);
  const hiddenCardIds = Array.isArray(payload?.hiddenCardIds)
    ? Array.from(new Set(payload.hiddenCardIds
      .map((cardId) => typeof cardId === 'string' ? cardId.trim() : '')
      .filter(Boolean)))
    : [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingStatsResult = await client.query(
      `SELECT training_time_ms, pronunciation_samples
       FROM public.user_flashcard_stats
       WHERE user_id = $1
       LIMIT 1`,
      [normalizedUserId]
    );
    const existingProgressCountResult = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM public.user_flashcard_progress
       WHERE user_id = $1`,
      [normalizedUserId]
    );
    const existingProgressCount = Math.max(0, Number(existingProgressCountResult.rows[0]?.total) || 0);
    const shouldPersistPerformanceStats = progress.length > existingProgressCount;

    if (progress.length) {
      const cardIds = progress.map((item) => item.cardId);
      await client.query(
        `DELETE FROM public.user_flashcard_progress
         WHERE user_id = $1
           AND NOT (card_id = ANY($2::text[]))`,
        [normalizedUserId, cardIds]
      );

      const values = [];
      const params = [];
      progress.forEach((item, index) => {
        const offset = index * 12;
        values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, now())`);
        params.push(
          normalizedUserId,
          item.cardId,
          item.phaseIndex,
          item.targetPhaseIndex,
          item.status,
          Boolean(item.typePortuguese),
          flashcardTimestampFromMillis(item.memorizingStartedAt),
          item.memorizingDurationMs,
          flashcardTimestampFromMillis(item.availableAt),
          flashcardTimestampFromMillis(item.returnedAt),
          flashcardTimestampFromMillis(item.createdAt),
          item.sealImage
        );
      });

      await client.query(
        `INSERT INTO public.user_flashcard_progress (
           user_id,
           card_id,
           phase_index,
           target_phase_index,
           status,
           type_portuguese,
           memorizing_started_at,
           memorizing_duration_ms,
           available_at,
           returned_at,
           created_at,
           seal_image,
           updated_at
         )
         VALUES ${values.join(', ')}
         ON CONFLICT (user_id, card_id)
         DO UPDATE SET
           phase_index = EXCLUDED.phase_index,
           target_phase_index = EXCLUDED.target_phase_index,
           status = EXCLUDED.status,
           type_portuguese = EXCLUDED.type_portuguese,
           memorizing_started_at = EXCLUDED.memorizing_started_at,
           memorizing_duration_ms = EXCLUDED.memorizing_duration_ms,
           available_at = EXCLUDED.available_at,
           returned_at = EXCLUDED.returned_at,
           seal_image = EXCLUDED.seal_image,
           updated_at = now()`,
        params
      );
    } else {
      await client.query(
        `DELETE FROM public.user_flashcard_progress
         WHERE user_id = $1`,
        [normalizedUserId]
      );
    }

    if (hiddenCardIds.length) {
      await client.query(
        `DELETE FROM public.user_flashcard_hidden
         WHERE user_id = $1
           AND NOT (card_id = ANY($2::text[]))`,
        [normalizedUserId, hiddenCardIds]
      );

      const hiddenValues = [];
      const hiddenParams = [];
      hiddenCardIds.forEach((cardId, index) => {
        const offset = index * 2;
        hiddenValues.push(`($${offset + 1}, $${offset + 2}, now(), now())`);
        hiddenParams.push(normalizedUserId, cardId);
      });

      await client.query(
        `INSERT INTO public.user_flashcard_hidden (
           user_id,
           card_id,
           created_at,
           updated_at
         )
         VALUES ${hiddenValues.join(', ')}
         ON CONFLICT (user_id, card_id)
         DO UPDATE SET
           updated_at = now()`,
        hiddenParams
      );
    } else {
      await client.query(
        `DELETE FROM public.user_flashcard_hidden
         WHERE user_id = $1`,
        [normalizedUserId]
      );
    }

    await client.query(
      `INSERT INTO public.user_flashcard_stats (
         user_id,
         play_time_ms,
         speakings,
         listenings,
         training_time_ms,
         pronunciation_samples,
         second_star_error_heard,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, now())
       ON CONFLICT (user_id)
       DO UPDATE SET
         play_time_ms = EXCLUDED.play_time_ms,
         speakings = EXCLUDED.speakings,
         listenings = EXCLUDED.listenings,
         training_time_ms = CASE
           WHEN $8::boolean THEN EXCLUDED.training_time_ms
           ELSE public.user_flashcard_stats.training_time_ms
         END,
         pronunciation_samples = CASE
           WHEN $8::boolean THEN EXCLUDED.pronunciation_samples
           ELSE public.user_flashcard_stats.pronunciation_samples
         END,
         second_star_error_heard = EXCLUDED.second_star_error_heard,
         updated_at = now()`,
      [
        normalizedUserId,
        stats.playTimeMs,
        stats.speakings,
        stats.listenings,
        shouldPersistPerformanceStats
          ? stats.trainingTimeMs
          : Math.max(0, Number(existingStatsResult.rows[0]?.training_time_ms) || 0),
        JSON.stringify(
          shouldPersistPerformanceStats
            ? stats.pronunciationSamples
            : normalizeFlashcardPronunciationSamples(existingStatsResult.rows[0]?.pronunciation_samples)
        ),
        stats.secondStarErrorHeard,
        shouldPersistPerformanceStats
      ]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const rankingRecord = await syncFlashcardRankingForUser(normalizedUserId, progress.length);
  return {
    progressCount: progress.length,
    stats,
    rankingRecord
  };
};

const logDatabaseConnectionStatus = async () => {
  if (!pool) {
    console.warn('Banco de dados não configurado: defina DATABASE_URL ou DATABASE_HOST.');
    return;
  }

  console.log(
    `Postgres target: source=${databaseTarget.source}, host=${databaseTarget.host || '(vazio)'}, port=${databaseTarget.port || '(vazio)'}, db=${databaseTarget.database || '(vazio)'}, ssl=${DATABASE_SSL ? 'on' : 'off'}`
  );

  try {
    await pool.query('SELECT 1');
    await ensureUsersAvatarColumn();
    await ensureFlashcardUserStateTables();
    await ensureFlashcardRankingsTable();
    console.log('Conexão com Postgres validada com sucesso.');
  } catch (error) {
    console.error('Falha ao conectar no Postgres:', {
      code: error.code,
      message: error.message,
      host: databaseTarget.host,
      source: databaseTarget.source
    });
  }
};

const staticDir = (() => {
  const customDir = process.env.STATIC_DIR;
  if (customDir) {
    return path.resolve(__dirname, customDir);
  }

  const candidateDirs = ['public', 'www', 'dist'];
  for (const dir of candidateDirs) {
    const candidatePath = path.join(__dirname, dir);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return __dirname;
})();

const IMAGES_ROOT = (() => {
  const candidateDirs = [
    path.join('www', 'imagens'),
    path.join('www', 'images'),
    'imagens',
    'images'
  ];
  for (const dir of candidateDirs) {
    const fullPath = path.join(__dirname, dir);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return path.join(staticDir, 'images');
})();

const VOICES_ROOT = (() => {
  const candidateDirs = [path.join('www', 'voices'), 'voices'];
  for (const dir of candidateDirs) {
    const fullPath = path.join(__dirname, dir);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return path.join(staticDir, 'voices');
})();
const ALLCARDS_ROOT = path.join(__dirname, 'allcards');
const LEGACY_FLASHCARDS_ROOT = path.join(__dirname, 'legado');
const LOCAL_FLASHCARD_VISIBILITY_STATE_PATH = path.join(__dirname, 'data', 'local-flashcard-visibility.json');
const ACCESSKEY_ROOT = path.join(__dirname, 'accesskey');
const LOCAL_LEVELS_ROOT = path.join(__dirname, 'Niveis');
const FLASHCARD_DATA_RELATIVE_ROOT = path.posix.join('data', 'flashcards', '130', '001');
const ADMIN_FLASHCARD_ASSET_RELATIVE_ROOT = path.posix.join('admin', 'FlashCards');
const ADMIN_BANNER_RELATIVE_ROOT = path.posix.join('admin', 'banners');
const ADMIN_BANNER_MANIFEST_RELATIVE_PATH = path.posix.join(ADMIN_BANNER_RELATIVE_ROOT, 'manifest.json');
const ADMIN_BANNER_MANIFEST_OBJECT_KEY = path.posix.join(ADMIN_BANNER_RELATIVE_ROOT, 'manifest.json');
const ADMIN_BANNER_IMAGE_OBJECT_PREFIX = path.posix.join(ADMIN_BANNER_RELATIVE_ROOT, 'images');
const ADMIN_BANNER_SLOT_COUNT = 4;
const ADMIN_BANNER_RESOLUTION_LABEL = '1600 x 900 px';
const ADMIN_BANNER_DESKTOP_RENDER_SIZE = Object.freeze({ width: 1600, height: 540 });
const ADMIN_BANNER_MOBILE_RENDER_SIZE = Object.freeze({ width: 1600, height: 900 });
const ADMIN_BANNER_DEFAULT_PROMPT = [
  'Create a premium website hero banner.',
  'Landscape 16:9 composition, cinematic lighting, realistic style, clean and modern.',
  'No text, no logos, no watermark, no extra frames.',
  'Keep the main subject centered so crop and reposition remain safe.',
  'Use vibrant but elegant colors and high contrast details.'
].join(' ');
const MINIBOOKS_RELATIVE_ROOT = path.posix.join('minibooks');
const MINIBOOKS_MANIFEST_RELATIVE_PATH = path.posix.join(MINIBOOKS_RELATIVE_ROOT, 'manifest.json');
const MINIBOOKS_MANIFEST_OBJECT_KEY = path.posix.join(MINIBOOKS_RELATIVE_ROOT, 'manifest.json');
const MINIBOOKS_IMAGE_OBJECT_PREFIX = path.posix.join(MINIBOOKS_RELATIVE_ROOT, 'images');
const MINIBOOKS_AUDIO_OBJECT_PREFIX = path.posix.join(MINIBOOKS_RELATIVE_ROOT, 'audio');
const MINIBOOKS_COVER_RENDER_SIZE = Object.freeze({ height: 600 });
const MINIBOOKS_BACKGROUND_DESKTOP_RENDER_SIZE = Object.freeze({ width: 1600, height: 900 });
const MINIBOOKS_BACKGROUND_MOBILE_RENDER_SIZE = Object.freeze({ width: 900, height: 1600 });
const MINIBOOKS_DEFAULT_COVER_PROMPT = [
  'Create a vertical 9:16 premium book cover for a minibook.',
  'The cover title and logline must be in Portuguese, using typography harmonized with the theme like top editorial book designers.',
  'Use a high-quality visual direction that matches the theme: it may be colorful, blue, tech, neon, minimalist, painterly, abstract, or another fitting style.',
  'Keep the composition elegant, creative, clear, and visually premium.',
  'No watermark, no random letters, no extra logos.'
].join(' ');
const MINIBOOKS_DEFAULT_BACKGROUND_PROMPT = [
  'Create a premium immersive reading background for a minibook.',
  'Choose bright, creative, high-quality imagery that harmonizes with the theme.',
  'It may be abstract when the theme suggests it, and should use colors that fit the concept such as colorful, blue, tech, neon, minimalist, or painterly moods.',
  'Preserve clean visual space for overlays and readability.',
  'No text, no logos, no watermark.'
].join(' ');
const MINIBOOKS_WRITER_MODEL = 'gpt-5.4-nano';
const MINIBOOKS_ALLOWED_OPENAI_VOICES = new Set(['fable', 'alloy', 'sage', 'nova', 'verse']);
const MINIBOOKS_WRITER_BASE_PROMPT = [
  'This GPT helps users create, outline, and write very short books ("mini books") across genres. It specializes in concise storytelling, clear structure, and fast iteration from idea to finished piece. It guides users through brainstorming, outlining chapters or sections, drafting compact narratives, and refining language for impact within a small word count.',
  'It should proactively suggest formats like micro-fiction, children’s stories, short guides, or poetic booklets. It can generate titles, hooks, summaries, and chapter breakdowns, then expand them into polished mini books.',
  'It keeps responses focused, practical, and creatively engaging while respecting brevity as a core principle. It can adapt tone (playful, serious, instructional) depending on the user’s intent.',
  'When details are missing, it makes reasonable assumptions but also offers optional directions the user can choose from. It encourages iteration and provides multiple variations when helpful.',
  'It avoids producing overly long or bloated content unless explicitly requested. It does not drift into unrelated topics.',
  'It may ask light clarifying questions when needed, but often moves forward with suggestions to keep momentum.',
  'It maintains a supportive, imaginative tone and helps users quickly turn ideas into finished mini books.'
].join('\n\n');
const LOCAL_LEVEL_MANIFEST_RELATIVE_PATH = path.posix.join('data', 'local-level-files.json');
const LOCAL_LEVEL_ALLOWED_FOLDERS = ['others', 'talking', 'watching', 'words'];
const FLASHCARD_ADMIN_USERNAMES = new Set(['admin', 'adm', 'adminst', 'admin2']);
const ACCESS_KEY_TYPES = {
  semana: { ...PREMIUM_BILLING_PLANS.semana, fileName: 'semana.json' },
  mes: { ...PREMIUM_BILLING_PLANS.mes, fileName: 'mes.json' },
  ano: { ...PREMIUM_BILLING_PLANS.ano, fileName: 'ano.json' }
};
const BONUS_ACCESS_KEYS = new Map([
  ['GGGGGG', { key: 'bonus3dias', label: '3 dias gratis', durationDays: 3, fileName: 'bonus-manual' }]
]);
const ACCESS_KEY_ALPHABET = 'ABCDEFGHIJKLMNOP';
const FLASHCARD_FREE_LIMIT = 30;
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp']);
const SUPPORTED_AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.opus', '.ogg', '.oga', '.webm']);
const SUPPORTED_VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.ogv', '.mov', '.m4v']);
const SUPPORTED_MEDIA_EXTENSIONS = new Set([
  ...SUPPORTED_IMAGE_EXTENSIONS,
  ...SUPPORTED_AUDIO_EXTENSIONS,
  ...SUPPORTED_VIDEO_EXTENSIONS
]);
const R2_BUCKET_NAME = env(process.env.R2_BUCKET_NAME);
const R2_ACCESS_KEY_ID = env(process.env.R2_ACCESS_KEY_ID);
const R2_SECRET_ACCESS_KEY = env(process.env.R2_SECRET_ACCESS_KEY);
const R2_ENDPOINT = env(process.env.R2_ENDPOINT);
const R2_CONTENT_ROOT = env(process.env.R2_CONTENT_ROOT) || 'contnent';
const R2_REGION = 'auto';
let r2Client = null;
const DEFAULT_FLASHCARDS_R2_PUBLIC_ROOT = 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev';
const FLASHCARDS_R2_PUBLIC_ROOT = (() => {
  const configured = env(process.env.FLASHCARDS_R2_PUBLIC_ROOT) || env(process.env.PLAYTALK_R2_PUBLIC_ROOT);
  if (configured && /^https?:\/\//i.test(configured)) {
    return configured.replace(/\/+$/g, '');
  }
  return DEFAULT_FLASHCARDS_R2_PUBLIC_ROOT;
})();
const FLASHCARDS_R2_PREFIX = 'Star';
const FLASHCARD_CAMERA_OBJECT_KEY = 'FlashCards/camera.webp';
const DEFAULT_GAME_SOUNDS_BASE_URL = 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/gamesounds';
const GAME_SOUNDS_BASE_URL = (process.env.GAME_SOUNDS_BASE_URL || DEFAULT_GAME_SOUNDS_BASE_URL).trim();
const EMPTY_R2_PAYLOAD_HASH = require('crypto').createHash('sha256').update('').digest('hex');
const EVENTOS_ALLOWED_MEDIA_HOSTS = new Set([
  'pub-3f5e3a74474b4527bc44ecf90f75585a.r2.dev'
]);

const FORCE_R2_GAME_SOUND_FILES = new Set([
  '001.mp3',
  '002.mp3',
  '003.mp3',
  '004.mp3',
  '005.mp3',
  '006.mp3',
  '007.mp3',
  '008.mp3',
  '009.mp3',
  '010.mp3',
  'abertura.mp3',
  'conclusão.mp3',
  'conclusão1.mp3',
  'conclusao.mp3',
  'conclusao1.mp3',
  'error.mp3',
  'fase1.mp3',
  'fase2.mp3',
  'fase3.mp3',
  'fase4.mp3',
  'fase5.mp3',
  'fase6.mp3',
  'fase7.mp3',
  'final.mp3',
  'final_1.mp3.mp3',
  'final_1.mp3'
]);
let imageIndex = null;
let imageLevelIndex = null;
let voiceIndex = null;
let mediaIndex = null;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true }));

const MEDIA_DIR_CANDIDATES = [
  'videos',
  'video',
  'voices',
  'gamesounds',
  'audio',
  'images',
  'imagens',
  'backgrounds',
  'Avatar',
  'SVG',
  'Fontes',
  'medalhas',
  'data'
];

function extractLevelFromRelativePath(relativePath) {
  if (!relativePath) return null;
  const [firstSegment] = relativePath.split(path.sep);
  const parsed = Number.parseInt(firstSegment, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function isR2FluencyConfigured() {
  return Boolean(R2_BUCKET_NAME && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ENDPOINT);
}

function getR2Client() {
  if (!isR2FluencyConfigured()) {
    const error = new Error('R2 nao configurado.');
    error.statusCode = 503;
    throw error;
  }

  if (!r2Client) {
    r2Client = new S3Client({
      region: R2_REGION,
      endpoint: R2_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY
      }
    });
  }

  return r2Client;
}

async function readR2BodyAsBuffer(body) {
  if (!body) {
    return Buffer.alloc(0);
  }

  if (typeof body.transformToByteArray === 'function') {
    const bytes = await body.transformToByteArray();
    return Buffer.from(bytes);
  }

  if (typeof body.transformToString === 'function') {
    return Buffer.from(await body.transformToString(), 'utf8');
  }

  if (Buffer.isBuffer(body)) {
    return body;
  }

  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function describeR2Error(error, operation = 'operacao') {
  const rawMessage = String(error?.message || error?.Code || error || '').trim();
  if (/SignatureDoesNotMatch/i.test(rawMessage)) {
    return `R2 ${operation} falhou: as credenciais S3 configuradas nao batem com este bucket/endpoint. Revise R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_ENDPOINT.`;
  }
  if (/InvalidAccessKeyId/i.test(rawMessage)) {
    return `R2 ${operation} falhou: o R2_ACCESS_KEY_ID configurado nao foi reconhecido.`;
  }
  if (/AccessDenied|Unauthorized/i.test(rawMessage)) {
    return `R2 ${operation} falhou: acesso negado. Revise as permissoes da chave do R2.`;
  }
  return `R2 ${operation} falhou: ${rawMessage || 'erro desconhecido.'}`;
}

function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, char =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function encodeR2ObjectKey(key) {
  return String(key || '')
    .split('/')
    .map(segment => encodeRfc3986(segment))
    .join('/');
}

function sha256Hex(value) {
  return require('crypto').createHash('sha256').update(value, 'utf8').digest('hex');
}

function sha256HexBuffer(value) {
  return require('crypto').createHash('sha256').update(value).digest('hex');
}

function hmacSha256(key, value, encoding) {
  return require('crypto').createHmac('sha256', key).update(value, 'utf8').digest(encoding);
}

function safeGeneratedBase(name, fallback = 'playtalk-image') {
  const normalized = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[^.]+$/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return normalized || fallback;
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const outputs = Array.isArray(payload?.output) ? payload.output : [];
  const chunks = [];
  for (const output of outputs) {
    const content = Array.isArray(output?.content) ? output.content : [];
    for (const entry of content) {
      if (entry?.type === 'output_text' && typeof entry.text === 'string') {
        chunks.push(entry.text);
      }
    }
  }
  return chunks.join('\n').trim();
}

function parseBase64DataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;,]+)?(?:;[^,]+)?;base64,(.+)$/i);
  if (!match) {
    return null;
  }

  return {
    mimeType: match[1] || 'application/octet-stream',
    buffer: Buffer.from(match[2], 'base64')
  };
}

async function optimizeAdminBannerToWebp(inputBuffer, variant = 'desktop', options = {}) {
  const renderSize = getAdminBannerRenderSize(variant);
  const normalizedVariant = normalizeAdminBannerVariant(variant) || 'desktop';
  const offsetX = normalizeAdminBannerOffset(options?.offsetX);
  const offsetY = normalizeAdminBannerOffset(options?.offsetY);
  const sizeAdjustPx = normalizeAdminBannerSizeAdjust(options?.sizeAdjustPx);
  const placedWidth = Math.max(64, Math.min(6000, renderSize.width + sizeAdjustPx));
  const placedHeight = Math.max(64, Math.min(6000, renderSize.height + sizeAdjustPx));

  const placedImageBuffer = await sharp(inputBuffer, { failOn: 'none', animated: false })
    .rotate()
    .resize(placedWidth, placedHeight, {
      fit: 'contain',
      position: 'centre',
      withoutEnlargement: false,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();

  const left = Math.round((renderSize.width - placedWidth) / 2 + offsetX);
  const top = Math.round((renderSize.height - placedHeight) / 2 + offsetY);
  const intersectionLeft = Math.max(0, left);
  const intersectionTop = Math.max(0, top);
  const intersectionRight = Math.min(renderSize.width, left + placedWidth);
  const intersectionBottom = Math.min(renderSize.height, top + placedHeight);
  const intersectionWidth = Math.max(0, intersectionRight - intersectionLeft);
  const intersectionHeight = Math.max(0, intersectionBottom - intersectionTop);

  const compositeList = [];
  if (intersectionWidth > 0 && intersectionHeight > 0) {
    const sourceLeft = Math.max(0, intersectionLeft - left);
    const sourceTop = Math.max(0, intersectionTop - top);
    const visiblePlacedBuffer = await sharp(placedImageBuffer)
      .extract({
        left: sourceLeft,
        top: sourceTop,
        width: intersectionWidth,
        height: intersectionHeight
      })
      .toBuffer();

    compositeList.push({
      input: visiblePlacedBuffer,
      left: intersectionLeft,
      top: intersectionTop
    });
  }

  const pipeline = sharp({
    create: {
      width: renderSize.width,
      height: renderSize.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(compositeList)
    .flatten({ background: { r: 14, g: 44, b: 85 } })
    .webp({
      quality: normalizedVariant === 'mobile' ? 74 : 76,
      effort: 5,
      smartSubsample: true
    });

  return pipeline.toBuffer();
}

function extensionFromMimeType(mimeType) {
  const normalized = String(mimeType || '').toLowerCase();
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg';
  if (normalized.includes('webp')) return 'webp';
  if (normalized.includes('gif')) return 'gif';
  if (normalized.includes('webm')) return 'webm';
  if (normalized.includes('ogg')) return 'ogg';
  if (normalized.includes('wav')) return 'wav';
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'mp3';
  if (normalized.includes('mp4')) return 'mp4';
  return 'webm';
}

function getR2SigningKey(secretAccessKey, dateStamp) {
  const dateKey = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmacSha256(dateKey, R2_REGION);
  const serviceKey = hmacSha256(regionKey, 's3');
  return hmacSha256(serviceKey, 'aws4_request');
}

function toAmzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function decodeXmlText(value = '') {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function buildCanonicalQueryString(queryParams = {}) {
  return Object.entries(queryParams)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(String(value))}`)
    .join('&');
}

function buildR2SignedRequest(method, pathName, queryParams = {}, options = {}) {
  const endpoint = new URL(R2_ENDPOINT);
  const amzDate = toAmzDate();
  const dateStamp = amzDate.slice(0, 8);
  const canonicalQueryString = buildCanonicalQueryString(queryParams);
  const payloadHash = typeof options.payloadHash === 'string' && options.payloadHash
    ? options.payloadHash
    : EMPTY_R2_PAYLOAD_HASH;
  const extraHeaders = options.extraHeaders && typeof options.extraHeaders === 'object'
    ? Object.fromEntries(
      Object.entries(options.extraHeaders)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => [String(key).toLowerCase(), String(value).trim()])
    )
    : {};
  const headers = {
    host: endpoint.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    ...extraHeaders
  };
  const canonicalHeaders = Object.entries(headers)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join('\n');
  const signedHeaders = Object.keys(headers)
    .sort((left, right) => left.localeCompare(right))
    .join(';');
  const canonicalRequest = [
    method,
    pathName,
    canonicalQueryString,
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash
  ].join('\n');
  const credentialScope = `${dateStamp}/${R2_REGION}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join('\n');
  const signingKey = getR2SigningKey(R2_SECRET_ACCESS_KEY, dateStamp);
  const signature = hmacSha256(signingKey, stringToSign, 'hex');
  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`
  ].join(', ');
  const url = `${endpoint.origin}${pathName}${canonicalQueryString ? `?${canonicalQueryString}` : ''}`;

  return {
    url,
    headers: { ...headers, authorization }
  };
}

async function requestR2(method, pathName, queryParams = {}) {
  const request = buildR2SignedRequest(method, pathName, queryParams);
  try {
    const response = await fetch(request.url, {
      method,
      headers: request.headers
    });

    if (!response.ok) {
      const body = await response.text();
      const error = new Error(`R2 ${method} ${pathName} falhou: ${response.status} ${response.statusText} ${body}`.trim());
      error.code = 'R2_HTTP_ERROR';
      error.status = response.status;
      error.statusText = response.statusText;
      error.body = body;
      error.requestUrl = request.url;
      error.requestMethod = method;
      error.pathName = pathName;
      error.queryParams = queryParams;
      throw error;
    }

    return response;
  } catch (error) {
    if (!error.requestUrl) error.requestUrl = request.url;
    if (!error.requestMethod) error.requestMethod = method;
    if (!error.pathName) error.pathName = pathName;
    if (!error.queryParams) error.queryParams = queryParams;
    throw error;
  }
}

async function putR2Object(objectKey, bodyBuffer, contentType = 'application/octet-stream') {
  const payloadBuffer = Buffer.isBuffer(bodyBuffer) ? bodyBuffer : Buffer.from(bodyBuffer || []);
  try {
    await getR2Client().send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
      Body: payloadBuffer,
      ContentType: contentType
    }));
    return true;
  } catch (error) {
    const details = error?.message || error?.Code || String(error);
    throw new Error(`R2 PUT ${objectKey} falhou: ${details}`.trim());
  }
}

function safeZipObjectName(name, fallback = 'playtalk-levels.zip') {
  const normalized = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  const finalName = normalized.toLowerCase().endsWith('.zip')
    ? normalized
    : `${normalized || fallback.replace(/\.zip$/i, '')}.zip`;
  return finalName || fallback;
}

function levelPhaseCodeFromMode(mode) {
  if (mode === 'movies') return '011';
  if (mode === 'scenes') return '012';
  return '001';
}

function levelPhaseFolderFromPhaseNumber(phaseNumber) {
  if (phaseNumber === 11) return '011';
  if (phaseNumber === 12) return '012';
  return '001';
}

function parseR2ObjectKeys(xmlText) {
  const matches = [...String(xmlText || '').matchAll(/<Key>([\s\S]*?)<\/Key>/g)];
  return matches.map(match => decodeXmlText(match[1]));
}

function extractR2XmlTag(xmlText, tagName) {
  const match = String(xmlText || '').match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? decodeXmlText(match[1]) : '';
}

function parseR2ListResponse(xmlText) {
  return {
    keys: parseR2ObjectKeys(xmlText),
    isTruncated: /<IsTruncated>true<\/IsTruncated>/i.test(String(xmlText || '')),
    nextContinuationToken: extractR2XmlTag(xmlText, 'NextContinuationToken')
  };
}

function contentTypeFromObjectKey(objectKey) {
  const extension = path.extname(String(objectKey || '')).toLowerCase();

  if (SUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
    if (extension === '.svg') return 'image/svg+xml';
    if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
    return `image/${extension.slice(1)}`;
  }

  if (SUPPORTED_AUDIO_EXTENSIONS.has(extension)) {
    if (extension === '.mp3') return 'audio/mpeg';
    if (extension === '.oga') return 'audio/ogg';
    return `audio/${extension.slice(1)}`;
  }

  if (SUPPORTED_VIDEO_EXTENSIONS.has(extension)) {
    if (extension === '.ogv') return 'video/ogg';
    if (extension === '.mov') return 'video/quicktime';
    if (extension === '.m4v') return 'video/x-m4v';
    return `video/${extension.slice(1)}`;
  }

  if (extension === '.json') return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

async function deleteR2Object(objectKey) {
  try {
    await getR2Client().send(new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey
    }));
  } catch (error) {
    const status = Number(error?.$metadata?.httpStatusCode || 0);
    if (status !== 404 && error?.Code !== 'NoSuchKey') {
      const details = error?.message || error?.Code || String(error);
      throw new Error(`R2 DELETE ${objectKey} falhou: ${details}`.trim());
    }
  }
}

async function deleteR2Prefix(prefix) {
  const objectKeys = await listAllR2ObjectKeys(prefix);
  for (const objectKey of objectKeys) {
    await deleteR2Object(objectKey);
  }
  return objectKeys.length;
}

function encodePublicUrlPath(pathValue) {
  return String(pathValue || '')
    .split('/')
    .filter(segment => segment !== '')
    .map(segment => encodeURIComponent(segment))
    .join('/');
}

function buildFlashcardsR2PublicUrl(objectKey) {
  return `${FLASHCARDS_R2_PUBLIC_ROOT}/${encodePublicUrlPath(objectKey)}`;
}

function getR2ObjectKeyFromPublicUrl(rawUrl) {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';
  try {
    const parsedUrl = new URL(trimmed);
    const publicRootUrl = new URL(`${FLASHCARDS_R2_PUBLIC_ROOT}/`);
    if (parsedUrl.origin !== publicRootUrl.origin) return '';
    const normalizedPublicBasePath = publicRootUrl.pathname.replace(/\/+$/g, '');
    const targetPath = parsedUrl.pathname || '';
    if (!targetPath.startsWith(normalizedPublicBasePath)) return '';
    const relativePath = targetPath.slice(normalizedPublicBasePath.length).replace(/^\/+/g, '');
    return relativePath
      .split('/')
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment))
      .join('/');
  } catch (_error) {
    return '';
  }
}

function getFlashcardPlaceholderImageUrl() {
  return buildFlashcardsR2PublicUrl(FLASHCARD_CAMERA_OBJECT_KEY);
}

function isFlashcardPlaceholderImageValue(rawValue) {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed) return false;
  if (trimmed === FLASHCARD_CAMERA_OBJECT_KEY) return true;
  if (trimmed === getFlashcardPlaceholderImageUrl()) return true;
  const extractedObjectKey = tryExtractFlashcardsR2ObjectKey(trimmed);
  return extractedObjectKey === FLASHCARD_CAMERA_OBJECT_KEY;
}

function isFlashcardMagicImageSlotValue(rawValue) {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed) return true;
  return isFlashcardPlaceholderImageValue(trimmed);
}

function normalizeFlashcardImageSource(rawValue) {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsedUrl = new URL(trimmed);
      return String(parsedUrl.pathname || '').replace(/^\/+/g, '');
    } catch (_error) {
      return trimmed.replace(/^\/+/g, '');
    }
  }
  return trimmed.replace(/^\/+/g, '');
}

function buildMagicFlashcardImagePrompt(target) {
  const english = String(target?.english || '').trim();
  const portuguese = String(target?.portuguese || '').trim();
  const deckTitle = String(target?.deckTitle || '').trim();
  const literalText = english || portuguese || deckTitle || 'flashcard';
  const bilingualHint = english && portuguese
    ? ` (${portuguese} in Portuguese)`
    : '';
  return [
    'Create a photorealistic image for a language-learning app.',
    `Represent the sentence directly and literally: "${literalText}"${bilingualHint}.`,
    deckTitle ? `Deck context: "${deckTitle}".` : '',
    'Real-life scene, realistic textures, believable materials, natural lighting, adult people only when people are needed, no children, no text, no letters, no captions.',
    'Square composition, simple background, direct and easy to understand at a glance.'
  ].filter(Boolean).join(' ');
}

function normalizeFlashcardsDeckSegment(value, fallback = 'deck') {
  const cleaned = String(value || '')
    .replace(/[\\\/]+/g, '-')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

function sanitizeFlashcardsFileBase(value, fallback = 'deck') {
  const cleaned = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\\/]+/g, '-')
    .replace(/[^a-zA-Z0-9 _.-]+/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_\-. ]+|[_\-. ]+$/g, '')
    .trim();
  return cleaned || fallback;
}

function normalizeFlashcardsItemFileStem(deckTitle, index) {
  return `${sanitizeFlashcardsFileBase(deckTitle, 'deck')}_${String(index + 1).padStart(3, '0')}`;
}

function buildFlashcardsRemoteDeckInfo(payload, fallbackName = 'deck.json') {
  const deckTitle = typeof payload?.title === 'string' && payload.title.trim()
    ? payload.title.trim()
    : path.posix.basename(String(fallbackName || 'deck.json'), path.extname(String(fallbackName || 'deck.json'))) || 'Deck';
  const deckFolder = normalizeFlashcardsDeckSegment(deckTitle, 'Deck');
  return {
    deckTitle,
    deckFolder,
    deckPrefix: `${FLASHCARDS_R2_PREFIX}/${deckFolder}`,
    jsonFolder: `${FLASHCARDS_R2_PREFIX}/${deckFolder}/json`,
    audioFolder: `${FLASHCARDS_R2_PREFIX}/${deckFolder}/audio`,
    imagesFolder: `${FLASHCARDS_R2_PREFIX}/${deckFolder}/imagens`,
    jsonFileName: `${deckFolder}.json`
  };
}

function tryExtractFlashcardsR2ObjectKey(rawValue) {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return String(parsed.pathname || '').replace(/^\/+/, '');
    } catch (_error) {
      return '';
    }
  }

  const proxyMatch = trimmed.match(/^\/?api\/r2-media\/(.+)$/i);
  if (proxyMatch) {
    return String(proxyMatch[1] || '').replace(/^\/+/, '');
  }

  return '';
}

async function fetchGenericRemoteBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar asset remoto: ${response.status} ${response.statusText}`);
  }
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') || ''
  };
}

async function readFlashcardAssetBuffer(assetValue) {
  const rawValue = String(assetValue || '').trim();
  if (!rawValue) return null;

  const r2ObjectKey = tryExtractFlashcardsR2ObjectKey(rawValue);
  if (r2ObjectKey) {
    return {
      buffer: await fetchR2ObjectBuffer(r2ObjectKey),
      contentType: contentTypeFromObjectKey(r2ObjectKey)
    };
  }

  if (/^https?:\/\//i.test(rawValue)) {
    return fetchGenericRemoteBuffer(rawValue);
  }

  const normalizedRelativePath = normalizeMirroredRelativePath(rawValue);
  if (!normalizedRelativePath) return null;

  const absolutePath = normalizedRelativePath.startsWith('Niveis/')
    ? path.join(__dirname, normalizedRelativePath)
    : path.join(__dirname, 'www', normalizedRelativePath);

  const buffer = await fs.promises.readFile(absolutePath);
  return {
    buffer,
    contentType: contentTypeFromObjectKey(absolutePath)
  };
}

function normalizeFlashcardManifestEntrySortKey(entry) {
  return String(entry?.title || entry?.name || entry?.source || '').trim().toLowerCase();
}

function upsertFlashcardsManifestEntry(files, nextEntry) {
  const safeFiles = Array.isArray(files) ? files.slice() : [];
  const sourceKey = String(nextEntry?.source || '').trim().toLowerCase();
  const filtered = safeFiles.filter((entry) => {
    const entrySource = String(entry?.source || '').trim().toLowerCase();
    if (sourceKey && entrySource) {
      return entrySource !== sourceKey;
    }
    return String(entry?.path || '').trim() !== String(nextEntry?.path || '').trim();
  });
  filtered.push(nextEntry);
  filtered.sort((left, right) => normalizeFlashcardManifestEntrySortKey(left).localeCompare(
    normalizeFlashcardManifestEntrySortKey(right),
    'pt-BR',
    { sensitivity: 'base', numeric: true }
  ));
  return filtered;
}

function normalizeMirroredRelativePath(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .trim();
}

function normalizeLevelFolderKey(value) {
  const normalized = String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return normalized || '1';
}

function buildMirroredWriteTargets(relativePath) {
  const normalized = normalizeMirroredRelativePath(relativePath);
  if (!normalized) return [];

  const roots = normalized.startsWith('Niveis/')
    ? ['', 'www', 'public', 'dist']
    : ['www', 'public', 'dist'];

  return [...new Set(roots.map((root) => (
    root ? path.join(__dirname, root, normalized) : path.join(__dirname, normalized)
  )))];
}

function canonicalReadPathForRelativePath(relativePath) {
  const normalized = normalizeMirroredRelativePath(relativePath);
  if (!normalized) {
    throw new Error('Caminho relativo vazio.');
  }
  return normalized.startsWith('Niveis/')
    ? path.join(__dirname, normalized)
    : path.join(__dirname, 'www', normalized);
}

async function writeMirroredFile(relativePath, contents, encoding = 'utf8') {
  const targets = buildMirroredWriteTargets(relativePath);
  for (const target of targets) {
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    if (Buffer.isBuffer(contents)) {
      await fs.promises.writeFile(target, contents);
    } else {
      await fs.promises.writeFile(target, contents, encoding);
    }
  }
}

async function removeMirroredDirectory(relativePath) {
  const targets = buildMirroredWriteTargets(relativePath);
  await Promise.all(targets.map((target) => fs.promises.rm(target, { recursive: true, force: true })));
}

async function readJsonFromRelativePath(relativePath) {
  const raw = (await fs.promises.readFile(canonicalReadPathForRelativePath(relativePath), 'utf8')).replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

async function writeJsonToRelativePath(relativePath, payload) {
  await writeMirroredFile(
    relativePath,
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8'
  );
}

function extractLocalLevelDayNumber(fileName) {
  const match = String(fileName || '').match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

async function collectLocalLevelManifestEntries() {
  const files = [];

  for (const folder of LOCAL_LEVEL_ALLOWED_FOLDERS) {
    const folderPath = path.join(LOCAL_LEVELS_ROOT, folder);
    let entries = [];

    try {
      entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    entries
      .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.json')
      .forEach((entry) => {
        files.push({
          folder,
          name: entry.name,
          day: extractLocalLevelDayNumber(entry.name),
          path: `Niveis/${folder}/${entry.name}`.replace(/\\/g, '/')
        });
      });
  }

  return files.sort((left, right) => {
    if (left.folder !== right.folder) {
      return left.folder.localeCompare(right.folder, 'pt-BR');
    }
    const leftDay = Number.isFinite(left.day) ? left.day : Number.MAX_SAFE_INTEGER;
    const rightDay = Number.isFinite(right.day) ? right.day : Number.MAX_SAFE_INTEGER;
    if (leftDay !== rightDay) {
      return leftDay - rightDay;
    }
    return left.name.localeCompare(right.name, 'pt-BR');
  });
}

async function refreshLocalLevelManifestMirror() {
  const files = await collectLocalLevelManifestEntries();
  await writeMirroredFile(
    LOCAL_LEVEL_MANIFEST_RELATIVE_PATH,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), files }, null, 2)}\n`,
    'utf8'
  );
  return files;
}

async function collectBuiltinFlashcardManifestEntries() {
  const rootPath = canonicalReadPathForRelativePath(FLASHCARD_DATA_RELATIVE_ROOT);
  const entries = [];

  async function walk(directoryPath) {
    let dirEntries = [];
    try {
      dirEntries = await fs.promises.readdir(directoryPath, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }

    for (const entry of dirEntries) {
      const fullPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.json') {
        continue;
      }
      if (entry.name.toLowerCase() === 'manifest.json') {
        continue;
      }

      const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, '/');
      const normalizedRelativeJsonPath = path.posix.join(FLASHCARD_DATA_RELATIVE_ROOT, relativePath);
      let payload = null;
      let count = 0;
      let title = path.posix.basename(relativePath);
      try {
        payload = await readJsonFromRelativePath(normalizedRelativeJsonPath);
        count = getFlashcardPayloadItems(payload).length;
        title = typeof payload?.title === 'string' && payload.title.trim()
          ? payload.title.trim()
          : title;
      } catch (_error) {
        payload = null;
      }

      const normalizedDir = path.posix.dirname(relativePath);
      const slug = normalizedDir !== '.'
        ? normalizedDir.split('/')[0]
        : safeGeneratedBase(path.posix.basename(relativePath, '.json'), 'deck');

      entries.push({
        name: path.posix.basename(relativePath),
        title,
        slug,
        source: normalizedRelativeJsonPath,
        path: `/${normalizedRelativeJsonPath}`,
        size: (await fs.promises.stat(fullPath)).size,
        count
      });
    }
  }

  await walk(rootPath);

  return entries.sort((left, right) => left.title.localeCompare(right.title, 'pt-BR', {
    sensitivity: 'base',
    numeric: true
  }));
}

function buildLocalFlashcardSourceKey(fileName) {
  const normalizedFileName = normalizePublicFlashcardDeckFileName(fileName, '');
  if (!normalizedFileName) return '';
  return `allcards/${normalizedFileName}`.toLowerCase();
}

async function readLocalFlashcardVisibilityState() {
  try {
    const raw = (await fs.promises.readFile(LOCAL_FLASHCARD_VISIBILITY_STATE_PATH, 'utf8')).replace(/^\uFEFF/, '');
    const payload = JSON.parse(raw);
    const hiddenSources = Array.isArray(payload?.hiddenSources)
      ? payload.hiddenSources
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean)
      : [];
    return { hiddenSources: new Set(hiddenSources) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { hiddenSources: new Set() };
    }
    throw error;
  }
}

async function writeLocalFlashcardVisibilityState(hiddenSources) {
  const normalizedHiddenSources = Array.from(hiddenSources || [])
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base', numeric: true }));
  await fs.promises.mkdir(path.dirname(LOCAL_FLASHCARD_VISIBILITY_STATE_PATH), { recursive: true });
  await fs.promises.writeFile(
    LOCAL_FLASHCARD_VISIBILITY_STATE_PATH,
    `${JSON.stringify({ hiddenSources: normalizedHiddenSources }, null, 2)}\n`,
    'utf8'
  );
}

async function setLocalFlashcardDeckHiddenState(fileName, hidden) {
  const sourceKey = buildLocalFlashcardSourceKey(fileName);
  if (!sourceKey) return false;
  const visibilityState = await readLocalFlashcardVisibilityState();
  if (hidden) {
    visibilityState.hiddenSources.add(sourceKey);
  } else {
    visibilityState.hiddenSources.delete(sourceKey);
  }
  await writeLocalFlashcardVisibilityState(visibilityState.hiddenSources);
  return true;
}

async function collectLegacyManifestEntriesFromRoot(rootPath, originType = 'allcards', hiddenSources = new Set()) {
  let dirEntries = [];
  try {
    dirEntries = await fs.promises.readdir(rootPath, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const entries = [];
  for (const entry of dirEntries) {
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.json') {
      continue;
    }

    const filePath = path.join(rootPath, entry.name);
    let title = entry.name;
    let count = 0;

    try {
      const raw = (await fs.promises.readFile(filePath, 'utf8')).replace(/^\uFEFF/, '');
      const payload = JSON.parse(raw);
      title = typeof payload?.title === 'string' && payload.title.trim()
        ? payload.title.trim()
        : title;
      count = getFlashcardPayloadItems(payload).length;
    } catch (_error) {
      // keep fallback metadata when a deck cannot be parsed here
    }

    entries.push({
      name: entry.name,
      title,
      source: `allcards/${entry.name}`,
      path: `/allcards/${encodeURIComponent(entry.name)}`,
      size: (await fs.promises.stat(filePath)).size,
      count,
      originType,
      canDelete: false,
      isHidden: hiddenSources.has(buildLocalFlashcardSourceKey(entry.name))
    });
  }

  return entries;
}

async function collectAllcardsManifestEntries() {
  const visibilityState = await readLocalFlashcardVisibilityState();
  const allcardsEntries = await collectLegacyManifestEntriesFromRoot(
    ALLCARDS_ROOT,
    'allcards',
    visibilityState.hiddenSources
  );

  const mergedBySource = new Map();
  allcardsEntries.forEach((entry) => {
    const sourceKey = String(entry?.source || '').trim().toLowerCase();
    if (!sourceKey || mergedBySource.has(sourceKey)) return;
    mergedBySource.set(sourceKey, entry);
  });

  return Array.from(mergedBySource.values()).sort((left, right) => left.title.localeCompare(right.title, 'pt-BR', {
    sensitivity: 'base',
    numeric: true
  }));
}

async function collectLegacyDefaultPublicDeckIdentifiers() {
  let dirEntries = [];
  try {
    dirEntries = await fs.promises.readdir(LEGACY_FLASHCARDS_ROOT, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { fileNames: new Set(), dayKeys: new Set() };
    }
    throw error;
  }

  const fileNames = new Set();
  const dayKeys = new Set();
  for (const entry of dirEntries) {
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.json') {
      continue;
    }

    const normalizedFileName = normalizePublicFlashcardDeckFileName(entry.name, '');
    if (!normalizedFileName) continue;
    fileNames.add(normalizedFileName);

    const inferredDayKey = inferUploadedLevelsDayKey(normalizedFileName);
    if (!inferredDayKey) continue;
    dayKeys.add(inferredDayKey);
    fileNames.add(buildPublicLevelsFlashcardDeckFileName(inferredDayKey));
  }

  return { fileNames, dayKeys };
}

async function findLocalFlashcardDeckRecordByFileName(fileName) {
  const normalizedFileName = normalizePublicFlashcardDeckFileName(fileName, '');
  if (!normalizedFileName) return null;

  const visibilityState = await readLocalFlashcardVisibilityState();
  const candidates = [
    { rootPath: ALLCARDS_ROOT, originType: 'allcards' },
    { rootPath: LEGACY_FLASHCARDS_ROOT, originType: 'legacy' }
  ];

  for (const candidate of candidates) {
    const filePath = path.join(candidate.rootPath, normalizedFileName);
    try {
      const stat = await fs.promises.stat(filePath);
      if (!stat.isFile()) continue;

      let title = normalizedFileName;
      let count = 0;
      try {
        const raw = (await fs.promises.readFile(filePath, 'utf8')).replace(/^\uFEFF/, '');
        const payload = JSON.parse(raw);
        title = typeof payload?.title === 'string' && payload.title.trim()
          ? payload.title.trim()
          : title;
        count = getFlashcardPayloadItems(payload).length;
      } catch (_error) {
        // keep fallback metadata when the file cannot be parsed here
      }

      return {
        filePath,
        deck: {
          name: normalizedFileName,
          title,
          source: `allcards/${normalizedFileName}`,
          path: `/allcards/${encodeURIComponent(normalizedFileName)}`,
          size: stat.size,
          count,
          originType: candidate.originType,
          canDelete: false,
          isHidden: visibilityState.hiddenSources.has(buildLocalFlashcardSourceKey(normalizedFileName))
        }
      };
    } catch (_error) {
      // try next root
    }
  }

  return null;
}

function buildPublicLevelsFlashcardDeckFileName(dayKey) {
  const normalizedDayKey = normalizeLevelFolderKey(dayKey) || '1';
  return `levels-day-${safeGeneratedBase(normalizedDayKey, '1')}.json`;
}

function normalizePublicFlashcardDeckFileName(fileName, fallback = 'deck.json') {
  const safeFileName = path.posix.basename(String(fileName || '').trim()) || fallback;
  return safeFileName.toLowerCase().endsWith('.json') ? safeFileName : `${safeFileName}.json`;
}

function buildPublicFlashcardDeckManifestEntryFromRow(row) {
  const fileName = normalizePublicFlashcardDeckFileName(row?.file_name, 'deck.json');
  if (!fileName || path.extname(fileName).toLowerCase() !== '.json') {
    return null;
  }

  const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {};
  const coverImage = typeof payload?.coverImage === 'string' ? payload.coverImage.trim() : '';
  const title = String(row?.title || '').trim()
    || String(payload?.title || '').trim()
    || fileName;
  const fallbackCount = getFlashcardPayloadItems(payload).length;
  const count = Number.isInteger(Number(row?.item_count))
    ? Math.max(0, Number(row.item_count))
    : fallbackCount;
  const slug = path.posix.basename(fileName, '.json');
  const originType = String(row?.source || '').trim() || 'levels';
  const rawDayKey = String(row?.day_key || '').trim();
  const dayKey = rawDayKey ? normalizeLevelFolderKey(rawDayKey) : '';
  const canDelete = originType !== 'allcards';

  return {
    name: fileName,
    title,
    slug,
    source: `allcards/${fileName}`,
    path: `/allcards/${encodeURIComponent(fileName)}`,
    size: Buffer.byteLength(JSON.stringify(payload), 'utf8'),
    count,
    coverImage,
    originType,
    dayKey,
    canDelete,
    isHidden: Boolean(row?.is_hidden),
    updatedAt: row?.updated_at || null
  };
}

async function ensurePublicFlashcardDecksTable() {
  if (!pool) return false;
  if (!publicFlashcardDecksTableReadyPromise) {
    publicFlashcardDecksTableReadyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.flashcards_public_decks (
          id bigserial PRIMARY KEY,
          deck_key text NOT NULL UNIQUE,
          file_name text NOT NULL UNIQUE,
          day_key text NOT NULL DEFAULT '',
          source text NOT NULL DEFAULT 'levels',
          title text NOT NULL DEFAULT '',
          item_count integer NOT NULL DEFAULT 0,
          payload jsonb NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS flashcards_public_decks_source_idx
        ON public.flashcards_public_decks (source, updated_at DESC)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS flashcards_public_decks_title_idx
        ON public.flashcards_public_decks (lower(title))
      `);
      await pool.query(`
        ALTER TABLE public.flashcards_public_decks
        ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false
      `);
      await pool.query(`
        ALTER TABLE public.flashcards_public_decks
        ADD COLUMN IF NOT EXISTS hidden_at timestamptz
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS flashcards_public_decks_hidden_idx
        ON public.flashcards_public_decks (is_hidden, updated_at DESC)
      `);
    })().catch((error) => {
      publicFlashcardDecksTableReadyPromise = null;
      throw error;
    });
  }
  await publicFlashcardDecksTableReadyPromise;
  return true;
}

async function upsertPublicFlashcardDeck({
  deckKey,
  fileName,
  dayKey = '',
  source = 'levels',
  title = '',
  payload,
  publishVisible = false
}) {
  if (!pool) return null;
  await ensurePublicFlashcardDecksTable();

  const normalizedDeckKey = String(deckKey || '').trim();
  const normalizedFileName = normalizePublicFlashcardDeckFileName(fileName, 'deck.json');
  const normalizedDayKey = normalizeLevelFolderKey(dayKey);
  const normalizedSource = String(source || '').trim() || 'levels';
  const normalizedPayload = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload
    : { title: String(title || '').trim() || path.posix.basename(normalizedFileName, '.json'), coverImage: '', items: [] };
  const normalizedTitle = String(title || '').trim()
    || String(normalizedPayload?.title || '').trim()
    || path.posix.basename(normalizedFileName, '.json');
  const itemCount = getFlashcardPayloadItems(normalizedPayload).length;

  if (!normalizedDeckKey) {
    const error = new Error('Chave do deck nao informada para persistencia no Postgres.');
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
      `INSERT INTO public.flashcards_public_decks (
       deck_key,
       file_name,
       day_key,
       source,
       title,
       item_count,
       payload,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, now())
     ON CONFLICT (file_name) DO UPDATE
     SET
       deck_key = EXCLUDED.deck_key,
       file_name = EXCLUDED.file_name,
       day_key = EXCLUDED.day_key,
       source = EXCLUDED.source,
       title = EXCLUDED.title,
       item_count = EXCLUDED.item_count,
       payload = EXCLUDED.payload,
       is_hidden = CASE WHEN $8 THEN false ELSE public.flashcards_public_decks.is_hidden END,
       hidden_at = CASE WHEN $8 THEN NULL ELSE public.flashcards_public_decks.hidden_at END,
       updated_at = now()
     RETURNING file_name, day_key, source, title, item_count, payload, is_hidden, updated_at`,
    [
      normalizedDeckKey,
      normalizedFileName,
      normalizedDayKey || '',
      normalizedSource,
      normalizedTitle,
      itemCount,
      JSON.stringify(normalizedPayload),
      publishVisible === true
    ]
  );

  return buildPublicFlashcardDeckManifestEntryFromRow(result.rows[0] || null);
}

async function upsertPublicFlashcardDeckFromLevels(dayKey, payload) {
  if (!pool) return null;

  const normalizedDayKey = normalizeLevelFolderKey(dayKey);
  if (!normalizedDayKey) {
    const error = new Error('Pasta invalida para publicar deck no Postgres.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedPayload = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload
    : { title: `Flashcard ${normalizedDayKey}`, coverImage: '', items: [] };
  const title = typeof normalizedPayload?.title === 'string' && normalizedPayload.title.trim()
    ? normalizedPayload.title.trim()
    : `Flashcard ${normalizedDayKey}`;
  const fileName = buildPublicLevelsFlashcardDeckFileName(normalizedDayKey);
  const deckKey = `levels:${safeGeneratedBase(normalizedDayKey, '1')}`;

  return upsertPublicFlashcardDeck({
    deckKey,
    fileName,
    dayKey: normalizedDayKey,
    source: 'levels',
    title,
    payload: normalizedPayload,
    publishVisible: true
  });
}

function normalizeUploadedPublicDeckPayload(fileName, payload) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload;
  }

  const title = path.posix.basename(String(fileName || 'deck.json'), '.json') || 'Deck';
  return {
    title,
    coverImage: '',
    items: Array.isArray(payload) ? payload : []
  };
}

function inferUploadedLevelsDayKey(fileName) {
  const baseName = path.posix.basename(String(fileName || '').trim(), path.extname(String(fileName || '').trim()));
  if (!baseName) return '';

  const patterns = [
    /^niveis_([^_]+)_\d+_.+$/i,
    /^levels-day-(.+)$/i,
    /^day-(.+)$/i
  ];

  for (const pattern of patterns) {
    const match = baseName.match(pattern);
    const candidate = normalizeLevelFolderKey(match?.[1] || '');
    if (candidate) {
      return candidate;
    }
  }

  return '';
}

async function upsertPublicFlashcardDeckFromUploadedJson(fileName, payload) {
  if (!pool) return null;

  const normalizedFileName = normalizePublicFlashcardDeckFileName(fileName, 'deck.json');
  const normalizedPayload = normalizeUploadedPublicDeckPayload(normalizedFileName, payload);

  const title = String(normalizedPayload?.title || '').trim()
    || path.posix.basename(normalizedFileName, '.json')
    || 'Deck';

  return upsertPublicFlashcardDeck({
    deckKey: `admin-upload:${encodeURIComponent(normalizedFileName.toLowerCase())}`,
    fileName: normalizedFileName,
    dayKey: '',
    source: 'admin-upload',
    title,
    payload: normalizedPayload,
    publishVisible: true
  });
}

async function seedPublicFlashcardDecksFromAllcards(options = {}) {
  if (!pool) return { total: 0, seeded: 0 };
  const force = options?.force === true;

  if (!force && publicFlashcardDecksSeedPromise) {
    return publicFlashcardDecksSeedPromise;
  }

  const task = (async () => {
    await ensurePublicFlashcardDecksTable();
    const localEntries = await collectAllcardsManifestEntries();
    let seeded = 0;

    for (const entry of localEntries) {
      const fileName = normalizePublicFlashcardDeckFileName(entry?.name, 'deck.json');
      const absolutePath = path.join(ALLCARDS_ROOT, fileName);
      let payload = null;
      try {
        const raw = (await fs.promises.readFile(absolutePath, 'utf8')).replace(/^\uFEFF/, '');
        payload = JSON.parse(raw);
      } catch (_error) {
        continue;
      }

      const deckKey = `allcards:${encodeURIComponent(fileName.toLowerCase())}`;
      const title = typeof payload?.title === 'string' && payload.title.trim()
        ? payload.title.trim()
        : path.posix.basename(fileName, '.json');
      const itemCount = getFlashcardPayloadItems(payload).length;

      // Important: do not overwrite existing Postgres payload/media links during seed.
      // Seed from /allcards should only create missing rows.
      const insertResult = await pool.query(
        `INSERT INTO public.flashcards_public_decks (
           deck_key,
           file_name,
           day_key,
           source,
           title,
           item_count,
           payload,
           updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, now())
         ON CONFLICT (deck_key) DO NOTHING
         RETURNING id`,
        [
          deckKey,
          fileName,
          '',
          'allcards',
          title,
          itemCount,
          JSON.stringify(payload)
        ]
      );
      if (insertResult.rows.length) {
        seeded += 1;
      }
    }

    return {
      total: localEntries.length,
      seeded
    };
  })();

  publicFlashcardDecksSeedPromise = task.catch((error) => {
    publicFlashcardDecksSeedPromise = null;
    throw error;
  });

  const result = await publicFlashcardDecksSeedPromise;
  if (force) {
    publicFlashcardDecksSeedPromise = null;
  }
  return result;
}

async function collectPostgresFlashcardManifestEntries() {
  if (!pool) return [];
  try {
    await ensurePublicFlashcardDecksTable();
    const legacyDefaults = await collectLegacyDefaultPublicDeckIdentifiers();

    const result = await pool.query(
      `SELECT file_name, day_key, source, title, item_count, payload, is_hidden, updated_at
       FROM public.flashcards_public_decks
       ORDER BY lower(title) ASC, updated_at DESC`
    );

    return result.rows
      .filter((row) => {
        const source = String(row?.source || '').trim();
        if (source === 'allcards') {
          return false;
        }

        if (source === 'levels') {
          const normalizedFileName = normalizePublicFlashcardDeckFileName(row?.file_name, '');
          const normalizedDayKey = normalizeLevelFolderKey(row?.day_key || '');
          if (legacyDefaults.fileNames.has(normalizedFileName) || legacyDefaults.dayKeys.has(normalizedDayKey)) {
            return false;
          }
        }

        return true;
      })
      .map((row) => buildPublicFlashcardDeckManifestEntryFromRow(row))
      .filter(Boolean);
  } catch (error) {
    console.error('Erro ao carregar decks publicos no Postgres:', error);
    return [];
  }
}

async function findPostgresFlashcardDeckPayloadByFileName(fileName) {
  if (!pool) return null;
  await ensurePublicFlashcardDecksTable();

  const normalizedFileName = path.posix.basename(String(fileName || '').trim());
  if (!normalizedFileName || path.extname(normalizedFileName).toLowerCase() !== '.json') {
    return null;
  }

  const result = await pool.query(
    `SELECT payload
     FROM public.flashcards_public_decks
     WHERE file_name = $1
     LIMIT 1`,
    [normalizedFileName]
  );
  if (!result.rows.length) return null;

  let payload = result.rows[0]?.payload;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch (_error) {
      payload = null;
    }
  }

  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload
    : null;
}

function normalizePublicDeckSourceToFileName(sourceValue) {
  const raw = String(sourceValue || '').trim();
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      const pathName = decodeURIComponent(String(parsed.pathname || ''));
      const normalizedPath = pathName.replace(/^\/+/, '');
      if (!normalizedPath.toLowerCase().startsWith('allcards/')) return '';
      return normalizePublicFlashcardDeckFileName(path.posix.basename(normalizedPath), '');
    } catch (_error) {
      return '';
    }
  }

  const normalizedPath = raw.replace(/^\/+/, '');
  if (!normalizedPath.toLowerCase().startsWith('allcards/')) return '';
  return normalizePublicFlashcardDeckFileName(path.posix.basename(normalizedPath), '');
}

async function findPublicFlashcardDeckRowByFileName(fileName) {
  if (!pool) return null;
  await ensurePublicFlashcardDecksTable();

  const normalizedFileName = normalizePublicFlashcardDeckFileName(fileName, '');
  if (!normalizedFileName || path.extname(normalizedFileName).toLowerCase() !== '.json') {
    return null;
  }

  const result = await pool.query(
    `SELECT id, deck_key, file_name, source, title, item_count, payload, is_hidden, updated_at
     FROM public.flashcards_public_decks
     WHERE file_name = $1
     LIMIT 1`,
    [normalizedFileName]
  );

  return result.rows[0] || null;
}

function collectPublicDeckReferencedR2ObjectKeys(payload) {
  const normalizedPayload = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload
    : null;
  if (!normalizedPayload) return [];

  const objectKeys = new Set();
  const pushKey = (value) => {
    const objectKey = getR2ObjectKeyFromPublicUrl(value);
    if (objectKey) {
      objectKeys.add(objectKey);
    }
  };

  pushKey(normalizedPayload.coverImage);
  const items = getFlashcardPayloadItems(normalizedPayload);
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    pushKey(readFlashcardItemImage(item));
    pushKey(readFlashcardItemAudio(item));
  }

  return Array.from(objectKeys);
}

async function deleteUploadedPublicFlashcardDeckAssets(deckRow) {
  const summary = {
    deletedR2Objects: 0,
    removedMirrorPaths: []
  };
  const payload = deckRow?.payload && typeof deckRow.payload === 'object' ? deckRow.payload : null;
  const r2ObjectKeys = collectPublicDeckReferencedR2ObjectKeys(payload);

  for (const objectKey of r2ObjectKeys) {
    await deleteR2Object(objectKey);
    summary.deletedR2Objects += 1;
  }

  const sourceType = String(deckRow?.source || '').trim();
  const dayKey = normalizeLevelFolderKey(deckRow?.day_key || '');
  if (sourceType === 'levels' && dayKey) {
    const levelAssetRelativePath = path.posix.join(
      ADMIN_FLASHCARD_ASSET_RELATIVE_ROOT,
      'levels',
      `day-${dayKey}`
    );
    const levelJsonRelativePath = `Niveis/others/day-${dayKey}.json`;
    const mirrorPaths = [levelAssetRelativePath, levelJsonRelativePath];
    await Promise.all(mirrorPaths.map(async (relativePath) => {
      const targets = buildMirroredWriteTargets(relativePath);
      await Promise.all(targets.map((target) => fs.promises.rm(target, {
        recursive: true,
        force: true
      })));
    }));
    summary.removedMirrorPaths.push(...mirrorPaths);
    await refreshLocalLevelManifestMirror().catch(() => null);
  }

  return summary;
}

function deriveDeckCoverStorageContext(deckRow) {
  const payload = deckRow?.payload && typeof deckRow.payload === 'object' ? deckRow.payload : {};
  const fileName = normalizePublicFlashcardDeckFileName(deckRow?.file_name, 'deck.json');
  const title = String(deckRow?.title || payload?.title || path.posix.basename(fileName, '.json')).trim();
  const defaultDeckFolder = normalizeFlashcardsDeckSegment(title || path.posix.basename(fileName, '.json'), 'Deck');
  const defaultImagesFolder = `${FLASHCARDS_R2_PREFIX}/${defaultDeckFolder}/imagens`;
  const items = getFlashcardPayloadItems(payload);

  for (const item of items) {
    const imageValue = readFlashcardItemImage(item);
    const normalizedImageSource = normalizeFlashcardImageSource(imageValue);
    if (!normalizedImageSource) continue;

    const lower = normalizedImageSource.toLowerCase();
    const marker = '/imagens/';
    const markerIndex = lower.indexOf(marker);
    if (markerIndex > 0) {
      const folder = normalizedImageSource.slice(0, markerIndex + marker.length - 1).replace(/^\/+/, '');
      if (folder && folder.includes('/')) {
        return {
          imagesFolder: folder,
          coverFileName: `${sanitizeFlashcardsFileBase(title || defaultDeckFolder, defaultDeckFolder)}_cover.webp`
        };
      }
    }
  }

  return {
    imagesFolder: defaultImagesFolder,
    coverFileName: `${sanitizeFlashcardsFileBase(title || defaultDeckFolder, defaultDeckFolder)}_cover.webp`
  };
}

async function generateFlashcardDeckCoverWithOpenAi(prompt) {
  const promptText = String(prompt || '').trim();
  if (!promptText) {
    const error = new Error('Digite um prompt para gerar a capa do deck.');
    error.statusCode = 400;
    throw error;
  }
  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('fake')) {
    const error = new Error('OpenAI nao configurado.');
    error.statusCode = 503;
    error.instructions = 'Preencha OPENAI_API_KEY no .env com a chave real da OpenAI.';
    throw error;
  }

  const upstreamResponse = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt: promptText,
      size: '1024x1024',
      quality: 'medium',
      output_format: 'webp'
    })
  });

  const responseText = await upstreamResponse.text();
  let payload = null;
  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch (_error) {
    payload = null;
  }

  if (!upstreamResponse.ok) {
    const error = new Error(payload?.error?.message || responseText.slice(0, 500) || 'Falha ao gerar capa na OpenAI.');
    error.statusCode = upstreamResponse.status;
    throw error;
  }

  const image = Array.isArray(payload?.data) ? payload.data[0] : null;
  const b64 = String(image?.b64_json || '').trim();
  if (!b64) {
    const error = new Error('A OpenAI nao retornou imagem em base64 para a capa.');
    error.statusCode = 502;
    throw error;
  }

  return {
    mimeType: 'image/webp',
    buffer: Buffer.from(b64, 'base64'),
    usage: payload?.usage || null,
    model: OPENAI_IMAGE_MODEL
  };
}

function normalizeSpeakingStoryCardItem({ item, storyName = 'story', index = 0 }) {
  const source = item && typeof item === 'object' ? item : {};
  const english = String(source.en || source.english || '').trim();
  const portuguese = String(source.pt || source.portuguese || '').trim();
  const audioUrl = String(source.audio || source.audioUrl || '').trim();
  const highlight = Boolean(source.highlight);
  if (!english || !portuguese) return null;
  return {
    id: `${safeGeneratedBase(storyName, 'story')}-${index}`,
    english,
    portuguese,
    imageUrl: '',
    audio: audioUrl,
    audioUrl,
    highlight
  };
}

function normalizeSpeakingStoryLevel(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(10, parsed));
}

function toEnglishUnderscoreName(value, fallback) {
  const base = String(value || fallback || '').trim();
  if (!base) return 'Story_One';
  const collapsed = base
    .replace(/[^a-zA-Z0-9_ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!collapsed) return 'Story_One';
  return collapsed
    .split(' ')
    .filter(Boolean)
    .map((chunk) => {
      const lower = chunk.toLowerCase();
      return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
    })
    .join('_');
}

function buildMiniBookStoriesFromJsonPayload(payload, options = {}) {
  const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null;
  if (!source) {
    return {
      bookId: normalizeMiniBookId(options.bookId || ''),
      fileName: normalizeMiniBookText(options.fileName || '', `${normalizeMiniBookId(options.bookId || '')}.json`),
      bookTitle: normalizeMiniBookText(options.bookTitle || '', normalizeMiniBookId(options.bookId || 'book')),
      level: normalizeSpeakingStoryLevel(options.level),
      stories: []
    };
  }

  const bookId = normalizeMiniBookId(options.bookId || source.bookId || source.fileName || source.nome || source.title || 'book');
  const fileName = normalizeMiniBookText(source.fileName || options.fileName, `${bookId}.json`);
  const bookTitle = normalizeMiniBookText(source.nome || source.title || options.bookTitle, path.basename(fileName, '.json') || bookId);
  const level = normalizeSpeakingStoryLevel(source.nivel ?? source.level ?? options.level);
  const displayName = toEnglishUnderscoreName(bookTitle, fileName);

  const storyEntries = [];
  const consumedKeys = new Set();
  const topLevelIgnoredKeys = new Set([
    'bookId',
    'fileName',
    'nome',
    'title',
    'nivel',
    'level',
    'stories',
    'author',
    'createdAt',
    'updatedAt'
  ]);

  if (source.stories && typeof source.stories === 'object' && !Array.isArray(source.stories)) {
    Object.entries(source.stories).forEach(([rawKey, value]) => {
      storyEntries.push([rawKey, value]);
      consumedKeys.add(String(rawKey || ''));
    });
  } else if (Array.isArray(source.stories)) {
    source.stories.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') return;
      const key = String(entry.storyKey || entry.key || entry.name || entry.title || `story_${index + 1}`).trim();
      const items = Array.isArray(entry.cards) ? entry.cards : (Array.isArray(entry.items) ? entry.items : []);
      storyEntries.push([key || `story_${index + 1}`, items]);
      consumedKeys.add(key);
    });
  }

  Object.entries(source).forEach(([key, value]) => {
    if (topLevelIgnoredKeys.has(String(key))) return;
    if (consumedKeys.has(String(key))) return;
    if (!Array.isArray(value)) return;
    storyEntries.push([key, value]);
  });

  const stories = storyEntries.reduce((acc, [rawStoryKey, rawItems]) => {
    const storyKey = String(rawStoryKey || '').trim() || `story_${acc.length + 1}`;
    const items = Array.isArray(rawItems) ? rawItems : [];
    const cards = items
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null;
        const normalizedItem = {
          ...item,
          en: normalizeMiniBookText(item.en || item.english || item.text || item.sentence),
          pt: normalizeMiniBookText(item.pt || item.portuguese || item.translation, item.en || item.english || item.text || item.sentence),
          audio: normalizeMiniBookText(item.audio || item.audioUrl)
        };
        return normalizeSpeakingStoryCardItem({
          item: normalizedItem,
          storyName: `${fileName}-${storyKey}`,
          index
        });
      })
      .filter(Boolean);
    if (!cards.length) return acc;
    acc.push({
      id: `db:${bookId}::${storyKey}`,
      fileName,
      bookId,
      bookTitle,
      storyKey,
      nome: displayName,
      nivel: level,
      cards
    });
    return acc;
  }, []);

  return {
    bookId,
    fileName,
    bookTitle,
    level,
    stories
  };
}

async function loadMiniBookJsonOverrides() {
  if (!pool) return [];
  await ensureMiniBookJsonTables();
  const result = await pool.query(
    `SELECT book_id, file_name, title, level, payload
     FROM public.minibook_json_content
     ORDER BY updated_at DESC`
  );
  return Array.isArray(result.rows) ? result.rows : [];
}

async function loadEditableMiniBookSource(bookId) {
  const normalizedBookId = normalizeMiniBookId(bookId);
  if (!normalizedBookId) return null;

  if (pool) {
    await ensureMiniBookJsonTables();
    const overrideResult = await pool.query(
      `SELECT book_id, file_name, title, level, payload
       FROM public.minibook_json_content
       WHERE book_id = $1
       LIMIT 1`,
      [normalizedBookId]
    );
    const overrideRow = overrideResult.rows[0] || null;
    if (overrideRow?.payload && typeof overrideRow.payload === 'object' && !Array.isArray(overrideRow.payload)) {
      return {
        bookId: normalizedBookId,
        fileName: normalizeMiniBookText(overrideRow.file_name, `${normalizedBookId}.json`),
        title: normalizeMiniBookText(overrideRow.title, normalizedBookId),
        level: normalizeSpeakingStoryLevel(overrideRow.level),
        payload: overrideRow.payload
      };
    }
  }

  for (const root of BATTLE_STORIES_ROOT_CANDIDATES) {
    let dirEntries = [];
    try {
      dirEntries = await fs.promises.readdir(root, { withFileTypes: true });
    } catch (_error) {
      dirEntries = [];
    }

    for (const entry of dirEntries) {
      if (!entry?.isFile?.() || !entry.name.toLowerCase().endsWith('.json')) continue;
      const fileBaseName = path.basename(entry.name, '.json');
      if (normalizeMiniBookId(fileBaseName) !== normalizedBookId) continue;

      const fullPath = path.join(root, entry.name);
      const raw = (await fs.promises.readFile(fullPath, 'utf8')).replace(/^\uFEFF/, '');
      const payload = JSON.parse(raw);
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) continue;
      return {
        bookId: normalizedBookId,
        fileName: entry.name,
        title: normalizeMiniBookText(payload.nome || payload.title, fileBaseName),
        level: normalizeSpeakingStoryLevel(payload.nivel ?? payload.level),
        payload
      };
    }
  }

  return null;
}

async function findLocalSpeakingBookMetadataById(bookId) {
  const targetBookId = normalizeMiniBookId(bookId);
  if (!targetBookId) return null;

  for (const root of BATTLE_STORIES_ROOT_CANDIDATES) {
    let dirEntries = [];
    try {
      dirEntries = await fs.promises.readdir(root, { withFileTypes: true });
    } catch (_error) {
      dirEntries = [];
    }

    for (const entry of dirEntries) {
      if (!entry?.isFile?.() || !entry.name.toLowerCase().endsWith('.json')) continue;
      const fileBaseName = path.basename(entry.name, '.json');
      if (normalizeMiniBookId(fileBaseName) !== targetBookId) continue;

      try {
        const fullPath = path.join(root, entry.name);
        const raw = (await fs.promises.readFile(fullPath, 'utf8')).replace(/^\uFEFF/, '');
        const payload = JSON.parse(raw);
        const normalizedBookTitle = normalizeMiniBookText(payload?.nome, fileBaseName);
        const level = normalizeSpeakingStoryLevel(payload?.nivel);
        return {
          bookId: targetBookId,
          fileName: entry.name,
          title: normalizedBookTitle,
          level
        };
      } catch (_error) {
        return {
          bookId: targetBookId,
          fileName: entry.name,
          title: fileBaseName,
          level: 1
        };
      }
    }
  }

  return null;
}

async function loadSpeakingCardPool() {
  const now = Date.now();
  if (
    Array.isArray(speakingCardsCache.stories)
    && speakingCardsCache.stories.length
    && (now - speakingCardsCache.updatedAt) < SPEAKING_CARD_CACHE_TTL_MS
  ) {
    return speakingCardsCache.stories.map((story) => ({
      ...story,
      cards: Array.isArray(story.cards) ? story.cards.slice() : []
    }));
  }

  const fileEntries = [];
  for (const root of BATTLE_STORIES_ROOT_CANDIDATES) {
    let dirEntries = [];
    try {
      dirEntries = await fs.promises.readdir(root, { withFileTypes: true });
    } catch (_error) {
      dirEntries = [];
    }
    dirEntries
      .filter((entry) => entry && entry.isFile && entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
      .forEach((entry) => {
        fileEntries.push({
          name: entry.name,
          path: path.join(root, entry.name)
        });
      });
  }

  const localStories = [];
  const localBookMetadataById = new Map();
  for (const entry of fileEntries) {
    try {
      const raw = (await fs.promises.readFile(entry.path, 'utf8')).replace(/^\uFEFF/, '');
      const payload = JSON.parse(raw);
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        continue;
      }
      const fileBaseName = path.basename(entry.name, '.json');
      const normalizedBookTitle = normalizeMiniBookText(payload.nome, fileBaseName);
      const displayName = toEnglishUnderscoreName(normalizedBookTitle, fileBaseName);
      const bookId = normalizeMiniBookId(fileBaseName);
      const level = normalizeSpeakingStoryLevel(payload.nivel);
      localBookMetadataById.set(bookId, {
        bookId,
        fileName: entry.name,
        title: normalizedBookTitle,
        level
      });
      Object.entries(payload).forEach(([storyKey, storyValue]) => {
        const items = Array.isArray(storyValue) ? storyValue : [];
        const cards = items
          .map((item, index) => normalizeSpeakingStoryCardItem({
            item,
            storyName: `${entry.name}-${storyKey}`,
            index
          }))
          .filter(Boolean);
        if (!cards.length) return;
        const safeStoryKey = String(storyKey || '').trim() || 'story';
        localStories.push({
          id: `${entry.name}::${safeStoryKey}`,
          fileName: entry.name,
          bookId,
          bookTitle: normalizedBookTitle,
          storyKey: safeStoryKey,
          nome: displayName,
          nivel: level,
          cards
        });
      });
    } catch (_error) {
      // ignore invalid story files
    }
  }

  let stories = localStories.slice();
  if (pool) {
    try {
      const overrideRows = await loadMiniBookJsonOverrides();
      const overrideStories = [];
      const overriddenBookIds = new Set();

      overrideRows.forEach((row) => {
        const parsed = buildMiniBookStoriesFromJsonPayload(row.payload, {
          bookId: row.book_id,
          fileName: row.file_name,
          bookTitle: row.title,
          level: row.level
        });
        if (!Array.isArray(parsed.stories) || !parsed.stories.length) return;
        const localMetadata = localBookMetadataById.get(normalizeMiniBookId(parsed.bookId));
        if (localMetadata) {
          parsed.stories = parsed.stories.map((story) => ({
            ...story,
            fileName: localMetadata.fileName,
            bookTitle: localMetadata.title,
            nome: toEnglishUnderscoreName(localMetadata.title, localMetadata.fileName),
            nivel: normalizeSpeakingStoryLevel(localMetadata.level)
          }));
        }
        overriddenBookIds.add(normalizeMiniBookId(parsed.bookId));
        overrideStories.push(...parsed.stories);
      });

      if (overrideStories.length) {
        stories = localStories
          .filter((story) => !overriddenBookIds.has(normalizeMiniBookId(story.bookId || story.fileName)))
          .concat(overrideStories);
      }
    } catch (error) {
      console.error('Falha ao carregar overrides JSON de MiniBooks no Postgres:', error);
      stories = localStories.slice();
    }
  }

  speakingCardsCache = {
    stories,
    updatedAt: now
  };
  return stories.map((story) => ({
    ...story,
    cards: story.cards.slice()
  }));
}

async function buildRandomSpeakingCards(selectedStoryId) {
  const stories = await loadSpeakingCardPool();
  if (!stories.length) return [];
  const normalizedStoryId = String(selectedStoryId || '').trim();
  let selected = null;
  if (normalizedStoryId) {
    selected = stories.find((story) => String(story.id || '').trim() === normalizedStoryId) || null;
  }
  if (!selected) {
    const randomIndex = Math.floor(Math.random() * stories.length);
    selected = stories[randomIndex] || null;
  }
  const cards = Array.isArray(selected?.cards) ? selected.cards.slice() : [];
  if (!cards.length || !selected) return [];

  const bookId = normalizeMiniBookId(selected.bookId || selected.fileName);
  const bookTitle = normalizeMiniBookText(selected.bookTitle || selected.nome || selected.fileName, bookId);
  let coverImageUrl = '';
  try {
    const miniBooksManifest = await loadMiniBooksManifest().catch(() => createDefaultMiniBooksManifest());
    const miniBooksMap = miniBooksManifest?.books && typeof miniBooksManifest.books === 'object'
      ? miniBooksManifest.books
      : {};
    const manifestEntry = normalizeMiniBookEntry(bookId, miniBooksMap[bookId] || {});
    coverImageUrl = normalizeMiniBookText(manifestEntry.coverImageUrl);
  } catch (_error) {
    coverImageUrl = '';
  }

  return cards.map((card, index) => {
    const source = card && typeof card === 'object' ? card : {};
    return {
      ...source,
      battleStoryId: String(selected.id || '').trim(),
      battleStoryKey: String(selected.storyKey || '').trim(),
      battleCardIndex: index,
      battleBookId: bookId,
      battleBookTitle: bookTitle,
      battleBookCoverImageUrl: coverImageUrl
    };
  });
}

async function findSpeakingBookById(bookId) {
  const targetBookId = normalizeMiniBookId(bookId);
  const stories = await loadSpeakingCardPool();
  const matches = stories.filter((story) => normalizeMiniBookId(story.bookId || story.fileName) === targetBookId);
  if (!matches.length) return null;
  const first = matches[0];
  return {
    bookId: targetBookId,
    fileName: String(first.fileName || '').trim(),
    title: String(first.bookTitle || first.nome || first.fileName || '').trim() || targetBookId,
    level: normalizeSpeakingStoryLevel(first.nivel),
    storyIds: matches.map((entry) => String(entry.id || '').trim()).filter(Boolean)
  };
}

function buildSpeakingSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

async function markSpeakingChallengeCompletedBySessionId(client, sessionId) {
  if (!sessionId) return;
  await client.query(
    `UPDATE public.speaking_challenges
     SET status = 'completed',
         updated_at = now()
     WHERE session_id = $1
       AND status = 'accepted'`,
    [sessionId]
  );
}

async function awardSpeakingBattleWin(client, sessionId, winnerUserId) {
  const normalizedWinnerUserId = Number(winnerUserId) || 0;
  if (!sessionId || !normalizedWinnerUserId) return false;

  const sessionResult = await client.query(
    `UPDATE public.speaking_duel_sessions
     SET battle_counted = true,
         updated_at = now()
     WHERE id = $1
       AND status = 'completed'
       AND winner_user_id = $2
       AND battle_counted = false
     RETURNING id`,
    [sessionId, normalizedWinnerUserId]
  );

  if (!sessionResult.rows.length) {
    return false;
  }

  await client.query(
    `UPDATE public.users
     SET battle = COALESCE(battle, 0) + 1
     WHERE id = $1`,
    [normalizedWinnerUserId]
  );
  return true;
}

function computeSpeakingDuelWinnerUserId(session) {
  const challengerFinished = Boolean(session?.challenger_finished);
  const opponentFinished = Boolean(session?.opponent_finished);
  const challengerUserId = Number(session?.challenger_user_id) || 0;
  const opponentUserId = Number(session?.opponent_user_id) || 0;
  const challengerPercent = Number(session?.challenger_percent) || 0;
  const opponentPercent = Number(session?.opponent_percent) || 0;
  const challengerProgress = Number(session?.challenger_progress) || 0;
  const opponentProgress = Number(session?.opponent_progress) || 0;
  if (challengerFinished && !opponentFinished) return challengerUserId;
  if (opponentFinished && !challengerFinished) return opponentUserId;
  if (challengerPercent > opponentPercent) return challengerUserId;
  if (opponentPercent > challengerPercent) return opponentUserId;
  if (challengerProgress > opponentProgress) return challengerUserId;
  if (opponentProgress > challengerProgress) return opponentUserId;
  if (challengerUserId > 0) return challengerUserId;
  return 0;
}

function isSpeakingDuelBattleExpired(session) {
  const createdAtMs = Date.parse(String(session?.created_at || '').trim());
  if (!Number.isFinite(createdAtMs) || createdAtMs <= 0) return false;
  const deadlineMs = createdAtMs + ((SPEAKING_DUEL_INTRO_SECONDS + SPEAKING_DUEL_BATTLE_SECONDS) * 1000);
  return Date.now() >= deadlineMs;
}

function computeBotResponseSeconds(botConfig, sessionId, cardIndex) {
  const base = Math.max(1, Number(botConfig?.responseSeconds) || 3);
  const varied = computeBotVariance(base, BOT_RESPONSE_VARIANCE_SECONDS, `${sessionId}:response:${cardIndex}`);
  return Math.max(1, Number(varied.toFixed(2)));
}

function computeBotPronunciationPercent(botConfig, sessionId, cardIndex) {
  return clampPercent(
    computeBotVariance(
      Number(botConfig?.pronunciationBase) || 0,
      BOT_PRONUNCIATION_VARIANCE_PERCENT,
      `${sessionId}:pron:${cardIndex}`
    )
  );
}

function buildBotProgressSnapshot(session, botUserId, botConfig) {
  const cards = Array.isArray(session?.cards) ? session.cards : [];
  const totalCards = Math.max(1, cards.length || SPEAKING_DUEL_DEFAULT_CARDS);
  const createdAtMs = Date.parse(String(session?.created_at || '').trim());
  if (!Number.isFinite(createdAtMs) || createdAtMs <= 0) {
    return { progress: 0, percent: 0, finished: false };
  }

  const battleStartedAtMs = createdAtMs + (SPEAKING_DUEL_INTRO_SECONDS * 1000);
  const elapsedMs = Math.max(0, Date.now() - battleStartedAtMs);
  if (elapsedMs <= 0) {
    return { progress: 0, percent: 0, finished: false };
  }

  let accumulatedMs = 0;
  let completed = 0;
  let sumPercent = 0;
  for (let index = 0; index < totalCards; index += 1) {
    accumulatedMs += computeBotResponseSeconds(botConfig, session.id || botUserId, index) * 1000;
    if (elapsedMs < accumulatedMs) break;
    completed += 1;
    sumPercent += computeBotPronunciationPercent(botConfig, session.id || botUserId, index);
  }

  const progress = Math.min(totalCards, completed);
  const finished = progress >= totalCards;
  const percent = progress > 0 ? Math.round(sumPercent / progress) : 0;
  return { progress, percent, finished };
}

async function syncBotStateIntoSpeakingSession(client, session) {
  if (!session) return session;
  const challengerUserId = Number(session?.challenger_user_id) || 0;
  const opponentUserId = Number(session?.opponent_user_id) || 0;
  const usersResult = await client.query(
    `SELECT id, is_bot, bot_config
     FROM public.users
     WHERE id = ANY($1::int[])`,
    [[challengerUserId, opponentUserId]]
  );
  const usersById = new Map(usersResult.rows.map((row) => [Number(row.id) || 0, row]));
  const challengerUser = usersById.get(challengerUserId);
  const opponentUser = usersById.get(opponentUserId);
  const challengerBotConfig = isBotUserRecord(challengerUser) ? parseBotConfig(challengerUser?.bot_config) : null;
  const opponentBotConfig = isBotUserRecord(opponentUser) ? parseBotConfig(opponentUser?.bot_config) : null;
  if (!challengerBotConfig && !opponentBotConfig) {
    return {
      ...session,
      challenger_is_bot: false,
      opponent_is_bot: false
    };
  }

  const next = {
    challengerProgress: Number(session.challenger_progress) || 0,
    opponentProgress: Number(session.opponent_progress) || 0,
    challengerPercent: Number(session.challenger_percent) || 0,
    opponentPercent: Number(session.opponent_percent) || 0,
    challengerFinished: Boolean(session.challenger_finished),
    opponentFinished: Boolean(session.opponent_finished),
    status: String(session.status || '').trim() || 'active',
    winnerUserId: Number(session.winner_user_id) || 0
  };
  let changed = false;

  if (challengerBotConfig) {
    const snapshot = buildBotProgressSnapshot(session, challengerUserId, challengerBotConfig);
    if (
      snapshot.progress !== next.challengerProgress
      || snapshot.percent !== next.challengerPercent
      || snapshot.finished !== next.challengerFinished
    ) {
      next.challengerProgress = snapshot.progress;
      next.challengerPercent = snapshot.percent;
      next.challengerFinished = snapshot.finished;
      changed = true;
    }
  }
  if (opponentBotConfig) {
    const snapshot = buildBotProgressSnapshot(session, opponentUserId, opponentBotConfig);
    if (
      snapshot.progress !== next.opponentProgress
      || snapshot.percent !== next.opponentPercent
      || snapshot.finished !== next.opponentFinished
    ) {
      next.opponentProgress = snapshot.progress;
      next.opponentPercent = snapshot.percent;
      next.opponentFinished = snapshot.finished;
      changed = true;
    }
  }

  const battleExpired = isSpeakingDuelBattleExpired(session);
  if (battleExpired && next.status !== 'completed') {
    next.status = 'completed';
    next.winnerUserId = computeSpeakingDuelWinnerUserId({
      challenger_finished: next.challengerFinished,
      opponent_finished: next.opponentFinished,
      challenger_percent: next.challengerPercent,
      opponent_percent: next.opponentPercent,
      challenger_progress: next.challengerProgress,
      opponent_progress: next.opponentProgress,
      challenger_user_id: challengerUserId,
      opponent_user_id: opponentUserId
    });
    changed = true;
  }

  if (changed) {
    const updateResult = await client.query(
      `UPDATE public.speaking_duel_sessions
       SET challenger_progress = $2,
           opponent_progress = $3,
           challenger_percent = $4,
           opponent_percent = $5,
           challenger_finished = $6,
           opponent_finished = $7,
           status = $8,
           winner_user_id = CASE
             WHEN $8 = 'completed' THEN CASE WHEN $9 > 0 THEN $9 ELSE NULL END
             ELSE winner_user_id
           END,
           finished_at = CASE WHEN $8 = 'completed' THEN COALESCE(finished_at, now()) ELSE finished_at END,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        session.id,
        next.challengerProgress,
        next.opponentProgress,
        next.challengerPercent,
        next.opponentPercent,
        next.challengerFinished,
        next.opponentFinished,
        next.status,
        next.winnerUserId
      ]
    );
    const updated = updateResult.rows[0] || session;
    if (String(updated.status || '').trim() === 'completed') {
      await markSpeakingChallengeCompletedBySessionId(client, session.id);
      await awardSpeakingBattleWin(client, session.id, Number(updated.winner_user_id) || 0);
    }
    return {
      ...updated,
      challenger_is_bot: Boolean(challengerBotConfig),
      opponent_is_bot: Boolean(opponentBotConfig)
    };
  }

  return {
    ...session,
    challenger_is_bot: Boolean(challengerBotConfig),
    opponent_is_bot: Boolean(opponentBotConfig)
  };
}

async function touchSpeakingSessionAndResolveTimeout(client, sessionId, requesterUserId) {
  const result = await client.query(
    `SELECT *
     FROM public.speaking_duel_sessions
     WHERE id = $1
     FOR UPDATE`,
    [sessionId]
  );
  const session = result.rows[0] || null;
  if (!session) return null;

  const requesterId = Number(requesterUserId) || 0;
  const challengerUserId = Number(session.challenger_user_id) || 0;
  const opponentUserId = Number(session.opponent_user_id) || 0;
  const requesterIsChallenger = requesterId === challengerUserId;
  const requesterIsOpponent = requesterId === opponentUserId;
  if (!requesterIsChallenger && !requesterIsOpponent) {
    return session;
  }

  const nowIso = new Date().toISOString();
  const next = { ...session };
  if (requesterIsChallenger) {
    next.challenger_last_seen_at = nowIso;
  } else {
    next.opponent_last_seen_at = nowIso;
  }

  let status = String(next.status || '').trim() || 'active';
  let winnerUserId = Number(next.winner_user_id) || 0;
  let challengerFinished = Boolean(next.challenger_finished);
  let opponentFinished = Boolean(next.opponent_finished);
  let finishedAt = next.finished_at || null;
  const usersResult = await client.query(
    `SELECT id, is_bot
     FROM public.users
     WHERE id = ANY($1::int[])`,
    [[challengerUserId, opponentUserId]]
  );
  const usersById = new Map(usersResult.rows.map((row) => [Number(row.id) || 0, row]));
  const challengerIsBot = isBotUserRecord(usersById.get(challengerUserId));
  const opponentIsBot = isBotUserRecord(usersById.get(opponentUserId));

  if (status === 'active') {
    const battleExpired = isSpeakingDuelBattleExpired(next);
    if (battleExpired) {
      status = 'completed';
      winnerUserId = computeSpeakingDuelWinnerUserId(next);
      finishedAt = nowIso;
    }

    const requesterWinsByTimeout = requesterIsChallenger
      ? (!opponentIsBot && (Date.now() - Date.parse(next.opponent_last_seen_at || 0)) > (SPEAKING_DUEL_INACTIVE_TIMEOUT_SECONDS * 1000))
      : (!challengerIsBot && (Date.now() - Date.parse(next.challenger_last_seen_at || 0)) > (SPEAKING_DUEL_INACTIVE_TIMEOUT_SECONDS * 1000));

    if (!battleExpired && requesterWinsByTimeout) {
      status = 'completed';
      winnerUserId = requesterId;
      challengerFinished = requesterIsChallenger ? true : challengerFinished;
      opponentFinished = requesterIsOpponent ? true : opponentFinished;
      finishedAt = nowIso;
    }
  }

  const updateResult = await client.query(
    `UPDATE public.speaking_duel_sessions
     SET challenger_last_seen_at = $2,
         opponent_last_seen_at = $3,
         status = $4,
         winner_user_id = CASE
           WHEN $4 = 'completed' THEN CASE WHEN $5 > 0 THEN $5 ELSE NULL END
           ELSE winner_user_id
         END,
         challenger_finished = $6,
         opponent_finished = $7,
         finished_at = CASE
           WHEN $4 = 'completed' THEN COALESCE(finished_at, now())
           ELSE finished_at
         END,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      sessionId,
      next.challenger_last_seen_at || session.challenger_last_seen_at,
      next.opponent_last_seen_at || session.opponent_last_seen_at,
      status,
      winnerUserId,
      challengerFinished,
      opponentFinished
    ]
  );
  const updated = updateResult.rows[0] || session;
  if (String(updated.status || '').trim() === 'completed') {
    await markSpeakingChallengeCompletedBySessionId(client, sessionId);
    await awardSpeakingBattleWin(client, sessionId, Number(updated.winner_user_id) || 0);
  }
  return syncBotStateIntoSpeakingSession(client, updated);
}

async function refreshFlashcardManifestMirror() {
  const files = await collectBuiltinFlashcardManifestEntries();
  await writeMirroredFile(
    path.posix.join(FLASHCARD_DATA_RELATIVE_ROOT, 'manifest.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), files }, null, 2)}\n`,
    'utf8'
  );
  return files;
}

async function requireAdminUserFromRequest(req) {
  const user = await readAuthenticatedUserFromRequest(req);
  if (!user) {
    const error = new Error('Sessao expirada.');
    error.statusCode = 401;
    throw error;
  }
  if (!isAdminUserRecord(user)) {
    const error = new Error('Acesso restrito ao administrador.');
    error.statusCode = 403;
    throw error;
  }
  return user;
}

function parseModelJsonText(text) {
  const input = String(text || '').trim();
  if (!input) return null;

  const candidates = [input];
  const fenced = input.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    candidates.unshift(fenced[1].trim());
  }
  const firstBrace = input.indexOf('{');
  const lastBrace = input.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(input.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (_error) {
      // try next
    }
  }
  return null;
}

function clampGeneratedFlashcardText(value, maxChars = 32) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length <= maxChars) return clean;
  const sliced = clean.slice(0, maxChars).trim();
  const lastSpace = sliced.lastIndexOf(' ');
  if (lastSpace >= Math.max(4, Math.floor(maxChars * 0.55))) {
    return sliced.slice(0, lastSpace).trim();
  }
  return sliced;
}

function getFlashcardPayloadItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function setPreferredFlashcardField(item, keys, value) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(item, key)) {
      item[key] = value;
      return;
    }
  }
  item[keys[0]] = value;
}

function readFlashcardItemEnglish(item) {
  return typeof item?.nomeIngles === 'string'
    ? item.nomeIngles.trim()
    : typeof item?.english === 'string'
      ? item.english.trim()
      : typeof item?.word === 'string'
        ? item.word.trim()
        : '';
}

function readFlashcardItemPortuguese(item) {
  return typeof item?.nomePortugues === 'string'
    ? item.nomePortugues.trim()
    : typeof item?.portuguese === 'string'
      ? item.portuguese.trim()
      : typeof item?.translation === 'string'
        ? item.translation.trim()
        : '';
}

function readFlashcardItemImage(item) {
  return typeof item?.imagem === 'string'
    ? item.imagem.trim()
    : typeof item?.image === 'string'
      ? item.image.trim()
      : '';
}

function readFlashcardItemAudio(item) {
  return typeof item?.audio === 'string'
    ? item.audio.trim()
    : typeof item?.audioUrl === 'string'
      ? item.audioUrl.trim()
      : '';
}

function setFlashcardItemEnglish(item, value) {
  setPreferredFlashcardField(item, ['nomeIngles', 'english', 'word'], value);
}

function setFlashcardItemPortuguese(item, value) {
  setPreferredFlashcardField(item, ['nomePortugues', 'portuguese', 'translation'], value);
}

function setFlashcardItemImage(item, value) {
  setPreferredFlashcardField(item, ['imagem', 'image'], value);
}

function setFlashcardItemAudio(item, value) {
  setPreferredFlashcardField(item, ['audio', 'audioUrl'], value);
}

function normalizePublicDeckAssetUrl(rawValue, options = {}) {
  const text = String(rawValue || '').trim();
  if (!text) return '';

  if (/^https?:\/\//i.test(text)) {
    return text;
  }

  const normalized = text.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized) return '';

  if (/^(?:api\/r2-media\/|admin\/|accesskey\/|Niveis\/|allcards\/)/i.test(normalized)) {
    return `/${normalized}`;
  }

  if (
    normalized === FLASHCARD_CAMERA_OBJECT_KEY
    || normalized.startsWith(`${FLASHCARDS_R2_PREFIX}/`)
    || normalized.startsWith('FlashCards/')
  ) {
    return buildFlashcardsR2PublicUrl(normalized);
  }

  const remoteDeck = options?.remoteDeck && typeof options.remoteDeck === 'object'
    ? options.remoteDeck
    : null;
  const kind = String(options?.kind || '').trim().toLowerCase();
  if (remoteDeck) {
    if (/^imagens\//i.test(normalized) && remoteDeck.imagesFolder) {
      const relativePath = normalized.replace(/^imagens\/+/i, '');
      if (relativePath) {
        return buildFlashcardsR2PublicUrl(path.posix.join(remoteDeck.imagesFolder, relativePath));
      }
    }

    if (/^audio\//i.test(normalized) && remoteDeck.audioFolder) {
      const relativePath = normalized.replace(/^audio\/+/i, '');
      if (relativePath) {
        return buildFlashcardsR2PublicUrl(path.posix.join(remoteDeck.audioFolder, relativePath));
      }
    }

    if (!normalized.includes('/')) {
      const targetFolder = kind === 'audio'
        ? remoteDeck.audioFolder
        : remoteDeck.imagesFolder;
      if (targetFolder) {
        return buildFlashcardsR2PublicUrl(path.posix.join(targetFolder, normalized));
      }
    }
  }

  const dayKey = normalizeLevelFolderKey(options?.dayKey || '');
  if (dayKey) {
    const fileName = path.posix.basename(normalized);
    if (fileName) {
      const relativePath = path.posix.join(
        ADMIN_FLASHCARD_ASSET_RELATIVE_ROOT,
        'levels',
        `day-${dayKey}`,
        fileName
      );
      return buildPublicAssetUrl(relativePath);
    }
  }

  return `/${normalized}`;
}

function repairPublicDeckPayloadAssets(payload, deckRow) {
  const sourcePayload = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? JSON.parse(JSON.stringify(payload))
    : null;
  if (!sourcePayload) {
    return { payload, changed: false };
  }

  const dayKey = normalizeLevelFolderKey(deckRow?.day_key || '');
  const remoteDeck = buildFlashcardsRemoteDeckInfo(
    sourcePayload,
    normalizePublicFlashcardDeckFileName(deckRow?.file_name, 'deck.json')
  );
  let changed = false;
  const items = getFlashcardPayloadItems(sourcePayload);

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;

    const currentImage = readFlashcardItemImage(item);
    const nextImage = normalizePublicDeckAssetUrl(currentImage, { dayKey, kind: 'image', remoteDeck });
    if (nextImage && nextImage !== currentImage) {
      setFlashcardItemImage(item, nextImage);
      changed = true;
    }

    const currentAudio = readFlashcardItemAudio(item);
    const nextAudio = normalizePublicDeckAssetUrl(currentAudio, { dayKey, kind: 'audio', remoteDeck });
    if (nextAudio && nextAudio !== currentAudio) {
      setFlashcardItemAudio(item, nextAudio);
      changed = true;
    }
  }

  if (typeof sourcePayload.coverImage === 'string') {
    const nextCover = normalizePublicDeckAssetUrl(sourcePayload.coverImage, {
      dayKey,
      kind: 'image',
      remoteDeck
    });
    if (nextCover && nextCover !== sourcePayload.coverImage) {
      sourcePayload.coverImage = nextCover;
      changed = true;
    }
  }

  return {
    payload: changed ? sourcePayload : payload,
    changed
  };
}

function resolvePublishedLevelAssetUrl(rawValue, assetUrlMap) {
  const text = String(rawValue || '').trim();
  if (!text) return '';

  if (/^https?:\/\//i.test(text)) {
    return text;
  }

  const normalized = text.replace(/\\/g, '/').trim();
  if (!normalized) return '';

  if (/^\/?(?:api\/r2-media\/|admin\/|accesskey\/|Niveis\/|allcards\/)/i.test(normalized)) {
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  }

  const fileName = path.basename(normalized);
  return fileName ? (assetUrlMap.get(fileName) || '') : '';
}

function resolveAdminFlashcardSourceInfo(sourceValue) {
  const normalized = normalizeMirroredRelativePath(sourceValue);
  if (!normalized) {
    const error = new Error('Origem do flashcard nao informada.');
    error.statusCode = 400;
    throw error;
  }

  const localLevelMatch = normalized.match(/^Niveis\/([^/]+)\/([^/]+\.json)$/i);
  if (localLevelMatch && LOCAL_LEVEL_ALLOWED_FOLDERS.includes(String(localLevelMatch[1] || '').toLowerCase())) {
    const folder = String(localLevelMatch[1] || '').toLowerCase();
    const fileName = path.posix.basename(localLevelMatch[2]);
    return {
      type: 'local-level',
      folder,
      fileName,
      relativeJsonPath: `Niveis/${folder}/${fileName}`,
      assetGroup: `local-${safeGeneratedBase(`${folder}-${fileName}`, 'flashcard-deck')}`
    };
  }

  if (/^data\/flashcards\/130\/001\/[^/]+\.json$/i.test(normalized) || /^[^/]+\.json$/i.test(normalized)) {
    const fileName = path.posix.basename(normalized);
    return {
      type: 'builtin',
      fileName,
      relativeJsonPath: path.posix.join(FLASHCARD_DATA_RELATIVE_ROOT, fileName),
      assetGroup: `library-${safeGeneratedBase(fileName, 'flashcard-deck')}`,
      deckRelativeRoot: ''
    };
  }

  if (/^data\/flashcards\/130\/001\/.+\/json\/[^/]+\.json$/i.test(normalized)) {
    const fileName = path.posix.basename(normalized);
    const deckRelativeRoot = path.posix.dirname(path.posix.dirname(normalized));
    return {
      type: 'builtin-structured',
      fileName,
      relativeJsonPath: normalized,
      assetGroup: `library-${safeGeneratedBase(deckRelativeRoot, 'flashcard-deck')}`,
      deckRelativeRoot
    };
  }

  const error = new Error('Origem do flashcard nao suportada.');
  error.statusCode = 400;
  throw error;
}

async function requestOpenAiJsonPayload(prompt, options = {}) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('fake')) {
    const error = new Error('OpenAI nao configurado.');
    error.statusCode = 503;
    error.instructions = 'Preencha OPENAI_API_KEY no .env com a chave real da OpenAI.';
    throw error;
  }

  const upstreamResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model || OPENAI_CHAT_FAST_MODEL,
      input: prompt,
      ...(options.maxOutputTokens ? { max_output_tokens: options.maxOutputTokens } : {})
    })
  });

  const responseText = await upstreamResponse.text();
  let payload = null;
  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch (_error) {
    payload = null;
  }

  if (!upstreamResponse.ok) {
    const error = new Error(payload?.error?.message || responseText.slice(0, 500) || 'Falha ao conectar com a OpenAI.');
    error.statusCode = upstreamResponse.status;
    throw error;
  }

  const outputText = extractResponseText(payload);
  if (!outputText) {
    const error = new Error('A OpenAI nao retornou texto utilizavel.');
    error.statusCode = 502;
    throw error;
  }

  const parsed = parseModelJsonText(outputText);
  if (!parsed) {
    const error = new Error(`A OpenAI retornou um formato inesperado: ${outputText.slice(0, 300)}`);
    error.statusCode = 502;
    throw error;
  }

  return { payload, parsed };
}

async function loadEditableFlashcardSources(targetCards) {
  const sourceMap = new Map();

  for (const target of targetCards) {
    const sourceInfo = resolveAdminFlashcardSourceInfo(target?.source);
    const sourceIndex = Number.parseInt(target?.sourceIndex, 10);
    if (!Number.isInteger(sourceIndex) || sourceIndex < 0) {
      const error = new Error('Indice do flashcard invalido.');
      error.statusCode = 400;
      throw error;
    }

    let sourceEntry = sourceMap.get(sourceInfo.relativeJsonPath);
    if (!sourceEntry) {
      const payload = await readJsonFromRelativePath(sourceInfo.relativeJsonPath);
      sourceEntry = {
        sourceInfo,
        payload,
        items: getFlashcardPayloadItems(payload)
      };
      sourceMap.set(sourceInfo.relativeJsonPath, sourceEntry);
    }

    if (!sourceEntry.items[sourceIndex]) {
      const error = new Error(`Flashcard nao encontrado em ${sourceInfo.fileName}#${sourceIndex}.`);
      error.statusCode = 404;
      throw error;
    }
  }

  return sourceMap;
}

async function persistEditableFlashcardSources(sourceMap) {
  let touchedLocalLevels = false;

  for (const entry of sourceMap.values()) {
    await writeJsonToRelativePath(entry.sourceInfo.relativeJsonPath, entry.payload);
    if (entry.sourceInfo.type === 'local-level') {
      touchedLocalLevels = true;
    }
  }

  if (touchedLocalLevels) {
    await refreshLocalLevelManifestMirror();
  }
}

async function readOptionalR2JsonObject(objectKey) {
  try {
    return await fetchR2JsonObject(objectKey);
  } catch (error) {
    if (/404/i.test(String(error?.message || ''))) {
      return null;
    }
    throw error;
  }
}

async function publishFlashcardDeckToR2FromSource(sourceInfo, payload) {
  if (!isR2FluencyConfigured()) {
    const error = new Error('R2 nao configurado para publicar decks de flashcards.');
    error.statusCode = 503;
    throw error;
  }

  const remoteDeck = buildFlashcardsRemoteDeckInfo(payload, sourceInfo?.fileName || 'deck.json');
  const publishedPayload = {
    title: remoteDeck.deckTitle,
    coverImage: '',
    items: []
  };
  const items = getFlashcardPayloadItems(payload);

  await deleteR2Prefix(`${remoteDeck.deckPrefix}/`);

  if (typeof payload?.coverImage === 'string' && payload.coverImage.trim()) {
    try {
      const coverAsset = await readFlashcardAssetBuffer(payload.coverImage.trim());
      if (coverAsset?.buffer?.length) {
        const coverExtension = path.extname(String(payload.coverImage || '')).toLowerCase() || '.webp';
        const coverFileName = `${sanitizeFlashcardsFileBase(remoteDeck.deckFolder, 'deck')}_cover${coverExtension}`;
        const coverObjectKey = `${remoteDeck.imagesFolder}/${coverFileName}`;
        await putR2Object(coverObjectKey, coverAsset.buffer, coverAsset.contentType || contentTypeFromObjectKey(coverObjectKey));
        publishedPayload.coverImage = buildFlashcardsR2PublicUrl(coverObjectKey);
      }
    } catch (error) {
      console.warn(
        `Ignorando coverImage legado ao publicar ${remoteDeck.deckFolder}: ${error?.message || error}`
      );
    }
  }

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const nextItem = JSON.parse(JSON.stringify(item || {}));
    const imageValue = readFlashcardItemImage(item);
    const audioValue = readFlashcardItemAudio(item);

    if (imageValue) {
      if (isFlashcardPlaceholderImageValue(imageValue)) {
        setFlashcardItemImage(nextItem, getFlashcardPlaceholderImageUrl());
      } else {
        const imageAsset = await readFlashcardAssetBuffer(imageValue);
        if (imageAsset?.buffer?.length) {
          const imageExtension = path.extname(String(imageValue || '')).toLowerCase() || '.webp';
          const imageFileName = `${normalizeFlashcardsItemFileStem(remoteDeck.deckFolder, index)}${imageExtension}`;
          const imageObjectKey = `${remoteDeck.imagesFolder}/${imageFileName}`;
          await putR2Object(imageObjectKey, imageAsset.buffer, imageAsset.contentType || contentTypeFromObjectKey(imageObjectKey));
          setFlashcardItemImage(nextItem, buildFlashcardsR2PublicUrl(imageObjectKey));
        }
      }
    }

    if (audioValue) {
      const audioAsset = await readFlashcardAssetBuffer(audioValue);
      if (audioAsset?.buffer?.length) {
        const audioExtension = path.extname(String(audioValue || '')).toLowerCase() || '.mp3';
        const audioFileName = `${normalizeFlashcardsItemFileStem(remoteDeck.deckFolder, index)}${audioExtension}`;
        const audioObjectKey = `${remoteDeck.audioFolder}/${audioFileName}`;
        await putR2Object(audioObjectKey, audioAsset.buffer, audioAsset.contentType || contentTypeFromObjectKey(audioObjectKey));
        setFlashcardItemAudio(nextItem, buildFlashcardsR2PublicUrl(audioObjectKey));
      }
    }

    publishedPayload.items.push(nextItem);
  }

  const jsonObjectKey = `${remoteDeck.jsonFolder}/${remoteDeck.jsonFileName}`;
  await putR2Object(
    jsonObjectKey,
    Buffer.from(`${JSON.stringify(publishedPayload, null, 2)}\n`, 'utf8'),
    'application/json; charset=utf-8'
  );

  return {
    source: jsonObjectKey,
    title: remoteDeck.deckTitle,
    deckFolder: remoteDeck.deckFolder,
    jsonObjectKey,
    jsonUrl: buildFlashcardsR2PublicUrl(jsonObjectKey),
    count: publishedPayload.items.length,
    type: sourceInfo.type,
    localFolder: sourceInfo.folder || ''
  };
}

async function publishFlashcardsManifestEntryToR2(sourceInfo, publishedDeck) {
  const manifestObjectKey = `${FLASHCARDS_R2_PREFIX}/manifest.json`;
  const manifestPayload = (await readOptionalR2JsonObject(manifestObjectKey)) || { generatedAt: '', files: [] };
  const existingFiles = Array.isArray(manifestPayload?.files) ? manifestPayload.files : [];
  const nextEntry = {
    name: `${publishedDeck.deckFolder}.json`,
    title: publishedDeck.title,
    slug: publishedDeck.deckFolder,
    source: publishedDeck.source,
    path: publishedDeck.jsonUrl,
    count: publishedDeck.count
  };

  const nextPayload = {
    generatedAt: new Date().toISOString(),
    files: upsertFlashcardsManifestEntry(existingFiles, nextEntry)
  };

  await putR2Object(
    manifestObjectKey,
    Buffer.from(`${JSON.stringify(nextPayload, null, 2)}\n`, 'utf8'),
    'application/json; charset=utf-8'
  );

  return nextEntry;
}

async function publishFlashcardSourcesToR2(sourceInfos) {
  const publishedDecks = [];
  const seenSources = new Set();

  for (const sourceInfo of sourceInfos) {
    if (!sourceInfo?.relativeJsonPath || seenSources.has(sourceInfo.relativeJsonPath)) {
      continue;
    }
    seenSources.add(sourceInfo.relativeJsonPath);
    const payload = await readJsonFromRelativePath(sourceInfo.relativeJsonPath);
    const publishedDeck = await publishFlashcardDeckToR2FromSource(sourceInfo, payload);
    const manifestEntry = await publishFlashcardsManifestEntryToR2(sourceInfo, publishedDeck);
    publishedDecks.push({
      ...publishedDeck,
      manifestEntry
    });
  }

  return publishedDecks;
}

async function listAdminFlashcardDecks() {
  const manifestPath = path.posix.join(FLASHCARD_DATA_RELATIVE_ROOT, 'manifest.json');
  let builtinFiles = [];
  try {
    const manifest = await readJsonFromRelativePath(manifestPath);
    builtinFiles = Array.isArray(manifest?.files) ? manifest.files : [];
  } catch (_error) {
    builtinFiles = [];
  }

  const sources = builtinFiles.map((file) => ({
    source: normalizeMirroredRelativePath(String(file?.source || file?.path || file?.name || '')),
    relativeJsonPath: normalizeMirroredRelativePath(String(file?.source || file?.path || file?.name || ''))
  })).filter((entry) => entry.source && entry.relativeJsonPath);

  const decks = [];
  for (const entry of sources) {
    try {
      const payload = await readJsonFromRelativePath(entry.relativeJsonPath);
      const items = getFlashcardPayloadItems(payload);
      decks.push({
        source: entry.source,
        title: typeof payload?.title === 'string' && payload.title.trim()
          ? payload.title.trim()
          : path.posix.basename(entry.relativeJsonPath),
        coverImage: typeof payload?.coverImage === 'string' ? payload.coverImage.trim() : '',
        count: items.length
      });
    } catch (_error) {
      decks.push({
        source: entry.source,
        title: path.posix.basename(entry.relativeJsonPath),
        coverImage: '',
        count: 0
      });
    }
  }

  return decks.sort((left, right) => left.title.localeCompare(right.title, 'pt-BR', {
    sensitivity: 'base',
    numeric: true
  }));
}

async function listAdminFlashcardDeckEntries() {
  const manifestPath = path.posix.join(FLASHCARD_DATA_RELATIVE_ROOT, 'manifest.json');
  let builtinFiles = [];
  try {
    const manifest = await readJsonFromRelativePath(manifestPath);
    builtinFiles = Array.isArray(manifest?.files) ? manifest.files : [];
  } catch (_error) {
    builtinFiles = [];
  }

  return builtinFiles.map((file) => ({
    source: normalizeMirroredRelativePath(String(file?.source || file?.path || file?.name || '')),
    relativeJsonPath: normalizeMirroredRelativePath(String(file?.source || file?.path || file?.name || ''))
  })).filter((entry) => entry.source && entry.relativeJsonPath);
}

function adminDeckGroupKeyFromSourceInfo(sourceInfo) {
  if (!sourceInfo) return 'unknown';
  if (sourceInfo.type === 'local-level') {
    return `local-level:${sourceInfo.folder}`;
  }
  return `builtin:${FLASHCARD_DATA_RELATIVE_ROOT}`;
}

async function buildAdminDeckContextByGroup() {
  const entries = await listAdminFlashcardDeckEntries();
  const groups = new Map();

  for (const entry of entries) {
    try {
      const sourceInfo = resolveAdminFlashcardSourceInfo(entry.source);
      const payload = await readJsonFromRelativePath(entry.relativeJsonPath);
      const items = getFlashcardPayloadItems(payload);
      const groupKey = adminDeckGroupKeyFromSourceInfo(sourceInfo);
      const title = typeof payload?.title === 'string' && payload.title.trim()
        ? payload.title.trim()
        : path.posix.basename(entry.relativeJsonPath);

      let group = groups.get(groupKey);
      if (!group) {
        group = {
          groupKey,
          titles: [],
          existingPairKeys: new Set(),
          samplePairs: []
        };
        groups.set(groupKey, group);
      }

      group.titles.push(title);
      for (const item of items) {
        const pt = clampGeneratedFlashcardText(readFlashcardItemPortuguese(item), 32);
        const en = clampGeneratedFlashcardText(readFlashcardItemEnglish(item), 32);
        if (!pt || !en) continue;
        const pairKey = `${pt.toLowerCase()}|||${en.toLowerCase()}`;
        group.existingPairKeys.add(pairKey);
        if (group.samplePairs.length < 200) {
          group.samplePairs.push({ pt, en, deckTitle: title });
        }
      }
    } catch (_error) {
      // ignore unreadable decks
    }
  }

  return groups;
}

function buildEditableFlashcardItemTemplate() {
  return {
    nomePortugues: '',
    nomeIngles: '',
    imagem: getFlashcardPlaceholderImageUrl(),
    audio: '',
    categoria: 'flashcard'
  };
}

function createEditableFlashcardDeckPayload(title, coverImage = '', slotCount = 1) {
  const parsedCount = Number.parseInt(slotCount, 10);
  const normalizedCount = Number.isInteger(parsedCount)
    ? Math.max(0, Math.min(100, parsedCount))
    : 0;
  return {
    title: String(title || '').trim() || 'Novo deck',
    coverImage: String(coverImage || '').trim(),
    items: Array.from({ length: normalizedCount }, () => buildEditableFlashcardItemTemplate())
  };
}

function buildAdminFlashcardAssetRelativePath(sourceInfo, sourceIndex, kind, extension) {
  const safeExtension = String(extension || '').replace(/^\./, '') || (kind === 'audio' ? 'mp3' : 'webp');
  const assetFolder = kind === 'audio' ? 'audios' : 'imagens';
  if (sourceInfo?.type === 'builtin-structured' && sourceInfo.deckRelativeRoot) {
    return path.posix.join(
      sourceInfo.deckRelativeRoot,
      assetFolder,
      `${String(sourceIndex + 1).padStart(3, '0')}-${kind}-${Date.now()}.${safeExtension}`
    );
  }
  return path.posix.join(
    ADMIN_FLASHCARD_ASSET_RELATIVE_ROOT,
    sourceInfo.assetGroup,
    assetFolder,
    `${String(sourceIndex + 1).padStart(3, '0')}-${kind}-${Date.now()}.${safeExtension}`
  );
}

function buildPublicAssetUrl(relativePath) {
  return `/${normalizeMirroredRelativePath(relativePath)}`;
}

function normalizeAdminBannerSlot(value) {
  const slot = Number.parseInt(value, 10);
  if (!Number.isInteger(slot) || slot < 1 || slot > ADMIN_BANNER_SLOT_COUNT) {
    return 0;
  }
  return slot;
}

function normalizeAdminBannerOffset(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return 0;
  return Math.max(-2000, Math.min(2000, parsed));
}

function normalizeAdminBannerSizeAdjust(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return 0;
  return Math.max(-1200, Math.min(2400, parsed));
}

function normalizeAdminBannerVariant(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'mobile') return 'mobile';
  if (normalized === 'desktop') return 'desktop';
  return '';
}

function normalizeAdminBannerSurface(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'users') return 'users';
  return 'allcards';
}

function getAdminBannerRenderSize(variant) {
  return variant === 'mobile'
    ? ADMIN_BANNER_MOBILE_RENDER_SIZE
    : ADMIN_BANNER_DESKTOP_RENDER_SIZE;
}

function createDefaultAdminBannerSet() {
  return Array.from({ length: ADMIN_BANNER_SLOT_COUNT }, (_, index) => ({
    slot: index + 1,
    imageUrlDesktop: '',
    objectKeyDesktop: '',
    promptDesktop: '',
    offsetXDesktop: 0,
    offsetYDesktop: 0,
    sizeAdjustPxDesktop: 0,
    imageUrlMobile: '',
    objectKeyMobile: '',
    promptMobile: '',
    offsetXMobile: 0,
    offsetYMobile: 0,
    sizeAdjustPxMobile: 0,
    updatedAt: null
  }));
}

function createDefaultAdminBannerManifest() {
  return {
    generatedAt: new Date().toISOString(),
    updatedAt: null,
    banners: createDefaultAdminBannerSet(),
    bannersUsers: createDefaultAdminBannerSet()
  };
}

function normalizeAdminBannerEntry(entry, slotNumber) {
  const slot = normalizeAdminBannerSlot(entry?.slot) || slotNumber;
  const imageUrlDesktop = typeof entry?.imageUrlDesktop === 'string'
    ? entry.imageUrlDesktop.trim()
    : (typeof entry?.imageUrl === 'string' ? entry.imageUrl.trim() : '');
  const objectKeyDesktop = typeof entry?.objectKeyDesktop === 'string'
    ? entry.objectKeyDesktop.trim()
    : (typeof entry?.objectKey === 'string' ? entry.objectKey.trim() : '');
  const promptDesktop = typeof entry?.promptDesktop === 'string'
    ? entry.promptDesktop.trim()
    : (typeof entry?.prompt === 'string' ? entry.prompt.trim() : '');
  const offsetXDesktop = normalizeAdminBannerOffset(
    entry?.offsetXDesktop ?? entry?.offsetX
  );
  const offsetYDesktop = normalizeAdminBannerOffset(
    entry?.offsetYDesktop ?? entry?.offsetY
  );
  const sizeAdjustPxDesktop = normalizeAdminBannerSizeAdjust(
    entry?.sizeAdjustPxDesktop ?? entry?.sizeAdjustPx
  );
  const imageUrlMobile = typeof entry?.imageUrlMobile === 'string'
    ? entry.imageUrlMobile.trim()
    : '';
  const objectKeyMobile = typeof entry?.objectKeyMobile === 'string'
    ? entry.objectKeyMobile.trim()
    : '';
  const promptMobile = typeof entry?.promptMobile === 'string'
    ? entry.promptMobile.trim()
    : '';
  const offsetXMobile = normalizeAdminBannerOffset(entry?.offsetXMobile);
  const offsetYMobile = normalizeAdminBannerOffset(entry?.offsetYMobile);
  const sizeAdjustPxMobile = normalizeAdminBannerSizeAdjust(entry?.sizeAdjustPxMobile);

  return {
    slot,
    imageUrlDesktop,
    objectKeyDesktop,
    promptDesktop,
    offsetXDesktop,
    offsetYDesktop,
    sizeAdjustPxDesktop,
    imageUrlMobile,
    objectKeyMobile,
    promptMobile,
    offsetXMobile,
    offsetYMobile,
    sizeAdjustPxMobile,
    // Legacy aliases kept for old clients.
    imageUrl: imageUrlDesktop,
    objectKey: objectKeyDesktop,
    prompt: promptDesktop,
    offsetX: offsetXDesktop,
    offsetY: offsetYDesktop,
    sizeAdjustPx: sizeAdjustPxDesktop,
    updatedAt: entry?.updatedAt || null
  };
}

function normalizeAdminBannerManifest(payload) {
  const base = createDefaultAdminBannerManifest();
  const normalizeBannerSet = (sourceList) => {
    const source = Array.isArray(sourceList) ? sourceList : [];
    const map = new Map();
    for (const rawEntry of source) {
      const normalized = normalizeAdminBannerEntry(rawEntry, normalizeAdminBannerSlot(rawEntry?.slot));
      if (!normalized.slot) continue;
      map.set(normalized.slot, normalized);
    }
    return Array.from({ length: ADMIN_BANNER_SLOT_COUNT }, (_, index) => {
      const slot = index + 1;
      return map.get(slot) || normalizeAdminBannerEntry({}, slot);
    });
  };

  base.banners = normalizeBannerSet(payload?.banners);
  const usersSource = payload?.bannersUsers;
  base.bannersUsers = usersSource
    ? normalizeBannerSet(usersSource)
    : createDefaultAdminBannerSet();
  base.generatedAt = payload?.generatedAt || base.generatedAt;
  base.updatedAt = payload?.updatedAt || null;
  return base;
}

async function readLocalAdminBannerManifest() {
  try {
    const payload = await readJsonFromRelativePath(ADMIN_BANNER_MANIFEST_RELATIVE_PATH);
    return normalizeAdminBannerManifest(payload);
  } catch (_error) {
    return createDefaultAdminBannerManifest();
  }
}

async function loadAdminBannerManifest() {
  if (isR2FluencyConfigured()) {
    try {
      const payload = await fetchR2JsonObject(ADMIN_BANNER_MANIFEST_OBJECT_KEY);
      return normalizeAdminBannerManifest(payload);
    } catch (error) {
      if (Number(error?.status) !== 404) {
        throw error;
      }
    }
  }
  return readLocalAdminBannerManifest();
}

async function persistAdminBannerManifest(payload) {
  const normalized = normalizeAdminBannerManifest(payload);
  const serialized = `${JSON.stringify(normalized, null, 2)}\n`;
  await writeMirroredFile(ADMIN_BANNER_MANIFEST_RELATIVE_PATH, serialized, 'utf8');
  if (isR2FluencyConfigured()) {
    await putR2Object(ADMIN_BANNER_MANIFEST_OBJECT_KEY, Buffer.from(serialized, 'utf8'), 'application/json');
  }
  return normalized;
}

function normalizeMiniBookId(value) {
  return safeGeneratedBase(String(value || '').replace(/\.json$/i, ''), 'book');
}

function normalizeMiniBookText(value, fallback = '') {
  const trimmed = String(value || '').trim();
  return trimmed || String(fallback || '').trim();
}

function createDefaultMiniBooksManifest() {
  return {
    generatedAt: new Date().toISOString(),
    updatedAt: null,
    books: {}
  };
}

function normalizeMiniBookEntry(bookId, entry = {}) {
  const normalizedId = normalizeMiniBookId(bookId || entry?.bookId || entry?.fileName || entry?.title || 'book');
  return {
    bookId: normalizedId,
    fileName: normalizeMiniBookText(entry?.fileName),
    title: normalizeMiniBookText(entry?.title),
    level: normalizeSpeakingStoryLevel(entry?.level),
    coverImageUrl: normalizeMiniBookText(entry?.coverImageUrl),
    coverObjectKey: normalizeMiniBookText(entry?.coverObjectKey),
    coverPrompt: normalizeMiniBookText(entry?.coverPrompt),
    backgroundDesktopUrl: normalizeMiniBookText(entry?.backgroundDesktopUrl),
    backgroundDesktopObjectKey: normalizeMiniBookText(entry?.backgroundDesktopObjectKey),
    backgroundMobileUrl: normalizeMiniBookText(entry?.backgroundMobileUrl),
    backgroundMobileObjectKey: normalizeMiniBookText(entry?.backgroundMobileObjectKey),
    backgroundPrompt: normalizeMiniBookText(entry?.backgroundPrompt),
    updatedAt: entry?.updatedAt || null
  };
}

function normalizeMiniBooksManifest(payload) {
  const base = createDefaultMiniBooksManifest();
  const books = payload?.books && typeof payload.books === 'object' && !Array.isArray(payload.books)
    ? payload.books
    : {};
  const normalizedBooks = {};
  Object.entries(books).forEach(([rawBookId, rawEntry]) => {
    const entry = normalizeMiniBookEntry(rawBookId, rawEntry);
    normalizedBooks[entry.bookId] = entry;
  });
  base.books = normalizedBooks;
  base.generatedAt = payload?.generatedAt || base.generatedAt;
  base.updatedAt = payload?.updatedAt || null;
  return base;
}

async function readLocalMiniBooksManifest() {
  try {
    const payload = await readJsonFromRelativePath(MINIBOOKS_MANIFEST_RELATIVE_PATH);
    return normalizeMiniBooksManifest(payload);
  } catch (_error) {
    return createDefaultMiniBooksManifest();
  }
}

async function loadMiniBooksManifest() {
  if (isR2FluencyConfigured()) {
    try {
      const payload = await fetchR2JsonObject(MINIBOOKS_MANIFEST_OBJECT_KEY);
      return normalizeMiniBooksManifest(payload);
    } catch (error) {
      if (Number(error?.status) !== 404) {
        throw error;
      }
    }
  }
  return readLocalMiniBooksManifest();
}

async function persistMiniBooksManifest(payload) {
  const normalized = normalizeMiniBooksManifest(payload);
  const serialized = `${JSON.stringify(normalized, null, 2)}\n`;
  await writeMirroredFile(MINIBOOKS_MANIFEST_RELATIVE_PATH, serialized, 'utf8');
  if (isR2FluencyConfigured()) {
    await putR2Object(MINIBOOKS_MANIFEST_OBJECT_KEY, Buffer.from(serialized, 'utf8'), 'application/json');
  }
  return normalized;
}

function getMiniBookRenderSize(kind) {
  if (kind === 'background-desktop') return MINIBOOKS_BACKGROUND_DESKTOP_RENDER_SIZE;
  if (kind === 'background-mobile') return MINIBOOKS_BACKGROUND_MOBILE_RENDER_SIZE;
  return MINIBOOKS_COVER_RENDER_SIZE;
}

async function optimizeMiniBookAssetToWebp(inputBuffer, kind = 'cover') {
  const renderSize = getMiniBookRenderSize(kind);
  const transformer = sharp(inputBuffer, { failOn: 'none', animated: false })
    .rotate();

  if (kind === 'cover') {
    transformer.resize({
      height: Number(renderSize.height) || 600,
      fit: 'inside',
      withoutEnlargement: false
    });
  } else {
    transformer.resize(renderSize.width, renderSize.height, {
      fit: 'cover',
      position: 'centre',
      withoutEnlargement: false
    });
  }

  return transformer
    .webp({
      quality: kind === 'cover' ? 82 : 78,
      effort: 5,
      smartSubsample: true
    })
    .toBuffer();
}

async function generateMiniBookImageWithOpenAi(prompt, options = {}) {
  const promptText = String(prompt || '').trim();
  if (!promptText) {
    const error = new Error('Prompt vazio para gerar imagem.');
    error.statusCode = 400;
    throw error;
  }
  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('fake')) {
    const error = new Error('OpenAI nao configurado.');
    error.statusCode = 503;
    error.instructions = 'Preencha OPENAI_API_KEY no .env com a chave real da OpenAI.';
    throw error;
  }

  const size = String(options?.size || '1024x1536').trim() || '1024x1536';
  const quality = String(options?.quality || 'medium').trim() || 'medium';
  const outputFormat = 'webp';

  const upstreamResponse = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_AVATAR_IMAGE_MODEL,
      prompt: promptText,
      size,
      quality,
      output_format: outputFormat
    })
  });

  const responseText = await upstreamResponse.text();
  let payload = null;
  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch (_error) {
    payload = null;
  }

  if (!upstreamResponse.ok) {
    const error = new Error(payload?.error?.message || responseText.slice(0, 500) || 'Falha ao gerar imagem na OpenAI.');
    error.statusCode = upstreamResponse.status;
    throw error;
  }

  const image = Array.isArray(payload?.data) ? payload.data[0] : null;
  const b64 = String(image?.b64_json || '').trim();
  if (!b64) {
    const error = new Error('A OpenAI nao retornou imagem em base64.');
    error.statusCode = 502;
    throw error;
  }

  return {
    mimeType: 'image/webp',
    buffer: Buffer.from(b64, 'base64'),
    usage: payload?.usage || null
  };
}

function buildMiniBookObjectKey(bookId, kind) {
  const safeBookId = normalizeMiniBookId(bookId);
  if (kind === 'background-desktop') {
    return path.posix.join(MINIBOOKS_IMAGE_OBJECT_PREFIX, 'backgrounds', `${safeBookId}-desktop.webp`);
  }
  if (kind === 'background-mobile') {
    return path.posix.join(MINIBOOKS_IMAGE_OBJECT_PREFIX, 'backgrounds', `${safeBookId}-mobile.webp`);
  }
  return path.posix.join(MINIBOOKS_IMAGE_OBJECT_PREFIX, 'covers', `${safeBookId}.webp`);
}

function buildMiniBookAudioObjectKey(bookId, lineIndex) {
  const safeBookId = normalizeMiniBookId(bookId);
  const safeIndex = Math.max(0, Number.parseInt(lineIndex, 10) || 0);
  const fileName = `${String(safeIndex + 1).padStart(3, '0')}.mp3`;
  return path.posix.join(MINIBOOKS_AUDIO_OBJECT_PREFIX, safeBookId, fileName);
}

function extractMiniBookStoryKeyFromStoryId(storyId) {
  const raw = String(storyId || '').trim();
  if (!raw) return '';
  const separatorIndex = raw.lastIndexOf('::');
  if (separatorIndex < 0) return '';
  return String(raw.slice(separatorIndex + 2) || '').trim();
}

function extractMiniBookEditableText(rawValue, fallbackHighlight = false) {
  const raw = String(rawValue || '').trim();
  const highlight = raw.startsWith('#') ? true : Boolean(fallbackHighlight);
  const text = normalizeMiniBookText(raw.startsWith('#') ? raw.slice(1) : raw);
  return {
    text,
    highlight
  };
}

function resolveMiniBookStoryItemsReference(payload, storyKey) {
  const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null;
  const normalizedStoryKey = String(storyKey || '').trim();
  if (!source || !normalizedStoryKey) return null;

  if (Array.isArray(source[normalizedStoryKey])) {
    return {
      items: source[normalizedStoryKey],
      assign(nextItems) {
        source[normalizedStoryKey] = nextItems;
      }
    };
  }

  if (source.stories && typeof source.stories === 'object' && !Array.isArray(source.stories) && Array.isArray(source.stories[normalizedStoryKey])) {
    return {
      items: source.stories[normalizedStoryKey],
      assign(nextItems) {
        source.stories[normalizedStoryKey] = nextItems;
      }
    };
  }

  if (Array.isArray(source.stories)) {
    const storyIndex = source.stories.findIndex((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      const candidateKey = String(entry.storyKey || entry.key || entry.name || entry.title || '').trim();
      return candidateKey === normalizedStoryKey;
    });
    if (storyIndex >= 0) {
      const storyEntry = source.stories[storyIndex];
      if (Array.isArray(storyEntry.cards)) {
        return {
          items: storyEntry.cards,
          assign(nextItems) {
            storyEntry.cards = nextItems;
          }
        };
      }
      if (Array.isArray(storyEntry.items)) {
        return {
          items: storyEntry.items,
          assign(nextItems) {
            storyEntry.items = nextItems;
          }
        };
      }
    }
  }

  return null;
}

function normalizeMiniBookComparableText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const MINI_BOOK_LEVEL_NAME_TO_VALUE = new Map([
  ['iniciante', 1],
  ['basico', 2],
  ['aprendiz', 3],
  ['estudante', 4],
  ['leitor', 5],
  ['intermediario', 6],
  ['experiente', 7],
  ['avancado', 8],
  ['nativo', 9],
  ['expert', 10]
]);

function parseMiniBookLevelFromCreateLine(value) {
  const raw = String(value || '').trim();
  const numeric = Number.parseInt(raw, 10);
  if (Number.isFinite(numeric)) {
    return normalizeSpeakingStoryLevel(numeric);
  }
  const embeddedNumber = raw.match(/\d+/);
  if (embeddedNumber && embeddedNumber[0]) {
    return normalizeSpeakingStoryLevel(Number.parseInt(embeddedNumber[0], 10));
  }
  const normalized = normalizeMiniBookComparableText(value);
  if (!normalized) return null;
  return MINI_BOOK_LEVEL_NAME_TO_VALUE.get(normalized) || null;
}

function parseMiniBookCreateLines(linesText) {
  const lines = String(linesText || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => String(line || '').trim())
    .filter(Boolean);

  if (lines.length < 7) {
    const error = new Error('Preencha pelo menos 7 linhas para criar o livro.');
    error.statusCode = 400;
    throw error;
  }

  const title = normalizeMiniBookText(lines[0]);
  const level = parseMiniBookLevelFromCreateLine(lines[1]);
  const tag = normalizeMiniBookText(lines[2], 'story_1');
  const coverPrompt = normalizeMiniBookText(lines[3]);
  const backgroundPrompt = normalizeMiniBookText(lines[4]);
  const phraseLines = lines.slice(5);

  if (!title) {
    const error = new Error('Linha 1 (titulo) obrigatoria.');
    error.statusCode = 400;
    throw error;
  }
  if (!level) {
    const error = new Error('Linha 2 precisa de nivel valido (1-10 ou nome do nivel).');
    error.statusCode = 400;
    throw error;
  }
  if (!tag) {
    const error = new Error('Linha 3 (tag) obrigatoria.');
    error.statusCode = 400;
    throw error;
  }
  if (!coverPrompt || !backgroundPrompt) {
    const error = new Error('Linhas 4 e 5 com prompts sao obrigatorias.');
    error.statusCode = 400;
    throw error;
  }
  if (phraseLines.length < 2) {
    const error = new Error('Informe pelo menos um par portugues/ingles a partir da linha 6.');
    error.statusCode = 400;
    throw error;
  }
  if ((phraseLines.length % 2) !== 0) {
    const error = new Error('As frases devem estar em pares: portugues e ingles.');
    error.statusCode = 400;
    throw error;
  }

  const pairsCount = phraseLines.length / 2;
  if (pairsCount > 120) {
    const error = new Error('Limite de 120 pares de frases por criacao.');
    error.statusCode = 400;
    throw error;
  }

  const cards = [];
  for (let index = 0; index < phraseLines.length; index += 2) {
    const portuguese = normalizeMiniBookText(phraseLines[index]);
    const rawEnglishLine = String(phraseLines[index + 1] || '').trim();
    const highlight = rawEnglishLine.startsWith('#');
    const english = normalizeMiniBookText(highlight ? rawEnglishLine.slice(1) : rawEnglishLine);
    if (!portuguese || !english) continue;
    cards.push({
      pt: portuguese,
      en: english,
      audio: '',
      highlight
    });
  }

  if (!cards.length) {
    const error = new Error('Nenhum par valido de frases foi encontrado.');
    error.statusCode = 422;
    throw error;
  }

  const bookId = normalizeMiniBookId(title);
  return {
    title,
    level,
    tag,
    storyKey: safeGeneratedBase(tag, 'story_1'),
    coverPrompt,
    backgroundPrompt,
    cards,
    bookId,
    fileName: `${bookId}.json`
  };
}

function stripMiniBookAudioRefreshMarker(value) {
  return String(value || '').replace(/@/g, '');
}

function parseMiniBookUpdateLines(linesText, options = {}) {
  const lines = String(linesText || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => String(line || '').trim())
    .filter(Boolean);

  if (lines.length < 7) {
    const error = new Error('Preencha pelo menos 7 linhas para atualizar o livro.');
    error.statusCode = 400;
    throw error;
  }

  const title = normalizeMiniBookText(lines[0]);
  const level = parseMiniBookLevelFromCreateLine(lines[1]);
  const tag = normalizeMiniBookText(lines[2], 'story_1');
  const coverLine = normalizeMiniBookText(lines[3]);
  const backgroundLine = normalizeMiniBookText(lines[4]);
  const phraseLines = lines.slice(5);
  const currentCards = Array.isArray(options.currentCards) ? options.currentCards : [];

  if (!title) {
    const error = new Error('Linha 1 (titulo) obrigatoria.');
    error.statusCode = 400;
    throw error;
  }
  if (!level) {
    const error = new Error('Linha 2 precisa de nivel valido (1-10 ou nome do nivel).');
    error.statusCode = 400;
    throw error;
  }
  if (!tag) {
    const error = new Error('Linha 3 (tag) obrigatoria.');
    error.statusCode = 400;
    throw error;
  }
  if (phraseLines.length < 2) {
    const error = new Error('Informe pelo menos um par portugues/ingles a partir da linha 6.');
    error.statusCode = 400;
    throw error;
  }
  if ((phraseLines.length % 2) !== 0) {
    const error = new Error('As frases devem estar em pares: portugues e ingles.');
    error.statusCode = 400;
    throw error;
  }

  const coverPromptChanged = normalizeMiniBookComparableText(coverLine) !== normalizeMiniBookComparableText('Capa');
  const backgroundPromptChanged = normalizeMiniBookComparableText(backgroundLine) !== normalizeMiniBookComparableText('Background');
  const coverPrompt = coverPromptChanged
    ? normalizeMiniBookText(coverLine)
    : normalizeMiniBookText(options.coverPrompt);
  const backgroundPrompt = backgroundPromptChanged
    ? normalizeMiniBookText(backgroundLine)
    : normalizeMiniBookText(options.backgroundPrompt);

  if (coverPromptChanged && !coverPrompt) {
    const error = new Error('Se editar a linha 4, envie um prompt valido para a capa.');
    error.statusCode = 400;
    throw error;
  }
  if (backgroundPromptChanged && !backgroundPrompt) {
    const error = new Error('Se editar a linha 5, envie um prompt valido para o background.');
    error.statusCode = 400;
    throw error;
  }

  const pairsCount = phraseLines.length / 2;
  if (pairsCount > 120) {
    const error = new Error('Limite de 120 pares de frases por atualizacao.');
    error.statusCode = 400;
    throw error;
  }

  const cards = [];
  for (let index = 0; index < phraseLines.length; index += 2) {
    const rawPortugueseLine = String(phraseLines[index] || '').trim();
    const rawEnglishLine = String(phraseLines[index + 1] || '').trim();
    const shouldRegenerateAudio = rawPortugueseLine.includes('@') || rawEnglishLine.includes('@');
    const portuguese = normalizeMiniBookText(stripMiniBookAudioRefreshMarker(rawPortugueseLine));
    const cleanEnglishLine = String(stripMiniBookAudioRefreshMarker(rawEnglishLine)).trim();
    const highlight = cleanEnglishLine.startsWith('#');
    const english = normalizeMiniBookText(highlight ? cleanEnglishLine.slice(1) : cleanEnglishLine);
    if (!portuguese || !english) continue;
    cards.push({
      pt: portuguese,
      en: english,
      audio: normalizeMiniBookText(currentCards[index / 2]?.audio),
      highlight,
      regenerateAudio: shouldRegenerateAudio
    });
  }

  if (!cards.length) {
    const error = new Error('Nenhum par valido de frases foi encontrado.');
    error.statusCode = 422;
    throw error;
  }

  return {
    title,
    level,
    tag,
    storyKey: safeGeneratedBase(tag, 'story_1'),
    coverPrompt,
    backgroundPrompt,
    coverPromptChanged,
    backgroundPromptChanged,
    cards,
    bookId: normalizeMiniBookId(options.bookId || title),
    fileName: normalizeMiniBookText(options.fileName, `${normalizeMiniBookId(options.bookId || title)}.json`)
  };
}

async function generateMiniBookSpeechWithOpenAi(text, options = {}) {
  const input = String(text || '').trim();
  if (!input) {
    const error = new Error('Texto vazio para gerar audio.');
    error.statusCode = 400;
    throw error;
  }
  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('fake')) {
    const error = new Error('OpenAI nao configurada.');
    error.statusCode = 503;
    error.instructions = 'Preencha OPENAI_API_KEY no .env com a chave real da OpenAI.';
    throw error;
  }

  const voice = normalizeMiniBookText(options.voice, 'fable');

  const upstreamResponse = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_TTS_MODEL,
      voice,
      input,
      format: 'mp3'
    })
  });

  if (!upstreamResponse.ok) {
    const errorText = await upstreamResponse.text();
    const error = new Error(errorText.slice(0, 500) || 'Falha ao gerar audio na OpenAI.');
    error.statusCode = upstreamResponse.status;
    throw error;
  }

  const audioBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
  if (!audioBuffer.length) {
    const error = new Error('A OpenAI nao retornou audio para a frase.');
    error.statusCode = 502;
    throw error;
  }

  return {
    mimeType: 'audio/mpeg',
    buffer: audioBuffer,
    voice
  };
}

async function generateMiniBookSpeechWithElevenLabs(text, options = {}) {
  const input = String(text || '').trim();
  if (!input) {
    const error = new Error('Texto vazio para gerar audio.');
    error.statusCode = 400;
    throw error;
  }

  const requestedVoice = String(options.voice || '').trim().toLowerCase();
  const isBurtRaynalds = requestedVoice === 'burt-raynalds' || requestedVoice === 'burt' || requestedVoice === 'burt-raynolds';
  const voiceId = isBurtRaynalds ? ELEVENLABS_VOICE_ID_BURT_RAYNALDS : ELEVENLABS_VOICE_ID_HARRY;
  const voiceLabel = isBurtRaynalds ? 'burt-raynalds' : 'harry';

  if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY.includes('fake') || !voiceId || voiceId.includes('fake')) {
    const error = new Error(`ElevenLabs nao configurado para voz ${isBurtRaynalds ? 'Burt Raynalds' : 'Harry'}.`);
    error.statusCode = 503;
    error.instructions = isBurtRaynalds
      ? 'Preencha ELEVENLABS_API_KEY e ELEVENLABS_VOICE_ID_BURT_RAYNALDS no .env com os valores reais.'
      : 'Preencha ELEVENLABS_API_KEY e ELEVENLABS_VOICE_ID_HARRY no .env com os valores reais.';
    throw error;
  }

  const languageCode = /^[a-z]{2}$/i.test(options.languageCode || '')
    ? String(options.languageCode).toLowerCase()
    : '';

  const upstreamResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text: input,
      model_id: ELEVENLABS_MODEL_ID,
      ...(languageCode ? { language_code: languageCode } : {}),
      output_format: 'mp3_44100_128'
    })
  });

  if (!upstreamResponse.ok) {
    const errorText = await upstreamResponse.text();
    const error = new Error(errorText.slice(0, 500) || 'Falha ao gerar audio na ElevenLabs.');
    error.statusCode = upstreamResponse.status;
    throw error;
  }

  const audioBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
  if (!audioBuffer.length) {
    const error = new Error('A ElevenLabs nao retornou audio para a frase.');
    error.statusCode = 502;
    throw error;
  }

  return {
    mimeType: 'audio/mpeg',
    buffer: audioBuffer,
    voice: voiceLabel
  };
}

function normalizeMiniBookSlugFromValue(value, fallback = 'mini-book') {
  return safeGeneratedBase(value, fallback)
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || fallback;
}

function clampMiniBookSentenceLine(value, maxChars = 27) {
  const clean = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return '';
  if (clean.length <= maxChars) return clean;
  const sliced = clean.slice(0, maxChars).trim();
  const lastSpace = sliced.lastIndexOf(' ');
  if (lastSpace >= Math.max(5, Math.floor(maxChars * 0.55))) {
    return sliced.slice(0, lastSpace).trim();
  }
  return sliced;
}

function parseMiniBookAudioSelection(rawValue) {
  const normalized = String(rawValue || '').trim().toLowerCase();
  if (normalized === 'elevenlabs:harry' || normalized === 'harry') {
    return {
      provider: 'elevenlabs',
      voice: 'harry',
      voiceLabel: 'harry'
    };
  }
  if (
    normalized === 'elevenlabs:burt-raynalds'
    || normalized === 'burt-raynalds'
    || normalized === 'burt'
    || normalized === 'burt raynalds'
    || normalized === 'elevenlabs:burt'
  ) {
    return {
      provider: 'elevenlabs',
      voice: 'burt-raynalds',
      voiceLabel: 'burt-raynalds'
    };
  }

  const rawVoice = normalized.startsWith('openai:')
    ? normalized.slice('openai:'.length)
    : normalized;
  const openAiVoice = MINIBOOKS_ALLOWED_OPENAI_VOICES.has(rawVoice) ? rawVoice : 'fable';
  return {
    provider: 'openai',
    voice: openAiVoice,
    voiceLabel: openAiVoice
  };
}

function buildMiniBookLinesTextFromWriterJson(rawPayload, options = {}) {
  const source = rawPayload && typeof rawPayload === 'object' ? rawPayload : {};
  const requestedChars = Math.max(0, Math.min(1500, Number.parseInt(options.targetChars, 10) || 0));

  const title = normalizeMiniBookText(
    source.title || source.bookTitle || source.nome,
    `Mini Book ${new Date().getUTCSeconds()}`
  );
  const level = parseMiniBookLevelFromCreateLine(source.level || source.nivel || source.englishLevel) || 1;
  const slug = normalizeMiniBookSlugFromValue(source.slug || source.tag || source.storyKey || title, 'mini-book');

  const coverPrompt = normalizeMiniBookText(
    source.coverPrompt || source.cover || source.dalleCoverPrompt,
    `Professional bestseller book cover, 9:16, theme "${title}", title and logline in Portuguese, typography harmonized with the theme, premium editorial design, creative high-quality composition, colors and style aligned to the theme, no watermark, no extra logo.`
  ).slice(0, 420);

  const backgroundPrompt = normalizeMiniBookText(
    source.backgroundPrompt || source.background || source.dalleBackgroundPrompt,
    `Bright creative high-quality background for "${title}", coherent palette, abstract if the theme fits, elegant depth, clear visual space for overlays, colors and mood aligned with the theme, no watermark, no logo.`
  ).slice(0, 420);

  const rawPairs = Array.isArray(source.pairs)
    ? source.pairs
    : Array.isArray(source.lines)
      ? source.lines
      : [];

  const pairs = rawPairs
    .map((entry) => {
      const pt = clampMiniBookSentenceLine(entry?.pt || entry?.portuguese || entry?.linePt || entry?.linhaPt || '');
      const en = clampMiniBookSentenceLine(entry?.en || entry?.english || entry?.lineEn || entry?.linhaEn || '');
      if (!pt || !en) return null;
      return { pt, en };
    })
    .filter(Boolean);

  if (!pairs.length) {
    const fallbackPairs = [
      { pt: 'Eu escolho aprender hoje', en: 'I choose learning today' },
      { pt: 'Leio com calma e constancia', en: 'I read calmly every day' },
      { pt: 'Cada pagina abre caminhos', en: 'Each page opens new paths' },
      { pt: 'Com respeito e equilibrio', en: 'With respect and balance' }
    ].map((entry) => ({
      pt: clampMiniBookSentenceLine(entry.pt),
      en: clampMiniBookSentenceLine(entry.en)
    }));
    pairs.push(...fallbackPairs);
  }

  const lines = [
    title,
    String(level),
    slug,
    coverPrompt,
    backgroundPrompt
  ];

  pairs.forEach((pair) => {
    lines.push(pair.pt, pair.en);
  });

  const englishChars = pairs.reduce((total, pair) => total + pair.en.length, 0);
  return {
    title,
    level,
    slug,
    linesText: lines.join('\n'),
    pairsCount: pairs.length,
    englishChars,
    requestedChars
  };
}

function buildMiniBookJsonPayloadFromCreateInput(createInput) {
  const payload = {
    bookId: createInput.bookId,
    fileName: createInput.fileName,
    nome: createInput.title,
    nivel: createInput.level,
    tag: createInput.tag,
    prompts: {
      cover: createInput.coverPrompt,
      background: createInput.backgroundPrompt
    }
  };
  payload[createInput.storyKey] = createInput.cards.map((card) => ({
    pt: card.pt,
    en: card.en,
    audio: normalizeMiniBookText(card.audio),
    highlight: Boolean(card.highlight)
  }));
  return payload;
}

function buildMiniBookJsonPayloadFromUpdatedInput(source, updateInput) {
  const sourcePayload = source?.payload && typeof source.payload === 'object' && !Array.isArray(source.payload)
    ? source.payload
    : {};
  const nextPayload = {
    ...sourcePayload,
    bookId: source.bookId,
    fileName: source.fileName,
    nome: updateInput.title,
    title: updateInput.title,
    nivel: updateInput.level,
    level: updateInput.level,
    tag: updateInput.tag,
    prompts: {
      ...(sourcePayload.prompts && typeof sourcePayload.prompts === 'object' && !Array.isArray(sourcePayload.prompts)
        ? sourcePayload.prompts
        : {}),
      cover: updateInput.coverPrompt,
      background: updateInput.backgroundPrompt
    }
  };

  const parsedSource = buildMiniBookStoriesFromJsonPayload(sourcePayload, {
    bookId: source.bookId,
    fileName: source.fileName,
    bookTitle: source.title,
    level: source.level
  });
  parsedSource.stories.forEach((story) => {
    delete nextPayload[story.storyKey];
  });

  const nextItems = updateInput.cards.map((card) => ({
    pt: card.pt,
    en: card.en,
    audio: normalizeMiniBookText(card.audio),
    highlight: Boolean(card.highlight)
  }));

  if (Array.isArray(sourcePayload.stories)) {
    nextPayload.stories = [{
      storyKey: updateInput.storyKey,
      cards: nextItems
    }];
  } else if (sourcePayload.stories && typeof sourcePayload.stories === 'object' && !Array.isArray(sourcePayload.stories)) {
    nextPayload.stories = {
      [updateInput.storyKey]: nextItems
    };
  } else {
    nextPayload[updateInput.storyKey] = nextItems;
  }

  return nextPayload;
}

function sortFluencyObjectKeys(left, right) {
  const leftName = path.basename(left).toLowerCase();
  const rightName = path.basename(right).toLowerCase();
  const leftPack = leftName.match(/^pack(\d+)\.json$/);
  const rightPack = rightName.match(/^pack(\d+)\.json$/);

  if (leftPack && rightPack) {
    return Number(leftPack[1]) - Number(rightPack[1]);
  }

  if (leftPack) return -1;
  if (rightPack) return 1;
  return leftName.localeCompare(rightName, 'pt-BR', { numeric: true, sensitivity: 'base' });
}

async function listR2ObjectKeys(prefix) {
  try {
    const response = await getR2Client().send(new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: 1000
    }));
    const contents = Array.isArray(response?.Contents) ? response.Contents : [];
    return contents
      .map(entry => String(entry?.Key || '').trim())
      .filter(Boolean);
  } catch (error) {
    const details = error?.message || error?.Code || String(error);
    throw new Error(`R2 LIST ${prefix} falhou: ${details}`.trim());
  }
}

async function listAllR2ObjectKeys(prefix) {
  const allKeys = [];
  let continuationToken = '';

  while (true) {
    try {
      const response = await getR2Client().send(new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix,
        MaxKeys: 1000,
        ContinuationToken: continuationToken || undefined
      }));
      const contents = Array.isArray(response?.Contents) ? response.Contents : [];
      allKeys.push(
        ...contents
          .map(entry => String(entry?.Key || '').trim())
          .filter(Boolean)
      );

      if (!response?.IsTruncated || !response?.NextContinuationToken) {
        break;
      }

      continuationToken = response.NextContinuationToken;
    } catch (error) {
      const details = error?.message || error?.Code || String(error);
      throw new Error(`R2 LIST ${prefix} falhou: ${details}`.trim());
    }
  }

  return allKeys;
}

function sortR2ObjectKeysAlphabetically(left, right) {
  return String(left || '').localeCompare(String(right || ''), 'pt-BR', {
    numeric: true,
    sensitivity: 'base'
  });
}

async function resolveFluencyPhaseObjectKey(dayNumber, phaseNumber) {
  const prefix = `Niveis/${String(dayNumber).padStart(3, '0')}/${levelPhaseFolderFromPhaseNumber(phaseNumber)}/`;
  const keys = await listR2ObjectKeys(prefix);
  const jsonKeys = keys
    .filter(key => key.startsWith(prefix) && key.toLowerCase().endsWith('.json'))
    .sort(sortFluencyObjectKeys);
  return jsonKeys[0] || null;
}

async function fetchR2JsonObject(objectKey) {
  try {
    const response = await getR2Client().send(new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey
    }));
    const raw = (await readR2BodyAsBuffer(response?.Body)).toString('utf8');
    return JSON.parse(raw);
  } catch (error) {
    const status = Number(error?.$metadata?.httpStatusCode || 0);
    if (status === 404 || error?.Code === 'NoSuchKey') {
      const notFound = new Error(`R2 GET ${objectKey} falhou: 404 Not Found`);
      notFound.status = 404;
      throw notFound;
    }
    const details = error?.message || error?.Code || String(error);
    throw new Error(`R2 GET ${objectKey} falhou: ${details}`.trim());
  }
}

async function fetchR2ObjectBuffer(objectKey) {
  try {
    const response = await getR2Client().send(new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey
    }));
    return readR2BodyAsBuffer(response?.Body);
  } catch (error) {
    const status = Number(error?.$metadata?.httpStatusCode || 0);
    if (status === 404 || error?.Code === 'NoSuchKey') {
      const notFound = new Error(`R2 GET ${objectKey} falhou: 404 Not Found`);
      notFound.status = 404;
      throw notFound;
    }
    const details = error?.message || error?.Code || String(error);
    throw new Error(`R2 GET ${objectKey} falhou: ${details}`.trim());
  }
}

function buildStorageTreeFromObjectKeys(objectKeys, rootLabel = 'Niveis') {
  const root = {
    name: rootLabel,
    path: `${rootLabel}/`,
    type: 'folder',
    children: new Map()
  };

  for (const objectKey of objectKeys) {
    const normalizedKey = String(objectKey || '').replace(/^\/+/, '');
    if (!normalizedKey) continue;

    const parts = normalizedKey.split('/').filter(Boolean);
    if (!parts.length) continue;

    let currentNode = root;
    let currentPath = '';

    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLastPart = index === parts.length - 1;
      const type = isLastPart ? 'file' : 'folder';

      if (!currentNode.children.has(part)) {
        currentNode.children.set(part, {
          name: part,
          path: type === 'folder' ? `${currentPath}/` : currentPath,
          type,
          children: type === 'folder' ? new Map() : undefined
        });
      }

      currentNode = currentNode.children.get(part);
    }
  }

  const sortEntries = (left, right) => {
    if (left.type !== right.type) {
      return left.type === 'folder' ? -1 : 1;
    }
    return String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR', {
      numeric: true,
      sensitivity: 'base'
    });
  };

  const finalizeNode = (node) => {
    if (!node || node.type !== 'folder') {
      return {
        name: node?.name || '',
        path: node?.path || '',
        type: node?.type || 'file'
      };
    }

    const children = Array.from(node.children.values())
      .map(finalizeNode)
      .sort(sortEntries);

    return {
      name: node.name,
      path: node.path,
      type: node.type,
      children
    };
  };

  return finalizeNode(root);
}

function getLocalLevelsFolderFromPhaseNumber(phaseNumber) {
  if (Number(phaseNumber) === 11) return 'talking';
  if (Number(phaseNumber) === 12) return 'watching';
  return 'others';
}

function getLocalLevelJsonFileName(dayNumber) {
  return `day-${dayNumber}.json`;
}

function resolveLocalLevelJsonPath(dayNumber, phaseNumber) {
  const folderName = getLocalLevelsFolderFromPhaseNumber(phaseNumber);
  const fileName = getLocalLevelJsonFileName(dayNumber);
  return path.join(LOCAL_LEVELS_ROOT, folderName, fileName);
}

function resolveLocalWordsJsonPath(fileName) {
  const normalizedFileName = path.basename(String(fileName || ''));
  return path.join(LOCAL_LEVELS_ROOT, 'words', normalizedFileName);
}

async function listLocalWordsDeckFiles() {
  const wordsRoot = path.join(LOCAL_LEVELS_ROOT, 'words');
  const entries = await fs.promises.readdir(wordsRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.json')
    .map((entry) => entry.name)
    .sort((left, right) => String(left).localeCompare(String(right), 'pt-BR', {
      numeric: true,
      sensitivity: 'base'
    }));
}

function buildR2DebugPayload(error, extra = {}) {
  return {
    configured: isR2FluencyConfigured(),
    bucket: R2_BUCKET_NAME || '',
    endpoint: R2_ENDPOINT || '',
    accessKeyIdLength: R2_ACCESS_KEY_ID ? R2_ACCESS_KEY_ID.length : 0,
    secretAccessKeyLength: R2_SECRET_ACCESS_KEY ? R2_SECRET_ACCESS_KEY.length : 0,
    requestUrl: error?.requestUrl || '',
    requestMethod: error?.requestMethod || '',
    pathName: error?.pathName || '',
    queryParams: error?.queryParams || null,
    status: Number.isFinite(error?.status) ? error.status : null,
    statusText: error?.statusText || '',
    code: error?.code || '',
    message: error?.message || '',
    body: typeof error?.body === 'string' ? error.body.slice(0, 4000) : '',
    ...extra
  };
}

 

async function collectImageFiles(directory) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectImageFiles(fullPath));
    } else if (entry.isFile() && SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push({ name: entry.name, relativePath: path.relative(IMAGES_ROOT, fullPath) });
    }
  }

  return files;
}

async function refreshImageIndex() {
  try {
    const files = await collectImageFiles(IMAGES_ROOT);
    imageIndex = new Map(files.map(file => [file.name, file.relativePath]));
    imageLevelIndex = new Map(
      files.map(file => [file.name, extractLevelFromRelativePath(file.relativePath)])
    );
  } catch (error) {
    console.error('Erro ao mapear arquivos de imagem:', error);
    imageIndex = new Map();
    imageLevelIndex = new Map();
  }
}

async function resolveImagePath(fileName) {
  if (!fileName) return null;

  if (!imageIndex) {
    await refreshImageIndex();
  }

  let relativePath = imageIndex.get(fileName);

  if (relativePath) {
    const candidatePath = path.join(IMAGES_ROOT, relativePath);
    try {
      await fs.promises.access(candidatePath);
      return candidatePath;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  await refreshImageIndex();
  relativePath = imageIndex.get(fileName);

  return relativePath ? path.join(IMAGES_ROOT, relativePath) : null;
}

async function collectMediaFiles(directory, rootDir) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      files.push(...await collectMediaFiles(fullPath, rootDir));
    } else if (entry.isFile() && SUPPORTED_MEDIA_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push({ name: entry.name, relativePath: path.relative(rootDir, fullPath) });
    }
  }

  return files;
}

async function refreshMediaIndex() {
  const roots = MEDIA_DIR_CANDIDATES
    .map(dir => path.join(staticDir, dir))
    .filter(dir => fs.existsSync(dir));
  const files = [];

  for (const root of roots) {
    files.push(...await collectMediaFiles(root, staticDir));
  }

  mediaIndex = new Map(files.map(file => [file.name, file.relativePath]));
}

async function resolveMediaUrl(fileName) {
  if (!fileName) return null;

  const normalized = fileName.replace(/\\/g, '/');
  const baseName = path.basename(normalized);
  const ext = path.extname(baseName).toLowerCase();

  if (FORCE_R2_GAME_SOUND_FILES.has(baseName)) {
    return `${GAME_SOUNDS_BASE_URL}/${encodeURIComponent(baseName)}`;
  }

  if (ext && !SUPPORTED_MEDIA_EXTENSIONS.has(ext)) {
    return null;
  }

  const directPath = path.join(staticDir, baseName);
  try {
    await fs.promises.access(directPath);
    return `/${baseName}`;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  if (!mediaIndex) {
    await refreshMediaIndex();
  }

  let relativePath = mediaIndex.get(baseName);

  if (relativePath) {
    return `/${relativePath.replace(/\\/g, '/')}`;
  }

  await refreshMediaIndex();
  relativePath = mediaIndex.get(baseName);

  return relativePath ? `/${relativePath.replace(/\\/g, '/')}` : null;
}

async function collectVoiceFiles(directory) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectVoiceFiles(fullPath));
    } else if (entry.isFile() && SUPPORTED_AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push({ name: entry.name, relativePath: path.relative(VOICES_ROOT, fullPath) });
    }
  }

  return files;
}

async function refreshVoiceIndex() {
  try {
    const files = await collectVoiceFiles(VOICES_ROOT);
    voiceIndex = new Map(files.map(file => [file.name, file.relativePath]));
  } catch (error) {
    console.error('Erro ao mapear arquivos de áudio:', error);
    voiceIndex = new Map();
  }
}

async function resolveVoicePath(filePathOrName) {
  if (!filePathOrName) return null;

  const normalized = filePathOrName.replace(/\\/g, '/');
  const ext = path.extname(normalized).toLowerCase();
  if (ext && !SUPPORTED_AUDIO_EXTENSIONS.has(ext)) return null;

  if (normalized.includes('/')) {
    const safePath = path.normalize(normalized).replace(/^([.]{2}[\\/])+/g, '');
    const candidate = path.resolve(VOICES_ROOT, safePath);
    if (candidate.startsWith(VOICES_ROOT)) {
      try {
        await fs.promises.access(candidate);
        return candidate;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  }

  if (!voiceIndex) {
    await refreshVoiceIndex();
  }

  const baseName = path.basename(normalized);
  let relativePath = voiceIndex.get(baseName);

  if (relativePath) {
    const candidatePath = path.join(VOICES_ROOT, relativePath);
    try {
      await fs.promises.access(candidatePath);
      return candidatePath;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  await refreshVoiceIndex();
  relativePath = voiceIndex.get(baseName);

  return relativePath ? path.join(VOICES_ROOT, relativePath) : null;
}

function ensureVoiceDirectories() {
  if (!fs.existsSync(VOICES_ROOT)) {
    fs.mkdirSync(VOICES_ROOT, { recursive: true });
  }

  for (let folder = 1; folder <= 50; folder += 1) {
    const dirPath = path.join(VOICES_ROOT, String(folder));
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}

ensureVoiceDirectories();

function createAuthToken(user) {
  if (!JWT_SECRET) {
    return null;
  }

  return jwt.sign(
    { sub: user.id, username: user.username || user.email || '' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function normalizeUsername(raw) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  return value.slice(0, 32);
}

function isValidUsername(username) {
  if (!username) return false;
  return /^[a-zA-Z0-9._ -]{3,32}$/.test(username);
}

function buildLegacyEmailFromUsername(username) {
  return String(username || '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase();
}

function buildRandomUserSuffix(length = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

async function generateAvailableUsername(basePrefix = 'USER') {
  await ensureUsersAvatarColumn();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const username = `${basePrefix}${buildRandomUserSuffix(8)}`;
    const existing = await pool.query(
      'SELECT 1 FROM public.users WHERE email = $1 OR username = $2 LIMIT 1',
      [buildLegacyEmailFromUsername(username), username]
    );
    if (!existing.rows.length) {
      return username;
    }
  }
  throw new Error('Nao foi possivel gerar um nome automatico.');
}

async function uploadUserAvatarToR2(user, imageDataUrl, label = 'avatar') {
  const parsedImage = parseBase64DataUrl(imageDataUrl);
  if (!parsedImage?.buffer?.length || !/^image\//i.test(parsedImage.mimeType || '')) {
    return '';
  }
  if (!isR2FluencyConfigured()) {
    return '';
  }
  const extension = 'webp';
  const contentType = 'image/webp';
  const usernameFolder = safeGeneratedBase(user?.username || user?.email || `user-${user?.id || 'anon'}`, 'user');
  const objectKey = `${usernameFolder}/${safeGeneratedBase(label, 'avatar')}-${Date.now()}.${extension}`;
  await putR2Object(objectKey, parsedImage.buffer, contentType);
  return buildFlashcardsR2PublicUrl(objectKey);
}

function buildMiniBookEditorLinesPayload(source, manifestEntry = {}) {
  if (!source?.payload || typeof source.payload !== 'object' || Array.isArray(source.payload)) {
    return null;
  }

  const parsed = buildMiniBookStoriesFromJsonPayload(source.payload, {
    bookId: source.bookId,
    fileName: source.fileName,
    bookTitle: source.title,
    level: source.level
  });
  const primaryStory = Array.isArray(parsed.stories) ? parsed.stories[0] : null;
  if (!primaryStory || !Array.isArray(primaryStory.cards) || !primaryStory.cards.length) {
    return null;
  }

  const rawPrompts = source.payload?.prompts && typeof source.payload.prompts === 'object' && !Array.isArray(source.payload.prompts)
    ? source.payload.prompts
    : {};
  const title = normalizeMiniBookText(source.payload?.nome || source.payload?.title, source.title);
  const level = normalizeSpeakingStoryLevel(source.payload?.nivel ?? source.payload?.level ?? source.level);
  const tag = normalizeMiniBookText(source.payload?.tag || primaryStory.storyKey, 'story_1');
  const coverPrompt = normalizeMiniBookText(
    rawPrompts.cover || source.payload?.coverPrompt || manifestEntry?.coverPrompt,
    ''
  );
  const backgroundPrompt = normalizeMiniBookText(
    rawPrompts.background || source.payload?.backgroundPrompt || manifestEntry?.backgroundPrompt,
    ''
  );

  const lines = [
    title,
    String(level),
    tag,
    'Capa',
    'Background'
  ];
  primaryStory.cards.forEach((card) => {
    const portuguese = normalizeMiniBookText(card?.portuguese || card?.pt);
    const english = normalizeMiniBookText(card?.english || card?.en);
    if (!portuguese || !english) return;
    lines.push(portuguese, `${card?.highlight ? '#' : ''}${english}`);
  });

  return {
    bookId: source.bookId,
    fileName: source.fileName,
    title,
    level,
    storyKey: tag,
    coverPrompt,
    backgroundPrompt,
    cards: primaryStory.cards.map((card) => ({
      pt: normalizeMiniBookText(card?.portuguese || card?.pt),
      en: normalizeMiniBookText(card?.english || card?.en),
      audio: normalizeMiniBookText(card?.audio || card?.audioUrl),
      highlight: Boolean(card?.highlight)
    })),
    linesText: lines.join('\n')
  };
}

async function generateAvatarCartoonWithOpenAI({
  imageDataUrl,
  prompt = '',
  fileNameHint = 'playtalk-avatar-cartoon',
  size = '1024x1024',
  quality = 'low',
  outputFormat = 'png',
  background = 'transparent'
}) {
  const parsedImage = parseBase64DataUrl(imageDataUrl);
  if (!parsedImage?.buffer?.length || !/^image\//i.test(parsedImage.mimeType || '')) {
    const error = new Error('Imagem invalida para transformar em desenho.');
    error.statusCode = 400;
    throw error;
  }
  if (parsedImage.buffer.length > 8 * 1024 * 1024) {
    const error = new Error('Imagem muito grande. Envie uma foto menor que 8 MB.');
    error.statusCode = 413;
    throw error;
  }
  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('fake')) {
    const error = new Error('OpenAI nao configurado.');
    error.statusCode = 503;
    error.instructions = 'Preencha OPENAI_API_KEY no .env com a chave real da OpenAI.';
    throw error;
  }

  const stylePrompt = prompt || [
    'Analyze the uploaded user photo and recreate the same person as a high-end animated portrait.',
    'Preserve identity, facial proportions, hairstyle, skin tone, gaze direction, and overall expression.',
    'Make the person look naturally a bit fitter, healthier, more alive, happier, and lighter in aura, with cleaner skin and flattering presentation while keeping them recognizably the same person.',
    'If the subject appears slightly overweight, reduce it only subtly and tastefully while preserving identity and realism.',
    'If the subject is clearly an adult and appears over about 40 years old, make them look only a little younger, around five years younger, while preserving realism and identity.',
    'Render it as a polished premium 3D animated portrait with cinematic lighting, soft shadows, vibrant colors, detailed textures, gentle depth of field, premium 4k animation quality.',
    'Use transparent background only (alpha channel). Do not add beach, sky, scenery, room, wall, gradients, floor, objects, or any backdrop.',
    'Keep only the person cut out cleanly with smooth edges and no background pixels.',
    'Keep the composition close to the original photo and use only the uploaded photo as reference.',
    'Do not invent props, toys, shoulder characters, extra accessories, extra people, text, logos, or watermarks.',
    'Keep the final image clean, premium, warm, and visually uplifting.'
  ].join(' ');

  const extension = extensionFromMimeType(parsedImage.mimeType);
  const fileName = `avatar-source.${extension}`;
  const imageBlob = new Blob([parsedImage.buffer], { type: parsedImage.mimeType });
  const formData = new FormData();
  formData.append('model', OPENAI_AVATAR_IMAGE_MODEL);
  formData.append('prompt', stylePrompt);
  formData.append('image', imageBlob, fileName);
  formData.append('size', size);
  formData.append('quality', quality);
  formData.append('output_format', outputFormat);
  formData.append('background', background);

  const upstreamResponse = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: formData
  });

  const responseText = await upstreamResponse.text();
  let payload = null;
  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch (_error) {
    payload = null;
  }

  if (!upstreamResponse.ok) {
    const error = new Error(payload?.error?.message || responseText.slice(0, 500) || 'Falha ao transformar avatar na OpenAI.');
    error.statusCode = upstreamResponse.status || 502;
    throw error;
  }

  const image = Array.isArray(payload?.data) ? payload.data[0] : null;
  const b64 = image?.b64_json;
  if (!b64) {
    const error = new Error('A OpenAI nao retornou a imagem editada em base64.');
    error.statusCode = 502;
    throw error;
  }

  const safeExt = outputFormat === 'jpeg' ? 'jpg' : outputFormat === 'png' ? 'png' : 'webp';
  const mimeType = safeExt === 'jpg' ? 'image/jpeg' : safeExt === 'png' ? 'image/png' : 'image/webp';
  const finalFileName = `${safeGeneratedBase(fileNameHint)}-${Date.now()}.${safeExt}`;

  return {
    success: true,
    fileName: finalFileName,
    model: OPENAI_AVATAR_IMAGE_MODEL,
    dataUrl: `data:${mimeType};base64,${b64}`,
    usage: payload?.usage || null
  };
}

async function queueBotAvatarGeneration({ userId, sourceImageDataUrl }) {
  const normalizedUserId = Number(userId) || 0;
  if (!normalizedUserId || !sourceImageDataUrl || !pool) return;

  (async () => {
    try {
      const generated = await generateAvatarCartoonWithOpenAI({
        imageDataUrl: sourceImageDataUrl,
        fileNameHint: `bot-avatar-${normalizedUserId}`
      });
      const user = await readUserById(normalizedUserId);
      if (!user) {
        throw new Error('Bot nao encontrado para salvar avatar.');
      }
      const avatarUrl = await uploadUserAvatarToR2(user, generated.dataUrl, 'bot-avatar-current');
      const fallbackAvatar = avatarUrl || generated.dataUrl;
      await pool.query(
        `UPDATE public.users
         SET avatar_image = $2,
             onboarding_photo_completed = true,
             bot_avatar_status = 'ready',
             bot_avatar_error = NULL
         WHERE id = $1`,
        [normalizedUserId, fallbackAvatar]
      );
    } catch (error) {
      console.error(`Erro ao gerar avatar do bot ${normalizedUserId}:`, error);
      await pool.query(
        `UPDATE public.users
         SET bot_avatar_status = 'error',
             bot_avatar_error = $2
         WHERE id = $1`,
        [normalizedUserId, String(error?.message || 'Falha ao gerar avatar.').slice(0, 300)]
      ).catch(() => null);
    }
  })();
}

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};

  return header.split(';').reduce((acc, part) => {
    const [name, ...valueParts] = part.trim().split('=');
    if (!name) return acc;
    acc[name] = decodeURIComponent(valueParts.join('='));
    return acc;
  }, {});
}

function readBearerToken(req) {
  const header = req.headers?.authorization;
  if (typeof header !== 'string') return '';
  const trimmed = header.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^Bearer\s+(.+)$/i);
  return String(match?.[1] || '').trim();
}

function getAuthenticatedUserFromRequest(req) {
  if (!JWT_SECRET) return null;

  const cookies = parseCookies(req);
  const token = cookies.playtalk_token || readBearerToken(req);
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function setAuthCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production';
  const parts = [
    `playtalk_token=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=604800'
  ];

  if (secure) {
    parts.push('Secure');
  }

  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', 'playtalk_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

async function readAuthenticatedUserFromRequest(req) {
  const payload = getAuthenticatedUserFromRequest(req);
  if (!payload) return null;
  const user = await readUserById(payload.sub);
  if (user) {
    return user;
  }
  return {
    id: Number(payload.sub) || 0,
    email: String(payload.username || '').trim(),
    username: String(payload.username || '').trim(),
    avatar_image: '',
    avatar_versions: [],
    avatar_generation_count: 0,
    onboarding_name_completed: false,
    onboarding_photo_completed: false,
    created_at: null
  };
}

app.post('/register', async (req, res) => {
  try {
    if (!pool) {
      res.status(500).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }
    const username = normalizeUsername(req.body.username || req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!isValidUsername(username) || !password) {
      res.status(400).json({ success: false, message: 'Nome de usuario e senha sao obrigatorios.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const email = buildLegacyEmailFromUsername(username);
    const avatarImage = normalizeAvatarImage(req.body.avatar || '');
    await ensureUsersAvatarColumn();
    await ensurePremiumAccessTables();

    const result = await pool.query(
      `INSERT INTO public.users (
         email, username, password_hash, avatar_image,
         onboarding_name_completed, onboarding_photo_completed
       )
       VALUES ($1, $2, $3, $4, true, $5)
       RETURNING id, email, username, avatar_image, avatar_versions, avatar_generation_count,
                 onboarding_name_completed, onboarding_photo_completed,
                 created_at, password_hash, premium_full_access, premium_until`,
      [email, username, passwordHash, avatarImage || null, Boolean(avatarImage)]
    );

    const user = result.rows[0];
    try {
      await syncFlashcardRankingForUser(user.id, 0);
    } catch (rankingError) {
      console.error('Falha ao criar entrada inicial no ranking:', rankingError);
    }
    const token = createAuthToken({ id: user.id, email: user.email });
    if (token) {
      setAuthCookie(res, token);
    }
    res.status(201).json({
      success: true,
      user: mapPublicUser(user),
      token
    });
  } catch (error) {
    if (error.code === '23505') {
      res.status(409).json({ success: false, message: 'Nome de usuario ja cadastrado.' });
      return;
    }
    console.error('Erro ao registrar usuario:', error);
    res.status(500).json({ success: false, message: 'Erro ao registrar usuario.' });
  }
});

app.post('/auth/provision-temp', async (req, res) => {
  try {
    if (!pool) {
      res.status(500).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    await ensureUsersAvatarColumn();
    await ensurePremiumAccessTables();

    const authUser = await readAuthenticatedUserFromRequest(req).catch(() => null);
    if (authUser?.id) {
      res.json({ success: true, user: mapPublicUser(authUser), token: null });
      return;
    }

    const generatedUsername = await generateAvailableUsername('USER');
    const email = buildLegacyEmailFromUsername(generatedUsername);
    const passwordHash = await bcrypt.hash(`temp:${generatedUsername}:${Date.now()}:${Math.random()}`, 10);
    const result = await pool.query(
      `INSERT INTO public.users (
         email, username, password_hash, onboarding_name_completed, onboarding_photo_completed
       )
       VALUES ($1, $2, $3, false, false)
       RETURNING id, email, username, avatar_image, avatar_versions, avatar_generation_count,
                 onboarding_name_completed, onboarding_photo_completed,
                 created_at, premium_full_access, premium_until`,
      [email, generatedUsername, passwordHash]
    );
    const user = result.rows[0];
    const token = createAuthToken({ id: user.id, email: user.email, username: user.username });
    if (token) {
      setAuthCookie(res, token);
    }
    res.status(201).json({ success: true, user: mapPublicUser(user), token });
  } catch (error) {
    console.error('Erro ao provisionar usuario temporario:', error);
    res.status(500).json({ success: false, message: 'Nao foi possivel preparar o usuario.' });
  }
});

app.post('/login', async (req, res) => {
  try {
    if (!pool) {
      res.status(500).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }
    const username = normalizeUsername(req.body.username || req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Nome de usuario e senha sao obrigatorios.' });
      return;
    }

    await ensureUsersAvatarColumn();
    await ensurePremiumAccessTables();

    const result = await pool.query(
      `SELECT id, email, username, avatar_image, avatar_versions, avatar_generation_count,
              onboarding_name_completed, onboarding_photo_completed,
              password_hash, created_at, premium_full_access, premium_until
       FROM public.users
       WHERE email = $1`,
      [buildLegacyEmailFromUsername(username)]
    );
    if (!result.rows.length) {
      res.status(401).json({ success: false, message: 'Nome de usuario ou senha invalidos.' });
      return;
    }

    const user = result.rows[0];
    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      res.status(401).json({ success: false, message: 'Nome de usuario ou senha invalidos.' });
      return;
    }
    try {
      await syncFlashcardRankingFromProgressCount(user.id);
    } catch (rankingError) {
      console.error('Falha ao sincronizar ranking no login:', rankingError);
    }
    if (!JWT_SECRET) {
      res.status(500).json({ success: false, message: 'JWT_SECRET nao configurado.' });
      return;
    }

    const token = createAuthToken({ id: user.id, email: user.email });
    setAuthCookie(res, token);
    res.json({
      success: true,
      token,
      user: mapPublicUser(user)
    });
  } catch (error) {
    console.error('Erro ao autenticar usuario:', error);
    res.status(500).json({ success: false, message: 'Erro ao autenticar usuario.' });
  }
});

app.post('/api/books/home-auth', async (req, res) => {
  try {
    if (!pool) {
      res.status(500).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    const username = normalizeUsername(req.body.username || req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!isValidUsername(username) || !password) {
      res.status(400).json({ success: false, message: 'Login e senha sao obrigatorios.' });
      return;
    }

    await ensureUsersAvatarColumn();
    await ensurePremiumAccessTables();

    const email = buildLegacyEmailFromUsername(username);
    const selectSql = `SELECT id, email, username, avatar_image, avatar_versions, avatar_generation_count,
                              onboarding_name_completed, onboarding_photo_completed,
                              password_hash, created_at, premium_full_access, premium_until
                       FROM public.users
                       WHERE email = $1
                       LIMIT 1`;

    let user = null;
    let created = false;

    const existing = await pool.query(selectSql, [email]);
    if (existing.rows.length) {
      user = existing.rows[0];
      const passwordOk = await bcrypt.compare(password, user.password_hash);
      if (!passwordOk) {
        res.status(401).json({ success: false, message: 'Nome de usuario ou senha invalidos.' });
        return;
      }
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      try {
        const inserted = await pool.query(
          `INSERT INTO public.users (
             email, username, password_hash, onboarding_name_completed, onboarding_photo_completed
           )
           VALUES ($1, $2, $3, true, false)
           RETURNING id, email, username, avatar_image, avatar_versions, avatar_generation_count,
                     onboarding_name_completed, onboarding_photo_completed,
                     password_hash, created_at, premium_full_access, premium_until`,
          [email, username, passwordHash]
        );
        user = inserted.rows[0] || null;
        created = true;
      } catch (insertError) {
        if (insertError?.code !== '23505') {
          throw insertError;
        }
        const raced = await pool.query(selectSql, [email]);
        if (!raced.rows.length) {
          throw insertError;
        }
        user = raced.rows[0];
        const passwordOk = await bcrypt.compare(password, user.password_hash);
        if (!passwordOk) {
          res.status(401).json({ success: false, message: 'Nome de usuario ou senha invalidos.' });
          return;
        }
      }
    }

    if (!user) {
      res.status(500).json({ success: false, message: 'Nao foi possivel autenticar agora.' });
      return;
    }

    try {
      await syncFlashcardRankingFromProgressCount(user.id);
    } catch (rankingError) {
      console.error('Falha ao sincronizar ranking no login da area books:', rankingError);
    }

    const token = createAuthToken({ id: user.id, email: user.email });
    if (!token) {
      res.status(500).json({ success: false, message: 'JWT_SECRET nao configurado.' });
      return;
    }

    setAuthCookie(res, token);
    res.json({
      success: true,
      created,
      token,
      user: mapPublicUser(user)
    });
  } catch (error) {
    console.error('Erro no login/criacao da area books:', error);
    res.status(500).json({ success: false, message: 'Erro ao autenticar na area books.' });
  }
});

app.get('/api/books/prebook-insights', async (req, res) => {
  try {
    if (!pool) {
      res.status(200).json({
        success: true,
        stats: {
          bestListeningPercent: 0,
          bestReadingPercent: 0,
          totalReads: 0
        }
      });
      return;
    }

    const authUser = await readAuthenticatedUserFromRequest(req).catch(() => null);
    const userId = Number(authUser?.id) || 0;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Sessao nao encontrada.' });
      return;
    }

    await ensureUserBooksLibraryStatsTable();

    const bookId = normalizeMiniBookId(req.query?.bookId);
    if (!bookId) {
      res.status(400).json({ success: false, message: 'bookId ausente ou invalido.' });
      return;
    }

    const result = await pool.query(
      `SELECT
         COALESCE(best_listening_percent, 0)::int AS best_listening_percent,
         COALESCE(best_speaking_percent, 0)::int AS best_reading_percent,
         COALESCE(reads_completed, 0)::bigint AS total_reads
       FROM public.user_books_library_stats
       WHERE user_id = $1 AND book_id = $2
       LIMIT 1`,
      [userId, bookId]
    );

    const row = result.rows[0] || {};
    const bestListeningPercent = Math.max(0, Math.min(100, Number(row.best_listening_percent) || 0));
    const bestReadingPercent = Math.max(0, Math.min(100, Number(row.best_reading_percent) || 0));
    const totalReads = Math.max(0, Number(row.total_reads) || 0);

    res.json({
      success: true,
      stats: {
        bestListeningPercent,
        bestReadingPercent,
        totalReads
      }
    });
  } catch (error) {
    console.error('Erro ao carregar insights do pre-book:', error);
    res.status(500).json({ success: false, message: 'Nao foi possivel carregar os insights do pre-book.' });
  }
});

app.post('/auth/google-quick', async (req, res) => {
  try {
    if (!pool) {
      res.status(500).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) {
      res.status(400).json({ success: false, message: 'Email e obrigatorio.' });
      return;
    }
    if (!email.endsWith('@gmail.com') && !email.endsWith('@googlemail.com')) {
      res.status(400).json({ success: false, message: 'Use um e-mail Google valido.' });
      return;
    }

    let result = await pool.query(
      `SELECT id, email, username, avatar_image, avatar_versions, avatar_generation_count,
              onboarding_name_completed, onboarding_photo_completed,
              created_at, premium_full_access, premium_until
       FROM public.users
       WHERE email = $1`,
      [email]
    );

    if (!result.rows.length) {
      const generatedPasswordHash = await bcrypt.hash(`google-quick:${email}:${Date.now()}`, 10);
      result = await pool.query(
        `INSERT INTO public.users (email, username, password_hash)
         VALUES ($1, $1, $2)
         RETURNING id, email, username, avatar_image, avatar_versions, avatar_generation_count,
                   onboarding_name_completed, onboarding_photo_completed,
                   created_at, premium_full_access, premium_until`,
        [email, generatedPasswordHash]
      );
    }

    const user = result.rows[0];
    try {
      await syncFlashcardRankingFromProgressCount(user.id);
    } catch (rankingError) {
      console.error('Falha ao sincronizar ranking no login rapido Google:', rankingError);
    }
    const token = createAuthToken({ id: user.id, email: user.email });
    if (!token) {
      res.status(500).json({ success: false, message: 'JWT_SECRET nao configurado.' });
      return;
    }
    setAuthCookie(res, token);
    res.json({ success: true, token, user: mapPublicUser(user) });
  } catch (error) {
    console.error('Erro no login rapido com Google:', error);
    res.status(500).json({ success: false, message: 'Erro ao autenticar com Google.' });
  }
});

app.get('/auth/session', async (req, res) => {
  try {
    await ensurePremiumAccessTables();
    const user = await readAuthenticatedUserFromRequest(req);
    if (!user) {
      res.status(401).json({ success: false, message: 'SessÃ£o invÃ¡lida ou expirada.' });
      return;
    }

    res.json({ success: true, user: mapPublicUser(user) });
  } catch (error) {
    console.error('Erro ao carregar sessao do usuario:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar sessao.' });
  }
});

app.patch('/auth/avatar', async (req, res) => {
  try {
    if (!pool) {
      res.status(500).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessão inválida ou expirada.' });
      return;
    }

    const avatarInput = normalizeAvatarImage(req.body?.avatar || req.body?.avatarDataUrl || '');
    const avatarVersionsInput = Array.isArray(req.body?.avatarVersions) ? req.body.avatarVersions : null;
    const requestedGenerationCount = Number.parseInt(req.body?.avatarGenerationCount, 10);
    const onboardingPhotoCompleted = req.body?.onboardingPhotoCompleted === true;

    const nextAvatarVersions = avatarVersionsInput
      ? avatarVersionsInput
        .map((entry) => ({
          image: normalizeAvatarImage(entry?.image || entry?.url || ''),
          source: normalizeAvatarImage(entry?.source || ''),
          createdAt: entry?.createdAt || new Date().toISOString()
        }))
        .filter((entry) => entry.image)
        .slice(0, 5)
      : null;

    await ensureUsersAvatarColumn();
    await ensurePremiumAccessTables();

    const currentUser = await readUserById(authUser.id);
    if (!currentUser) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }

    let avatarImage = avatarInput;
    const avatarVersionPayload = nextAvatarVersions || (Array.isArray(currentUser.avatar_versions) ? currentUser.avatar_versions : []);
    if (avatarImage && !/^https?:\/\//i.test(avatarImage)) {
      const uploadedUrl = await uploadUserAvatarToR2({
        id: currentUser.id,
        email: currentUser.email,
        username: currentUser.username
      }, avatarImage, 'avatar-current');
      if (uploadedUrl) {
        avatarImage = uploadedUrl;
      }
    }

    const persistedAvatarVersions = [];
    for (let index = 0; index < avatarVersionPayload.length; index += 1) {
      const entry = avatarVersionPayload[index];
      const imageValue = String(entry?.image || '').trim();
      const sourceValue = String(entry?.source || '').trim();
      let nextImage = imageValue;
      let nextSource = sourceValue;
      if (nextImage && !/^https?:\/\//i.test(nextImage)) {
        const uploadedUrl = await uploadUserAvatarToR2(currentUser, nextImage, `avatar-version-${index + 1}`);
        if (uploadedUrl) nextImage = uploadedUrl;
      }
      if (nextSource && !/^https?:\/\//i.test(nextSource)) {
        const uploadedSourceUrl = await uploadUserAvatarToR2(currentUser, nextSource, `avatar-source-${index + 1}`);
        if (uploadedSourceUrl) nextSource = uploadedSourceUrl;
      }
      persistedAvatarVersions.push({
        image: nextImage,
        source: nextSource,
        createdAt: entry?.createdAt || new Date().toISOString()
      });
    }

    if (onboardingPhotoCompleted) {
      const remoteSourceKeys = new Set();
      const currentAvatarVersions = Array.isArray(currentUser.avatar_versions) ? currentUser.avatar_versions : [];
      currentAvatarVersions.forEach((entry) => {
        const objectKey = getR2ObjectKeyFromPublicUrl(entry?.source || '');
        if (objectKey) remoteSourceKeys.add(objectKey);
      });
      persistedAvatarVersions.forEach((entry) => {
        entry.source = '';
      });
      for (const objectKey of remoteSourceKeys) {
        try {
          await deleteR2Object(objectKey);
        } catch (cleanupError) {
          console.warn(`Falha ao apagar source antigo do avatar ${objectKey}:`, cleanupError);
        }
      }
    }

    const result = await pool.query(
      `UPDATE public.users
       SET avatar_image = $2,
           avatar_versions = COALESCE($3::jsonb, avatar_versions),
           avatar_generation_count = CASE
             WHEN $4::int > 0 THEN $4::int
             ELSE avatar_generation_count
           END,
           onboarding_photo_completed = onboarding_photo_completed OR $5::boolean
       WHERE id = $1
       RETURNING id, email, username, avatar_image, avatar_versions, avatar_generation_count,
                 onboarding_name_completed, onboarding_photo_completed,
                 created_at, password_hash, premium_full_access, premium_until`,
      [
        authUser.id,
        avatarImage || null,
        nextAvatarVersions ? JSON.stringify(persistedAvatarVersions) : null,
        Number.isFinite(requestedGenerationCount) ? requestedGenerationCount : 0,
        onboardingPhotoCompleted
      ]
    );

    if (!result.rows.length) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessão inválida ou expirada.' });
      return;
    }

    res.json({ success: true, user: mapPublicUser(result.rows[0]) });
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    console.error('Erro ao atualizar avatar do usuario:', error);
    res.status(statusCode).json({
      success: false,
      message: statusCode === 400
        ? 'Avatar invalido.'
        : statusCode === 413
          ? 'Avatar muito grande.'
          : 'Erro ao atualizar avatar.'
    });
  }
});

app.patch('/auth/profile', async (req, res) => {
  try {
    if (!pool) {
      res.status(500).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }

    const username = normalizeUsername(req.body?.username || req.body?.email);
    if (!isValidUsername(username)) {
      res.status(400).json({ success: false, message: 'Nome de usuario invalido.' });
      return;
    }

    await ensureUsersAvatarColumn();
    await ensurePremiumAccessTables();

    const result = await pool.query(
      `UPDATE public.users
       SET email = $2,
           username = $3,
           onboarding_name_completed = true
       WHERE id = $1
       RETURNING id, email, username, avatar_image, avatar_versions, avatar_generation_count,
                 onboarding_name_completed, onboarding_photo_completed,
                 created_at, password_hash, premium_full_access, premium_until`,
      [authUser.id, buildLegacyEmailFromUsername(username), username]
    );

    if (!result.rows.length) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }

    const user = result.rows[0];
    const token = createAuthToken({ id: user.id, email: user.email });
    if (token) {
      setAuthCookie(res, token);
    }

    res.json({ success: true, user: mapPublicUser(user), token });
  } catch (error) {
    if (error.code === '23505') {
      res.status(409).json({ success: false, message: 'Nome de usuario ja cadastrado.' });
      return;
    }
    console.error('Erro ao atualizar perfil do usuario:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar perfil.' });
  }
});

app.patch('/auth/password', async (req, res) => {
  try {
    if (!pool) {
      res.status(500).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }

    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Use pelo menos 6 caracteres na senha.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `UPDATE public.users
       SET password_hash = $2
       WHERE id = $1
       RETURNING id, email, username, avatar_image, avatar_versions, avatar_generation_count,
                 onboarding_name_completed, onboarding_photo_completed,
                 created_at, password_hash, premium_full_access, premium_until`,
      [authUser.id, passwordHash]
    );

    if (!result.rows.length) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }

    const user = result.rows[0];
    const token = createAuthToken({ id: user.id, email: user.email });
    if (token) {
      setAuthCookie(res, token);
    }

    res.json({ success: true, user: mapPublicUser(user), token });
  } catch (error) {
    console.error('Erro ao atualizar senha do usuario:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar senha.' });
  }
});

app.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});
app.get('/api/image-levels', async (req, res) => {
  try {
    if (!imageLevelIndex) {
      await refreshImageIndex();
    }

    const levels = {};
    for (const [fileName, level] of imageLevelIndex.entries()) {
      if (Number.isFinite(level)) {
        levels[fileName] = level;
      }
    }

    res.json({ success: true, levels });
  } catch (error) {
    console.error('Erro ao carregar níveis das imagens:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar níveis das imagens.' });
  }
});

app.post('/api/image-levels/refresh', async (req, res) => {
  try {
    await refreshImageIndex();

    const levels = {};
    for (const [fileName, level] of imageLevelIndex.entries()) {
      if (Number.isFinite(level)) {
        levels[fileName] = level;
      }
    }

    res.json({ success: true, levels });
  } catch (error) {
    console.error('Erro ao atualizar níveis das imagens:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar níveis das imagens.' });
  }
});

app.get('/api/media/resolve', async (req, res) => {
  try {
    const name = typeof req.query.name === 'string' ? req.query.name : '';
    if (!name) {
      res.status(400).json({ success: false, message: 'Informe o nome do arquivo.' });
      return;
    }

    const url = await resolveMediaUrl(name);

    if (!url) {
      res.status(404).json({ success: false, message: 'Arquivo não encontrado.' });
      return;
    }

    res.json({ success: true, url });
  } catch (error) {
    console.error('Erro ao resolver arquivo de mídia:', error);
    res.status(500).json({ success: false, message: 'Erro ao resolver arquivo de mídia.' });
  }
});

app.get('/api/eventos/media', async (req, res) => {
  const rawUrl = typeof req.query?.url === 'string' ? req.query.url.trim() : '';

  if (!rawUrl) {
    res.status(400).json({ error: 'Informe a URL da midia.' });
    return;
  }

  let targetUrl;
  try {
    targetUrl = new URL(rawUrl);
  } catch (_error) {
    res.status(400).json({ error: 'URL de midia invalida.' });
    return;
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    res.status(400).json({ error: 'Protocolo de midia nao suportado.' });
    return;
  }

  if (!EVENTOS_ALLOWED_MEDIA_HOSTS.has(targetUrl.hostname)) {
    res.status(403).json({ error: 'Host de midia nao permitido.' });
    return;
  }

  try {
    const upstreamResponse = await fetch(targetUrl.toString());

    if (!upstreamResponse.ok) {
      res.status(upstreamResponse.status).json({
        error: 'Falha ao baixar a midia remota.',
        status: upstreamResponse.status
      });
      return;
    }

    const arrayBuffer = await upstreamResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = upstreamResponse.headers.get('content-type') || 'application/octet-stream';
    const contentLength = upstreamResponse.headers.get('content-length');
    const lastModified = upstreamResponse.headers.get('last-modified');
    const etag = upstreamResponse.headers.get('etag');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (lastModified) res.setHeader('Last-Modified', lastModified);
    if (etag) res.setHeader('ETag', etag);
    res.send(buffer);
  } catch (error) {
    res.status(502).json({
      error: 'Erro ao buscar a midia remota.',
      details: error.message
    });
  }
});

app.get('/api/fluency/day/:day/phase/:phase', async (req, res) => {
  try {
    if (!isR2FluencyConfigured()) {
      res.status(503).json({ success: false, message: 'R2 nao configurado para conteudo de fluencia.' });
      return;
    }

    const dayNumber = Number.parseInt(req.params.day, 10);
    const phaseNumber = Number.parseInt(req.params.phase, 10);

    if (!Number.isFinite(dayNumber) || dayNumber < 1 || !Number.isFinite(phaseNumber) || phaseNumber < 1) {
      res.status(400).json({ success: false, message: 'Dia e fase invalidos.' });
      return;
    }

    const objectKey = await resolveFluencyPhaseObjectKey(dayNumber, phaseNumber);
    if (!objectKey) {
      res.status(404).json({ success: false, message: 'Nenhum JSON encontrado para esta fase.' });
      return;
    }

    const payload = await fetchR2JsonObject(objectKey);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-PlayTalk-R2-Key', objectKey);
    res.json(payload);
  } catch (error) {
    console.error('Erro ao carregar conteudo de fluencia do R2:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar conteudo da fase.' });
  }
});

app.get('/api/local-level/day/:day/phase/:phase', async (req, res) => {
  try {
    const dayNumber = Number.parseInt(req.params.day, 10);
    const phaseNumber = Number.parseInt(req.params.phase, 10);

    if (!Number.isFinite(dayNumber) || dayNumber < 1 || !Number.isFinite(phaseNumber) || phaseNumber < 1 || phaseNumber > 12) {
      res.status(400).json({ success: false, message: 'Dia ou modo invalido.' });
      return;
    }

    const filePath = resolveLocalLevelJsonPath(dayNumber, phaseNumber);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        message: 'Aula não encontrada',
        filePath
      });
      return;
    }

    const raw = await fs.promises.readFile(filePath, 'utf8');
    const payload = JSON.parse(raw);
    res.setHeader('Cache-Control', 'no-store');
    res.json(payload);
  } catch (error) {
    console.error('Erro ao carregar JSON local de Niveis:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar a aula local.' });
  }
});

app.get('/api/local-level/words/:fileName', async (req, res) => {
  try {
    const requestedFileName = path.basename(String(req.params.fileName || ''));
    if (!requestedFileName || path.extname(requestedFileName).toLowerCase() !== '.json') {
      res.status(400).json({ success: false, message: 'Arquivo de palavras invalido.' });
      return;
    }

    const filePath = resolveLocalWordsJsonPath(requestedFileName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        message: 'Deck de palavras nao encontrado.',
        filePath
      });
      return;
    }

    const raw = await fs.promises.readFile(filePath, 'utf8');
    const payload = JSON.parse(raw);
    res.setHeader('Cache-Control', 'no-store');
    res.json(payload);
  } catch (error) {
    console.error('Erro ao carregar deck local de palavras:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar deck de palavras.' });
  }
});

app.get('/api/local-level/words', async (_req, res) => {
  try {
    const files = await listLocalWordsDeckFiles();
    const decks = await Promise.all(files.map(async (name, index) => {
      const filePath = resolveLocalWordsJsonPath(name);
      try {
        const raw = await fs.promises.readFile(filePath, 'utf8');
        const payload = JSON.parse(raw);
        return {
          id: `words-${index + 1}`,
          name,
          path: `Niveis/words/${name}`,
          title: typeof payload?.title === 'string' ? payload.title : '',
          coverImage: typeof payload?.coverImage === 'string' ? payload.coverImage : '',
          items: Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.entries)
              ? payload.entries
              : []
        };
      } catch (error) {
        console.error(`Erro ao ler deck local de palavras ${name}:`, error);
        return {
          id: `words-${index + 1}`,
          name,
          path: `Niveis/words/${name}`,
          title: '',
          coverImage: '',
          items: []
        };
      }
    }));
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      success: true,
      files: decks
    });
  } catch (error) {
    console.error('Erro ao listar decks locais de palavras:', error);
    res.status(500).json({ success: false, message: 'Erro ao listar decks de palavras.' });
  }
});

app.get('/config.js', (req, res) => {
  const fallbackBase = DEFAULT_GAME_SOUNDS_BASE_URL;
  const baseUrl = GAME_SOUNDS_BASE_URL || fallbackBase;
  const r2MediaBaseUrl = '/api/r2-media';
  res.type('application/javascript');
  res.send(`window.GAME_SOUNDS_BASE_URL = ${JSON.stringify(baseUrl)};
window.PLAYTALK_R2_MEDIA_BASE_URL = ${JSON.stringify(r2MediaBaseUrl)};
window.API_CONFIG = Object.assign({}, window.API_CONFIG || {}, {
  openaiTtsModel: ${JSON.stringify(OPENAI_TTS_MODEL)},
  openaiSttModel: ${JSON.stringify(OPENAI_STT_MODEL)},
  openaiChatModel: ${JSON.stringify(OPENAI_CHAT_FAST_MODEL)}
});`);
});

app.get('/api/flashcards/state', async (req, res) => {
  try {
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }

    const state = await readFlashcardStateForUser(authUser.id);
    res.json({
      success: true,
      progress: state.progress,
      stats: state.stats,
      meta: state.meta,
      serverTimeMs: Date.now()
    });
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    console.error('Erro ao carregar estado dos flashcards:', error);
    res.status(statusCode).json({
      success: false,
      message: statusCode === 400
        ? 'Usuario invalido.'
        : 'Erro ao carregar estado dos flashcards.'
    });
  }
});

app.put('/api/flashcards/state', async (req, res) => {
  try {
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }

    const savedState = await saveFlashcardStateForUser(authUser.id, req.body);
    res.json({
      success: true,
      progressCount: savedState.progressCount,
      stats: savedState.stats,
      updatedAt: savedState.rankingRecord?.updated_at || new Date().toISOString()
    });
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    console.error('Erro ao salvar estado dos flashcards:', error);
    res.status(statusCode).json({
      success: false,
      message: statusCode === 400
        ? 'Estado de flashcards invalido.'
        : statusCode === 413
          ? 'Quantidade de flashcards acima do limite.'
          : 'Erro ao salvar estado dos flashcards.'
    });
  }
});

app.post('/api/flashcards/report', async (req, res) => {
  try {
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }

    await ensureFlashcardUserStateTables();

    const cardId = typeof req.body?.cardId === 'string' ? req.body.cardId.trim() : '';
    const reportType = typeof req.body?.reportType === 'string' ? req.body.reportType.trim().toLowerCase() : '';
    const allowedTypes = new Set(['blurred-image', 'weak-association', 'wrong-audio', 'wrong-text', 'hide-card']);
    if (!cardId || !allowedTypes.has(reportType)) {
      res.status(400).json({ success: false, message: 'Reporte de flashcard invalido.' });
      return;
    }

    const normalizedUserId = Number.parseInt(authUser.id, 10);
    await pool.query(
      `INSERT INTO public.user_flashcard_reports (
         user_id,
         card_id,
         report_type,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, now(), now())
       ON CONFLICT (user_id, card_id, report_type)
       DO UPDATE SET
         updated_at = now()`,
      [normalizedUserId, cardId, reportType]
    );

    let hidden = false;
    if (reportType === 'hide-card') {
      await pool.query(
        `INSERT INTO public.user_flashcard_hidden (
           user_id,
           card_id,
           created_at,
           updated_at
         )
         VALUES ($1, $2, now(), now())
         ON CONFLICT (user_id, card_id)
         DO UPDATE SET
           updated_at = now()`,
        [normalizedUserId, cardId]
      );
      hidden = true;
    }

    res.json({ success: true, hidden });
  } catch (error) {
    console.error('Erro ao registrar reporte de flashcard:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Erro ao registrar reporte do flashcard.'
    });
  }
});

app.get('/api/admin/flashcards/reports-summary', async (req, res) => {
  try {
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    await requireAdminUserFromRequest(req);
    await ensureFlashcardUserStateTables();

    const result = await pool.query(
      `SELECT card_id, report_type, COUNT(*)::int AS total
       FROM public.user_flashcard_reports
       GROUP BY card_id, report_type`
    );

    const reportsByCard = {};
    result.rows.forEach((row) => {
      const cardId = typeof row?.card_id === 'string' ? row.card_id.trim() : '';
      const reportType = typeof row?.report_type === 'string' ? row.report_type.trim() : '';
      const total = Number(row?.total) || 0;
      if (!cardId || !reportType || total <= 0) return;
      if (!reportsByCard[cardId]) reportsByCard[cardId] = {};
      reportsByCard[cardId][reportType] = total;
    });

    res.json({ success: true, reportsByCard });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Falha ao carregar os reports dos flashcards.'
    });
  }
});

app.get('/api/admin/flashcards/decks', async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);
    const decks = await listAdminFlashcardDecks();
    res.json({ success: true, decks });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Falha ao carregar os decks de flashcards.'
    });
  }
});

app.post('/api/admin/flashcards/backfill-public-decks', express.json({ limit: '256kb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    const force = req.body?.force === true;
    const summary = await seedPublicFlashcardDecksFromAllcards({ force });
    const postgresEntries = await collectPostgresFlashcardManifestEntries();

    res.json({
      success: true,
      summary,
      totalAvailableDecks: postgresEntries.length
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Falha ao salvar os decks no Postgres.'
    });
  }
});

app.post('/api/admin/flashcards/public-decks/upload-jsons', express.json({ limit: '35mb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    const files = Array.isArray(req.body?.files) ? req.body.files.slice() : [];
    if (!files.length) {
      res.status(400).json({ success: false, message: 'Envie pelo menos um deck JSON.' });
      return;
    }

    const uploadedDecks = [];
    for (const file of files) {
      const fileName = normalizePublicFlashcardDeckFileName(file?.name, '');
      const rawContent = typeof file?.content === 'string' ? file.content.trim() : '';
      if (!fileName || path.extname(fileName).toLowerCase() !== '.json') {
        res.status(400).json({ success: false, message: 'Todos os arquivos enviados precisam ser .json.' });
        return;
      }
      if (!rawContent) {
        res.status(400).json({ success: false, message: `O arquivo ${fileName} chegou vazio.` });
        return;
      }

      let payload = null;
      try {
        payload = JSON.parse(rawContent);
      } catch (error) {
        res.status(400).json({
          success: false,
          message: `O arquivo ${fileName} nao contem um JSON valido.`,
          details: error.message
        });
        return;
      }

      const normalizedPayload = normalizeUploadedPublicDeckPayload(fileName, payload);
      const items = getFlashcardPayloadItems(normalizedPayload);
      if (!items.length) {
        res.status(400).json({
          success: false,
          message: `O deck ${fileName} nao possui flashcards validos para publicar.`
        });
        return;
      }

      const deck = await upsertPublicFlashcardDeckFromUploadedJson(fileName, normalizedPayload);
      if (deck) {
        uploadedDecks.push(deck);
      }
    }

    res.json({
      success: true,
      uploadedCount: uploadedDecks.length,
      decks: uploadedDecks
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Falha ao enviar decks para o Postgres.'
    });
  }
});

app.post('/api/admin/flashcards/public-decks/visibility', express.json({ limit: '256kb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);
    const fileName = normalizePublicDeckSourceToFileName(req.body?.source);
    if (!fileName) {
      res.status(400).json({ success: false, message: 'Origem do deck invalida.' });
      return;
    }

    const hidden = req.body?.hidden === true;
    if (pool) {
      // Visibility toggle must be side-effect free for payload/media links.
      // Do not run seed/backfill here.
      const result = await pool.query(
        `UPDATE public.flashcards_public_decks
         SET is_hidden = $2,
             hidden_at = CASE WHEN $2 THEN now() ELSE NULL END,
             updated_at = now()
         WHERE file_name = $1
         RETURNING file_name, day_key, source, title, item_count, payload, is_hidden, updated_at`,
        [fileName, hidden]
      );

      if (result.rows.length) {
        res.json({
          success: true,
          deck: buildPublicFlashcardDeckManifestEntryFromRow(result.rows[0] || null)
        });
        return;
      }
    }

    const localDeckRecord = await findLocalFlashcardDeckRecordByFileName(fileName);
    if (!localDeckRecord) {
      res.status(404).json({ success: false, message: 'Deck nao encontrado.' });
      return;
    }

    await setLocalFlashcardDeckHiddenState(fileName, hidden);
    const nextDeckRecord = await findLocalFlashcardDeckRecordByFileName(fileName);
    res.json({
      success: true,
      deck: nextDeckRecord?.deck || { ...localDeckRecord.deck, isHidden: hidden }
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Falha ao atualizar a visibilidade do deck.'
    });
  }
});

app.post('/api/admin/flashcards/public-decks/delete', express.json({ limit: '256kb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    const fileName = normalizePublicDeckSourceToFileName(req.body?.source);
    if (!fileName) {
      res.status(400).json({ success: false, message: 'Origem do deck invalida.' });
      return;
    }

    const deckRow = await findPublicFlashcardDeckRowByFileName(fileName);
    if (!deckRow) {
      res.status(404).json({ success: false, message: 'Deck nao encontrado no Postgres.' });
      return;
    }

    const manifestEntry = buildPublicFlashcardDeckManifestEntryFromRow(deckRow);
    if (!manifestEntry?.canDelete) {
      res.status(400).json({
        success: false,
        message: 'Esse deck nao pode ser excluido por aqui.'
      });
      return;
    }

    if (deckRow.is_hidden !== true) {
      res.status(400).json({
        success: false,
        message: 'O album precisa estar oculto antes da exclusao completa.'
      });
      return;
    }

    const cleanup = await deleteUploadedPublicFlashcardDeckAssets(deckRow);
    await pool.query(
      `DELETE FROM public.flashcards_public_decks
       WHERE id = $1`,
      [deckRow.id]
    );

    res.json({
      success: true,
      deletedSource: manifestEntry.source,
      cleanup
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Falha ao excluir o deck.'
    });
  }
});

app.post('/api/admin/flashcards/public-decks/generate-cover', express.json({ limit: '1mb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    const fileName = normalizePublicDeckSourceToFileName(req.body?.source);
    if (!fileName) {
      res.status(400).json({ success: false, message: 'Origem do deck invalida.' });
      return;
    }

    const deckRow = await findPublicFlashcardDeckRowByFileName(fileName);
    if (!deckRow) {
      res.status(404).json({ success: false, message: 'Deck nao encontrado no Postgres.' });
      return;
    }

    const userPrompt = String(req.body?.prompt || '').trim();
    if (!userPrompt) {
      res.status(400).json({ success: false, message: 'Digite um prompt para gerar a capa.' });
      return;
    }

    const prompt = [
      userPrompt,
      'Create a square 1:1 cover image for a language-learning flashcard deck.',
      'No text, no logos, no watermark, no letters, no labels.',
      'Cinematic, premium visual style, clean composition, centered subject.'
    ].join(' ');

    const generated = await generateFlashcardDeckCoverWithOpenAi(prompt);
    res.json({
      success: true,
      model: generated.model || OPENAI_IMAGE_MODEL,
      usage: generated.usage || null,
      dataUrl: `data:${generated.mimeType || 'image/webp'};base64,${generated.buffer.toString('base64')}`,
      deck: buildPublicFlashcardDeckManifestEntryFromRow(deckRow)
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Falha ao gerar capa com OpenAI.',
      ...(error.instructions ? { instructions: error.instructions } : {})
    });
  }
});

app.post('/api/admin/flashcards/public-decks/approve-cover', express.json({ limit: '15mb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }
    if (!isR2FluencyConfigured()) {
      res.status(503).json({ success: false, message: 'R2 nao configurado para salvar a capa.' });
      return;
    }

    const fileName = normalizePublicDeckSourceToFileName(req.body?.source);
    if (!fileName) {
      res.status(400).json({ success: false, message: 'Origem do deck invalida.' });
      return;
    }

    const deckRow = await findPublicFlashcardDeckRowByFileName(fileName);
    if (!deckRow) {
      res.status(404).json({ success: false, message: 'Deck nao encontrado no Postgres.' });
      return;
    }

    const imageDataUrl = String(req.body?.imageDataUrl || '').trim();
    const parsedImage = parseBase64DataUrl(imageDataUrl);
    if (!parsedImage?.buffer?.length) {
      res.status(400).json({ success: false, message: 'Imagem da capa invalida.' });
      return;
    }

    const optimizedBuffer = await sharp(parsedImage.buffer)
      .resize(1024, 1024, { fit: 'cover', position: 'centre' })
      .webp({ quality: 82, effort: 5, smartSubsample: true })
      .toBuffer();

    if (!optimizedBuffer?.length) {
      res.status(422).json({ success: false, message: 'Nao foi possivel otimizar a capa para WebP.' });
      return;
    }

    const storageContext = deriveDeckCoverStorageContext(deckRow);
    const coverObjectKey = `${storageContext.imagesFolder}/${storageContext.coverFileName}`.replace(/\/+/g, '/');
    await putR2Object(coverObjectKey, optimizedBuffer, 'image/webp');
    const coverPublicUrl = buildFlashcardsR2PublicUrl(coverObjectKey);

    const payload = deckRow?.payload && typeof deckRow.payload === 'object' ? deckRow.payload : {};
    const nextPayload = {
      ...payload,
      coverImage: coverPublicUrl
    };
    const nextItemCount = getFlashcardPayloadItems(nextPayload).length;

    const updateResult = await pool.query(
      `UPDATE public.flashcards_public_decks
       SET payload = $2::jsonb,
           item_count = $3,
           updated_at = now()
       WHERE id = $1
       RETURNING file_name, day_key, source, title, item_count, payload, is_hidden, updated_at`,
      [deckRow.id, JSON.stringify(nextPayload), nextItemCount]
    );

    res.json({
      success: true,
      coverImage: coverPublicUrl,
      deck: buildPublicFlashcardDeckManifestEntryFromRow(updateResult.rows[0] || null)
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Falha ao aprovar a capa do deck.'
    });
  }
});

app.get('/api/flashcards/manifest', async (req, res) => {
  try {
    const authUser = await readAuthenticatedUserFromRequest(req).catch(() => null);
    const requesterIsAdmin = isAdminUserRecord(authUser);
    const includeHiddenRequested = String(req.query?.includeHidden || '').trim().toLowerCase();
    const includeHiddenForRequester = requesterIsAdmin && (
      includeHiddenRequested === '1'
      || includeHiddenRequested === 'true'
      || includeHiddenRequested === 'yes'
    );
    const [localFiles, postgresFiles] = await Promise.all([
      collectAllcardsManifestEntries(),
      collectPostgresFlashcardManifestEntries()
    ]);
    const mergedBySource = new Map();
    [...localFiles, ...postgresFiles].forEach((entry) => {
      const sourceKey = String(entry?.source || entry?.path || entry?.name || '').trim().toLowerCase();
      if (!sourceKey || mergedBySource.has(sourceKey)) return;
      mergedBySource.set(sourceKey, entry);
    });
    const files = Array.from(mergedBySource.values())
      .filter((entry) => includeHiddenForRequester || !Boolean(entry?.isHidden))
      .sort((left, right) => (
        String(left?.title || '').localeCompare(String(right?.title || ''), 'pt-BR', {
          sensitivity: 'base',
          numeric: true
        })
      ));
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      files
    });
  } catch (error) {
    console.error('Erro ao montar manifesto de allcards:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar os decks em allcards.'
    });
  }
});

app.get('/api/rankings/flashcards', async (req, res) => {
  try {
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 5000)
      : 5000;
    const period = normalizeFlashcardRankingPeriod(req.query.period);
    const authUser = await readAuthenticatedUserFromRequest(req);
    const currentUserId = Number(authUser?.id) || 0;
    const snapshot = await fetchFlashcardRankingSnapshot({
      periodId: period,
      limit,
      currentUserId
    });

    res.json({
      success: true,
      period: snapshot.period,
      periodLabel: snapshot.periodLabel,
      ranking: snapshot.ranking,
      player: snapshot.player
    });
  } catch (error) {
    console.error('Erro ao listar ranking de flashcards:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar ranking de flashcards.' });
  }
});

app.get('/api/users/flashcards', async (req, res) => {
  try {
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    await ensureUsersAvatarColumn();
    await ensureFlashcardUserStateTables();
    await ensurePremiumAccessTables();
    await ensureSpeakingRealtimeTables();
    const authUser = await readAuthenticatedUserFromRequest(req).catch(() => null);
    const requesterIsAdmin = isAdminUserRecord(authUser);

    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 50)
      : 50;
    const requestedMetric = String(req.query.metric || '').trim().toLowerCase();
    const metricKey = requestedMetric === 'pronunciation'
      ? 'pronunciation'
      : requestedMetric === 'speed'
        ? 'speed'
        : requestedMetric === 'battle'
          ? 'battle'
          : 'flashcards';
    const metricLabel = metricKey === 'pronunciation'
      ? 'Pronuncia'
      : metricKey === 'speed'
        ? 'Velocidade'
        : metricKey === 'battle'
          ? 'Batalhas vencidas'
          : 'Flashcards';
    const metricValueLabel = metricKey === 'pronunciation'
      ? '%'
      : metricKey === 'speed'
        ? '/h'
        : '';

    const visibilityWhereClause = buildPublicUsersVisibilityWhereClause(requesterIsAdmin);
    const result = await pool.query(
      `SELECT
         u.id,
         COALESCE(NULLIF(u.username, ''), u.email) AS username,
         COALESCE(u.avatar_image, '') AS avatar_image,
         u.created_at,
         u.premium_full_access,
         u.premium_until,
         u.is_bot,
         u.bot_config,
         u.bot_avatar_status,
         u.bot_avatar_error,
         COALESCE(presence.last_seen_at >= (now() - interval '${SPEAKING_CHALLENGE_ONLINE_WINDOW_SECONDS} seconds'), false) AS is_online,
         COALESCE(progress.total, 0) AS flashcards_count,
         COALESCE(u.battle, 0)::int AS battles_won,
         GREATEST(
           0,
           LEAST(
             100,
             ROUND(
               COALESCE(
                 (
                   SELECT AVG(sample.value::numeric)
                   FROM jsonb_array_elements_text(COALESCE(stats.pronunciation_samples, '[]'::jsonb)) AS sample(value)
                 ),
                 0
               ) + 5
             )::int
           )
         )::int AS pronunciation_percent,
         CASE
           WHEN COALESCE(stats.training_time_ms, 0) <= 0 OR COALESCE(progress.total, 0) <= 0 THEN 0
           ELSE ROUND((COALESCE(progress.total, 0)::numeric * 3600000::numeric) / COALESCE(stats.training_time_ms, 1)::numeric, 1)
         END AS speed_flashcards_per_hour
       FROM public.users u
       LEFT JOIN (
         SELECT user_id, COUNT(*)::int AS total
         FROM public.user_flashcard_progress
         GROUP BY user_id
       ) progress
         ON progress.user_id = u.id
       LEFT JOIN public.user_flashcard_stats stats
         ON stats.user_id = u.id
       LEFT JOIN public.user_presence presence
         ON presence.user_id = u.id
       ${visibilityWhereClause}`
    );

    const entries = result.rows.map((entry) => {
      const derived = buildBotDerivedStats(entry);
      const isBot = isBotUserRecord(entry);
      const rankingValue = metricKey === 'pronunciation'
        ? derived.pronunciationPercent
        : metricKey === 'speed'
          ? derived.speedFlashcardsPerHour
          : metricKey === 'battle'
            ? derived.battlesWon
            : derived.flashcardsCount;
      return {
        ...entry,
        is_online: isBot ? true : Boolean(entry.is_online),
        flashcards_count: derived.flashcardsCount,
        pronunciation_percent: derived.pronunciationPercent,
        speed_flashcards_per_hour: derived.speedFlashcardsPerHour,
        battles_won: derived.battlesWon,
        ranking_value: rankingValue
      };
    }).sort((left, right) => {
      const primary = Number(right.ranking_value) - Number(left.ranking_value);
      if (primary !== 0) return primary;
      const flashcardsDiff = Number(right.flashcards_count) - Number(left.flashcards_count);
      if (flashcardsDiff !== 0) return flashcardsDiff;
      const leftCreatedAt = Date.parse(String(left.created_at || '').trim());
      const rightCreatedAt = Date.parse(String(right.created_at || '').trim());
      const createdAtDiff = (Number.isFinite(leftCreatedAt) ? leftCreatedAt : 0) - (Number.isFinite(rightCreatedAt) ? rightCreatedAt : 0);
      if (createdAtDiff !== 0) return createdAtDiff;
      return (Number(left.id) || 0) - (Number(right.id) || 0);
    }).map((entry, index) => ({
      ...entry,
      rank_position: index + 1
    }));

    const limitedEntries = entries.slice(0, limit);
    const viewerEntry = authUser?.id
      ? entries.find((entry) => Number(entry.id) === Number(authUser.id)) || null
      : null;

    res.json({
      success: true,
      metric: metricKey,
      metricLabel,
      metricValueLabel,
      viewer: viewerEntry ? {
        userId: Number(viewerEntry.id) || 0,
        username: String(viewerEntry.username || '').trim() || 'Usuario',
        rank: Number(viewerEntry.rank_position) || 0,
        flashcardsCount: Number(viewerEntry.flashcards_count) || 0,
        pronunciationPercent: Number(viewerEntry.pronunciation_percent) || 0,
        speedFlashcardsPerHour: Number(viewerEntry.speed_flashcards_per_hour) || 0,
        battlesWon: Number(viewerEntry.battles_won) || 0,
        rankingValue: Number(viewerEntry.ranking_value) || 0,
        isOnline: Boolean(viewerEntry.is_online)
      } : null,
      users: limitedEntries.map((entry) => ({
        userId: Number(entry.id) || 0,
        username: String(entry.username || '').trim() || 'Usuario',
        avatarImage: String(entry.avatar_image || '').trim(),
        isAdmin: isAdminUserRecord(entry),
        isBot: isBotUserRecord(entry),
        botAvatarStatus: String(entry.bot_avatar_status || '').trim() || 'ready',
        botAvatarError: String(entry.bot_avatar_error || '').trim(),
        botConfig: parseBotConfig(entry.bot_config),
        rank: Number(entry.rank_position) || 0,
        flashcardsCount: Number(entry.flashcards_count) || 0,
        pronunciationPercent: Number(entry.pronunciation_percent) || 0,
        speedFlashcardsPerHour: Number(entry.speed_flashcards_per_hour) || 0,
        battlesWon: Number(entry.battles_won) || 0,
        rankingValue: Number(entry.ranking_value) || 0,
        isOnline: Boolean(entry.is_online),
        premiumFullAccess: Boolean(entry.premium_full_access),
        premiumUntil: entry.premium_until || null,
        premiumActive: requesterIsAdmin ? isPremiumActiveFromUser(entry) : undefined
      }))
    });
  } catch (error) {
    console.error('Erro ao listar usuarios com flashcards:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar usuarios.' });
  }
});

app.get('/api/speaking/cards', async (req, res) => {
  try {
    const storyId = String(req.query.storyId || '').trim();
    const cards = await buildRandomSpeakingCards(storyId);
    if (!Array.isArray(cards) || !cards.length) {
      res.status(404).json({
        success: false,
        message: `Nenhuma historia encontrada em battle-stories (.json). Verifique: ${BATTLE_STORIES_ROOT_CANDIDATES.join(' | ')}`
      });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      success: true,
      cards
    });
  } catch (error) {
    console.error('Erro ao carregar cartas de speaking:', error);
    res.status(500).json({ success: false, message: 'Nao foi possivel carregar cartas de speaking.' });
  }
});

app.get('/api/speaking/stories', async (_req, res) => {
  try {
    const stories = await loadSpeakingCardPool();
    const miniBooksManifest = await loadMiniBooksManifest().catch(() => createDefaultMiniBooksManifest());
    const miniBooksMap = miniBooksManifest?.books && typeof miniBooksManifest.books === 'object'
      ? miniBooksManifest.books
      : {};

    const list = stories.map((story) => {
      const bookId = normalizeMiniBookId(story.bookId || story.fileName);
      const manifestEntry = normalizeMiniBookEntry(bookId, miniBooksMap[bookId] || {});
      return {
        id: String(story.id || '').trim(),
        fileName: String(story.fileName || '').trim(),
        bookId,
        bookTitle: String(story.bookTitle || '').trim() || toEnglishUnderscoreName(story.storyKey, story.fileName),
        storyKey: String(story.storyKey || '').trim(),
        nome: String(story.nome || '').trim() || toEnglishUnderscoreName(story.storyKey, story.fileName),
        nivel: normalizeSpeakingStoryLevel(story.nivel),
        count: Array.isArray(story.cards) ? story.cards.length : 0,
        coverImageUrl: manifestEntry.coverImageUrl || '',
        backgroundDesktopUrl: manifestEntry.backgroundDesktopUrl || '',
        backgroundMobileUrl: manifestEntry.backgroundMobileUrl || ''
      };
    });

    const booksMap = new Map();
    list.forEach((story) => {
      if (!story.bookId || !story.fileName) return;
      const current = booksMap.get(story.bookId);
      if (!current) {
        booksMap.set(story.bookId, {
          id: story.bookId,
          fileName: story.fileName,
          title: story.bookTitle || story.nome || story.fileName,
          nivel: story.nivel,
          count: story.count,
          storyIds: [story.id],
          selectedStoryId: story.id,
          coverImageUrl: story.coverImageUrl || '',
          backgroundDesktopUrl: story.backgroundDesktopUrl || '',
          backgroundMobileUrl: story.backgroundMobileUrl || ''
        });
        return;
      }
      current.count += story.count;
      current.storyIds.push(story.id);
      if (!current.selectedStoryId) {
        current.selectedStoryId = story.id;
      }
    });

    const books = Array.from(booksMap.values()).sort((left, right) => {
      if (left.nivel !== right.nivel) return left.nivel - right.nivel;
      return String(left.title || '').localeCompare(String(right.title || ''), 'pt-BR', {
        sensitivity: 'base',
        numeric: true
      });
    });

    const levels = Array.from({ length: 10 }, (_, index) => ({
      level: index + 1,
      count: books.filter((book) => book.nivel === (index + 1)).length
    }));

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      success: true,
      stories: list,
      books,
      levels
    });
  } catch (error) {
    console.error('Erro ao listar historias de speaking:', error);
    res.status(500).json({ success: false, message: 'Nao foi possivel carregar historias de speaking.' });
  }
});

app.post('/api/books/training/complete', express.json({ limit: '256kb' }), async (req, res) => {
  try {
    if (!pool) {
      res.status(500).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }

    const userId = Number.parseInt(authUser.id, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(400).json({ success: false, message: 'Usuario invalido para salvar progresso do livro.' });
      return;
    }

    const bookId = normalizeMiniBookId(req.body?.bookId);
    const pronunciationSamples = normalizeBooksPronunciationPayload(
      Array.isArray(req.body?.pronunciationPercents)
        ? req.body.pronunciationPercents
        : req.body?.pronunciationPercent
    );
    if (!pronunciationSamples.length) {
      res.status(400).json({ success: false, message: 'pronunciationPercent obrigatorio.' });
      return;
    }

    await ensureBooksSpeakingStatsTable();
    await ensureUserBooksLibraryStatsTable();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const pronunciationStats = await upsertUserBooksPronunciationSamples(client, userId, pronunciationSamples);
      const totalsResult = await client.query(
        `SELECT COALESCE(SUM(reads_completed), 0)::int AS total_reads
         FROM public.user_books_library_stats
         WHERE user_id = $1`,
        [userId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        bookId: bookId || null,
        stats: {
          bookReadCount: Math.max(0, Number(totalsResult.rows[0]?.total_reads) || 0),
          pronunciationTag: pronunciationStats.pronunciationTag,
          pronunciationSamplesCount: pronunciationStats.pronunciationSamplesCount,
          latestPronunciationPercent: pronunciationStats.latestPronunciationPercent,
          generalPronunciationPercent: pronunciationStats.generalPronunciationPercent,
          updatedAt: pronunciationStats.saved.updated_at || null
        }
      });
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (_rollbackError) {
        // ignore rollback error
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao salvar conclusao de treino de livro:', error);
    res.status(500).json({
      success: false,
      message: 'Nao foi possivel salvar progresso do livro agora.'
    });
  }
});

app.post('/api/books/complete', express.json({ limit: '256kb' }), async (req, res) => {
  try {
    if (!pool) {
      res.status(500).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }

    const userId = Number.parseInt(authUser.id, 10);
    const bookId = normalizeMiniBookId(req.body?.bookId);
    const mode = normalizeBookCompletionMode(req.body?.mode);
    const scorePercent = Math.max(0, Math.min(100, Math.round(Number(req.body?.scorePercent) || 0)));
    const listenedSeconds = Math.max(0, Math.round(Number(req.body?.listenedSeconds) || 0));
    const speakingChars = Math.max(0, Math.round(Number(req.body?.speakingChars) || 0));
    if (!Number.isInteger(userId) || userId <= 0 || !bookId) {
      res.status(400).json({ success: false, message: 'Dados invalidos para salvar leitura do livro.' });
      return;
    }

    await ensureUserBooksLibraryStatsTable();
    await ensureBooksSpeakingStatsTable();
    await ensureUserBooksConsumptionStatsTable();
    const book = await findSpeakingBookById(bookId);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const existingResult = await client.query(
        `SELECT reads_completed, listened_seconds, best_speaking_percent, best_listening_percent
         FROM public.user_books_library_stats
         WHERE user_id = $1 AND book_id = $2
         FOR UPDATE`,
        [userId, bookId]
      );
      const existing = existingResult.rows[0] || null;
      const nextReadsCompleted = Math.max(0, Number(existing?.reads_completed) || 0) + 1;
      const nextListenedSeconds = Math.max(0, Number(existing?.listened_seconds) || 0) + listenedSeconds;
      const nextBestSpeaking = mode === 'speaking-training'
        ? Math.max(scorePercent, Math.max(0, Number(existing?.best_speaking_percent) || 0))
        : (existing?.best_speaking_percent == null ? null : Math.max(0, Number(existing.best_speaking_percent) || 0));
      const nextBestListening = mode === 'listening-training'
        ? Math.max(scorePercent, Math.max(0, Number(existing?.best_listening_percent) || 0))
        : (existing?.best_listening_percent == null ? null : Math.max(0, Number(existing.best_listening_percent) || 0));

      await client.query(
        `INSERT INTO public.user_books_library_stats (
           user_id, book_id, book_title, cover_image_url, background_desktop_url,
           reads_completed, listened_seconds, best_speaking_percent, best_listening_percent, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
         ON CONFLICT (user_id, book_id)
         DO UPDATE
           SET book_title = EXCLUDED.book_title,
               cover_image_url = EXCLUDED.cover_image_url,
               background_desktop_url = EXCLUDED.background_desktop_url,
               reads_completed = EXCLUDED.reads_completed,
               listened_seconds = EXCLUDED.listened_seconds,
               best_speaking_percent = EXCLUDED.best_speaking_percent,
               best_listening_percent = EXCLUDED.best_listening_percent,
               updated_at = now()`,
        [
          userId,
          bookId,
          normalizeMiniBookText(book?.title || book?.nome || ''),
          normalizeMiniBookText(book?.coverImageUrl || ''),
          normalizeMiniBookText(book?.backgroundDesktopUrl || ''),
          nextReadsCompleted,
          nextListenedSeconds,
          nextBestSpeaking,
          nextBestListening
        ]
      );

      if (speakingChars > 0) {
        await client.query(
          `INSERT INTO public.user_books_consumption_stats (
             user_id, speaking_chars, listening_chars, practice_seconds, updated_at
           ) VALUES ($1, $2, 0, 0, now())
           ON CONFLICT (user_id)
           DO UPDATE
             SET speaking_chars = public.user_books_consumption_stats.speaking_chars + EXCLUDED.speaking_chars,
                 updated_at = now()`,
          [userId, speakingChars]
        );
      }

      const totalsResult = await client.query(
        `SELECT COALESCE(SUM(reads_completed), 0)::int AS total_reads
         FROM public.user_books_library_stats
         WHERE user_id = $1`,
        [userId]
      );
      const pronunciationResult = await client.query(
        `SELECT pronunciation_sum, pronunciation_samples_count, latest_pronunciation_percent, pronunciation_samples
         FROM public.user_books_speaking_stats
         WHERE user_id = $1
         LIMIT 1`,
        [userId]
      );
      const [qualifiedBookIds, bookBestPercentById] = await Promise.all([
        getQualifiedUserBookIds(client, userId),
        getUserBookBestPercentById(client, userId)
      ]);
      await client.query('COMMIT');
      const pronunciationStats = getBooksPronunciationAggregateFromRow(pronunciationResult.rows[0]);

      res.json({
        success: true,
        bookId,
        mode,
        stats: {
          bookReadCount: Math.max(0, Number(totalsResult.rows[0]?.total_reads) || 0),
          generalPronunciationPercent: pronunciationStats.generalPronunciationPercent,
          pronunciationSamplesCount: pronunciationStats.pronunciationSamplesCount,
          latestPronunciationPercent: pronunciationStats.latestPronunciationPercent,
          qualifiedBookIds,
          qualifiedBookCount: qualifiedBookIds.length,
          bookBestPercentById,
          book: {
            readsCompleted: nextReadsCompleted,
            listenedSeconds: nextListenedSeconds,
            bestSpeakingPercent: nextBestSpeaking,
            bestListeningPercent: nextBestListening
          }
        }
      });
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (_rollbackError) {
        // ignore
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao salvar conclusao de livro:', error);
    res.status(500).json({ success: false, message: 'Nao foi possivel salvar a leitura do livro agora.' });
  }
});

app.get('/api/books/stats', async (req, res) => {
  try {
    if (!pool) {
      res.status(500).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }

    const userId = Number.parseInt(authUser.id, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(400).json({ success: false, message: 'Usuario invalido.' });
      return;
    }

    await ensureUserBooksLibraryStatsTable();
    await ensureBooksSpeakingStatsTable();
    await ensureUserBooksConsumptionStatsTable();

    const [totalsResult, speakingStatsResult, consumptionResult, qualifiedBooksResult, bookBestPercentById] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(reads_completed), 0)::int AS total_reads
         FROM public.user_books_library_stats
         WHERE user_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT pronunciation_sum, pronunciation_samples_count, latest_pronunciation_percent, pronunciation_samples
         FROM public.user_books_speaking_stats
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT 1`,
        [userId]
      ),
      pool.query(
        `SELECT speaking_chars, listening_chars, practice_seconds
         FROM public.user_books_consumption_stats
         WHERE user_id = $1
         LIMIT 1`,
        [userId]
      ),
      getQualifiedUserBookIds(pool, userId),
      getUserBookBestPercentById(pool, userId)
    ]);

    const pronunciationStats = getBooksPronunciationAggregateFromRow(speakingStatsResult.rows[0]);
    const consumption = consumptionResult.rows[0] || {};
    const qualifiedBookIds = Array.isArray(qualifiedBooksResult) ? qualifiedBooksResult : [];

    res.json({
      success: true,
      stats: {
        bookReadCount: Math.max(0, Number(totalsResult.rows[0]?.total_reads) || 0),
        generalPronunciationPercent: pronunciationStats.generalPronunciationPercent,
        pronunciationSamplesCount: pronunciationStats.pronunciationSamplesCount,
        latestPronunciationPercent: pronunciationStats.latestPronunciationPercent,
        speakingChars: Math.max(0, Number(consumption.speaking_chars) || 0),
        listeningChars: Math.max(0, Number(consumption.listening_chars) || 0),
        practiceSeconds: Math.max(0, Number(consumption.practice_seconds) || 0),
        qualifiedBookIds,
        qualifiedBookCount: qualifiedBookIds.length,
        bookBestPercentById
      }
    });
  } catch (error) {
    console.error('Erro ao carregar estatisticas de livros:', error);
    res.status(500).json({ success: false, message: 'Nao foi possivel carregar estatisticas agora.' });
  }
});

app.post('/api/books/listening-progress', express.json({ limit: '64kb' }), async (req, res) => {
  try {
    if (!pool) {
      res.status(500).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }

    const userId = Number.parseInt(authUser.id, 10);
    const listeningCharsDelta = Math.max(0, Math.round(Number(req.body?.listeningCharsDelta) || 0));
    const practiceSecondsDelta = Math.max(0, Math.round(Number(req.body?.practiceSecondsDelta) || 0));
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(400).json({ success: false, message: 'Usuario invalido.' });
      return;
    }
    if (!listeningCharsDelta && !practiceSecondsDelta) {
      res.json({ success: true, stats: null });
      return;
    }

    await ensureUserBooksConsumptionStatsTable();

    const result = await pool.query(
      `INSERT INTO public.user_books_consumption_stats (
         user_id, speaking_chars, listening_chars, practice_seconds, updated_at
       ) VALUES ($1, 0, $2, $3, now())
       ON CONFLICT (user_id)
       DO UPDATE
         SET listening_chars = public.user_books_consumption_stats.listening_chars + EXCLUDED.listening_chars,
             practice_seconds = public.user_books_consumption_stats.practice_seconds + EXCLUDED.practice_seconds,
             updated_at = now()
       RETURNING speaking_chars, listening_chars, practice_seconds`,
      [userId, listeningCharsDelta, practiceSecondsDelta]
    );

    res.json({
      success: true,
      stats: {
        speakingChars: Math.max(0, Number(result.rows[0]?.speaking_chars) || 0),
        listeningChars: Math.max(0, Number(result.rows[0]?.listening_chars) || 0),
        practiceSeconds: Math.max(0, Number(result.rows[0]?.practice_seconds) || 0)
      }
    });
  } catch (error) {
    console.error('Erro ao salvar listening progress:', error);
    res.status(500).json({ success: false, message: 'Nao foi possivel salvar listening agora.' });
  }
});

app.post('/api/admin/minibooks/generate-cover', express.json({ limit: '2mb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);
  } catch (error) {
    const statusCode = Number(error?.statusCode || 401);
    res.status(statusCode).json({ error: error.message || 'Acesso negado.' });
    return;
  }

  try {
    const bookId = normalizeMiniBookId(req.body?.bookId);
    const book = await findSpeakingBookById(bookId);
    if (!book) {
      res.status(404).json({ error: 'MiniBook nao encontrado para esse bookId.' });
      return;
    }

    const customPrompt = normalizeMiniBookText(req.body?.prompt);
    const prompt = customPrompt || [
      MINIBOOKS_DEFAULT_COVER_PROMPT,
      `Book concept: ${book.title}.`,
      'Focus on one iconic visual symbol of this topic.'
    ].join(' ');

    const generated = await generateMiniBookImageWithOpenAi(prompt, {
      size: '1024x1536',
      quality: 'medium'
    });
    const optimizedBuffer = await optimizeMiniBookAssetToWebp(generated.buffer, 'cover');
    if (!optimizedBuffer?.length) {
      res.status(422).json({ error: 'Nao foi possivel otimizar a capa em WebP.' });
      return;
    }

    res.json({
      success: true,
      model: OPENAI_AVATAR_IMAGE_MODEL,
      book: {
        id: book.bookId,
        title: book.title,
        level: book.level
      },
      promptUsed: prompt,
      dataUrl: `data:image/webp;base64,${optimizedBuffer.toString('base64')}`,
      usage: generated.usage || null
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 502);
    res.status(statusCode).json({
      error: 'Falha ao gerar capa do MiniBook.',
      details: error.message,
      instructions: error.instructions || null
    });
  }
});

app.post('/api/admin/minibooks/generate-background', express.json({ limit: '2mb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);
  } catch (error) {
    const statusCode = Number(error?.statusCode || 401);
    res.status(statusCode).json({ error: error.message || 'Acesso negado.' });
    return;
  }

  try {
    const bookId = normalizeMiniBookId(req.body?.bookId);
    const book = await findSpeakingBookById(bookId);
    if (!book) {
      res.status(404).json({ error: 'MiniBook nao encontrado para esse bookId.' });
      return;
    }

    const customPrompt = normalizeMiniBookText(req.body?.prompt);
    const prompt = customPrompt || [
      MINIBOOKS_DEFAULT_BACKGROUND_PROMPT,
      `Book concept: ${book.title}.`,
      'Keep room for UI overlays and text readability.'
    ].join(' ');

    const [desktopGenerated, mobileGenerated] = await Promise.all([
      generateMiniBookImageWithOpenAi(prompt, { size: '1536x1024', quality: 'medium' }),
      generateMiniBookImageWithOpenAi(prompt, { size: '1024x1536', quality: 'medium' })
    ]);

    const [desktopBuffer, mobileBuffer] = await Promise.all([
      optimizeMiniBookAssetToWebp(desktopGenerated.buffer, 'background-desktop'),
      optimizeMiniBookAssetToWebp(mobileGenerated.buffer, 'background-mobile')
    ]);

    if (!desktopBuffer?.length || !mobileBuffer?.length) {
      res.status(422).json({ error: 'Nao foi possivel otimizar os backgrounds em WebP.' });
      return;
    }

    res.json({
      success: true,
      model: OPENAI_AVATAR_IMAGE_MODEL,
      book: {
        id: book.bookId,
        title: book.title,
        level: book.level
      },
      promptUsed: prompt,
      desktopDataUrl: `data:image/webp;base64,${desktopBuffer.toString('base64')}`,
      mobileDataUrl: `data:image/webp;base64,${mobileBuffer.toString('base64')}`,
      usage: {
        desktop: desktopGenerated.usage || null,
        mobile: mobileGenerated.usage || null
      }
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 502);
    res.status(statusCode).json({
      error: 'Falha ao gerar background do MiniBook.',
      details: error.message,
      instructions: error.instructions || null
    });
  }
});

app.post('/api/admin/minibooks/save-cover', express.json({ limit: '30mb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);
  } catch (error) {
    const statusCode = Number(error?.statusCode || 401);
    res.status(statusCode).json({ error: error.message || 'Acesso negado.' });
    return;
  }

  if (!isR2FluencyConfigured()) {
    res.status(503).json({ error: 'R2 nao configurado para salvar MiniBooks.' });
    return;
  }

  try {
    const bookId = normalizeMiniBookId(req.body?.bookId);
    const imageDataUrl = normalizeMiniBookText(req.body?.imageDataUrl);
    const prompt = normalizeMiniBookText(req.body?.prompt);
    const book = await findSpeakingBookById(bookId);
    if (!book) {
      res.status(404).json({ error: 'MiniBook nao encontrado para esse bookId.' });
      return;
    }
    const parsed = parseBase64DataUrl(imageDataUrl);
    if (!parsed?.buffer?.length || !/^image\//i.test(parsed.mimeType || '')) {
      res.status(400).json({ error: 'Imagem da capa invalida.' });
      return;
    }
    const optimizedBuffer = await optimizeMiniBookAssetToWebp(parsed.buffer, 'cover');
    if (!optimizedBuffer?.length) {
      res.status(422).json({ error: 'Nao foi possivel otimizar a capa para WebP.' });
      return;
    }

    const objectKey = buildMiniBookObjectKey(bookId, 'cover');
    await putR2Object(objectKey, optimizedBuffer, 'image/webp');
    const coverImageUrl = `${buildFlashcardsR2PublicUrl(objectKey)}?v=${Date.now()}`;

    const manifest = await loadMiniBooksManifest();
    const previousEntry = normalizeMiniBookEntry(bookId, manifest.books?.[bookId] || {});
    manifest.books = manifest.books || {};
    manifest.books[bookId] = normalizeMiniBookEntry(bookId, {
      ...previousEntry,
      bookId,
      fileName: book.fileName,
      title: book.title,
      level: book.level,
      coverImageUrl,
      coverObjectKey: objectKey,
      coverPrompt: prompt || previousEntry.coverPrompt || '',
      updatedAt: new Date().toISOString()
    });
    manifest.updatedAt = new Date().toISOString();
    const savedManifest = await persistMiniBooksManifest(manifest);
    const savedEntry = normalizeMiniBookEntry(bookId, savedManifest.books?.[bookId] || {});

    res.json({
      success: true,
      book: savedEntry
    });
  } catch (error) {
    res.status(500).json({
      error: 'Falha ao salvar capa do MiniBook.',
      details: error.message
    });
  }
});

app.post('/api/admin/minibooks/save-background', express.json({ limit: '60mb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);
  } catch (error) {
    const statusCode = Number(error?.statusCode || 401);
    res.status(statusCode).json({ error: error.message || 'Acesso negado.' });
    return;
  }

  if (!isR2FluencyConfigured()) {
    res.status(503).json({ error: 'R2 nao configurado para salvar MiniBooks.' });
    return;
  }

  try {
    const bookId = normalizeMiniBookId(req.body?.bookId);
    const desktopDataUrl = normalizeMiniBookText(req.body?.desktopDataUrl);
    const mobileDataUrl = normalizeMiniBookText(req.body?.mobileDataUrl);
    const prompt = normalizeMiniBookText(req.body?.prompt);
    const book = await findSpeakingBookById(bookId);
    if (!book) {
      res.status(404).json({ error: 'MiniBook nao encontrado para esse bookId.' });
      return;
    }

    const desktopParsed = parseBase64DataUrl(desktopDataUrl);
    const mobileParsed = parseBase64DataUrl(mobileDataUrl);
    if (!desktopParsed?.buffer?.length || !/^image\//i.test(desktopParsed.mimeType || '')) {
      res.status(400).json({ error: 'Background desktop invalido.' });
      return;
    }
    if (!mobileParsed?.buffer?.length || !/^image\//i.test(mobileParsed.mimeType || '')) {
      res.status(400).json({ error: 'Background mobile invalido.' });
      return;
    }

    const [desktopBuffer, mobileBuffer] = await Promise.all([
      optimizeMiniBookAssetToWebp(desktopParsed.buffer, 'background-desktop'),
      optimizeMiniBookAssetToWebp(mobileParsed.buffer, 'background-mobile')
    ]);
    if (!desktopBuffer?.length || !mobileBuffer?.length) {
      res.status(422).json({ error: 'Nao foi possivel otimizar os backgrounds para WebP.' });
      return;
    }

    const desktopObjectKey = buildMiniBookObjectKey(bookId, 'background-desktop');
    const mobileObjectKey = buildMiniBookObjectKey(bookId, 'background-mobile');
    await Promise.all([
      putR2Object(desktopObjectKey, desktopBuffer, 'image/webp'),
      putR2Object(mobileObjectKey, mobileBuffer, 'image/webp')
    ]);
    const cacheBuster = Date.now();
    const backgroundDesktopUrl = `${buildFlashcardsR2PublicUrl(desktopObjectKey)}?v=${cacheBuster}`;
    const backgroundMobileUrl = `${buildFlashcardsR2PublicUrl(mobileObjectKey)}?v=${cacheBuster}`;

    const manifest = await loadMiniBooksManifest();
    const previousEntry = normalizeMiniBookEntry(bookId, manifest.books?.[bookId] || {});
    manifest.books = manifest.books || {};
    manifest.books[bookId] = normalizeMiniBookEntry(bookId, {
      ...previousEntry,
      bookId,
      fileName: book.fileName,
      title: book.title,
      level: book.level,
      backgroundDesktopUrl,
      backgroundDesktopObjectKey: desktopObjectKey,
      backgroundMobileUrl,
      backgroundMobileObjectKey: mobileObjectKey,
      backgroundPrompt: prompt || previousEntry.backgroundPrompt || '',
      updatedAt: new Date().toISOString()
    });
    manifest.updatedAt = new Date().toISOString();
    const savedManifest = await persistMiniBooksManifest(manifest);
    const savedEntry = normalizeMiniBookEntry(bookId, savedManifest.books?.[bookId] || {});

    res.json({
      success: true,
      book: savedEntry
    });
  } catch (error) {
    res.status(500).json({
      error: 'Falha ao salvar background do MiniBook.',
      details: error.message
    });
  }
});

app.post('/api/admin/minibooks/save-json', express.json({ limit: '6mb' }), async (req, res) => {
  let adminUser = null;
  try {
    adminUser = await requireAdminUserFromRequest(req);
  } catch (error) {
    const statusCode = Number(error?.statusCode || 401);
    res.status(statusCode).json({ error: error.message || 'Acesso negado.' });
    return;
  }

  if (!pool) {
    res.status(503).json({ error: 'DATABASE_URL nao configurada.' });
    return;
  }

  try {
    const rawBookId = String(req.body?.bookId || '').trim();
    if (!rawBookId) {
      res.status(400).json({ error: 'bookId obrigatorio para salvar JSON no livro certo.' });
      return;
    }
    const requestedBookId = normalizeMiniBookId(rawBookId);
    const existingBook = await findSpeakingBookById(requestedBookId);
    const localBookMetadata = await findLocalSpeakingBookMetadataById(requestedBookId);
    const metadataSource = localBookMetadata || existingBook;
    if (!metadataSource) {
      res.status(404).json({ error: 'Livro nao encontrado para esse bookId.' });
      return;
    }

    const jsonText = normalizeMiniBookText(req.body?.jsonText || req.body?.content || req.body?.payload);
    if (!jsonText) {
      res.status(400).json({ error: 'Cole o JSON do MiniBook antes de salvar.' });
      return;
    }

    let parsedPayload = null;
    try {
      parsedPayload = JSON.parse(jsonText);
    } catch (_error) {
      res.status(400).json({ error: 'JSON invalido. Confira virgulas, aspas e colchetes.' });
      return;
    }

    if (!parsedPayload || typeof parsedPayload !== 'object' || Array.isArray(parsedPayload)) {
      res.status(400).json({ error: 'O JSON precisa ser um objeto no formato de livro.' });
      return;
    }

    const parsedMiniBook = buildMiniBookStoriesFromJsonPayload(parsedPayload, {
      bookId: requestedBookId,
      fileName: metadataSource.fileName,
      bookTitle: metadataSource.title,
      level: metadataSource.level
    });
    if (!Array.isArray(parsedMiniBook.stories) || !parsedMiniBook.stories.length) {
      res.status(422).json({
        error: 'Esse JSON nao trouxe historias validas. Use arrays com frases no formato {"en":"...","pt":"..."} ou {"english":"...","portuguese":"..."}'
      });
      return;
    }

    const normalizedPayload = {
      ...parsedPayload,
      bookId: parsedMiniBook.bookId,
      fileName: normalizeMiniBookText(parsedPayload.fileName, metadataSource.fileName),
      nome: normalizeMiniBookText(parsedPayload.nome || parsedPayload.title, metadataSource.title),
      nivel: normalizeSpeakingStoryLevel(parsedPayload.nivel ?? parsedPayload.level ?? metadataSource.level)
    };

    await ensureMiniBookJsonTables();
    await pool.query(
      `INSERT INTO public.minibook_json_content (
         book_id,
         file_name,
         title,
         level,
         payload,
         updated_by_user_id,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, now())
       ON CONFLICT (book_id)
       DO UPDATE SET
         file_name = EXCLUDED.file_name,
         title = EXCLUDED.title,
         level = EXCLUDED.level,
         payload = EXCLUDED.payload,
         updated_by_user_id = EXCLUDED.updated_by_user_id,
         updated_at = now()`,
      [
        parsedMiniBook.bookId,
        parsedMiniBook.fileName,
        parsedMiniBook.bookTitle,
        parsedMiniBook.level,
        JSON.stringify(normalizedPayload),
        Number(adminUser?.id) || null
      ]
    );

    invalidateSpeakingCardsCache();

    const storiesCount = parsedMiniBook.stories.length;
    const cardsCount = parsedMiniBook.stories.reduce((total, story) => (
      total + (Array.isArray(story.cards) ? story.cards.length : 0)
    ), 0);

    res.json({
      success: true,
      book: {
        id: parsedMiniBook.bookId,
        fileName: parsedMiniBook.fileName,
        title: parsedMiniBook.bookTitle,
        level: parsedMiniBook.level
      },
      stats: {
        storiesCount,
        cardsCount
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Falha ao salvar JSON do MiniBook no Postgres.',
      details: error.message
    });
  }
});

app.get('/api/admin/minibooks/edit-lines', async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);
  } catch (error) {
    const statusCode = Number(error?.statusCode || 401);
    res.status(statusCode).json({ error: error.message || 'Acesso negado.' });
    return;
  }

  try {
    const bookId = normalizeMiniBookId(req.query?.bookId || '');
    if (!bookId) {
      res.status(400).json({ error: 'bookId obrigatorio para abrir o editor.' });
      return;
    }

    const source = await loadEditableMiniBookSource(bookId);
    if (!source?.payload) {
      res.status(404).json({ error: 'Livro nao encontrado para edicao.' });
      return;
    }

    const manifest = await loadMiniBooksManifest().catch(() => createDefaultMiniBooksManifest());
    const manifestEntry = normalizeMiniBookEntry(bookId, manifest?.books?.[bookId] || {});
    const editorPayload = buildMiniBookEditorLinesPayload(source, manifestEntry);
    if (!editorPayload?.linesText) {
      res.status(422).json({ error: 'Nao foi possivel montar as linhas desse livro para edicao.' });
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      success: true,
      book: {
        id: source.bookId,
        title: editorPayload.title,
        level: editorPayload.level
      },
      linesText: editorPayload.linesText,
      voice: 'openai:fable'
    });
  } catch (error) {
    res.status(Number(error?.statusCode || 500)).json({
      error: error.message || 'Falha ao abrir o editor do MiniBook.',
      details: error.details || null
    });
  }
});

app.post('/api/admin/minibooks/write-lines', express.json({ limit: '2mb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);
  } catch (error) {
    const statusCode = Number(error?.statusCode || 401);
    res.status(statusCode).json({ error: error.message || 'Acesso negado.' });
    return;
  }

  try {
    const userPrompt = normalizeMiniBookText(req.body?.userPrompt || req.body?.prompt);
    const targetChars = Math.max(0, Math.min(1500, Number.parseInt(req.body?.targetChars, 10) || 0));
    const englishCharsTarget = targetChars;
    const estimatedPairs = Math.max(4, Math.min(70, Math.round((englishCharsTarget > 0 ? englishCharsTarget : 220) / 18)));

    const writingPrompt = [
      'Use the BASE PROMPT as immutable guidance:',
      MINIBOOKS_WRITER_BASE_PROMPT,
      '',
      'Now generate a minibook draft and return JSON only (no markdown, no commentary).',
      'Required JSON schema:',
      '{',
      '  "title": "string",',
      '  "level": 1,',
      '  "slug": "lowercase-hyphen-name",',
      '  "coverPrompt": "around 250 chars prompt for a professional bestseller-style cover with title/logline in Portuguese and typography harmonized with the theme",',
      '  "backgroundPrompt": "bright, creative, coherent high-quality background prompt aligned with the theme",',
      '  "pairs": [',
      '    {"pt":"Portuguese line", "en":"Faithful English translation"}',
      '  ]',
      '}',
      '',
      'Formatting constraints:',
      '- Line 1 will be title.',
      '- Line 2 will be english level from 1 to 10.',
      '- Line 3 must be lowercase slug separated by hyphen.',
      '- Line 4 cover prompt (about 250 chars).',
      '- Line 5 background prompt.',
      '- The cover prompt must ask for title and logline in Portuguese.',
      '- The cover style must harmonize typography, palette, and mood with the theme like premium editorial book design.',
      '- The background prompt must prefer bright, creative, high-quality imagery and may be abstract when the theme suggests it.',
      '- From line 6 onward, output pairs pt/en.',
      '- Every pt/en sentence must have at most 27 characters.',
      '- Keep modern clear English, lightly informal, easy to understand.',
      '- The requested character count applies to English lines only.',
      '',
      `Requested English character count: ${englishCharsTarget}`,
      `Suggested pair count target: ${estimatedPairs}`,
      `User theme request: ${userPrompt || 'Create a balanced educational minibook that promotes respect and reading habit.'}`
    ].join('\n');

    const { payload, parsed } = await requestOpenAiJsonPayload(writingPrompt, {
      model: MINIBOOKS_WRITER_MODEL,
      maxOutputTokens: 3200
    });

    const writerResult = buildMiniBookLinesTextFromWriterJson(parsed, { targetChars: englishCharsTarget });

    res.json({
      success: true,
      model: MINIBOOKS_WRITER_MODEL,
      linesText: writerResult.linesText,
      book: {
        title: writerResult.title,
        level: writerResult.level,
        slug: writerResult.slug
      },
      stats: {
        pairsCount: writerResult.pairsCount,
        englishChars: writerResult.englishChars,
        requestedChars: writerResult.requestedChars
      },
      usage: payload?.usage || null
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    res.status(statusCode).json({
      error: error.message || 'Falha ao escrever minibook com IA.',
      details: error.details || null,
      instructions: error.instructions || null
    });
  }
});

const MINIBOOK_CREATE_JOBS_RETENTION_MS = 1000 * 60 * 60 * 12;
const MINIBOOK_CREATE_JOBS_ACTIVE_RETENTION_MS = 1000 * 60 * 60 * 24;
const miniBookCreateJobs = new Map();

function normalizeMiniBookCreateJobProgress(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function serializeMiniBookCreateJob(job) {
  if (!job || typeof job !== 'object') return null;
  return {
    id: String(job.id || '').trim(),
    requestedByUserId: Math.max(0, Number(job.requestedByUserId) || 0),
    status: String(job.status || 'queued').trim().toLowerCase(),
    progress: normalizeMiniBookCreateJobProgress(job.progress),
    step: String(job.step || '').trim(),
    createdAt: String(job.createdAt || '').trim(),
    startedAt: String(job.startedAt || '').trim(),
    finishedAt: String(job.finishedAt || '').trim(),
    updatedAt: String(job.updatedAt || '').trim(),
    errorMessage: String(job.errorMessage || '').trim(),
    book: {
      id: String(job?.book?.id || '').trim(),
      fileName: String(job?.book?.fileName || '').trim(),
      title: String(job?.book?.title || 'Livro').trim(),
      level: normalizeSpeakingStoryLevel(job?.book?.level)
    },
    audio: {
      provider: String(job?.audio?.provider || '').trim(),
      voice: String(job?.audio?.voice || '').trim(),
      voiceLabel: String(job?.audio?.voiceLabel || '').trim(),
      count: Math.max(0, Number(job?.audio?.count) || 0)
    },
    stats: job?.stats && typeof job.stats === 'object'
      ? {
        storiesCount: Math.max(0, Number(job.stats.storiesCount) || 0),
        cardsCount: Math.max(0, Number(job.stats.cardsCount) || 0)
      }
      : null
  };
}

function cleanupMiniBookCreateJobs() {
  const now = Date.now();
  miniBookCreateJobs.forEach((job, jobId) => {
    const serialized = serializeMiniBookCreateJob(job);
    const updatedAtMs = Date.parse(serialized?.updatedAt || serialized?.createdAt || '') || 0;
    if (!updatedAtMs) return;
    const active = serialized?.status === 'queued' || serialized?.status === 'running';
    const ttl = active ? MINIBOOK_CREATE_JOBS_ACTIVE_RETENTION_MS : MINIBOOK_CREATE_JOBS_RETENTION_MS;
    if ((now - updatedAtMs) > ttl) {
      miniBookCreateJobs.delete(jobId);
    }
  });
}

function updateMiniBookCreateJob(jobId, patch = {}) {
  const targetId = String(jobId || '').trim();
  if (!targetId) return null;
  const previous = miniBookCreateJobs.get(targetId);
  if (!previous) return null;
  const next = {
    ...previous,
    ...patch,
    progress: normalizeMiniBookCreateJobProgress(
      patch.progress === undefined ? previous.progress : patch.progress
    ),
    updatedAt: new Date().toISOString()
  };
  miniBookCreateJobs.set(targetId, next);
  return next;
}

async function runMiniBookCreateFromLinesPipeline({ createInput, audioSelection, adminUserId, onProgress }) {
  const progress = typeof onProgress === 'function'
    ? (percent, step) => onProgress(normalizeMiniBookCreateJobProgress(percent), String(step || '').trim())
    : () => {};
  const cacheBuster = Date.now();
  const totalCards = Array.isArray(createInput?.cards) ? createInput.cards.length : 0;

  progress(4, 'Criando job...');
  progress(8, 'Gerando audios...');
  for (let index = 0; index < createInput.cards.length; index += 1) {
    const card = createInput.cards[index];
    const generatedAudio = audioSelection.provider === 'elevenlabs'
      ? await generateMiniBookSpeechWithElevenLabs(card.en, { languageCode: 'en', voice: audioSelection.voice })
      : await generateMiniBookSpeechWithOpenAi(card.en, { voice: audioSelection.voice });
    const audioObjectKey = buildMiniBookAudioObjectKey(createInput.bookId, index);
    await putR2Object(audioObjectKey, generatedAudio.buffer, generatedAudio.mimeType || 'audio/mpeg');
    card.audio = `${buildFlashcardsR2PublicUrl(audioObjectKey)}?v=${cacheBuster}`;
    const ratio = totalCards > 0 ? ((index + 1) / totalCards) : 1;
    progress(8 + Math.round(ratio * 44), `Gerando audios ${index + 1}/${Math.max(1, totalCards)}...`);
  }

  progress(54, 'Montando JSON...');
  const payload = buildMiniBookJsonPayloadFromCreateInput(createInput);
  const parsedMiniBook = buildMiniBookStoriesFromJsonPayload(payload, {
    bookId: createInput.bookId,
    fileName: createInput.fileName,
    bookTitle: createInput.title,
    level: createInput.level
  });
  if (!Array.isArray(parsedMiniBook.stories) || !parsedMiniBook.stories.length) {
    const error = new Error('As frases enviadas nao produziram historias validas para o livro.');
    error.statusCode = 422;
    throw error;
  }

  progress(62, 'Salvando no Postgres...');
  await ensureMiniBookJsonTables();
  await pool.query(
    `INSERT INTO public.minibook_json_content (
       book_id,
       file_name,
       title,
       level,
       payload,
       updated_by_user_id,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, now())
     ON CONFLICT (book_id)
     DO UPDATE SET
       file_name = EXCLUDED.file_name,
       title = EXCLUDED.title,
       level = EXCLUDED.level,
       payload = EXCLUDED.payload,
       updated_by_user_id = EXCLUDED.updated_by_user_id,
       updated_at = now()`,
    [
      parsedMiniBook.bookId,
      parsedMiniBook.fileName,
      parsedMiniBook.bookTitle,
      parsedMiniBook.level,
      JSON.stringify(payload),
      Number(adminUserId) || null
    ]
  );
  invalidateSpeakingCardsCache();

  const coverPrompt = normalizeMiniBookText(createInput.coverPrompt, [
    MINIBOOKS_DEFAULT_COVER_PROMPT,
    `Book concept: ${createInput.title}.`
  ].join(' '));
  const backgroundPrompt = normalizeMiniBookText(createInput.backgroundPrompt, [
    MINIBOOKS_DEFAULT_BACKGROUND_PROMPT,
    `Book concept: ${createInput.title}.`
  ].join(' '));

  progress(70, 'Gerando capa e backgrounds...');
  const [coverGenerated, desktopGenerated, mobileGenerated] = await Promise.all([
    generateMiniBookImageWithOpenAi(coverPrompt, { size: '1024x1536', quality: 'medium' }),
    generateMiniBookImageWithOpenAi(backgroundPrompt, { size: '1536x1024', quality: 'medium' }),
    generateMiniBookImageWithOpenAi(backgroundPrompt, { size: '1024x1536', quality: 'medium' })
  ]);

  progress(82, 'Otimizando imagens...');
  const [coverBuffer, desktopBuffer, mobileBuffer] = await Promise.all([
    optimizeMiniBookAssetToWebp(coverGenerated.buffer, 'cover'),
    optimizeMiniBookAssetToWebp(desktopGenerated.buffer, 'background-desktop'),
    optimizeMiniBookAssetToWebp(mobileGenerated.buffer, 'background-mobile')
  ]);

  const coverObjectKey = buildMiniBookObjectKey(parsedMiniBook.bookId, 'cover');
  const desktopObjectKey = buildMiniBookObjectKey(parsedMiniBook.bookId, 'background-desktop');
  const mobileObjectKey = buildMiniBookObjectKey(parsedMiniBook.bookId, 'background-mobile');

  progress(90, 'Publicando no R2...');
  await Promise.all([
    putR2Object(coverObjectKey, coverBuffer, 'image/webp'),
    putR2Object(desktopObjectKey, desktopBuffer, 'image/webp'),
    putR2Object(mobileObjectKey, mobileBuffer, 'image/webp')
  ]);

  const coverImageUrl = `${buildFlashcardsR2PublicUrl(coverObjectKey)}?v=${cacheBuster}`;
  const backgroundDesktopUrl = `${buildFlashcardsR2PublicUrl(desktopObjectKey)}?v=${cacheBuster}`;
  const backgroundMobileUrl = `${buildFlashcardsR2PublicUrl(mobileObjectKey)}?v=${cacheBuster}`;

  progress(96, 'Atualizando manifest...');
  const manifest = await loadMiniBooksManifest();
  const previousEntry = normalizeMiniBookEntry(parsedMiniBook.bookId, manifest.books?.[parsedMiniBook.bookId] || {});
  manifest.books = manifest.books || {};
  manifest.books[parsedMiniBook.bookId] = normalizeMiniBookEntry(parsedMiniBook.bookId, {
    ...previousEntry,
    bookId: parsedMiniBook.bookId,
    fileName: parsedMiniBook.fileName,
    title: parsedMiniBook.bookTitle,
    level: parsedMiniBook.level,
    coverImageUrl,
    coverObjectKey,
    coverPrompt,
    backgroundDesktopUrl,
    backgroundDesktopObjectKey: desktopObjectKey,
    backgroundMobileUrl,
    backgroundMobileObjectKey: mobileObjectKey,
    backgroundPrompt,
    updatedAt: new Date().toISOString()
  });
  manifest.updatedAt = new Date().toISOString();
  const savedManifest = await persistMiniBooksManifest(manifest);
  const savedEntry = normalizeMiniBookEntry(parsedMiniBook.bookId, savedManifest.books?.[parsedMiniBook.bookId] || {});

  const storiesCount = parsedMiniBook.stories.length;
  const cardsCount = parsedMiniBook.stories.reduce((total, story) => (
    total + (Array.isArray(story.cards) ? story.cards.length : 0)
  ), 0);

  progress(100, 'Finalizado.');
  return {
    book: {
      id: parsedMiniBook.bookId,
      fileName: parsedMiniBook.fileName,
      title: parsedMiniBook.bookTitle,
      level: parsedMiniBook.level,
      coverImageUrl: savedEntry.coverImageUrl || '',
      backgroundDesktopUrl: savedEntry.backgroundDesktopUrl || '',
      backgroundMobileUrl: savedEntry.backgroundMobileUrl || ''
    },
    stats: {
      storiesCount,
      cardsCount
    },
    audio: {
      provider: audioSelection.provider,
      voice: audioSelection.voice,
      voiceLabel: audioSelection.voiceLabel,
      count: createInput.cards.length
    }
  };
}

app.get('/api/admin/minibooks/create-jobs', async (req, res) => {
  let adminUser = null;
  try {
    adminUser = await requireAdminUserFromRequest(req);
  } catch (error) {
    const statusCode = Number(error?.statusCode || 401);
    res.status(statusCode).json({ error: error.message || 'Acesso negado.' });
    return;
  }

  cleanupMiniBookCreateJobs();
  const adminUserId = Number(adminUser?.id) || 0;
  const jobs = Array.from(miniBookCreateJobs.values())
    .map((job) => serializeMiniBookCreateJob(job))
    .filter(Boolean)
    .filter((job) => (Number(job.requestedByUserId || adminUserId) || 0) === adminUserId)
    .sort((left, right) => String(right?.updatedAt || '').localeCompare(String(left?.updatedAt || '')))
    .slice(0, 50);

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    success: true,
    jobs
  });
});

app.post('/api/admin/minibooks/create-from-lines', express.json({ limit: '4mb' }), async (req, res) => {
  let adminUser = null;
  try {
    adminUser = await requireAdminUserFromRequest(req);
  } catch (error) {
    const statusCode = Number(error?.statusCode || 401);
    res.status(statusCode).json({ error: error.message || 'Acesso negado.' });
    return;
  }

  if (!pool) {
    res.status(503).json({ error: 'DATABASE_URL nao configurada.' });
    return;
  }

  if (!isR2FluencyConfigured()) {
    res.status(503).json({ error: 'R2 nao configurado para criar MiniBooks.' });
    return;
  }

  try {
    const createInput = parseMiniBookCreateLines(req.body?.linesText || req.body?.text || '');
    const audioSelection = parseMiniBookAudioSelection(req.body?.voice);
    const nowIso = new Date().toISOString();
    const jobId = (typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : `mb-job-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    const normalizedAdminUserId = Number(adminUser?.id) || 0;
    const initialJob = {
      id: jobId,
      status: 'queued',
      progress: 0,
      step: 'Na fila...',
      createdAt: nowIso,
      startedAt: '',
      finishedAt: '',
      updatedAt: nowIso,
      requestedByUserId: normalizedAdminUserId,
      errorMessage: '',
      book: {
        id: String(createInput.bookId || '').trim(),
        fileName: String(createInput.fileName || '').trim(),
        title: String(createInput.title || 'Livro').trim(),
        level: normalizeSpeakingStoryLevel(createInput.level)
      },
      audio: {
        provider: String(audioSelection.provider || '').trim(),
        voice: String(audioSelection.voice || '').trim(),
        voiceLabel: String(audioSelection.voiceLabel || '').trim(),
        count: Array.isArray(createInput.cards) ? createInput.cards.length : 0
      },
      stats: null
    };
    miniBookCreateJobs.set(jobId, initialJob);
    cleanupMiniBookCreateJobs();

    void (async () => {
      try {
        updateMiniBookCreateJob(jobId, {
          status: 'running',
          startedAt: new Date().toISOString(),
          step: 'Iniciando...'
        });
        const result = await runMiniBookCreateFromLinesPipeline({
          createInput,
          audioSelection,
          adminUserId: normalizedAdminUserId,
          onProgress: (progress, step) => {
            updateMiniBookCreateJob(jobId, {
              status: 'running',
              progress,
              step
            });
          }
        });
        updateMiniBookCreateJob(jobId, {
          status: 'done',
          progress: 100,
          step: 'Finalizado.',
          finishedAt: new Date().toISOString(),
          book: {
            ...initialJob.book,
            ...result.book
          },
          stats: result.stats || null,
          audio: result.audio || initialJob.audio
        });
      } catch (error) {
        updateMiniBookCreateJob(jobId, {
          status: 'error',
          step: 'Falha na criacao.',
          finishedAt: new Date().toISOString(),
          errorMessage: error?.message || 'Falha ao criar MiniBook por linhas.'
        });
      } finally {
        cleanupMiniBookCreateJobs();
      }
    })();

    res.status(202).json({
      success: true,
      job: serializeMiniBookCreateJob(initialJob),
      book: {
        id: initialJob.book.id,
        fileName: initialJob.book.fileName,
        title: initialJob.book.title,
        level: initialJob.book.level
      },
      stats: {
        storiesCount: 0,
        cardsCount: initialJob.audio.count
      },
      audio: initialJob.audio
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    res.status(statusCode).json({
      error: error.message || 'Falha ao criar MiniBook por linhas.',
      details: error.details || null,
      instructions: error.instructions || null
    });
  }
});

app.post('/api/admin/minibooks/update-from-lines', express.json({ limit: '4mb' }), async (req, res) => {
  let adminUser = null;
  try {
    adminUser = await requireAdminUserFromRequest(req);
  } catch (error) {
    const statusCode = Number(error?.statusCode || 401);
    res.status(statusCode).json({ error: error.message || 'Acesso negado.' });
    return;
  }

  if (!pool) {
    res.status(503).json({ error: 'DATABASE_URL nao configurada.' });
    return;
  }

  try {
    const bookId = normalizeMiniBookId(req.body?.bookId || '');
    if (!bookId) {
      res.status(400).json({ error: 'bookId obrigatorio para atualizar o livro.' });
      return;
    }

    const source = await loadEditableMiniBookSource(bookId);
    if (!source?.payload) {
      res.status(404).json({ error: 'Livro nao encontrado para atualizacao.' });
      return;
    }

    const manifest = await loadMiniBooksManifest().catch(() => createDefaultMiniBooksManifest());
    const previousEntry = normalizeMiniBookEntry(bookId, manifest?.books?.[bookId] || {});
    const editorPayload = buildMiniBookEditorLinesPayload(source, previousEntry);
    if (!editorPayload) {
      res.status(422).json({ error: 'Nao foi possivel ler o livro atual para edicao.' });
      return;
    }

    const updateInput = parseMiniBookUpdateLines(req.body?.linesText || req.body?.text || '', {
      bookId: source.bookId,
      fileName: source.fileName,
      coverPrompt: editorPayload.coverPrompt,
      backgroundPrompt: editorPayload.backgroundPrompt,
      currentCards: editorPayload.cards
    });
    const audioSelection = parseMiniBookAudioSelection(req.body?.voice);
    const shouldUpdateImages = updateInput.coverPromptChanged || updateInput.backgroundPromptChanged;
    const shouldUpdateAudio = updateInput.cards.some((card) => card.regenerateAudio);
    if ((shouldUpdateImages || shouldUpdateAudio) && !isR2FluencyConfigured()) {
      res.status(503).json({ error: 'R2 nao configurado para atualizar imagens ou audios do MiniBook.' });
      return;
    }

    const cacheBuster = Date.now();
    if (shouldUpdateAudio) {
      for (let index = 0; index < updateInput.cards.length; index += 1) {
        const card = updateInput.cards[index];
        if (!card.regenerateAudio) continue;
        const generatedAudio = audioSelection.provider === 'elevenlabs'
          ? await generateMiniBookSpeechWithElevenLabs(card.en, { languageCode: 'en', voice: audioSelection.voice })
          : await generateMiniBookSpeechWithOpenAi(card.en, { voice: audioSelection.voice });
        const audioObjectKey = buildMiniBookAudioObjectKey(source.bookId, index);
        await putR2Object(audioObjectKey, generatedAudio.buffer, generatedAudio.mimeType || 'audio/mpeg');
        card.audio = `${buildFlashcardsR2PublicUrl(audioObjectKey)}?v=${cacheBuster}`;
      }
    }

    const normalizedPayload = buildMiniBookJsonPayloadFromUpdatedInput(source, updateInput);
    const parsedMiniBook = buildMiniBookStoriesFromJsonPayload(normalizedPayload, {
      bookId: source.bookId,
      fileName: source.fileName,
      bookTitle: updateInput.title,
      level: updateInput.level
    });

    await ensureMiniBookJsonTables();
    await pool.query(
      `INSERT INTO public.minibook_json_content (
         book_id,
         file_name,
         title,
         level,
         payload,
         updated_by_user_id,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, now())
       ON CONFLICT (book_id)
       DO UPDATE SET
         file_name = EXCLUDED.file_name,
         title = EXCLUDED.title,
         level = EXCLUDED.level,
         payload = EXCLUDED.payload,
         updated_by_user_id = EXCLUDED.updated_by_user_id,
         updated_at = now()`,
      [
        source.bookId,
        parsedMiniBook.fileName,
        parsedMiniBook.bookTitle,
        parsedMiniBook.level,
        JSON.stringify(normalizedPayload),
        Number(adminUser?.id) || null
      ]
    );
    invalidateSpeakingCardsCache();

    const nextManifestEntry = normalizeMiniBookEntry(source.bookId, {
      ...previousEntry,
      bookId: source.bookId,
      fileName: parsedMiniBook.fileName,
      title: parsedMiniBook.bookTitle,
      level: parsedMiniBook.level,
      coverPrompt: updateInput.coverPrompt,
      backgroundPrompt: updateInput.backgroundPrompt,
      updatedAt: new Date().toISOString()
    });

    if (updateInput.coverPromptChanged) {
      const coverGenerated = await generateMiniBookImageWithOpenAi(updateInput.coverPrompt, { size: '1024x1536', quality: 'medium' });
      const coverBuffer = await optimizeMiniBookAssetToWebp(coverGenerated.buffer, 'cover');
      const coverObjectKey = buildMiniBookObjectKey(source.bookId, 'cover');
      await putR2Object(coverObjectKey, coverBuffer, 'image/webp');
      nextManifestEntry.coverObjectKey = coverObjectKey;
      nextManifestEntry.coverImageUrl = `${buildFlashcardsR2PublicUrl(coverObjectKey)}?v=${cacheBuster}`;
    }

    if (updateInput.backgroundPromptChanged) {
      const [desktopGenerated, mobileGenerated] = await Promise.all([
        generateMiniBookImageWithOpenAi(updateInput.backgroundPrompt, { size: '1536x1024', quality: 'medium' }),
        generateMiniBookImageWithOpenAi(updateInput.backgroundPrompt, { size: '1024x1536', quality: 'medium' })
      ]);
      const [desktopBuffer, mobileBuffer] = await Promise.all([
        optimizeMiniBookAssetToWebp(desktopGenerated.buffer, 'background-desktop'),
        optimizeMiniBookAssetToWebp(mobileGenerated.buffer, 'background-mobile')
      ]);
      const desktopObjectKey = buildMiniBookObjectKey(source.bookId, 'background-desktop');
      const mobileObjectKey = buildMiniBookObjectKey(source.bookId, 'background-mobile');
      await Promise.all([
        putR2Object(desktopObjectKey, desktopBuffer, 'image/webp'),
        putR2Object(mobileObjectKey, mobileBuffer, 'image/webp')
      ]);
      nextManifestEntry.backgroundDesktopObjectKey = desktopObjectKey;
      nextManifestEntry.backgroundDesktopUrl = `${buildFlashcardsR2PublicUrl(desktopObjectKey)}?v=${cacheBuster}`;
      nextManifestEntry.backgroundMobileObjectKey = mobileObjectKey;
      nextManifestEntry.backgroundMobileUrl = `${buildFlashcardsR2PublicUrl(mobileObjectKey)}?v=${cacheBuster}`;
    }

    manifest.books = manifest.books || {};
    manifest.books[source.bookId] = normalizeMiniBookEntry(source.bookId, nextManifestEntry);
    manifest.updatedAt = new Date().toISOString();
    await persistMiniBooksManifest(manifest);

    res.json({
      success: true,
      book: {
        id: source.bookId,
        title: parsedMiniBook.bookTitle,
        level: parsedMiniBook.level
      },
      updates: {
        images: shouldUpdateImages,
        audio: shouldUpdateAudio,
        cards: updateInput.cards.length
      },
      message: shouldUpdateImages || shouldUpdateAudio
        ? `Livro "${parsedMiniBook.bookTitle}" atualizado com ${shouldUpdateImages ? 'imagens' : 'texto'}${shouldUpdateImages && shouldUpdateAudio ? ' e ' : ''}${shouldUpdateAudio ? 'audio' : ''}.`
        : `Livro "${parsedMiniBook.bookTitle}" atualizado.`
    });
  } catch (error) {
    res.status(Number(error?.statusCode || 500)).json({
      error: error.message || 'Falha ao atualizar o MiniBook por linhas.',
      details: error.details || null,
      instructions: error.instructions || null
    });
  }
});

app.post('/api/admin/minibooks/update-card', express.json({ limit: '2mb' }), async (req, res) => {
  let adminUser = null;
  try {
    adminUser = await requireAdminUserFromRequest(req);
  } catch (error) {
    const statusCode = Number(error?.statusCode || 401);
    res.status(statusCode).json({ error: error.message || 'Acesso negado.' });
    return;
  }

  if (!pool) {
    res.status(503).json({ error: 'DATABASE_URL nao configurada.' });
    return;
  }

  try {
    const bookId = normalizeMiniBookId(req.body?.bookId || '');
    const storyKey = normalizeMiniBookText(
      req.body?.storyKey || extractMiniBookStoryKeyFromStoryId(req.body?.storyId || ''),
      ''
    );
    const cardIndex = Math.max(0, Number.parseInt(req.body?.cardIndex, 10) || 0);
    if (!bookId || !storyKey) {
      res.status(400).json({ error: 'bookId e storyId/storyKey sao obrigatorios.' });
      return;
    }

    const source = await loadEditableMiniBookSource(bookId);
    if (!source?.payload) {
      res.status(404).json({ error: 'MiniBook nao encontrado para edicao.' });
      return;
    }

    const storyRef = resolveMiniBookStoryItemsReference(source.payload, storyKey);
    if (!storyRef || !Array.isArray(storyRef.items) || cardIndex >= storyRef.items.length) {
      res.status(404).json({ error: 'Card nao encontrado para essa historia.' });
      return;
    }

    const targetItem = storyRef.items[cardIndex] && typeof storyRef.items[cardIndex] === 'object'
      ? { ...storyRef.items[cardIndex] }
      : {};

    let changed = false;
    if (typeof req.body?.english === 'string') {
      const editedEnglish = extractMiniBookEditableText(req.body.english, targetItem.highlight);
      if (!editedEnglish.text) {
        res.status(400).json({ error: 'Texto em ingles nao pode ficar vazio.' });
        return;
      }
      targetItem.en = editedEnglish.text;
      targetItem.english = editedEnglish.text;
      targetItem.highlight = editedEnglish.highlight;
      changed = true;
    }

    if (typeof req.body?.portuguese === 'string') {
      const editedPortuguese = normalizeMiniBookText(req.body.portuguese);
      if (!editedPortuguese) {
        res.status(400).json({ error: 'Texto em portugues nao pode ficar vazio.' });
        return;
      }
      targetItem.pt = editedPortuguese;
      targetItem.portuguese = editedPortuguese;
      changed = true;
    }

    let nextAudioUrl = normalizeMiniBookText(targetItem.audio || targetItem.audioUrl);
    const requestedAudioText = typeof req.body?.audioText === 'string' ? req.body.audioText : '';
    const requestedVoice = typeof req.body?.voice === 'string' ? req.body.voice : '';
    if (requestedAudioText.trim()) {
      if (!isR2FluencyConfigured()) {
        res.status(503).json({ error: 'R2 nao configurado para editar o audio do MiniBook.' });
        return;
      }
      const audioSelection = parseMiniBookAudioSelection(requestedVoice);
      const generatedAudio = audioSelection.provider === 'elevenlabs'
        ? await generateMiniBookSpeechWithElevenLabs(requestedAudioText, { languageCode: 'en', voice: audioSelection.voice })
        : await generateMiniBookSpeechWithOpenAi(requestedAudioText, { voice: audioSelection.voice });
      const audioObjectKey = buildMiniBookAudioObjectKey(bookId, cardIndex);
      await putR2Object(audioObjectKey, generatedAudio.buffer, generatedAudio.mimeType || 'audio/mpeg');
      nextAudioUrl = `${buildFlashcardsR2PublicUrl(audioObjectKey)}?v=${Date.now()}`;
      targetItem.audio = nextAudioUrl;
      targetItem.audioUrl = nextAudioUrl;
      changed = true;
    }

    if (!changed) {
      res.status(400).json({ error: 'Nenhuma alteracao valida foi enviada para esse card.' });
      return;
    }

    const nextItems = storyRef.items.slice();
    nextItems[cardIndex] = targetItem;
    storyRef.assign(nextItems);

    const normalizedPayload = {
      ...source.payload,
      bookId: source.bookId,
      fileName: normalizeMiniBookText(source.payload.fileName, source.fileName),
      nome: normalizeMiniBookText(source.payload.nome || source.payload.title, source.title),
      nivel: normalizeSpeakingStoryLevel(source.payload.nivel ?? source.payload.level ?? source.level)
    };

    const parsedMiniBook = buildMiniBookStoriesFromJsonPayload(normalizedPayload, {
      bookId: source.bookId,
      fileName: source.fileName,
      bookTitle: source.title,
      level: source.level
    });

    await ensureMiniBookJsonTables();
    await pool.query(
      `INSERT INTO public.minibook_json_content (
         book_id,
         file_name,
         title,
         level,
         payload,
         updated_by_user_id,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, now())
       ON CONFLICT (book_id)
       DO UPDATE SET
         file_name = EXCLUDED.file_name,
         title = EXCLUDED.title,
         level = EXCLUDED.level,
         payload = EXCLUDED.payload,
         updated_by_user_id = EXCLUDED.updated_by_user_id,
         updated_at = now()`,
      [
        source.bookId,
        parsedMiniBook.fileName,
        parsedMiniBook.bookTitle,
        parsedMiniBook.level,
        JSON.stringify(normalizedPayload),
        Number(adminUser?.id) || null
      ]
    );

    invalidateSpeakingCardsCache();

    res.json({
      success: true,
      card: {
        english: normalizeMiniBookText(targetItem.en || targetItem.english),
        portuguese: normalizeMiniBookText(targetItem.pt || targetItem.portuguese),
        audio: nextAudioUrl,
        highlight: Boolean(targetItem.highlight)
      }
    });
  } catch (error) {
    res.status(Number(error?.statusCode || 500)).json({
      error: error.message || 'Falha ao atualizar card do MiniBook.',
      details: error.details || null,
      instructions: error.instructions || null
    });
  }
});

app.post('/api/speaking/presence/ping', async (req, res) => {
  try {
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }
    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }
    await ensureSpeakingRealtimeTables();
    await pool.query(
      `INSERT INTO public.user_presence (user_id, last_seen_at, updated_at)
       VALUES ($1, now(), now())
       ON CONFLICT (user_id)
       DO UPDATE SET
         last_seen_at = now(),
         updated_at = now()`,
      [Number(authUser.id)]
    );
    res.json({ success: true, onlineWindowSeconds: SPEAKING_CHALLENGE_ONLINE_WINDOW_SECONDS });
  } catch (error) {
    console.error('Erro ao atualizar presenca speaking:', error);
    res.status(500).json({ success: false, message: 'Nao foi possivel atualizar sua presenca.' });
  }
});

app.get('/api/speaking/challenges/poll', async (req, res) => {
  try {
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }
    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }

    await ensureSpeakingRealtimeTables();
    const userId = Number(authUser.id);

    await pool.query(
      `UPDATE public.speaking_challenges
       SET status = 'expired',
           updated_at = now()
       WHERE status = 'pending'
         AND expires_at < now()`
    );

    const incomingResult = await pool.query(
      `SELECT
         c.id,
         c.status,
         c.created_at,
         c.expires_at,
         c.session_id,
         u.id AS challenger_id,
         COALESCE(NULLIF(u.username, ''), u.email) AS challenger_name,
         COALESCE(u.avatar_image, '') AS challenger_avatar
       FROM public.speaking_challenges c
       INNER JOIN public.users u
         ON u.id = c.challenger_user_id
       WHERE c.opponent_user_id = $1
         AND c.status = 'pending'
         AND c.expires_at >= now()
       ORDER BY c.created_at DESC
       LIMIT 1`,
      [userId]
    );

    const outgoingResult = await pool.query(
      `SELECT
         c.id,
         c.status,
         c.created_at,
         c.expires_at,
         c.responded_at,
         c.challenger_notified_at,
         c.session_id,
         COALESCE(s.status, '') AS session_status,
         u.id AS opponent_id,
         COALESCE(NULLIF(u.username, ''), u.email) AS opponent_name,
         COALESCE(u.avatar_image, '') AS opponent_avatar
       FROM public.speaking_challenges c
       INNER JOIN public.users u
         ON u.id = c.opponent_user_id
       LEFT JOIN public.speaking_duel_sessions s
         ON s.id = c.session_id
       WHERE c.challenger_user_id = $1
         AND (
           c.status IN ('pending', 'accepted')
           OR (c.status IN ('rejected', 'expired') AND c.challenger_notified_at IS NULL)
         )
       ORDER BY c.created_at DESC
       LIMIT 1`,
      [userId]
    );

    const incoming = incomingResult.rows[0] || null;
    const outgoing = outgoingResult.rows[0] || null;

    if (
      outgoing
      && (String(outgoing.status || '').trim() === 'rejected' || String(outgoing.status || '').trim() === 'expired')
      && !outgoing.challenger_notified_at
    ) {
      await pool.query(
        `UPDATE public.speaking_challenges
         SET challenger_notified_at = now(),
             updated_at = now()
         WHERE id = $1
           AND challenger_user_id = $2
           AND challenger_notified_at IS NULL`,
        [Number(outgoing.id) || 0, userId]
      );
    }

    res.json({
      success: true,
      incomingChallenge: incoming ? {
        challengeId: Number(incoming.id) || 0,
        status: String(incoming.status || '').trim(),
        sessionId: String(incoming.session_id || '').trim(),
        createdAt: incoming.created_at || null,
        expiresAt: incoming.expires_at || null,
        challenger: {
          userId: Number(incoming.challenger_id) || 0,
          username: String(incoming.challenger_name || '').trim() || 'Usuario',
          avatarImage: String(incoming.challenger_avatar || '').trim()
        }
      } : null,
      outgoingChallenge: outgoing ? {
        challengeId: Number(outgoing.id) || 0,
        status: (
          String(outgoing.status || '').trim() === 'accepted'
          && String(outgoing.session_status || '').trim() === 'completed'
            ? 'completed'
            : String(outgoing.status || '').trim()
        ),
        sessionId: String(outgoing.session_id || '').trim(),
        createdAt: outgoing.created_at || null,
        expiresAt: outgoing.expires_at || null,
        respondedAt: outgoing.responded_at || null,
        opponent: {
          userId: Number(outgoing.opponent_id) || 0,
          username: String(outgoing.opponent_name || '').trim() || 'Usuario',
          avatarImage: String(outgoing.opponent_avatar || '').trim()
        }
      } : null
    });
  } catch (error) {
    console.error('Erro ao consultar desafios speaking:', error);
    res.status(500).json({ success: false, message: 'Nao foi possivel verificar desafios.' });
  }
});

app.post('/api/speaking/challenges/send', async (req, res) => {
  try {
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }
    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }
    await ensureSpeakingRealtimeTables();

    const challengerUserId = Number(authUser.id) || 0;
    const opponentUserId = Number.parseInt(req.body?.opponentUserId, 10) || 0;
    if (!challengerUserId || !opponentUserId || challengerUserId === opponentUserId) {
      res.status(400).json({ success: false, message: 'Adversario invalido para desafio.' });
      return;
    }

    const opponentResult = await pool.query(
      `SELECT
         u.id,
         COALESCE(NULLIF(u.username, ''), u.email) AS username,
         COALESCE(u.avatar_image, '') AS avatar_image,
         u.is_bot,
         u.bot_config,
         COALESCE(p.last_seen_at >= (now() - interval '${SPEAKING_CHALLENGE_ONLINE_WINDOW_SECONDS} seconds'), false) AS is_online
       FROM public.users u
       LEFT JOIN public.user_presence p
         ON p.user_id = u.id
       WHERE u.id = $1
       LIMIT 1`,
      [opponentUserId]
    );
    const opponent = opponentResult.rows[0];
    if (!opponent) {
      res.status(404).json({ success: false, message: 'Usuario nao encontrado.' });
      return;
    }
    const opponentIsBot = isBotUserRecord(opponent);
    if (!opponentIsBot && !Boolean(opponent.is_online)) {
      res.status(409).json({ success: false, message: 'Usuario offline no momento.' });
      return;
    }

    const existingPending = await pool.query(
      `SELECT id
       FROM public.speaking_challenges
       WHERE status = 'pending'
         AND expires_at >= now()
         AND (
           (challenger_user_id = $1 AND opponent_user_id = $2)
           OR
           (challenger_user_id = $2 AND opponent_user_id = $1)
         )
       ORDER BY created_at DESC
       LIMIT 1`,
      [challengerUserId, opponentUserId]
    );

    if (existingPending.rows[0]?.id) {
      res.json({
        success: true,
        challengeId: Number(existingPending.rows[0].id) || 0,
        message: 'Ja existe um desafio pendente entre voces.'
      });
      return;
    }

    if (opponentIsBot) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const cards = await buildRandomSpeakingCards();
        if (!cards.length) {
          const error = new Error('Nao foi possivel preparar as cartas do duelo.');
          error.statusCode = 500;
          throw error;
        }
        const challengeResult = await client.query(
          `INSERT INTO public.speaking_challenges (
             challenger_user_id,
             opponent_user_id,
             status,
             expires_at,
             updated_at
           )
           VALUES ($1, $2, 'accepted', now() + interval '${SPEAKING_CHALLENGE_PENDING_TTL_SECONDS} seconds', now())
           RETURNING id, created_at, expires_at`,
          [challengerUserId, opponentUserId]
        );
        const sessionId = buildSpeakingSessionId();
        await client.query(
          `INSERT INTO public.speaking_duel_sessions (
             id,
             challenger_user_id,
             opponent_user_id,
             cards,
             status,
             updated_at
           )
           VALUES ($1, $2, $3, $4::jsonb, 'active', now())`,
          [sessionId, challengerUserId, opponentUserId, JSON.stringify(cards)]
        );
        await client.query(
          `UPDATE public.speaking_challenges
           SET session_id = $2,
               responded_at = now(),
               updated_at = now()
           WHERE id = $1`,
          [Number(challengeResult.rows[0]?.id) || 0, sessionId]
        );
        await client.query('COMMIT');
        res.json({
          success: true,
          challengeId: Number(challengeResult.rows[0]?.id) || 0,
          createdAt: challengeResult.rows[0]?.created_at || null,
          expiresAt: challengeResult.rows[0]?.expires_at || null,
          sessionId,
          acceptedImmediately: true
        });
        return;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    const created = await pool.query(
      `INSERT INTO public.speaking_challenges (
         challenger_user_id,
         opponent_user_id,
         status,
         expires_at,
         updated_at
       )
       VALUES ($1, $2, 'pending', now() + interval '${SPEAKING_CHALLENGE_PENDING_TTL_SECONDS} seconds', now())
       RETURNING id, created_at, expires_at`,
      [challengerUserId, opponentUserId]
    );

    res.json({
      success: true,
      challengeId: Number(created.rows[0]?.id) || 0,
      createdAt: created.rows[0]?.created_at || null,
      expiresAt: created.rows[0]?.expires_at || null
    });
  } catch (error) {
    console.error('Erro ao enviar desafio speaking:', error);
    res.status(500).json({ success: false, message: 'Nao foi possivel enviar o desafio.' });
  }
});

app.post('/api/speaking/challenges/respond', async (req, res) => {
  try {
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }
    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }
    await ensureSpeakingRealtimeTables();

    const challengeId = Number.parseInt(req.body?.challengeId, 10) || 0;
    const action = String(req.body?.action || '').trim().toLowerCase();
    if (!challengeId || (action !== 'accept' && action !== 'reject')) {
      res.status(400).json({ success: false, message: 'Resposta de desafio invalida.' });
      return;
    }

    const userId = Number(authUser.id);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const challengeResult = await client.query(
        `SELECT id, challenger_user_id, opponent_user_id, status, expires_at
         FROM public.speaking_challenges
         WHERE id = $1
           AND opponent_user_id = $2
         FOR UPDATE`,
        [challengeId, userId]
      );

      const challenge = challengeResult.rows[0];
      if (!challenge) {
        const error = new Error('Desafio nao encontrado.');
        error.statusCode = 404;
        throw error;
      }
      if (challenge.status !== 'pending') {
        const error = new Error('Esse desafio ja foi encerrado.');
        error.statusCode = 409;
        throw error;
      }
      if (Date.parse(challenge.expires_at) < Date.now()) {
        await client.query(
          `UPDATE public.speaking_challenges
           SET status = 'expired',
               updated_at = now()
           WHERE id = $1`,
          [challengeId]
        );
        const error = new Error('O desafio expirou.');
        error.statusCode = 409;
        throw error;
      }

      if (action === 'reject') {
        await client.query(
          `UPDATE public.speaking_challenges
           SET status = 'rejected',
               responded_at = now(),
               updated_at = now()
           WHERE id = $1`,
          [challengeId]
        );
        await client.query('COMMIT');
        res.json({ success: true, status: 'rejected' });
        return;
      }

      const cards = await buildRandomSpeakingCards();
      if (!cards.length) {
        const error = new Error('Nao foi possivel preparar as cartas do duelo.');
        error.statusCode = 500;
        throw error;
      }
      const sessionId = buildSpeakingSessionId();
      await client.query(
        `INSERT INTO public.speaking_duel_sessions (
           id,
           challenger_user_id,
           opponent_user_id,
           cards,
           status,
           updated_at
         )
         VALUES ($1, $2, $3, $4::jsonb, 'active', now())`,
        [
          sessionId,
          Number(challenge.challenger_user_id),
          Number(challenge.opponent_user_id),
          JSON.stringify(cards)
        ]
      );
      await client.query(
        `UPDATE public.speaking_challenges
         SET status = 'accepted',
             session_id = $2,
             responded_at = now(),
             updated_at = now()
         WHERE id = $1`,
        [challengeId, sessionId]
      );
      await client.query('COMMIT');
      res.json({ success: true, status: 'accepted', sessionId });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Nao foi possivel responder ao desafio.'
    });
  }
});

app.get('/api/speaking/sessions/:sessionId', async (req, res) => {
  try {
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }
    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }
    await ensureSpeakingRealtimeTables();
    await ensureFlashcardUserStateTables();

    const sessionId = String(req.params.sessionId || '').trim();
    if (!sessionId) {
      res.status(400).json({ success: false, message: 'Sessao invalida.' });
      return;
    }

    const userId = Number(authUser.id);
    const client = await pool.connect();
    let session = null;
    try {
      await client.query('BEGIN');
      const touched = await touchSpeakingSessionAndResolveTimeout(client, sessionId, userId);
      if (!touched) {
        await client.query('ROLLBACK');
        res.status(404).json({ success: false, message: 'Sessao nao encontrada.' });
        return;
      }

      const challengerUserId = Number(touched.challenger_user_id) || 0;
      const opponentUserId = Number(touched.opponent_user_id) || 0;
      if (userId !== challengerUserId && userId !== opponentUserId) {
        await client.query('ROLLBACK');
        res.status(403).json({ success: false, message: 'Voce nao participa desta sessao.' });
        return;
      }

      const sessionResult = await client.query(
        `SELECT
           s.*,
           cu.id AS challenger_id,
           COALESCE(NULLIF(cu.username, ''), cu.email) AS challenger_name,
           COALESCE(cu.avatar_image, '') AS challenger_avatar,
           ou.id AS opponent_id,
           COALESCE(NULLIF(ou.username, ''), ou.email) AS opponent_name,
           COALESCE(ou.avatar_image, '') AS opponent_avatar,
           wu.id AS winner_id,
           COALESCE(NULLIF(wu.username, ''), wu.email) AS winner_name,
           COALESCE(wu.avatar_image, '') AS winner_avatar
         FROM public.speaking_duel_sessions s
         INNER JOIN public.users cu ON cu.id = s.challenger_user_id
         INNER JOIN public.users ou ON ou.id = s.opponent_user_id
         LEFT JOIN public.users wu ON wu.id = s.winner_user_id
         WHERE s.id = $1
         LIMIT 1`,
        [sessionId]
      );
      session = sessionResult.rows[0] || null;
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    if (!session) {
      res.status(404).json({ success: false, message: 'Sessao nao encontrada.' });
      return;
    }

    const challengerUserId = Number(session.challenger_user_id) || 0;
    const opponentUserId = Number(session.opponent_user_id) || 0;
    const meRole = userId === challengerUserId ? 'challenger' : 'opponent';
    const rivalUserId = meRole === 'challenger' ? opponentUserId : challengerUserId;
    const cardList = Array.isArray(session.cards) ? session.cards : [];

    const statsResult = await pool.query(
      `SELECT user_id, pronunciation_samples
       FROM public.user_flashcard_stats
       WHERE user_id = ANY($1::int[])`,
      [[userId, rivalUserId]]
    );
    const statsByUser = new Map(
      statsResult.rows.map((row) => {
        const samples = normalizeFlashcardPronunciationSamples(row?.pronunciation_samples);
        return [Number(row?.user_id) || 0, getFlashcardPronunciationPercent(samples)];
      })
    );

    const meGeneralPercent = Number(statsByUser.get(userId)) || 0;
    const rivalGeneralPercent = Number(statsByUser.get(rivalUserId)) || 0;

    res.json({
      success: true,
      session: {
        id: session.id,
        status: String(session.status || '').trim() || 'active',
        createdAt: session.created_at,
        battleEndsAt: new Date(
          Date.parse(String(session.created_at || '').trim()) + ((SPEAKING_DUEL_INTRO_SECONDS + SPEAKING_DUEL_BATTLE_SECONDS) * 1000)
        ).toISOString(),
        introCountdownSeconds: SPEAKING_DUEL_INTRO_SECONDS,
        battleDurationSeconds: SPEAKING_DUEL_BATTLE_SECONDS,
        cards: cardList,
        meRole,
        meProgress: meRole === 'challenger' ? Number(session.challenger_progress) || 0 : Number(session.opponent_progress) || 0,
        rivalProgress: meRole === 'challenger' ? Number(session.opponent_progress) || 0 : Number(session.challenger_progress) || 0,
        mePercent: meRole === 'challenger' ? Number(session.challenger_percent) || 0 : Number(session.opponent_percent) || 0,
        rivalPercent: meRole === 'challenger' ? Number(session.opponent_percent) || 0 : Number(session.challenger_percent) || 0,
        meGeneralPercent,
        rivalGeneralPercent,
        meFinished: meRole === 'challenger' ? Boolean(session.challenger_finished) : Boolean(session.opponent_finished),
        rivalFinished: meRole === 'challenger' ? Boolean(session.opponent_finished) : Boolean(session.challenger_finished),
        challenger: {
          userId: Number(session.challenger_id) || 0,
          username: String(session.challenger_name || '').trim() || 'Usuario',
          avatarImage: String(session.challenger_avatar || '').trim(),
          isBot: Boolean(session.challenger_is_bot)
        },
        opponent: {
          userId: Number(session.opponent_id) || 0,
          username: String(session.opponent_name || '').trim() || 'Usuario',
          avatarImage: String(session.opponent_avatar || '').trim(),
          isBot: Boolean(session.opponent_is_bot)
        },
        winner: Number(session.winner_id) ? {
          userId: Number(session.winner_id) || 0,
          username: String(session.winner_name || '').trim() || 'Usuario',
          avatarImage: String(session.winner_avatar || '').trim()
        } : null
      }
    });
  } catch (error) {
    console.error('Erro ao carregar sessao de speaking:', error);
    res.status(500).json({ success: false, message: 'Nao foi possivel carregar a sessao.' });
  }
});

app.post('/api/speaking/sessions/:sessionId/progress', async (req, res) => {
  try {
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }
    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }
    await ensureSpeakingRealtimeTables();

    const sessionId = String(req.params.sessionId || '').trim();
    if (!sessionId) {
      res.status(400).json({ success: false, message: 'Sessao invalida.' });
      return;
    }

    const progress = Math.max(0, Math.min(100, Number.parseInt(req.body?.progress, 10) || 0));
    const percent = Math.max(0, Math.min(100, Number.parseInt(req.body?.percent, 10) || 0));
    const finished = Boolean(req.body?.finished);
    const timedOut = Boolean(req.body?.timedOut);
    const userId = Number(authUser.id) || 0;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const session = await touchSpeakingSessionAndResolveTimeout(client, sessionId, userId);
      if (!session) {
        const error = new Error('Sessao nao encontrada.');
        error.statusCode = 404;
        throw error;
      }

      const challengerUserId = Number(session.challenger_user_id) || 0;
      const opponentUserId = Number(session.opponent_user_id) || 0;
      if (userId !== challengerUserId && userId !== opponentUserId) {
        const error = new Error('Voce nao participa desta sessao.');
        error.statusCode = 403;
        throw error;
      }

      const isChallenger = userId === challengerUserId;
      const cards = Array.isArray(session.cards) ? session.cards : [];
      const totalCards = Math.max(1, cards.length || SPEAKING_DUEL_DEFAULT_CARDS);
      const normalizedProgress = Math.max(0, Math.min(totalCards, progress));

      const next = {
        challengerProgress: Number(session.challenger_progress) || 0,
        opponentProgress: Number(session.opponent_progress) || 0,
        challengerPercent: Number(session.challenger_percent) || 0,
        opponentPercent: Number(session.opponent_percent) || 0,
        challengerFinished: Boolean(session.challenger_finished),
        opponentFinished: Boolean(session.opponent_finished),
        status: String(session.status || '').trim() || 'active',
        winnerUserId: Number(session.winner_user_id) || 0
      };

      if (next.status === 'completed') {
        await client.query('COMMIT');
        res.json({
          success: true,
          session: {
            status: next.status,
            winnerUserId: next.winnerUserId || 0,
            challengerProgress: next.challengerProgress,
            opponentProgress: next.opponentProgress,
            challengerPercent: next.challengerPercent,
            opponentPercent: next.opponentPercent,
            challengerFinished: next.challengerFinished,
            opponentFinished: next.opponentFinished
          }
        });
        return;
      }

      if (isChallenger) {
        next.challengerProgress = normalizedProgress;
        next.challengerPercent = percent;
        next.challengerFinished = finished || normalizedProgress >= totalCards;
      } else {
        next.opponentProgress = normalizedProgress;
        next.opponentPercent = percent;
        next.opponentFinished = finished || normalizedProgress >= totalCards;
      }

      const battleExpired = timedOut || isSpeakingDuelBattleExpired(session);
      if (battleExpired && next.status !== 'completed') {
        next.status = 'completed';
        next.winnerUserId = computeSpeakingDuelWinnerUserId({
          challenger_finished: next.challengerFinished,
          opponent_finished: next.opponentFinished,
          challenger_percent: next.challengerPercent,
          opponent_percent: next.opponentPercent,
          challenger_progress: next.challengerProgress,
          opponent_progress: next.opponentProgress,
          challenger_user_id: challengerUserId,
          opponent_user_id: opponentUserId
        });
      }

      await client.query(
        `UPDATE public.speaking_duel_sessions
         SET challenger_progress = $2,
             opponent_progress = $3,
             challenger_percent = $4,
             opponent_percent = $5,
             challenger_finished = $6,
             opponent_finished = $7,
             status = $8,
             winner_user_id = CASE
               WHEN $8 = 'completed' THEN CASE WHEN $9 > 0 THEN $9 ELSE NULL END
               ELSE winner_user_id
             END,
             finished_at = CASE WHEN $8 = 'completed' THEN COALESCE(finished_at, now()) ELSE finished_at END,
             updated_at = now()
         WHERE id = $1`,
        [
          sessionId,
          next.challengerProgress,
          next.opponentProgress,
          next.challengerPercent,
          next.opponentPercent,
          next.challengerFinished,
          next.opponentFinished,
          next.status,
          next.winnerUserId
        ]
      );
      if (next.status === 'completed') {
        await markSpeakingChallengeCompletedBySessionId(client, sessionId);
        await awardSpeakingBattleWin(client, sessionId, next.winnerUserId);
      }
      await client.query('COMMIT');

      res.json({
        success: true,
        session: {
          status: next.status,
          winnerUserId: next.winnerUserId || 0,
          challengerProgress: next.challengerProgress,
          opponentProgress: next.opponentProgress,
          challengerPercent: next.challengerPercent,
          opponentPercent: next.opponentPercent,
          challengerFinished: next.challengerFinished,
          opponentFinished: next.opponentFinished
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Nao foi possivel sincronizar o progresso.'
    });
  }
});

app.get('/api/premium/status', async (req, res) => {
  try {
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    await ensurePremiumAccessTables();
    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }

    const currentUser = await readUserById(authUser.id);
    const premium = resolvePremiumState(currentUser || authUser);
    res.json({ success: true, premium });
  } catch (error) {
    console.error('Erro ao carregar status premium:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar premium.' });
  }
});

app.get('/api/premium/plans', (_req, res) => {
  res.json({
    success: true,
    stripeEnabled: Boolean(STRIPE_SECRET_KEY),
    publishableKey: STRIPE_PUBLISHABLE_KEY || null,
    plans: listAvailablePremiumBillingPlans()
  });
});

app.post('/api/premium/checkout', async (req, res) => {
  try {
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    await ensurePremiumAccessTables();
    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Entre na sua conta para comprar premium.' });
      return;
    }

    const currentUser = await readUserById(authUser.id);
    if (isPremiumActiveFromUser(currentUser || authUser)) {
      res.status(409).json({ success: false, message: 'Sua conta ja esta com premium ativo.' });
      return;
    }

    const plan = getPremiumBillingPlan(req.body?.plan);
    if (!plan) {
      res.status(400).json({ success: false, message: 'Plano premium invalido ou nao configurado.' });
      return;
    }

    const successUrl = buildPremiumReturnUrl(req, '?checkout=success&session_id={CHECKOUT_SESSION_ID}');
    const cancelUrl = buildPremiumReturnUrl(req, '?checkout=cancel');
    const checkoutPayload = {
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      'line_items[0][price]': plan.priceId,
      'line_items[0][quantity]': 1,
      'metadata[user_id]': String(authUser.id),
      'metadata[plan_key]': plan.key
    };
    if (isValidEmailAddress(currentUser?.email)) {
      checkoutPayload.customer_email = currentUser.email;
    }

    const stripeSession = await callStripeApi('POST', '/checkout/sessions', checkoutPayload);

    await createPremiumCheckoutSessionRecord({
      sessionId: stripeSession.id,
      userId: authUser.id,
      plan
    });

    res.status(201).json({
      success: true,
      plan: { key: plan.key, label: plan.label, durationDays: plan.durationDays },
      sessionId: stripeSession.id,
      checkoutUrl: stripeSession.url || null
    });
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    console.error('Erro ao criar checkout premium:', error);
    res.status(statusCode).json({
      success: false,
      message: error?.message || 'Nao foi possivel iniciar o pagamento premium.'
    });
  }
});

app.post('/api/premium/checkout/confirm', async (req, res) => {
  try {
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    await ensurePremiumAccessTables();
    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }

    const sessionId = String(req.body?.sessionId || '').trim();
    if (!sessionId) {
      res.status(400).json({ success: false, message: 'Sessao de pagamento invalida.' });
      return;
    }

    const localSession = await readPremiumCheckoutSession(sessionId);
    if (!localSession) {
      res.status(404).json({ success: false, message: 'Sessao de pagamento nao encontrada.' });
      return;
    }
    if (Number(localSession.user_id) !== Number(authUser.id)) {
      res.status(403).json({ success: false, message: 'Essa sessao nao pertence ao usuario atual.' });
      return;
    }

    const stripeSession = await callStripeApi('GET', `/checkout/sessions/${encodeURIComponent(sessionId)}`);
    const paymentStatus = String(stripeSession?.payment_status || '').trim().toLowerCase();
    if (paymentStatus !== 'paid') {
      res.status(409).json({
        success: false,
        message: paymentStatus === 'unpaid' ? 'Pagamento ainda nao foi concluido.' : 'Pagamento ainda nao confirmado.',
        paymentStatus
      });
      return;
    }

    const user = await fulfillPremiumCheckoutSession({ sessionId, paymentStatus });
    res.json({
      success: true,
      message: 'Premium liberado com sucesso.',
      paymentStatus,
      user: mapPublicUser(user),
      premium: resolvePremiumState(user)
    });
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    console.error('Erro ao confirmar checkout premium:', error);
    res.status(statusCode).json({
      success: false,
      message: error?.message || 'Nao foi possivel confirmar o pagamento premium.'
    });
  }
});

app.post('/api/premium/redeem', async (req, res) => {
  try {
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    await ensurePremiumAccessTables();
    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }

    const code = normalizeAccessKeyCode(req.body?.code);
    if (code.length !== 6) {
      res.status(400).json({ success: false, message: 'A chave precisa ter 6 toques validos.' });
      return;
    }

    const accessKeyDefinitions = await loadAccessKeyDefinitions();
    const matchedConfig = BONUS_ACCESS_KEYS.get(code) || accessKeyDefinitions.get(code);
    if (!matchedConfig) {
      res.status(400).json({ success: false, message: 'Chave invalida.' });
      return;
    }

    const accessType = matchedConfig.key;
    const user = await extendUserPremiumAccess(authUser.id, matchedConfig.durationDays, {
      accessType,
      accessCode: code,
      sourceFile: matchedConfig.fileName
    });

    res.json({
      success: true,
      message: `Premium ${matchedConfig.label} liberado com sucesso.`,
      accessType,
      user: mapPublicUser(user),
      premium: resolvePremiumState(user)
    });
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    console.error('Erro ao resgatar chave premium:', error);
    res.status(statusCode).json({
      success: false,
      message: statusCode === 409
        ? 'Essa chave ja foi usada.'
        : statusCode === 404
          ? 'Usuario nao encontrado.'
          : error?.message || 'Erro ao resgatar chave.'
    });
  }
});

app.post('/api/admin/users/bots', async (req, res) => {
  try {
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    await ensureUsersAvatarColumn();
    await ensureFlashcardUserStateTables();
    await ensurePremiumAccessTables();
    const adminUser = await requireAdminUserFromRequest(req);
    const botConfig = normalizeBotConfig(req.body || {});
    const existingUser = await pool.query(
      'SELECT id FROM public.users WHERE LOWER(COALESCE(username, email)) = LOWER($1) LIMIT 1',
      [botConfig.username]
    );
    if (existingUser.rows.length) {
      res.status(409).json({ success: false, message: 'Ja existe um usuario com esse nome.' });
      return;
    }
    const passwordHash = await bcrypt.hash(`bot:${botConfig.username}:${Date.now()}:${Math.random()}`, 10);
    const emailBase = buildLegacyEmailFromUsername(botConfig.username) || `bot${Date.now()}`;
    const email = `${emailBase}.${buildRandomUserSuffix(6).toLowerCase()}@bot.playtalk.local`;
    const initialAvatar = FLASHCARD_RANKING_PLACEHOLDER_AVATAR;

    const created = await pool.query(
      `INSERT INTO public.users (
         email,
         username,
         password_hash,
         avatar_image,
         onboarding_name_completed,
         onboarding_photo_completed,
         is_bot,
         bot_config,
         bot_avatar_status,
         created_by_user_id
       )
       VALUES ($1, $2, $3, $4, true, false, true, $5::jsonb, 'processing', $6)
       RETURNING id, email, username, avatar_image, avatar_versions, avatar_generation_count,
                 onboarding_name_completed, onboarding_photo_completed, created_at,
                 password_hash, premium_full_access, premium_until, is_bot, bot_config,
                 bot_avatar_status, bot_avatar_error, created_by_user_id, battle`,
      [
        email,
        botConfig.username,
        passwordHash,
        initialAvatar,
        JSON.stringify({
          flashcardsCount: botConfig.flashcardsCount,
          pronunciationBase: botConfig.pronunciationBase,
          flashcardsPerHour: botConfig.flashcardsPerHour,
          responseSeconds: botConfig.responseSeconds,
          updateHour: botConfig.updateHour
        }),
        Number(adminUser.id) || null
      ]
    );

    const user = created.rows[0];
    queueBotAvatarGeneration({
      userId: user.id,
      sourceImageDataUrl: botConfig.sourceImageDataUrl
    });

    res.status(201).json({
      success: true,
      message: 'Bot criado. O avatar esta sendo processado.',
      user: mapPublicUser(user)
    });
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : (error?.code === '23505' ? 409 : 500);
    console.error('Erro ao criar bot admin:', error);
    res.status(statusCode).json({
      success: false,
      message: error?.code === '23505'
        ? 'Ja existe um usuario com esse nome.'
        : (error?.message || 'Nao foi possivel criar o bot.')
    });
  }
});

app.post('/api/admin/users/:userId/premium', async (req, res) => {
  try {
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    await ensurePremiumAccessTables();
    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }
    if (!isAdminUserRecord(authUser)) {
      res.status(403).json({ success: false, message: 'Apenas admin pode liberar premium.' });
      return;
    }

    const durationMap = {
      semana: ACCESS_KEY_TYPES.semana.durationDays,
      mes: ACCESS_KEY_TYPES.mes.durationDays,
      ano: ACCESS_KEY_TYPES.ano.durationDays
    };
    const plan = String(req.body?.plan || '').trim().toLowerCase();
    const durationDays = durationMap[plan];
    if (!durationDays) {
      res.status(400).json({ success: false, message: 'Plano premium invalido.' });
      return;
    }

    const updatedUser = await extendUserPremiumAccess(req.params.userId, durationDays, {
      accessType: `admin:${plan}`,
      sourceFile: 'admin'
    });

    res.json({
      success: true,
      message: `Premium ${ACCESS_KEY_TYPES[plan].label} atribuido com sucesso.`,
      user: mapPublicUser(updatedUser),
      premium: resolvePremiumState(updatedUser)
    });
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    console.error('Erro ao atribuir premium pelo admin:', error);
    res.status(statusCode).json({
      success: false,
      message: error?.message || 'Erro ao atribuir premium.'
    });
  }
});

app.delete('/api/admin/users/:userId', async (req, res) => {
  try {
    if (!pool) {
      res.status(500).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    await ensureUsersAvatarColumn();
    await ensureFlashcardUserStateTables();
    await ensurePremiumAccessTables();

    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id || !isAdminUserRecord(authUser)) {
      clearAuthCookie(res);
      res.status(403).json({ success: false, message: 'Apenas admin pode excluir usuarios.' });
      return;
    }

    const userId = Number.parseInt(req.params.userId, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(400).json({ success: false, message: 'userId invalido.' });
      return;
    }

    if (userId === Number(authUser.id)) {
      res.status(400).json({ success: false, message: 'O admin nao pode excluir a propria conta por aqui.' });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM public.user_access_keys WHERE redeemed_by_user_id = $1', [userId]);
      await client.query('DELETE FROM public.user_flashcard_reports WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM public.user_flashcard_hidden WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM public.user_flashcard_type_portuguese WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM public.user_flashcard_stats WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM public.user_flashcard_progress WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM public.flashcard_rankings WHERE user_id = $1', [userId]);
      const result = await client.query('DELETE FROM public.users WHERE id = $1 RETURNING id, username', [userId]);
      if (!result.rows.length) {
        await client.query('ROLLBACK');
        res.status(404).json({ success: false, message: 'Usuario nao encontrado.' });
        return;
      }
      await client.query('COMMIT');
      res.json({ success: true, userId, username: result.rows[0].username || '' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao excluir usuario pelo admin:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'Erro ao excluir usuario.'
    });
  }
});

app.post('/api/rankings/flashcards', async (req, res) => {
  try {
    if (!pool) {
      res.status(503).json({ success: false, message: 'DATABASE_URL nao configurada.' });
      return;
    }

    const authUser = await readAuthenticatedUserFromRequest(req);
    if (!authUser?.id) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
      return;
    }

    const period = normalizeFlashcardRankingPeriod(req.query.period);
    const record = await syncFlashcardRankingFromProgressCount(authUser.id);
    const snapshot = await fetchFlashcardRankingSnapshot({
      periodId: period,
      limit: 100,
      currentUserId: Number(authUser.id) || 0
    });
    const player = snapshot.player;

    res.json({
      success: true,
      period: snapshot.period,
      userId: Number(record.user_id) || Number(authUser.id) || 0,
      username: String(authUser.username || authUser.email || '').trim(),
      avatarImage: String(authUser.avatar_image || '').trim(),
      playerNumber: Number(record.player_number) || 0,
      flashcardsCount: player?.flashcardsCount || 0,
      weeklyFlashcardsCount: Number(record.weekly_count) || 0,
      monthlyFlashcardsCount: Number(record.monthly_count) || 0,
      allTimeFlashcardsCount: Number(record.all_time_count) || 0,
      updatedAt: record.updated_at,
      rank: Number(player?.rank) || 0
    });
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    console.error('Erro ao salvar ranking de flashcards:', error);
    res.status(statusCode).json({
      success: false,
      message: statusCode === 400
        ? 'userId invalido.'
        : statusCode === 401
          ? 'Sessao invalida ou expirada.'
          : 'Erro ao salvar ranking de flashcards.'
    });
  }
});

app.get('/api/r2-media/:objectKey(*)', async (req, res) => {
  try {
    if (!isR2FluencyConfigured()) {
      res.status(503).json({ success: false, message: 'R2 nao configurado para conteudo de fluencia.' });
      return;
    }

    const objectKey = String(req.params.objectKey || '').replace(/^\/+/, '');
    if (!objectKey) {
      res.status(400).json({ success: false, message: 'Objeto do R2 nao informado.' });
      return;
    }

    const data = await fetchR2ObjectBuffer(objectKey);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.type(contentTypeFromObjectKey(objectKey));
    res.send(data);
  } catch (error) {
    if (/404/i.test(String(error?.message || ''))) {
      res.status(404).send('Arquivo nao encontrado no R2.');
      return;
    }

    console.error('Erro ao servir asset do R2:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar arquivo do R2.' });
  }
});

app.get('/api/r2/level-json-files', async (req, res) => {
  try {
    if (!isR2FluencyConfigured()) {
      res.status(503).json({ success: false, message: 'R2 nao configurado para conteudo de fluencia.' });
      return;
    }

    const files = (await listAllR2ObjectKeys('Niveis/'))
      .filter(key => key.startsWith('Niveis/') && key.toLowerCase().endsWith('.json'))
      .sort(sortR2ObjectKeysAlphabetically)
      .map(key => ({
        key,
        name: path.posix.basename(key),
        folder: path.posix.dirname(key)
      }));

    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, files });
  } catch (error) {
    console.error('Erro ao listar JSONs de Niveis no R2:', error);
    res.status(500).json({ success: false, message: 'Erro ao listar arquivos JSON do bucket.' });
  }
});

app.get('/api/r2/level-json', async (req, res) => {
  try {
    if (!isR2FluencyConfigured()) {
      res.status(503).json({ success: false, message: 'R2 nao configurado para conteudo de fluencia.' });
      return;
    }

    const objectKey = typeof req.query?.key === 'string'
      ? req.query.key.trim().replace(/^\/+/, '')
      : '';

    if (!objectKey || !objectKey.startsWith('Niveis/') || !objectKey.toLowerCase().endsWith('.json')) {
      res.status(400).json({ success: false, message: 'Informe um arquivo JSON valido dentro de Niveis/.' });
      return;
    }

    const payload = await fetchR2JsonObject(objectKey);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-PlayTalk-R2-Key', objectKey);
    res.json(payload);
  } catch (error) {
    if (/404/i.test(String(error?.message || ''))) {
      res.status(404).json({ success: false, message: 'Arquivo JSON nao encontrado no R2.' });
      return;
    }

    console.error('Erro ao carregar JSON selecionado do R2:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar o JSON do bucket.' });
  }
});

app.get('/api/r2/storage-tree', async (req, res) => {
  try {
    if (!isR2FluencyConfigured()) {
      res.status(503).json({ success: false, message: 'R2 nao configurado para conteudo de fluencia.' });
      return;
    }

    const prefix = typeof req.query?.prefix === 'string'
      ? req.query.prefix.trim().replace(/^\/+/, '')
      : 'Niveis/';
    const normalizedPrefix = prefix || 'Niveis/';

    const objectKeys = (await listAllR2ObjectKeys(normalizedPrefix))
      .filter(key => key.startsWith(normalizedPrefix))
      .sort(sortR2ObjectKeysAlphabetically);

    const tree = buildStorageTreeFromObjectKeys(objectKeys, normalizedPrefix.replace(/\/+$/, '') || 'Niveis');

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      success: true,
      prefix: normalizedPrefix,
      totalObjects: objectKeys.length,
      tree,
      keys: objectKeys
    });
  } catch (error) {
    console.error('Erro ao listar estrutura de storage do R2:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar a estrutura do bucket.',
      debug: buildR2DebugPayload(error)
    });
  }
});

app.get('/api/r2/storage-debug', async (req, res) => {
  const prefix = typeof req.query?.prefix === 'string'
    ? req.query.prefix.trim().replace(/^\/+/, '')
    : 'Niveis/';
  const normalizedPrefix = prefix || 'Niveis/';

  try {
    if (!isR2FluencyConfigured()) {
      res.json({
        success: false,
        message: 'R2 nao configurado para conteudo de fluencia.',
        debug: buildR2DebugPayload(null, {
          prefix: normalizedPrefix
        })
      });
      return;
    }

    const objectKeys = (await listAllR2ObjectKeys(normalizedPrefix))
      .filter(key => key.startsWith(normalizedPrefix))
      .sort(sortR2ObjectKeysAlphabetically);

    res.json({
      success: true,
      message: 'Leitura do bucket concluida com sucesso.',
      debug: buildR2DebugPayload(null, {
        prefix: normalizedPrefix,
        totalObjects: objectKeys.length,
        sampleKeys: objectKeys.slice(0, 30)
      })
    });
  } catch (error) {
    console.error('Erro no storage debug do R2:', error);
    res.json({
      success: false,
      message: 'Falha ao consultar o bucket.',
      debug: buildR2DebugPayload(error, {
        prefix: normalizedPrefix
      })
    });
  }
});

app.get('/images/:filePath(*)', async (req, res, next) => {
  try {
    const requestedName = decodeURIComponent(path.basename(req.params.filePath));
    const ext = path.extname(requestedName || '').toLowerCase();

    if (!SUPPORTED_IMAGE_EXTENSIONS.has(ext)) {
      next();
      return;
    }

    const imagePath = await resolveImagePath(requestedName);

    if (!imagePath) {
      res.status(404).send('Imagem não encontrada.');
      return;
    }

    res.sendFile(imagePath, error => {
      if (error) next(error);
    });
  } catch (error) {
    next(error);
  }
});

app.get('/voices/:filePath(*)', async (req, res, next) => {
  try {
    const requestedPath = decodeURIComponent(req.params.filePath || '');
    const ext = path.extname(requestedPath || '').toLowerCase();

    if (ext && !SUPPORTED_AUDIO_EXTENSIONS.has(ext)) {
      next();
      return;
    }

    const voicePath = await resolveVoicePath(requestedPath);

    if (!voicePath) {
      res.status(404).send('Áudio não encontrado.');
      return;
    }

    res.sendFile(voicePath, error => {
      if (error) next(error);
    });
  } catch (error) {
    next(error);
  }
});

app.use((req, res, next) => {
  if (req.method !== 'GET') {
    next();
    return;
  }

  const pathName = req.path;
  const publicPaths = new Set([
    '/',
    '/index.html',
    '/auth.html',
    '/allcards',
    '/allcards/',
    '/speak',
    '/speak/',
    '/speaking',
    '/speaking/',
    '/levels',
    '/levels/',
    '/database',
    '/database/',
    '/flashcards',
    '/flashcards/',
    '/fast',
    '/fast/',
    '/username',
    '/username/',
    '/avataradd',
    '/avataradd/',
    '/password',
    '/password/',
    '/mycards',
    '/mycards/',
    '/mycards.html',
    '/signup',
    '/signup/',
    '/premium',
    '/premium/',
    '/books',
    '/books/',
    '/users',
    '/users/',
    '/account',
    '/account/',
    '/accounts',
    '/accounts/',
    '/storage',
    '/storage/',
    '/storage-debug',
    '/storage-debug/',
    '/eventos',
    '/eventos/',
    '/login',
    '/register',
    '/logout',
    '/auth/avatar',
    '/auth/google-quick',
    '/auth/session',
    '/config.js'
  ]);

  if (
    publicPaths.has(pathName)
    || pathName.startsWith('/css/')
    || pathName.startsWith('/js/')
    || pathName.startsWith('/images/')
    || pathName.startsWith('/voices/')
    || pathName.startsWith('/api/')
    || pathName.startsWith('/videos/')
    || pathName.startsWith('/SVG/')
    || pathName.startsWith('/Fontes/')
    || pathName.startsWith('/medalhas/')
    || pathName.startsWith('/Avatar/')
    || pathName.startsWith('/backgrounds/')
    || pathName.startsWith('/data/')
    || pathName === '/favicon.ico'
    || (path.extname(pathName) && path.extname(pathName) !== '.html')
  ) {
    next();
    return;
  }

  const payload = getAuthenticatedUserFromRequest(req);
  if (!payload) {
    res.redirect('/auth.html');
    return;
  }

  next();
});

app.get('/chat', (req, res) => {
  res.redirect(302, '/chat/');
});

app.get(['/chat/', '/chat/index.html'], (req, res) => {
  res.sendFile(path.join(staticDir, 'chat', 'index.html'));
});

app.get('/', (req, res) => {
  const queryIndex = req.originalUrl.indexOf('?');
  const search = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';
  res.redirect(302, `/flashcards${search}`);
});

app.use(express.static(staticDir));
app.get(['/allcards', '/allcards/'], (req, res) => {
  res.sendFile(path.join(staticDir, 'allcards.html'));
});
app.get(/^\/allcards\/([^/]+\.json)$/i, async (req, res, next) => {
  try {
    const encodedFileName = String(req.params?.[0] || '').trim();
    const decodedFileName = decodeURIComponent(encodedFileName);
    const normalizedFileName = path.posix.basename(decodedFileName);
    if (!normalizedFileName || normalizedFileName !== decodedFileName) {
      next();
      return;
    }

    const authUser = await readAuthenticatedUserFromRequest(req).catch(() => null);
    const requesterIsAdmin = isAdminUserRecord(authUser);
    const publicDeckRow = await findPublicFlashcardDeckRowByFileName(normalizedFileName);
    if (publicDeckRow?.is_hidden && !requesterIsAdmin) {
      res.status(404).send('Deck nao encontrado.');
      return;
    }

    let payload = publicDeckRow?.payload && typeof publicDeckRow.payload === 'object'
      ? publicDeckRow.payload
      : await findPostgresFlashcardDeckPayloadByFileName(normalizedFileName);

    if (payload && publicDeckRow) {
      const repaired = repairPublicDeckPayloadAssets(payload, publicDeckRow);
      if (repaired.changed) {
        payload = repaired.payload;
        try {
          const nextItemCount = getFlashcardPayloadItems(payload).length;
          await pool.query(
            `UPDATE public.flashcards_public_decks
             SET payload = $2::jsonb,
                 item_count = $3,
                 updated_at = now()
             WHERE id = $1`,
            [publicDeckRow.id, JSON.stringify(payload), nextItemCount]
          );
        } catch (error) {
          console.warn(`Nao foi possivel persistir reparo de assets no deck ${normalizedFileName}:`, error?.message || error);
        }
      }
    }

    if (payload) {
      res.setHeader('Cache-Control', 'no-store');
      res.json(payload);
      return;
    }

    const localDeckRecord = await findLocalFlashcardDeckRecordByFileName(normalizedFileName);
    if (localDeckRecord?.deck?.isHidden && !requesterIsAdmin) {
      res.status(404).send('Deck nao encontrado.');
      return;
    }
    if (localDeckRecord?.filePath) {
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(localDeckRecord.filePath);
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
});
app.use('/allcards', express.static(ALLCARDS_ROOT, {
  setHeaders(res) {
    res.setHeader('Cache-Control', 'no-store');
  }
}));
app.get(/^\/accesskey\/(.+)$/, async (req, res) => {
  try {
    const relativePath = String(req.params?.[0] || '').replace(/\\/g, '/').replace(/^\/+/, '');
    const normalizedRelativePath = path.posix.normalize(relativePath);
    const ext = path.extname(normalizedRelativePath).toLowerCase();
    if (!normalizedRelativePath || normalizedRelativePath.startsWith('..') || (!SUPPORTED_IMAGE_EXTENSIONS.has(ext) && !SUPPORTED_AUDIO_EXTENSIONS.has(ext))) {
      res.status(404).send('Arquivo nao encontrado.');
      return;
    }

    const assetPath = path.resolve(ACCESSKEY_ROOT, normalizedRelativePath);
    if (!assetPath.startsWith(path.resolve(ACCESSKEY_ROOT))) {
      res.status(404).send('Arquivo nao encontrado.');
      return;
    }
    await fs.promises.access(assetPath, fs.constants.F_OK);
    res.sendFile(assetPath);
  } catch (_error) {
    res.status(404).send('Arquivo nao encontrado.');
  }
});
app.use('/audiostuto', express.static(path.join(__dirname, 'audiostuto')));
app.use('/flashcard-audio-cues', express.static(path.join(__dirname, 'Nova pasta')));
app.use('/eventos', express.static(path.join(__dirname, 'musicas')));

app.get(['/eventos', '/eventos/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'musicas', 'index.html'));
});

app.get(['/class', '/class/'], (req, res) => {
  res.sendFile(path.join(staticDir, 'class.html'));
});

app.get(['/game', '/game/'], (req, res) => {
  const queryIndex = req.originalUrl.indexOf('?');
  const search = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';
  res.redirect(`/index.html${search}#home`);
});

app.get(['/inplay', '/inplay/'], (req, res) => {
  res.redirect('/play.html#play');
});

app.get(['/vocabulary', '/vocabulary/'], (req, res) => {
  res.sendFile(path.join(staticDir, 'vocabulary.html'));
});

app.get(['/levels', '/levels/', '/levels.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'levels.html'));
});

app.get(['/database', '/database/'], (req, res) => {
  res.sendFile(path.join(staticDir, 'database.html'));
});

app.get(['/flashcards', '/flashcards/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'flashcards.html'));
});

app.get(['/fast', '/fast/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'fast.html'));
});

app.get(['/username', '/username/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'username.html'));
});

app.get(['/avataradd', '/avataradd/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'avataradd.html'));
});

app.get(['/password', '/password/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'password.html'));
});

app.get(['/signup', '/signup/'], (req, res) => {
  res.redirect(302, '/accounts');
});

app.get(['/premium', '/premium/'], (req, res) => {
  res.sendFile(path.join(staticDir, 'premium.html'));
});

app.get(['/books', '/books/'], (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(staticDir, 'books.html'));
});

app.get(['/mycards', '/mycards/', '/mycards.html'], (req, res) => {
  res.sendFile(path.join(staticDir, 'mycards.html'));
});

app.get(['/users', '/users/'], (req, res) => {
  res.sendFile(path.join(staticDir, 'users.html'));
});

app.get(['/account', '/account/', '/accounts', '/accounts/'], (req, res) => {
  res.sendFile(path.join(staticDir, 'account.html'));
});

app.get(['/rank', '/rank/'], (req, res) => {
  res.redirect(302, '/users');
});

app.get(['/storage', '/storage/'], (req, res) => {
  res.sendFile(path.join(staticDir, 'storage.html'));
});

app.get(['/storage-debug', '/storage-debug/'], (req, res) => {
  res.sendFile(path.join(staticDir, 'storage-debug.html'));
});

app.get(['/edu', '/edu/'], (req, res) => {
  const staticEduPath = path.join(staticDir, 'edu.html');
  const rootEduPath = path.join(__dirname, 'edu.html');

  if (fs.existsSync(staticEduPath)) {
    res.sendFile(staticEduPath);
    return;
  }

  res.sendFile(rootEduPath);
});

app.get(['/speak', '/speak/'], (req, res) => {
  res.sendFile(path.join(staticDir, 'speak.html'));
});

app.get(['/speaking', '/speaking/'], (req, res) => {
  res.sendFile(path.join(staticDir, 'speaking.html'));
});

app.post('/api/tts/openai', async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  const voice = typeof req.body?.voice === 'string' ? req.body.voice.trim() : '';
  const requestedFileName = typeof req.body?.fileName === 'string' ? req.body.fileName.trim() : '';
  const safeFileName = (requestedFileName || `playtalk-${voice || 'voice'}.mp3`)
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'playtalk-voice.mp3';

  if (!text) {
    res.status(400).json({ error: 'Texto vazio para gerar voz.' });
    return;
  }

  if (!voice) {
    res.status(400).json({ error: 'Selecione uma voz antes de gerar o audio.' });
    return;
  }

  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('fake')) {
    res.status(503).json({
      error: 'OpenAI nao configurada.',
      instructions: 'Preencha OPENAI_API_KEY no .env com a chave real da OpenAI.'
    });
    return;
  }

  try {
    const upstreamResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_TTS_MODEL,
        voice,
        input: text,
        format: 'mp3'
      })
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      res.status(upstreamResponse.status).json({
        error: 'Falha ao gerar audio na OpenAI.',
        details: errorText.slice(0, 500)
      });
      return;
    }

    const audioBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName.replace(/"/g, '')}"`);
    res.send(audioBuffer);
  } catch (error) {
    res.status(502).json({
      error: 'Erro ao conectar com a OpenAI.',
      details: error.message
    });
  }
});

app.post('/api/stt/openai', async (req, res) => {
  const audioDataUrl = typeof req.body?.audioDataUrl === 'string' ? req.body.audioDataUrl.trim() : '';
  const language = typeof req.body?.language === 'string' ? req.body.language.trim().toLowerCase() : '';
  const parsedAudio = parseBase64DataUrl(audioDataUrl);

  if (!parsedAudio?.buffer?.length) {
    res.status(400).json({ error: 'Audio invalido para transcricao.' });
    return;
  }

  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('fake')) {
    res.status(503).json({
      error: 'OpenAI nao configurada.',
      instructions: 'Preencha OPENAI_API_KEY no .env com a chave real da OpenAI.'
    });
    return;
  }

  try {
    const formData = new FormData();
    const extension = extensionFromMimeType(parsedAudio.mimeType);
    const fileName = `playtalk-recording.${extension}`;
    const fileBlob = new Blob([parsedAudio.buffer], { type: parsedAudio.mimeType });
    formData.append('file', fileBlob, fileName);
    formData.append('model', OPENAI_STT_MODEL);
    formData.append('response_format', 'json');
    if (/^[a-z]{2}$/.test(language)) {
      formData.append('language', language);
    }

    const upstreamResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: formData
    });

    const responseText = await upstreamResponse.text();
    let payload = null;
    try {
      payload = responseText ? JSON.parse(responseText) : null;
    } catch (_error) {
      payload = null;
    }

    if (!upstreamResponse.ok) {
      res.status(upstreamResponse.status).json({
        error: 'Falha ao transcrever audio na OpenAI.',
        details: payload?.error?.message || responseText.slice(0, 500)
      });
      return;
    }

    const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
    if (!text) {
      res.status(502).json({ error: 'A OpenAI nao retornou texto da transcricao.' });
      return;
    }

    res.json({
      success: true,
      text,
      model: OPENAI_STT_MODEL
    });
  } catch (error) {
    res.status(502).json({
      error: 'Erro ao conectar com a OpenAI.',
      details: error.message
    });
  }
});

app.post('/api/chat/openai', async (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const requestedSystemPrompt = typeof req.body?.systemPrompt === 'string' ? req.body.systemPrompt.trim() : '';
  const requestedMaxOutputChars = Number.parseInt(req.body?.maxOutputChars, 10);
  const normalizedMessages = messages
    .map((message) => ({
      role: message?.role === 'assistant' ? 'assistant' : 'user',
      content: typeof message?.content === 'string' ? message.content.trim() : ''
    }))
    .filter((message) => message.content)
    .slice(-12);

  if (!normalizedMessages.length) {
    res.status(400).json({ error: 'Envie ao menos uma mensagem para o chat.' });
    return;
  }

  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('fake')) {
    res.status(503).json({
      error: 'OpenAI nao configurada.',
      instructions: 'Preencha OPENAI_API_KEY no .env com a chave real da OpenAI.'
    });
    return;
  }

  const systemPrompt = requestedSystemPrompt || 'Voce e um assistente rapido, direto e util. Responda em portugues do Brasil, com foco pratico.';
  const maxOutputChars = Number.isInteger(requestedMaxOutputChars) && requestedMaxOutputChars > 0
    ? Math.min(requestedMaxOutputChars, 280)
    : 0;

  try {
    const upstreamResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_CHAT_FAST_MODEL,
        instructions: systemPrompt,
        input: normalizedMessages.map((message) => ({
          type: 'message',
          role: message.role,
          content: [
            {
              type: 'input_text',
              text: message.content
            }
          ]
        }))
      })
    });

    const responseText = await upstreamResponse.text();
    let payload = null;
    try {
      payload = responseText ? JSON.parse(responseText) : null;
    } catch (_error) {
      payload = null;
    }

    if (!upstreamResponse.ok) {
      res.status(upstreamResponse.status).json({
        error: 'Falha ao gerar resposta no chat da OpenAI.',
        details: payload?.error?.message || responseText.slice(0, 500)
      });
      return;
    }

    let text = extractResponseText(payload);
    if (!text) {
      res.status(502).json({ error: 'A OpenAI nao retornou texto utilizavel no chat.' });
      return;
    }

    if (maxOutputChars && text.length > maxOutputChars) {
      text = text.slice(0, maxOutputChars).trim();
    }

    res.json({
      success: true,
      text,
      model: OPENAI_CHAT_FAST_MODEL,
      usage: payload?.usage || null
    });
  } catch (error) {
    res.status(502).json({
      error: 'Erro ao conectar com a OpenAI.',
      details: error.message
    });
  }
});

app.post('/api/tts/elevenlabs', async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  const fileName = typeof req.body?.fileName === 'string' ? req.body.fileName.trim() : 'playtalk-voice.mp3';
  const requestedVoiceId = typeof req.body?.voiceId === 'string' ? req.body.voiceId.trim() : '';
  const requestedLanguageCode = typeof req.body?.languageCode === 'string' ? req.body.languageCode.trim().toLowerCase() : '';
  const languageCode = /^[a-z]{2}$/.test(requestedLanguageCode) ? requestedLanguageCode : '';
  const voiceId = requestedVoiceId || ELEVENLABS_VOICE_ID_HARRY;

  if (!text) {
    res.status(400).json({ error: 'Texto vazio para gerar voz.' });
    return;
  }

  if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY.includes('fake') || !voiceId || voiceId.includes('fake')) {
    res.status(503).json({
      error: 'ElevenLabs nao configurado.',
      instructions: 'Preencha ELEVENLABS_API_KEY e ELEVENLABS_VOICE_ID_HARRY no .env com os valores reais.'
    });
    return;
  }

  try {
    const upstreamResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL_ID,
        ...(languageCode ? { language_code: languageCode } : {}),
        output_format: 'mp3_44100_128'
      })
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      res.status(upstreamResponse.status).json({
        error: 'Falha ao gerar audio na ElevenLabs.',
        details: errorText.slice(0, 500)
      });
      return;
    }

    const audioBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName.replace(/"/g, '')}"`);
    res.send(audioBuffer);
  } catch (error) {
    res.status(502).json({
      error: 'Erro ao conectar com a ElevenLabs.',
      details: error.message
    });
  }
});

app.post('/api/images/openai', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  const fileNameHint = typeof req.body?.fileName === 'string' ? req.body.fileName.trim() : 'playtalk-image';
  const size = typeof req.body?.size === 'string' ? req.body.size.trim() : '1024x1024';
  const quality = typeof req.body?.quality === 'string' ? req.body.quality.trim() : 'medium';
  const background = typeof req.body?.background === 'string' ? req.body.background.trim() : 'auto';
  const outputFormat = typeof req.body?.outputFormat === 'string' ? req.body.outputFormat.trim() : 'webp';

  if (!prompt) {
    res.status(400).json({ error: 'Prompt vazio para gerar imagem.' });
    return;
  }

  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('fake')) {
    res.status(503).json({
      error: 'OpenAI nao configurado.',
      instructions: 'Preencha OPENAI_API_KEY no .env com a chave real da OpenAI.'
    });
    return;
  }

  try {
    const upstreamResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_IMAGE_MODEL,
        prompt,
        size,
        quality,
        background,
        output_format: outputFormat
      })
    });

    const responseText = await upstreamResponse.text();
    let payload = null;
    try {
      payload = responseText ? JSON.parse(responseText) : null;
    } catch (_error) {
      payload = null;
    }

    if (!upstreamResponse.ok) {
      res.status(upstreamResponse.status).json({
        error: 'Falha ao gerar imagem na OpenAI.',
        details: payload?.error?.message || responseText.slice(0, 500)
      });
      return;
    }

    const image = Array.isArray(payload?.data) ? payload.data[0] : null;
    const b64 = image?.b64_json;
    if (!b64) {
      res.status(502).json({
        error: 'A OpenAI nao retornou a imagem em base64.'
      });
      return;
    }

    const safeExt = outputFormat === 'jpeg' ? 'jpg' : outputFormat === 'png' ? 'png' : 'webp';
    const mimeType = safeExt === 'jpg' ? 'image/jpeg' : safeExt === 'png' ? 'image/png' : 'image/webp';
    const finalFileName = `${safeGeneratedBase(fileNameHint)}-${Date.now()}.${safeExt}`;

    res.json({
      success: true,
      fileName: finalFileName,
      dataUrl: `data:${mimeType};base64,${b64}`,
      usage: payload?.usage || null
    });
  } catch (error) {
    res.status(502).json({
      error: 'Erro ao conectar com a OpenAI.',
      details: error.message
    });
  }
});

app.post('/api/images/openai/avatar-cartoon', async (req, res) => {
  try {
    const payload = await generateAvatarCartoonWithOpenAI({
      imageDataUrl: typeof req.body?.imageDataUrl === 'string'
        ? req.body.imageDataUrl.trim()
        : (typeof req.body?.avatar === 'string' ? req.body.avatar.trim() : ''),
      prompt: typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '',
      fileNameHint: typeof req.body?.fileName === 'string' ? req.body.fileName.trim() : 'playtalk-avatar-cartoon',
      size: typeof req.body?.size === 'string' ? req.body.size.trim() : '1024x1024',
      quality: typeof req.body?.quality === 'string' ? req.body.quality.trim() : 'low',
      outputFormat: typeof req.body?.outputFormat === 'string' ? req.body.outputFormat.trim() : 'png',
      background: typeof req.body?.background === 'string' ? req.body.background.trim() : 'transparent'
    });
    res.json(payload);
  } catch (error) {
    res.status(Number(error?.statusCode || 502)).json({
      error: error.message || 'Erro ao conectar com a OpenAI.',
      details: error.details || null,
      instructions: error.instructions || null
    });
  }
});

app.get('/api/public/banners', async (req, res) => {
  try {
    const surface = normalizeAdminBannerSurface(req.query?.surface);
    const manifest = await loadAdminBannerManifest();
    const selectedBanners = surface === 'users'
      ? manifest.bannersUsers
      : manifest.banners;
    res.json({
      success: true,
      slotCount: ADMIN_BANNER_SLOT_COUNT,
      resolutionLabel: ADMIN_BANNER_RESOLUTION_LABEL,
      defaultPrompt: ADMIN_BANNER_DEFAULT_PROMPT,
      surface,
      banners: selectedBanners
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Falha ao carregar banners.',
      details: error.message
    });
  }
});

app.post('/api/admin/banners/generate', express.json({ limit: '2mb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);
  } catch (error) {
    const statusCode = Number(error?.statusCode || 401);
    res.status(statusCode).json({ error: error.message || 'Acesso negado.' });
    return;
  }

  const slot = normalizeAdminBannerSlot(req.body?.slot);
  const customPrompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  const size = typeof req.body?.size === 'string' ? req.body.size.trim() : '1536x1024';
  const quality = typeof req.body?.quality === 'string' ? req.body.quality.trim() : 'medium';
  const outputFormat = typeof req.body?.outputFormat === 'string' ? req.body.outputFormat.trim() : 'webp';

  if (!slot) {
    res.status(400).json({ error: 'Slot de banner invalido.' });
    return;
  }

  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('fake')) {
    res.status(503).json({
      error: 'OpenAI nao configurado.',
      instructions: 'Preencha OPENAI_API_KEY no .env com a chave real da OpenAI.'
    });
    return;
  }

  const prompt = customPrompt || ADMIN_BANNER_DEFAULT_PROMPT;
  const promptWithGuidance = `${prompt} Keep a safe central framing for website crop and repositioning.`;

  try {
    const upstreamResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_AVATAR_IMAGE_MODEL,
        prompt: promptWithGuidance,
        size,
        quality,
        output_format: outputFormat
      })
    });

    const responseText = await upstreamResponse.text();
    let payload = null;
    try {
      payload = responseText ? JSON.parse(responseText) : null;
    } catch (_error) {
      payload = null;
    }

    if (!upstreamResponse.ok) {
      res.status(upstreamResponse.status).json({
        error: 'Falha ao gerar banner na OpenAI.',
        details: payload?.error?.message || responseText.slice(0, 500)
      });
      return;
    }

    const image = Array.isArray(payload?.data) ? payload.data[0] : null;
    const b64 = image?.b64_json;
    if (!b64) {
      res.status(502).json({ error: 'A OpenAI nao retornou a imagem em base64.' });
      return;
    }

    const safeExt = outputFormat === 'jpeg' ? 'jpg' : outputFormat === 'png' ? 'png' : 'webp';
    const mimeType = safeExt === 'jpg' ? 'image/jpeg' : safeExt === 'png' ? 'image/png' : 'image/webp';

    res.json({
      success: true,
      slot,
      model: OPENAI_AVATAR_IMAGE_MODEL,
      promptUsed: prompt,
      dataUrl: `data:${mimeType};base64,${b64}`,
      usage: payload?.usage || null
    });
  } catch (error) {
    res.status(502).json({
      error: 'Erro ao conectar com a OpenAI.',
      details: error.message
    });
  }
});

app.post('/api/admin/banners/save', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);
  } catch (error) {
    const statusCode = Number(error?.statusCode || 401);
    res.status(statusCode).json({ error: error.message || 'Acesso negado.' });
    return;
  }

  if (!isR2FluencyConfigured()) {
    res.status(503).json({ error: 'R2 nao configurado para salvar banner.' });
    return;
  }

  const slot = normalizeAdminBannerSlot(req.body?.slot);
  const variant = normalizeAdminBannerVariant(req.body?.variant) || 'desktop';
  const surface = normalizeAdminBannerSurface(req.body?.surface);
  const imageDataUrl = typeof req.body?.imageDataUrl === 'string' ? req.body.imageDataUrl.trim() : '';
  const imageUrl = typeof req.body?.imageUrl === 'string' ? req.body.imageUrl.trim() : '';
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  const offsetX = normalizeAdminBannerOffset(req.body?.offsetX);
  const offsetY = normalizeAdminBannerOffset(req.body?.offsetY);
  const sizeAdjustPx = normalizeAdminBannerSizeAdjust(req.body?.sizeAdjustPx);
  const previewWidth = Number.parseFloat(req.body?.previewWidth);
  const previewHeight = Number.parseFloat(req.body?.previewHeight);

  if (!slot) {
    res.status(400).json({ error: 'Slot de banner invalido.' });
    return;
  }

  try {
    let parsedImage = null;
    if (imageDataUrl) {
      parsedImage = parseBase64DataUrl(imageDataUrl);
    } else if (imageUrl) {
      let sourceUrl = imageUrl;
      if (sourceUrl.startsWith('/')) {
        const baseUrl = getRequestBaseUrl(req);
        if (!baseUrl) {
          res.status(400).json({ error: 'URL local de banner invalida.' });
          return;
        }
        sourceUrl = `${baseUrl}${sourceUrl}`;
      }

      let parsedSourceUrl = null;
      try {
        parsedSourceUrl = new URL(sourceUrl);
      } catch (_error) {
        parsedSourceUrl = null;
      }
      if (!parsedSourceUrl || !/^https?:$/i.test(parsedSourceUrl.protocol)) {
        res.status(400).json({ error: 'URL de imagem invalida para salvar banner.' });
        return;
      }

      const allowedHosts = new Set();
      try {
        allowedHosts.add(new URL(FLASHCARDS_R2_PUBLIC_ROOT).host.toLowerCase());
      } catch (_error) {
        // ignore
      }
      const requestHost = String(req.get('host') || '').trim().toLowerCase();
      if (requestHost) allowedHosts.add(requestHost);
      if (!allowedHosts.has(parsedSourceUrl.host.toLowerCase())) {
        res.status(400).json({ error: 'Host da imagem nao permitido para salvar banner.' });
        return;
      }

      const upstream = await fetch(sourceUrl, { method: 'GET' });
      if (!upstream.ok) {
        res.status(400).json({ error: 'Nao consegui baixar a imagem atual para salvar novamente.' });
        return;
      }
      const contentType = String(upstream.headers.get('content-type') || '').trim().toLowerCase();
      const arrayBuffer = await upstream.arrayBuffer();
      parsedImage = {
        mimeType: /^image\//i.test(contentType) ? contentType : 'image/webp',
        buffer: Buffer.from(arrayBuffer)
      };
    }

    if (!parsedImage?.buffer?.length || !/^image\//i.test(parsedImage.mimeType || '')) {
      res.status(400).json({ error: 'Imagem de banner invalida.' });
      return;
    }

    if (parsedImage.buffer.length > 15 * 1024 * 1024) {
      res.status(413).json({ error: 'Imagem muito grande. Limite de 15 MB.' });
      return;
    }

    const renderSize = getAdminBannerRenderSize(variant);
    const hasPreviewDimensions = Number.isFinite(previewWidth) && Number.isFinite(previewHeight) && previewWidth > 0 && previewHeight > 0;
    const scaleX = hasPreviewDimensions ? (renderSize.width / previewWidth) : 1;
    const scaleY = hasPreviewDimensions ? (renderSize.height / previewHeight) : 1;
    const scaleForSize = (scaleX + scaleY) / 2;
    const renderOffsetX = normalizeAdminBannerOffset(Math.round(offsetX * scaleX));
    const renderOffsetY = normalizeAdminBannerOffset(Math.round(offsetY * scaleY));
    const renderSizeAdjustPx = normalizeAdminBannerSizeAdjust(Math.round(sizeAdjustPx * scaleForSize));

    const optimizedBuffer = await optimizeAdminBannerToWebp(parsedImage.buffer, variant, {
      offsetX: renderOffsetX,
      offsetY: renderOffsetY,
      sizeAdjustPx: renderSizeAdjustPx
    });
    if (!optimizedBuffer?.length) {
      res.status(422).json({ error: 'Nao foi possivel otimizar o banner para WebP.' });
      return;
    }

    if (optimizedBuffer.length > 5 * 1024 * 1024) {
      res.status(413).json({ error: 'Banner otimizado ainda muito grande. Limite de 5 MB.' });
      return;
    }

    const safeExtension = 'webp';
    const mimeType = 'image/webp';
    const objectKey = path.posix.join(
      ADMIN_BANNER_IMAGE_OBJECT_PREFIX,
      `banner-${slot}-${variant}.${safeExtension}`
    );

    await putR2Object(objectKey, optimizedBuffer, mimeType);
    const cacheBuster = Date.now();
    const publicUrl = buildFlashcardsR2PublicUrl(objectKey);
    const versionedPublicUrl = `${publicUrl}?v=${cacheBuster}`;
    const manifest = await loadAdminBannerManifest();
    const bannerCollectionKey = surface === 'users' ? 'bannersUsers' : 'banners';
    if (!Array.isArray(manifest[bannerCollectionKey])) {
      manifest[bannerCollectionKey] = createDefaultAdminBannerSet();
    }
    const previousEntry = manifest[bannerCollectionKey].find((entry) => entry.slot === slot) || null;
    const previousObjectKey = variant === 'mobile'
      ? String(previousEntry?.objectKeyMobile || '').trim()
      : String(previousEntry?.objectKeyDesktop || previousEntry?.objectKey || '').trim();

    manifest[bannerCollectionKey] = manifest[bannerCollectionKey].map((entry) => {
      if (entry.slot !== slot) return entry;
      if (variant === 'mobile') {
        return {
          ...entry,
          slot,
          imageUrlMobile: versionedPublicUrl,
          objectKeyMobile: objectKey,
          promptMobile: prompt || entry.promptMobile || entry.prompt || ADMIN_BANNER_DEFAULT_PROMPT,
          offsetXMobile: 0,
          offsetYMobile: 0,
          sizeAdjustPxMobile: 0,
          updatedAt: new Date().toISOString()
        };
      }
      return {
        ...entry,
        slot,
        imageUrlDesktop: versionedPublicUrl,
        objectKeyDesktop: objectKey,
        promptDesktop: prompt || entry.promptDesktop || entry.prompt || ADMIN_BANNER_DEFAULT_PROMPT,
        offsetXDesktop: 0,
        offsetYDesktop: 0,
        sizeAdjustPxDesktop: 0,
        // Legacy aliases to keep old readers functional.
        imageUrl: versionedPublicUrl,
        objectKey,
        prompt: prompt || entry.promptDesktop || entry.prompt || ADMIN_BANNER_DEFAULT_PROMPT,
        offsetX: 0,
        offsetY: 0,
        sizeAdjustPx: 0,
        updatedAt: new Date().toISOString()
      };
    });
    manifest.updatedAt = new Date().toISOString();
    const savedManifest = await persistAdminBannerManifest(manifest);
    const savedCollection = surface === 'users' ? savedManifest.bannersUsers : savedManifest.banners;
    const savedEntry = savedCollection.find((entry) => entry.slot === slot) || null;

    if (previousObjectKey && previousObjectKey !== objectKey) {
      deleteR2Object(previousObjectKey).catch(() => {});
    }

    res.json({
      success: true,
      slot,
      variant,
      surface,
      optimization: {
        sourceBytes: parsedImage.buffer.length,
        outputBytes: optimizedBuffer.length,
        format: 'webp',
        width: renderSize.width,
        height: renderSize.height,
        previewWidth: hasPreviewDimensions ? previewWidth : null,
        previewHeight: hasPreviewDimensions ? previewHeight : null,
        renderOffsetX,
        renderOffsetY,
        renderSizeAdjustPx
      },
      banner: savedEntry
    });
  } catch (error) {
    res.status(500).json({
      error: 'Falha ao salvar banner no R2.',
      details: error.message
    });
  }
});

app.post('/api/text/openai/flashcards', async (req, res) => {
  const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
  const minChars = Number.parseInt(req.body?.minChars, 10);
  const maxChars = Number.parseInt(req.body?.maxChars, 10);
  const count = Number.parseInt(req.body?.count, 10);

  if (!topic) {
    res.status(400).json({ error: 'Informe o tipo de frases ou contexto.' });
    return;
  }

  if (!Number.isFinite(minChars) || !Number.isFinite(maxChars) || minChars < 1 || maxChars < minChars) {
    res.status(400).json({ error: 'Faixa de caracteres invalida.' });
    return;
  }

  if (!Number.isFinite(count) || count < 1 || count > 60) {
    res.status(400).json({ error: 'Quantidade invalida. Use entre 1 e 60 frases.' });
    return;
  }

  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('fake')) {
    res.status(503).json({
      error: 'OpenAI nao configurado.',
      instructions: 'Preencha OPENAI_API_KEY no .env com a chave real da OpenAI.'
    });
    return;
  }

  const prompt = [
    'You generate flashcard sentence pairs for a Brazilian Portuguese speaker learning English.',
    'Return only valid JSON.',
    `Create exactly ${count} items.`,
    `Topic/context: ${topic}.`,
    `Each Portuguese sentence must have between ${minChars} and ${maxChars} characters, including spaces.`,
    `Each English sentence must have between ${minChars} and ${maxChars} characters, including spaces.`,
    'Use natural, everyday, child-safe language.',
    'Keep vocabulary useful and clear for educational flashcards.',
    'Portuguese and English must be faithful translations of each other.',
    'Vary sentence structure and wording across items.',
    'Avoid numbering, emojis, explanations, markdown, or extra text.',
    'Output JSON with this exact shape:',
    '{"items":[{"pt":"...","en":"..."}]}'
  ].join('\n');

  try {
    const upstreamResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_TEXT_MODEL,
        input: prompt
      })
    });

    const responseText = await upstreamResponse.text();
    let payload = null;
    try {
      payload = responseText ? JSON.parse(responseText) : null;
    } catch (_error) {
      payload = null;
    }

    if (!upstreamResponse.ok) {
      res.status(upstreamResponse.status).json({
        error: 'Falha ao gerar frases na OpenAI.',
        details: payload?.error?.message || responseText.slice(0, 500)
      });
      return;
    }

    const outputText = extractResponseText(payload);
    if (!outputText) {
      res.status(502).json({ error: 'A OpenAI nao retornou texto utilizavel.' });
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(outputText);
    } catch (_error) {
      res.status(502).json({
        error: 'A OpenAI retornou um formato inesperado.',
        details: outputText.slice(0, 500)
      });
      return;
    }

    const items = Array.isArray(parsed?.items)
      ? parsed.items
        .map(item => ({
          pt: typeof item?.pt === 'string' ? item.pt.trim() : '',
          en: typeof item?.en === 'string' ? item.en.trim() : ''
        }))
        .filter(item => item.pt && item.en)
      : [];

    if (!items.length) {
      res.status(502).json({ error: 'Nenhuma frase valida foi retornada pela OpenAI.' });
      return;
    }

    res.json({
      success: true,
      items,
      usage: payload?.usage || null,
      model: OPENAI_TEXT_MODEL
    });
  } catch (error) {
    res.status(502).json({
      error: 'Erro ao conectar com a OpenAI.',
      details: error.message
    });
  }
});

app.post('/api/text/openai/scenes', async (req, res) => {
  const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
  const minChars = Number.parseInt(req.body?.minChars, 10);
  const maxChars = Number.parseInt(req.body?.maxChars, 10);
  const lineCount = Number.parseInt(req.body?.lineCount, 10);
  const characters = Array.isArray(req.body?.characters) ? req.body.characters : [];

  const normalizedCharacters = characters
    .map((character) => ({
      id: typeof character?.id === 'string' ? character.id.trim().toLowerCase() : '',
      name: typeof character?.name === 'string' ? character.name.trim() : '',
      share: Number.parseFloat(character?.share),
      targetLines: Number.parseInt(character?.targetLines, 10)
    }))
    .filter((character) => character.id && character.name && Number.isFinite(character.share) && Number.isInteger(character.targetLines) && character.targetLines > 0)
    .slice(0, 4);

  if (!topic) {
    res.status(400).json({ error: 'Informe o tema ou contexto da historia.' });
    return;
  }

  if (!Number.isFinite(minChars) || !Number.isFinite(maxChars) || minChars < 1 || maxChars < minChars) {
    res.status(400).json({ error: 'Faixa de caracteres invalida para as falas.' });
    return;
  }

  if (!Number.isFinite(lineCount) || lineCount < 1 || lineCount > 80) {
    res.status(400).json({ error: 'Quantidade invalida de falas. Use entre 1 e 80.' });
    return;
  }

  if (normalizedCharacters.length < 1 || normalizedCharacters.length > 4) {
    res.status(400).json({ error: 'Selecione entre 1 e 4 personagens para a historia.' });
    return;
  }

  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('fake')) {
    res.status(503).json({
      error: 'OpenAI nao configurado.',
      instructions: 'Preencha OPENAI_API_KEY no .env com a chave real da OpenAI.'
    });
    return;
  }

  const characterPlan = normalizedCharacters
    .map((character) => `${character.name} (${character.id}): aproximadamente ${character.share}% das falas, alvo de ${character.targetLines} falas.`)
    .join('\n');

  const prompt = [
    'You write dialogue scenes for Brazilian Portuguese learners who are also learning English.',
    'Return only valid JSON.',
    `Create exactly ${lineCount} dialogue items.`,
    `Story context: ${topic}.`,
    `Each Portuguese line must have between ${minChars} and ${maxChars} characters, including spaces.`,
    `Each English line must have between ${minChars} and ${maxChars} characters, including spaces.`,
    'Use natural, child-safe, vivid dialogue with short scene progression.',
    'Each item must contain only one character speaking.',
    'Portuguese and English must be faithful translations of each other.',
    'Do not add narrator labels, stage directions, emojis, markdown, or extra commentary.',
    'Respect this character participation plan as closely as possible:',
    characterPlan,
    'Output JSON with this exact shape:',
    '{"items":[{"characterId":"bella","pt":"...","en":"..."}]}'
  ].join('\n');

  try {
    const upstreamResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_STORY_MODEL,
        input: prompt
      })
    });

    const responseText = await upstreamResponse.text();
    let payload = null;
    try {
      payload = responseText ? JSON.parse(responseText) : null;
    } catch (_error) {
      payload = null;
    }

    if (!upstreamResponse.ok) {
      res.status(upstreamResponse.status).json({
        error: 'Falha ao gerar historia na OpenAI.',
        details: payload?.error?.message || responseText.slice(0, 500)
      });
      return;
    }

    const outputText = extractResponseText(payload);
    if (!outputText) {
      res.status(502).json({ error: 'A OpenAI nao retornou texto utilizavel.' });
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(outputText);
    } catch (_error) {
      res.status(502).json({
        error: 'A OpenAI retornou um formato inesperado.',
        details: outputText.slice(0, 500)
      });
      return;
    }

    const validIds = new Set(normalizedCharacters.map((character) => character.id));
    const items = Array.isArray(parsed?.items)
      ? parsed.items
        .map((item) => ({
          characterId: typeof item?.characterId === 'string'
            ? item.characterId.trim().toLowerCase() === 'jessa'
              ? 'jessica'
              : item.characterId.trim().toLowerCase()
            : '',
          pt: typeof item?.pt === 'string' ? item.pt.trim() : '',
          en: typeof item?.en === 'string' ? item.en.trim() : ''
        }))
        .filter((item) => item.characterId && validIds.has(item.characterId) && item.pt && item.en)
      : [];

    if (items.length !== lineCount) {
      res.status(502).json({
        error: 'A OpenAI nao retornou a quantidade esperada de falas.',
        details: `Esperado: ${lineCount}. Recebido: ${items.length}.`
      });
      return;
    }

    res.json({
      success: true,
      items,
      usage: payload?.usage || null,
      model: OPENAI_STORY_MODEL
    });
  } catch (error) {
    res.status(502).json({
      error: 'Erro ao conectar com a OpenAI.',
      details: error.message
    });
  }
});

app.post('/api/text/openai/movies', async (req, res) => {
  const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
  const minChars = Number.parseInt(req.body?.minChars, 10);
  const maxChars = Number.parseInt(req.body?.maxChars, 10);
  const itemCount = Number.parseInt(req.body?.itemCount, 10);

  if (!topic) {
    res.status(400).json({ error: 'Informe o contexto do filme.' });
    return;
  }

  if (!Number.isFinite(minChars) || !Number.isFinite(maxChars) || minChars < 1 || maxChars < minChars) {
    res.status(400).json({ error: 'Faixa de caracteres invalida para as frases.' });
    return;
  }

  if (!Number.isFinite(itemCount) || itemCount < 1 || itemCount > 60) {
    res.status(400).json({ error: 'Quantidade invalida de containers. Use entre 1 e 60.' });
    return;
  }

  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('fake')) {
    res.status(503).json({
      error: 'OpenAI nao configurado.',
      instructions: 'Preencha OPENAI_API_KEY no .env com a chave real da OpenAI.'
    });
    return;
  }

  const prompt = [
    'You create short cinematic learning sequences for Brazilian Portuguese speakers learning English.',
    'Return only valid JSON.',
    `Create exactly ${itemCount} items that form one pleasant, fluid, coherent sequence in context.`,
    `Story context: ${topic}.`,
    `Each Portuguese sentence must have between ${minChars} and ${maxChars} characters, including spaces.`,
    `Each English sentence must have between ${minChars} and ${maxChars} characters, including spaces.`,
    'The reading flow must feel natural, enjoyable, and clear in any language.',
    'Each item needs a short visual prompt that helps image generation depict the exact moment.',
    'The visual prompt must be concise, concrete, and describe only the scene to be illustrated.',
    'Portuguese and English must be faithful translations of each other.',
    'Avoid bullets, numbering inside the lines, markdown, emojis, and extra commentary.',
    'Also create a concise, attractive title for the sequence.',
    'Output JSON with this exact shape:',
    '{"title":"...","items":[{"pt":"...","en":"...","imagePrompt":"..."}]}'
  ].join('\n');

  try {
    const upstreamResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_STORY_MODEL,
        input: prompt
      })
    });

    const responseText = await upstreamResponse.text();
    let payload = null;
    try {
      payload = responseText ? JSON.parse(responseText) : null;
    } catch (_error) {
      payload = null;
    }

    if (!upstreamResponse.ok) {
      res.status(upstreamResponse.status).json({
        error: 'Falha ao gerar filme na OpenAI.',
        details: payload?.error?.message || responseText.slice(0, 500)
      });
      return;
    }

    const outputText = extractResponseText(payload);
    if (!outputText) {
      res.status(502).json({ error: 'A OpenAI nao retornou texto utilizavel.' });
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(outputText);
    } catch (_error) {
      res.status(502).json({
        error: 'A OpenAI retornou um formato inesperado.',
        details: outputText.slice(0, 500)
      });
      return;
    }

    const title = typeof parsed?.title === 'string' ? parsed.title.trim() : '';
    const items = Array.isArray(parsed?.items)
      ? parsed.items
        .map((item) => ({
          pt: typeof item?.pt === 'string' ? item.pt.trim() : '',
          en: typeof item?.en === 'string' ? item.en.trim() : '',
          imagePrompt: typeof item?.imagePrompt === 'string' ? item.imagePrompt.trim() : ''
        }))
        .filter((item) => item.pt && item.en && item.imagePrompt)
      : [];

    if (!title) {
      res.status(502).json({ error: 'A OpenAI nao retornou um titulo valido.' });
      return;
    }

    if (items.length !== itemCount) {
      res.status(502).json({
        error: 'A OpenAI nao retornou a quantidade esperada de itens.',
        details: `Esperado: ${itemCount}. Recebido: ${items.length}.`
      });
      return;
    }

    res.json({
      success: true,
      title,
      items,
      usage: payload?.usage || null,
      model: OPENAI_STORY_MODEL
    });
  } catch (error) {
    res.status(502).json({
      error: 'Erro ao conectar com a OpenAI.',
      details: error.message
    });
  }
});

app.post('/api/text/openai/translate', async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  const normalizedItems = items
    .map(item => ({
      index: Number.isInteger(item?.index) ? item.index : Number.parseInt(item?.index, 10),
      pt: typeof item?.pt === 'string' ? item.pt.trim() : '',
      en: typeof item?.en === 'string' ? item.en.trim() : ''
    }))
    .filter(item => Number.isInteger(item.index) && item.pt && !item.en);

  if (!normalizedItems.length) {
    res.status(400).json({ error: 'Nao ha textos em portugues aguardando traducao.' });
    return;
  }

  if (normalizedItems.length > 48) {
    res.status(400).json({ error: 'Quantidade invalida. Traduza no maximo 48 itens por vez.' });
    return;
  }

  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('fake')) {
    res.status(503).json({
      error: 'OpenAI nao configurado.',
      instructions: 'Preencha OPENAI_API_KEY no .env com a chave real da OpenAI.'
    });
    return;
  }

  const prompt = [
    'You translate Brazilian Portuguese learning content into natural, modern, useful English.',
    'Return only valid JSON.',
    'Preserve meaning, but prefer real everyday English over literal awkward translations.',
    'Keep the tone child-safe and practical for a language-learning app.',
    'Do not invent extra context.',
    'Do not translate items that already have English text.',
    'Output JSON with this exact shape:',
    '{"items":[{"index":0,"en":"..."}]}',
    'Translate these Portuguese items:',
    JSON.stringify(normalizedItems.map(item => ({ index: item.index, pt: item.pt })))
  ].join('\n');

  try {
    const upstreamResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_TEXT_MODEL,
        input: prompt
      })
    });

    const responseText = await upstreamResponse.text();
    let payload = null;
    try {
      payload = responseText ? JSON.parse(responseText) : null;
    } catch (_error) {
      payload = null;
    }

    if (!upstreamResponse.ok) {
      res.status(upstreamResponse.status).json({
        error: 'Falha ao traduzir textos na OpenAI.',
        details: payload?.error?.message || responseText.slice(0, 500)
      });
      return;
    }

    const outputText = extractResponseText(payload);
    if (!outputText) {
      res.status(502).json({ error: 'A OpenAI nao retornou texto utilizavel.' });
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(outputText);
    } catch (_error) {
      res.status(502).json({
        error: 'A OpenAI retornou um formato inesperado.',
        details: outputText.slice(0, 500)
      });
      return;
    }

    const translatedItems = Array.isArray(parsed?.items)
      ? parsed.items
        .map(item => ({
          index: Number.isInteger(item?.index) ? item.index : Number.parseInt(item?.index, 10),
          en: typeof item?.en === 'string' ? item.en.trim() : ''
        }))
        .filter(item => Number.isInteger(item.index) && item.en)
      : [];

    if (!translatedItems.length) {
      res.status(502).json({ error: 'Nenhuma traducao valida foi retornada pela OpenAI.' });
      return;
    }

    res.json({
      success: true,
      items: translatedItems,
      usage: payload?.usage || null,
      model: OPENAI_TEXT_MODEL
    });
  } catch (error) {
    res.status(502).json({
      error: 'Erro ao conectar com a OpenAI.',
      details: error.message
    });
  }
});

app.post('/api/r2/upload-zip', express.raw({ type: 'application/zip', limit: '50mb' }), async (req, res) => {
  const fileNameHint = typeof req.query?.name === 'string' ? req.query.name.trim() : '';
  const objectKey = safeZipObjectName(fileNameHint, `playtalk-levels-${Date.now()}.zip`);
  const zipBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || []);

  if (!isR2FluencyConfigured()) {
    res.status(503).json({ error: 'R2 nao configurado para upload.' });
    return;
  }

  if (!zipBuffer.length) {
    res.status(400).json({ error: 'Arquivo ZIP vazio.' });
    return;
  }

  try {
    await putR2Object(objectKey, zipBuffer, 'application/zip');
    res.json({
      success: true,
      objectKey,
      bucket: R2_BUCKET_NAME
    });
  } catch (error) {
    res.status(502).json({
      error: 'Falha ao enviar ZIP para o R2.',
      details: error.message
    });
  }
});

app.post('/api/r2/upload-level-files', express.json({ limit: '100mb' }), async (req, res) => {
  const dayKeyInput = typeof req.body?.day === 'string' || typeof req.body?.day === 'number'
    ? req.body.day
    : '';
  const dayKey = normalizeLevelFolderKey(dayKeyInput);
  const mode = typeof req.body?.mode === 'string' ? req.body.mode.trim() : 'flashcard';
  const files = Array.isArray(req.body?.files) ? req.body.files : [];

  if (!isR2FluencyConfigured()) {
    res.status(503).json({ error: 'R2 nao configurado para upload.' });
    return;
  }

  if (!dayKey) {
    res.status(400).json({ error: 'Pasta invalida para envio ao R2.' });
    return;
  }

  if (!files.length) {
    res.status(400).json({ error: 'Nenhum arquivo foi enviado para publicar no R2.' });
    return;
  }

  const phaseFolder = levelPhaseCodeFromMode(mode);
  const prefix = `Niveis/${dayKey}/${phaseFolder}`;

  try {
    const uploaded = [];

    for (const file of files) {
      const fileName = path.basename(typeof file?.name === 'string' ? file.name.trim() : '');
      const base64 = typeof file?.base64 === 'string' ? file.base64.trim() : '';

      if (!fileName || !base64) continue;

      const objectKey = `${prefix}/${fileName}`;
      const fileBuffer = Buffer.from(base64, 'base64');
      await putR2Object(objectKey, fileBuffer, contentTypeFromObjectKey(fileName));
      uploaded.push(objectKey);
    }

    if (!uploaded.length) {
      res.status(400).json({ error: 'Nenhum arquivo valido foi enviado para o R2.' });
      return;
    }

    res.json({
      success: true,
      bucket: R2_BUCKET_NAME,
      prefix,
      uploadedCount: uploaded.length,
      uploaded
    });
  } catch (error) {
    res.status(502).json({
      error: 'Falha ao enviar arquivos do level para o R2.',
      details: error.message
    });
  }
});

app.post('/api/admin/levels/publish-local', express.json({ limit: '100mb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);

    const dayKeyInput = typeof req.body?.day === 'string' || typeof req.body?.day === 'number'
      ? req.body.day
      : '';
    const dayKey = normalizeLevelFolderKey(dayKeyInput);
    const mode = typeof req.body?.mode === 'string' ? req.body.mode.trim() : 'flashcard';
    const files = Array.isArray(req.body?.files) ? req.body.files : [];

    if (mode !== 'flashcard') {
      res.status(400).json({ error: 'A publicacao local do admin esta liberada apenas para FlashCard.' });
      return;
    }

    if (!dayKey) {
      res.status(400).json({ error: 'Pasta invalida para publicar localmente.' });
      return;
    }

    if (!files.length) {
      res.status(400).json({ error: 'Nenhum arquivo foi enviado para publicar localmente.' });
      return;
    }

    const decodedFiles = files
      .map((file) => ({
        name: path.basename(typeof file?.name === 'string' ? file.name.trim() : ''),
        buffer: typeof file?.base64 === 'string' && file.base64.trim()
          ? Buffer.from(file.base64.trim(), 'base64')
          : null
      }))
      .filter((file) => file.name && file.buffer);

    const jsonEntry = decodedFiles.find((file) => path.extname(file.name).toLowerCase() === '.json');
    if (!jsonEntry) {
      res.status(400).json({ error: 'O bundle precisa incluir um arquivo JSON.' });
      return;
    }

    let jsonPayload = null;
    try {
      jsonPayload = JSON.parse(jsonEntry.buffer.toString('utf8'));
    } catch (error) {
      res.status(400).json({ error: 'O JSON enviado para publicacao local esta invalido.', details: error.message });
      return;
    }

    const items = getFlashcardPayloadItems(jsonPayload);
    if (!items.length) {
      res.status(400).json({ error: 'O deck enviado nao possui flashcards validos.' });
      return;
    }

    const assetRootRelativePath = path.posix.join(
      ADMIN_FLASHCARD_ASSET_RELATIVE_ROOT,
      'levels',
      `day-${dayKey}`
    );

    await removeMirroredDirectory(assetRootRelativePath);

    const assetUrlMap = new Map();
    for (const file of decodedFiles.filter((entry) => entry !== jsonEntry)) {
      const assetRelativePath = path.posix.join(assetRootRelativePath, file.name);
      await writeMirroredFile(assetRelativePath, file.buffer);
      assetUrlMap.set(file.name, buildPublicAssetUrl(assetRelativePath));
    }

    const finalPayload = {
      title: typeof jsonPayload?.title === 'string' ? jsonPayload.title.trim() : `Flashcard ${dayKey}`,
      coverImage: typeof jsonPayload?.coverImage === 'string' ? jsonPayload.coverImage.trim() : '',
      items: items
        .map((item) => {
          const imageValue = readFlashcardItemImage(item);
          const audioValue = readFlashcardItemAudio(item);
          return {
            ...item,
            imagem: resolvePublishedLevelAssetUrl(imageValue, assetUrlMap),
            audio: resolvePublishedLevelAssetUrl(audioValue, assetUrlMap)
          };
        })
        .filter((item) => item.imagem && readFlashcardItemPortuguese(item) && readFlashcardItemEnglish(item))
    };

    const deckRelativePath = `Niveis/others/day-${dayKey}.json`;
    await writeJsonToRelativePath(deckRelativePath, finalPayload);
    await refreshLocalLevelManifestMirror();
    const postgresDeck = await upsertPublicFlashcardDeckFromLevels(dayKey, finalPayload);

    res.json({
      success: true,
      deckPath: deckRelativePath,
      assetRoot: buildPublicAssetUrl(assetRootRelativePath),
      itemCount: finalPayload.items.length,
      uploadedCount: decodedFiles.length,
      postgresDeck: postgresDeck || null
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Falha ao publicar o deck localmente.',
      ...(error.instructions ? { instructions: error.instructions } : {})
    });
  }
});

app.post('/api/admin/flashcards/fill-missing-text', express.json({ limit: '2mb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);

    const cards = Array.isArray(req.body?.cards) ? req.body.cards : [];
    const basePrompt = typeof req.body?.basePrompt === 'string' ? req.body.basePrompt.trim() : '';
    const persist = req.body?.persist !== false;
    const maxChars = Math.max(6, Math.min(32, Number.parseInt(req.body?.maxChars, 10) || 32));

    if (!cards.length) {
      res.status(400).json({ error: 'Nenhum flashcard foi enviado para preencher texto.' });
      return;
    }

    const sourceMap = persist ? await loadEditableFlashcardSources(cards.filter((card) => Number.isInteger(Number.parseInt(card?.sourceIndex, 10)) && Number.parseInt(card?.sourceIndex, 10) >= 0)) : null;
    const targets = cards.map((card, index) => {
      const sourceInfo = resolveAdminFlashcardSourceInfo(card?.source);
      const sourceIndex = Number.parseInt(card?.sourceIndex, 10);

      if (!persist || !Number.isInteger(sourceIndex) || sourceIndex < 0) {
        const currentPt = clampGeneratedFlashcardText(card?.portuguese, maxChars);
        const currentEn = clampGeneratedFlashcardText(card?.english, maxChars);
        if (currentPt && currentEn) return null;
        return {
          id: typeof card?.id === 'string' && card.id.trim()
            ? card.id.trim()
            : `${sourceInfo.relativeJsonPath}#draft-${index}`,
          source: sourceInfo.relativeJsonPath,
          sourceIndex: Number.isInteger(sourceIndex) ? sourceIndex : -1,
          deckTitle: typeof card?.deckTitle === 'string' ? card.deckTitle.trim() : '',
          pt: currentPt || '',
          en: currentEn || '',
          category: typeof card?.category === 'string' ? card.category.trim() : ''
        };
      }

      const sourceEntry = sourceMap.get(sourceInfo.relativeJsonPath);
      const item = sourceEntry?.items?.[sourceIndex];
      if (!item) return null;

      const currentPt = readFlashcardItemPortuguese(item);
      const currentEn = readFlashcardItemEnglish(item);
      if (currentPt && currentEn) return null;

      return {
        id: typeof card?.id === 'string' && card.id.trim()
          ? card.id.trim()
          : `${sourceInfo.relativeJsonPath}#${sourceIndex}`,
        source: sourceInfo.relativeJsonPath,
        sourceIndex,
        deckTitle: typeof card?.deckTitle === 'string' ? card.deckTitle.trim() : '',
        pt: currentPt || '',
        en: currentEn || '',
        category: typeof card?.category === 'string' ? card.category.trim() : ''
      };
    }).filter(Boolean);

    if (!targets.length) {
      res.json({ success: true, updatedCount: 0, updated: [], failedCount: 0, failed: [] });
      return;
    }

    const contextByGroup = await buildAdminDeckContextByGroup();
    const promptTargets = targets.map((target) => {
      const sourceInfo = resolveAdminFlashcardSourceInfo(target.source);
      const groupKey = adminDeckGroupKeyFromSourceInfo(sourceInfo);
      const group = contextByGroup.get(groupKey);
      return {
        ...target,
        groupKey,
        contextDeckTitles: Array.isArray(group?.titles) ? group.titles.slice(0, 60) : []
      };
    });

    const promptContext = Object.fromEntries(
      Array.from(contextByGroup.entries()).map(([groupKey, group]) => [
        groupKey,
        {
          deckTitles: group.titles.slice(0, 60),
          existingPairs: group.samplePairs
        }
      ])
    );

    const prompt = [
      'You fill missing flashcard text pairs for Brazilian Portuguese speakers learning English.',
      'Return only valid JSON.',
      'For each flashcard, the first field is Portuguese and the second field is English.',
      `Each Portuguese and English text must have at most ${maxChars} characters, including spaces.`,
      'Keep language simple, useful, child-safe, natural, and aligned with the selected deck.',
      'Read the sibling deck context from the same deck group before creating new text.',
      'Avoid repeating any existing pair or near-duplicate idea from that same group.',
      'If one side already exists, preserve that meaning and fill only the missing counterpart.',
      'If both sides are empty, create a new pair that matches the deck title, category, optional base prompt, and sibling deck context.',
      'Do not add numbering, markdown, commentary, or emojis.',
      `Optional base prompt: ${basePrompt || 'none'}.`,
      'Output exactly this shape:',
      '{"items":[{"id":"...","pt":"...","en":"..."}]}',
      `Deck group context: ${JSON.stringify(promptContext)}`,
      `Targets: ${JSON.stringify(promptTargets)}`
    ].join('\n');

    const { payload, parsed } = await requestOpenAiJsonPayload(prompt, {
      model: OPENAI_FLASHCARD_ADMIN_TEXT_MODEL,
      maxOutputTokens: 1400
    });

    const generatedById = new Map(
      (Array.isArray(parsed?.items) ? parsed.items : [])
        .map((item) => ({
          id: typeof item?.id === 'string' ? item.id.trim() : '',
          pt: clampGeneratedFlashcardText(item?.pt, maxChars),
          en: clampGeneratedFlashcardText(item?.en, maxChars)
        }))
        .filter((item) => item.id && item.pt && item.en)
        .map((item) => [item.id, item])
    );

    const updated = [];
    const failed = [];
    const generatedPairKeys = new Set();
    for (const target of targets) {
      const generated = generatedById.get(target.id);
      if (!generated) {
        failed.push({
          id: target.id,
          source: target.source,
          sourceIndex: target.sourceIndex,
          message: 'A IA nao retornou um par valido para este container.'
        });
        continue;
      }
      const sourceInfo = resolveAdminFlashcardSourceInfo(target.source);
      const groupKey = adminDeckGroupKeyFromSourceInfo(sourceInfo);
      const groupContext = contextByGroup.get(groupKey);
      const pairKey = `${generated.pt.toLowerCase()}|||${generated.en.toLowerCase()}`;
      if (groupContext?.existingPairKeys?.has(pairKey) || generatedPairKeys.has(pairKey)) {
        failed.push({
          id: target.id,
          source: target.source,
          sourceIndex: target.sourceIndex,
          message: 'A IA sugeriu um texto repetido no mesmo grupo de decks.'
        });
        continue;
      }

      if (!persist || !Number.isInteger(target.sourceIndex) || target.sourceIndex < 0) {
        generatedPairKeys.add(pairKey);
        groupContext?.existingPairKeys?.add(pairKey);
        updated.push({
          id: target.id,
          source: target.source,
          sourceIndex: target.sourceIndex,
          pt: generated.pt,
          en: generated.en
        });
        continue;
      }

      const sourceEntry = sourceMap.get(target.source);
      const item = sourceEntry?.items?.[target.sourceIndex];
      if (!item) continue;

      const currentPt = readFlashcardItemPortuguese(item);
      const currentEn = readFlashcardItemEnglish(item);
      let changed = false;

      if (!currentPt && generated.pt) {
        setFlashcardItemPortuguese(item, generated.pt);
        changed = true;
      }
      if (!currentEn && generated.en) {
        setFlashcardItemEnglish(item, generated.en);
        changed = true;
      }

      if (changed) {
        generatedPairKeys.add(pairKey);
        groupContext?.existingPairKeys?.add(pairKey);
        updated.push({
          id: target.id,
          source: target.source,
          sourceIndex: target.sourceIndex,
          pt: readFlashcardItemPortuguese(item),
          en: readFlashcardItemEnglish(item)
        });
      }
    }

    let publishedDecks = [];
    if (persist && updated.length) {
      await persistEditableFlashcardSources(sourceMap);
      publishedDecks = await publishFlashcardSourcesToR2(
        updated
          .map((entry) => {
            try {
              return resolveAdminFlashcardSourceInfo(entry.source);
            } catch (_error) {
              return null;
            }
          })
          .filter(Boolean)
      );
    }

    res.json({
      success: true,
      updatedCount: updated.length,
      updated,
      failedCount: failed.length,
      failed,
      usage: payload?.usage || null,
      model: OPENAI_FLASHCARD_ADMIN_TEXT_MODEL,
      publishedDecks
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Falha ao preencher os textos vazios.',
      ...(error.instructions ? { instructions: error.instructions } : {})
    });
  }
});

app.post('/api/admin/flashcards/save-drafts', express.json({ limit: '2mb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);

    const updates = Array.isArray(req.body?.updates) ? req.body.updates.slice(0, 500) : [];
    const newCards = Array.isArray(req.body?.newCards) ? req.body.newCards.slice(0, 500) : [];

    const existingTargets = updates.map((entry) => ({
      source: typeof entry?.source === 'string' ? entry.source.trim() : '',
      sourceIndex: Number.parseInt(entry?.sourceIndex, 10)
    })).filter((entry) => entry.source && Number.isInteger(entry.sourceIndex) && entry.sourceIndex >= 0);

    const sourceMap = existingTargets.length ? await loadEditableFlashcardSources(existingTargets) : new Map();
    const touchedSources = new Set();
    let updatedCount = 0;
    let createdCount = 0;

    for (const entry of updates) {
      const source = typeof entry?.source === 'string' ? entry.source.trim() : '';
      const sourceIndex = Number.parseInt(entry?.sourceIndex, 10);
      if (!source || !Number.isInteger(sourceIndex) || sourceIndex < 0) continue;

      const sourceInfo = resolveAdminFlashcardSourceInfo(source);
      const sourceEntry = sourceMap.get(sourceInfo.relativeJsonPath);
      const item = sourceEntry?.items?.[sourceIndex];
      if (!item) continue;

      if (typeof entry?.portuguese === 'string') {
        setFlashcardItemPortuguese(item, clampGeneratedFlashcardText(entry.portuguese, 32));
      }
      if (typeof entry?.english === 'string') {
        setFlashcardItemEnglish(item, clampGeneratedFlashcardText(entry.english, 32));
      }

      touchedSources.add(sourceInfo.relativeJsonPath);
      updatedCount += 1;
    }

    const newCardsBySource = new Map();
    for (const entry of newCards) {
      const source = typeof entry?.source === 'string' ? entry.source.trim() : '';
      if (!source) continue;
      const sourceInfo = resolveAdminFlashcardSourceInfo(source);
      let sourceEntry = sourceMap.get(sourceInfo.relativeJsonPath);
      if (!sourceEntry) {
        const payload = await readJsonFromRelativePath(sourceInfo.relativeJsonPath);
        sourceEntry = {
          sourceInfo,
          payload,
          items: getFlashcardPayloadItems(payload)
        };
        sourceMap.set(sourceInfo.relativeJsonPath, sourceEntry);
      }

      let queued = newCardsBySource.get(sourceInfo.relativeJsonPath);
      if (!queued) {
        queued = [];
        newCardsBySource.set(sourceInfo.relativeJsonPath, queued);
      }
      queued.push(entry);
    }

    for (const [relativeJsonPath, entries] of newCardsBySource.entries()) {
      const sourceEntry = sourceMap.get(relativeJsonPath);
      if (!sourceEntry) continue;
      for (const entry of entries) {
        const item = buildEditableFlashcardItemTemplate();
        setFlashcardItemPortuguese(item, clampGeneratedFlashcardText(entry?.portuguese, 32));
        setFlashcardItemEnglish(item, clampGeneratedFlashcardText(entry?.english, 32));
        if (typeof entry?.imageUrl === 'string' && entry.imageUrl.trim()) {
          setFlashcardItemImage(item, entry.imageUrl.trim());
        }
        if (typeof entry?.category === 'string' && entry.category.trim()) {
          item.categoria = entry.category.trim();
        }
        sourceEntry.items.push(item);
        createdCount += 1;
      }
      touchedSources.add(relativeJsonPath);
    }

    let publishedDecks = [];
    if (touchedSources.size) {
      await persistEditableFlashcardSources(sourceMap);
      publishedDecks = await publishFlashcardSourcesToR2(
        Array.from(touchedSources)
          .map((relativeJsonPath) => {
            try {
              return resolveAdminFlashcardSourceInfo(relativeJsonPath);
            } catch (_error) {
              return null;
            }
          })
          .filter(Boolean)
      );
    }

    res.json({
      success: true,
      updatedCount,
      createdCount,
      publishedDecks
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Falha ao salvar os rascunhos do admin.',
      ...(error.instructions ? { instructions: error.instructions } : {})
    });
  }
});

app.post('/api/admin/flashcards/fill-missing-images', express.json({ limit: '2mb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);

    if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('fake')) {
      res.status(503).json({
        error: 'OpenAI nao configurado.',
        instructions: 'Preencha OPENAI_API_KEY no .env com a chave real da OpenAI.'
      });
      return;
    }

    const cards = Array.isArray(req.body?.cards) ? req.body.cards : [];
    const basePrompt = typeof req.body?.basePrompt === 'string' ? req.body.basePrompt.trim() : '';
    const magicMode = req.body?.magicMode === true;

    if (!cards.length) {
      res.status(400).json({ error: 'Nenhum flashcard foi enviado para preencher imagem.' });
      return;
    }
    if (!magicMode && !basePrompt) {
      res.status(400).json({ error: 'Digite um prompt no campo de texto antes de preencher imagens.' });
      return;
    }

    const sourceMap = await loadEditableFlashcardSources(cards);
    const targets = cards.map((card) => {
      const sourceInfo = resolveAdminFlashcardSourceInfo(card?.source);
      const sourceIndex = Number.parseInt(card?.sourceIndex, 10);
      const sourceEntry = sourceMap.get(sourceInfo.relativeJsonPath);
      const item = sourceEntry?.items?.[sourceIndex];
      const currentImage = readFlashcardItemImage(item);
      if (!item) return null;
      if (magicMode) {
        if (!isFlashcardMagicImageSlotValue(currentImage)) return null;
      } else if (currentImage && !isFlashcardPlaceholderImageValue(currentImage)) {
        return null;
      }
      const english = readFlashcardItemEnglish(item);
      const portuguese = readFlashcardItemPortuguese(item);
      if (!english || !portuguese) return null;

      return {
        sourceInfo,
        source: sourceInfo.relativeJsonPath,
        sourceIndex,
        deckTitle: typeof card?.deckTitle === 'string' ? card.deckTitle.trim() : '',
        english,
        portuguese
      };
    }).filter(Boolean);

    if (!targets.length) {
      res.json({ success: true, updatedCount: 0, failedCount: 0, failed: [] });
      return;
    }

    const failed = [];
    const updated = [];

    for (const target of targets) {
      try {
        const prompt = magicMode
          ? buildMagicFlashcardImagePrompt(target)
          : [
              basePrompt,
              `Portuguese: ${target.portuguese}`,
              `English: ${target.english}`
            ].filter(Boolean).join('\n');

        const upstreamResponse = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: OPENAI_FLASHCARD_ADMIN_IMAGE_MODEL,
            prompt,
            size: '1024x1024',
            quality: 'low',
            background: 'auto',
            output_format: 'webp'
          })
        });

        const responseText = await upstreamResponse.text();
        let payload = null;
        try {
          payload = responseText ? JSON.parse(responseText) : null;
        } catch (_error) {
          payload = null;
        }

        if (!upstreamResponse.ok) {
          throw new Error(payload?.error?.message || responseText.slice(0, 500) || 'Falha ao gerar imagem.');
        }

        const image = Array.isArray(payload?.data) ? payload.data[0] : null;
        const b64 = image?.b64_json;
        if (!b64) {
          throw new Error('A OpenAI nao retornou a imagem em base64.');
        }

        const assetRelativePath = buildAdminFlashcardAssetRelativePath(target.sourceInfo, target.sourceIndex, 'image', 'webp');
        await writeMirroredFile(assetRelativePath, Buffer.from(b64, 'base64'));

        const sourceEntry = sourceMap.get(target.source);
        const item = sourceEntry?.items?.[target.sourceIndex];
        const currentImage = readFlashcardItemImage(item);
        if (!item) continue;
        if (magicMode) {
          if (!isFlashcardMagicImageSlotValue(currentImage)) continue;
        } else if (currentImage && !isFlashcardPlaceholderImageValue(currentImage)) {
          continue;
        }

        setFlashcardItemImage(item, buildPublicAssetUrl(assetRelativePath));
        updated.push({
          source: target.source,
          sourceIndex: target.sourceIndex,
          imageUrl: readFlashcardItemImage(item)
        });
      } catch (error) {
        failed.push({
          source: target.source,
          sourceIndex: target.sourceIndex,
          message: error.message || 'Falha ao gerar imagem.'
        });
      }
    }

    let publishedDecks = [];
    if (updated.length) {
      await persistEditableFlashcardSources(sourceMap);
      publishedDecks = await publishFlashcardSourcesToR2(
        updated
          .map((entry) => {
            try {
              return resolveAdminFlashcardSourceInfo(entry.source);
            } catch (_error) {
              return null;
            }
          })
          .filter(Boolean)
      );
    }

    res.json({
      success: true,
      updatedCount: updated.length,
      updated,
      failedCount: failed.length,
      failed,
      model: OPENAI_FLASHCARD_ADMIN_IMAGE_MODEL,
      publishedDecks
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Falha ao preencher as imagens vazias.',
      ...(error.instructions ? { instructions: error.instructions } : {})
    });
  }
});

app.post('/api/admin/flashcards/fill-missing-audio', express.json({ limit: '2mb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);

    if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY.includes('fake') || !ELEVENLABS_VOICE_ID_HARRY || ELEVENLABS_VOICE_ID_HARRY.includes('fake')) {
      res.status(503).json({
        error: 'ElevenLabs nao configurado.',
        instructions: 'Preencha ELEVENLABS_API_KEY e ELEVENLABS_VOICE_ID_HARRY no .env com os valores reais.'
      });
      return;
    }

    const cards = Array.isArray(req.body?.cards) ? req.body.cards : [];
    if (!cards.length) {
      res.status(400).json({ error: 'Nenhum flashcard foi enviado para preencher audio.' });
      return;
    }

    const sourceMap = await loadEditableFlashcardSources(cards);
    const targets = cards.map((card) => {
      const sourceInfo = resolveAdminFlashcardSourceInfo(card?.source);
      const sourceIndex = Number.parseInt(card?.sourceIndex, 10);
      const sourceEntry = sourceMap.get(sourceInfo.relativeJsonPath);
      const item = sourceEntry?.items?.[sourceIndex];
      if (!item || readFlashcardItemAudio(item)) return null;

      const english = readFlashcardItemEnglish(item);
      const portuguese = readFlashcardItemPortuguese(item);
      const text = english || portuguese;
      if (!text) return null;

      return {
        sourceInfo,
        source: sourceInfo.relativeJsonPath,
        sourceIndex,
        text,
        languageCode: english ? 'en' : 'pt'
      };
    }).filter(Boolean);

    if (!targets.length) {
      res.json({ success: true, updatedCount: 0, failedCount: 0, failed: [] });
      return;
    }

    const failed = [];
    const updated = [];

    for (const target of targets) {
      try {
        const upstreamResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(ELEVENLABS_VOICE_ID_HARRY)}`, {
          method: 'POST',
          headers: {
            Accept: 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text: target.text,
            model_id: ELEVENLABS_MODEL_ID,
            language_code: target.languageCode,
            output_format: 'mp3_44100_128'
          })
        });

        if (!upstreamResponse.ok) {
          const errorText = await upstreamResponse.text();
          throw new Error(errorText.slice(0, 500) || 'Falha ao gerar audio na ElevenLabs.');
        }

        const audioBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
        const assetRelativePath = buildAdminFlashcardAssetRelativePath(target.sourceInfo, target.sourceIndex, 'audio', 'mp3');
        await writeMirroredFile(assetRelativePath, audioBuffer);

        const sourceEntry = sourceMap.get(target.source);
        const item = sourceEntry?.items?.[target.sourceIndex];
        if (!item || readFlashcardItemAudio(item)) continue;

        setFlashcardItemAudio(item, buildPublicAssetUrl(assetRelativePath));
        updated.push({
          source: target.source,
          sourceIndex: target.sourceIndex,
          audioUrl: readFlashcardItemAudio(item)
        });
      } catch (error) {
        failed.push({
          source: target.source,
          sourceIndex: target.sourceIndex,
          message: error.message || 'Falha ao gerar audio.'
        });
      }
    }

    let publishedDecks = [];
    if (updated.length) {
      await persistEditableFlashcardSources(sourceMap);
      publishedDecks = await publishFlashcardSourcesToR2(
        updated
          .map((entry) => {
            try {
              return resolveAdminFlashcardSourceInfo(entry.source);
            } catch (_error) {
              return null;
            }
          })
          .filter(Boolean)
      );
    }

    res.json({
      success: true,
      updatedCount: updated.length,
      updated,
      failedCount: failed.length,
      failed,
      publishedDecks
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Falha ao preencher os audios vazios.',
      ...(error.instructions ? { instructions: error.instructions } : {})
    });
  }
});

app.post('/api/admin/flashcards/update-card', express.json({ limit: '1mb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);

    const source = typeof req.body?.source === 'string' ? req.body.source.trim() : '';
    const sourceIndex = Number.parseInt(req.body?.sourceIndex, 10);
    if (!source || !Number.isInteger(sourceIndex) || sourceIndex < 0) {
      res.status(400).json({ error: 'Flashcard do admin invalido.' });
      return;
    }

    const sourceMap = await loadEditableFlashcardSources([{ source, sourceIndex }]);
    const sourceInfo = resolveAdminFlashcardSourceInfo(source);
    const sourceEntry = sourceMap.get(sourceInfo.relativeJsonPath);
    const item = sourceEntry?.items?.[sourceIndex];
    if (!item) {
      res.status(404).json({ error: 'Flashcard nao encontrado.' });
      return;
    }

    if (typeof req.body?.english === 'string') {
      setFlashcardItemEnglish(item, clampGeneratedFlashcardText(req.body.english, 32));
    }
    if (typeof req.body?.portuguese === 'string') {
      setFlashcardItemPortuguese(item, clampGeneratedFlashcardText(req.body.portuguese, 32));
    }

    await persistEditableFlashcardSources(sourceMap);
    const publishedDecks = await publishFlashcardSourcesToR2([sourceInfo]);
    res.json({
      success: true,
      english: readFlashcardItemEnglish(item),
      portuguese: readFlashcardItemPortuguese(item),
      publishedDecks
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Falha ao atualizar o flashcard.',
      ...(error.instructions ? { instructions: error.instructions } : {})
    });
  }
});

app.post('/api/admin/flashcards/delete-asset', express.json({ limit: '1mb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);

    const source = typeof req.body?.source === 'string' ? req.body.source.trim() : '';
    const sourceIndex = Number.parseInt(req.body?.sourceIndex, 10);
    const kind = typeof req.body?.kind === 'string' ? req.body.kind.trim().toLowerCase() : '';
    if (!source || !Number.isInteger(sourceIndex) || sourceIndex < 0 || !['image', 'audio'].includes(kind)) {
      res.status(400).json({ error: 'Solicitacao de exclusao invalida.' });
      return;
    }

    const sourceMap = await loadEditableFlashcardSources([{ source, sourceIndex }]);
    const sourceInfo = resolveAdminFlashcardSourceInfo(source);
    const sourceEntry = sourceMap.get(sourceInfo.relativeJsonPath);
    const item = sourceEntry?.items?.[sourceIndex];
    if (!item) {
      res.status(404).json({ error: 'Flashcard nao encontrado.' });
      return;
    }

    if (kind === 'image') {
      setFlashcardItemImage(item, getFlashcardPlaceholderImageUrl());
    } else {
      setFlashcardItemAudio(item, '');
    }

    await persistEditableFlashcardSources(sourceMap);
    const publishedDecks = await publishFlashcardSourcesToR2([sourceInfo]);
    res.json({ success: true, publishedDecks });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Falha ao apagar o asset.',
      ...(error.instructions ? { instructions: error.instructions } : {})
    });
  }
});

app.post('/api/admin/flashcards/delete-card', express.json({ limit: '1mb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);

    const source = typeof req.body?.source === 'string' ? req.body.source.trim() : '';
    const sourceIndex = Number.parseInt(req.body?.sourceIndex, 10);
    if (!source || !Number.isInteger(sourceIndex) || sourceIndex < 0) {
      res.status(400).json({ error: 'Flashcard do admin invalido.' });
      return;
    }

    const sourceMap = await loadEditableFlashcardSources([{ source, sourceIndex }]);
    const sourceInfo = resolveAdminFlashcardSourceInfo(source);
    const sourceEntry = sourceMap.get(sourceInfo.relativeJsonPath);
    if (!sourceEntry?.items?.[sourceIndex]) {
      res.status(404).json({ error: 'Flashcard nao encontrado.' });
      return;
    }

    sourceEntry.items.splice(sourceIndex, 1);
    await persistEditableFlashcardSources(sourceMap);
    const publishedDecks = await publishFlashcardSourcesToR2([sourceInfo]);
    res.json({ success: true, publishedDecks });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Falha ao apagar o flashcard.',
      ...(error.instructions ? { instructions: error.instructions } : {})
    });
  }
});

app.post('/api/admin/flashcards/add-slot', express.json({ limit: '1mb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);

    const source = typeof req.body?.source === 'string' ? req.body.source.trim() : '';
    const count = Math.max(1, Math.min(100, Number.parseInt(req.body?.count, 10) || 1));
    if (!source) {
      res.status(400).json({ error: 'Origem do deck nao informada.' });
      return;
    }

    const sourceInfo = resolveAdminFlashcardSourceInfo(source);
    const payload = await readJsonFromRelativePath(sourceInfo.relativeJsonPath);
    const items = getFlashcardPayloadItems(payload);
    for (let index = 0; index < count; index += 1) {
      items.push(buildEditableFlashcardItemTemplate());
    }
    await writeJsonToRelativePath(sourceInfo.relativeJsonPath, payload);
    if (sourceInfo.type === 'local-level') {
      await refreshLocalLevelManifestMirror();
    }
    const publishedDecks = await publishFlashcardSourcesToR2([sourceInfo]);

    res.json({ success: true, addedCount: count, sourceIndex: items.length - 1, publishedDecks });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Falha ao adicionar slot vazio.',
      ...(error.instructions ? { instructions: error.instructions } : {})
    });
  }
});

app.post('/api/admin/flashcards/create-deck', express.json({ limit: '1mb' }), async (req, res) => {
  try {
    await requireAdminUserFromRequest(req);

    const deckTitle = typeof req.body?.deckTitle === 'string' ? req.body.deckTitle.trim() : '';
    const coverImage = typeof req.body?.coverImage === 'string' ? req.body.coverImage.trim() : '';
    const parsedSlotCount = Number.parseInt(req.body?.slotCount, 10);
    const slotCount = Number.isInteger(parsedSlotCount)
      ? Math.max(0, Math.min(100, parsedSlotCount))
      : 0;
    if (!deckTitle) {
      res.status(400).json({ error: 'Informe o nome do deck.' });
      return;
    }

    const baseName = safeGeneratedBase(deckTitle, 'novo-deck');
    const fileName = `${baseName}.json`;
    const relativeJsonPath = path.posix.join(FLASHCARD_DATA_RELATIVE_ROOT, baseName, 'json', fileName);
    const payload = createEditableFlashcardDeckPayload(deckTitle, coverImage, slotCount);

    await writeJsonToRelativePath(relativeJsonPath, payload);
    await refreshFlashcardManifestMirror();
    const sourceInfo = resolveAdminFlashcardSourceInfo(relativeJsonPath);
    const publishedDecks = await publishFlashcardSourcesToR2([sourceInfo]);

    res.json({
      success: true,
      source: relativeJsonPath,
      fileName,
      title: payload.title,
      coverImage: payload.coverImage,
      slotCount,
      publishedDecks
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Falha ao criar o deck.',
      ...(error.instructions ? { instructions: error.instructions } : {})
    });
  }
});

app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.endsWith('.html')) {
    res.status(404).send('Página não encontrada.');
    return;
  }
  next();
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Serving static content from ${staticDir}`);
    console.log(`Server running on port ${PORT}`);
    logDatabaseConnectionStatus();
  });
}

module.exports = app;



