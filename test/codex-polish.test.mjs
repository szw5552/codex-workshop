import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPolishPrompt, validatePolished } from '../scripts/lib/codex-polish.mjs';

test('buildPolishPrompt includes transcript and JSON instruction', () => {
  const prompt = buildPolishPrompt({ event: { title: '測試' }, rawTranscript: 'hello transcript' });
  assert.match(prompt, /只輸出 JSON/);
  assert.match(prompt, /hello transcript/);
});

test('validatePolished accepts required shape', () => {
  const data = validatePolished({
    summary: '摘要',
    keyPoints: ['重點'],
    polishedTranscript: ['段落'],
    infographicSpec: { title: '圖' },
  });
  assert.equal(data.summary, '摘要');
});


test('buildPolishPrompt requires detailed summary and related infographic', () => {
  const prompt = buildPolishPrompt({ event: { title: '測試' }, rawTranscript: 'raw' });
  assert.match(prompt, /5 到 7 段繁體中文摘要/);
  assert.match(prompt, /必須直接對應 summary/);
  assert.match(prompt, /避免英文長詞造成斷行/);
});
