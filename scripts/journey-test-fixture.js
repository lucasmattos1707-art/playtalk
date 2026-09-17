'use strict';
const path = require('node:path');
const express = require('express');
const sharp = require('sharp');
const { newDb, DataType } = require('pg-mem');
const { installJourneyPlan } = require('../lib/journey-plan');

const english = 'Every morning, I open my window and listen to the birds. Then I make a cup of tea, read a short story, and get ready to learn something new with my friends today.';
const portuguese = 'Toda manhã, abro a janela e escuto os pássaros. Depois preparo uma xícara de chá, leio uma história curta e me preparo para aprender algo novo com meus amigos hoje.';
function wav() {
  const samples = 8000, buffer = Buffer.alloc(44 + samples * 2);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(16000, 24); buffer.writeUInt32LE(32000, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(Math.sin(i / 16000 * 2 * Math.PI * 440) * 1200), 44 + i * 2);
  return buffer;
}
async function createFixture(options = {}) {
  const memory = newDb();
  memory.public.registerFunction({ name: 'pg_advisory_xact_lock', args: [DataType.integer, DataType.integer], returns: DataType.integer, implementation: () => 1 });
  memory.public.none('CREATE TABLE public.users(id integer PRIMARY KEY); INSERT INTO public.users VALUES(1),(2);');
  const { Pool } = memory.adapters.createPg();
  const pool = new Pool(), app = express();
  const fixtureAssets = new Map();
  app.use(express.json({ limit: '20mb' }));
  app.get('/journeyplan', (req, res, next) => {
    if (req.query.fixture !== '1') return next();
    const html = require('node:fs').readFileSync(path.join(__dirname, '../www/journeyplan.html'), 'utf8')
      .replace('<script src="js/android-config.js"></script><script src="js/api-config.js"></script><script src="js/android-shell.js"></script>',
        '<script>window.PlaytalkApi={url:path=>path,authHeaders:headers=>headers||{}};</script>');
    res.type('html').send(html);
  });
  app.get('/api/journey/assets/:id', (req, res, next) => {
    const stored = fixtureAssets.get(req.params.id);
    if (!stored) return next();
    if (!['admin', 'user'].includes(req.headers['x-test-role'] || (options.defaultAdmin ? 'admin' : ''))) return res.status(401).json({ success: false, error: 'Entre na sua conta.' });
    res.type(stored.mime).send(stored.data);
  });
  const counters = { generated: 0, spoken: 0 };
  const deps = {
    pool, pagePath: path.join(__dirname, '../www/journeyplan.html'),
    authenticate: async req => {
      const role = req.headers['x-test-role'] || (options.defaultAdmin ? 'admin' : '');
      return role === 'admin' ? { id: 1, admin: true } : role === 'user' ? { id: 2 } : null;
    },
    authorizeAdmin: async req => {
      const user = await deps.authenticate(req);
      if (!user) throw Object.assign(new Error('Sessão expirada.'), { statusCode: 401 });
      if (!user.admin) throw Object.assign(new Error('Acesso restrito ao administrador.'), { statusCode: 403 });
      return user;
    },
    validateImage: async buffer => { await sharp(buffer).metadata(); },
    generateText: async (_topic, range = { min: 151 }) => {
      counters.generated++;
      const length = Math.max(1, Number(range.min) || 151);
      return { title: 'Rotina da manhã', portuguese: 'p'.repeat(length), english: 'e'.repeat(length) };
    },
    generateHarryAudio: async () => wav(),
    transcribe: async () => { counters.spoken++; return deps.transcript; },
    transcript: english
  };
  installJourneyPlan(app, deps);
  app.use(express.static(path.join(__dirname, '../www')));
  const server = app.listen(options.port || 0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  async function call(route, method = 'GET', body, role = 'admin') {
    const response = await fetch(origin + route, { method, headers: { 'Content-Type': 'application/json', ...(role ? { 'x-test-role': role } : {}) }, ...(body && method !== 'GET' ? { body: JSON.stringify(body) } : {}) });
    const payload = await response.json().catch(() => null);
    return { response, payload };
  }
  async function seed() {
    await call('/api/admin/journey');
    const image = await sharp({ create: { width: 240, height: 240, channels: 4, background: '#62dded' } }).png().toBuffer();
    const picture = (await call('/api/admin/journey/assets', 'POST', { dataUrl: 'data:image/png;base64,' + image.toString('base64') })).payload.assetId;
    fixtureAssets.set(picture, { mime: 'image/png', data: image });
    const audioData = wav();
    const audio = (await call('/api/admin/journey/assets', 'POST', { dataUrl: 'data:audio/wav;base64,' + audioData.toString('base64') })).payload.assetId;
    fixtureAssets.set(audio, { mime: 'audio/wav', data: audioData });
    return call('/api/admin/journey', 'PUT', { revision: 0, steps: [
      { id: 'welcome', type: 'tutorial', title: 'Sua jornada começa aqui', audioAsset: audio, imageAsset: picture, points: 0 },
      { id: 'morning', type: 'interactive', title: 'Uma nova manhã', textSize: 'small', portuguese, english, audioAsset: audio, points: 100 },
      { id: 'cards', type: 'phase1', title: 'Vamos para a fase 1', level: 1, cards: 1, explorerMode: 1, points: 100 }
    ] });
  }
  return { app, pool, deps, counters, origin, call, seed, close: async () => { await new Promise(resolve => server.close(resolve)); await pool.end(); } };
}
if (require.main === module) {
  createFixture({ defaultAdmin: true, port: 3187 }).then(async fixture => {
    const result = await fixture.seed();
    if (!result.payload?.success) throw new Error(JSON.stringify(result.payload));
    console.log(`Journey UI fixture (isolated in-memory database): ${fixture.origin}/journeyplan`);
  }).catch(error => { console.error(error); process.exitCode = 1; });
}
module.exports = { createFixture, english, portuguese, wav };
