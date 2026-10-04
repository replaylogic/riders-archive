# Adding to the archive

Everything visitors can open lives in this `files/` folder. What they *see* — the drawers, file numbers and "Fresh off the trail" — comes from `data/archive.json`. There is no build step: commit or upload on github.com and the site updates within a minute or two.

## Add a file

1. Put the file in the matching folder, e.g. `files/ride_circuits/Sahyadri-Ghat-Circuit/My Route.pdf`.
2. Open `data/archive.json`, find that folder's `"children"` list, and add an entry:

```json
{
  "id": "my_route",
  "type": "file",
  "label": "My Route (From Pune)",
  "code": "0009",
  "fileType": "pdf",
  "size": "120 KB",
  "added": "2026-10-05",
  "link": "files/ride_circuits/Sahyadri-Ghat-Circuit/My Route.pdf"
}
```

| Field | What it does |
|---|---|
| `id` | Unique, lowercase, underscores. Used in shared links — don't change it once posted. |
| `label` | The name people see. |
| `code` | The file number for Instagram posts. Use the next number after the highest one (currently `0008`). |
| `fileType` | `pdf`, `image`, `xlsx`, `zip`, `gpx` or `txt` — sets the stamp. Images also get a preview. |
| `size` | Optional. Shown on the ticket so people on mobile data know what they're downloading. |
| `added` | `YYYY-MM-DD`. The four newest dated files appear under "Fresh off the trail". |
| `link` | Path to the file, exactly as it sits in this folder. |

Remember the comma between entries — a missing or extra comma breaks the whole archive (the site will say it couldn't open the archive).

## Add a folder

Add an entry with `"type": "folder"` and an empty `"children": []` list. An optional `"meta": { "info": "…" }` adds the italic line under its name. Empty folders show as *Coming soon*.

New **top-level** drawers get the compass icon. To give one its own icon, add its `id` to `ICONS` in `js/views.js` using a symbol from the sprite in `index.html` (`i-tent`, `i-peak`, `i-cup`, `i-road`, `i-compass`).

## Links you can share

- A drawer: `https://archive.rideatlas.app/#/Ride%20Circuits/Sahyadri-Ghat-Circuit`
- A file (opens its card directly): add `@` and the file's id — `…/Sahyadri-Ghat-Circuit@sahyadri_ride_from_pune`

The easiest way to get either is to open it on the site and tap **Share**.

## Music

Tracks live in `audio/` and are listed in `js/playlist.js`; credits are in `audio/CREDITS.md`.
