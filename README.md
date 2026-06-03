# Talk Archive

Turn one `upload/` folder of talk recordings and photos into a polished Next.js archive page.

## Workflow

1. Put one event's files in `upload/`.
   - Audio: `flac`, `mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `ogg`, `wav`, `webm`
   - Photos: `jpg`, `jpeg`, `png`, `webp`, `avif`, `gif`, `heic`, `heif`
2. Make sure `GROQ_API_KEY` is exported in the same shell.
3. Run:

```bash
npm run process-upload
```

The script sorts audio by filename, sends chunks to Groq speech-to-text, asks `codex exec` to produce Traditional Chinese summary/transcript content, renders an infographic PNG, converts photos to WebP, updates `content/`, then moves the processed source files to `archive/<slug>/source/`.

## Optional Metadata

Add `upload/event.json` before processing:

```json
{
  "title": "演講標題",
  "date": "2026-06-03",
  "location": "Taipei",
  "description": "一句話描述",
  "tags": ["AI", "Workshop"]
}
```

## Commands

```bash
npm run dev            # local Next.js server
npm run build          # production build
npm run process-upload # process current upload folder
npm test               # node tests
npm run typecheck      # TypeScript check
```

## Generated Content

- Event data: `content/events/<slug>.json`
- Event index: `content/index.json`
- Web photos and infographic: `public/events/<slug>/`
- Original source files and raw transcript: `archive/<slug>/`

The latest processed page is available at `/talks/2026-06-03-talk-record-2026-06-03`.
