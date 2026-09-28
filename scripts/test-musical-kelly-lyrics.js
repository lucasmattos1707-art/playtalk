'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const {
  buildGroundedMusicalKellyLines,
  filterMusicalKellyTranscriptionSegments
} = require('../lib/musical-kelly-transcription');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'www', 'musical-kelly', 'index.html'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'www', 'musical-kelly', 'app.js'), 'utf8');
const stylesSource = fs.readFileSync(path.join(root, 'www', 'musical-kelly', 'styles.css'), 'utf8');
const serviceWorkerSource = fs.readFileSync(path.join(root, 'www', 'musical-kelly', 'sw.js'), 'utf8');
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

function projectPayload(canEdit, { withAudio = false, withSecondTrack = false, withComments = false } = {}) {
  const cards = [{
    id: 'cue-test',
    title: 'Dorothy encontra o Leão',
    audio: withAudio ? {
      fileName: 'dorothy-leao.mp3',
      name: 'dorothy-leao.mp3',
      url: '/api/musical-kelly/assets/audio/dorothy-leao.mp3'
    } : null,
    image: withAudio ? {
      fileName: 'dorothy-leao.webp',
      name: 'dorothy-leao.webp',
      url: '/api/musical-kelly/assets/image/dorothy-leao.webp'
    } : null,
    comments: withComments ? [{
      id: 'comment-main',
      ownerId: 'person-another',
      authorName: 'Maria',
      title: 'Entrada mais suave',
      text: 'A entrada da música precisa ficar um pouco mais suave.',
      createdAt: '2026-09-23T12:00:00.000Z',
      updatedAt: '',
      replies: [{
        id: 'reply-main',
        ownerId: 'person-another',
        authorName: 'João',
        title: 'Resposta sobre a entrada',
        text: 'Concordo, principalmente no primeiro compasso.',
        createdAt: '2026-09-23T13:00:00.000Z',
        updatedAt: ''
      }]
    }] : [],
    lyrics: {
      mode: 'timesync',
      source: 'ai',
      lines: [
        { id: 'line-1', speaker: 'Dorothy', characterId: 'char-dorothy', text: 'Não tenha medo.', start: 1, end: 3 },
        { id: 'line-2', speaker: '', characterId: '', text: 'Eu estou com você.', start: 3, end: 5 }
      ]
    }
  }];
  if (withSecondTrack) {
    cards.push({
      id: 'cue-next',
      title: 'Siga o Tijolo Amarelo',
      audio: {
        fileName: 'tijolo-amarelo.mp3',
        name: 'tijolo-amarelo.mp3',
        url: '/api/musical-kelly/assets/audio/tijolo-amarelo.mp3'
      },
      image: {
        fileName: 'tijolo-amarelo.webp',
        name: 'tijolo-amarelo.webp',
        url: '/api/musical-kelly/assets/image/tijolo-amarelo.webp'
      },
      comments: [],
      lyrics: { mode: 'plain', source: 'admin', lines: [] }
    });
  }
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
      cards
    }
  };
}

async function boot(canEdit, options = {}) {
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: options.pageUrl || 'https://fluentlevelup.com/musical-kelly/'
  });
  const { window } = dom;
  if (options.appConfig) window.MUSICAL_KELLY_CONFIG = options.appConfig;
  window.CSS = window.CSS || {};
  window.CSS.escape = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  window.requestAnimationFrame = () => 1;
  window.cancelAnimationFrame = () => {};
  window.fetch = async (input, init = {}) => {
    if (Array.isArray(options.fetchUrls)) options.fetchUrls.push(String(input));
    const customPayload = typeof options.fetchResponder === 'function'
      ? await options.fetchResponder(String(input), init)
      : undefined;
    const responsePayload = customPayload === undefined
      ? (options.payload || projectPayload(canEdit, options))
      : customPayload;
    return ({
      ok: responsePayload?.success !== false,
      status: responsePayload?.success === false ? 400 : 200,
      json: async () => responsePayload
    });
  };
  window.caches = {
    open: async () => ({
      match: async () => null,
      put: async () => {}
    })
  };
  if (typeof options.beforeEval === 'function') options.beforeEval(window);
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
  assert.equal(document.getElementById('lyricsScreenTitle').textContent, 'Faixa 1 de 1');
  assert.match(document.querySelector('.lyrics-track-heading').textContent, /Toque no texto que quiser/);
  assert.equal(document.getElementById('lyricsTrackLabelTitle').textContent, 'Dorothy encontra o Leão');
  assert.equal(document.getElementById('playerBar'), null);
  assert.deepEqual(
    [...document.querySelectorAll('.lyric-line .lyric-copy > span')].map((node) => node.textContent),
    ['Não tenha medo.', 'Eu estou com você.']
  );
  assert.equal(document.getElementById('lyricsEditButton').hidden, true);
  assert.equal(document.getElementById('lyricsLanguageToggle').hidden, true);
  assert.equal(document.querySelector('.comment-button').hidden, false);
  assert.match(document.querySelector('.lyric-character-avatar img').src, /char-dorothy/);
  dom.window.close();
});

test('anonymous viewer opens main comments, detail and replies before choosing a name', async () => {
  const dom = await boot(false, { withComments: true, withAudio: true });
  const { document, Event } = dom.window;
  const commentButton = document.querySelector('.comment-button');
  assert.equal(commentButton.hidden, false);
  assert.equal(commentButton.querySelector('.comment-count').textContent, '2');
  assert.equal(commentButton.classList.contains('has-unseen-comments'), true);
  commentButton.click();
  assert.equal(document.getElementById('commentsDialog').hasAttribute('open'), true);
  assert.equal(document.getElementById('commentsDialogTitle').textContent, 'Faixa 1');
  assert.doesNotMatch(document.getElementById('commentsDialog').textContent, /Dorothy encontra o Leão/);
  assert.ok(document.querySelector('.comments-heading-icon svg'));
  assert.equal(document.getElementById('commenterIdentity').hidden, true);
  assert.equal(document.querySelector('.comment-notification strong').textContent, 'Entrada mais suave');
  assert.equal(document.querySelector('.comment-preview').textContent, 'A entrada da música ...');
  assert.match(document.querySelector('.comment-user-line').textContent, /Maria/);
  assert.equal(document.querySelector('.comment-button').classList.contains('has-unseen-comments'), false);
  document.querySelector('.comment-notification').click();
  assert.equal(document.getElementById('commentDetailDialog').hasAttribute('open'), true);
  assert.match(document.getElementById('commentDetailText').textContent, /mais suave/);
  assert.match(document.getElementById('commentReplies').textContent, /primeiro compasso/);
  document.getElementById('openReplyComposer').click();
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(document.getElementById('commenterNameDialog').hasAttribute('open'), true);
  assert.equal(document.getElementById('commenterNameDialogTitle').textContent, 'Coloque seu nome para comentar');
  document.getElementById('commenterNameInput').value = 'Lucas';
  document.getElementById('commenterNameForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(document.getElementById('commentComposerDialog').hasAttribute('open'), true);
  assert.equal(document.getElementById('commenterIdentity').hidden, false);
  assert.equal(document.getElementById('commenterIdentityText').textContent, 'Lucas');
  assert.doesNotMatch(document.getElementById('commenterIdentityText').textContent, /Comentando como/);
  dom.window.close();
});

test('tapping a track that is not downloaded opens the friendly single-track modal', async () => {
  const dom = await boot(false, { withAudio: true });
  const { document, MouseEvent } = dom.window;
  document.querySelector('.track-card').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 10));
  const dialog = document.getElementById('downloadPromptDialog');
  assert.equal(document.querySelector('.track-card').classList.contains('has-image'), true);
  assert.match(document.querySelector('.track-background').style.backgroundImage, /dorothy-leao\.webp/);
  assert.equal(document.querySelector('.track-title-text').textContent, '');
  assert.equal(dialog.hasAttribute('open'), true);
  assert.equal(document.getElementById('downloadPromptTitle').textContent, 'Baixe essa faixa de áudio para ensaiar');
  assert.match(document.getElementById('downloadPromptCopy').textContent, /áudio, o rótulo da faixa e as imagens dos personagens usados/);
  assert.equal(document.getElementById('confirmTrackDownloadLabel').textContent, 'Download');
  assert.match(document.getElementById('downloadPromptCopy').textContent, /Faixa 1/);
  assert.doesNotMatch(document.getElementById('downloadPromptCopy').textContent, /Dorothy encontra o Leão/);
  assert.equal(document.getElementById('lyricsScreen').hidden, true);
  dom.window.close();
});

test('advancing to a track that is not downloaded opens its download modal', async () => {
  const dom = await boot(false, { withAudio: true, withSecondTrack: true });
  const { document, getComputedStyle } = dom.window;
  document.querySelector('.lyrics-button').click();
  assert.equal(document.getElementById('lyricsScreenTitle').textContent, 'Faixa 1 de 2');
  document.getElementById('lyricsNextTrackButton').click();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(document.getElementById('downloadPromptDialog').hasAttribute('open'), true);
  assert.match(document.getElementById('downloadPromptCopy').textContent, /Faixa 2/);
  assert.doesNotMatch(document.getElementById('downloadPromptCopy').textContent, /Siga o Tijolo Amarelo/);
  assert.equal(document.getElementById('lyricsScreenTitle').textContent, 'Faixa 1 de 2');
  assert.equal(getComputedStyle(document.getElementById('downloadPromptDialog')).visibility, 'visible');
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

test('admin manages characters directly from the header dialog', async () => {
  const dom = await boot(true);
  const { document } = dom.window;
  document.querySelector('.lyrics-button').click();
  document.getElementById('lyricsCharacterSwitch').click();
  assert.equal(document.getElementById('characterDialog').hasAttribute('open'), true);
  assert.equal(document.getElementById('characterAddToggle').hidden, false);
  assert.match(document.getElementById('characterGrid').textContent, /Dorothy/);
  const editButton = document.querySelector('.character-edit-button');
  assert.ok(editButton);
  editButton.click();
  assert.equal(document.getElementById('characterNameInput').value, 'Dorothy');
  assert.equal(document.getElementById('characterImageLabel').textContent, 'Manter foto atual');
  assert.equal(document.getElementById('characterDeleteButton').hidden, false);
  assert.equal(document.getElementById('characterSaveButton').textContent, 'Salvar alterações');
  dom.window.close();
});

test('public character menu is limited to the current track and exposes AI speaker profiles', async () => {
  const payload = projectPayload(false, { withSecondTrack: true });
  const fetchUrls = [];
  payload.characters.push({ id: 'char-unused', name: 'Scarecrow', imageUrl: '/api/musical-kelly/characters/char-unused/image' });
  payload.project.cards[0].lyrics.lines[1].speaker = 'Lion';
  payload.project.cards[0].lyrics.lines[1].start = 3;
  payload.project.cards[0].lyrics.lines[1].end = 5;
  const dom = await boot(false, {
    pageUrl: 'https://fluentlevelup.com/englishtraining/',
    appConfig: { appSlug: 'englishtraining', appPath: '/englishtraining', apiRoot: '/api/englishtraining' },
    payload,
    fetchUrls,
    fetchResponder: (url) => url.includes('/ai-characters?') ? ({
      success: true,
      characters: [...payload.characters, { id: 'char-ai-lion', name: 'Aslan', imageUrl: '', isAiGenerated: true }],
      project: {
        ...payload.project,
        cards: payload.project.cards.map((card) => card.id === 'cue-test' ? {
          ...card,
          lyrics: { ...card.lyrics, lines: card.lyrics.lines.map((line) => line.id === 'line-2' ? { ...line, speaker: 'Aslan', characterId: 'char-ai-lion' } : line) }
        } : card)
      }
    }) : undefined
  });
  const { document } = dom.window;
  document.querySelector('.lyrics-button').click();
  document.getElementById('lyricsCharacterSwitch').click();
  const grid = document.getElementById('characterGrid');
  assert.match(grid.textContent, /Dorothy/);
  assert.match(grid.textContent, /Lion/);
  assert.doesNotMatch(grid.textContent, /Scarecrow/);
  const lionCard = [...grid.querySelectorAll('.character-card')].find((card) => /Lion/.test(card.textContent));
  assert.ok(lionCard);
  assert.ok(lionCard.querySelector('.is-ai-profile-action'));
  lionCard.querySelector('.is-ai-profile-action').click();
  assert.equal(document.getElementById('characterNameInput').value, 'Lion');
  assert.equal(document.getElementById('characterImageLabel').textContent, 'Adicionar foto PNG');
  assert.equal(document.getElementById('characterSaveButton').textContent, 'Salvar para todos');
  document.getElementById('characterNameInput').value = 'Aslan';
  document.getElementById('characterAddForm').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.ok(fetchUrls.some((url) => url.includes('/api/englishtraining/cards/cue-test/ai-characters?name=Aslan&speaker=Lion')));
  assert.equal(document.getElementById('characterDialog').textContent.includes('Escolha um personagem'), true);
  dom.window.close();
});

test('admin opens audio and image upload menu with right click on a container', async () => {
  const dom = await boot(true, { withAudio: true });
  const { document, MouseEvent } = dom.window;
  let audioPickerOpened = false;
  let imagePickerOpened = false;
  let downloadedAudio = null;
  document.getElementById('audioInput').addEventListener('click', () => { audioPickerOpened = true; });
  document.getElementById('imageInput').addEventListener('click', () => { imagePickerOpened = true; });
  dom.window.HTMLAnchorElement.prototype.click = function clickDownloadAnchor() {
    downloadedAudio = { href: this.getAttribute('href'), download: this.getAttribute('download') };
  };

  document.querySelector('.track-card').dispatchEvent(new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: 180,
    clientY: 120
  }));
  const menu = document.getElementById('containerUploadMenu');
  assert.equal(menu.hidden, false);
  assert.match(menu.textContent, /Enviar áudio/);
  assert.match(menu.textContent, /Enviar imagem/);
  assert.match(menu.textContent, /Baixar áudio/);
  assert.equal(document.querySelector('.track-card').classList.contains('is-selected'), true);
  document.getElementById('containerUploadImage').click();
  assert.equal(imagePickerOpened, true);
  assert.equal(menu.hidden, true);

  document.querySelector('.track-card').dispatchEvent(new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: 180,
    clientY: 120
  }));
  document.getElementById('containerUploadAudio').click();
  assert.equal(audioPickerOpened, true);
  assert.equal(menu.hidden, true);

  document.querySelector('.track-card').dispatchEvent(new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: 180,
    clientY: 120
  }));
  document.getElementById('containerDownloadAudio').click();
  assert.deepEqual(downloadedAudio, {
    href: '/api/musical-kelly/assets/audio/dorothy-leao.mp3',
    download: 'dorothy-leao.mp3'
  });
  assert.equal(menu.hidden, true);
  dom.window.close();
});

test('viewer does not receive the admin upload menu on right click', async () => {
  const dom = await boot(false, { withAudio: true });
  const { document, MouseEvent } = dom.window;
  document.querySelector('.track-card').dispatchEvent(new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: 180,
    clientY: 120
  }));
  assert.equal(document.getElementById('containerUploadMenu').hidden, true);
  dom.window.close();
});

test('server keeps AI, admin and storage boundaries explicit', () => {
  assert.match(serverSource, /MUSICAL_KELLY_LYRICS_MODEL[\s\S]*gpt-5\.6-luna/);
  assert.match(serverSource, /const ENGLISH_TRAINING_TRANSLATION_MODEL = 'gpt-5\.6-luna'/);
  assert.match(serverSource, /app\.post\('\/api\/englishtraining\/cards\/:cardId\/lyrics\/portuguese'/);
  assert.match(serverSource, /name: 'english_training_portuguese_lyrics'/);
  assert.match(serverSource, /textPt: String\(entry\?\.textPt/);
  assert.match(serverSource, /musical_kelly_comment_title/);
  assert.match(serverSource, /app\.post\(musicalKellyApiPaths\('\/cards\/:cardId\/comments\/:commentId\/replies'\)/);
  assert.match(serverSource, /app\.patch\(musicalKellyApiPaths\('\/cards\/:cardId\/comments\/:commentId'\)/);
  assert.doesNotMatch(serverSource, /generateMusicalKellyCardImage/);
  assert.match(serverSource, /v1\/audio\/transcriptions/);
  assert.match(serverSource, /timestamp_granularities\[\]/);
  assert.match(serverSource, /filterMusicalKellyTranscriptionSegments/);
  assert.match(serverSource, /Instrumental and silent gaps are intentionally absent/);
  assert.match(serverSource, /buildGroundedMusicalKellyLines/);
  assert.match(serverSource, /app\.post\(musicalKellyApiPaths\('\/cards\/:cardId\/lyrics\/generate'\)/);
  assert.match(serverSource, /app\.put\(musicalKellyApiPaths\('\/cards\/:cardId\/lyrics'\)/);
  assert.match(serverSource, /app\.put\(musicalKellyApiPaths\('\/cards\/:cardId\/lyrics\/timesync'\)/);
  assert.match(serverSource, /app\.delete\(musicalKellyApiPaths\('\/cards\/:cardId\/lyrics\/timesync'\)/);
  assert.match(serverSource, /app\.get\(musicalKellyApiPaths\('\/cards\/:cardId\/audio'\)/);
  assert.match(serverSource, /every speaker must be an empty string/);
  assert.match(serverSource, /invent a short plausible name and reuse it consistently/);
  assert.match(serverSource, /Existing characters in this workspace/);
  assert.match(serverSource, /ADD COLUMN IF NOT EXISTS is_ai_generated boolean NOT NULL DEFAULT false/);
  assert.match(serverSource, /ensureAiGeneratedMusicalKellyCharacters\(aiSpeakers\)/);
  assert.match(serverSource, /app\.post\(\s*musicalKellyApiPaths\('\/cards\/:cardId\/ai-characters'\)/);
  assert.match(serverSource, /is_ai_generated !== true/);
  assert.match(appSource, /function hasSpecificPovCharacter\(\)/);
  assert.match(appSource, /hasSpecificPovCharacter\(\)/);
  assert.match(stylesSource, /body\.englishtraining-page \.lyrics-player\s*\{\s*display: none;/);
  assert.match(appSource, /Math\.min\(100, realScore \+ 10\)/);
  assert.match(appSource, /realScore > 95[\s\S]*'diamante'[\s\S]*'ouro'[\s\S]*'platina'[\s\S]*'white'/);
  assert.match(stylesSource, /pronunciation-score__fill \{[\s\S]*z-index: 1;[\s\S]*background-color: var\(--score-color/);
  assert.match(stylesSource, /lyric-character-avatar \{[\s\S]*z-index: 2;/);
  for (const seal of ['platina', 'ouro', 'diamante', 'white']) {
    assert.equal(fs.existsSync(path.join(root, 'www', 'medalhas', `${seal}.png`)), true);
  }
  assert.match(serverSource, /requireAdminUserFromRequest\(req\)/);
  assert.match(serverSource, /CREATE TABLE IF NOT EXISTS public\.\$\{workspace\.characterTable\}/);
  assert.match(serverSource, /INSERT INTO public\.\$\{workspace\.characterTable\}/);
  assert.doesNotMatch(serverSource, /INSERT INTO public\.musical_kelly_characters/);
  assert.match(serverSource, /app\.patch\([\s\S]*musicalKellyApiPaths\('\/characters\/:characterId'\)/);
  assert.match(serverSource, /app\.delete\(musicalKellyApiPaths\('\/characters\/:characterId'\)/);
  assert.match(serverSource, /\$\{musicalKellyGlobalRoot\(\)\}\/characters/);
  assert.match(appSource, /fadeCurrentVoice\(1, 1500\)/);
  assert.match(appSource, /Number\(line\.start\) - 3/);
  assert.match(appSource, /Number\(line\.end\) \+ 3/);
  assert.match(appSource, /position >= Number\(lines\[index\]\.start\)/);
  assert.doesNotMatch(appSource, /LYRIC_DISPLAY_LEAD_SECONDS/);
  assert.match(appSource, /event\.key === 'ArrowDown'/);
  assert.match(appSource, /function advanceManualSync\(\)/);
  assert.match(appSource, /index === state\.manualSync\.lineIndex - 1/);
  assert.match(appSource, /data-line-index="\$\{recordedLineIndex\}"/);
  assert.match(appSource, /manualSyncAdvanceButton\.addEventListener\('pointerdown'/);
  assert.match(appSource, /function changeLyricsTrack\(direction\)/);
  const changeLyricsTrackSource = appSource.slice(
    appSource.indexOf('async function changeLyricsTrack(direction)'),
    appSource.indexOf('async function seekLyricsRelative', appSource.indexOf('async function changeLyricsTrack(direction)'))
  );
  assert.ok(
    changeLyricsTrackSource.indexOf('cancelPovPlayback({ pause: true })')
      < changeLyricsTrackSource.indexOf('ensureCardDownloadedForPlayback(target)'),
    'the current track must pause before checking whether the destination track is downloaded'
  );
  assert.match(appSource, /function openLyricsAndPlay\(cardId\)/);
  assert.match(appSource, /if \(current && !current\.paused\) pauseCurrent\(\)/);
  assert.match(appSource, /lyricsRewindButton[\s\S]*seekLyricsRelative\(-5\)/);
  assert.match(appSource, /lyricsForwardButton[\s\S]*seekLyricsRelative\(5\)/);
  assert.match(appSource, /playRequestGeneration/);
  assert.match(appSource, /state\.autoAdvance = \{ fromVoice: voice, nextVoice: null, timer \}/);
  assert.match(appSource, /startManualSyncR2Audio\(card\)/);
  assert.match(appSource, /forceNetwork: true, sourceUrl: manualSyncAudioUrl\(card\)/);
  assert.match(appSource, /O R2 não confirmou o novo timesync/);
  assert.match(appSource, /function cacheCharacterImages\(\)/);
  assert.match(appSource, /function charactersUsedByCard\(card\)/);
  assert.match(appSource, /await cacheCardCharacterImages\(card\)/);
  assert.match(appSource, /async function ensureCardDownloadedForPlayback\(card\)/);
  assert.match(appSource, /openContainerUploadMenu\(card\.id, event\.clientX, event\.clientY\)/);
  assert.match(appSource, /uploadFile\('image', elements\.imageInput\.files\?\.\[0\]\)/);
  assert.match(appSource, /openDownloadPrompt\(card\.id\)/);
  assert.match(appSource, /if \(!await ensureCardDownloadedForPlayback\(card\)\) return/);
  assert.match(appSource, /state\.characters\.map\(cacheCharacterImage\)/);
  assert.match(appSource, /cache\.put\(request, response\.clone\(\)\)/);
  assert.match(appSource, /window\.addEventListener\('online'[\s\S]*cacheCharacterImages\(\)/);
  assert.match(serviceWorkerSource, /url\.pathname\.startsWith\(`\$\{API_ROOT\}\/characters\/`\)/);
  assert.match(serviceWorkerSource, /serveCharacterImage\(request\)/);
  assert.doesNotMatch(html, /id="lyricsCharacterLabel"/);
  assert.match(html, /aria-label="Faixa anterior"/);
  assert.match(html, /aria-label="Próxima faixa"/);
  assert.match(html, /aria-label="Voltar 5 segundos"/);
  assert.match(html, /aria-label="Avançar 5 segundos"/);
  assert.match(html, /Baixe essa faixa de áudio para ensaiar/);
  assert.match(html, /id="lyricsTrackLabel"/);
  assert.doesNotMatch(html, /lyrics-track-label__shade/);
  assert.match(html, /id="lyricsTrackLabelTitle"/);
  assert.match(html, /id="commenterNameDialogTitle">Coloque seu nome para comentar/);
  assert.match(html, /id="containerUploadAudio"/);
  assert.match(html, /id="containerUploadImage"/);
  assert.match(html, /id="containerDownloadAudio"/);
  assert.match(html, /id="characterDeleteButton"/);
  assert.match(html, /id="characterCancelButton"/);
  assert.match(html, /id="lyricsLanguageToggle"[^>]*hidden/);
  assert.match(html, /id="lyricsLanguageFlag" src="\/arquivos-codex\/icones\/ingles\.svg"/);
  assert.doesNotMatch(html, /id="lyricsLanguageEnglish"|id="lyricsLanguagePortuguese"/);
  assert.ok(appSource.includes('/arquivos-codex/icones/portugues.svg'));
  assert.match(html, /id="imageInput"[^>]*accept="image\/jpeg,image\/png,image\/webp/);
  assert.match(html, /class="icon-comments"/);
  assert.doesNotMatch(html, /id="playerBar"/);
  assert.match(stylesSource, /font-size: clamp\(1\.4rem, 3\.08vw, 2\.1rem\)/);
  assert.match(stylesSource, /font-size: 1\.26rem/);
  assert.match(stylesSource, /\.lyrics-lines[\s\S]*padding: 14px 22px 24px/);
  assert.match(stylesSource, /\.lyrics-track-label__background[\s\S]*opacity: 1/);
  assert.doesNotMatch(stylesSource, /\.lyrics-track-label__shade/);
  assert.match(stylesSource, /grid-template-columns: 52px minmax\(0, 1fr\)/);
  assert.match(stylesSource, /\.lyric-character-avatar \{[\s\S]*width: 52px;[\s\S]*height: 52px/);
  assert.match(stylesSource, /\.lyrics-character-switch__avatar \{[\s\S]*width: 38px;[\s\S]*height: 38px/);
  assert.match(stylesSource, /body\.englishtraining-page \.lyrics-track-heading \{[\s\S]*grid-column: 2/);
  assert.match(stylesSource, /body\.englishtraining-page \.lyrics-header-actions \{[\s\S]*grid-column: 3/);
  assert.match(stylesSource, /body\.englishtraining-page \.lyrics-language-toggle img \{[\s\S]*width: 27px;[\s\S]*height: 27px/);
  assert.match(html, /englishtraining-user-avatar\.svg/);
  assert.match(stylesSource, /\.lyrics-character-switch__avatar \{[\s\S]*border-radius: 0/);
  assert.match(html, /play-button-englishtraining\.svg/);
  assert.match(html, /pause-button-englishtraining\.svg/);
  assert.match(stylesSource, /body\.englishtraining-page \.lyrics-header-play-button \{[\s\S]*border: 0 !important;[\s\S]*border-radius: 0/);
  assert.match(stylesSource, /body\.englishtraining-page \.lyrics-timing-button \{[\s\S]*border: 0;[\s\S]*color: #fff;[\s\S]*font-size: 0\.94rem/);
  assert.match(stylesSource, /body\.englishtraining-page \.pronunciation-score__seal \{[\s\S]*width: 66px;[\s\S]*height: 66px/);
  assert.match(stylesSource, /body\.englishtraining-page \.lyric-line::before \{[\s\S]*top: 0;[\s\S]*bottom: 0;/);
  assert.doesNotMatch(stylesSource, /body\.englishtraining-page \.pronunciation-score::before/);
  assert.match(html, /play-button-englishtraining\.svg/);
  assert.match(html, /pause-button-englishtraining\.svg/);
  assert.match(stylesSource, /body\.englishtraining-page \.lyrics-header-play-button \{[\s\S]*border: 0 !important;[\s\S]*border-radius: 0/);
  assert.match(stylesSource, /body\.englishtraining-page \.lyrics-timing-button \{[\s\S]*border: 0;[\s\S]*color: #fff;[\s\S]*font-size: 0\.94rem/);
  assert.match(stylesSource, /body\.englishtraining-page \.lyric-line \{[\s\S]*overflow: visible/);
  assert.doesNotMatch(appSource, /APP_SLUG === 'englishtraining'\s*&&\s*!hasSpecificPovCharacter\(\)\s*&&\s*card\?\.lyrics\?\.mode === 'timesync'/);
  assert.match(appSource, /replayOriginalLyricLine\(card, line, pronunciationState\.resumeAfterSourceReplay\)/);
  assert.match(appSource, /charactersForCurrentCard\(\)\.forEach\(\(character\) =>/);
  assert.match(appSource, /lineMatchesCharacter\(line, characterId\)/);
  assert.match(stylesSource, /body\.lyrics-open > [^{]*:not\(\.download-prompt-dialog\)/);
  assert.match(stylesSource, /\.container-upload-menu \{[\s\S]*position: fixed;[\s\S]*z-index: 180/);
  assert.doesNotMatch(stylesSource, /padding: 31vh 10px 37vh/);
});

test('englishtraining boots the shared page against its isolated API and caches', async () => {
  const fetchUrls = [];
  const payload = projectPayload(false);
  payload.characters = [];
  payload.project.cards = [];
  const dom = await boot(false, {
    pageUrl: 'https://fluentlevelup.com/englishtraining/',
    appConfig: {
      appSlug: 'englishtraining',
      appPath: '/englishtraining',
      apiRoot: '/api/englishtraining'
    },
    fetchUrls,
    payload
  });

  assert.ok(fetchUrls.some((url) => url === '/api/englishtraining/project'));
  assert.equal(fetchUrls.some((url) => url.startsWith('/api/musical-kelly')), false);
  assert.equal(dom.window.document.querySelectorAll('.track-card').length, 0);
  assert.match(appSource, /`playtalk-\$\{APP_SLUG\}-media-v1`/);
  assert.match(appSource, /`playtalk-\$\{APP_SLUG\}-offline-v1`/);
  assert.match(serverSource, /englishtraining:[\s\S]*r2Prefix: 'englishtraining'/);
  assert.match(serverSource, /characterTable: 'englishtraining_characters'/);
  assert.match(serverSource, /app\.get\(\['\/englishtraining\/', '\/englishtraining\/index\.html'\]/);
  dom.window.close();
});

test('englishtraining keeps play and pause in the header and hides track navigation', async () => {
  const payload = projectPayload(false, { withAudio: true, withSecondTrack: true });
  const dom = await boot(false, {
    pageUrl: 'https://fluentlevelup.com/englishtraining/',
    appConfig: {
      appSlug: 'englishtraining',
      appPath: '/englishtraining',
      apiRoot: '/api/englishtraining'
    },
    payload
  });
  const { document } = dom.window;
  document.querySelector('.lyrics-button').click();
  assert.equal(document.getElementById('lyricsHeaderPlayButton').hidden, false);
  assert.ok(document.getElementById('lyricsBackButton'));
  assert.match(document.querySelector('[data-line-index="1"] .lyric-character-avatar__play').src, /play-button-englishtraining\.svg/);
  assert.equal(document.querySelector('.pronunciation-score').hidden, true);
  assert.equal(document.querySelector('.pronunciation-score').style.getPropertyValue('--score-progress'), '100%');
  assert.equal(document.querySelector('.pronunciation-score').classList.contains('is-unscored'), true);
  assert.match(document.querySelector('.pronunciation-score').getAttribute('aria-label'), /Sem áudio enviado, sem nota/);
  assert.match(stylesSource, /body\.englishtraining-page \.lyrics-track-navigation button\s*\{\s*display: none;/);
  dom.window.close();
});

test('admin bulk audio cutter is desktop-only with ten zoom scales ending at 15 seconds', () => {
  assert.match(html, /bulkAudioOpenButton[\s\S]*?hidden/);
  assert.match(html, /bulkAudioZoomLabel">Escala 1 \/ 10/);
  assert.match(appSource, /matchMedia\?\.\('\(min-width: 1024px\) and \(hover: hover\) and \(pointer: fine\)'\)/);
  assert.match(appSource, /APP_SLUG === 'englishtraining'/);
  assert.match(appSource, /Math\.min\(10, state\.bulkAudio\.zoomLevel \+ 1\)/);
  assert.match(appSource, /\(state\.bulkAudio\.zoomLevel - 1\) \/ 9/);
  assert.match(appSource, /Math\.min\(15, duration\)/);
  assert.match(appSource, /dataTransfer\?\.files\?\.\[0\]/);
  assert.match(appSource, /new window\.lamejs\.Mp3Encoder/);
  assert.match(html, /id="bulkAudioSelectPointOne"/);
  assert.match(html, /id="bulkAudioSelectPointTwo"/);
  assert.match(appSource, /if \(!event\.ctrlKey\) \{\s*elements\.bulkAudioPreview\.currentTime = point;/);
  assert.match(appSource, /event\.key === '1' \|\| event\.key === '2'/);
  assert.match(appSource, /event\.key === 'Escape'[\s\S]*?clearBulkAudioSelection\(\)/);
  assert.match(appSource, /file\.name\.slice\(0, 10\)/);
  assert.doesNotMatch(html, /bulkAudioCutButton|C · cortar/);
  assert.match(stylesSource, /\.bulk-audio-dialog[\s\S]*?overflow-y: auto;[\s\S]*?overscroll-behavior: contain/);
  assert.match(stylesSource, /html\.is-bulk-audio-modal-open, body\.is-bulk-audio-modal-open \{ overflow: hidden; \}/);
  assert.match(serverSource, /app\.put\(musicalKellyApiPaths\('\/cards\/:cardId\/lyrics'\)[\s\S]*?await requireAdminUserFromRequest\(req\)[\s\S]*?Array\.isArray\(req\.body\?\.lines\)/);
  assert.match(stylesSource, /@media \(max-width: 1023px\), \(hover: none\), \(pointer: coarse\)[\s\S]*?\.bulk-audio-open-button, \.bulk-audio-dialog/);
  assert.match(stylesSource, /\.lyric-character-avatar[\s\S]*?overflow: clip;[\s\S]*?contain: paint;/);
  assert.match(stylesSource, /\.pronunciation-score__seal[\s\S]*?overflow: visible/);
  const zoomSource = appSource.match(/function bulkVisibleDuration\(\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(zoomSource, 'waveform zoom duration calculation should exist');
  const bulkState = { bulkAudio: { duration: 300, zoomLevel: 1 } };
  const visibleDuration = new Function('state', `${zoomSource}; return bulkVisibleDuration;`)(bulkState);
  const scales = Array.from({ length: 10 }, (_, index) => {
    bulkState.bulkAudio.zoomLevel = index + 1;
    return visibleDuration();
  });
  assert.equal(scales.length, 10);
  assert.equal(scales[0], 300);
  assert.equal(scales[9], 15);
  assert.ok(scales.every((scale, index) => index === 0 || scale < scales[index - 1]));
  const pointSetterSource = appSource.match(/function assignBulkAudioSelectionPoint\([^)]*\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(pointSetterSource, 'selection point update helper should exist');
  const assignPoint = new Function(`${pointSetterSource}; return assignBulkAudioSelectionPoint;`)();
  const points = { selectionPointA: 10, selectionPointB: 80 };
  assert.deepEqual(assignPoint(points, 'a', 24), { start: 24, end: 80 });
  assert.equal(points.selectionPointB, 80);
  assert.deepEqual(assignPoint(points, 'b', 92), { start: 24, end: 92 });
  assert.equal(points.selectionPointA, 24);
});

test('W opens the bulk cutter from EnglishTraining home for admins on desktop only', async () => {
  const pageOptions = {
    pageUrl: 'https://fluentlevelup.com/englishtraining/',
    appConfig: { appSlug: 'englishtraining', appPath: '/englishtraining', apiRoot: '/api/englishtraining' },
    beforeEval: (window) => { window.matchMedia = () => ({ matches: true }); }
  };
  const adminDom = await boot(true, pageOptions);
  const adminKey = new adminDom.window.KeyboardEvent('keydown', { key: 'w', bubbles: true, cancelable: true });
  adminDom.window.document.dispatchEvent(adminKey);
  assert.equal(adminDom.window.document.getElementById('bulkAudioDialog').hasAttribute('open'), true);
  assert.equal(adminDom.window.document.body.classList.contains('is-bulk-audio-modal-open'), true);
  assert.equal(adminDom.window.document.documentElement.classList.contains('is-bulk-audio-modal-open'), true);
  adminDom.window.document.dispatchEvent(new adminDom.window.KeyboardEvent('keydown', { key: '2', bubbles: true, cancelable: true }));
  assert.equal(adminDom.window.document.getElementById('bulkAudioSelectPointTwo').getAttribute('aria-pressed'), 'true');
  adminDom.window.document.dispatchEvent(new adminDom.window.KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true }));
  assert.equal(adminDom.window.document.getElementById('bulkAudioSelectPointOne').getAttribute('aria-pressed'), 'true');
  assert.equal(adminKey.defaultPrevented, true);
  adminDom.window.close();

  const viewerDom = await boot(false, pageOptions);
  viewerDom.window.document.dispatchEvent(new viewerDom.window.KeyboardEvent('keydown', { key: 'w', bubbles: true, cancelable: true }));
  assert.equal(viewerDom.window.document.getElementById('bulkAudioDialog').hasAttribute('open'), false);
  viewerDom.window.close();

  const mobileDom = await boot(true, {
    ...pageOptions,
    beforeEval: (window) => { window.matchMedia = () => ({ matches: false }); }
  });
  mobileDom.window.document.dispatchEvent(new mobileDom.window.KeyboardEvent('keydown', { key: 'w', bubbles: true, cancelable: true }));
  assert.equal(mobileDom.window.document.getElementById('bulkAudioDialog').hasAttribute('open'), false);
  mobileDom.window.close();
});

test('englishtraining translates once and toggles the shared Portuguese lyrics', async () => {
  const fetchUrls = [];
  const payload = projectPayload(false);
  payload.project.cards[0].lyrics.lines[0].text = 'Do not be afraid.';
  payload.project.cards[0].lyrics.lines[1].text = 'I am with you.';
  const translatedProject = JSON.parse(JSON.stringify(payload.project));
  translatedProject.cards[0].lyrics.lines[0].textPt = 'Não tenha medo.';
  translatedProject.cards[0].lyrics.lines[1].textPt = 'Eu estou com você.';
  const dom = await boot(false, {
    pageUrl: 'https://fluentlevelup.com/englishtraining/',
    appConfig: {
      appSlug: 'englishtraining',
      appPath: '/englishtraining',
      apiRoot: '/api/englishtraining'
    },
    fetchUrls,
    fetchResponder: (url, init) => {
      if (url.endsWith('/lyrics/portuguese') && init.method === 'POST') {
        return { success: true, generated: true, project: translatedProject };
      }
      return payload;
    }
  });
  const { document } = dom.window;
  document.querySelector('.lyrics-button').click();
  assert.equal(document.getElementById('lyricsLanguageToggle').hidden, false);
  assert.equal(document.getElementById('lyricsLanguageFlag').alt, 'Bandeira dos Estados Unidos');
  assert.equal(document.getElementById('lyricsHeaderPlayButton').hidden, false);
  assert.equal(document.querySelector('[data-line-index="1"] .lyric-copy > span:last-child').textContent, 'I am with you.');
  document.getElementById('lyricsLanguageToggle').click();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(fetchUrls.some((url) => url.endsWith('/api/englishtraining/cards/cue-test/lyrics/portuguese')));
  assert.equal(document.getElementById('lyricsLanguageFlag').alt, 'Bandeira do Brasil');
  assert.equal(document.querySelector('[data-line-index="0"] .lyric-copy > span:last-child').textContent, 'Não tenha medo.');
  assert.equal(dom.window.localStorage.getItem('playtalk-englishtraining-lyrics-language-v1'), 'pt');
  document.getElementById('lyricsLanguageToggle').click();
  document.getElementById('lyricsLanguageToggle').click();
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(fetchUrls.filter((url) => url.endsWith('/lyrics/portuguese')).length, 1);
  dom.window.close();
});

test('Portuguese lyrics use Brazilian Portuguese speech recognition and scoring', async () => {
  const payload = projectPayload(false);
  payload.project.cards[0].lyrics.lines[0].text = 'Do not be afraid.';
  payload.project.cards[0].lyrics.lines[0].textPt = 'Não tenha medo.';
  payload.project.cards[0].lyrics.lines[1].text = 'I am with you.';
  payload.project.cards[0].lyrics.lines[1].textPt = 'Eu estou com você.';
  let activeRecognition = null;
  const dom = await boot(false, {
    pageUrl: 'https://fluentlevelup.com/englishtraining/',
    appConfig: { appSlug: 'englishtraining', appPath: '/englishtraining', apiRoot: '/api/englishtraining' },
    payload,
    beforeEval: (window) => {
      window.SpeechRecognition = class {
        constructor() { activeRecognition = this; }
        start() {}
        abort() {}
      };
    }
  });
  const { document } = dom.window;
  document.querySelector('.lyrics-button').click();
  document.getElementById('lyricsLanguageToggle').click();
  const line = document.querySelector('[data-line-index="0"]');
  assert.equal(line.querySelector('.lyric-copy > span:last-child').textContent, 'Não tenha medo.');
  line.dispatchEvent(new dom.window.Event('pointerdown', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 220));
  assert.equal(activeRecognition.lang, 'pt-BR');
  activeRecognition.onresult({ results: [[{ transcript: 'não tenha medo' }]] });
  activeRecognition.onend();
  await new Promise((resolve) => setTimeout(resolve, 25));
  const scores = JSON.parse(dom.window.localStorage.getItem('playtalk-englishtraining-pronunciation-v1'));
  assert.equal(scores['cue-test']['line-1'].score, 100);
  dom.window.close();
});

test('pronunciation score counts valid matching sequences and ignores extra spoken letters', () => {
  const scoreSource = appSource.match(/function calculatePronunciationScore\([^)]*\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(scoreSource, 'pronunciation scoring function should be available in the app');
  const calculateScore = new Function('state', `${scoreSource}; return calculatePronunciationScore;`)({ lyricsLanguage: 'en' });

  assert.equal(calculateScore('we are the world', 'we were the world'), 92);
  assert.equal(calculateScore('we are the world', 'we are extra the world'), 100);
  assert.equal(calculateScore('we are the world', 'we the world'), 77);
});

test('filters Whisper hallucinations over instrumental gaps without deleting a real repeated chorus', () => {
  const result = filterMusicalKellyTranscriptionSegments([
    { start: 1, end: 5, text: 'Uau! Olha só! Um leão!', avg_logprob: -0.22, compression_ratio: 1.35, no_speech_prob: 0.15, temperature: 0 },
    { start: 9, end: 13, text: 'Eu sou o rei da floresta', avg_logprob: -0.22, compression_ratio: 1.35, no_speech_prob: 0.15, temperature: 0 },
    { start: 25, end: 28, text: 'Eu sou o rei da floresta', avg_logprob: -0.13, compression_ratio: 1.08, no_speech_prob: 0.01, temperature: 0 },
    { start: 59, end: 63, text: 'Eu sou o rei da floresta', avg_logprob: -0.35, compression_ratio: 1.78, no_speech_prob: 0.92, temperature: 0.6 },
    { start: 84, end: 90, text: 'Eu ando por tudo, correndo e caçando', avg_logprob: -0.23, compression_ratio: 2.31, no_speech_prob: 0.96, temperature: 0 },
    { start: 109, end: 119, text: 'Música', avg_logprob: -0.71, compression_ratio: 1.21, no_speech_prob: 0.95, temperature: 0 },
    { start: 285, end: 295, text: 'Música', avg_logprob: -0.06, compression_ratio: 0.79, no_speech_prob: 0.05, temperature: 0 }
  ]);

  assert.deepEqual(result.accepted.map((segment) => segment.text), [
    'Uau! Olha só! Um leão!',
    'Eu sou o rei da floresta',
    'Eu sou o rei da floresta'
  ]);
  assert.deepEqual(result.discarded.map((segment) => segment.reason), [
    'high-no-speech-probability',
    'high-no-speech-probability',
    'instrumental-placeholder',
    'instrumental-placeholder'
  ]);
});

test('grounds AI organization in exact source segments and cannot invent JoJo voices', () => {
  const segments = [
    { sourceId: 0, start: 1, end: 5, text: 'Tem tanto bicho que eu já vi' },
    { sourceId: 1, start: 5, end: 8, text: 'Eu sou o rei da floresta' }
  ];
  const lines = buildGroundedMusicalKellyLines([
    { speaker: 'Leão', text: 'JoJo voices', start: 1, end: 300, sourceSegmentIds: [0] },
    { speaker: 'Leão', sourceSegmentIds: [0] }
  ], segments);

  assert.deepEqual(lines, [
    {
      id: 'line-1',
      speaker: 'Leão',
      characterId: '',
      text: 'Tem tanto bicho que eu já vi',
      start: 1,
      end: 5
    },
    {
      id: 'line-2',
      speaker: '',
      characterId: '',
      text: 'Eu sou o rei da floresta',
      start: 5,
      end: 8
    }
  ]);
  assert.equal(lines.some((line) => /JoJo voices/i.test(line.text)), false);
});

test('does not group voice segments across a long instrumental gap', () => {
  const segments = [
    { sourceId: 0, start: 1, end: 4, text: 'Primeira fala' },
    { sourceId: 1, start: 80, end: 83, text: 'Segunda fala' }
  ];
  const lines = buildGroundedMusicalKellyLines([
    { speaker: 'Dorothy', sourceSegmentIds: [0, 1] }
  ], segments);

  assert.deepEqual(lines.map(({ text, start, end }) => ({ text, start, end })), [
    { text: 'Primeira fala', start: 1, end: 4 },
    { text: 'Segunda fala', start: 80, end: 83 }
  ]);
});
