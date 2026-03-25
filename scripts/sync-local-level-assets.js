const fs = require('fs/promises');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const sourceRoot = path.join(rootDir, 'Niveis');
const targetRoot = path.join(rootDir, 'www', 'Niveis');
const manifestPath = path.join(rootDir, 'www', 'data', 'local-level-files.json');
const allowedFolders = ['others', 'talking', 'watching', 'words'];

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function removeDir(dirPath) {
  await fs.rm(dirPath, { recursive: true, force: true });
}

async function copyRecursive(sourcePath, targetPath) {
  const stats = await fs.stat(sourcePath);
  if (stats.isDirectory()) {
    await ensureDir(targetPath);
    const entries = await fs.readdir(sourcePath, { withFileTypes: true });
    for (const entry of entries) {
      await copyRecursive(
        path.join(sourcePath, entry.name),
        path.join(targetPath, entry.name)
      );
    }
    return;
  }

  await ensureDir(path.dirname(targetPath));
  await fs.copyFile(sourcePath, targetPath);
}

function extractDayNumber(fileName) {
  const match = String(fileName || '').match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

async function collectManifestEntries() {
  const files = [];

  for (const folder of allowedFolders) {
    const folderPath = path.join(sourceRoot, folder);
    let entries = [];

    try {
      entries = await fs.readdir(folderPath, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    entries
      .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
      .forEach(entry => {
        files.push({
          folder,
          name: entry.name,
          day: extractDayNumber(entry.name),
          path: `Niveis/${folder}/${entry.name}`.replace(/\\/g, '/')
        });
      });
  }

  return files.sort((left, right) => {
    if (left.folder !== right.folder) {
      return left.folder.localeCompare(right.folder, 'pt-BR');
    }
    const leftDay = Number.isFinite(left.day) ? left.day : Number.MAX_SAFE_INTEGER;
    const rightDay = Number.isFinite(right.day) ? right.day : Number.MAX_SAFE_INTEGER;
    if (leftDay !== rightDay) {
      return leftDay - rightDay;
    }
    return left.name.localeCompare(right.name, 'pt-BR');
  });
}

async function main() {
  await removeDir(targetRoot);
  await ensureDir(targetRoot);

  for (const folder of allowedFolders) {
    const sourcePath = path.join(sourceRoot, folder);
    const targetPath = path.join(targetRoot, folder);
    try {
      await copyRecursive(sourcePath, targetPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  const files = await collectManifestEntries();
  await ensureDir(path.dirname(manifestPath));
  await fs.writeFile(
    manifestPath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), files }, null, 2)}\n`,
    'utf8'
  );

  console.log(`Synced ${files.length} local level file(s) into www/Niveis.`);
}

main().catch(error => {
  console.error('Failed to sync local level assets:', error);
  process.exit(1);
});
