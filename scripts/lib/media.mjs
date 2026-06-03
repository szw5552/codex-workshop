import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnFile, commandExists } from './process.mjs';
import { ensureDir, pathExists } from './fs-utils.mjs';

export const MAX_UPLOAD_BYTES = 23 * 1024 * 1024;

export async function assertMediaTools() {
  const missing = [];
  for (const command of ['ffmpeg', 'ffprobe']) {
    if (!(await commandExists(command))) missing.push(command);
  }
  if (missing.length) throw new Error(`Missing required media tool(s): ${missing.join(', ')}`);
}

export async function getAudioDuration(filePath) {
  const { stdout } = await spawnFile('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);
  const duration = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Could not read duration for ${filePath}`);
  return duration;
}

export async function prepareAudioChunks(audioFile, workDir) {
  await assertMediaTools();
  await ensureDir(workDir);
  const normalized = path.join(workDir, `${path.parse(audioFile.name).name}.flac`);
  await spawnFile('ffmpeg', ['-y', '-i', audioFile.path, '-ar', '16000', '-ac', '1', '-map', '0:a:0', '-c:a', 'flac', normalized]);
  const stat = await fs.stat(normalized);
  if (stat.size <= MAX_UPLOAD_BYTES) return [{ path: normalized, label: audioFile.name, start: 0 }];

  const duration = await getAudioDuration(normalized);
  const estimatedSeconds = Math.max(30, Math.floor((duration * MAX_UPLOAD_BYTES * 0.82) / stat.size));
  const overlap = 1;
  const chunks = [];
  let start = 0;
  let index = 1;

  while (start < duration) {
    let chunkSeconds = Math.min(estimatedSeconds, duration - start);
    let output = path.join(workDir, `${path.parse(audioFile.name).name}-part-${String(index).padStart(3, '0')}.flac`);

    for (let attempt = 0; attempt < 6; attempt += 1) {
      await spawnFile('ffmpeg', ['-y', '-ss', String(Math.max(0, start)), '-t', String(chunkSeconds), '-i', normalized, '-ar', '16000', '-ac', '1', '-c:a', 'flac', output]);
      const chunkStat = await fs.stat(output);
      if (chunkStat.size <= MAX_UPLOAD_BYTES) break;
      chunkSeconds = Math.max(10, Math.floor(chunkSeconds * 0.75));
      if (attempt === 5) throw new Error(`Unable to make chunk under ${MAX_UPLOAD_BYTES} bytes for ${audioFile.name}`);
    }

    chunks.push({ path: output, label: `${audioFile.name} part ${index}`, start });
    if (start + chunkSeconds >= duration) break;
    start += Math.max(1, chunkSeconds - overlap);
    index += 1;
  }

  return chunks;
}

export async function imageDimensions(filePath) {
  if (await commandExists('sips')) {
    try {
      const { stdout } = await spawnFile('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', filePath]);
      const width = Number(stdout.match(/pixelWidth:\s*(\d+)/)?.[1]);
      const height = Number(stdout.match(/pixelHeight:\s*(\d+)/)?.[1]);
      if (width && height) return { width, height };
    } catch {}
  }

  if (await commandExists('magick')) {
    const { stdout } = await spawnFile('magick', ['identify', '-format', '%w %h', filePath]);
    const [width, height] = stdout.trim().split(/\s+/).map(Number);
    if (width && height) return { width, height };
  }

  return { width: 1600, height: 1000 };
}

export async function convertPhotoToWebp(photoFile, outputPath) {
  await ensureDir(path.dirname(outputPath));
  const ext = path.extname(photoFile.name).toLowerCase();

  if (await commandExists('magick')) {
    try {
      await spawnFile('magick', [photoFile.path, '-auto-orient', '-resize', '2400x2400>', '-quality', '86', outputPath]);
      return imageDimensions(outputPath);
    } catch (error) {
      if (!['.heic', '.heif'].includes(ext)) throw error;
    }
  }

  if (['.heic', '.heif'].includes(ext) && (await commandExists('heif-convert')) && (await commandExists('magick'))) {
    const tempJpg = `${outputPath}.jpg`;
    await spawnFile('heif-convert', [photoFile.path, tempJpg]);
    await spawnFile('magick', [tempJpg, '-auto-orient', '-resize', '2400x2400>', '-quality', '86', outputPath]);
    await fs.rm(tempJpg, { force: true });
    return imageDimensions(outputPath);
  }

  if (await commandExists('sips')) {
    const tempJpg = `${outputPath}.jpg`;
    await spawnFile('sips', ['-s', 'format', 'jpeg', photoFile.path, '--out', tempJpg]);
    if (await commandExists('magick')) {
      await spawnFile('magick', [tempJpg, '-auto-orient', '-resize', '2400x2400>', '-quality', '86', outputPath]);
      await fs.rm(tempJpg, { force: true });
      return imageDimensions(outputPath);
    }
  }

  throw new Error(`Cannot convert ${photoFile.name} to WebP. Install ImageMagick or heif-convert.`);
}

export async function moveUploadToArchive(uploadDir, archiveDir) {
  await ensureDir(path.dirname(archiveDir));
  if (await pathExists(archiveDir)) throw new Error(`Archive target already exists: ${archiveDir}`);
  await fs.rename(uploadDir, archiveDir);
  await ensureDir(uploadDir);
}
