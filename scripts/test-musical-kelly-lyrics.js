'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'www', 'musical-kelly', 'index.html'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'www', 'musical-kelly', 'app.js'), 'utf8');
const serviceWorkerSource = fs.readFileSync(path.join(root, 'www', 'musical-kelly', 'sw.js'), 'utf8');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

function projectPayload(canEdit) {
  return {
    success: true,
    canEdit,
    canContribute: true,
    canComment: true,
    canApprove: true,
    canDeleteComments: canEdit,
    canReorder: canEdit,
    unreadCardIds: [],
    characters: [{
      id: 'char-dorothy',
      name: 'Dorothy',
      imageUrl: '/api/musical-kelly/characters/char-dorothy/image'
    }],
    project: {
      version: 1,
      updatedAt: '2026-09-22T00:00:00.000Z',
      cards: [{
        id: 'cue-test',
        title: 'Dorothy encontra o Leão',
        audio: null,
        image: null,
        comments: [],
        lyrics: {
          mode: 'timesync',
          source: 'ai',
          lines: [
            { id: 'line-1', speaker: 'Dorothy', characterId: 'char-dorothy', text: 'Não tenha medo.', start: 1, end: 3 },
            { id: 'line-2', speaker: '', characterId: '', text: 'Eu estou com você.', start: 3, end: 5 }
          ]
        }
      }]
    }
  };
}

async function boot(canEdit) {
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://fluentlevelup.com/musical-kelly/'
  });
  const { window } = dom;
  window.CSS = window.CSS || {};
  window.CSS.escape = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  window.requestAnimationFrame = () => 1;
  window.cancelAnimationFrame = () => {};
  window.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => projectPayload(canEdit)
  });
  window.eval(appSource);
  await new Promise((resolve) => setTimeout(resolve, 30));
  return dom;
}

test('viewer opens the fullscreen lyrics from the document icon', async () => {
  const dom = await boot(false);
  const { document } = dom.window;
  const button = document.querySelector('.lyrics-button');
  assert.ok(button, 'document icon should exist in every card');
  button.click();
  assert.equal(document.getElementById('lyricsScreen').hidden, false);
  assert.equal(document.body.classList.contains('lyrics-open'), true);
  assert.deepEqual(
    [...document.querySelectorAll('.lyric-line .lyric-copy > span')].map((node) => node.textContent),
    ['Não tenha medo.', 'Eu estou com você.']
  );
  assert.equal(document.getElementById('lyricsEditButton').hidden, true);
  assert.equal(document.querySelector('.comment-button').hidden, true);
  assert.match(document.querySelector('.lyric-character-avatar').style.backgroundImage, /char-dorothy/);
  dom.window.close();
});

test('admin can open editor and character context menu', async () => {
  const dom = await boot(true);
  const { document, MouseEvent } = dom.window;
  document.querySelector('.lyrics-button').click();
  document.getElementById('lyricsEditButton').click();
  assert.equal(document.getElementById('lyricsAdminPanel').hidden, false);
  assert.ok(document.getElementById('lyricsManualSyncButton'));
  assert.ok(document.getElementById('lyricsClearTimesyncButton'));
  assert.equal(document.getElementById('manualSyncPanel').hidden, true);
  assert.equal(document.getElementById('lyricsClearTimesyncButton').hidden, false);
  assert.match(document.getElementById('lyricsEditor').value, /^Dorothy: Não tenha medo\./);
  assert.equal(document.querySelector('.comment-button').hidden, false);
  document.querySelector('.lyric-line').dispatchEvent(new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: 120,
    clientY: 120
  }));
  assert.equal(document.getElementById('characterMenu').hidden, false);
  assert.match(document.getElementById('characterMenu').textContent, /Dorothy/);
  assert.match(document.getElementById('characterMenu').textContent, /Adicionar personagem/);
  dom.window.close();
});

test('server keeps AI, admin and storage boundaries explicit', () => {
  assert.match(serverSource, /MUSICAL_KELLY_LYRICS_MODEL[\s\S]*gpt-5\.6-luna/);
  assert.match(serverSource, /v1\/audio\/transcriptions/);
  assert.match(serverSource, /timestamp_granularities\[\]/);
  assert.match(serverSource, /app\.post\('\/api\/musical-kelly\/cards\/:cardId\/lyrics\/generate'/);
  assert.match(serverSource, /app\.put\('\/api\/musical-kelly\/cards\/:cardId\/lyrics'/);
  assert.match(serverSource, /app\.put\('\/api\/musical-kelly\/cards\/:cardId\/lyrics\/timesync'/);
  assert.match(serverSource, /app\.delete\('\/api\/musical-kelly\/cards\/:cardId\/lyrics\/timesync'/);
  assert.match(serverSource, /app\.get\('\/api\/musical-kelly\/cards\/:cardId\/audio'/);
  assert.match(serverSource, /Otherwise return an empty speaker/);
  assert.match(serverSource, /requireAdminUserFromRequest\(req\)/);
  assert.match(serverSource, /CREATE TABLE IF NOT EXISTS public\.musical_kelly_characters/);
  assert.match(serverSource, /\$\{musicalKellyGlobalRoot\(\)\}\/characters/);
  assert.match(appSource, /fadeCurrentVoice\(1, 1500\)/);
  assert.match(appSource, /Number\(line\.start\) - 3/);
  assert.match(appSource, /Number\(line\.end\) \+ 3/);
  assert.match(appSource, /event\.key === 'ArrowDown'/);
  assert.match(appSource, /function advanceManualSync\(\)/);
  assert.match(appSource, /function changeLyricsTrack\(direction\)/);
  assert.match(appSource, /playRequestGeneration/);
  assert.match(appSource, /state\.autoAdvance = \{ fromVoice: voice, nextVoice: null, timer \}/);
  assert.match(appSource, /startManualSyncR2Audio\(card\)/);
  assert.match(appSource, /forceNetwork: true, sourceUrl: manualSyncAudioUrl\(card\)/);
  assert.match(appSource, /O R2 não confirmou o novo timesync/);
  assert.match(appSource, /function cacheCharacterImages\(\)/);
  assert.match(appSource, /state\.characters\.map\(async \(character\)/);
  assert.match(appSource, /cache\.put\(request, response\.clone\(\)\)/);
  assert.match(appSource, /window\.addEventListener\('online'[\s\S]*cacheCharacterImages\(\)/);
  assert.match(serviceWorkerSource, /url\.pathname\.startsWith\('\/api\/musical-kelly\/characters\/'\)/);
  assert.match(serviceWorkerSource, /serveCharacterImage\(request\)/);
  assert.doesNotMatch(html, /id="lyricsCharacterLabel"/);
  assert.match(html, /aria-label="Faixa anterior"/);
  assert.match(html, /aria-label="Próxima faixa"/);
});
