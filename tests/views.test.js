import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { searchFiles, latestFiles, nodeAt, findFile } from '../js/archive.js';
import {
  esc, formatDate, drawer, ticket, fresh, homeView, folderView, findView, findResults, coldTrailNote, restingNote,
} from '../js/views.js';

const { root } = JSON.parse(readFileSync(new URL('./fixtures/archive.json', import.meta.url), 'utf8'));
const camping = nodeAt(root, ['camping']);
const treks = nodeAt(root, ['treks']);
const count = (html, needle) => html.split(needle).length - 1;

test('esc escapes HTML-significant characters', () => {
  assert.equal(esc('<b>&"\''), '&lt;b&gt;&amp;&quot;&#39;');
  assert.equal(esc(undefined), '');
});

test('formatDate renders day month year and tolerates junk', () => {
  assert.equal(formatDate('2026-05-16'), '16 May 2026');
  assert.equal(formatDate('nope'), '');
});

test('drawer links to its folder with label and file count', () => {
  const html = drawer(camping, '#/Camping', 0);
  assert.match(html, /class="drawer"/);
  assert.match(html, /href="#\/Camping"/);
  assert.match(html, /Camping/);
  assert.match(html, /<b>2<\/b> files/);
});

test('drawer for an empty folder says coming soon', () => {
  assert.match(drawer(treks, '#/Treks', 1), /Coming soon/);
});

test('drawer uses singular file for one file', () => {
  const one = { id: 'x', type: 'folder', label: 'Solo', children: [{ id: 'f', type: 'file', label: 'F', code: '9' }] };
  assert.match(drawer(one, '#/Solo', 0), /<b>1<\/b> file</);
});

test('ticket shows number, type stamp, size and the file id to open', () => {
  const html = ticket(findFile(root, 'kokan_motorcycle_circuit_from_pune'));
  assert.match(html, /No\. 0004/);
  assert.match(html, />PDF</);
  assert.match(html, /data-file="kokan_motorcycle_circuit_from_pune"/);
  assert.match(html, /2\.7 MB/);
});

test('ticket shows the folder path when asked', () => {
  const html = ticket(findFile(root, 'kokan_motorcycle_circuit_from_pune'), { showPath: true });
  assert.match(html, /Ride Circuits › Pune-Kokan-Pune/);
});

test('ticket escapes labels', () => {
  const html = ticket({ file: { id: 'x', label: '<script>', code: '1', fileType: 'pdf' }, ids: [], labels: [] });
  assert.ok(!html.includes('<script>'));
});

test('fresh lists the newest files and is empty without dates', () => {
  const html = fresh(latestFiles(root, 4));
  assert.match(html, /Fresh off the trail/);
  assert.equal(count(html, 'data-file='), 4);
  assert.equal(fresh([]), '');
});

test('homeView has the find button, one drawer per category and the fresh rail', () => {
  const html = homeView(root, { latest: latestFiles(root, 4) });
  assert.match(html, /data-action="find"/);
  assert.equal(count(html, 'class="drawer"'), root.children.length);
  assert.match(html, /href="#\/Guides%20%26%20Tips"/);
  assert.match(html, /Fresh off the trail/);
  assert.match(html, /Howdy, traveler/);
});

test('folderView renders drawers for sub-folders and tickets for files', () => {
  const html = folderView(nodeAt(root, ['ride_circuits']), ['ride_circuits'], root);
  assert.equal(count(html, 'class="drawer"'), 2);
  assert.match(html, /href="#\/Ride%20Circuits\/Pune-Kokan-Pune"/);
  const files = folderView(nodeAt(root, ['camping', 'sahyadris']), ['camping', 'sahyadris'], root);
  assert.equal(count(files, 'class="ticket"'), 2);
  assert.match(files, /Sahyadri Mountain Ranges/);
});

test('folderView links back to the parent and through the path', () => {
  const html = folderView(nodeAt(root, ['guides_tips', 'camera']), ['guides_tips', 'camera'], root);
  assert.match(html, /class="back"[^>]*href="#\/Guides%20%26%20Tips"/);
  assert.match(html, /Guides &amp; Tips/);
  const top = folderView(camping, ['camping'], root);
  assert.match(top, /class="back"[^>]*href="#\/"/);
});

test('folderView for an empty folder says the drawer is empty', () => {
  assert.match(folderView(treks, ['treks'], root), /This drawer is empty for now/);
});

test('findView carries the query in its input', () => {
  const html = findView({ query: '0004', results: searchFiles(root, '0004') });
  assert.match(html, /value="0004"/);
  assert.match(html, /data-file="kokan_motorcycle_circuit_from_pune"/);
});

test('findResults guides when empty and when nothing matches', () => {
  assert.match(findResults({ query: '', results: [] }), /Every file has a number/);
  assert.match(findResults({ query: 'zzz', results: [] }), /No file numbered or named “zzz”/);
  assert.match(findResults({ query: 'ladakh', results: searchFiles(root, 'ladakh') }), /2 files/);
});

test('notices say what happened and what to do', () => {
  assert.match(coldTrailNote(), /That link leads nowhere now/);
  assert.match(restingNote(), /Couldn’t open the archive/);
  assert.match(restingNote(), /data-action="retry"/);
});
