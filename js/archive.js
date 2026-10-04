// Archive data: loading the tree from data/archive.json and the pure helpers
// the views use to walk, count and search it. No DOM access in this module.

const TYPE_LABELS = { pdf: 'PDF', xlsx: 'XLSX', zip: 'ZIP', image: 'IMG', gpx: 'GPX', txt: 'TXT' };

export async function loadArchive(url = 'data/archive.json') {
  const res = await fetch(`${url}?cb=${Date.now()}`);
  if (!res.ok) throw new Error(`Archive load failed: ${res.status}`);
  return res.json();
}

export function nodeAt(root, ids) {
  let node = root;
  for (const id of ids) {
    node = node.children?.find((c) => c.id === id);
    if (!node) return null;
  }
  return node;
}

export function trail(root, ids) {
  const chain = [];
  let node = root;
  for (const id of ids) {
    node = node.children?.find((c) => c.id === id);
    if (!node) break;
    chain.push(node);
  }
  return chain;
}

export function countFiles(node) {
  return (node.children || []).reduce(
    (n, c) => n + (c.type === 'file' ? 1 : countFiles(c)),
    0,
  );
}

export function allFiles(root) {
  const out = [];
  (function walk(node, ids, labels) {
    for (const c of node.children || []) {
      if (c.type === 'file') out.push({ file: c, ids, labels });
      else walk(c, [...ids, c.id], [...labels, c.label || c.id]);
    }
  })(root, [], []);
  return out;
}

export function searchFiles(root, query) {
  const q = (query || '').trim();
  if (!q) return [];
  const qLower = q.toLowerCase();
  return allFiles(root)
    .filter(({ file }) => (file.code || '').includes(q) || (file.label || '').toLowerCase().includes(qLower))
    .map((r) => ({ ...r, exact: r.file.code === q }))
    .sort((a, b) => Number(b.exact) - Number(a.exact));
}

export function latestFiles(root, n = 4) {
  return allFiles(root)
    .filter(({ file }) => file.added)
    .sort((a, b) => b.file.added.localeCompare(a.file.added) || (b.file.code || '').localeCompare(a.file.code || ''))
    .slice(0, n);
}

export function findFile(root, fileId) {
  return allFiles(root).find(({ file }) => file.id === fileId) || null;
}

export function fileTypeLabel(fileType) {
  return TYPE_LABELS[fileType] || 'FILE';
}
