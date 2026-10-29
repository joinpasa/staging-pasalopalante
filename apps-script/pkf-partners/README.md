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

## Full partner flow: Form → GHL → this sheet → Partner Portal

1. **Form → GHL:** the partner survey (`Od6Vms5T0VCdams7JT9b`, on
   `/partners/apply`) is a GHL **Survey**.
2. **GHL → sheet:** a GHL workflow (trigger **Survey Submitted**, action
   **Webhook**, the plain free one) POSTs to this script's `doPost`. Each
   application becomes a new row with **Status = Pending** and
   **Portal Access = Yes**. The contact's email goes in **Contact Email**,
   and their name and phone go in Internal Notes. The ID is assigned by
   the script, using the same numbering as `onEdit`. Organizations already
   in the sheet (same name) are skipped.
3. **Review:** someone sets **Status = Approved**. Nothing happens before
   that.
4. **Sheet → website + portal:** on the next sync (every 15 min, or
   Partners → Sync now), the row goes on `/partners`, and because Portal
   Access = Yes, `sync-partners` creates the partner-portal organization
   once. Its invite link is written into **Portal Link** (column O).
5. **Portal invite email:** `sync-partners` also saves the link on the
   contact in GHL (custom field `partner_portal_url`) and adds the tag
   `partner-portal-invite`. A GHL workflow on **Contact Tag Added →
   partner-portal-invite** sends the email, using `{{contact.partner_portal_url}}`
   as the link. Each org's link is pushed once. If GHL is down, or the
   contact doesn't exist yet, it retries on every sync.

6. **Pledge counted:** the pledged acts (GHL field
   `{{contact.partner_group_pledged_acts}}`) land in **Pledge** (column P).
   Once the row is Approved, the pledge counts toward the website's "Acts
   pledged" total, as one organization pledge per row. It becomes the portal
   org's pledge goal too. Changing the number updates both. Un-approving the
   row, clearing the pledge or deleting the row takes it back out of the
   total.

Existing logo-only rows (municipalities, media, etc.) have Portal Access
blank, so they never get portal accounts. To give one an account, set
Portal Access = Yes and fill in Contact Email. If an org was already added
to the portal by hand with the same name, it gets linked instead of
duplicated. Portal orgs are never deleted by the sync, because they hold
the partner's submitted acts.

### One-time setup

1. **Script:** paste Code.gs into the sheet's script, keeping your real
   `SYNC_SECRET`, and set `CONFIG.INTAKE_SECRET` to any long random text.
   Optionally set `INTAKE_TAB` and `DEFAULT_CATEGORY`. Run **Sync now**
   once; this adds the Portal Access / Contact Email / Portal Link / Pledge
   headers (M–P).
2. **Web app:** Deploy → New deployment → Web app, *Execute as: Me*, *Who
   has access: Anyone*. Copy the URL. Later edits: Manage deployments →
   edit → New version, which keeps the same URL.
3. **GHL intake workflow:** trigger Survey Submitted (the partner survey),
   then action Webhook, POST to `<web app URL>?key=<INTAKE_SECRET>`.
4. **GHL custom field:** Contact field "Partner Portal URL", with key
   `partner_portal_url`.
5. **GHL invite workflow:** trigger Contact Tag Added =
   `partner-portal-invite`, then send the invite email with
   `{{contact.partner_portal_url}}`.
6. **Fields that don't map:** if a field doesn't land in the right column,
   add **Custom Data** in the Webhook action with one of these keys:
   `partner_name`, `category`, `website`, `facebook`, `logo`, `role`. Raw
   payloads are kept in the `_intake_log` tab (last 200).
