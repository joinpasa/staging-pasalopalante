# PKF_Media sheet — Apps Script (reference copy)

This is a **copy** of the Apps Script bound to the **PKF_Media** Google Sheet
(Extensions → Apps Script). The live version runs inside the sheet, not from
this repo — editing this file changes nothing by itself. It's kept here so
changes to the sheet's columns can be checked against the database side
(`supabase/functions/sync-media`, `media_entries` table) and so there's a
record of what's deployed. Same pattern as `apps-script/pkf-partners`.

Pipeline: **PKF_Media sheet → this script → `sync-media` edge function →
`media_entries` table → `useMediaCoverage` hook → `/media` page.** If the
read fails (or the table is empty), `/media` falls back to the hardcoded
lists in `apps/website/src/data/mediaCoverage.ts`.

`seed.csv` is the sheet's starting content (generated from
`mediaCoverage.ts`), in case the sheet ever needs rebuilding.

## One-time setup

1. Generate a secret (any long random string, e.g. `openssl rand -hex 32`).
2. Supabase dashboard → Edge Functions → Secrets → add `MEDIA_SYNC_SECRET`
   with that value.
3. In the sheet: Extensions → Apps Script → paste `Code.gs`, then replace
   `PASTE_MEDIA_SYNC_SECRET_HERE` with the same value. Save.
4. **Signed in as the sheet's owner**, pick `createTimeTrigger` from the
   function dropdown → ▶ Run (approve the permissions prompt). This installs
   the 15-minute sync and the edit trigger (both run as the owner).
5. Reload the sheet → **Media → Sync now** for the first sync. Check
   Executions in the script editor for `Sync OK`.
6. Lock approvals: select columns **B:C** (Status, Featured?) on the Media
   tab (and on `_Influencers`) → Data → Protect sheets and ranges → Set
   permissions → **Only you**. The team can still add rows; only the owner
   can approve or feature them.

## Secret

`CONFIG.SYNC_SECRET` is a placeholder here on purpose. The real value lives
only in the sheet's own script and in the Supabase function secret
`MEDIA_SYNC_SECRET`. **Never commit the real value.** When pasting this file
into the sheet, keep the sheet's existing secret line.

## What it does

- `syncMedia()` — sends every row from every non-`_` tab to `sync-media`
  (time-driven, every 15 min; also **Media → Sync now**).
- `handleEdit()` — installed edit trigger (runs as the owner, so it works
  even with Status/Featured? locked). When Section (column D) changes it
  auto-generates the ID in column A — collision-proof, next free number per
  prefix across all tabs (`ART-`, `DIG-`, `VID-`, `SOC-`, `BRO-`, `OTH-`) —
  and on a new row sets Status to **Pending** and Featured? to **No**, so
  nothing goes live until the owner approves it.
- `fixDuplicateIds()` — one-off repair for duplicate/missing IDs
  (**Media → Fix duplicate IDs**). The sync itself also drops duplicate IDs
  instead of failing, and lists them in the log.
- `createTimeTrigger()` — one-time setup of both triggers (safe to re-run).

## Tabs

- **Media** — synced to `/media`.
- **`_Contacts`** — private ops-team contact log (name, outlet, email,
  phone, contact status, last contacted, related Media ID). Never synced:
  any tab starting with `_` is ignored by the sync and by ID numbering.
- **`_Influencers`** — influencers/celebrities, for future use. Columns
  A–N are identical to Media, plus team-only columns O–U (Person Type,
  Instagram, TikTok, X, YouTube, Facebook, Followers) that the site never
  reads. To take it live, rename it to `Influencers` (drop the `_`) and run
  **Media → Fix duplicate IDs** to give its rows IDs; Approved rows then
  show on `/media` under whatever Section they're set to.

## Column layout (must match `COLS` in Code.gs)

| Col | Field | Notes |
|---|---|---|
| A | ID | Auto-generated, e.g. `ART-011` |
| B | Status | Only `Approved` rows are public |
| C | Featured? | `Yes` → also shown in the Featured section at the top |
| D | Section | Articles / Digital Press / Videos / Social / Broadcast / Other Outlets |
| E | Outlet | Required. Broadcast / Other Outlets rows only use this (shown as chips) |
| F | Title | Headline |
| G | URL | Required for every section except Broadcast / Other Outlets |
| H | Type | article / youtube / spotify / facebook / instagram / x / linkedin |
| I | Image URL | Card image/logo — see below |
| J | Description EN | Short summary (Digital Press, Videos) |
| K | Description ES | Spanish summary; if blank, the EN one is used |
| L | Note | Small grey line under the title |
| M | Sort Order | Number, lowest first within its section |
| N | Internal Notes | Never synced |

## Adding a logo / image

Pick either:

- **Paste any public image URL** into *Image URL* — e.g. the outlet's own
  og:image link. Quickest, but it breaks if they ever move the file.
- **Upload to Supabase Storage (recommended, permanent):** Supabase
  dashboard → Storage → `media-images` bucket → Upload file. Click the file
  → **Get URL** and paste it into *Image URL*. It looks like
  `https://tipfbleltjexofsjffwb.supabase.co/storage/v1/object/public/media-images/<file>.webp`.
  16:9, ~1200×675, WebP/PNG/JPG under 5 MB.

Existing logos shipped with the site use short paths like `/press/ap-news.webp`
(files in `apps/website/public/press/`) — those keep working as-is.

## Changing columns

If you add, remove or move a column: update `COLS` in the sheet's script,
here, and — if it's a new field — `sync-media`, the `media_entries` table and
`useMediaCoverage`.
