import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHash, buildHash } from '../js/router.js';

const { root } = JSON.parse(readFileSync(new URL('./fixtures/archive.json', import.meta.url), 'utf8'));

test('empty hash is home', () => {
  assert.deepEqual(parseHash('', root), { ids: [], fileId: null, ok: true });
  assert.deepEqual(parseHash('#/', root), { ids: [], fileId: null, ok: true });
  assert.equal(buildHash(root, []), '');
});

test('round-trips labels with & and spaces', () => {
  const ids = ['guides_tips', 'camera', 'action_camera'];
  const hash = buildHash(root, ids);
  assert.equal(hash, '#/Guides%20%26%20Tips/Camera/Action%20Camera');
  assert.deepEqual(parseHash(hash, root), { ids, fileId: null, ok: true });
});

test('builds and parses a file anchor', () => {
  const hash = buildHash(root, ['ride_circuits', 'sahyadri_ghat_circuit'], 'sahyadri_ride_from_pune');
  assert.equal(hash, '#/Ride%20Circuits/Sahyadri-Ghat-Circuit@sahyadri_ride_from_pune');
  assert.deepEqual(parseHash(hash, root), {
    ids: ['ride_circuits', 'sahyadri_ghat_circuit'], fileId: 'sahyadri_ride_from_pune', ok: true,
  });
});

test('legacy id-style links resolve', () => {
  assert.deepEqual(parseHash('#/ride_circuits/pune_kokan_pune', root).ids, ['ride_circuits', 'pune_kokan_pune']);
});

test('legacy lowercase label links resolve', () => {
  assert.deepEqual(parseHash('#/ride circuits', root).ids, ['ride_circuits']);
  assert.deepEqual(parseHash('#/guides%20%26%20tips/camera', root).ids, ['guides_tips', 'camera']);
});

test('legacy hyphen-for-underscore links resolve', () => {
  assert.deepEqual(parseHash('#/ride-circuits', root).ids, ['ride_circuits']);
});

test('unknown paths fall back to home with ok false', () => {
  assert.deepEqual(parseHash('#/Nowhere/Else', root), { ids: [], fileId: null, ok: false });
  assert.deepEqual(parseHash('#/Camping/Nowhere', root), { ids: [], fileId: null, ok: false });
});

test('a file anchor for a missing file is dropped', () => {
  assert.deepEqual(parseHash('#/Camping@ghost', root), { ids: ['camping'], fileId: null, ok: true });
});

test('malformed percent-encoding does not throw', () => {
  assert.deepEqual(parseHash('#/%E0%A4%A', root), { ids: [], fileId: null, ok: false });
});
