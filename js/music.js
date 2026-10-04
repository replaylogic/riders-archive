// Quiet shuffled background music. Browsers only allow sound after a tap, so
// start()/toggle() must be called from inside one; play() is called
// synchronously for iOS. Volume goes through a Web Audio gain node because
// iOS ignores audio.volume.

import { makeShuffle } from './playlist.js';

export const VOLUME = 0.28;
const FADE_IN = 3;
const CROSSFADE = 2.5;
const PREFETCH = 20;
const FADE_OUT = 0.6;

let sharedCtx;

function volumeGain(el) {
  let timer;
  return {
    set(v) { clearInterval(timer); el.volume = v; },
    fadeTo(v, s) {
      clearInterval(timer);
      const from = el.volume;
      const steps = Math.max(1, Math.round(s * 20));
      let i = 0;
      timer = setInterval(() => {
        i++;
        el.volume = Math.min(1, Math.max(0, from + ((v - from) * i) / steps));
        if (i >= steps) clearInterval(timer);
      }, 50);
    },
  };
}

export function webAudioGain(el) {
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Ctx) return volumeGain(el);
  try {
    sharedCtx ??= new Ctx();
    const ctx = sharedCtx;
    const node = ctx.createGain();
    ctx.createMediaElementSource(el).connect(node).connect(ctx.destination);
    const wake = () => { if (ctx.state === 'suspended') ctx.resume(); };
    return {
      set(v) {
        wake();
        node.gain.cancelScheduledValues(ctx.currentTime);
        node.gain.setValueAtTime(v, ctx.currentTime);
      },
      fadeTo(v, s) {
        wake();
        const now = ctx.currentTime;
        node.gain.cancelScheduledValues(now);
        node.gain.setValueAtTime(node.gain.value, now);
        node.gain.linearRampToValueAtTime(v, now + s);
      },
    };
  } catch {
    return volumeGain(el);
  }
}

export function createMusic({ tracks, store, makeAudio = () => new Audio(), makeGain = webAudioGain, rng = Math.random }) {
  const order = makeShuffle(tracks, rng);
  const failed = new Set();
  const listeners = [];
  let deck = null; // the record playing now
  let next = null; // the record waiting in the wings
  let playing = false;
  let available = true;
  let hiddenPause = false;

  const emit = () => listeners.forEach((cb) => cb({ playing, available }));

  function load(track) {
    const el = makeAudio();
    el.preload = 'auto';
    el.src = track.src;
    const entry = { el, track, gain: makeGain(el), crossing: false };
    entry.gain.set(0);
    el.addEventListener('timeupdate', () => onTime(entry));
    el.addEventListener('ended', () => onEnded(entry));
    el.addEventListener('error', () => onError(entry));
    return entry;
  }

  function pickNext() {
    for (let i = 0; i < tracks.length * 2; i++) {
      const t = order.next();
      if (!failed.has(t.src)) return t;
    }
    return null;
  }

  function onTime(entry) {
    if (entry !== deck || !playing) return;
    const left = entry.el.duration - entry.el.currentTime;
    if (!Number.isFinite(left)) return;
    if (left <= PREFETCH && !next) {
      const t = pickNext();
      if (t) next = load(t);
    }
    if (left <= CROSSFADE && next && !entry.crossing) {
      entry.crossing = true;
      advance(CROSSFADE);
    }
  }

  function onEnded(entry) {
    if (entry === deck && playing && !entry.crossing) advance(0.5);
  }

  function advance(seconds) {
    const old = deck;
    if (!next) {
      const t = pickNext();
      if (!t) return giveUp();
      next = load(t);
    }
    deck = next;
    next = null;
    Promise.resolve(deck.el.play()).catch(() => {});
    deck.gain.fadeTo(VOLUME, seconds);
    old.gain.fadeTo(0, seconds);
    setTimeout(() => old.el.pause(), seconds * 1000 + 100);
  }

  function onError(entry) {
    failed.add(entry.track.src);
    if (entry === next) next = null;
    if (entry !== deck) return;
    if (failed.size >= tracks.length) return giveUp();
    const t = pickNext();
    if (!t) return giveUp();
    deck = load(t);
    if (playing) {
      Promise.resolve(deck.el.play()).catch(() => {});
      deck.gain.fadeTo(VOLUME, 1);
    }
  }

  function giveUp() {
    available = false;
    playing = false;
    emit();
  }

  function begin() {
    if (!available) return Promise.resolve(false);
    if (!deck) {
      const t = pickNext();
      if (!t) return Promise.resolve(false);
      deck = load(t);
    }
    let attempt;
    try {
      attempt = Promise.resolve(deck.el.play());
    } catch (err) {
      attempt = Promise.reject(err);
    }
    deck.gain.fadeTo(VOLUME, FADE_IN);
    return attempt.then(
      () => { playing = true; emit(); return true; },
      () => { playing = false; deck.gain.set(0); emit(); return false; },
    );
  }

  function quiet(seconds) {
    const d = deck;
    if (!d) return;
    d.gain.fadeTo(0, seconds);
    setTimeout(() => { if (!playing || hiddenPause) d.el.pause(); }, seconds * 1000 + 50);
  }

  return {
    start() {
      if (store.get('music', 'on') === 'off') return Promise.resolve(false);
      return begin();
    },
    toggle() {
      if (playing) {
        store.set('music', 'off');
        playing = false;
        emit();
        quiet(FADE_OUT);
        return Promise.resolve(false);
      }
      store.set('music', 'on');
      return begin();
    },
    // Fade out while the tab is hidden; come back if it was playing.
    setHidden(hidden) {
      if (hidden && playing) {
        hiddenPause = true;
        playing = false;
        quiet(0.4);
      } else if (!hidden && hiddenPause) {
        hiddenPause = false;
        begin();
      }
    },
    isPlaying: () => playing,
    isAvailable: () => available,
    onChange(cb) { listeners.push(cb); },
  };
}
