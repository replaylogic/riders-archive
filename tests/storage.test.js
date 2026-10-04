import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeStore } from '../js/storage.js';

const throwingBackend = {
  getItem() { throw new Error('SecurityError'); },
  setItem() { throw new Error('QuotaExceededError'); },
};

function memoryBackend() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

test('returns the fallback and never throws when the backend throws', () => {
  const s = makeStore(() => throwingBackend);
  assert.equal(s.get('k', 7), 7);
  assert.doesNotThrow(() => s.set('k', 1));
});

test('returns the fallback when the backend itself cannot be reached', () => {
  const s = makeStore(() => { throw new Error('access denied'); });
  assert.equal(s.get('k', 'x'), 'x');
  assert.doesNotThrow(() => s.set('k', 'y'));
});

test('round-trips JSON values', () => {
  const b = memoryBackend();
  const s = makeStore(() => b);
  s.set('obj', { a: 1 });
  assert.deepEqual(s.get('obj', null), { a: 1 });
  assert.equal(s.get('absent', 'fb'), 'fb');
});

test('returns the fallback for corrupt stored JSON', () => {
  const b = memoryBackend();
  b.setItem('bad', '{not json');
  assert.equal(makeStore(() => b).get('bad', 3), 3);
});
