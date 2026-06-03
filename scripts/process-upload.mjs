import nextEnv from '@next/env';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertPhotoToWebp, moveUploadToArchive, prepareAudioChunks } from './lib/media.mjs';
import { transcribeChunks } from './lib/groq.mjs';
import { polishWithCodex } from './lib/codex-polish.mjs';
import { renderInfographicPng } from './lib/infographic.mjs';
import { ensureDir, listUploadFiles, pathExists, readJson, slugify, timestampSlug, writeJson } from './lib/fs-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const { loadEnvConfig } = nextEnv;
loadEnvConfig(root);

const uploadDir = path.join(root, 'upload');
const contentDir = path.join(root, 'content');
const eventsDir = path.join(contentDir, 'events');
const publicEventsDir = path.join(root, 'public', 'events');
const archiveRoot = path.join(root, 'archive');
const workRoot = path.join(root, '.tmp', 'process-upload');

async function uniqueSlug(base) {
  let slug = slugify(base);
  let candidate = slug;
  let suffix = 2;
  while (await pathExists(path.join(eventsDir, `${candidate}.json`))) {
    candidate = `${slug}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

async function loadEventMetadata(metadataFile) {
  if (!metadataFile) return {};
  const data = await readJson(metadataFile.path, {});
  if (!data || typeof data !== 'object') throw new Error('upload/event.json must contain a JSON object.');
  return data;
}

function combinedTranscript(transcriptionGroups) {
  return transcriptionGroups.map((group) => {
    const parts = group.results.map((result) => result.text.trim()).filter(Boolean).join('\n');
    return `## ${group.audioName}\n${parts}`;
  }).join('\n\n');
}

async function processPhotos({ photos, slug }) {
  const publicPhotoDir = path.join(publicEventsDir, slug, 'photos');
  await ensureDir(publicPhotoDir);

  const processed = [];
  for (const [index, photo] of photos.entries()) {
    const outputName = `${String(index + 1).padStart(2, '0')}-${slugify(path.parse(photo.name).name)}.webp`;
    const outputPath = path.join(publicPhotoDir, outputName);
    console.log(`Converting photo ${photo.name}`);
    const dimensions = await convertPhotoToWebp(photo, outputPath);
    processed.push({
      src: `/events/${slug}/photos/${outputName}`,
      alt: `演講照片 ${index + 1}`,
      originalName: photo.name,
      width: dimensions.width,
      height: dimensions.height,
    });
  }
  return processed;
}

async function writeEventIndex(eventSummary) {
  const indexPath = path.join(contentDir, 'index.json');
  const current = await readJson(indexPath, []);
  const next = [eventSummary, ...current.filter((item) => item.slug !== eventSummary.slug)]
    .sort((a, b) => String(b.processedAt).localeCompare(String(a.processedAt)));
  await writeJson(indexPath, next);
}

async function main() {
  if (!(await pathExists(uploadDir))) {
    await ensureDir(uploadDir);
    throw new Error('Created upload/. Add one talk recording set there, then run npm run process-upload again.');
  }

  const files = await listUploadFiles(uploadDir);
  if (files.audio.length === 0) throw new Error('upload/ does not contain supported audio files.');
  if (files.unknown.length) console.warn(`Ignoring unsupported upload files: ${files.unknown.map((file) => file.name).join(', ')}`);

  const metadata = await loadEventMetadata(files.metadata);
  const processedAt = new Date().toISOString();
  const title = metadata.title || `演講紀錄 ${processedAt.slice(0, 10)}`;
  const slugSeed = metadata.slug || `${metadata.date || processedAt.slice(0, 10)}-talk-record`;
  const slug = await uniqueSlug(slugSeed);
  const workDir = path.join(workRoot, slug);
  await ensureDir(workDir);

  const eventBase = {
    slug,
    title,
    date: metadata.date || processedAt.slice(0, 10),
    location: metadata.location || '',
    description: metadata.description || '',
    tags: Array.isArray(metadata.tags) ? metadata.tags : [],
    processedAt,
  };

  const rawTranscriptPath = path.join(workDir, 'raw-transcript.md');
  const transcriptionProgressPath = path.join(workDir, 'transcription-debug-progress.json');
  let transcriptionGroups = [];
  let rawTranscript = '';

  if (await pathExists(rawTranscriptPath)) {
    console.log(`Reusing existing raw transcript at ${rawTranscriptPath}`);
    rawTranscript = await fs.readFile(rawTranscriptPath, 'utf8');
    transcriptionGroups = await readJson(transcriptionProgressPath, []);
  } else {
    for (const audio of files.audio) {
      const audioWorkDir = path.join(workDir, 'audio', slugify(path.parse(audio.name).name));
      const chunks = await prepareAudioChunks(audio, audioWorkDir);
      const results = await transcribeChunks(chunks, {
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo',
        language: process.env.GROQ_TRANSCRIPTION_LANGUAGE || undefined,
      });
      transcriptionGroups.push({ audioName: audio.name, chunks: chunks.map((chunk) => ({ label: chunk.label, start: chunk.start })), results });
      await writeJson(transcriptionProgressPath, transcriptionGroups);
    }

    rawTranscript = combinedTranscript(transcriptionGroups);
    await fs.writeFile(rawTranscriptPath, rawTranscript);
  }
  const polished = await polishWithCodex({ event: eventBase, rawTranscript, workDir: path.join(workDir, 'codex') });
  const photos = await processPhotos({ photos: files.photos, slug });

  let infographic = null;
  try {
    const infographicPath = path.join(publicEventsDir, slug, 'infographic.png');
    await renderInfographicPng(polished.infographicSpec, infographicPath, path.join(workDir, 'infographic'));
    infographic = {
      src: `/events/${slug}/infographic.png`,
      alt: polished.infographicSpec.alt || `${title} 重點資訊圖`,
      width: 1400,
      height: 788,
    };
  } catch (error) {
    console.warn(`Infographic rendering failed: ${error.message}`);
  }

  const eventRecord = {
    ...eventBase,
    summary: polished.summary,
    keyPoints: polished.keyPoints,
    polishedTranscript: polished.polishedTranscript,
    photos,
    infographic,
    raw: {
      audioFiles: files.audio.map((file) => file.name),
      photoFiles: files.photos.map((file) => file.name),
      transcriptSource: `archive/${slug}/raw-transcript.md`,
    },
  };

  await writeJson(path.join(eventsDir, `${slug}.json`), eventRecord);
  await writeEventIndex({
    slug,
    title: eventRecord.title,
    date: eventRecord.date,
    processedAt,
    description: eventRecord.description,
    summary: eventRecord.summary,
    cover: photos[0] || null,
    photoCount: photos.length,
    keyPointCount: eventRecord.keyPoints.length,
  });

  const archiveDir = path.join(archiveRoot, slug, 'source');
  await ensureDir(path.join(archiveRoot, slug));
  await fs.writeFile(path.join(archiveRoot, slug, 'raw-transcript.md'), rawTranscript);
  await writeJson(path.join(archiveRoot, slug, 'transcription-debug.json'), transcriptionGroups);
  await moveUploadToArchive(uploadDir, archiveDir);

  console.log(`Processed ${title}`);
  console.log(`Event page: /talks/${slug}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
