import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, stat, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { infographicSvg, renderInfographicPng } from '../scripts/lib/infographic.mjs';

test('infographicSvg escapes text content', () => {
  const svg = infographicSvg({ title: '<bad>', nodes: [{ label: 'A&B', detail: 'C' }] });
  assert.match(svg, /&lt;bad&gt;/);
  assert.match(svg, /A&amp;B/);
});

test('renderInfographicPng writes a png', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'talk-info-'));
  const out = path.join(dir, 'info.png');
  await renderInfographicPng({ title: '測試', subtitle: '說明', nodes: [{ label: '重點', detail: '內容' }], flow: ['一', '二'] }, out, dir);
  const info = await stat(out);
  assert.ok(info.size > 1000);
  await rm(dir, { recursive: true, force: true });
});


test('infographicSvg does not emit unsupported OKLCH colors', () => {
  const svg = infographicSvg({ title: '測試', nodes: [{ label: '重點', detail: '內容' }] });
  assert.equal(svg.includes('oklch('), false);
  assert.match(svg, /#[0-9a-fA-F]{6}/);
});
