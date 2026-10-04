import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickShareMethod, shareLink } from '../js/share.js';

const link = { title: 'Kokan', url: 'https://archive.rideatlas.app/#/x' };
const abort = () => Object.assign(new Error('cancelled'), { name: 'AbortError' });

test('pickShareMethod falls back to manual when nothing is available', () => {
  assert.equal(pickShareMethod({}), 'manual');
  assert.equal(pickShareMethod(undefined), 'manual');
});

test('pickShareMethod prefers the clipboard when share is missing', () => {
  assert.equal(pickShareMethod({ clipboard: { writeText: async () => {} } }), 'clipboard');
});

test('pickShareMethod prefers the native share sheet', () => {
  assert.equal(pickShareMethod({ share: async () => {}, clipboard: { writeText: async () => {} } }), 'share');
});

test('pickShareMethod skips share when canShare refuses the link', () => {
  const nav = { share: async () => {}, canShare: () => false, clipboard: { writeText: async () => {} } };
  assert.equal(pickShareMethod(nav), 'clipboard');
});

test('shareLink reports cancelled when the person dismisses the share sheet', async () => {
  assert.equal(await shareLink({ share: async () => { throw abort(); } }, link), 'cancelled');
});

test('shareLink falls through to the clipboard when share fails', async () => {
  let copied = '';
  const nav = { share: async () => { throw new Error('NotAllowed'); }, clipboard: { writeText: async (t) => { copied = t; } } };
  assert.equal(await shareLink(nav, link), 'copied');
  assert.equal(copied, link.url);
});

test('shareLink returns shared on success', async () => {
  assert.equal(await shareLink({ share: async () => {} }, link), 'shared');
});

test('shareLink returns manual when the clipboard rejects', async () => {
  const nav = { clipboard: { writeText: async () => { throw new Error('denied'); } } };
  assert.equal(await shareLink(nav, link), 'manual');
});

test('shareLink returns manual with no share APIs at all', async () => {
  assert.equal(await shareLink({}, link), 'manual');
});
