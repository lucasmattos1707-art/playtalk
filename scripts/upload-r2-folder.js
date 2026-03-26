const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseArgs(argv) {
  const options = {
    source: "",
    prefix: "",
    concurrency: 1,
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

function loadConfig(options) {
  return {
    bucket: String(process.env.R2_BUCKET_NAME || "").trim() || "playtalk-media",
    source: path.resolve(options.source || "."),
    prefix: options.prefix,
    concurrency: options.concurrency,
    dryRun: options.dryRun
  };
}

function validateConfig(config) {
  if (!config.bucket) {
    throw new Error("Falta a variavel R2_BUCKET_NAME.");
  }

  if (!fs.existsSync(config.source) || !fs.statSync(config.source).isDirectory()) {
    throw new Error(`Pasta de origem invalida: ${config.source}`);
  }
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

function putObjectWithWrangler(config, objectKey, filePath, contentType) {
  const target = `${config.bucket}/${objectKey}`;
  const command = process.platform === "win32"
    ? {
        file: "cmd.exe",
        args: [
          "/d",
          "/s",
          "/c",
          "wrangler",
          "r2",
          "object",
          "put",
          target,
          "--file",
          filePath,
          "--content-type",
          contentType,
          "--remote"
        ]
      }
    : {
        file: "wrangler",
        args: [
          "r2",
          "object",
          "put",
          target,
          "--file",
          filePath,
          "--content-type",
          contentType,
          "--remote"
        ]
      };

  const result = spawnSync(command.file, command.args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe"
  });

  if (result.error || result.status !== 0) {
    const details = [result.stdout, result.stderr]
      .map(value => String(value || "").trim())
      .filter(Boolean)
      .join("\n");
    const errorText = result.error ? `\n${result.error.message}` : "";
    throw new Error(`Falha ao enviar ${target}.${errorText}${details ? `\n${details}` : ""}`.trim());
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
  const options = parseArgs(process.argv.slice(2));
  const config = loadConfig(options);
  validateConfig(config);

  const files = (await walkFiles(config.source)).sort((a, b) => a.localeCompare(b));
  console.log(`Arquivos encontrados: ${files.length}`);
  console.log(`Origem: ${config.source}`);
  console.log(`Bucket: ${config.bucket}`);
  console.log(`Prefixo destino: ${config.prefix || "(raiz)"}`);

  let uploaded = 0;

  await runWithConcurrency(files, config.concurrency, async filePath => {
    const objectKey = toObjectKey(config, filePath);

    if (config.dryRun) {
      uploaded += 1;
      if (uploaded % 50 === 0) {
        console.log(`DRY ${uploaded}`);
      }
      return;
    }

    putObjectWithWrangler(config, objectKey, filePath, getContentType(filePath));
    uploaded += 1;
    if (uploaded % 10 === 0) {
      console.log(`PUT ${uploaded}`);
    }
  });

  console.log(`Concluido. Uploads: ${uploaded}.`);
}

main().catch(error => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
