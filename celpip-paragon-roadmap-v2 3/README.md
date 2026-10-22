# CELPIP & Paragon Roadmap

A static, read-only roadmap page. Deployed at https://celpip_roadmap.paragontesting.ca/.

## Files — deploy vs. dev-only

**Deploy these to the server** (`celpip_roadmap.paragontesting.ca`):
- `index.html`, `app.js`, `styles.css`, `celpip-logo.png` — the public app shell. Rarely changes.
- `roadmap-data.json` — the actual roadmap content (projects, categories, statuses, dates, Jira links, notes). This is what changes whenever the roadmap is updated, and usually the only file that needs re-uploading.

**Never deploy these — local editing tool only:**
- `admin.html`, `admin.js` — a private tool with full Add/Edit/Delete, for making changes yourself without going through Claude. It has no viewer/owner distinction at all, so if it ended up on the public server anyone with the link could edit the live roadmap. Open `admin.html` locally (e.g. via a local server, see below) whenever you want to make changes directly.

`app.js` (the public page) fetches `roadmap-data.json` at load time, so updating the roadmap is usually just a matter of replacing that one file on the server — no need to re-upload the whole site.

## Editing

Two ways to make changes:
1. **Ask Claude** to edit `roadmap-data.json` directly, then upload the updated file(s) to the server yourself.
2. **Use `admin.html` locally.** The first time, click "Link existing file" and pick `roadmap-data.json` in this folder (or "Create new file" to start one) — Chrome or Edge only, since this uses the File System Access API. Once linked, every Add/Edit/Delete writes straight to that file, no separate save/export step. You then upload the updated `roadmap-data.json` to the server the same way as option 1.

Either way, the public page (`index.html`) itself has no edit UI at all, by design — it's public-facing, and a page that can't tell who's viewing it can't safely expose Add/Edit/Delete to everyone who opens the link.

To run `admin.html` locally: `cd` into this folder and run `python3 -m http.server 8000`, then open `http://localhost:8000/admin.html` (double-clicking the file directly won't work — see the note in the main README history about `file://` and `fetch` restrictions).

## Categories

Fixed list: Item Management, Business Operations, Marketing, Security, CAEL, Scoring, Test Enhancements. Click a category header to expand or collapse its rows (remembered per browser via localStorage — a view preference, not shared data).

## Timeline

- Each project renders on exactly one 58-pixel row.
- Fiscal years and months are separate header bands, not duplicate timelines.
- The timeline always spans at least 6 months before today and 18 months after (see `PAST_BUFFER_MONTHS`/`FUTURE_BUFFER_MONTHS` in `app.js`), extended further if item dates fall outside that.
- On load, the timeline scrolls so the current month is the leftmost visible column.
- Fiscal year begins October 1 — e.g. October 2026 through September 2027 is FY27.

## Other UI

- Metric tiles and the category donut chart double as click-to-filter controls; click a tile/slice again to clear that filter.
- Clicking a project name or bar opens a read-only detail panel (category, owner, status, priority, % complete, timeline, Jira link, notes).
- Dark/light theme toggle in the header, remembered per browser; defaults to system preference until toggled.

## % Complete

Each project has a `percent` field (0-100, set via `admin.html`). On the timeline, it renders as a fill meter inside the bar — e.g. 50% complete shows the left half of the bar in the full status color and the right half in a lighter tint. **This only applies to projects whose status is In Progress, At Risk, On Hold, or Complete** — anything that hasn't started yet (Backlog, Discovery, Planned) always renders as a plain solid bar regardless of its `percent` value, since "% complete" isn't meaningful before work begins.

## Parking Lot

A separate list of ideas that aren't scheduled and aren't in the backlog yet — no dates, no status, no timeline. Stored in `roadmap-data.json` as a top-level `parkingLot` array (each idea: `id`, `name`, optional `category`, `jira`, `objective` for notes). Add/edit/delete ideas in `admin.html` ("+ Add idea" in the Parking Lot panel below the timeline). On the public page it appears below the timeline as a read-only card list, and **the whole section stays hidden until at least one idea exists**. The search box and category filter apply to it too (ideas with no category are hidden while a category filter is active).

