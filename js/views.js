// HTML builders for every view. Pure string functions (no DOM) so they can be
// tested in Node; app.js inserts the output and wires the behaviour.

import { countFiles, fileTypeLabel } from './archive.js';
import { buildHash } from './router.js';

const ICONS = { camping: 'i-tent', treks: 'i-peak', quick_rides: 'i-cup', ride_circuits: 'i-road', guides_tips: 'i-compass' };
const TILTS = [-1.6, 1.2, -0.7, 1.8, -1.2, 0.6, -0.4, 1.4];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const icon = (id, cls = 'ico') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
const tilt = (i) => TILTS[i % TILTS.length];
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 'S'}`;

export function formatDate(iso) {
  const [y, m, d] = (iso || '').split('-').map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : '';
}

export function poster(node, index) {
  const n = countFiles(node);
  const count = n
    ? `<span class="poster__count">${plural(n, 'FILE')}</span>`
    : '<span class="poster__count poster__count--soon">COMING SOON</span>';
  return `<li><a class="poster reveal" href="#/${encodeURIComponent(node.label)}" data-nav style="--tilt:${tilt(index)}deg">
    <span class="nail" aria-hidden="true"></span>
    <span class="poster__paper">
      <span class="poster__kicker" aria-hidden="true">Wanted</span>
      <span class="poster__icon">${icon(ICONS[node.id] || 'i-compass')}</span>
      <span class="poster__title">${esc(node.label)}</span>
      ${node.meta?.info ? `<span class="poster__meta">${esc(node.meta.info)}</span>` : ''}
      ${count}
    </span>
  </a></li>`;
}

export function crate(node, href) {
  const n = countFiles(node);
  return `<li><a class="crate reveal" href="${href}" data-nav>
    <span class="crate__label">${esc(node.label)}</span>
    <span class="crate__count">${n ? plural(n, 'FILE') : 'EMPTY FOR NOW'}</span>
  </a></li>`;
}

export function ticket({ file, labels = [] }, { showPath = false, index = 0 } = {}) {
  const meta = [fileTypeLabel(file.fileType), file.size, file.added && `Added ${formatDate(file.added)}`].filter(Boolean).join(' · ');
  return `<li><button class="ticket reveal" type="button" data-file="${esc(file.id)}" style="--tilt:${tilt(index + 3) / 2}deg">
    <span class="ticket__no">No. ${esc(file.code || '—')}</span>
    <span class="ticket__label">${esc(file.label)}</span>
    <span class="ticket__meta">${esc(meta)}</span>
    ${showPath && labels.length ? `<span class="ticket-path">${esc(labels.join(' › '))}</span>` : ''}
    <span class="stamp" aria-hidden="true">${fileTypeLabel(file.fileType)}</span>
  </button></li>`;
}

function board(latest) {
  if (!latest.length) return '';
  return `<section class="board reveal" aria-labelledby="fresh-title">
    <h2 id="fresh-title">Fresh off the trail</h2>
    <ol>${latest.map(({ file }) => `<li><button type="button" data-file="${esc(file.id)}">
      <span class="b-code">No. ${esc(file.code)}</span>
      <span class="b-label">${esc(file.label)}</span>
      <span class="b-meta">${fileTypeLabel(file.fileType)} · ${formatDate(file.added)}</span>
    </button></li>`).join('')}</ol>
  </section>`;
}

export function homeBody(root, { query, results, latest }) {
  if (query && query.trim()) {
    if (!results.length) {
      return `<p class="results-note">No files match “${esc(query.trim())}”. Try a code like 0004, or a word like “Ladakh”.</p>`;
    }
    return `<h2 class="rule">${plural(results.length, 'FILE')} FOUND</h2>
      <ul class="tickets">${results.map((r, i) => ticket(r, { showPath: true, index: i })).join('')}</ul>`;
  }
  return `${board(latest)}
    <h2 class="rule">On the wall</h2>
    <ul class="posters">${(root.children || []).map(poster).join('')}</ul>`;
}

export function homeView(root, state) {
  return `<h1 class="vh">The Rider's Archive</h1>
    <form class="plate" role="search" action="#" data-search>
      <label for="code-search">Find by code</label>
      <div class="plate__field">
        ${icon('i-search')}
        <input id="code-search" type="search" name="q" value="${esc(state.query)}" placeholder="e.g. 0004 or Ladakh"
          autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">
        <button class="plate__clear" type="button" data-action="clear" aria-label="Clear search"${state.query ? '' : ' hidden'}>${icon('i-close')}</button>
      </div>
    </form>
    <div id="home-results">${homeBody(root, state)}</div>`;
}

export function folderView(node, ids, root) {
  const folders = (node.children || []).filter((c) => c.type === 'folder');
  const files = (node.children || []).filter((c) => c.type === 'file');
  const crates = folders.length
    ? `<ul class="crates">${folders.map((f) => crate(f, buildHash(root, [...ids, f.id]))).join('')}</ul>`
    : '';
  const tickets = files.length
    ? `<ul class="tickets">${files.map((file, i) => ticket({ file, ids, labels: [] }, { index: i })).join('')}</ul>`
    : '';
  const empty = !folders.length && !files.length
    ? '<div class="empty-note"><p>Nothing on this shelf yet — check back after the next ride.</p></div>'
    : '';
  return `<h1 class="section-title" tabindex="-1">${esc(node.label)}</h1>
    ${node.meta?.info ? `<p class="section-meta">${esc(node.meta.info)}</p>` : '<p class="section-meta">&nbsp;</p>'}
    ${crates}${tickets}${empty}`;
}

export function trailView(root, ids) {
  const steps = [];
  let node = root;
  ids.forEach((id, i) => {
    node = node?.children?.find((c) => c.id === id);
    if (!node) return;
    const current = i === ids.length - 1;
    steps.push(`<li><a class="tag" href="${buildHash(root, ids.slice(0, i + 1))}" data-nav${current ? ' aria-current="page"' : ''}>${esc(node.label)}</a></li>`);
  });
  return `<ol>
    <li><a class="tag" href="#/" data-nav>${icon('i-home')}<span>Home</span></a></li>
    ${steps.join('')}
    <li><button class="tag tag--btn" type="button" data-action="share-link" aria-label="Share a link to this shelf">${icon('i-link')}</button></li>
  </ol>`;
}

export function coldTrailNote() {
  return `<div class="notice" role="status"><p>That trail's gone cold — here's the way home.</p></div>`;
}

export function restingNote() {
  return `<div class="notice" role="alert"><p>The archive is resting — try again.</p>
    <button class="btn-brass" type="button" data-action="retry">Knock again</button></div>`;
}
