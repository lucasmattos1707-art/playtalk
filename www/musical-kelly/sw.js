'use strict';

const SHELL_CACHE = 'playtalk-musical-kelly-shell-v29';
const SHELL_CACHE_PREFIX = 'playtalk-musical-kelly-shell-';
const MEDIA_CACHE = 'playtalk-musical-kelly-media-v1';
const SHELL_URLS = [
  '/musical-kelly/',
  '/musical-kelly/styles.css?v=28',
  '/musical-kelly/app.js?v=30'
];
const COMMENT_OUTBOX_DB_NAME = 'playtalk-musical-kelly-offline-v1';
const COMMENT_OUTBOX_STORE = 'comment-outbox';
const COMMENT_SYNC_TAG = 'musical-kelly-comments';

function openCommentOutboxDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(COMMENT_OUTBOX_DB_NAME, 1);
    request.addEventListener('upgradeneeded', () => {
      if (!request.result.objectStoreNames.contains(COMMENT_OUTBOX_STORE)) {
        request.result.createObjectStore(COMMENT_OUTBOX_STORE, { keyPath: 'clientMutationId' });
      }
    });
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error || new Error('Falha ao abrir a fila offline.')));
  });
}

async function readPendingComments() {
  const database = await openCommentOutboxDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(COMMENT_OUTBOX_STORE, 'readonly');
    const request = transaction.objectStore(COMMENT_OUTBOX_STORE).getAll();
    request.addEventListener('success', () => {
      const comments = (Array.isArray(request.result) ? request.result : [])
        .filter((comment) => comment?.clientMutationId && comment?.cardId && comment?.text)
        .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
      resolve(comments);
    });
    request.addEventListener('error', () => reject(request.error || new Error('Falha ao ler a fila offline.')));
  });
}

async function deletePendingComment(clientMutationId) {
  const database = await openCommentOutboxDb();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(COMMENT_OUTBOX_STORE, 'readwrite');
    transaction.objectStore(COMMENT_OUTBOX_STORE).delete(clientMutationId);
    transaction.addEventListener('complete', resolve);
    transaction.addEventListener('error', () => reject(transaction.error || new Error('Falha ao atualizar a fila offline.')));
    transaction.addEventListener('abort', () => reject(transaction.error || new Error('Falha ao atualizar a fila offline.')));
  });
}

async function notifyClients(count) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((client) => client.postMessage({
    type: 'musical-kelly-comments-synced',
    count
  }));
}

async function flushPendingComments() {
  const comments = await readPendingComments();
  let sentCount = 0;
  for (const comment of comments) {
    const response = await fetch(`/api/musical-kelly/cards/${encodeURIComponent(comment.cardId)}/comments`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Musical-Kelly-Commenter-Id': String(comment.ownerId || ''),
        'X-Musical-Kelly-Commenter-Token': String(comment.ownerToken || '')
      },
      body: JSON.stringify({
        text: comment.text,
        authorName: comment.authorName,
        clientMutationId: comment.clientMutationId
      })
    });
    if (!response.ok) throw new Error(`Falha ao enviar comentario offline: ${response.status}`);
    await deletePendingComment(comment.clientMutationId);
    sentCount += 1;
  }
  if (sentCount) await notifyClients(sentCount);
  return sentCount;
}

function rangedResponse(response, rangeHeader) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(String(rangeHeader || '').trim());
  if (!match) return Promise.resolve(response);
  return response.arrayBuffer().then((buffer) => {
    const total = buffer.byteLength;
    if (!total) {
      return new Response(buffer, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    }
    let start = match[1] ? Number.parseInt(match[1], 10) : null;
    let end = match[2] ? Number.parseInt(match[2], 10) : null;
    if (start === null && end !== null) {
      start = Math.max(0, total - end);
      end = total - 1;
    } else {
      start = Math.max(0, start || 0);
      end = end === null ? total - 1 : Math.min(end, total - 1);
    }
    if (start >= total || end < start) {
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${total}` }
      });
    }
    const headers = new Headers(response.headers);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
    headers.set('Content-Length', String(end - start + 1));
    return new Response(buffer.slice(start, end + 1), {
      status: 206,
      statusText: 'Partial Content',
      headers
    });
  });
}

async function serveMusicalMedia(request) {
  const cache = await caches.open(MEDIA_CACHE);
  const cacheKey = new Request(request.url, { credentials: 'same-origin' });
  const cached = await cache.match(cacheKey, { ignoreVary: true });
  if (cached) {
    const rangeHeader = request.headers.get('range');
    return rangeHeader ? rangedResponse(cached, rangeHeader) : cached;
  }
  return fetch(request);
}

async function serveCharacterImage(request) {
  const cache = await caches.open(MEDIA_CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.all(SHELL_URLS.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response.ok) await cache.put(url, response);
      } catch (_error) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith(SHELL_CACHE_PREFIX) && name !== SHELL_CACHE)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/musical-kelly/assets/')) {
    event.respondWith(serveMusicalMedia(request));
    return;
  }
  if (url.pathname.startsWith('/api/musical-kelly/characters/')) {
    event.respondWith(serveCharacterImage(request));
    return;
  }
  if (!url.pathname.startsWith('/musical-kelly')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(SHELL_CACHE);
          await cache.put('/musical-kelly/', response.clone());
        }
        return response;
      } catch (_error) {
        return (await caches.match('/musical-kelly/')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});

self.addEventListener('sync', (event) => {
  if (event.tag === COMMENT_SYNC_TAG) event.waitUntil(flushPendingComments());
});
