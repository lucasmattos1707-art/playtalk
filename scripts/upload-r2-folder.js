const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const EMPTY_PAYLOAD_HASH = crypto.createHash("sha256").update("").digest("hex");

function loadDotEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
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
    source: "",
    prefix: "",
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
    if (!rawValue) {
      continue;
    }

    if (flag === "--source") {
      options.source = rawValue;
    } else if (flag === "--prefix") {
      options.prefix = rawValue.replace(/^\/+|\/+$/g, "");
    } else if (flag === "--concurrency") {
      options.concurrency = parseInteger(rawValue, options.concurrency);
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
    source: path.resolve(options.source || "."),
    prefix: options.prefix,
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

  if (missing.length) {
    throw new Error(`Faltam variaveis obrigatorias: ${missing.join(", ")}`);
  }

  if (!fs.existsSync(config.source) || !fs.statSync(config.source).isDirectory()) {
    throw new Error(`Pasta de origem invalida: ${config.source}`);
  }
}

function buildSignedHeaders(config, method, objectKey, payloadHash, extraHeaders = {}) {
  const endpoint = new URL(config.endpoint);
  const canonicalUri = `/${encodeRfc3986(config.bucket)}/${encodeObjectKey(objectKey)}`;
  const amzDate = toAmzDate();
  const dateStamp = amzDate.slice(0, 8);

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
    "",
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

  const signingKey = getSignatureKey(
    config.secretAccessKey,
    dateStamp,
    config.region,
    "s3"
  );

  const signature = hmac(signingKey, stringToSign, "hex");
  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`
  ].join(", ");

  return {
    url: `${endpoint.origin}${canonicalUri}`,
    headers: {
      ...headers,
      authorization
    }
  };
}

function getContentType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".webp":
      return "image/webp";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    default:
      return "application/octet-stream";
  }
}

async function walkFiles(directory) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(fullPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function toObjectKey(config, filePath) {
  const relativePath = path.relative(config.source, filePath).split(path.sep).join("/");
  return config.prefix ? `${config.prefix}/${relativePath}` : relativePath;
}

async function headObject(config, objectKey) {
  const requestConfig = buildSignedHeaders(config, "HEAD", objectKey, EMPTY_PAYLOAD_HASH);
  const response = await fetch(requestConfig.url, {
    method: "HEAD",
    headers: requestConfig.headers
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`HEAD ${objectKey} falhou: ${response.status} ${response.statusText} ${message}`.trim());
  }

  return {
    etag: String(response.headers.get("etag") || "").replace(/"/g, ""),
    contentLength: Number.parseInt(response.headers.get("content-length") || "", 10)
  };
}

async function putObject(config, objectKey, buffer, contentType) {
  const payloadHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const requestConfig = buildSignedHeaders(config, "PUT", objectKey, payloadHash, {
    "content-type": contentType
  });

  const response = await fetch(requestConfig.url, {
    method: "PUT",
    headers: requestConfig.headers,
    body: buffer
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`PUT ${objectKey} falhou: ${response.status} ${response.statusText} ${message}`.trim());
  }
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

  const files = (await walkFiles(config.source)).sort((a, b) => a.localeCompare(b));
  console.log(`Arquivos encontrados: ${files.length}`);
  console.log(`Origem: ${config.source}`);
  console.log(`Bucket: ${config.bucket}`);
  console.log(`Prefixo destino: ${config.prefix || "(raiz)"}`);

  const summary = {
    uploaded: 0,
    skipped: 0
  };

  await runWithConcurrency(files, config.concurrency, async filePath => {
    const objectKey = toObjectKey(config, filePath);
    const buffer = await fs.promises.readFile(filePath);
    const localHash = crypto.createHash("md5").update(buffer).digest("hex");
    const remote = await headObject(config, objectKey);

    if (remote && remote.etag && remote.etag.toLowerCase() === localHash.toLowerCase()) {
      summary.skipped += 1;
      if (summary.skipped % 250 === 0) { console.log(`SKIP ${summary.skipped}`); }
      return;
    }

    if (config.dryRun) {
      summary.uploaded += 1;
      if (summary.uploaded % 250 === 0) { console.log(`DRY ${summary.uploaded}`); }
      return;
    }

    await putObject(config, objectKey, buffer, getContentType(filePath));
    summary.uploaded += 1;
    if (summary.uploaded % 50 === 0) { console.log(`PUT ${summary.uploaded}`); }
  });

  console.log(`Concluido. Uploads: ${summary.uploaded}. Pulados: ${summary.skipped}.`);
}

main().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});

