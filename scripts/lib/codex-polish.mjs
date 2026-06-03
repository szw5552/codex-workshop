import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnFile, commandExists } from './process.mjs';
import { ensureDir } from './fs-utils.mjs';

export function buildPolishPrompt({ event, rawTranscript }) {
  return `你是一位繁體中文編輯，請把演講錄音逐字稿整理成團隊可共享的會議/演講紀錄。\n\n要求：\n- 只使用繁體中文，專有名詞可保留英文。\n- 不要杜撰逐字稿沒有提到的內容。\n- 移除明顯口頭贅詞，修正標點，整理成可閱讀段落。\n- 不做講者辨識。\n- 摘要要充實，讓沒聽過演講的人理解主旨、脈絡、各段分享的關係與最後結論，不要只寫一段總述。\n- infographicSpec 必須直接對應 summary 的段落與 keyPoints，不可產生與摘要無關的概念圖。
- infographicSpec 要適合產生成一張 16:9 PNG 資訊圖，中文標籤要短，避免整句長文，也避免英文長詞造成斷行。\n\n活動資訊：\n${JSON.stringify(event, null, 2)}\n\n請只輸出 JSON，不要 markdown code fence。JSON schema：\n{\n  "summary": "5 到 7 段繁體中文摘要，每段 2 到 4 句，需涵蓋主題、脈絡、關鍵案例、技術展示與結論",\n  "keyPoints": ["5 到 9 個重點，每個 1 句"],\n  "polishedTranscript": ["段落 1", "段落 2"],\n  "infographicSpec": {\n    "title": "短標題",\n    "subtitle": "一句話說明",\n    "nodes": [{ "label": "短中文標籤，最多 8 字", "detail": "對應 summary 的一句短補充，最多 20 字" }],\n    "flow": ["3 到 5 個流程或關係詞"],\n    "alt": "完整替代文字"\n  }\n}\n\n原始逐字稿：\n${rawTranscript}`;
}

function extractJson(text) {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Codex did not return JSON.');
    return JSON.parse(match[0]);
  }
}

export function validatePolished(data) {
  if (!data || typeof data !== 'object') throw new Error('Polished result must be an object.');
  if (typeof data.summary !== 'string' || !data.summary.trim()) throw new Error('Missing summary.');
  if (!Array.isArray(data.keyPoints) || data.keyPoints.length === 0) throw new Error('Missing keyPoints.');
  if (!Array.isArray(data.polishedTranscript) || data.polishedTranscript.length === 0) throw new Error('Missing polishedTranscript.');
  if (!data.infographicSpec || typeof data.infographicSpec.title !== 'string') throw new Error('Missing infographicSpec.');
  return data;
}

export async function polishWithCodex({ event, rawTranscript, workDir }) {
  if (!(await commandExists('codex'))) throw new Error('codex CLI is not available on PATH.');
  await ensureDir(workDir);

  const prompt = buildPolishPrompt({ event, rawTranscript });
  const promptPath = path.join(workDir, 'codex-polish-prompt.txt');
  const outputPath = path.join(workDir, 'codex-polish-output.json');
  await fs.writeFile(promptPath, prompt);

  await spawnFile('codex', [
    'exec',
    '--ephemeral',
    '-o', outputPath,
    '-C', process.cwd(),
    '-',
  ], { input: prompt });

  const output = await fs.readFile(outputPath, 'utf8');
  return validatePolished(extractJson(output));
}
