import test from 'node:test';
import assert from 'node:assert/strict';
import { slugify, sortByFilename } from '../scripts/lib/fs-utils.mjs';

test('slugify keeps Chinese text and normalizes separators', () => {
  assert.equal(slugify('2026/06 演講 記錄!'), '2026-06-演講-記錄');
});

test('sortByFilename uses numeric order', () => {
  const files = [{ name: '10.m4a' }, { name: '2.m4a' }, { name: '1.m4a' }];
  assert.deepEqual(sortByFilename(files).map((file) => file.name), ['1.m4a', '2.m4a', '10.m4a']);
});
