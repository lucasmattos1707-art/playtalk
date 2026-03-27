const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ACCESSKEY_DIR = path.join(ROOT, 'accesskey');
const ALPHABET = 'ABCDEFGHIJKLMNOP';
const COUNT_PER_FILE = 200;
const DEFINITIONS = [
  { fileName: 'semana.json', type: 'semana', durationDays: 7 },
  { fileName: 'mes.json', type: 'mes', durationDays: 30 },
  { fileName: 'ano.json', type: 'ano', durationDays: 365 }
];

function randomCode(length = 7) {
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
    const code = randomCode(7);
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
    const keys = generateUniqueCodes(usedCodes, COUNT_PER_FILE);
    const payload = {
      type: definition.type,
      durationDays: definition.durationDays,
      generatedAt: new Date().toISOString(),
      keys
    };
    const outputPath = path.join(ACCESSKEY_DIR, definition.fileName);
    await fs.promises.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    console.log(`Gerado ${definition.fileName} com ${keys.length} chaves.`);
  }
}

main().catch((error) => {
  console.error('Falha ao gerar chaves de acesso:', error);
  process.exitCode = 1;
});
