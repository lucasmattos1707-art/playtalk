'use strict';

const crypto = require('node:crypto');

function fail(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

function words(value) {
  return String(value || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[’']/g, '').match(/[\p{L}\p{N}]+/gu) || [];
}

// Word error rate counts missing, changed AND extra words, preserving their order.
function accuracy(expected, spoken) {
  const a = words(expected), b = words(spoken);
  if (!a.length || !b.length) return 0;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = row;
  }
  return Math.max(0, Math.round(100 * (1 - previous[b.length] / a.length)));
}

const assetIdPattern = /^[a-f0-9]{64}$/;
const stepIdPattern = /^[a-zA-Z0-9_-]{1,80}$/;
const TEXT_SIZE_RANGES = Object.freeze({
  micro: Object.freeze({ label: 'Micro', min: 80, max: 150 }),
  small: Object.freeze({ label: 'Pequeno', min: 151, max: 200 }),
  medium: Object.freeze({ label: 'Médio', min: 201, max: 300 }),
  large: Object.freeze({ label: 'Grande', min: 301, max: 400 }),
  legacy: Object.freeze({ label: 'Formato anterior', min: 150, max: 180 })
});

function normalizeTextSize(value) {
  const key = String(value || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(TEXT_SIZE_RANGES, key) ? key : 'small';
}

function textSizeRange(value) {
  const key = normalizeTextSize(value);
  return { key, ...TEXT_SIZE_RANGES[key] };
}

function characterCount(value) {
  return Array.from(String(value || '').trim()).length;
}

function normalizeSteps(input) {
  if (!Array.isArray(input) || input.length > 200) throw fail('A jornada aceita até 200 etapas.');
  const ids = new Set();
  return input.map((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw fail('Etapa inválida.');
    const id = String(raw.id || '');
    if (!stepIdPattern.test(id) || ids.has(id)) throw fail('Identificador de etapa inválido ou duplicado.');
    ids.add(id);
    if (!['tutorial', 'interactive', 'phase1'].includes(raw.type)) throw fail('Tipo de etapa inválido.');
    const title = String(raw.title || '').trim();
    if (!title || title.length > 160) throw fail('Defina um título de até 160 caracteres.');
    const step = { id, type: raw.type, title, points: raw.type === 'tutorial' ? 0 : Number(raw.points ?? 100) };
    if (!Number.isInteger(step.points) || step.points < 0 || step.points > 1000) throw fail('A pontuação deve ficar entre 0 e 1000.');
    if (raw.type === 'interactive') {
      step.textSize = raw.textSize ? normalizeTextSize(raw.textSize) : 'legacy';
      step.portuguese = String(raw.portuguese || '').trim();
      step.english = String(raw.english || '').trim();
      const range = textSizeRange(step.textSize);
      for (const text of [step.portuguese, step.english]) {
        if (characterCount(text) < range.min || characterCount(text) > range.max) {
          throw fail(`Os textos em português e inglês devem ter de ${range.min} a ${range.max} caracteres cada.`);
        }
      }
    }
    if (raw.type !== 'phase1') {
      step.audioAsset = String(raw.audioAsset || '');
      if (!assetIdPattern.test(step.audioAsset)) throw fail('Adicione o áudio desta etapa.');
    }
    if (raw.type === 'tutorial') {
      step.imageAsset = String(raw.imageAsset || '');
      if (!assetIdPattern.test(step.imageAsset)) throw fail('Adicione a imagem do tutorial.');
    }
    if (raw.type === 'phase1') {
      step.level = Number(raw.level || 1);
      step.cards = Number(raw.cards || 1);
      step.explorerMode = Number(raw.explorerMode || 1);
      if (!Number.isInteger(step.level) || step.level < 1 || step.level > 10000) throw fail('Nível inválido.');
      if (!Number.isInteger(step.cards) || step.cards < 1 || step.cards > 25) throw fail('Escolha de 1 a 25 cartas para a fase 1.');
      if (!Number.isInteger(step.explorerMode) || step.explorerMode < 1 || step.explorerMode > 6) throw fail('Escolha um dos seis modos do Explorador.');
    }
    // Title and points edits/reordering preserve learning progress; content edits reset only this step.
    step.version = crypto.createHash('sha256').update(JSON.stringify({ ...step, title: undefined, points: undefined })).digest('hex');
    return step;
  });
}

function progressFor(plan, rows) {
  const steps = plan.steps.map(step => {
    const row = rows.find(r => r.step_id === step.id && r.version === step.version);
    return {
      id: step.id,
      stage: Number(row?.stage || 0),
      accuracy: Number(row?.accuracy || 0),
      plays: Number(row?.play_count || 0),
      completed: Boolean(row?.completed)
    };
  });
  const first = steps.findIndex(s => !s.completed);
  return { steps, currentIndex: first < 0 ? steps.length : first, points: rows.reduce((sum, r) => sum + Number(r.points || 0), 0) };
}

function assertAction(step, progress, action) {
  const stage = Number(progress?.stage || 0);
  if (step.type === 'tutorial' && action === 'tutorial') return;
  if (step.type === 'phase1' && action === 'phase1') return;
  if (step.type === 'interactive') {
    if (action === 'listenPt' && stage === 0) return;
    if (action === 'listenEn' && stage === 1) return;
    if (action === 'speak' && stage >= 2) return;
  }
  throw fail('Conclua as atividades na ordem: ouvir em português, ouvir em inglês e falar.', 409);
}

function installJourneyPlan(app, deps) {
  const { pool, authenticate, authorizeAdmin, generateText, generateHarryAudio, transcribe, validateImage } = deps;
  let schemaPromise;
  async function ensureSchema() {
    if (!pool) throw fail('Banco de dados indisponível.', 503);
    if (!schemaPromise) {
      schemaPromise = pool.query(`
        CREATE TABLE IF NOT EXISTS public.journey_course_plan (
          id integer PRIMARY KEY CHECK (id = 1), revision integer NOT NULL DEFAULT 0,
          steps jsonb NOT NULL DEFAULT '[]', updated_at timestamptz NOT NULL DEFAULT now()
        );
        INSERT INTO public.journey_course_plan(id) VALUES (1) ON CONFLICT DO NOTHING;
        CREATE TABLE IF NOT EXISTS public.journey_course_assets (
          id text PRIMARY KEY, mime text NOT NULL, data bytea NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS public.user_journey_course_progress (
          user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          step_id text NOT NULL, version text NOT NULL, stage integer NOT NULL DEFAULT 0,
          accuracy integer NOT NULL DEFAULT 0, completed boolean NOT NULL DEFAULT false,
          play_count integer NOT NULL DEFAULT 0,
          points integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY(user_id, step_id, version)
        );
        ALTER TABLE public.user_journey_course_progress
          ADD COLUMN IF NOT EXISTS play_count integer NOT NULL DEFAULT 0;
      `).catch(error => { schemaPromise = null; throw error; });
    }
    await schemaPromise;
  }
  const route = handler => async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      await handler(req, res);
    } catch (error) {
      const status = Number(error.statusCode) || 500;
      if (status >= 500) console.warn('[journey]', error.message);
      res.status(status).json({ success: false, error: status === 500 ? 'Não foi possível carregar a jornada.' : error.message });
    }
  };
  async function requireUser(req) {
    const user = await authenticate(req);
    if (!user?.id) throw fail('Entre na sua conta para iniciar a jornada.', 401);
    return user;
  }
  async function planFrom(db = pool, lock = '') {
    const result = await db.query(`SELECT revision, steps FROM public.journey_course_plan WHERE id=1 ${lock}`);
    return result.rows[0];
  }
  async function userProgress(userId, db = pool) {
    return (await db.query('SELECT * FROM public.user_journey_course_progress WHERE user_id=$1', [userId])).rows;
  }
  async function saveAsset(buffer, mime) {
    if (!buffer.length) throw fail('Arquivo vazio.');
    const id = crypto.createHash('sha256').update(mime).update(buffer).digest('hex');
    await pool.query('INSERT INTO public.journey_course_assets(id,mime,data) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [id, mime, buffer]);
    return id;
  }
  function parseRecording(value) {
    const match = /^data:audio\/ogg(?:;codecs=opus)?;base64,([A-Za-z0-9+/=]+)$/.exec(String(value || ''));
    if (!match || match[1].length > 16 * 1024 * 1024) throw fail('Envie uma gravação Ogg de até 12 MB.');
    const buffer = Buffer.from(match[1], 'base64');
    if (buffer.toString('ascii', 0, 4) !== 'OggS' || !buffer.includes(Buffer.from('OpusHead'))) throw fail('Gravação Ogg Opus inválida.');
    return buffer;
  }
  async function evaluateRecording(value, english) {
    // Voice is processed in memory only; it NEVER enters a database, object store or log.
    const buffer = parseRecording(value);
    const transcript = await transcribe(buffer);
    const score = accuracy(english, transcript);
    return { transcript, accuracy: score, passed: score >= 70 };
  }

  app.get('/api/journey', route(async (req, res) => {
    const user = await requireUser(req);
    await ensureSchema();
    const plan = await planFrom();
    res.json({ success: true, plan, progress: progressFor(plan, await userProgress(user.id)) });
  }));
  app.get('/api/admin/journey', route(async (req, res) => {
    await authorizeAdmin(req);
    await ensureSchema();
    res.json({ success: true, plan: await planFrom() });
  }));
  app.put('/api/admin/journey', route(async (req, res) => {
    await authorizeAdmin(req);
    const steps = normalizeSteps(req.body?.steps);
    await ensureSchema();
    const ids = [...new Set(steps.flatMap(s => [s.audioAsset, s.imageAsset]).filter(Boolean))];
    const assets = ids.length ? await pool.query(`SELECT id,mime FROM public.journey_course_assets WHERE id IN (${ids.map((_, i) => '$' + (i + 1)).join(',')})`, ids) : { rows: [] };
    for (const step of steps) {
      if (step.audioAsset && !assets.rows.some(a => a.id === step.audioAsset && a.mime.startsWith('audio/'))) throw fail('Áudio da etapa não encontrado.');
      if (step.imageAsset && !assets.rows.some(a => a.id === step.imageAsset && a.mime.startsWith('image/'))) throw fail('Imagem da etapa não encontrada.');
    }
    const result = await pool.query(`UPDATE public.journey_course_plan SET steps=$1::jsonb, revision=revision+1, updated_at=now()
      WHERE id=1 AND revision=$2 RETURNING revision,steps`, [JSON.stringify(steps), Number(req.body?.revision)]);
    if (!result.rows.length) throw fail('A jornada mudou em outra aba. Recarregue antes de salvar.', 409);
    res.json({ success: true, plan: result.rows[0] });
  }));
  app.post('/api/admin/journey/assets', route(async (req, res) => {
    await authorizeAdmin(req);
    const match = /^data:(image\/(?:png|jpeg|webp)|audio\/(?:mpeg|ogg|wav));base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.dataUrl || ''));
    if (!match) throw fail('Use imagem PNG, JPG ou WebP, ou áudio MP3, Ogg ou WAV.');
    const buffer = Buffer.from(match[2], 'base64'), mime = match[1];
    if (buffer.length > (mime.startsWith('image/') ? 6 : 12) * 1024 * 1024) throw fail('Arquivo muito grande. Imagem: até 6 MB; áudio: até 12 MB.');
    if (mime.startsWith('image/')) await validateImage(buffer, mime);
    else if (!((mime === 'audio/mpeg' && (buffer.toString('ascii', 0, 3) === 'ID3' || (buffer[0] === 255 && (buffer[1] & 224) === 224)))
      || (mime === 'audio/ogg' && buffer.toString('ascii', 0, 4) === 'OggS')
      || (mime === 'audio/wav' && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE'))) throw fail('Formato de áudio inválido.');
    await ensureSchema();
    res.json({ success: true, assetId: await saveAsset(buffer, mime) });
  }));
  app.get('/api/journey/assets/:id', route(async (req, res) => {
    await requireUser(req);
    if (!assetIdPattern.test(req.params.id)) throw fail('Arquivo inválido.');
    await ensureSchema();
    const row = (await pool.query('SELECT mime,data FROM public.journey_course_assets WHERE id=$1', [req.params.id])).rows[0];
    if (!row) throw fail('Arquivo não encontrado.', 404);
    res.setHeader('Content-Type', row.mime);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(row.data);
  }));
  app.post('/api/admin/journey/generate', route(async (req, res) => {
    await authorizeAdmin(req);
    const topic = String(req.body?.topic || '').trim().slice(0, 600);
    if (!topic) throw fail('Descreva o assunto do texto.');
    const range = textSizeRange(req.body?.textSize);
    const generated = await generateText(topic, range);
    const title = String(generated.title || '').trim().slice(0, 160);
    const portuguese = String(generated.portuguese || '').trim(), english = String(generated.english || '').trim();
    if (!title) throw fail('O gerador não retornou um título. Tente novamente.', 502);
    if ([portuguese, english].some(t => characterCount(t) < range.min || characterCount(t) > range.max)) {
      throw fail(`O gerador não retornou textos com ${range.min} a ${range.max} caracteres. Tente novamente.`, 502);
    }
    const audio = await generateHarryAudio(english);
    await ensureSchema();
    res.json({ success: true, title, textSize: range.key, portuguese, english, audioAsset: await saveAsset(audio, 'audio/mpeg') });
  }));
  app.post('/api/admin/journey/preview/evaluate', route(async (req, res) => {
    await authorizeAdmin(req);
    const english = String(req.body?.english || '').trim();
    const range = textSizeRange(req.body?.textSize);
    if (characterCount(english) < range.min || characterCount(english) > range.max) throw fail('Texto inválido.');
    res.json({ success: true, ...await evaluateRecording(req.body?.audioDataUrl, english) });
  }));
  app.post('/api/journey/steps/:id/action', route(async (req, res) => {
    const user = await requireUser(req);
    await ensureSchema();
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      await db.query('SELECT pg_advisory_xact_lock($1,$2)', [74631, user.id]);
      const plan = await planFrom(db, 'FOR SHARE');
      if (Number(req.body?.revision) !== plan.revision) throw fail('A jornada foi atualizada. Feche e abra o Play novamente.', 409);
      const rows = await userProgress(user.id, db), state = progressFor(plan, rows);
      const requested = plan.steps.find(s => s.id === req.params.id);
      const requestedIndex = plan.steps.findIndex(s => s.id === req.params.id);
      const existing = rows.find(r => r.step_id === requested?.id && r.version === requested?.version);
      const isUnlocked = requestedIndex >= 0 && requestedIndex <= state.currentIndex;
      if (!requested || !isUnlocked) throw fail('Conclua a etapa atual antes de avançar.', 409);
      if (req.body?.action === 'start') {
        const plays = Number(existing?.play_count || 0) + 1;
        await db.query(`INSERT INTO public.user_journey_course_progress(user_id,step_id,version,stage,accuracy,completed,play_count,points)
          VALUES($1,$2,$3,0,$4,$5,$6,$7) ON CONFLICT(user_id,step_id,version) DO UPDATE SET
          stage=0,play_count=EXCLUDED.play_count,updated_at=now()`,
        [user.id, requested.id, requested.version, Number(existing?.accuracy || 0), Boolean(existing?.completed), plays, Number(existing?.points || 0)]);
        const updated = progressFor(plan, await userProgress(user.id, db));
        await db.query('COMMIT');
        res.json({ success: true, stage: 0, completed: Boolean(existing?.completed), progress: updated, earnedPoints: 0 });
        return;
      }
      assertAction(requested, existing, req.body?.action);
      let result = {}, stage = Number(existing?.stage || 0), completed = Boolean(existing?.completed), score = Number(existing?.accuracy || 0);
      if (req.body.action === 'speak') {
        result = await evaluateRecording(req.body.audioDataUrl, requested.english);
        score = Math.max(score, result.accuracy);
        if (result.passed) { stage = 3; completed = true; }
      } else if (requested.type === 'interactive') stage++;
      else { stage = 3; completed = true; }
      const points = completed ? Math.max(Number(existing?.points || 0), requested.points) : 0;
      await db.query(`INSERT INTO public.user_journey_course_progress(user_id,step_id,version,stage,accuracy,completed,play_count,points)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(user_id,step_id,version) DO UPDATE SET
        stage=EXCLUDED.stage,accuracy=EXCLUDED.accuracy,completed=EXCLUDED.completed,play_count=EXCLUDED.play_count,points=EXCLUDED.points,updated_at=now()`,
      [user.id, requested.id, requested.version, stage, score, completed, Number(existing?.play_count || 0), points]);
      const updated = progressFor(plan, await userProgress(user.id, db));
      await db.query('COMMIT');
      res.json({ success: true, ...result, stage, completed, progress: updated, earnedPoints: points - Number(existing?.points || 0) });
    } catch (error) { await db.query('ROLLBACK'); throw error; }
    finally { db.release(); }
  }));

  app.get(['/journeyplan', '/journeyplan/', '/journeyplan.html'], route(async (req, res) => {
    await requireUser(req);
    res.sendFile(deps.pagePath);
  }));
}

module.exports = { installJourneyPlan, normalizeSteps, accuracy, progressFor, assertAction, textSizeRange, TEXT_SIZE_RANGES };
