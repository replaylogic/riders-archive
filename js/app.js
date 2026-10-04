// Bootstrap and navigation for the single-page saloon. Owns the URL and the
// history stack: each folder, the Find scene and each opened file is an entry,
// so the phone's Back button walks back through them. Other modules talk to it
// through `archive:*` events on document.

import { loadArchive, nodeAt, searchFiles, latestFiles, findFile } from './archive.js';
import { parseHash, buildHash } from './router.js';
import * as V from './views.js';
import { toast } from './toast.js';
import { shareLink } from './share.js';
import { initSheet } from './sheet.js';

const $ = (sel) => document.querySelector(sel);
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  root: null,
  scene: null, // { view: string[], find: boolean } on screen; null before first render
  fileId: null, // file whose sheet is open
  sheetPushed: false, // sheet opened via pushState (so closing = history.back())
  findPushed: false, // Find opened via pushState (so closing = history.back())
  query: '',
};

/* ---------- Rendering ---------- */

function renderScene() {
  const { root } = state;
  const { view, find } = state.scene;
  const node = nodeAt(root, view);
  const name = find ? 'find' : view.length ? 'folder' : 'home';
  document.body.dataset.scene = name;
  $('#view').innerHTML = find
    ? V.findView({ query: state.query, results: searchFiles(root, state.query) })
    : view.length
      ? V.folderView(node, view, root)
      : V.homeView(root, { latest: latestFiles(root, 4) });
  document.title = find
    ? "Find a file · The Rider's Archive"
    : view.length ? `${node.label} · The Rider's Archive` : "The Rider's Archive · The Soul Aviator";
  document.querySelectorAll('[data-dock]').forEach((el) => {
    const on = el.dataset.dock === (find ? 'find' : view.length ? '' : 'home');
    if (on) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
}

function renderResults() {
  const results = searchFiles(state.root, state.query);
  $('#find-results').innerHTML = V.findResults({ query: state.query, results });
  $('[data-action="clear"]').hidden = !state.query;
}

/* ---------- Navigation ---------- */

const sameIds = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const sameScene = (a, b) => !!a && !!b && a.find === b.find && sameIds(a.view, b.view);
const depth = (s) => (s ? s.view.length + (s.find ? 1 : 0) : 0);

function apply({ view, fileId = null, find = false }, { focus = false, scrollY = null, animate = false } = {}) {
  const next = { view, find };
  if (!sameScene(next, state.scene)) {
    const prev = state.scene;
    state.scene = next;
    const swap = () => {
      renderScene();
      window.scrollTo(0, scrollY ?? 0);
      document.dispatchEvent(new CustomEvent('archive:scene', { detail: state.scene }));
      if (focus) {
        if (find) $('#code-search')?.focus();
        else ($('#view .scene-title') || $('#view')).focus({ preventScroll: true });
      }
    };
    if (animate && prev && document.startViewTransition && !reducedMotion()) {
      document.documentElement.dataset.dir = depth(next) >= depth(prev) ? 'forward' : 'back';
      document.startViewTransition(swap);
    } else swap();
  }
  if (!find) state.findPushed = false;
  if (fileId !== state.fileId) {
    state.fileId = fileId;
    const found = fileId && findFile(state.root, fileId);
    if (found) document.dispatchEvent(new CustomEvent('archive:open-file', { detail: found }));
    else {
      state.sheetPushed = false;
      document.dispatchEvent(new CustomEvent('archive:close-file'));
    }
  }
}

function urlFor(view, fileId) {
  const ids = fileId ? findFile(state.root, fileId).ids : view;
  return buildHash(state.root, ids, fileId) || location.pathname + location.search;
}

function push(entry, { replace = false } = {}) {
  // remember where we were on this entry so Back lands in the same spot
  if (!replace) history.replaceState({ ...history.state, y: window.scrollY }, '');
  const full = { view: entry.view, fileId: entry.fileId ?? null, find: !!entry.find };
  history[replace ? 'replaceState' : 'pushState'](full, '', urlFor(full.view, full.fileId));
  return full;
}

function navigate(view, fileId = null, { replace = false } = {}) {
  const find = !!fileId && !!state.scene?.find; // a file opened from Find keeps Find behind it
  const entry = push({ view: find ? state.scene.view : view, fileId, find }, { replace });
  if (fileId && !replace) state.sheetPushed = true;
  apply(entry, { focus: !fileId, animate: !fileId });
}

function openFind() {
  if (state.scene.find) return $('#code-search')?.focus();
  push({ view: state.scene.view, find: true });
  state.findPushed = true;
  apply({ view: state.scene.view, find: true }, { focus: true, animate: true });
}

function closeFind() {
  if (state.findPushed) history.back();
  else navigate(state.scene.view, null, { replace: true });
}

function fromLocation() {
  const parsed = parseHash(location.hash, state.root);
  return { view: parsed.ids, fileId: parsed.fileId, ok: parsed.ok };
}

// Land on whatever URL is in the address bar (first load, pasted or edited
// link): rewrite it to the canonical form and say so if it led nowhere.
function arrive(options = {}) {
  const start = fromLocation();
  push({ view: start.view, fileId: start.fileId }, { replace: true });
  apply({ view: start.view, fileId: start.fileId }, start.ok ? options : {});
  if (!start.ok) $('#view').insertAdjacentHTML('afterbegin', V.coldTrailNote());
}

function onHistory(e) {
  const known = e.type === 'popstate' ? e.state : history.state;
  if (known && Array.isArray(known.view)) {
    apply({ view: known.view, fileId: known.fileId, find: !!known.find }, { scrollY: known.y ?? 0, animate: true });
  } else {
    arrive({ animate: true });
  }
}

/* ---------- Events ---------- */

function pullThenGo(link, ids) {
  if (reducedMotion()) return navigate(ids);
  link.classList.add('is-pulled');
  setTimeout(() => navigate(ids), 170);
}

function wire() {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

    const home = e.target.closest('[data-home]');
    if (home) {
      e.preventDefault();
      if (state.scene.view.length || state.scene.find) navigate([]);
      else window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
      return;
    }
    const nav = e.target.closest('a[data-nav]');
    if (nav) {
      e.preventDefault();
      const { ids } = parseHash(nav.getAttribute('href'), state.root);
      if (sameIds(ids, state.scene.view) && !state.scene.find) return;
      if (nav.classList.contains('drawer')) pullThenGo(nav, ids);
      else navigate(ids);
      return;
    }
    const fileBtn = e.target.closest('[data-file]');
    if (fileBtn) {
      navigate(state.scene.view, fileBtn.dataset.file);
      return;
    }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'find') openFind();
    else if (action === 'close-find') closeFind();
    else if (action === 'clear') {
      state.query = '';
      $('#code-search').value = '';
      renderResults();
      $('#code-search').focus();
    } else if (action === 'share-link') shareCurrent();
    else if (action === 'retry') boot();
  });

  let debounce;
  document.addEventListener('input', (e) => {
    if (e.target.id !== 'code-search') return;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      state.query = e.target.value;
      renderResults();
    }, 120);
  });
  document.addEventListener('submit', (e) => {
    if (!e.target.matches('[data-search]')) return;
    e.preventDefault();
    $('#code-search').blur(); // closes the phone keyboard to reveal results
  });

  document.addEventListener('archive:request-close', () => {
    if (state.sheetPushed) history.back();
    else navigate(state.scene.view, null, { replace: true });
  });

  addEventListener('popstate', onHistory);
  addEventListener('hashchange', onHistory);

  const markScrolled = () => document.body.classList.toggle('is-scrolled', window.scrollY > 24);
  addEventListener('scroll', markScrolled, { passive: true });
  document.addEventListener('archive:scene', markScrolled);
}

async function shareCurrent() {
  const result = await shareLink(navigator, { title: document.title, url: location.href });
  if (result === 'copied') toast('Link copied');
  if (result === 'manual') toast('Copy the address from your browser bar', 2600);
}

/* ---------- Boot ---------- */

async function boot() {
  try {
    const archive = await loadArchive();
    state.root = archive.root;
  } catch {
    document.body.dataset.scene = 'home';
    $('#view').innerHTML = V.restingNote();
    return;
  }
  state.scene = null;
  arrive();
}

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
initSheet();
wire();
boot();
