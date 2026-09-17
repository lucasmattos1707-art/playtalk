'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { accuracy, normalizeSteps, progressFor } = require('../lib/journey-plan');
const { createFixture, english, portuguese } = require('./journey-test-fixture');
const asset = 'a'.repeat(64);
const step = { id: 'speak', type: 'interactive', title: 'Test', english, portuguese, audioAsset: asset, points: 100 };
const ogg = 'data:audio/ogg;base64,' + Buffer.from('OggS' + '\0'.repeat(30) + 'OpusHead').toString('base64');
const turn = () => new Promise(resolve => setImmediate(resolve));

test('accuracy preserves order, penalizes omissions and extra words, and accepts case/punctuation', () => {
  assert.equal(accuracy('Hello, my FRIEND!', 'hello my friend'), 100);
  assert.equal(accuracy('one two three four five six seven eight nine ten', 'one two three four five six seven'), 70);
  assert.equal(accuracy('one two three four five six seven eight nine ten', 'one two three four five six'), 60);
  assert.equal(accuracy('one two', 'one two three four'), 0);
  assert.equal(accuracy('one two three', 'three two one'), 33);
  assert.equal(accuracy(english, ''), 0);
});
test('step validation enforces text length, unique IDs, asset types and phase limits', () => {
  assert.equal(normalizeSteps([step])[0].english, english);
  for (const input of [[null], [step, step], [{ ...step, english: 'short' }], [{ ...step, english: 'a'.repeat(181) }], [{ ...step, points: -1 }], [{ ...step, audioAsset: 'https://evil.example' }]]) {
    assert.throws(() => normalizeSteps(input));
  }
  assert.throws(() => normalizeSteps([{ id: 'x', title: 'x', type: 'phase1', cards: 26 }]));
});
test('reordering and title edits preserve progress; changing learning content resets only the changed step', () => {
  const a = normalizeSteps([step])[0];
  const renamed = normalizeSteps([{ ...step, title: 'New title', points: 50 }])[0];
  assert.equal(a.version, renamed.version);
  const b = normalizeSteps([{ ...step, english: english.replace('birds', 'songs') }])[0];
  assert.notEqual(a.version, b.version);
  assert.equal(progressFor({ steps: [renamed] }, [{ step_id: a.id, version: a.version, stage: 3, completed: true, points: 100 }]).currentIndex, 1);
  assert.equal(progressFor({ steps: [b] }, [{ step_id: a.id, version: a.version, stage: 3, completed: true, points: 100 }]).currentIndex, 0);
});
test('every authoring endpoint and page rejects anonymous and normal users', async () => {
  const fixture = await createFixture();
  try {
    for (const [route, method] of [['/api/admin/journey', 'GET'], ['/api/admin/journey', 'PUT'], ['/api/admin/journey/assets', 'POST'], ['/api/admin/journey/generate', 'POST'], ['/api/admin/journey/preview/evaluate', 'POST'], ['/journeyplan', 'GET'], ['/journeyplan.html', 'GET']]) {
      assert.equal((await fixture.call(route, method, {}, '')).response.status, 401, route);
      assert.equal((await fixture.call(route, method, {}, 'user')).response.status, 403, route);
    }
    assert.equal((await fixture.call('/api/journey', 'GET', null, '')).response.status, 401);
    assert.equal(fixture.counters.generated, 0);
  } finally { await fixture.close(); }
});
test('course persistence, strict step/action order, 70% pass threshold and one-time points', async () => {
  const fixture = await createFixture();
  try {
    const seeded = await fixture.seed(); assert.equal(seeded.response.status, 200, JSON.stringify(seeded.payload));
    const revision = seeded.payload.plan.revision;
    const action = (id, action, extra = {}) => fixture.call(`/api/journey/steps/${id}/action`, 'POST', { revision, action, ...extra }, 'user');
    assert.equal((await action('morning', 'listenPt')).response.status, 409);
    assert.equal((await action('welcome', 'tutorial')).response.status, 200);
    assert.equal((await action('morning', 'speak', { audioDataUrl: ogg })).response.status, 409);
    assert.equal(fixture.counters.spoken, 0);
    assert.equal((await action('morning', 'listenEn')).response.status, 409);
    assert.equal((await action('morning', 'listenPt')).payload.stage, 1);
    assert.equal((await action('morning', 'listenPt')).response.status, 409);
    assert.equal((await action('morning', 'listenEn')).payload.stage, 2);
    fixture.deps.transcript = 'wrong words';
    const failed = await action('morning', 'speak', { audioDataUrl: ogg });
    assert.equal(failed.payload.passed, false); assert.equal(failed.payload.stage, 2); assert.equal(failed.payload.progress.currentIndex, 1);
    assert.equal((await action('cards', 'phase1')).response.status, 409);
    assert.equal((await action('morning', 'speak', { audioDataUrl: ogg.replace('audio/ogg', 'audio/webm') })).response.status, 400);
    fixture.deps.transcript = english;
    const passed = await action('morning', 'speak', { audioDataUrl: ogg });
    assert.equal(passed.payload.accuracy, 100); assert.equal(passed.payload.passed, true);
    assert.equal(passed.payload.earnedPoints, 100); assert.equal(passed.payload.progress.currentIndex, 2);
    const retry = await action('morning', 'speak', { audioDataUrl: ogg });
    assert.equal(retry.payload.earnedPoints, 0); assert.equal(retry.payload.progress.points, 100);
    assert.equal((await action('cards', 'phase1')).payload.progress.points, 200);
    const loaded = await fixture.call('/api/journey', 'GET', null, 'user');
    assert.equal(loaded.payload.progress.currentIndex, 3);
    const rows = (await fixture.pool.query('SELECT * FROM public.user_journey_course_progress')).rows;
    assert.equal(rows.some(row => Object.keys(row).some(key => /audio|recording|blob|transcript/i.test(key))), false);
  } finally { await fixture.close(); }
});
test('stale edits and submissions are rejected; preview scores never alter student progress', async () => {
  const fixture = await createFixture();
  try {
    const seeded = await fixture.seed(); const plan = seeded.payload.plan;
    assert.equal((await fixture.call('/api/admin/journey', 'PUT', { revision: 0, steps: plan.steps })).response.status, 409);
    assert.equal((await fixture.call('/api/journey/steps/welcome/action', 'POST', { revision: 0, action: 'tutorial' }, 'user')).response.status, 409);
    const preview = await fixture.call('/api/admin/journey/preview/evaluate', 'POST', { english, audioDataUrl: ogg });
    assert.equal(preview.payload.passed, true);
    assert.equal((await fixture.pool.query('SELECT * FROM public.user_journey_course_progress')).rows.length, 0);
    assert.equal((await fixture.call('/api/admin/journey/assets', 'POST', { dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' })).response.status, 400);
  } finally { await fixture.close(); }
});

function uiHarness() {
  const dom = new JSDOM('<!DOCTYPE html><body><main><button id="play">Jogar</button></main></body>', { url: 'http://localhost:3187/play', runScripts: 'outside-only' });
  const { window } = dom;
  const revoked = [], uploads = [], captures = [];
  let serial = 0, pass = true;
  window.URL.createObjectURL = () => `blob:local-${++serial}`; window.URL.revokeObjectURL = url => revoked.push(url);
  window.HTMLMediaElement.prototype.load = function () {};
  window.HTMLMediaElement.prototype.play = async function () {};
  window.HTMLMediaElement.prototype.pause = function () {};
  window.PlaytalkApi = { url: value => value, authHeaders: extra => extra || {} };
  window.navigator.mediaDevices = { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) };
  window.AudioContext = class {
    resume() { return Promise.resolve(); } close() { return Promise.resolve(); }
    createMediaStreamSource() { return { context: this, connect() {}, disconnect() {} }; }
    createAnalyser() { return { fftSize: 0, getFloatTimeDomainData(values) { values.fill(.05); } }; }
  };
  window.Recorder = class {
    constructor(config) { this.config = config; this.pauses = 0; this.resumes = 0; captures.push(this); }
    async start() {} pause() { this.pauses++; } resume() { this.resumes++; } close() { this.closed = true; }
    stop() { this.ondataavailable(new Uint8Array(Buffer.from('OggS\0OpusHead'))); }
  };
  const steps = normalizeSteps([step]), progress = { steps: [{ id: step.id, stage: 0 }], currentIndex: 0, points: 0 };
  window.fetch = async (url, options = {}) => {
    if (url.startsWith('/api/journey/assets/')) return { ok: true, blob: async () => new window.Blob(['original'], { type: 'audio/mpeg' }) };
    if (url === '/api/journey') return { ok: true, json: async () => ({ success: true, plan: { revision: 1, steps }, progress }) };
    const body = JSON.parse(options.body || '{}'); uploads.push(body);
    if (body.action === 'listenPt') progress.steps[0].stage = 1;
    if (body.action === 'listenEn') progress.steps[0].stage = 2;
    if (body.action === 'speak' && pass) { progress.steps[0].stage = 3; progress.currentIndex = 1; progress.points = 100; }
    return { ok: true, json: async () => ({ success: true, progress, accuracy: pass ? 100 : 20, passed: pass, transcript: pass ? english : 'wrong words', earnedPoints: pass ? 100 : 0 }) };
  };
  window.eval(fs.readFileSync(path.join(__dirname, '../www/js/journey-player.js'), 'utf8'));
  const click = async label => { const node = [...window.document.querySelectorAll('button')].find(n => n.getAttribute('aria-label') === label || n.textContent === label); assert.ok(node, label); node.click(); await turn(); await turn(); };
  const endAudio = async () => { window.document.querySelector('.journey-modal > audio').dispatchEvent(new window.Event('ended')); await turn(); await turn(); };
  return { window, dom, uploads, captures, revoked, click, endAudio, fail() { pass = false; }, pass() { pass = true; } };
}
test('player locks icons in order and submits ONLY after explicit send; pause/resume keeps one Ogg recording', async () => {
  const h = uiHarness();
  try {
    await h.window.PlaytalkJourney.tryStart();
    let buttons = h.window.document.querySelectorAll('.journey-icon-button');
    assert.equal(buttons[0].disabled, false); assert.equal(buttons[1].disabled, true); assert.equal(buttons[2].disabled, true);
    await h.click('Ouvir com texto em português'); await h.endAudio();
    assert.equal(buttons[0].classList.contains('is-complete'), true); assert.equal(buttons[1].disabled, false); assert.equal(buttons[2].disabled, true);
    await h.click('Ouvir com texto em inglês'); await h.endAudio();
    assert.equal(buttons[2].disabled, false);
    await h.click('Ler e falar em inglês'); await h.click('Ler e falar em inglês');
    assert.equal(h.window.document.querySelector('.journey-actions').hidden, false);
    assert.equal(h.uploads.some(x => x.action === 'speak'), false);
    await h.click('Continuar gravação'); assert.equal(h.captures.length, 1); assert.equal(h.captures[0].resumes, 1);
    await h.click('Ler e falar em inglês'); await h.click('Enviar Texto');
    // FileReader is asynchronous in jsdom.
    for (let i = 0; i < 15 && !h.window.document.querySelector('.journey-score'); i++) await turn();
    assert.equal(h.window.document.querySelector('.journey-score')?.textContent, '100%');
    assert.match(h.uploads.find(x => x.action === 'speak').audioDataUrl, /^data:audio\/ogg;base64,/);
    assert.equal(h.window.document.querySelectorAll('.journey-comparison audio').length, 2);
    assert.equal(h.revoked.length, 0);
    await h.click('Avançar'); assert.ok(h.revoked.length >= 2); assert.equal(h.window.document.querySelectorAll('.journey-comparison audio').length, 0);
  } finally { h.window.PlaytalkJourney.close(); h.dom.window.close(); }
});
test('failed speech offers retry only; retry and close revoke voice URLs and release the recorder', async () => {
  const h = uiHarness(); h.fail();
  try {
    await h.window.PlaytalkJourney.tryStart();
    await h.click('Ouvir com texto em português'); await h.endAudio(); await h.click('Ouvir com texto em inglês'); await h.endAudio();
    await h.click('Ler e falar em inglês'); await h.click('Ler e falar em inglês'); await h.click('Enviar Texto');
    for (let i = 0; i < 15 && !h.window.document.querySelector('.journey-score'); i++) await turn();
    assert.equal([...h.window.document.querySelectorAll('button')].some(b => b.textContent === 'Avançar'), false);
    await h.click('Tentar de novo'); assert.ok(h.revoked.length >= 2);
    await h.click('Ler e falar em inglês'); await h.click('Fechar');
    assert.equal(h.captures.at(-1).closed, true);
    assert.equal(h.window.document.querySelector('.journey-modal'), null);
    assert.equal(h.window.document.querySelector('main').inert, undefined);
  } finally { h.window.PlaytalkJourney.close(); h.dom.window.close(); }
});
