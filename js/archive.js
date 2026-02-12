let ARCHIVE_DATA = null;
let CURRENT_PATH = ["root"];
let CURRENT_FILE_ID = null;
let SEARCH_QUERY = "";

/* ----------------------------
   Utility helpers
-----------------------------*/

function findNodeByPath(path, node) {
  if (path.length === 0) return node;
  const [current, ...rest] = path;
  const child = node.children?.find(c => c.id === current);
  return child ? findNodeByPath(rest, child) : null;
}

function getCurrentNode() {
  return findNodeByPath(CURRENT_PATH.slice(1), ARCHIVE_DATA.root);
}

function iconForFile(type) {
  const map = {
    pdf: "picture_as_pdf",
    gpx: "map",
    txt: "description",
    image: "image",
    default: "insert_drive_file"
  };
  return map[type] || map.default;
}

/* ----------------------------
   Rendering
-----------------------------*/

function renderBreadcrumb() {
  const el = document.getElementById("breadcrumb");
  el.innerHTML = "";
  // 1-UP icon: shows user they can navigate up. Disabled at root.
  const upBtn = document.createElement("button");
  upBtn.className = "breadcrumb-up cursor-pointer mr-2";
  upBtn.title = "Go up one level";
  upBtn.style.border = "none";
  upBtn.style.background = "transparent";
  upBtn.style.display = "inline-flex";
  upBtn.style.alignItems = "center";
  upBtn.style.marginRight = "8px";
  upBtn.style.padding = "0";
  upBtn.innerHTML = `<img src=\"images/up.png\" alt=\"Up\" style=\"width:18px;height:auto;display:block;margin-top:-4px;\">`;
  upBtn.onclick = () => {
    if (CURRENT_PATH.length > 1) {
      CURRENT_PATH = CURRENT_PATH.slice(0, -1);
      CURRENT_FILE_ID = null;
      updateURL();
      render();
    }
  };
  upBtn.disabled = CURRENT_PATH.length <= 1;
  upBtn.style.opacity = CURRENT_PATH.length <= 1 ? "0.35" : "1";
  el.appendChild(upBtn);

  CURRENT_PATH.forEach((id, index) => {
    const span = document.createElement("span");
    span.className = "breadcrumb-tag cursor-pointer";
    span.textContent = id === "root" ? "Home" : id.replace(/_/g, " ");
    span.onclick = () => {
      CURRENT_PATH = CURRENT_PATH.slice(0, index + 1);
      CURRENT_FILE_ID = null;
      updateURL();
      render();
    };
    el.appendChild(span);
  });
  // add copy/share icon
  const share = document.createElement("button");
  share.className = "ml-2 text-primary/80";
  share.title = "Copy shareable link";
  share.style.border = "none";
  share.style.background = "transparent";
  share.style.cursor = "pointer";
  share.innerHTML = `<span class=\"material-icons-outlined\" style=\"font-size:16px;margin-top:4px\">link</span>`;
  share.onclick = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      const prev = share.innerHTML;
      share.innerHTML = `<span style=\"font-size:12px;color:rgb(212,175,55)\">Copied</span>`;
      setTimeout(() => (share.innerHTML = prev), 1200);
    } catch (e) {
      alert('Copy failed.');
    }
  };
  el.appendChild(share);
}

function renderGrid() {
  const grid = document.getElementById("content-grid");
  grid.innerHTML = "";

  const node = getCurrentNode();
  if (!node) return;

  // If there's an active search, show filtered file results instead of folder view
  if (SEARCH_QUERY && SEARCH_QUERY.trim() !== "") {
    const q = SEARCH_QUERY.trim();
    const results = findFilesByQuery(q);
    if (results.length === 0) {
      const m = document.createElement("div");
      m.className = "text-center text-sm text-white/50 p-6";
      m.textContent = `No files match "${q}"`;
      m.style.gridColumn = "1 / -1";
      grid.appendChild(m);
      return;
    }

    results.forEach(r => {
      const item = r.file;
      const card = document.createElement("div");
      card.className = "group flex flex-col items-center space-y-2 p-4 active:scale-95";
      card.innerHTML = `
        <div class="relative w-24 h-20 bg-black/20 rounded-lg border border-white/5 flex items-center justify-center">
          <span class="material-icons-outlined text-3xl">${iconForFile(item.fileType)}</span>
          ${item.size ? `<div class="absolute bottom-1 right-2 text-[8px] text-white/40">${item.size}</div>` : ""}
        </div>
        <span class="text-[11px] text-center leading-tight">${item.label}</span>
        <span class="text-[10px] text-white/40">${r.path.join(' / ')}</span>
      `;
      card.onclick = () => {
        CURRENT_FILE_ID = item.id;
        updateURL();
        window.open(item.link, "_blank");
      };
      grid.appendChild(card);
    });
    return;
  }

  if (!node.children || node.children.length === 0) {
    const msg = document.createElement("div");
    msg.className = "text-sm p-6";
    msg.style.gridColumn = "1 / -1";
    msg.style.display = "flex";
    msg.style.alignItems = "center";
    msg.style.justifyContent = "center";
    msg.style.gap = "10px";

    const icon = document.createElement("span");
    icon.className = "material-icons-outlined";
    icon.textContent = "info";
    icon.style.color = "rgba(212,175,55,0.95)";
    icon.style.fontSize = "20px";

    const txt = document.createElement("span");
    txt.textContent = "No files or folders have been added here yet.";
    txt.style.color = "rgba(255,255,255,0.7)";

    msg.appendChild(icon);
    msg.appendChild(txt);
    grid.appendChild(msg);
    return;
  }

  node.children.forEach(item => {
    const card = document.createElement("div");
    card.className = "group flex flex-col items-center space-y-2 p-4 active:scale-95";

    if (item.type === "folder") {
      card.innerHTML = `
        <div class="relative w-24 h-20 bg-amber-900/30 rounded-lg border border-primary/30 flex items-center justify-center">
          <span class="material-icons-outlined text-4xl text-primary">folder_open</span>
        </div>
        <span class="text-xs font-display uppercase tracking-wider text-center">${item.label}</span>
      `;
      card.onclick = () => {
        CURRENT_FILE_ID = null;
        CURRENT_PATH.push(item.id);
        updateURL();
        render();
      };
    }

    if (item.type === "file") {
      card.innerHTML = `
        <div class="relative w-24 h-20 bg-black/20 rounded-lg border border-white/5 flex items-center justify-center">
          <span class="material-icons-outlined text-3xl">${iconForFile(item.fileType)}</span>
          ${item.size ? `<div class="absolute bottom-1 right-2 text-[8px] text-white/40">${item.size}</div>` : ""}
        </div>
        <span class="text-[11px] text-center leading-tight file-name">${item.label}</span>
      `;
      card.onclick = () => {
        CURRENT_FILE_ID = item.id;
        updateURL();
        window.open(item.link, "_blank");
      };
    }

    grid.appendChild(card);
  });
}

// Recursively collect files whose `code` contains the query substring or whose label matches
function findFilesByQuery(query) {
  const q = (query || "").toString();
  const qLower = q.toLowerCase();
  const results = [];
  function walk(node, path) {
    (node.children || []).forEach(child => {
      if (child.type === 'file') {
        const codeMatch = child.code && child.code.includes(q);
        const labelMatch = child.label && child.label.toLowerCase().includes(qLower);
        if (codeMatch || labelMatch) {
          results.push({ file: child, path });
        }
      } else if (child.type === 'folder') {
        walk(child, [...path, child.label || child.id]);
      }
    });
  }
  if (!ARCHIVE_DATA) return results;
  walk(ARCHIVE_DATA.root, []);
  return results;
}

function renderHeader() {
  const node = getCurrentNode();
  document.getElementById("section-title").textContent = node.label;
  document.getElementById("section-meta").textContent =
    node.meta?.info ? `${node.meta.info}` : "";
}

/* ----------------------------
   Main render
-----------------------------*/

function render() {
  renderBreadcrumb();
  renderHeader();
  renderGrid();
}

/* ----------------------------
   URL / Hash helpers (path tracking)
-----------------------------*/

function encodePathSegment(id) {
  return encodeURIComponent(id);
}

function buildHashFromCurrent() {
  const parts = CURRENT_PATH.slice(1); // skip root
  // convert ids to labels for prettier URLs
  const labels = [];
  let node = ARCHIVE_DATA?.root;
  for (let id of parts) {
    if (!node || !node.children) break;
    const child = node.children.find(c => c.id === id);
    if (!child) {
      labels.push(id);
      node = null;
      continue;
    }
    labels.push(child.label || child.id);
    node = child;
  }
  const encoded = labels.map(l => encodePathSegment(l.replace(/\s+/g, " "))).join("/");
  // include file anchor if present
  return CURRENT_FILE_ID ? `${encoded}@${encodeURIComponent(CURRENT_FILE_ID)}` : encoded;
}

function updateURL() {
  const path = buildHashFromCurrent();
  const hash = path ? `#/${path}` : "";
  if (location.hash !== hash) {
    history.replaceState(null, "", hash);
  }
}

function resolveSegmentsToIds(segments) {
  // Walk the archive tree trying to match each segment to a child id or label
  if (!ARCHIVE_DATA) return null;
  let node = ARCHIVE_DATA.root;
  const ids = [];
  for (let raw of segments) {
    const seg = decodeURIComponent(raw);
    const segLow = seg.toLowerCase();
    const child = (node.children || []).find(c => {
      if (c.id === seg) return true;
      if ((c.id || "").toLowerCase() === segLow) return true;
      if ((c.label || "").toLowerCase() === segLow) return true;
      // allow hyphen/underscore variants
      if ((c.id || "").replace(/_/g, "-") === seg) return true;
      return false;
    });
    if (!child) return null;
    ids.push(child.id);
    node = child;
  }
  return ids;
}

function applyHashPath() {
  const raw = location.hash.replace(/^#\/?/, "").trim();
  if (!raw) {
    CURRENT_PATH = ["root"];
    return;
  }
  // handle optional file anchor separated by @
  const [pathPart, fileAnchor] = raw.split("@");
  const segments = (pathPart || "").split("/").filter(Boolean);
  if (fileAnchor) {
    CURRENT_FILE_ID = decodeURIComponent(fileAnchor);
  } else {
    CURRENT_FILE_ID = null;
  }
  const ids = resolveSegmentsToIds(segments);
  if (ids && ids.length > 0) {
    CURRENT_PATH = ["root", ...ids];
  }
}

window.addEventListener("hashchange", () => {
  applyHashPath();
  render();
});

/* ----------------------------
   Init
-----------------------------*/

const archiveUrl = `data/archive.json?cb=${Date.now()}`;
fetch(archiveUrl)
  .then(res => res.json())
  .then(data => {
    ARCHIVE_DATA = data;
    // If URL contains a path, use it to set the current path
    applyHashPath();
    // Ensure URL reflects the current (possibly default) path
    updateURL();
    render();
    // wire up search box
    const searchInput = document.getElementById('search-code');
    const clearBtn = document.getElementById('search-clear');
    if (searchInput) {
      searchInput.value = SEARCH_QUERY;
      searchInput.addEventListener('input', (e) => {
        SEARCH_QUERY = e.target.value;
        render();
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        const si = document.getElementById('search-code');
        if (si) si.value = '';
        SEARCH_QUERY = '';
        render();
      });
    }
  })
  .catch(err => console.error("Archive load failed", err));
