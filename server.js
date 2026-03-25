const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));
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
const ELEVENLABS_MODEL_ID = env(process.env.ELEVENLABS_MODEL_ID) || 'eleven_multilingual_v2';
const OPENAI_API_KEY = env(process.env.OPENAI_API_KEY);
const OPENAI_IMAGE_MODEL = env(process.env.OPENAI_IMAGE_MODEL) || 'gpt-image-1-mini';
const OPENAI_TEXT_MODEL = env(process.env.OPENAI_TEXT_MODEL) || 'gpt-5-mini';
const OPENAI_STORY_MODEL = env(process.env.OPENAI_STORY_MODEL) || 'gpt-5';
const OPENAI_TTS_MODEL = env(process.env.OPENAI_TTS_MODEL) || 'gpt-4o-mini-tts';
const OPENAI_STT_MODEL = env(process.env.OPENAI_STT_MODEL) || 'gpt-4o-mini-transcribe';
const OPENAI_CHAT_FAST_MODEL = env(process.env.OPENAI_CHAT_FAST_MODEL) || 'gpt-5-mini';

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
const LOCAL_LEVELS_ROOT = path.join(__dirname, 'Niveis');
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

function extensionFromMimeType(mimeType) {
  const normalized = String(mimeType || '').toLowerCase();
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
  const objectPath = `/${encodeRfc3986(R2_BUCKET_NAME)}/${encodeR2ObjectKey(objectKey)}`;
  const payloadBuffer = Buffer.isBuffer(bodyBuffer) ? bodyBuffer : Buffer.from(bodyBuffer || []);
  const request = buildR2SignedRequest('PUT', objectPath, {}, {
    payloadHash: sha256HexBuffer(payloadBuffer),
    extraHeaders: {
      'content-type': contentType,
      'content-length': String(payloadBuffer.length)
    }
  });
  const response = await fetch(request.url, {
    method: 'PUT',
    headers: request.headers,
    body: payloadBuffer
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`R2 PUT ${objectKey} falhou: ${response.status} ${response.statusText} ${body}`.trim());
  }

  return true;
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
  const response = await requestR2('GET', `/${encodeRfc3986(R2_BUCKET_NAME)}`, {
    'list-type': 2,
    prefix,
    'max-keys': 1000
  });
  const xmlText = await response.text();
  return parseR2ObjectKeys(xmlText);
}

async function listAllR2ObjectKeys(prefix) {
  const allKeys = [];
  let continuationToken = '';

  while (true) {
    const response = await requestR2('GET', `/${encodeRfc3986(R2_BUCKET_NAME)}`, {
      'list-type': 2,
      prefix,
      'max-keys': 1000,
      'continuation-token': continuationToken || undefined
    });
    const xmlText = await response.text();
    const payload = parseR2ListResponse(xmlText);
    allKeys.push(...payload.keys);

    if (!payload.isTruncated || !payload.nextContinuationToken) {
      break;
    }

    continuationToken = payload.nextContinuationToken;
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
  const objectPath = `/${encodeRfc3986(R2_BUCKET_NAME)}/${encodeR2ObjectKey(objectKey)}`;
  const response = await requestR2('GET', objectPath);
  const raw = await response.text();
  return JSON.parse(raw);
}

async function fetchR2ObjectBuffer(objectKey) {
  const objectPath = `/${encodeRfc3986(R2_BUCKET_NAME)}/${encodeR2ObjectKey(objectKey)}`;
  const response = await requestR2('GET', objectPath);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
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
  return `flashcard-dia-${dayNumber}.json`;
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
  return /^[a-zA-Z0-9._-]{3,32}$/.test(username);
}

function buildLegacyEmailFromUsername(username) {
  return String(username || '').trim().toLowerCase();
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

function getAuthenticatedUserFromRequest(req) {
  if (!JWT_SECRET) return null;

  const cookies = parseCookies(req);
  const token = cookies.playtalk_token;
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
    const avatarImage = typeof req.body.avatar === 'string'
      ? req.body.avatar.trim().slice(0, 255)
      : '';
    let result;
    try {
      result = await pool.query(
        `INSERT INTO public.users (email, password_hash, avatar_image)
         VALUES ($1, $2, $3)
         RETURNING id, email, avatar_image, created_at`,
        [email, passwordHash, avatarImage || null]
      );
    } catch (error) {
      if (error && error.code === '42703') {
        result = await pool.query(
          `INSERT INTO public.users (email, password_hash)
           VALUES ($1, $2)
           RETURNING id, email, created_at`,
          [email, passwordHash]
        );
      } else {
        throw error;
      }
    }

    const user = result.rows[0];
    const token = createAuthToken({ id: user.id, email: user.email });
    if (token) {
      setAuthCookie(res, token);
    }
    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        username: user.email,
        avatar_image: user.avatar_image || '',
        created_at: user.created_at
      },
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

    let result;
    try {
      result = await pool.query(
        'SELECT id, email, avatar_image, password_hash, created_at FROM public.users WHERE email = $1',
        [username]
      );
    } catch (error) {
      if (error && error.code === '42703') {
        result = await pool.query(
          'SELECT id, email, password_hash, created_at FROM public.users WHERE email = $1',
          [username]
        );
      } else {
        throw error;
      }
    }
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
    if (!JWT_SECRET) {
      res.status(500).json({ success: false, message: 'JWT_SECRET nao configurado.' });
      return;
    }

    const token = createAuthToken({ id: user.id, email: user.email });
    setAuthCookie(res, token);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.email,
        avatar_image: user.avatar_image || '',
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Erro ao autenticar usuario:', error);
    res.status(500).json({ success: false, message: 'Erro ao autenticar usuario.' });
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
      'SELECT id, email, created_at FROM public.users WHERE email = $1',
      [email]
    );

    if (!result.rows.length) {
      const generatedPasswordHash = await bcrypt.hash(`google-quick:${email}:${Date.now()}`, 10);
      result = await pool.query(
        `INSERT INTO public.users (email, password_hash)
         VALUES ($1, $2)
         RETURNING id, email, created_at`,
        [email, generatedPasswordHash]
      );
    }

    const user = result.rows[0];
    const token = createAuthToken({ id: user.id, email: user.email });
    if (!token) {
      res.status(500).json({ success: false, message: 'JWT_SECRET nao configurado.' });
      return;
    }
    setAuthCookie(res, token);
    res.json({ success: true, token, user });
  } catch (error) {
    console.error('Erro no login rapido com Google:', error);
    res.status(500).json({ success: false, message: 'Erro ao autenticar com Google.' });
  }
});

app.get('/auth/session', (req, res) => {
  const payload = getAuthenticatedUserFromRequest(req);
  if (!payload) {
    res.status(401).json({ success: false, message: 'Sessão inválida ou expirada.' });
    return;
  }

  res.json({ success: true, user: { id: payload.sub, username: payload.username || '' } });
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
    '/speak',
    '/speak/',
    '/levels',
    '/levels/',
    '/database',
    '/database/',
    '/flashcards',
    '/flashcards/',
    '/storage',
    '/storage/',
    '/storage-debug',
    '/storage-debug/',
    '/eventos',
    '/eventos/',
    '/login',
    '/register',
    '/logout',
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
  res.sendFile(path.join(staticDir, 'flashcards.html'));
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

  if (!Number.isFinite(count) || count < 1 || count > 24) {
    res.status(400).json({ error: 'Quantidade invalida. Use entre 1 e 24 frases.' });
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
  const day = Number.parseInt(req.body?.day, 10);
  const mode = typeof req.body?.mode === 'string' ? req.body.mode.trim() : 'flashcard';
  const files = Array.isArray(req.body?.files) ? req.body.files : [];

  if (!isR2FluencyConfigured()) {
    res.status(503).json({ error: 'R2 nao configurado para upload.' });
    return;
  }

  if (!Number.isFinite(day) || day < 1 || day > 200) {
    res.status(400).json({ error: 'Dia invalido para envio ao R2.' });
    return;
  }

  if (!files.length) {
    res.status(400).json({ error: 'Nenhum arquivo foi enviado para publicar no R2.' });
    return;
  }

  const dayFolder = String(day).padStart(3, '0');
  const phaseFolder = levelPhaseCodeFromMode(mode);
  const prefix = `Niveis/${dayFolder}/${phaseFolder}`;

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



