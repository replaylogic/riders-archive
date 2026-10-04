import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  nodeAt, trail, countFiles, allFiles, searchFiles, latestFiles, findFile, fileTypeLabel,
} from '../js/archive.js';

const archive = JSON.parse(readFileSync(new URL('./fixtures/archive.json', import.meta.url), 'utf8'));
const root = archive.root;
const treks = root.children.find((c) => c.id === 'treks');

test('countFiles counts every file in the tree', () => {
  assert.equal(countFiles(root), 8);
  assert.equal(countFiles(treks), 0);
});

test('nodeAt walks ids and returns null on a miss', () => {
  assert.equal(nodeAt(root, ['ride_circuits', 'sahyadri_ghat_circuit']).label, 'Sahyadri-Ghat-Circuit');
  assert.equal(nodeAt(root, []), root);
  assert.equal(nodeAt(root, ['nope']), null);
});

test('trail returns the folder chain without root and stops at a miss', () => {
  assert.deepEqual(trail(root, ['guides_tips', 'camera']).map((n) => n.label), ['Guides & Tips', 'Camera']);
  assert.deepEqual(trail(root, ['guides_tips', 'nope', 'camera']).map((n) => n.label), ['Guides & Tips']);
});

test('allFiles lists each file with its folder ids and labels', () => {
  const all = allFiles(root);
  assert.equal(all.length, 8);
  const dji = all.find((r) => r.file.id === 'dji_action4_manual_settings');
  assert.deepEqual(dji.ids, ['guides_tips', 'camera', 'action_camera']);
  assert.deepEqual(dji.labels, ['Guides & Tips', 'Camera', 'Action Camera']);
});

test('searchFiles finds an exact code first with its folder path', () => {
  const [first] = searchFiles(root, '0004');
  assert.equal(first.file.id, 'kokan_motorcycle_circuit_from_pune');
  assert.equal(first.exact, true);
  assert.deepEqual(first.labels, ['Ride Circuits', 'Pune-Kokan-Pune']);
});

test('searchFiles matches partial codes as non-exact', () => {
  const hit = searchFiles(root, '4').find((r) => r.file.code === '0004');
  assert.ok(hit);
  assert.equal(hit.exact, false);
});

test('searchFiles matches labels case-insensitively', () => {
  assert.equal(searchFiles(root, 'LADAKH').length, 2);
});

test('searchFiles returns nothing for blank or unmatched queries', () => {
  assert.deepEqual(searchFiles(root, '   '), []);
  assert.deepEqual(searchFiles(root, ''), []);
  assert.deepEqual(searchFiles(root, 'zzz'), []);
});

test('searchFiles trims the query and sorts exact code matches first', () => {
  const results = searchFiles(root, ' 0005 ');
  assert.equal(results[0].exact, true);
  assert.equal(results[0].file.code, '0005');
});

test('latestFiles returns newest dated files first, capped at n', () => {
  const latest = latestFiles(root, 3);
  assert.equal(latest.length, 3);
  assert.ok(latest.every((r) => r.file.added));
  const dates = latest.map((r) => r.file.added);
  assert.deepEqual(dates, [...dates].sort().reverse());
  // ties broken by code descending
  assert.deepEqual(latest.slice(0, 2).map((r) => r.file.code), ['0008', '0007']);
});

test('latestFiles is empty when no file has an added date', () => {
  const bare = { id: 'root', type: 'folder', children: [{ id: 'a', type: 'file', code: '1', label: 'A' }] };
  assert.deepEqual(latestFiles(bare), []);
});

test('findFile locates a file anywhere and returns its folder chain', () => {
  assert.deepEqual(findFile(root, 'sahyadri_ride_from_pune').ids, ['ride_circuits', 'sahyadri_ghat_circuit']);
  assert.equal(findFile(root, 'missing'), null);
});

test('fileTypeLabel maps known types and falls back to FILE', () => {
  assert.equal(fileTypeLabel('pdf'), 'PDF');
  assert.equal(fileTypeLabel('image'), 'IMG');
  assert.equal(fileTypeLabel('xlsx'), 'XLSX');
  assert.equal(fileTypeLabel('weird'), 'FILE');
  assert.equal(fileTypeLabel(undefined), 'FILE');
});
