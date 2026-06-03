import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ensureDir } from './fs-utils.mjs';

function escapeXml(value) {
  return String(value ?? '').replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char]));
}

function wrapText(text, max = 13, limit = 3) {
  const chars = Array.from(String(text || ''));
  const lines = [];
  for (let i = 0; i < chars.length; i += max) lines.push(chars.slice(i, i + max).join(''));
  return lines.slice(0, limit);
}

function textBlock(lines, { x, y, className, lineHeight = 28, anchor = 'start' }) {
  return lines.map((line, index) => (
    `<text x="${x}" y="${y + index * lineHeight}" text-anchor="${anchor}" class="${className}">${escapeXml(line)}</text>`
  )).join('');
}

function normalizeNodes(spec) {
  const nodes = Array.isArray(spec.nodes) ? spec.nodes.slice(0, 5) : [];
  if (nodes.length) return nodes;
  return [
    { label: '整理資料', detail: 'AI 承接可追蹤與可重複的情報工作' },
    { label: '建立流程', detail: '先從最關鍵工作流開始，穩定後再擴大' },
    { label: '自然語言操作', detail: '部署、除錯與營運也能交給 Agent 協助' },
    { label: '多代理協作', detail: 'Agent 彼此 review、派工與回報' },
    { label: '人類判斷', detail: '信任、策略與最後責任仍由人保留' },
  ];
}

export function infographicSvg(spec) {
  const nodes = normalizeNodes(spec);
  const cardWidth = 232;
  const cardGap = 22;
  const startX = 104;
  const y = 300;

  const cards = nodes.map((node, index) => {
    const x = startX + index * (cardWidth + cardGap);
    const label = wrapText(node.label, 8, 2);
    const detail = wrapText(node.detail, 15, 3);
    const number = String(index + 1).padStart(2, '0');
    return `<g>
      <rect x="${x}" y="${y}" width="${cardWidth}" height="250" rx="18" fill="#f4f7f8" stroke="#cdd9df" stroke-width="2"/>
      <text x="${x + 22}" y="${y + 46}" class="number">${number}</text>
      ${textBlock(label, { x: x + 22, y: y + 96, className: 'card-title', lineHeight: 34 })}
      ${textBlock(detail, { x: x + 22, y: y + 168, className: 'card-detail', lineHeight: 27 })}
    </g>`;
  }).join('\n');

  const arrows = nodes.slice(1).map((_, index) => {
    const x = startX + (index + 1) * cardWidth + index * cardGap;
    return `<path d="M ${x + 8} ${y + 125} L ${x + 28} ${y + 125}" stroke="#a77a21" stroke-width="4" stroke-linecap="round"/>
      <path d="M ${x + 28} ${y + 125} L ${x + 19} ${y + 116} M ${x + 28} ${y + 125} L ${x + 19} ${y + 134}" stroke="#a77a21" stroke-width="4" stroke-linecap="round"/>`;
  }).join('\n');

  const titleLines = wrapText(spec.title || 'AI Agent 從工具走向隊友', 18, 2);
  const subtitleLines = wrapText(spec.subtitle || '共同主線：AI 承接可重複的 intelligence，人類保留 judgment。', 36, 2);
  const flowText = Array.isArray(spec.flow) ? spec.flow.slice(0, 5).join('  →  ') : '資料整理  →  工作流  →  操作執行  →  多代理協作  →  人類判斷';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="788" viewBox="0 0 1400 788">
    <style>
      text { font-family: 'PingFang TC', 'Noto Sans TC', 'Arial Unicode MS', sans-serif; fill: #17232d; }
      .title { font-size: 54px; font-weight: 800; letter-spacing: -1px; }
      .subtitle { font-size: 25px; fill: #4d6474; }
      .thesis { font-size: 24px; font-weight: 700; fill: #ffffff; }
      .number { font-size: 22px; font-weight: 800; fill: #a77a21; }
      .card-title { font-size: 30px; font-weight: 800; }
      .card-detail { font-size: 19px; fill: #4d6474; }
      .flow { font-size: 24px; font-weight: 700; fill: #2d4f67; }
      .caption { font-size: 18px; fill: #657784; }
    </style>
    <rect width="1400" height="788" fill="#ffffff"/>
    <rect x="42" y="42" width="1316" height="704" rx="30" fill="#fbfcfd" stroke="#cdd9df" stroke-width="2"/>
    <rect x="72" y="218" width="1256" height="58" rx="16" fill="#243f55"/>
    ${textBlock(titleLines, { x: 86, y: 126, className: 'title', lineHeight: 60 })}
    ${textBlock(subtitleLines, { x: 88, y: 184, className: 'subtitle', lineHeight: 32 })}
    <text x="104" y="255" class="thesis">AI 負責情報、流程與執行；人類負責信任、策略與最終判斷。</text>
    ${arrows}
    ${cards}
    <rect x="86" y="612" width="1242" height="74" rx="18" fill="#e6f0f5" stroke="#cdd9df"/>
    <text x="112" y="658" class="flow">${escapeXml(flowText)}</text>
    <text x="92" y="720" class="caption">依演講摘要整理，對應 VC、早期新創、部署平台、多代理協作與 OpenAI 技術展示。</text>
  </svg>`;
}

export async function renderInfographicPng(spec, outputPath, workDir) {
  await ensureDir(path.dirname(outputPath));
  await ensureDir(workDir);
  const svgPath = path.join(workDir, 'infographic.svg');
  await fs.writeFile(svgPath, infographicSvg(spec));

  const sharp = (await import('sharp')).default;
  await sharp(Buffer.from(infographicSvg(spec))).png().toFile(outputPath);
  return outputPath;
}
