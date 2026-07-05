const fs = require('fs');
const path = require('path');
const {
  S3Client,
  PutObjectCommand
} = require('@aws-sdk/client-s3');

function loadDotEnv() {
  const envPath = path.join(__dirname, '..', '.env');
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
}

function buildClient() {
  const bucket = String(process.env.R2_BUCKET_NAME || '').trim();
  const endpoint = String(process.env.R2_ENDPOINT || '').trim();
  const accessKeyId = String(process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || '').trim();

  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('Faltam variaveis R2 no ambiente: R2_BUCKET_NAME, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.');
  }

  return {
    bucket,
    client: new S3Client({
      region: 'auto',
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    })
  };
}

function parseArgs(argv) {
  const options = {
    source: path.join(__dirname, '..', 'www', 'radios', 'estacao-1'),
    prefix: 'radios/estações/Estação 1'
  };

  for (const arg of argv) {
    const [flag, ...rest] = arg.split('=');
    const rawValue = rest.join('=').trim();
    if (!rawValue) continue;
    if (flag === '--source') {
      options.source = path.resolve(rawValue);
    } else if (flag === '--prefix') {
      options.prefix = rawValue.replace(/^\/+|\/+$/g, '');
    }
  }

  return options;
}

function getContentType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case '.mp3':
      return 'audio/mpeg';
    case '.wav':
      return 'audio/wav';
    default:
      return 'application/octet-stream';
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
  return files.sort((a, b) => a.localeCompare(b));
}

async function main() {
  loadDotEnv();
  const options = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(options.source)) {
    throw new Error(`Pasta de origem invalida: ${options.source}`);
  }

  const { bucket, client } = buildClient();
  const files = await walkFiles(options.source);
  console.log(`Arquivos encontrados: ${files.length}`);
  console.log(`Origem: ${options.source}`);
  console.log(`Bucket: ${bucket}`);
  console.log(`Prefixo destino: ${options.prefix}`);

  let uploaded = 0;
  for (const filePath of files) {
    const key = `${options.prefix}/${path.basename(filePath)}`;
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fs.createReadStream(filePath),
      ContentType: getContentType(filePath)
    }));
    uploaded += 1;
    console.log(`PUT ${uploaded} ${key}`);
  }

  console.log(`Concluido. Uploads: ${uploaded}.`);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
