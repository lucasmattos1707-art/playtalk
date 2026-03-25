const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const EMPTY_PAYLOAD_HASH = crypto.createHash('sha256').update('').digest('hex');

function loadDotEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

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

function getEnv(name, fallback = '') {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : fallback;
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    days: null,
    phases: null,
    root: null,
    marker: null,
    concurrency: null
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    const [flag, rawValue] = arg.split('=');
    if (!rawValue) {
      continue;
    }

    if (flag === '--days') {
      options.days = parseInteger(rawValue, null);
    } else if (flag === '--phases') {
      options.phases = parseInteger(rawValue, null);
    } else if (flag === '--root') {
      options.root = rawValue.trim();
    } else if (flag === '--marker') {
      options.marker = rawValue.trim();
    } else if (flag === '--concurrency') {
      options.concurrency = parseInteger(rawValue, null);
    }
  }

  return options;
}

function encodeRfc3986(segment) {
  return encodeURIComponent(segment).replace(/[!'()*]/g, char =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function encodeObjectKey(key) {
  return key
    .split('/')
    .map(segment => encodeRfc3986(segment))
    .join('/');
}

function hmac(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value, 'utf8').digest(encoding);
}

function sha256(value, encoding) {
  return crypto.createHash('sha256').update(value, 'utf8').digest(encoding);
}

function getSignatureKey(secretAccessKey, dateStamp, region, service) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const dateRegionKey = hmac(dateKey, region);
  const dateRegionServiceKey = hmac(dateRegionKey, service);
  return hmac(dateRegionServiceKey, 'aws4_request');
}

function toAmzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function buildConfig(options) {
  const accountId = getEnv('CLOUDFLARE_ACCOUNT_ID');
  const endpoint = getEnv('R2_ENDPOINT') || (accountId
    ? `https://${accountId}.r2.cloudflarestorage.com`
    : '');

  return {
    accountId,
    bucket: getEnv('R2_BUCKET_NAME'),
    accessKeyId: getEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: getEnv('R2_SECRET_ACCESS_KEY'),
    endpoint,
    root: options.root || getEnv('R2_CONTENT_ROOT', 'contnent'),
    days: options.days || parseInteger(getEnv('R2_CONTENT_DAYS'), 200),
    phases: options.phases || parseInteger(getEnv('R2_CONTENT_PHASES'), 12),
    marker: options.marker || getEnv('R2_CONTENT_MARKER_FILE', '.keep'),
    concurrency: options.concurrency || parseInteger(getEnv('R2_CONTENT_CONCURRENCY'), 8),
    region: 'auto'
  };
}

function validateConfig(config, dryRun) {
  const missing = [];
  if (!config.bucket) missing.push('R2_BUCKET_NAME');
  if (!config.endpoint) missing.push('R2_ENDPOINT');

  if (!dryRun) {
    if (!config.accessKeyId) missing.push('R2_ACCESS_KEY_ID');
    if (!config.secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  }

  if (missing.length) {
    throw new Error(`Faltam variaveis obrigatorias: ${missing.join(', ')}`);
  }

  if (config.accessKeyId) {
    const accessKeyIdLength = config.accessKeyId.length;
    const secretAccessKeyLength = config.secretAccessKey ? config.secretAccessKey.length : 0;

    if (accessKeyIdLength !== 32) {
      if (accessKeyIdLength === 64 && secretAccessKeyLength === 32) {
        throw new Error(
          'R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY parecem invertidos. ' +
          'No R2, o Access Key ID costuma ter 32 caracteres e o Secret Access Key 64.'
        );
      }

      throw new Error(
        `R2_ACCESS_KEY_ID parece invalido: recebi ${accessKeyIdLength} caracteres. ` +
        'No R2, o Access Key ID costuma ter 32 caracteres.'
      );
    }
  }

  if (config.secretAccessKey) {
    const secretAccessKeyLength = config.secretAccessKey.length;
    if (secretAccessKeyLength !== 64) {
      throw new Error(
        `R2_SECRET_ACCESS_KEY parece invalido: recebi ${secretAccessKeyLength} caracteres. ` +
        'No R2, o Secret Access Key costuma ter 64 caracteres.'
      );
    }
  }

  if (!/^https?:\/\//i.test(config.endpoint)) {
    throw new Error('R2_ENDPOINT precisa ser uma URL valida.');
  }

  if (!config.root) {
    throw new Error('Defina um prefixo para R2_CONTENT_ROOT.');
  }

  if (!config.marker || config.marker.includes('/')) {
    throw new Error('R2_CONTENT_MARKER_FILE precisa ser um nome de arquivo simples, sem barras.');
  }
}

function buildObjectKeys(config) {
  const keys = [];

  for (let day = 1; day <= config.days; day += 1) {
    for (let phase = 1; phase <= config.phases; phase += 1) {
      keys.push(`${config.root}/Dia ${day}/fase${phase}/${config.marker}`);
    }
  }

  return keys;
}

function buildSignedRequestConfig(config, objectKey) {
  const endpoint = new URL(config.endpoint);
  const encodedKey = encodeObjectKey(objectKey);
  const canonicalUri = `/${encodeRfc3986(config.bucket)}/${encodedKey}`;
  const url = `${endpoint.origin}${canonicalUri}`;
  const amzDate = toAmzDate();
  const dateStamp = amzDate.slice(0, 8);
  const canonicalHeaders = [
    `host:${endpoint.host}`,
    `x-amz-content-sha256:${EMPTY_PAYLOAD_HASH}`,
    `x-amz-date:${amzDate}`
  ].join('\n');
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    '',
    `${canonicalHeaders}\n`,
    signedHeaders,
    EMPTY_PAYLOAD_HASH
  ].join('\n');
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest, 'hex')
  ].join('\n');
  const signingKey = getSignatureKey(
    config.secretAccessKey,
    dateStamp,
    config.region,
    's3'
  );
  const signature = hmac(signingKey, stringToSign, 'hex');
  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`
  ].join(', ');

  return {
    url,
    headers: {
      authorization,
      'x-amz-content-sha256': EMPTY_PAYLOAD_HASH,
      'x-amz-date': amzDate
    }
  };
}

async function putMarkerObject(config, objectKey) {
  const requestConfig = buildSignedRequestConfig(config, objectKey);
  const response = await fetch(requestConfig.url, {
    method: 'PUT',
    headers: requestConfig.headers,
    body: ''
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Falha ao criar ${objectKey}: ${response.status} ${response.statusText} ${message}`.trim());
  }
}

async function runWithConcurrency(items, concurrency, task) {
  let index = 0;
  const workers = new Array(Math.min(concurrency, items.length)).fill(null).map(async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      await task(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
}

function printPreview(keys) {
  const preview = keys.slice(0, 5);
  for (const key of preview) {
    console.log(`- ${key}`);
  }
  if (keys.length > preview.length) {
    console.log(`... e mais ${keys.length - preview.length} objetos`);
  }
}

async function main() {
  loadDotEnv();

  const options = parseArgs(process.argv.slice(2));
  const config = buildConfig(options);
  validateConfig(config, options.dryRun);

  const keys = buildObjectKeys(config);
  console.log(`Preparando estrutura R2 com ${keys.length} marcadores.`);
  console.log(`Bucket: ${config.bucket}`);
  console.log(`Endpoint: ${config.endpoint}`);
  console.log(`Raiz: ${config.root}`);
  console.log(`Dias: 1..${config.days}`);
  console.log(`Fases por dia: ${config.phases}`);
  console.log(`Arquivo marcador: ${config.marker}`);
  printPreview(keys);

  if (options.dryRun) {
    console.log('Dry run finalizado sem enviar requisicoes.');
    return;
  }

  let completed = 0;
  await runWithConcurrency(keys, config.concurrency, async objectKey => {
    await putMarkerObject(config, objectKey);
    completed += 1;
    if (completed % 50 === 0 || completed === keys.length) {
      console.log(`Progresso: ${completed}/${keys.length}`);
    }
  });

  console.log('Estrutura criada no R2 com sucesso.');
}

main().catch(error => {
  console.error('Falha ao inicializar estrutura do R2:', error.message);
  process.exit(1);
});
