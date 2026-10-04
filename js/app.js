// Bootstrap and navigation. Owns the URL: every folder move and every opened
// file is a history entry, so the phone's Back button walks back through them.
// Other modules talk to it through `archive:*` events on document.

import { loadArchive, nodeAt, searchFiles, latestFiles, findFile } from './archive.js';
import { parseHash, buildHash } from './router.js';
import * as V from './views.js';
import { toast } from './toast.js';

const $ = (sel) => document.querySelector(sel);
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  root: null,
  ids: null, // ids of the folder on screen ([] = home); null before first render
  fileId: null, // file whose sheet is open
  sheetPushed: false, // sheet opened via pushState (so closing = history.back())
  query: '',
};

/* ---------- Rendering ---------- */

function renderView() {
  const { root, ids } = state;
  const node = nodeAt(root, ids);
  document.body.dataset.view = ids.length ? 'folder' : 'home';
  $('#trail').innerHTML = ids.length ? V.trailView(root, ids) : '';
  $('#view').innerHTML = ids.length
    ? V.folderView(node, ids, root)
    : V.homeView(root, homeState());
  document.title = ids.length ? `${node.label} · The Rider's Archive` : "The Rider's Archive · The Soul Aviator";
  reveal($('#view'));
}

function homeState() {
  return {
    query: state.query,
    results: searchFiles(state.root, state.query),
    latest: latestFiles(state.root, 4),
  };
}

function renderResults() {
  const s = homeState();
  $('#home-results').innerHTML = V.homeBody(state.root, s);
  $('[data-action="clear"]').hidden = !state.query;
  reveal($('#home-results'));
  if (state.query.trim()) {
    $('#live').textContent = s.results.length
      ? `${s.results.length} file${s.results.length === 1 ? '' : 's'} found`
      : 'No files match';
  }
}

/* Staggered drift-in for posters, crates and tickets as they scroll into view. */
let observer;
function reveal(scope) {
  const items = [...scope.querySelectorAll('.reveal')];
  if (!('IntersectionObserver' in window) || reducedMotion()) {
    items.forEach((el) => el.classList.add('is-entering'));
    return;
  }
  observer ??= new IntersectionObserver((entries) => {
    let n = 0;
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.style.setProperty('--delay', `${Math.min(n++, 8) * 60}ms`);
      e.target.classList.add('is-entering');
      observer.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -6% 0px' });
  items.forEach((el) => observer.observe(el));
}

/* ---------- Navigation ---------- */

const sameIds = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => x === b[i]);

function apply({ view, fileId }, { focus = false, transition = false, scrollY = null } = {}) {
  if (!sameIds(view, state.ids)) {
    state.ids = view;
    const swap = () => {
      renderView();
      if (scrollY !== null || focus) window.scrollTo(0, scrollY ?? 0);
      if (focus) ($('#view .section-title') || $('#view')).focus({ preventScroll: true });
    };
    if (transition && document.startViewTransition && !reducedMotion()) document.startViewTransition(swap);
    else swap();
  }
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

function navigate(view, fileId = null, { replace = false } = {}) {
  // remember where we were on this entry so Back lands in the same spot
  if (!replace) history.replaceState({ ...history.state, y: window.scrollY }, '');
  history[replace ? 'replaceState' : 'pushState']({ view, fileId }, '', urlFor(view, fileId));
  if (fileId && !replace) state.sheetPushed = true;
  apply({ view, fileId }, { focus: !fileId, transition: !fileId });
}

function fromLocation() {
  const parsed = parseHash(location.hash, state.root);
  return { view: parsed.ids, fileId: parsed.fileId, ok: parsed.ok };
}

// Land on whatever URL is in the address bar (first load, pasted or edited
// link): rewrite it to the canonical form and show the cold-trail note if it
// led nowhere.
function arrive(options = {}) {
  const start = fromLocation();
  history.replaceState({ view: start.view, fileId: start.fileId }, '', urlFor(start.view, start.fileId));
  // no animated swap for a dead link, or the async swap would wipe the note
  apply({ view: start.view, fileId: start.fileId }, start.ok ? options : { scrollY: 0 });
  if (!start.ok) $('#view').insertAdjacentHTML('afterbegin', V.coldTrailNote());
}

function onHistory(e) {
  const known = e.type === 'popstate' ? e.state : history.state;
  if (known && Array.isArray(known.view)) {
    apply({ view: known.view, fileId: known.fileId }, { transition: true, scrollY: known.y ?? 0 });
  } else {
    arrive({ transition: true, scrollY: 0 });
  }
}

/* ---------- Events ---------- */

function wire() {
  document.addEventListener('click', (e) => {
    const nav = e.target.closest('a[data-nav]');
    if (nav && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      const { ids } = parseHash(nav.getAttribute('href'), state.root);
      if (!sameIds(ids, state.ids)) navigate(ids);
      return;
    }
    const sign = e.target.closest('a.sign');
    if (sign) {
      e.preventDefault();
      state.query = '';
      if (state.ids.length) navigate([]);
      else renderView();
      return;
    }
    const fileBtn = e.target.closest('[data-file]');
    if (fileBtn) {
      navigate(state.ids, fileBtn.dataset.file);
      return;
    }
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'clear') {
      state.query = '';
      $('#code-search').value = '';
      renderResults();
      $('#code-search').focus();
    } else if (action === 'share-link') {
      shareCurrent();
    } else if (action === 'retry') {
      boot();
    }
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
    else navigate(state.ids, null, { replace: true });
  });

  addEventListener('popstate', onHistory);
  addEventListener('hashchange', onHistory);
}

async function shareCurrent() {
  const url = location.href;
  try {
    if (navigator.share) {
      await navigator.share({ title: document.title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast('Link copied — pass it along');
  } catch (err) {
    if (err?.name !== 'AbortError') toast('Couldn’t copy — use your browser’s share button');
  }
}

/* ---------- Boot ---------- */

async function boot() {
  try {
    const archive = await loadArchive();
    state.root = archive.root;
  } catch {
    document.body.dataset.view = 'home';
    $('#view').innerHTML = V.restingNote();
    return;
  }
  state.ids = null;
  arrive();
}

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
wire();
boot();
