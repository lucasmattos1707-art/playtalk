const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_R2_PUBLIC_ROOT = 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev';
const DEFAULT_PREFIX = 'Star';
const FLASHCARD_CAMERA_OBJECT_KEY = 'FlashCards/camera.webp';

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

function buildFlashcardCameraUrl(publicRoot) {
  return `${normalizePublicRoot(publicRoot)}/${FLASHCARD_CAMERA_OBJECT_KEY}`;
}

function normalizeFlashcardImageSource(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) {
    try {
      const parsed = new URL(text);
      return String(parsed.pathname || '').replace(/^\/+/, '');
    } catch (_error) {
      return text.replace(/^\/+/, '');
    }
  }
  return text.replace(/^\/+/, '');
}

function isFlashcardCameraPlaceholder(value) {
  return normalizeFlashcardImageSource(value) === FLASHCARD_CAMERA_OBJECT_KEY;
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

function ensureParentDir(filePath) {
  ensureDir(path.dirname(filePath));
}

function safeDeckFolderName(value, fallback = 'deck') {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[^.]+$/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return normalized || fallback;
}

function isHttpLike(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function toProjectRelativePath(value) {
  const normalized = String(value || '').trim().replace(/^\/+/, '').replace(/\//g, path.sep);
  return normalized;
}

function tryResolveLocalAssetPath(rawValue, config) {
  const value = String(rawValue || '').trim();
  if (!value || isHttpLike(value) || value.startsWith('data:')) return null;

  const candidates = [
    path.join(config.projectRoot, toProjectRelativePath(value)),
    path.join(config.staticRoot, toProjectRelativePath(value))
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function rewriteDeckAssetsForBundle(payload, options) {
  const nextPayload = JSON.parse(JSON.stringify(payload || {}));
  const items = Array.isArray(nextPayload?.items) ? nextPayload.items : [];
  const copied = {
    images: 0,
    audios: 0
  };

  const copyAssetForDeck = (rawValue, kind, prefixLabel) => {
    if (kind === 'image' && isFlashcardCameraPlaceholder(rawValue)) {
      return buildFlashcardCameraUrl(options.config.publicRoot);
    }
    const localAssetPath = tryResolveLocalAssetPath(rawValue, options.config);
    if (!localAssetPath) {
      return String(rawValue || '').trim();
    }

    const extension = path.extname(localAssetPath) || (kind === 'audio' ? '.mp3' : '.webp');
    const baseName = `${prefixLabel}${extension}`;
    const targetDir = kind === 'audio' ? options.audioDir : options.imagesDir;
    const destinationPath = path.join(targetDir, baseName);
    ensureParentDir(destinationPath);
    copyFileOrThrow(localAssetPath, destinationPath);
    copied[kind === 'audio' ? 'audios' : 'images'] += 1;
    return `${options.flashcardsRootUrl}/${options.deckFolder}/${kind === 'audio' ? 'audio' : 'imagens'}/${encodeURIComponent(baseName)}`;
  };

  if (typeof nextPayload?.coverImage === 'string' && nextPayload.coverImage.trim()) {
    nextPayload.coverImage = copyAssetForDeck(nextPayload.coverImage, 'image', 'cover');
  }

  items.forEach((item, index) => {
    const itemNumber = String(index + 1).padStart(3, '0');
    if (typeof item?.imagem === 'string' && item.imagem.trim()) {
      item.imagem = copyAssetForDeck(item.imagem, 'image', `${itemNumber}-image`);
    }
    if (typeof item?.image === 'string' && item.image.trim()) {
      item.image = copyAssetForDeck(item.image, 'image', `${itemNumber}-image`);
    }
    if (typeof item?.audio === 'string' && item.audio.trim()) {
      item.audio = copyAssetForDeck(item.audio, 'audio', `${itemNumber}-audio`);
    }
    if (typeof item?.audioUrl === 'string' && item.audioUrl.trim()) {
      item.audioUrl = copyAssetForDeck(item.audioUrl, 'audio', `${itemNumber}-audio`);
    }
  });

  return { payload: nextPayload, copied };
}

function writeDeckJsonToBundle(sourcePath, originalName, config, flashcardsRootUrl, deckTitle, sourceRelativePath = '') {
  const payload = readJson(sourcePath);
  const deckFolder = safeDeckFolderName(deckTitle || payload?.title || originalName, safeDeckFolderName(originalName, 'deck'));
  const deckRootDir = path.join(config.outputDir, deckFolder);
  const jsonDir = path.join(deckRootDir, 'json');
  const imagesDir = path.join(deckRootDir, 'imagens');
  const audioDir = path.join(deckRootDir, 'audio');

  ensureDir(jsonDir);
  ensureDir(imagesDir);
  ensureDir(audioDir);

  const rewritten = rewriteDeckAssetsForBundle(payload, {
    config,
    deckFolder,
    flashcardsRootUrl,
    imagesDir,
    audioDir
  });

  const targetJsonPath = path.join(jsonDir, originalName);
  writeJson(targetJsonPath, rewritten.payload);
  const remoteJsonKey = `${config.prefix}/${deckFolder}/json/${originalName}`.replace(/\\/g, '/');

  return {
    deckFolder,
    jsonPath: `${flashcardsRootUrl}/${deckFolder}/json/${encodeURIComponent(originalName)}`,
    source: remoteJsonKey,
    localSource: String(sourceRelativePath || '').replace(/\\/g, '/').replace(/^\/+/, ''),
    copiedImages: rewritten.copied.images,
    copiedAudios: rewritten.copied.audios,
    count: Array.isArray(rewritten.payload?.items) ? rewritten.payload.items.length : 0,
    title: typeof rewritten.payload?.title === 'string' && rewritten.payload.title.trim()
      ? rewritten.payload.title.trim()
      : deckTitle || originalName
  };
}

function buildIndexHtml({ generatedAt, manifestCount, localCount, flashcardsRootUrl, prefixLabel }) {
  return [
    '<!DOCTYPE html>',
    '<html lang="pt-BR">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `  <title>PlayTalk | ${prefixLabel}</title>`,
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
    `    <h1>${prefixLabel}</h1>`,
    `    <p><strong>Gerado em:</strong> ${generatedAt}</p>`,
    `    <p><strong>Decks do manifesto:</strong> ${manifestCount}</p>`,
    `    <p><strong>Decks locais adicionais:</strong> ${localCount}</p>`,
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

  resetOutputDir(config.outputDir);

  const packagedManifestFiles = manifestFiles.map((entry) => {
    const name = path.basename(String(entry?.name || entry?.path || '').trim());
    const sourceRelativePath = String(entry?.source || path.posix.join('data', 'flashcards', '130', '001', name)).replace(/\\/g, '/').replace(/^\/+/, '');
    if (!name) {
      throw new Error('Manifesto de flashcards contem um item sem nome.');
    }

    const sourcePath = path.join(config.staticRoot, ...sourceRelativePath.split('/'));
    const deckBundle = writeDeckJsonToBundle(
      sourcePath,
      name,
      config,
      config.flashcardsRootUrl,
      entry?.title || name,
      sourceRelativePath
    );

    return {
      name,
      title: deckBundle.title,
      slug: deckBundle.deckFolder,
      source: deckBundle.source,
      path: deckBundle.jsonPath,
      size: fs.statSync(path.join(config.outputDir, deckBundle.deckFolder, 'json', name)).size,
      count: deckBundle.count,
      audioPath: `${config.flashcardsRootUrl}/${deckBundle.deckFolder}/audio/`,
      imagensPath: `${config.flashcardsRootUrl}/${deckBundle.deckFolder}/imagens/`
    };
  });

  const generatedAt = new Date().toISOString();
  writeJson(path.join(config.outputDir, 'manifest.json'), {
    generatedAt,
    files: packagedManifestFiles
  });
  fs.writeFileSync(
    path.join(config.outputDir, 'index.html'),
    buildIndexHtml({
      generatedAt,
      manifestCount: packagedManifestFiles.length,
      localCount: 0,
      flashcardsRootUrl: config.flashcardsRootUrl,
      prefixLabel: config.prefix
    }),
    'utf8'
  );

  return {
    generatedAt,
    manifestCount: packagedManifestFiles.length,
    localCount: 0,
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

  console.log(`Bundle ${config.prefix} pronto em ${bundle.outputDir}`);
  console.log(`Manifesto principal: ${bundle.manifestCount} decks`);
  console.log(`Decks locais adicionais: ${bundle.localCount} decks`);
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
