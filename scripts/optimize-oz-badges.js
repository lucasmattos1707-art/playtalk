const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const sourceDir = process.argv[2] || 'C:/Users/Lucas/Documents/Codex/Selos';
const outputDir = process.argv[3] || path.join(__dirname, '..', 'www', 'oz', 'badges');

async function optimizeBadges() {
  await fs.mkdir(outputDir, { recursive: true });
  const jobs = Array.from({ length: 40 }, (_, index) => index + 1).map(async (number) => {
    const sourceNumber = number <= 16 ? number : number + 2;
    const sourceName = `${String(sourceNumber).padStart(2, '0')}.png`;
    const outputName = `${String(number).padStart(2, '0')}.webp`;
    const source = path.join(sourceDir, sourceName);
    const output = path.join(outputDir, outputName);
    try {
      await fs.access(output);
      return { sourceName, outputName, reused: true };
    } catch (_error) {}
    await sharp(source)
      .resize(500, 600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 6, smartSubsample: true })
      .toFile(output);
    return { sourceName, outputName, reused: false };
  });
  const outputs = await Promise.all(jobs);
  console.log(JSON.stringify({ outputDir, outputs }, null, 2));
}

optimizeBadges().catch((error) => {
  console.error(error);
  process.exit(1);
});
