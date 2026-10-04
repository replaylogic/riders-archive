import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, makeShuffle } from '../js/playlist.js';

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

test('every track is a local mp3 with a title and artist', () => {
  assert.ok(TRACKS.length >= 4);
  for (const t of TRACKS) {
    assert.match(t.src, /^audio\/[a-z-]+\.mp3$/);
    assert.ok(t.title && t.artist);
  }
});

test('each cycle plays every item once', () => {
  for (const seed of [1, 7, 42, 99]) {
    const s = makeShuffle(['a', 'b', 'c', 'd'], seeded(seed));
    for (let cycle = 0; cycle < 3; cycle++) {
      const got = [s.next(), s.next(), s.next(), s.next()];
      assert.deepEqual([...got].sort(), ['a', 'b', 'c', 'd']);
    }
  }
});

test('a new cycle never starts with the track that just played', () => {
  for (let seed = 1; seed < 200; seed++) {
    const s = makeShuffle(['a', 'b', 'c'], seeded(seed));
    let last = null;
    for (let i = 0; i < 30; i++) {
      const cur = s.next();
      assert.notEqual(cur, last);
      last = cur;
    }
  }
});

test('a single-item list just repeats', () => {
  const s = makeShuffle(['only'], seeded(3));
  assert.equal(s.next(), 'only');
  assert.equal(s.next(), 'only');
});
