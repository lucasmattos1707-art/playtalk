const fs = require('fs/promises');
const path = require('path');

const rootDir = __dirname;
const sourceDir = path.join(rootDir, 'www');
const outputDirs = [
  path.join(rootDir, 'public'),
  path.join(rootDir, 'dist')
];
const appHtmlFiles = new Set([
  'index.html',
  'auth.html',
  'landing.html',
  'flashcards.html',
  'allcards.html',
  'users.html',
  'account.html',
  'books.html',
  'speaking.html',
  'username.html',
  'usermame.html',
  'avataradd.html',
  'password.html',
  'premium.html',
  'thata.html'
]);
const rootStaticFiles = [
  'arquivos-codex/fluentlevelup.png'
];
const rootStaticDirectories = [
  {
    source: 'musicas',
    destination: 'eventos'
  },
  {
    source: 'accesskey',
    destination: 'accesskey'
  },
  {
    source: 'audiostuto',
    destination: 'audiostuto'
  },
  {
    source: 'selos',
    destination: 'selos'
  },
  {
    source: 'newsongs',
    destination: 'newsongs'
  },
  {
    source: 'newfonts',
    destination: 'newfonts'
  }
];

async function removeDir(target) {
  await fs.rm(target, { recursive: true, force: true });
}

async function ensureDir(target) {
  await fs.mkdir(target, { recursive: true });
}

async function copyRecursive(source, destination) {
  const stats = await fs.stat(source);
  const relativeSource = path.relative(sourceDir, source);
  const relativeFromRoot = path.relative(rootDir, source).split(path.sep).join('/');

  if (stats.isDirectory()) {
    await ensureDir(destination);
    const entries = await fs.readdir(source);
    for (const entry of entries) {
      await copyRecursive(path.join(source, entry), path.join(destination, entry));
    }
  } else {
    if (relativeFromRoot.startsWith('accesskey/teclas/Teclas/') && relativeFromRoot.toLowerCase().endsWith('.mp4')) {
      return;
    }

    if (relativeSource && !relativeSource.startsWith('..')) {
      const normalizedRelative = relativeSource.split(path.sep).join('/');
      const isTopLevelHtml = !normalizedRelative.includes('/') && normalizedRelative.toLowerCase().endsWith('.html');
      if (isTopLevelHtml && !appHtmlFiles.has(normalizedRelative)) {
        return;
      }
    }

    await ensureDir(path.dirname(destination));
    await fs.copyFile(source, destination);
  }
}

async function build() {
  console.log('Cleaning output directories...');
  for (const outputDir of outputDirs) {
    await removeDir(outputDir);
    await ensureDir(outputDir);
  }

  try {
    for (const outputDir of outputDirs) {
      await copyRecursive(sourceDir, outputDir);
      console.log(`Copied www/ to ${path.basename(outputDir)}/.`);

      for (const file of rootStaticFiles) {
        const sourceFile = path.join(rootDir, file);
        try {
          await copyRecursive(sourceFile, path.join(outputDir, file));
          console.log(`Copied ${file} to ${path.basename(outputDir)}/.`);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            throw error;
          }
        }
      }

      for (const directory of rootStaticDirectories) {
        const sourceDirectory = path.join(rootDir, directory.source);
        try {
          await copyRecursive(sourceDirectory, path.join(outputDir, directory.destination));
          console.log(`Copied ${directory.source}/ to ${path.basename(outputDir)}/${directory.destination}/.`);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            throw error;
          }
        }
      }
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn('Directory not found: www/, skipping.');
    } else {
      throw error;
    }
  }

  console.log('Static build created at public/ and dist/.');
}

build().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
