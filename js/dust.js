// Dust drifting through the lamplight. A few dozen warm motes on a canvas,
// capped at 30 fps, paused while the tab is hidden, off for reduced motion.

export function startDust(canvas, { count = 38, fps = 30 } = {}) {
  const noop = { stop() {} };
  if (!canvas?.getContext || matchMedia('(prefers-reduced-motion: reduce)').matches) return noop;
  const ctx = canvas.getContext('2d');
  if (!ctx) return noop;

  let w = 0;
  let h = 0;
  let raf = 0;
  let last = 0;
  let stopped = false;
  const frame = 1000 / fps;

  const spawn = (anywhere) => ({
    x: Math.random() * w,
    y: anywhere ? Math.random() * h : h + 10,
    r: 0.6 + Math.random() * 1.6,
    vy: -(4 + Math.random() * 10), // px per second, rising slowly in the warm air
    sway: 6 + Math.random() * 14,
    phase: Math.random() * Math.PI * 2,
    speed: 0.25 + Math.random() * 0.5,
    alpha: 0.15 + Math.random() * 0.3,
  });

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  const motes = Array.from({ length: count }, () => spawn(true));

  // motes glow brighter near the top, where the lanterns hang
  function draw(dt, t) {
    ctx.clearRect(0, 0, w, h);
    for (const m of motes) {
      m.y += m.vy * dt;
      const x = m.x + Math.sin(t * m.speed + m.phase) * m.sway;
      if (m.y < -10) Object.assign(m, spawn(false));
      const light = 0.35 + 0.65 * Math.max(0, 1 - m.y / (h * 0.9));
      ctx.globalAlpha = m.alpha * light;
      ctx.fillStyle = '#f6c47a';
      ctx.beginPath();
      ctx.arc(x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop(now) {
    if (stopped) return;
    raf = requestAnimationFrame(loop);
    if (now - last < frame) return;
    const dt = Math.min(0.1, (now - (last || now)) / 1000);
    last = now;
    draw(dt, now / 1000);
  }

  let resizeTimer;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  };
  const onVisibility = () => {
    cancelAnimationFrame(raf);
    if (!document.hidden && !stopped) {
      last = 0;
      raf = requestAnimationFrame(loop);
    }
  };
  addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);
  raf = requestAnimationFrame(loop);

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      ctx.clearRect(0, 0, w, h);
    },
  };
}
