import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMusic, VOLUME } from '../js/music.js';

const tracks = [
  { src: 'audio/a.mp3', title: 'A', artist: 'x' },
  { src: 'audio/b.mp3', title: 'B', artist: 'y' },
];

function fakeStore(initial) {
  const m = new Map(initial ? [['music', initial]] : []);
  return { get: (k, fb) => (m.has(k) ? m.get(k) : fb), set: (k, v) => m.set(k, v), m };
}

function rig({ playResult = 'resolve', store = fakeStore() } = {}) {
  const audios = [];
  const fades = [];
  const makeAudio = () => {
    const handlers = {};
    const el = {
      plays: 0,
      paused: true,
      currentTime: 0,
      duration: 200,
      addEventListener: (t, f) => { (handlers[t] ||= []).push(f); },
      fire: (t) => (handlers[t] || []).forEach((f) => f()),
      play() {
        el.plays++;
        el.paused = false;
        return playResult === 'resolve' ? Promise.resolve() : Promise.reject(new Error('NotAllowedError'));
      },
      pause() { el.paused = true; },
    };
    audios.push(el);
    return el;
  };
  const makeGain = (el) => ({ set: (v) => fades.push({ el, to: v, s: 0 }), fadeTo: (v, s) => fades.push({ el, to: v, s }) });
  const music = createMusic({ tracks, store, makeAudio, makeGain, rng: () => 0.3 });
  return { music, audios, fades, store };
}

test('start does nothing when the visitor muted music before', async () => {
  const { music, audios } = rig({ store: fakeStore('off') });
  assert.equal(await music.start(), false);
  assert.equal(audios.reduce((n, a) => n + a.plays, 0), 0);
  assert.equal(music.isPlaying(), false);
});

test('start calls play synchronously and fades in to the quiet volume', async () => {
  const { music, audios, fades } = rig();
  const pending = music.start();
  assert.equal(audios[0].plays, 1); // before any await — still inside the tap
  assert.ok(fades.some((f) => f.to === VOLUME && f.s === 3));
  assert.equal(await pending, true);
  assert.equal(music.isPlaying(), true);
  assert.ok(VOLUME > 0.2 && VOLUME < 0.35);
});

test('a refused play leaves music off instead of pretending', async () => {
  const { music } = rig({ playResult: 'reject' });
  assert.equal(await music.start(), false);
  assert.equal(music.isPlaying(), false);
});

test('toggle while playing mutes and remembers it', async () => {
  const { music, store } = rig();
  await music.start();
  assert.equal(await music.toggle(), false);
  assert.equal(music.isPlaying(), false);
  assert.equal(store.m.get('music'), 'off');
});

test('toggle while muted plays and remembers it', async () => {
  const { music, store, audios } = rig({ store: fakeStore('off') });
  assert.equal(await music.toggle(), true);
  assert.equal(store.m.get('music'), 'on');
  assert.equal(audios[0].plays, 1);
});

test('onChange reports music unavailable when every track fails to load', async () => {
  const { music, audios } = rig();
  const seen = [];
  music.onChange((s) => seen.push(s));
  await music.start();
  for (let i = 0; i < 4 && audios[i]; i++) audios[i].fire('error');
  assert.equal(seen.at(-1).available, false);
  assert.equal(music.isPlaying(), false);
});

test('the next track is loaded near the end and crossfaded in', async () => {
  const { music, audios, fades } = rig();
  await music.start();
  const first = audios[0];
  first.currentTime = 185; // 15 s left → prefetch
  first.fire('timeupdate');
  assert.equal(audios.length, 2);
  assert.equal(audios[1].plays, 0);
  first.currentTime = 198; // 2 s left → crossfade
  first.fire('timeupdate');
  assert.equal(audios[1].plays, 1);
  assert.ok(fades.some((f) => f.el === first && f.to === 0));
  assert.ok(fades.some((f) => f.el === audios[1] && f.to === VOLUME));
});
