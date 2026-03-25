const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const EMPTY_PAYLOAD_HASH = crypto.createHash("sha256").update("").digest("hex");
const DEFAULT_PUBLIC_ROOT = "https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev";
const TARGET_FIELDS = new Set([
  "imagem",
  "audio",
  "image",
  "audio_portuguese",
  "audio_english",
  "coverImage",
  "soundtrack"
]);

function loadDotEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\""))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function getEnv(name, fallback = "") {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : fallback;
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseArgs(argv) {
  const options = {
    prefix: "Niveis/",
    publicRoot: getEnv("PLAYTALK_R2_MEDIA_BASE_URL", DEFAULT_PUBLIC_ROOT),
    concurrency: 6,
    dryRun: false
  };

  for (const arg of argv) {
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    const [flag, ...rest] = arg.split("=");
    const rawValue = rest.join("=").trim();
    if (!rawValue) continue;

    if (flag === "--prefix") {
      options.prefix = rawValue.replace(/^\/+/, "");
    } else if (flag === "--public-root") {
      options.publicRoot = rawValue.replace(/\/+$/, "");
    } else if (flag === "--concurrency") {
      options.concurrency = parseInteger(rawValue, options.concurrency);
    }
  }

  if (!options.prefix.endsWith("/")) {
    options.prefix += "/";
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
    .split("/")
    .map(segment => encodeRfc3986(segment))
    .join("/");
}

function hmac(key, value, encoding) {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest(encoding);
}

function sha256(value, encoding) {
  return crypto.createHash("sha256").update(value, "utf8").digest(encoding);
}

function getSignatureKey(secretAccessKey, dateStamp, region, service) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const dateRegionKey = hmac(dateKey, region);
  const dateRegionServiceKey = hmac(dateRegionKey, service);
  return hmac(dateRegionServiceKey, "aws4_request");
}

function toAmzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function decodeXmlText(value = "") {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseR2ObjectKeys(xmlText) {
  const matches = [...String(xmlText || "").matchAll(/<Key>([\s\S]*?)<\/Key>/g)];
  return matches.map(match => decodeXmlText(match[1]));
}

function extractR2XmlTag(xmlText, tagName) {
  const match = String(xmlText || "").match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeXmlText(match[1]) : "";
}

function parseR2ListResponse(xmlText) {
  return {
    keys: parseR2ObjectKeys(xmlText),
    isTruncated: /<IsTruncated>true<\/IsTruncated>/i.test(String(xmlText || "")),
    nextContinuationToken: extractR2XmlTag(xmlText, "NextContinuationToken")
  };
}

function loadConfig(options) {
  const accountId = getEnv("CLOUDFLARE_ACCOUNT_ID");
  const endpoint = getEnv("R2_ENDPOINT") || (accountId
    ? `https://${accountId}.r2.cloudflarestorage.com`
    : "");

  return {
    bucket: getEnv("R2_BUCKET_NAME"),
    accessKeyId: getEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY"),
    endpoint,
    region: "auto",
    prefix: options.prefix,
    publicRoot: options.publicRoot.replace(/\/+$/, ""),
    concurrency: options.concurrency,
    dryRun: options.dryRun
  };
}

function validateConfig(config) {
  const missing = [];
  if (!config.bucket) missing.push("R2_BUCKET_NAME");
  if (!config.endpoint) missing.push("R2_ENDPOINT");
  if (!config.accessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!config.secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");
  if (!config.publicRoot) missing.push("publicRoot");

  if (missing.length) {
    throw new Error(`Faltam variaveis obrigatorias: ${missing.join(", ")}`);
  }
}

function buildCanonicalQueryString(queryParams = {}) {
  return Object.entries(queryParams)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(String(value))}`)
    .join("&");
}

function buildSignedRequest(config, method, objectKey, queryParams = {}, payloadHash = EMPTY_PAYLOAD_HASH, extraHeaders = {}) {
  const endpoint = new URL(config.endpoint);
  const canonicalUri = `/${encodeRfc3986(config.bucket)}${objectKey ? `/${encodeObjectKey(objectKey)}` : ""}`;
  const amzDate = toAmzDate();
  const dateStamp = amzDate.slice(0, 8);
  const canonicalQueryString = buildCanonicalQueryString(queryParams);

  const headers = {
    host: endpoint.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...extraHeaders
  };

  const canonicalHeaders = Object.entries(headers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${String(value).trim()}`)
    .join("\n");

  const signedHeaders = Object.keys(headers)
    .sort((a, b) => a.localeCompare(b))
    .join(";");

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash
  ].join("\n");

  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest, "hex")
  ].join("\n");

  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, config.region, "s3");
  const signature = hmac(signingKey, stringToSign, "hex");
  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`
  ].join(", ");

  return {
    url: `${endpoint.origin}${canonicalUri}${canonicalQueryString ? `?${canonicalQueryString}` : ""}`,
    headers: {
      ...headers,
      authorization
    }
  };
}

async function requestR2(config, method, objectKey, queryParams = {}, bodyBuffer = null, extraHeaders = {}) {
  const payloadHash = bodyBuffer
    ? crypto.createHash("sha256").update(bodyBuffer).digest("hex")
    : EMPTY_PAYLOAD_HASH;
  const request = buildSignedRequest(config, method, objectKey, queryParams, payloadHash, extraHeaders);
  const response = await fetch(request.url, {
    method,
    headers: request.headers,
    body: bodyBuffer
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${method} ${objectKey || config.bucket} falhou: ${response.status} ${response.statusText} ${body}`.trim());
  }

  return response;
}

async function listAllJsonKeys(config) {
  const allKeys = [];
  let continuationToken = "";

  while (true) {
    const response = await requestR2(config, "GET", "", {
      "list-type": 2,
      prefix: config.prefix,
      "max-keys": 1000,
      "continuation-token": continuationToken || undefined
    });
    const xmlText = await response.text();
    const payload = parseR2ListResponse(xmlText);
    allKeys.push(...payload.keys.filter(key => key.toLowerCase().endsWith(".json")));

    if (!payload.isTruncated || !payload.nextContinuationToken) break;
    continuationToken = payload.nextContinuationToken;
  }

  return allKeys.sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" }));
}

function isAbsoluteAsset(value) {
  const input = String(value || "").trim();
  return /^https?:\/\//i.test(input) || input.startsWith("data:");
}

function toPublicAssetUrl(config, objectKey, rawValue) {
  const input = String(rawValue || "").trim();
  if (!input || isAbsoluteAsset(input)) return input;

  const objectDir = path.posix.dirname(objectKey);
  const cleanFileName = path.posix.basename(input.replace(/\\/g, "/"));
  if (!cleanFileName) return input;

  return `${config.publicRoot}/${objectDir.split("/").map(encodeURIComponent).join("/")}/${encodeURIComponent(cleanFileName)}`;
}

function normalizeJsonLinks(config, objectKey, value, stats) {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map(entry => {
      const normalized = normalizeJsonLinks(config, objectKey, entry, stats);
      changed = changed || normalized !== entry;
      return normalized;
    });
    return changed ? next : value;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  let changed = false;
  const next = {};

  for (const [key, entryValue] of Object.entries(value)) {
    if (TARGET_FIELDS.has(key) && typeof entryValue === "string") {
      const normalizedValue = toPublicAssetUrl(config, objectKey, entryValue);
      if (normalizedValue !== entryValue) {
        stats.replacements += 1;
        changed = true;
      }
      next[key] = normalizedValue;
      continue;
    }

    const normalizedValue = normalizeJsonLinks(config, objectKey, entryValue, stats);
    if (normalizedValue !== entryValue) {
      changed = true;
    }
    next[key] = normalizedValue;
  }

  return changed ? next : value;
}

async function runWithConcurrency(items, concurrency, worker) {
  let cursor = 0;
  const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (cursor < items.length) {
      const currentIndex = cursor;
      cursor += 1;
      await worker(items[currentIndex], currentIndex);
    }
  });
  await Promise.all(runners);
}

async function main() {
  loadDotEnv();
  const options = parseArgs(process.argv.slice(2));
  const config = loadConfig(options);
  validateConfig(config);

  const jsonKeys = await listAllJsonKeys(config);
  const summary = {
    scanned: jsonKeys.length,
    changedFiles: 0,
    replacements: 0
  };

  console.log(`JSONs encontrados em ${config.prefix}: ${summary.scanned}`);

  await runWithConcurrency(jsonKeys, config.concurrency, async objectKey => {
    const response = await requestR2(config, "GET", objectKey);
    const raw = await response.text();
    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error(`JSON invalido em ${objectKey}: ${error.message}`);
    }

    const fileStats = { replacements: 0 };
    const normalized = normalizeJsonLinks(config, objectKey, parsed, fileStats);
    if (fileStats.replacements === 0) return;

    summary.changedFiles += 1;
    summary.replacements += fileStats.replacements;
    console.log(`${config.dryRun ? "DRY" : "FIX"} ${objectKey} (${fileStats.replacements} links)`);

    if (config.dryRun) return;

    const body = Buffer.from(`${JSON.stringify(normalized, null, 2)}\n`, "utf8");
    await requestR2(
      config,
      "PUT",
      objectKey,
      {},
      body,
      { "content-type": "application/json; charset=utf-8" }
    );
  });

  console.log(
    `Concluido. JSONs escaneados: ${summary.scanned}. Arquivos alterados: ${summary.changedFiles}. Links corrigidos: ${summary.replacements}.`
  );
}

main().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});
