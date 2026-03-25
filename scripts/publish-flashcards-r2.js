const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_R2_PUBLIC_ROOT = 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev';
const DEFAULT_PREFIX = 'app_flashcards';

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

function parseArgs(argv) {
  const options = {
    dryRun: false,
    skipUpload: false,
    prefix: DEFAULT_PREFIX,
    output: '',
    publicRoot: ''
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--skip-upload') {
      options.skipUpload = true;
      continue;
    }

    const [flag, ...rest] = arg.split('=');
    const rawValue = rest.join('=').trim();
    if (!rawValue) {
      continue;
    }

    if (flag === '--prefix') {
      options.prefix = rawValue.replace(/^\/+|\/+$/g, '') || DEFAULT_PREFIX;
    } else if (flag === '--output') {
      options.output = rawValue;
    } else if (flag === '--public-root') {
      options.publicRoot = rawValue.replace(/\/+$/g, '');
    }
  }

  return options;
}

function normalizePublicRoot(value) {
  const normalized = String(value || '').trim().replace(/\/+$/g, '');
  return normalized || DEFAULT_R2_PUBLIC_ROOT;
}

function buildConfig(options) {
  const projectRoot = path.join(__dirname, '..');
  const prefix = options.prefix || DEFAULT_PREFIX;
  const publicRoot = normalizePublicRoot(options.publicRoot || process.env.PLAYTALK_R2_MEDIA_BASE_URL);
  const flashcardsRootUrl = `${publicRoot}/${prefix}`;
  const outputDir = options.output
    ? path.resolve(options.output)
    : path.join(projectRoot, '.tmp', prefix);

  return {
    projectRoot,
    prefix,
    publicRoot,
    flashcardsRootUrl,
    outputDir,
    manifestPath: path.join(projectRoot, 'www', 'data', 'flashcards', '130', '001', 'manifest.json'),
    flashcardsSourceDir: path.join(projectRoot, 'www', 'data', 'flashcards', '130', '001'),
    localLevelsManifestPath: path.join(projectRoot, 'www', 'data', 'local-level-files.json'),
    staticRoot: path.join(projectRoot, 'www'),
    dryRun: options.dryRun,
    skipUpload: options.skipUpload
  };
}

function ensureDir(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function resetOutputDir(outputDir) {
  fs.rmSync(outputDir, { recursive: true, force: true });
  ensureDir(outputDir);
}

function copyFileOrThrow(sourcePath, destinationPath) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Arquivo nao encontrado: ${sourcePath}`);
  }
  fs.copyFileSync(sourcePath, destinationPath);
}

function buildIndexHtml({ generatedAt, manifestCount, othersCount, flashcardsRootUrl }) {
  return [
    '<!DOCTYPE html>',
    '<html lang="pt-BR">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '  <title>PlayTalk | app_flashcards</title>',
    '  <style>',
    '    body { font-family: "Segoe UI", sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #081322; color: #f4f8ff; }',
    '    main { width: min(720px, calc(100vw - 32px)); padding: 32px; border-radius: 24px; background: rgba(255,255,255,0.04); border: 1px solid rgba(126,208,255,0.18); }',
    '    h1 { margin: 0 0 12px; font-size: clamp(32px, 8vw, 56px); letter-spacing: 0.08em; text-transform: uppercase; }',
    '    p { margin: 0 0 10px; color: #d3e7fb; }',
    '    strong { color: #7ed0ff; }',
    '    a { color: #7ed0ff; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <main>',
    '    <h1>app_flashcards</h1>',
    `    <p><strong>Gerado em:</strong> ${generatedAt}</p>`,
    `    <p><strong>Decks do manifesto:</strong> ${manifestCount}</p>`,
    `    <p><strong>Decks extras "others":</strong> ${othersCount}</p>`,
    `    <p><strong>Base publica:</strong> <a href="${flashcardsRootUrl}/manifest.json">${flashcardsRootUrl}/manifest.json</a></p>`,
    '  </main>',
    '</body>',
    '</html>',
    ''
  ].join('\n');
}

function prepareBundle(config) {
  const manifest = readJson(config.manifestPath);
  const manifestFiles = Array.isArray(manifest?.files) ? manifest.files : [];
  const localLevels = readJson(config.localLevelsManifestPath);
  const otherFiles = Array.isArray(localLevels?.files)
    ? localLevels.files.filter((entry) => String(entry?.folder || '').trim().toLowerCase() === 'others')
    : [];

  resetOutputDir(config.outputDir);

  const copiedNames = new Set();
  const packagedManifestFiles = manifestFiles.map((entry) => {
    const name = path.basename(String(entry?.name || entry?.path || '').trim());
    if (!name) {
      throw new Error('Manifesto de flashcards contem um item sem nome.');
    }

    const sourcePath = path.join(config.flashcardsSourceDir, name);
    const destinationPath = path.join(config.outputDir, name);
    copyFileOrThrow(sourcePath, destinationPath);
    copiedNames.add(name);

    return {
      name,
      path: `${config.flashcardsRootUrl}/${encodeURIComponent(name)}`,
      size: fs.statSync(destinationPath).size
    };
  });

  const packagedOtherFiles = otherFiles.map((entry) => {
    const originalPath = String(entry?.path || '').trim().replace(/^\/+/, '');
    const name = path.basename(String(entry?.name || originalPath).trim());
    if (!name) {
      throw new Error('Manifesto local de flashcards contem um item "others" sem nome.');
    }

    const sourcePath = path.join(config.staticRoot, ...originalPath.split('/'));
    const destinationPath = path.join(config.outputDir, name);
    if (!copiedNames.has(name)) {
      copyFileOrThrow(sourcePath, destinationPath);
      copiedNames.add(name);
    }

    return {
      folder: 'others',
      name,
      day: Number(entry?.day) || 0,
      path: `${config.flashcardsRootUrl}/${encodeURIComponent(name)}`
    };
  });

  const generatedAt = new Date().toISOString();
  writeJson(path.join(config.outputDir, 'manifest.json'), {
    generatedAt,
    files: packagedManifestFiles
  });
  writeJson(path.join(config.outputDir, 'local-level-files.json'), {
    generatedAt,
    files: packagedOtherFiles
  });
  fs.writeFileSync(
    path.join(config.outputDir, 'index.html'),
    buildIndexHtml({
      generatedAt,
      manifestCount: packagedManifestFiles.length,
      othersCount: packagedOtherFiles.length,
      flashcardsRootUrl: config.flashcardsRootUrl
    }),
    'utf8'
  );

  return {
    generatedAt,
    manifestCount: packagedManifestFiles.length,
    othersCount: packagedOtherFiles.length,
    outputDir: config.outputDir
  };
}

function uploadBundle(config) {
  const uploadScriptPath = path.join(__dirname, 'upload-r2-folder.js');
  const result = spawnSync(
    process.execPath,
    [
      uploadScriptPath,
      `--source=${config.outputDir}`,
      `--prefix=${config.prefix}`
    ],
    {
      stdio: 'inherit',
      cwd: config.projectRoot,
      env: process.env
    }
  );

  if (result.status !== 0) {
    throw new Error(`Falha ao publicar ${config.prefix} no R2.`);
  }
}

function main() {
  loadDotEnv();
  const options = parseArgs(process.argv.slice(2));
  const config = buildConfig(options);
  const bundle = prepareBundle(config);

  console.log(`Bundle app_flashcards pronto em ${bundle.outputDir}`);
  console.log(`Manifesto principal: ${bundle.manifestCount} decks`);
  console.log(`Manifesto extras "others": ${bundle.othersCount} decks`);
  console.log(`Base publica: ${config.flashcardsRootUrl}`);

  if (config.dryRun || config.skipUpload) {
    console.log(config.dryRun
      ? 'Dry run finalizado sem upload.'
      : 'Bundle gerado localmente sem upload.');
    return;
  }

  uploadBundle(config);
  console.log('Publicacao no R2 concluida com sucesso.');
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
