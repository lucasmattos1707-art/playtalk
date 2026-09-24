'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

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
    json: async () => projectPayload(canEdit, options)
  });
  window.caches = {
    open: async () => ({
      match: async () => null,
      put: async () => {}
    })
  };
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
  assert.equal(document.querySelector('.comment-button').hidden, false);
  assert.match(document.querySelector('.lyric-character-avatar').style.backgroundImage, /char-dorothy/);
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
  assert.match(serverSource, /musical_kelly_comment_title/);
  assert.match(serverSource, /app\.post\('\/api\/musical-kelly\/cards\/:cardId\/comments\/:commentId\/replies'/);
  assert.match(serverSource, /app\.patch\('\/api\/musical-kelly\/cards\/:cardId\/comments\/:commentId'/);
  assert.doesNotMatch(serverSource, /generateMusicalKellyCardImage/);
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
  assert.match(serviceWorkerSource, /url\.pathname\.startsWith\('\/api\/musical-kelly\/characters\/'\)/);
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
  assert.match(stylesSource, /body\.lyrics-open > [^{]*:not\(\.download-prompt-dialog\)/);
  assert.match(stylesSource, /\.container-upload-menu \{[\s\S]*position: fixed;[\s\S]*z-index: 180/);
  assert.doesNotMatch(stylesSource, /padding: 31vh 10px 37vh/);
});
