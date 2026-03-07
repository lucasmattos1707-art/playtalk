const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const watchDirs = ['www']
  .map((relative) => path.join(rootDir, relative))
  .filter((dir) => fs.existsSync(dir));

if (!watchDirs.length) {
  console.error('Nenhuma pasta para observar foi encontrada. Esperado: www/');
  process.exit(1);
}

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
let updateRunning = false;
let updateQueued = false;
let debounceTimer = null;
const watchers = [];

function runAndroidUpdate(reason) {
  if (updateRunning) {
    updateQueued = true;
    return;
  }

  updateRunning = true;
  console.log(`[auto-sync] Rodando android:update (${reason})...`);

  const child = spawn(npmCmd, ['run', 'android:update'], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  child.on('exit', (code) => {
    updateRunning = false;
    if (code === 0) {
      console.log('[auto-sync] Sync concluido com sucesso.');
    } else {
      console.error(`[auto-sync] android:update falhou com codigo ${code}.`);
    }

    if (updateQueued) {
      updateQueued = false;
      runAndroidUpdate('mudancas em fila');
    }
  });
}

function scheduleUpdate(fileName) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    runAndroidUpdate(`alteracao detectada: ${fileName || 'arquivo desconhecido'}`);
  }, 350);
}

for (const dir of watchDirs) {
  const watcher = fs.watch(dir, { recursive: true }, (_eventType, fileName) => {
    const normalized = String(fileName || '');
    if (!normalized) return;
    scheduleUpdate(normalized);
  });
  watchers.push(watcher);
  console.log(`[auto-sync] Observando: ${path.relative(rootDir, dir)}`);
}

runAndroidUpdate('inicial');

process.on('SIGINT', () => {
  console.log('\n[auto-sync] Encerrando...');
  watchers.forEach((watcher) => watcher.close());
  process.exit(0);
});
