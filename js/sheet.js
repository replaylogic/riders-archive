// The parchment file sheet. Opens/closes in response to app.js's
// `archive:open-file` / `archive:close-file` events; asks app.js to close
// (so the URL and history stay in step) with `archive:request-close`.

import { fileTypeLabel } from './archive.js';
import { esc, formatDate } from './views.js';
import { shareLink, copyText } from './share.js';
import { toast } from './toast.js';

const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';
let root;
let page;
let current = null;
let returnFocus = null;
let closeTimer;

const requestClose = () => document.dispatchEvent(new CustomEvent('archive:request-close'));

function markup({ file, labels }) {
  const type = fileTypeLabel(file.fileType);
  const href = encodeURI(file.link);
  const name = file.link.split('/').pop();
  const preview = file.fileType === 'image'
    ? `<img src="${esc(href)}" alt="Preview of ${esc(file.label)}" loading="lazy" decoding="async">`
    : `<span class="stamp stamp--big" aria-hidden="true">${type}</span>`;
  const facts = [
    file.size && `<div><dt>Size</dt><dd>${esc(file.size)}</dd></div>`,
    file.added && `<div><dt>Added</dt><dd>${formatDate(file.added)}</dd></div>`,
    `<div><dt>Type</dt><dd>${type}</dd></div>`,
  ].filter(Boolean).join('');
  return `<div class="sheet__backdrop" data-close></div>
    <div class="sheet__page" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabindex="-1">
      <div class="sheet__grip" aria-hidden="true"><span></span></div>
      <button class="sheet__close" type="button" data-close aria-label="Close"><svg class="ico" aria-hidden="true"><use href="#i-close"/></svg></button>
      <p class="sheet__no">No. ${esc(file.code || '—')}</p>
      <h2 class="sheet__title" id="sheet-title">${esc(file.label)}</h2>
      ${labels.length ? `<p class="sheet__path">${esc(labels.join(' › '))}</p>` : ''}
      <div class="sheet__preview">${preview}</div>
      <dl class="sheet__facts">${facts}</dl>
      <div class="sheet__actions">
        <a class="btn-brass" href="${esc(href)}" target="_blank" rel="noopener"><svg class="ico" aria-hidden="true"><use href="#i-open"/></svg>Open</a>
        <a class="btn-brass" href="${esc(href)}" download="${esc(name)}"><svg class="ico" aria-hidden="true"><use href="#i-download"/></svg>Download</a>
        <button class="btn-brass btn-ghost" type="button" data-sheet="share"><svg class="ico" aria-hidden="true"><use href="#i-share"/></svg>Share</button>
        <button class="btn-brass btn-ghost" type="button" data-sheet="copy"><svg class="ico" aria-hidden="true"><use href="#i-copy"/></svg>Copy code</button>
      </div>
      <div class="sheet__manual" hidden>
        <label for="sheet-link">Press and hold to copy this link</label>
        <input id="sheet-link" type="text" readonly>
      </div>
    </div>`;
}

function showManual(text) {
  const box = page.querySelector('.sheet__manual');
  const input = box.querySelector('input');
  input.value = text;
  box.hidden = false;
  input.focus();
  input.select();
}

async function onAction(kind) {
  if (kind === 'share') {
    const url = location.href;
    const result = await shareLink(navigator, { title: `${current.file.label} · The Rider's Archive`, url });
    if (result === 'copied') toast('Link copied — pass it along');
    if (result === 'manual') showManual(url);
  } else if (kind === 'copy') {
    const code = current.file.code || '';
    const result = await copyText(navigator, code);
    if (result === 'copied') toast(`Code ${code} copied`);
    else showManual(code);
  }
}

/* Drag the sheet down to dismiss (touch and mouse). */
function wireSwipe() {
  let startY = 0;
  let startT = 0;
  let dy = 0;
  let dragging = false;
  page.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.sheet__grip, .sheet__no, .sheet__title') || e.button > 0) return;
    if (page.scrollTop > 0) return;
    dragging = true;
    startY = e.clientY;
    startT = performance.now();
    dy = 0;
    page.setPointerCapture(e.pointerId);
    page.classList.add('is-dragging');
  });
  page.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dy = Math.max(0, e.clientY - startY);
    page.style.transform = `translateY(${dy}px)`;
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    page.classList.remove('is-dragging');
    const velocity = dy / Math.max(1, performance.now() - startT);
    page.style.transform = '';
    if (dy > 80 || velocity > 0.5) requestClose();
  };
  page.addEventListener('pointerup', end);
  page.addEventListener('pointercancel', end);
}

function trapFocus(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    requestClose();
    return;
  }
  if (e.key !== 'Tab') return;
  const items = [...page.querySelectorAll(FOCUSABLE)].filter((el) => !el.closest('[hidden]'));
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

export function openSheet(found) {
  clearTimeout(closeTimer);
  current = found;
  // Safari doesn't focus buttons on tap, so fall back to the ticket itself
  const active = document.activeElement;
  returnFocus = active && active !== document.body && !root.contains(active)
    ? active
    : document.querySelector(`#app [data-file="${CSS.escape(found.file.id)}"]`);
  root.innerHTML = markup(found);
  page = root.querySelector('.sheet__page');
  wireSwipe();
  root.hidden = false;
  document.documentElement.classList.add('sheet-open');
  document.querySelectorAll('#app, .dock').forEach((el) => { el.inert = true; });
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-open')));
  page.focus({ preventScroll: true });
}

export function closeSheet() {
  if (!current) return;
  current = null;
  root.classList.remove('is-open');
  document.documentElement.classList.remove('sheet-open');
  document.querySelectorAll('#app, .dock').forEach((el) => { el.inert = false; });
  closeTimer = setTimeout(() => {
    root.hidden = true;
    root.innerHTML = '';
  }, 450);
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
}

export const isSheetOpen = () => !!current;

export function initSheet() {
  root = document.getElementById('sheet');
  root.classList.add('sheet');
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) requestClose();
    const kind = e.target.closest('[data-sheet]')?.dataset.sheet;
    if (kind) onAction(kind);
  });
  root.addEventListener('keydown', trapFocus);
  document.addEventListener('archive:open-file', (e) => openSheet(e.detail));
  document.addEventListener('archive:close-file', closeSheet);
}
