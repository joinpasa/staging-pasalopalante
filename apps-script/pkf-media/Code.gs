/**
 * Bound to the "PKF_Media" Google Sheet. Every non-underscore tab gets
 * read; within each tab, every row's own Section column (not the tab name)
 * decides where it shows on /media — Articles, Digital Press, Videos,
 * Social, Broadcast or Other Outlets.
 */

const CONFIG = {
  SYNC_URL: "https://tipfbleltjexofsjffwb.supabase.co/functions/v1/sync-media",
  SYNC_SECRET: "PASTE_MEDIA_SYNC_SECRET_HERE", // real value lives only in the sheet's script + Supabase secret MEDIA_SYNC_SECRET — never commit it
};

// Column order: ID, Status, Featured?, Section, Outlet, Title, URL, Type,
// Image URL, Description EN, Description ES, Note, Sort Order, Internal Notes
// (0-based indexes, used when reading a whole row as an array)
const COLS = {
  ID: 0,
  STATUS: 1,
  FEATURED: 2,
  SECTION: 3,
  OUTLET: 4,
  TITLE: 5,
  URL: 6,
  TYPE: 7,
  IMAGE_URL: 8,
  DESCRIPTION_EN: 9,
  DESCRIPTION_ES: 10,
  NOTE: 11,
  SORT_ORDER: 12,
  // INTERNAL_NOTES: 13 — never read.
};

// 1-based column numbers (what getRange() expects) — derived from COLS so the
// two can never drift apart if a column is added later.
const ID_COLUMN = COLS.ID + 1;           // Column A
const SECTION_COLUMN = COLS.SECTION + 1; // Column D
const STATUS_COLUMN = COLS.STATUS + 1;     // Column B
const FEATURED_COLUMN = COLS.FEATURED + 1; // Column C
const FIRST_DATA_ROW = 2;                // Row 1 = headers

/** Tabs whose name starts with "_" are ignored everywhere (notes, scratch, etc.). */
function dataSheets_() {
  return SpreadsheetApp.getActiveSpreadsheet()
    .getSheets()
    .filter((sheet) => !sheet.getName().startsWith("_"));
}

function syncMedia() {
  const entries = [];
  const text = (row, col) => String(row[col] == null ? "" : row[col]).trim();

  dataSheets_().forEach((sheet) => {
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) { // skip header row
      const row = values[i];
      const id = text(row, COLS.ID);
      const outlet = text(row, COLS.OUTLET);
      const section = text(row, COLS.SECTION);
      if (!id || !outlet || !section) continue; // blank/trailing row

      entries.push({
        id: id,
        section: section,
        status: text(row, COLS.STATUS),
        // "Yes" / "No" / blank from the dropdown (a checkbox's TRUE/FALSE works too).
        featured: text(row, COLS.FEATURED),
        outlet: outlet,
        title: text(row, COLS.TITLE) || undefined,
        url: text(row, COLS.URL) || undefined,
        type: text(row, COLS.TYPE) || undefined,
        imageUrl: text(row, COLS.IMAGE_URL) || undefined,
        descriptionEn: text(row, COLS.DESCRIPTION_EN) || undefined,
        descriptionEs: text(row, COLS.DESCRIPTION_ES) || undefined,
        note: text(row, COLS.NOTE) || undefined,
        sortOrder: row[COLS.SORT_ORDER] === "" || row[COLS.SORT_ORDER] == null
          ? undefined
          : Number(row[COLS.SORT_ORDER]),
      });
    }
  });

  if (entries.length === 0) {
    Logger.log("No entries found — nothing sent (check tab/column layout).");
    return;
  }

  const response = UrlFetchApp.fetch(CONFIG.SYNC_URL, {
    method: "post",
    contentType: "application/json",
    headers: { "x-media-secret": CONFIG.SYNC_SECRET },
    payload: JSON.stringify({ entries: entries }),
    muteHttpExceptions: true,
  });

  const code = response.getResponseCode();
  const body = response.getContentText();
  if (code !== 200) {
    Logger.log("Sync FAILED (" + code + "): " + body);
    throw new Error("Media sync failed: " + body);
  }
  Logger.log("Sync OK: " + body); // lists duplicateIds here if any slipped through
}

/** One-time setup: run this once from the editor's function dropdown,
 * signed in as the sheet's OWNER. It installs two triggers:
 *  - syncMedia every 15 minutes;
 *  - handleEdit on every edit. This is an installed trigger (not a simple
 *    onEdit) on purpose: it runs as the owner, so it can still fill in the
 *    ID and default Status/Featured? when Status and Featured? are
 *    protected so only the owner can change them.
 * Safe to re-run — it removes its own old triggers first. */
function createTimeTrigger() {
  ScriptApp.getProjectTriggers().forEach((t) => {
    const fn = t.getHandlerFunction();
    if (fn === "syncMedia" || fn === "handleEdit") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("syncMedia").timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger("handleEdit").forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  Logger.log("Installed: syncMedia every 15 minutes + handleEdit on every edit.");
}

/** Manual "Media" menu for testing without waiting 15 minutes. */
function onOpen() {
  SpreadsheetApp.getUi().addMenu("Media", [
    { name: "Sync now", functionName: "syncMedia" },
    { name: "Fix duplicate IDs", functionName: "fixDuplicateIds" },
  ]);
}

/* ------------------------------------------------------------------ */
/*  ID generation — collision-proof                                    */
/* ------------------------------------------------------------------ */

/**
 * Runs on every edit (installed trigger — see createTimeTrigger). When
 * Section (Column D) is entered or changed, auto-generates the ID in
 * Column A, and on a new row defaults Status to "Pending" and Featured? to
 * "No" — so nothing the team adds goes live until the owner approves it. New IDs use the next free number for that prefix (highest
 * existing + 1, across ALL data tabs), so inserting / sorting / deleting
 * rows can never create a duplicate. A row keeps its existing ID as long as
 * the ID's prefix still matches its section. Editing any other column —
 * including "Featured?" — never touches IDs.
 */
function handleEdit(e) {
  if (!e) return;
  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getName().startsWith("_")) return;

  // Only react when the edit touches the Section column below the header
  // (also handles pasting into several rows/columns at once).
  const firstCol = range.getColumn();
  const lastCol = firstCol + range.getNumColumns() - 1;
  if (SECTION_COLUMN < firstCol || SECTION_COLUMN > lastCol) return;
  if (range.getLastRow() < FIRST_DATA_ROW) return;

  const lock = LockService.getDocumentLock();
  lock.waitLock(10000); // two simultaneous edits can't grab the same number
  try {
    const startRow = Math.max(range.getRow(), FIRST_DATA_ROW);
    const endRow = range.getLastRow();
    for (let row = startRow; row <= endRow; row++) {
      assignId_(sheet, row);
      setDefaults_(sheet, row);
    }
  } finally {
    lock.releaseLock();
  }
}

/** Gives one row the right ID for its section (or clears it if Section is blank). */
function assignId_(sheet, row) {
  const section = String(sheet.getRange(row, SECTION_COLUMN).getValue()).trim();
  const idCell = sheet.getRange(row, ID_COLUMN);

  if (section === "") {
    idCell.clearContent();
    return;
  }

  const prefix = makePrefix_(section);
  const currentId = String(idCell.getValue()).trim();

  // Keep the existing ID if it already belongs to this section.
  if (new RegExp("^" + prefix + "-\\d+$").test(currentId)) return;

  idCell.setValue(prefix + "-" + nextNumber_(prefix, sheet, row));
}

/** New rows start hidden: blank Status -> "Pending", blank Featured? -> "No". */
function setDefaults_(sheet, row) {
  const section = String(sheet.getRange(row, SECTION_COLUMN).getValue()).trim();
  if (section === "") return;
  const status = sheet.getRange(row, STATUS_COLUMN);
  if (String(status.getValue()).trim() === "") status.setValue("Pending");
  const featured = sheet.getRange(row, FEATURED_COLUMN);
  if (String(featured.getValue()).trim() === "") featured.setValue("No");
}

/** "Articles" -> "ART", "Digital Press" -> "DIG", "Other Outlets" -> "OTH" (letters only, 3 chars). */
function makePrefix_(section) {
  const letters = section.replace(/[^A-Za-z]/g, "").toUpperCase();
  return (letters + "XXX").substring(0, 3);
}

/**
 * Highest existing number for this prefix across every data tab, + 1,
 * zero-padded to 3 digits. `skipSheet`/`skipRow` = the row being
 * (re)numbered, so its own old value isn't counted.
 */
function nextNumber_(prefix, skipSheet, skipRow) {
  const pattern = new RegExp("^" + prefix + "-(\\d+)$");
  let max = 0;
  dataSheets_().forEach((sheet) => {
    const lastRow = sheet.getLastRow();
    if (lastRow < FIRST_DATA_ROW) return;
    const ids = sheet.getRange(FIRST_DATA_ROW, ID_COLUMN, lastRow - FIRST_DATA_ROW + 1, 1).getValues();
    ids.forEach((r, i) => {
      if (skipSheet && sheet.getSheetId() === skipSheet.getSheetId() && FIRST_DATA_ROW + i === skipRow) return;
      const m = String(r[0]).trim().match(pattern);
      if (m) max = Math.max(max, Number(m[1]));
    });
  });
  return String(max + 1).padStart(3, "0");
}

/**
 * One-time / as-needed cleanup — run from the editor (▶ Run) or the
 * Media menu. Across all data tabs, finds rows whose ID is missing,
 * doesn't match their section, or duplicates an earlier row, and gives
 * each one the next free number. The FIRST row with a given ID keeps it.
 */
function fixDuplicateIds() {
  const lock = LockService.getDocumentLock();
  lock.waitLock(10000);
  try {
    const seen = {};
    const fixed = [];
    dataSheets_().forEach((sheet) => {
      const lastRow = sheet.getLastRow();
      for (let row = FIRST_DATA_ROW; row <= lastRow; row++) {
        const section = String(sheet.getRange(row, SECTION_COLUMN).getValue()).trim();
        if (section === "") continue;
        const id = String(sheet.getRange(row, ID_COLUMN).getValue()).trim();
        const prefix = makePrefix_(section);
        const valid = new RegExp("^" + prefix + "-\\d+$").test(id);
        if (!valid || seen[id]) {
          const newId = prefix + "-" + nextNumber_(prefix, sheet, row);
          sheet.getRange(row, ID_COLUMN).setValue(newId);
          fixed.push(sheet.getName() + " row " + row + ": " + (id || "(blank)") + " → " + newId);
          seen[newId] = true;
        } else {
          seen[id] = true;
        }
      }
    });
    Logger.log(fixed.length ? "Fixed:\n" + fixed.join("\n") : "No duplicate or missing IDs found.");
  } finally {
    lock.releaseLock();
  }
}
