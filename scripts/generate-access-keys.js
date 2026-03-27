const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ACCESSKEY_DIR = path.join(ROOT, 'accesskey');
const ALPHABET = 'ABCDEFGHIJKLMNOP';
const COUNT_PER_FILE = 200;
const CODE_LENGTH = 6;
const DEFINITIONS = [
  { fileName: 'semana.json', type: 'semana', durationDays: 7 },
  { fileName: 'mes.json', type: 'mes', durationDays: 30 },
  { fileName: 'ano.json', type: 'ano', durationDays: 365 }
];

function randomCode(length = CODE_LENGTH) {
  let result = '';
  for (let index = 0; index < length; index += 1) {
    const next = Math.floor(Math.random() * ALPHABET.length);
    result += ALPHABET[next];
  }
  return result;
}

function generateUniqueCodes(existing, amount) {
  const codes = [];
  while (codes.length < amount) {
    const code = randomCode(CODE_LENGTH);
    if (existing.has(code)) continue;
    existing.add(code);
    codes.push(code);
  }
  return codes;
}

async function main() {
  await fs.promises.mkdir(ACCESSKEY_DIR, { recursive: true });
  const usedCodes = new Set();

  for (const definition of DEFINITIONS) {
    let keys = [];
    const outputPath = path.join(ACCESSKEY_DIR, definition.fileName);
    if (fs.existsSync(outputPath)) {
      try {
        const raw = JSON.parse(await fs.promises.readFile(outputPath, 'utf8'));
        const existing = Array.isArray(raw?.keys) ? raw.keys : [];
        keys = existing
          .map((entry) => String(entry || '').trim().toUpperCase())
          .filter(Boolean)
          .map((entry) => entry.slice(0, CODE_LENGTH))
          .filter((entry) => entry.length === CODE_LENGTH)
          .filter((entry, index, list) => list.indexOf(entry) === index);
        keys.forEach((code) => usedCodes.add(code));
      } catch (_error) {
        keys = [];
      }
    }
    while (keys.length < COUNT_PER_FILE) {
      keys.push(...generateUniqueCodes(usedCodes, 1));
    }
    keys = keys.slice(0, COUNT_PER_FILE);
    const payload = {
      type: definition.type,
      durationDays: definition.durationDays,
      generatedAt: new Date().toISOString(),
      keys
    };
    await fs.promises.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    console.log(`Gerado ${definition.fileName} com ${keys.length} chaves.`);
  }
}

main().catch((error) => {
  console.error('Falha ao gerar chaves de acesso:', error);
  process.exitCode = 1;
});
