import { promises as fs } from 'node:fs';
import path from 'node:path';

export const AUDIO_EXTENSIONS = new Set(['.flac', '.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.ogg', '.wav', '.webm']);
export const PHOTO_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.heic', '.heif']);

export function slugify(input) {
  const base = String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || 'talk';
}

export function sortByFilename(files) {
  return [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
}

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

export async function listUploadFiles(uploadDir) {
  const entries = await fs.readdir(uploadDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => ({
      name: entry.name,
      path: path.join(uploadDir, entry.name),
      ext: path.extname(entry.name).toLowerCase(),
    }));

  return {
    audio: sortByFilename(files.filter((file) => AUDIO_EXTENSIONS.has(file.ext))),
    photos: sortByFilename(files.filter((file) => PHOTO_EXTENSIONS.has(file.ext))),
    metadata: files.find((file) => file.name.toLowerCase() === 'event.json') || null,
    unknown: sortByFilename(files.filter((file) => !AUDIO_EXTENSIONS.has(file.ext) && !PHOTO_EXTENSIONS.has(file.ext) && file.name.toLowerCase() !== 'event.json')),
  };
}

export function timestampSlug(now = new Date()) {
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}
