'use strict';

const DEFAULT_MAX_LINE_LENGTH = 500;
const MAX_SEGMENTS_PER_LINE = 1;
const MAX_GROUP_GAP_SECONDS = 2.5;

function canonicalTranscriptionText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function isInstrumentalPlaceholder(value) {
  const raw = String(value || '').trim();
  if (!raw || /^[\s♪♫♬♩….-]+$/u.test(raw)) return true;
  const canonical = canonicalTranscriptionText(raw);
  return /^(?:music|musica|instrumental|som instrumental|trilha instrumental|musica instrumental)$/i.test(canonical)
    || /^(?:aplausos|applause|silencio|silence)$/i.test(canonical);
}

function finiteMetric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function filterMusicalKellyTranscriptionSegments(rawSegments) {
  const candidates = (Array.isArray(rawSegments) ? rawSegments : [])
    .map((segment, sourceIndex) => {
      const start = finiteMetric(segment?.start);
      const end = finiteMetric(segment?.end);
      return {
        sourceId: sourceIndex,
        start: start === null ? 0 : Math.max(0, start),
        end: end === null ? 0 : Math.max(0, end),
        text: String(segment?.text || '').trim().replace(/\s+/g, ' '),
        avgLogprob: finiteMetric(segment?.avg_logprob),
        compressionRatio: finiteMetric(segment?.compression_ratio),
        noSpeechProbability: finiteMetric(segment?.no_speech_prob),
        temperature: finiteMetric(segment?.temperature)
      };
    })
    .filter((segment) => segment.text && segment.end > segment.start);

  const accepted = [];
  const discarded = [];
  const acceptedTextCounts = new Map();

  for (const segment of candidates) {
    const canonical = canonicalTranscriptionText(segment.text);
    const priorAcceptedCount = acceptedTextCounts.get(canonical) || 0;
    let reason = '';

    if (!canonical || isInstrumentalPlaceholder(segment.text)) {
      reason = 'instrumental-placeholder';
    } else if (segment.avgLogprob !== null && segment.avgLogprob < -1) {
      reason = 'low-log-probability';
    } else if (segment.compressionRatio !== null && segment.compressionRatio > 2.4) {
      reason = 'failed-compression-ratio';
    } else if (segment.noSpeechProbability !== null && segment.noSpeechProbability >= 0.8) {
      reason = 'high-no-speech-probability';
    } else if (
      segment.noSpeechProbability !== null
      && segment.noSpeechProbability >= 0.6
      && ((segment.temperature !== null && segment.temperature >= 0.4) || priorAcceptedCount > 0)
    ) {
      reason = 'low-confidence-repetition';
    }

    if (reason) {
      discarded.push({ ...segment, reason });
      continue;
    }

    accepted.push(segment);
    acceptedTextCounts.set(canonical, priorAcceptedCount + 1);
  }

  return { accepted, discarded };
}

function consecutiveGroundingSegments(sourceIds, segmentById, positionById) {
  if (!Array.isArray(sourceIds) || sourceIds.length !== MAX_SEGMENTS_PER_LINE) return null;
  const uniqueIds = [...new Set(sourceIds.map(Number))];
  if (uniqueIds.length !== sourceIds.length || uniqueIds.some((id) => !Number.isInteger(id))) return null;
  const segments = uniqueIds.map((id) => segmentById.get(id));
  if (segments.some((segment) => !segment)) return null;
  for (let index = 1; index < segments.length; index += 1) {
    const previousPosition = positionById.get(uniqueIds[index - 1]);
    const position = positionById.get(uniqueIds[index]);
    if (position !== previousPosition + 1) return null;
    if (segments[index].start - segments[index - 1].end > MAX_GROUP_GAP_SECONDS) return null;
  }
  return segments;
}

function buildGroundedMusicalKellyLines(structuredLines, acceptedSegments, options = {}) {
  const maxLineLength = Math.max(1, Number(options.maxLineLength) || DEFAULT_MAX_LINE_LENGTH);
  const segments = Array.isArray(acceptedSegments) ? acceptedSegments : [];
  const segmentById = new Map(segments.map((segment) => [segment.sourceId, segment]));
  const positionById = new Map(segments.map((segment, index) => [segment.sourceId, index]));
  const usedIds = new Set();
  const grounded = [];

  for (const proposal of Array.isArray(structuredLines) ? structuredLines : []) {
    const sourceIds = Array.isArray(proposal?.sourceSegmentIds) ? proposal.sourceSegmentIds : [];
    const sourceSegments = consecutiveGroundingSegments(sourceIds, segmentById, positionById);
    if (!sourceSegments || sourceIds.some((id) => usedIds.has(Number(id)))) continue;
    const text = sourceSegments.map((segment) => segment.text).join(' ').replace(/\s+/g, ' ').trim();
    if (!text || text.length > maxLineLength) continue;
    sourceIds.forEach((id) => usedIds.add(Number(id)));
    grounded.push({
      order: positionById.get(Number(sourceIds[0])),
      speaker: String(proposal?.speaker || '').trim().slice(0, 80),
      text,
      start: sourceSegments[0].start,
      end: sourceSegments[sourceSegments.length - 1].end
    });
  }

  for (const [order, segment] of segments.entries()) {
    if (usedIds.has(segment.sourceId)) continue;
    grounded.push({
      order,
      speaker: '',
      text: segment.text.slice(0, maxLineLength),
      start: segment.start,
      end: segment.end
    });
  }

  return grounded
    .sort((left, right) => left.order - right.order)
    .map((line, index) => ({
      id: `line-${index + 1}`,
      speaker: line.speaker,
      characterId: '',
      text: line.text,
      start: line.start,
      end: line.end
    }));
}

module.exports = {
  buildGroundedMusicalKellyLines,
  canonicalTranscriptionText,
  filterMusicalKellyTranscriptionSegments,
  isInstrumentalPlaceholder
};
