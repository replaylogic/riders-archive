import { test } from 'node:test';
import assert from 'node:assert/strict';
import { doorMode, swingAngle } from '../js/doors.js';

test('doors are skipped once seen this session', () => {
  assert.equal(doorMode({ hasHash: false, seen: true, reducedMotion: false }), 'skip');
  assert.equal(doorMode({ hasHash: true, seen: true, reducedMotion: false }), 'skip');
});

test('a shared link opens the doors by themselves', () => {
  assert.equal(doorMode({ hasHash: true, seen: false, reducedMotion: false }), 'auto');
});

test('a fresh visit waits for a push, even with reduced motion', () => {
  assert.equal(doorMode({ hasHash: false, seen: false, reducedMotion: false }), 'interactive');
  assert.equal(doorMode({ hasHash: false, seen: false, reducedMotion: true }), 'interactive');
});

test('swingAngle starts closed', () => {
  assert.equal(swingAngle(0), 0);
});

test('swingAngle first peak lands near the requested opening', () => {
  let max = 0;
  for (let t = 0; t <= 0.5; t += 0.005) max = Math.max(max, swingAngle(t));
  assert.ok(max >= 90 && max <= 110, `peak was ${max}`);
});

test('swingAngle swings back and forth before settling', () => {
  let changes = 0;
  let prev = swingAngle(0.01);
  for (let t = 0.02; t <= 4; t += 0.01) {
    const a = swingAngle(t);
    if (Math.sign(a) !== Math.sign(prev) && a !== 0) changes++;
    prev = a;
  }
  assert.ok(changes >= 2, `only ${changes} sign changes`);
  assert.ok(Math.abs(swingAngle(4)) < 1);
});
