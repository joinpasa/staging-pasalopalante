# PKF_Partners sheet — Apps Script (reference copy)

This is a **copy** of the Apps Script bound to the **PKF_Partners** Google Sheet
(Extensions → Apps Script). The live version runs inside the sheet, not from
this repo — editing this file changes nothing by itself. It's kept here so
changes to the sheet's columns can be checked against the database side
(`supabase/functions/sync-partners`, `partner_entries` table) and so there's
a record of what's deployed.

**Keep the two in sync:** whenever the script in the sheet changes, paste the
new version here too (and vice versa).

## Secret

`CONFIG.SYNC_SECRET` is a placeholder here on purpose. The real value lives
only in the sheet's own script and in the Supabase function secret
`PARTNERS_SYNC_SECRET`. **Never commit the real value.** When pasting this
file into the sheet, keep the sheet's existing secret line.

## What it does

- `syncPartners()` — sends every row from every non-`_` tab to
  `sync-partners` (time-driven, every 15 min; also **Partners → Sync now**).
- `onEdit()` — auto-generates the ID in column A when Category (column D)
  changes. Collision-proof: next free number per prefix across all tabs.
- `fixDuplicateIds()` — one-off repair for duplicate/missing IDs
  (**Partners → Fix duplicate IDs**).
- `createTimeTrigger()` — one-time setup of the 15-minute trigger.

## Column layout (must match `COLS` in Code.gs)

| Col | Field | Notes |
|---|---|---|
| A | ID | Auto-generated, e.g. `COR-001` |
| B | Status | Only `Approved` rows are public |
| C | Featured? | `Yes` → shown in Featured Partners on /partners |
| D | Category | Drives the ID prefix |
| E | Name | |
| F | Logo | Image URL |
| G | Website | Bare domain, e.g. `shrm.org` |
| H | Facebook | Full URL |
| I | Role | Optional subtitle |
| J | Dark | `TRUE` = dark logo tile |
| K | Sort Order | Number |
| L | Internal Notes | Never synced |

If you add, remove or move a column: update `COLS` in the sheet's script,
here, and — if it's a new field — `sync-partners` and the `partner_entries`
table.

## GHL partner applications → sheet (free, no Make.com)

`doPost` in Code.gs turns each GHL partner-application submission
(form `Od6Vms5T0VCdams7JT9b`, embedded on `/partners/apply`) into a new
row with **Status = Pending**: nothing goes public until someone sets it
to `Approved`. It assigns the ID itself, using the same numbering as
`onEdit`, which doesn't fire for script-written rows. The contact's
name, email and phone go in Internal Notes, which is never synced.
Organizations already in the sheet (same name) are skipped.

Setup:
1. Set `CONFIG.INTAKE_SECRET` (any long random text) in the sheet's script.
   Optionally set `INTAKE_TAB` and `DEFAULT_CATEGORY`.
2. Deploy → New deployment → Web app, with *Execute as: Me* and *Who has access:
   Anyone*. Copy the URL. Later edits: Manage deployments → edit → New
   version, which keeps the same URL.
3. GHL workflow: trigger **Form Submitted** (the partner form), then action
   **Webhook** (the plain one, not the paid Custom Webhook), POST to
   `<web app URL>?key=<INTAKE_SECRET>`.
4. If a field doesn't land in the right column, add **Custom Data** in the
   Webhook action with one of these keys: `partner_name`, `category`,
   `website`, `facebook`, `logo`, `role`. Raw payloads are kept in the
   `_intake_log` tab (last 200) for checking what GHL actually sent.
