'use strict';

function normalizeCompletedRoundScores(lines, scores, maxLines = 600) {
  if (!Array.isArray(lines) || !lines.length || lines.length > maxLines
    || !scores || typeof scores !== 'object' || Array.isArray(scores)) return null;
  const lineIds = lines.map((line) => String(line?.id || ''));
  if (lineIds.some((id) => !id) || new Set(lineIds).size !== lineIds.length
    || Object.keys(scores).length !== lineIds.length) return null;
  for (const id of lineIds) {
    if (!Object.hasOwn(scores, id) || !Number.isInteger(scores[id])
      || scores[id] < 0 || scores[id] > 100) return null;
  }
  return Object.fromEntries(lineIds.map((id) => [id, scores[id]]));
}

module.exports = { normalizeCompletedRoundScores };
