import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { searchFiles, latestFiles, nodeAt, findFile } from '../js/archive.js';
import {
  esc, poster, crate, ticket, homeView, homeBody, folderView, trailView, coldTrailNote, restingNote,
} from '../js/views.js';

const { root } = JSON.parse(readFileSync(new URL('./fixtures/archive.json', import.meta.url), 'utf8'));
const camping = nodeAt(root, ['camping']);
const treks = nodeAt(root, ['treks']);
const count = (html, needle) => html.split(needle).length - 1;

test('esc escapes HTML-significant characters', () => {
  assert.equal(esc('<b>&"\''), '&lt;b&gt;&amp;&quot;&#39;');
  assert.equal(esc(undefined), '');
});

test('poster shows title, file count and a link to the category', () => {
  const html = poster(camping, 0);
  assert.match(html, /Camping/);
  assert.match(html, /2 FILES/);
  assert.match(html, /href="#\/Camping"/);
});

test('poster for an empty category says coming soon', () => {
  assert.match(poster(treks, 1), /COMING SOON/);
});

test('poster uses singular FILE for one file', () => {
  const one = { id: 'x', type: 'folder', label: 'Solo', children: [{ id: 'f', type: 'file', label: 'F', code: '9' }] };
  assert.match(poster(one, 0), /1 FILE</);
});

test('crate links to its folder and counts its items', () => {
  const html = crate(nodeAt(root, ['camping', 'sahyadris']), '#/Camping/Sahyadris');
  assert.match(html, /href="#\/Camping\/Sahyadris"/);
  assert.match(html, /Sahyadris/);
  assert.match(html, /2 FILES/);
});

test('ticket shows number, type stamp and the file id to open', () => {
  const html = ticket(findFile(root, 'kokan_motorcycle_circuit_from_pune'));
  assert.match(html, /No\. 0004/);
  assert.match(html, />PDF</);
  assert.match(html, /data-file="kokan_motorcycle_circuit_from_pune"/);
  assert.match(html, /2\.7 MB/);
});

test('ticket escapes labels', () => {
  const html = ticket({ file: { id: 'x', label: '<script>', code: '1', fileType: 'pdf' }, ids: [], labels: [] });
  assert.ok(!html.includes('<script>'));
});

test('homeView with a query shows matching tickets instead of posters', () => {
  const html = homeView(root, { query: '0004', results: searchFiles(root, '0004'), latest: latestFiles(root) });
  assert.match(html, /data-file="kokan_motorcycle_circuit_from_pune"/);
  assert.ok(!html.includes('class="poster'));
  assert.match(html, /value="0004"/);
});

test('homeView without a query shows the board and one poster per category', () => {
  const html = homeView(root, { query: '', results: [], latest: latestFiles(root) });
  assert.match(html, /class="board/);
  assert.equal(count(html, 'class="poster '), root.children.length);
});

test('homeView hides the board when no files are dated', () => {
  const html = homeView(root, { query: '', results: [], latest: [] });
  assert.ok(!html.includes('class="board'));
});

test('homeBody reports no matches for an unmatched query', () => {
  assert.match(homeBody(root, { query: 'zzz', results: [], latest: [] }), /No files match/);
});

test('folderView renders crates for sub-folders and tickets for files', () => {
  const html = folderView(nodeAt(root, ['ride_circuits']), ['ride_circuits'], root);
  assert.equal(count(html, 'class="crate '), 2);
  assert.match(html, /href="#\/Ride%20Circuits\/Pune-Kokan-Pune"/);
  const files = folderView(nodeAt(root, ['camping', 'sahyadris']), ['camping', 'sahyadris'], root);
  assert.equal(count(files, 'class="ticket '), 2);
  assert.match(files, /Sahyadri Mountain Ranges/);
});

test('folderView for an empty folder shows the empty-shelf note', () => {
  assert.match(folderView(treks, ['treks'], root), /Nothing on this shelf yet/);
});

test('trailView links each step and marks the current one', () => {
  const html = trailView(root, ['guides_tips', 'camera']);
  assert.match(html, /Guides &amp; Tips/);
  assert.match(html, /href="#\/Guides%20%26%20Tips"/);
  assert.match(html, /aria-current="page"[^>]*>[^<]*Camera|aria-current="page">Camera/);
});

test('notices carry their copy and a retry action', () => {
  assert.match(coldTrailNote(), /That trail's gone cold/);
  assert.match(restingNote(), /The archive is resting/);
  assert.match(restingNote(), /data-action="retry"/);
});
