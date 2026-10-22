const { parentPort } = require('node:worker_threads');

global.MPEGMode = require('lamejs/src/js/MPEGMode.js');
global.Lame = require('lamejs/src/js/Lame.js');
global.BitStream = require('lamejs/src/js/BitStream.js');
const lamejs = require('lamejs');

async function encodeMp3(channelData, sampleRate) {
  const channels = Math.max(1, Math.min(2, channelData.length));
  const length = Number(channelData[0]?.length) || 0;
  if (!length || !sampleRate) throw new Error('Não foi possível preparar o áudio para o corte.');
  const encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128);
  const chunks = [];
  const frameSize = 1152;
  const toInt16 = (source, start, end) => {
    const result = new Int16Array(end - start);
    for (let index = start; index < end; index += 1) {
      const value = Math.max(-1, Math.min(1, Number(source[index]) || 0));
      result[index - start] = value < 0 ? Math.round(value * 32768) : Math.round(value * 32767);
    }
    return result;
  };
  for (let start = 0; start < length; start += frameSize) {
    const end = Math.min(length, start + frameSize);
    const left = toInt16(channelData[0], start, end);
    const right = channels > 1 ? toInt16(channelData[1], start, end) : undefined;
    const encoded = right ? encoder.encodeBuffer(left, right) : encoder.encodeBuffer(left);
    if (encoded.length) chunks.push(Buffer.from(encoded));
  }
  const flushed = encoder.flush();
  if (flushed.length) chunks.push(Buffer.from(flushed));
  return Buffer.concat(chunks);
}

async function cut(sourceBuffer, cuts) {
  const decoder = await import('@audio/decode-mp3');
  const decoded = await decoder.default(new Uint8Array(sourceBuffer));
  const sampleRate = Number(decoded?.sampleRate) || 0;
  const channels = (Array.isArray(decoded?.channelData) ? decoded.channelData : []).slice(0, 2);
  const totalFrames = Number(channels[0]?.length) || 0;
  if (!sampleRate || !totalFrames || !channels.length) throw new Error('Não foi possível ler o MP3 para o corte.');
  const ranges = cuts.map((entry) => ({
    start: Math.round(entry.startSeconds * sampleRate),
    end: Math.round(entry.endSeconds * sampleRate)
  })).sort((left, right) => left.start - right.start);
  let removedFrames = 0;
  let previousEnd = 0;
  for (const range of ranges) {
    if (range.start < previousEnd || range.start < 0 || range.end > totalFrames
      || range.end - range.start < Math.max(1, Math.round(sampleRate * 0.05))) {
      const error = new Error('Os pontos de corte estão sobrepostos ou fora da duração da faixa.');
      error.statusCode = 400;
      throw error;
    }
    removedFrames += range.end - range.start;
    previousEnd = range.end;
  }
  const keptFrames = totalFrames - removedFrames;
  if (keptFrames <= 0) {
    const error = new Error('A faixa precisa manter algum áudio após os cortes.');
    error.statusCode = 400;
    throw error;
  }
  const outputChannels = channels.map((source) => {
    const output = new Float32Array(keptFrames);
    let previous = 0;
    let offset = 0;
    for (const range of ranges) {
      output.set(source.subarray(previous, range.start), offset);
      offset += range.start - previous;
      previous = range.end;
    }
    output.set(source.subarray(previous), offset);
    return output;
  });
  return encodeMp3(outputChannels, sampleRate);
}

parentPort.on('message', async ({ sourceBuffer, cuts }) => {
  try {
    const result = await cut(sourceBuffer, cuts);
    const transferable = result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength);
    parentPort.postMessage({ ok: true, buffer: transferable }, [transferable]);
  } catch (error) {
    parentPort.postMessage({ ok: false, message: error?.message || 'Não foi possível cortar o áudio.', statusCode: error?.statusCode || 500 });
  }
});
