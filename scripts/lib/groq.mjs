import { promises as fs } from 'node:fs';
import path from 'node:path';

const TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

export async function transcribeChunk(chunk, { apiKey, model, language }) {
  if (!apiKey) throw new Error('GROQ_API_KEY is not set in this shell. Export it before running npm run process-upload.');

  const bytes = await fs.readFile(chunk.path);
  const form = new FormData();
  form.append('file', new Blob([bytes]), path.basename(chunk.path));
  form.append('model', model);
  form.append('response_format', 'verbose_json');
  form.append('temperature', '0');
  if (language) form.append('language', language);

  const response = await fetch(TRANSCRIPTION_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq transcription failed for ${chunk.label}: ${response.status} ${response.statusText}\n${body}`);
  }

  const data = await response.json();
  return {
    label: chunk.label,
    start: chunk.start,
    text: data.text || '',
    segments: data.segments || [],
  };
}

export async function transcribeChunks(chunks, options) {
  const results = [];
  for (const chunk of chunks) {
    console.log(`Transcribing ${chunk.label}`);
    results.push(await transcribeChunk(chunk, options));
  }
  return results;
}
