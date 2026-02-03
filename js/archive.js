let ARCHIVE_DATA = null;
let CURRENT_PATH = ["root"];

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

  CURRENT_PATH.forEach((id, index) => {
    const span = document.createElement("span");
    span.className = "breadcrumb-tag cursor-pointer";
    span.textContent = id === "root" ? "Home" : id.replace(/_/g, " ");
    span.onclick = () => {
      CURRENT_PATH = CURRENT_PATH.slice(0, index + 1);
      render();
    };
    el.appendChild(span);
  });
}

function renderGrid() {
  const grid = document.getElementById("content-grid");
  grid.innerHTML = "";

  const node = getCurrentNode();
  if (!node) return;

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
        CURRENT_PATH.push(item.id);
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
      card.onclick = () => window.open(item.link, "_blank");
    }

    grid.appendChild(card);
  });
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
   Init
-----------------------------*/

const archiveUrl = `data/archive.json?cb=${Date.now()}`;
fetch(archiveUrl)
  .then(res => res.json())
  .then(data => {
    ARCHIVE_DATA = data;
    render();
  })
  .catch(err => console.error("Archive load failed", err));
