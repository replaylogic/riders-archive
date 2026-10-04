import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeBackdropLock } from '../js/backdrop.js';

const els = () => [{ inert: false }, { inert: false }];

test('the background stays inert until every holder lets go', () => {
  const targets = els();
  const lock = makeBackdropLock(() => targets);
  lock.hold('doors');
  lock.hold('sheet');
  assert.ok(targets.every((t) => t.inert));
  lock.release('doors');
  assert.ok(targets.every((t) => t.inert), 'sheet still open');
  lock.release('sheet');
  assert.ok(targets.every((t) => !t.inert));
});

test('releasing a holder twice or one that never held is harmless', () => {
  const targets = els();
  const lock = makeBackdropLock(() => targets);
  lock.release('ghost');
  lock.hold('sheet');
  lock.release('sheet');
  lock.release('sheet');
  assert.ok(targets.every((t) => !t.inert));
});
