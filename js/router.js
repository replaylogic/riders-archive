// Hash routes: `#/<Label>/<Label>[@file_id]`. Old shared links used ids,
// lowercase labels or hyphenated ids, so segment matching is forgiving.

import { findFile } from './archive.js';

const HOME = { ids: [], fileId: null, ok: true };
const COLD = { ids: [], fileId: null, ok: false };

const squash = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

function matchChild(node, seg) {
  const want = squash(seg);
  const kids = node.children || [];
  return (
    kids.find((c) => c.id === seg) ||
    kids.find((c) => squash(c.id) === want) ||
    kids.find((c) => squash(c.label) === want) ||
    kids.find((c) => squash(c.id).replace(/_/g, '-') === want)
  );
}

function decode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
}

export function parseHash(hash, root) {
  const raw = (hash || '').replace(/^#\/?/, '').trim();
  if (!raw) return { ...HOME };

  const at = raw.lastIndexOf('@');
  const pathPart = at === -1 ? raw : raw.slice(0, at);
  const filePart = at === -1 ? null : decode(raw.slice(at + 1));

  const ids = [];
  let node = root;
  for (const rawSeg of pathPart.split('/').filter(Boolean)) {
    const seg = decode(rawSeg);
    const child = seg === null ? null : matchChild(node, seg);
    if (!child || child.type !== 'folder') return { ...COLD };
    ids.push(child.id);
    node = child;
  }

  const fileId = filePart && findFile(root, filePart) ? filePart : null;
  return { ids, fileId, ok: true };
}

export function buildHash(root, ids, fileId = null) {
  if (!ids.length && !fileId) return '';
  const labels = [];
  let node = root;
  for (const id of ids) {
    node = node?.children?.find((c) => c.id === id);
    labels.push(encodeURIComponent(node?.label || id));
  }
  return `#/${labels.join('/')}${fileId ? `@${encodeURIComponent(fileId)}` : ''}`;
}
