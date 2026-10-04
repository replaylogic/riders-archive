// HTML builders for every scene. Pure string functions (no DOM) so they can be
// tested in Node; app.js inserts the output and wires the behaviour.

import { countFiles, fileTypeLabel } from './archive.js';
import { buildHash } from './router.js';

const ICONS = { camping: 'i-tent', treks: 'i-peak', quick_rides: 'i-cup', ride_circuits: 'i-road', guides_tips: 'i-compass' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const INSTAGRAM = 'https://www.instagram.com/thesoulaviator/';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const icon = (id) => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;
const files = (n) => `${n} file${n === 1 ? '' : 's'}`;

export function formatDate(iso) {
  const [y, m, d] = (iso || '').split('-').map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : '';
}

/* ---------- Pieces ---------- */

export function drawer(node, href, index, iconId = ICONS[node.id] || 'i-compass') {
  const n = countFiles(node);
  return `<li style="--i:${index}"><a class="drawer" href="${href}" data-nav>
    <span class="drawer__icon">${icon(iconId)}</span>
    <span class="drawer__plate">
      <span class="drawer__label">${esc(node.label)}</span>
      ${node.meta?.info ? `<span class="drawer__meta">${esc(node.meta.info)}</span>` : ''}
    </span>
    <span class="drawer__count${n ? '' : ' is-soon'}">${n ? `<b>${n}</b> file${n === 1 ? '' : 's'}` : '<b aria-hidden="true">—</b> Coming soon'}</span>
    <span class="drawer__pull" aria-hidden="true"></span>
  </a></li>`;
}

export function ticket({ file, labels = [] }, { showPath = false } = {}) {
  const type = fileTypeLabel(file.fileType);
  const meta = [file.size, file.added && formatDate(file.added)].filter(Boolean).join(' · ');
  return `<li><button class="ticket" type="button" data-file="${esc(file.id)}">
    <span class="ticket__no">No. ${esc(file.code || '—')}</span>
    <span class="ticket__body">
      <span class="ticket__label">${esc(file.label)}</span>
      <span class="ticket__meta">${esc(meta)}</span>
      ${showPath && labels.length ? `<span class="ticket__path">${esc(labels.join(' › '))}</span>` : ''}
    </span>
    <span class="stamp" aria-hidden="true">${type}</span>
  </button></li>`;
}

export function fresh(latest) {
  if (!latest.length) return '';
  return `<section class="fresh" aria-labelledby="fresh-h">
    <header class="sec-head"><h2 id="fresh-h">Fresh off the trail</h2><p>Newest in the cabinet</p></header>
    <ol class="rail">${latest.map(({ file }) => `<li><button class="stub" type="button" data-file="${esc(file.id)}">
      <span class="stub__no">No. ${esc(file.code)}</span>
      <span class="stub__label">${esc(file.label)}</span>
      <span class="stub__meta">${fileTypeLabel(file.fileType)} · ${formatDate(file.added)}</span>
    </button></li>`).join('')}</ol>
  </section>`;
}

/* ---------- Scenes ---------- */

export function homeView(root, { latest }) {
  const drawers = (root.children || [])
    .filter((c) => c.type === 'folder')
    .map((c, i) => drawer(c, buildHash(root, [c.id]), i))
    .join('');
  return `<h1 class="vh">The Rider's Archive</h1>
    <section class="hero">
      <div class="hero__lamps" aria-hidden="true">
        <span class="lamp"><span class="lamp__glow"></span><svg viewBox="0 0 60 120"><use href="#lantern-art"/></svg></span>
        <span class="lamp"><span class="lamp__glow"></span><svg viewBox="0 0 60 120"><use href="#lantern-art"/></svg></span>
      </div>
      <span class="hero__logo"><img src="images/logo.png" alt="" width="691" height="413" decoding="async" fetchpriority="high"></span>
      <p class="hero__line">For the roads, mountains &amp; stories in between.</p>
      <button class="findpill" type="button" data-action="find">
        ${icon('i-search')}<span>Find a file by number or name</span><kbd>No.</kbd>
      </button>
    </section>

    <section class="cabinet" aria-labelledby="cab-h">
      <header class="sec-head"><h2 id="cab-h">The cabinet</h2><p>Pull a drawer</p></header>
      <ul class="drawers">${drawers}</ul>
    </section>

    ${fresh(latest)}

    <section class="letter" aria-label="A note from The Soul Aviator">
      <div class="letter__paper">
        <p class="letter__hello">Howdy, traveler.</p>
        <p>These are memoirs of a rider, trekker &amp; traveller — the routes, lists and lessons from the road, kept here for whoever rides next.</p>
        <p>Pull up a chair, take what helps you ride, and leave the trail better than you found it.</p>
        <p class="letter__sign">The Soul Aviator<span>Stay humble. Stay real.</span></p>
        <a class="seal" href="${INSTAGRAM}" target="_blank" rel="noopener" aria-label="The Soul Aviator on Instagram">
          <img src="images/thesoulaviator.png" alt="" width="174" height="174" loading="lazy" decoding="async">
        </a>
      </div>
    </section>

    <footer class="foot">
      <p class="foot__motto">Ride hard &amp; tread lightly</p>
      <p class="foot__links"><a href="${INSTAGRAM}" target="_blank" rel="noopener">${icon('i-instagram')}@thesoulaviator</a><a href="audio/CREDITS.md">Music credits</a></p>
    </footer>`;
}

export function folderView(node, ids, root) {
  const parentHash = buildHash(root, ids.slice(0, -1)) || '#/';
  const ancestors = [];
  let walk = root;
  ids.slice(0, -1).forEach((id, i) => {
    walk = walk.children.find((c) => c.id === id);
    ancestors.push(`<a href="${buildHash(root, ids.slice(0, i + 1))}" data-nav>${esc(walk.label)}</a>`);
  });
  const parentLabel = ids.length > 1 ? walk.label : 'the saloon';
  const iconId = ICONS[ids[0]] || 'i-compass';

  const folders = (node.children || []).filter((c) => c.type === 'folder');
  const items = (node.children || []).filter((c) => c.type === 'file');
  const drawers = folders.length
    ? `<ul class="drawers">${folders.map((f, i) => drawer(f, buildHash(root, [...ids, f.id]), i, iconId)).join('')}</ul>`
    : '';
  const tickets = items.length
    ? `<ul class="tickets">${items.map((file) => ticket({ file, ids, labels: [] })).join('')}</ul>`
    : '';
  const empty = !folders.length && !items.length
    ? `<div class="empty">${icon(iconId)}<p>This drawer is empty for now.</p><p>New routes land here after the next ride.</p></div>`
    : '';

  return `<header class="scene-head">
      <a class="back" href="${parentHash}" data-nav aria-label="Back to ${esc(parentLabel)}">${icon('i-back')}</a>
      <div class="scene-head__text">
        <nav class="crumbs" aria-label="Path"><a href="#/" data-nav>Saloon</a>${ancestors.map((a) => `<span aria-hidden="true">›</span>${a}`).join('')}</nav>
        <h1 class="scene-title" tabindex="-1">${esc(node.label)}</h1>
        ${node.meta?.info ? `<p class="scene-meta">${esc(node.meta.info)}</p>` : ''}
      </div>
      <button class="iconbtn" type="button" data-action="share-link" aria-label="Share a link to this drawer">${icon('i-share')}</button>
    </header>
    ${drawers}${tickets}${empty}`;
}

export function findResults({ query, results }) {
  const q = (query || '').trim();
  if (!q) {
    return `<p class="hint">Every file has a number — it’s on the post that sent you here. Type it above, or a word like “Ladakh”.</p>`;
  }
  if (!results.length) {
    return `<p class="hint">No file numbered or named “${esc(q)}”. Check the number on the post, or try a place like “Sahyadri”.</p>`;
  }
  return `<p class="count">${files(results.length)}</p>
    <ul class="tickets">${results.map((r) => ticket(r, { showPath: true })).join('')}</ul>`;
}

export function findView(state) {
  return `<header class="scene-head scene-head--find">
      <button class="back" type="button" data-action="close-find" aria-label="Close search">${icon('i-back')}</button>
      <form class="findbar" role="search" action="#" data-search>
        <label class="vh" for="code-search">Find a file by number or name</label>
        ${icon('i-search')}
        <input id="code-search" type="search" name="q" value="${esc(state.query)}" placeholder="Number or name, e.g. 0004"
          autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">
        <button class="findbar__clear" type="button" data-action="clear" aria-label="Clear search"${state.query ? '' : ' hidden'}>${icon('i-close')}</button>
      </form>
    </header>
    <div id="find-results" aria-live="polite">${findResults(state)}</div>`;
}

export function coldTrailNote() {
  return `<div class="notice" role="status"><p>That link leads nowhere now — the file may have moved. You’re back in the saloon.</p></div>`;
}

export function restingNote() {
  return `<div class="notice notice--error" role="alert"><p>Couldn’t open the archive. Check your connection, then try again.</p>
    <button class="btn" type="button" data-action="retry">Try again</button></div>`;
}
