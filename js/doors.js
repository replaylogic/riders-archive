// The swinging-door intro. A fresh visit waits for a push (that tap is also
// what lets the browser start music); a shared link opens the doors by
// themselves, silently; a second visit in the same session skips them.

const OMEGA_AUTO = 1.7; // shared-link doors swing this much faster

export function doorMode({ hasHash, seen }) {
  if (seen) return 'skip';
  return hasHash ? 'auto' : 'interactive';
}

// Damped swing in degrees: A·e^(−ζωt)·sin(ω_d·t), scaled so the first peak is `peak`.
export function swingAngle(t, { peak = 100, zeta = 0.22, omega = 6.2 } = {}) {
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  const tPeak = Math.atan(wd / (zeta * omega)) / wd;
  const amp = peak / (Math.exp(-zeta * omega * tPeak) * Math.sin(wd * tPeak));
  return amp * Math.exp(-zeta * omega * t) * Math.sin(wd * t);
}

// A short wooden creak, synthesised: band-passed noise plus a stuttering low saw.
export function creak(ctx) {
  const now = ctx.currentTime;
  const dur = 0.75;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 9;
  band.frequency.setValueAtTime(950, now);
  band.frequency.exponentialRampToValueAtTime(520, now + dur);

  const saw = ctx.createOscillator();
  saw.type = 'sawtooth';
  saw.frequency.setValueAtTime(150, now);
  saw.frequency.linearRampToValueAtTime(92, now + dur);
  const low = ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 1100;
  const stutter = ctx.createGain();
  stutter.gain.value = 0.45;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 26;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.45;
  lfo.connect(lfoDepth).connect(stutter.gain);

  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(0.07, now + 0.07);
  out.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  noise.connect(band).connect(out);
  saw.connect(low).connect(stutter).connect(out);
  out.connect(ctx.destination);
  [noise, saw, lfo].forEach((n) => { n.start(now); n.stop(now + dur); });
}

function playCreak() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    creak(ctx);
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* no sound is fine */
  }
}

function setInert(on) {
  document.querySelectorAll('#app, .dock').forEach((el) => { el.inert = on; });
}

function finish(el, resolve) {
  el.remove();
  document.documentElement.classList.remove('doors-pending');
  setInert(false);
  resolve();
}

function swing(el, { speed, reducedMotion }) {
  return new Promise((resolve) => {
    const left = el.querySelector('.door--l');
    const right = el.querySelector('.door--r');
    if (reducedMotion) {
      el.classList.add('is-leaving');
      setTimeout(() => finish(el, resolve), 450);
      return;
    }
    const start = performance.now();
    let leaving = false;
    const frame = (now) => {
      const t = ((now - start) / 1000) * speed;
      const a = swingAngle(t);
      left.style.transform = `rotateY(${a}deg)`;
      right.style.transform = `rotateY(${-a}deg)`;
      el.style.setProperty('--open', Math.min(1, Math.abs(a) / 90).toFixed(3));
      if (!leaving && t > 0.42) {
        leaving = true;
        el.classList.add('is-leaving');
        setTimeout(() => finish(el, resolve), 900 / Math.min(speed, 1.3));
      }
      if (t < 3) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

export function runDoors({ mode, reducedMotion, onEnter, onSeen }) {
  const el = document.getElementById('doors');
  if (!el) return Promise.resolve();
  if (mode === 'skip') {
    finish(el, () => {});
    return Promise.resolve();
  }
  el.hidden = false;
  setInert(true);
  onSeen();

  if (mode === 'auto') {
    el.classList.add('is-auto');
    return new Promise((resolve) => {
      setTimeout(() => swing(el, { speed: OMEGA_AUTO, reducedMotion }).then(resolve), 380);
    });
  }

  const push = el.querySelector('.doors__push');
  push.focus({ preventScroll: true });
  return new Promise((resolve) => {
    const enter = (e) => {
      if (e.type === 'keydown' && !['Enter', ' '].includes(e.key)) return;
      e.preventDefault();
      el.removeEventListener('click', enter);
      el.removeEventListener('keydown', enter);
      onEnter({ withSound: true }); // synchronous: still inside the gesture for iOS audio
      playCreak();
      swing(el, { speed: 1, reducedMotion }).then(resolve);
    };
    el.addEventListener('click', enter);
    el.addEventListener('keydown', enter);
  });
}
