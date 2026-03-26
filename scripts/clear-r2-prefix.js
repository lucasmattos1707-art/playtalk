const fs = require('fs');
const path = require('path');
const {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand
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

function parseArgs(argv) {
  const options = {
    prefix: 'FlashCards/',
    dryRun: false
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    const [flag, ...rest] = arg.split('=');
    const rawValue = rest.join('=').trim();
    if (!rawValue) continue;
    if (flag === '--prefix') {
      options.prefix = rawValue.replace(/^\/+/, '');
    }
  }

  if (!options.prefix.endsWith('/')) {
    options.prefix += '/';
  }

  return options;
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

async function listAllKeys(client, bucket, prefix) {
  const keys = [];
  let continuationToken = undefined;

  while (true) {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 1000,
      ContinuationToken: continuationToken
    }));
    const contents = Array.isArray(response?.Contents) ? response.Contents : [];
    keys.push(...contents.map((entry) => String(entry?.Key || '').trim()).filter(Boolean));
    if (!response?.IsTruncated || !response?.NextContinuationToken) {
      break;
    }
    continuationToken = response.NextContinuationToken;
  }

  return keys;
}

async function main() {
  loadDotEnv();
  const options = parseArgs(process.argv.slice(2));
  const { bucket, client } = buildClient();
  const keys = await listAllKeys(client, bucket, options.prefix);

  console.log(`Bucket: ${bucket}`);
  console.log(`Prefixo: ${options.prefix}`);
  console.log(`Objetos encontrados: ${keys.length}`);

  if (!keys.length) {
    console.log('Nada para apagar.');
    return;
  }

  const preview = keys.slice(0, 10);
  preview.forEach((key) => console.log(`- ${key}`));
  if (keys.length > preview.length) {
    console.log(`... e mais ${keys.length - preview.length} objetos`);
  }

  if (options.dryRun) {
    console.log('Dry run finalizado sem apagar objetos.');
    return;
  }

  let deleted = 0;
  for (const key of keys) {
    await client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    }));
    deleted += 1;
    if (deleted % 25 === 0) {
      console.log(`DELETE ${deleted}`);
    }
  }

  console.log(`Concluido. Objetos apagados: ${deleted}.`);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
