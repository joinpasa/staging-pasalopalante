/**
 * Bound to the "PKF_Partners" Google Sheet. Every non-underscore tab gets
 * read; within each tab, every row's own Category column (not the tab
 * name) decides which site section it belongs to — so this keeps working
 * whether everything stays on one tab or you later split it into
 * per-category tabs, as long as each row's Category column is set.
 */

const CONFIG = {
  SYNC_URL: "https://tipfbleltjexofsjffwb.supabase.co/functions/v1/sync-partners",
  SYNC_SECRET: "PASTE_PARTNERS_SYNC_SECRET_HERE", // real value lives only in the sheet's script + Supabase secret PARTNERS_SYNC_SECRET — never commit it,
};

// Column order: ID, Status, Featured?, Category, Name, Logo, Website, Facebook, Role, Dark, Sort Order, Internal Notes
// (0-based indexes, used when reading a whole row as an array)
const COLS = {
  ID: 0,
  STATUS: 1,
  FEATURED: 2,
  CATEGORY: 3,
  NAME: 4,
  LOGO: 5,
  WEBSITE: 6,
  FACEBOOK: 7,
  ROLE: 8,
  DARK: 9,
  SORT_ORDER: 10,
  // INTERNAL_NOTES: 11 — never read.
};

// 1-based column numbers (what getRange() expects) — derived from COLS so the
// two can never drift apart again if a column is added later.
const ID_COLUMN = COLS.ID + 1;             // Column A
const CATEGORY_COLUMN = COLS.CATEGORY + 1; // Column D
const FIRST_DATA_ROW = 2;                  // Row 1 = headers

/** Tabs whose name starts with "_" are ignored everywhere (notes, scratch, etc.). */
function dataSheets_() {
  return SpreadsheetApp.getActiveSpreadsheet()
    .getSheets()
    .filter((sheet) => !sheet.getName().startsWith("_"));
}

function syncPartners() {
  const entries = [];

  dataSheets_().forEach((sheet) => {
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) { // skip header row
      const row = values[i];
      const id = String(row[COLS.ID] || "").trim();
      const name = String(row[COLS.NAME] || "").trim();
      const category = String(row[COLS.CATEGORY] || "").trim();
      if (!id || !name || !category) continue; // blank/trailing row

      entries.push({
        id: id,
        category: category,
        status: String(row[COLS.STATUS] || "").trim(),
        name: name,
        logo: String(row[COLS.LOGO] || "").trim() || undefined,
        website: String(row[COLS.WEBSITE] || "").trim() || undefined,
        facebook: String(row[COLS.FACEBOOK] || "").trim() || undefined,
        role: String(row[COLS.ROLE] || "").trim() || undefined,
        dark: String(row[COLS.DARK] || "").trim().toUpperCase() === "TRUE",
        sortOrder: row[COLS.SORT_ORDER] === "" || row[COLS.SORT_ORDER] == null
          ? undefined
          : Number(row[COLS.SORT_ORDER]),
        // "Yes" / "No" / blank from the dropdown (a checkbox's TRUE/FALSE works too).
        featured: String(row[COLS.FEATURED] || "").trim(),
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
    headers: { "x-partners-secret": CONFIG.SYNC_SECRET },
    payload: JSON.stringify({ entries: entries }),
    muteHttpExceptions: true,
  });

  const code = response.getResponseCode();
  const body = response.getContentText();
  if (code !== 200) {
    Logger.log("Sync FAILED (" + code + "): " + body);
    throw new Error("Partners sync failed: " + body);
  }
  Logger.log("Sync OK: " + body); // lists duplicateIds here if any slipped through
}

/** One-time setup: run this once from the editor's function dropdown. It
 * installs a trigger that runs syncPartners automatically every 15 minutes
 * from then on — you only need to run this once, ever. */
function createTimeTrigger() {
  ScriptApp.getProjectTriggers().forEach((t) => {
    if (t.getHandlerFunction() === "syncPartners") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("syncPartners").timeBased().everyMinutes(15).create();
  Logger.log("Installed: syncPartners will now run every 15 minutes.");
}

/** Manual "Partners" menu for testing without waiting 15 minutes. */
function onOpen() {
  SpreadsheetApp.getUi().addMenu("Partners", [
    { name: "Sync now", functionName: "syncPartners" },
    { name: "Fix duplicate IDs", functionName: "fixDuplicateIds" },
  ]);
}

/* ------------------------------------------------------------------ */
/*  ID generation — collision-proof                                    */
/* ------------------------------------------------------------------ */

/**
 * Auto-generates the ID in Column A when Category (Column D) is entered or
 * changed. New IDs use the next free number for that prefix (highest
 * existing + 1, across ALL data tabs), so inserting / sorting / deleting
 * rows can never create a duplicate. A row keeps its existing ID as long as
 * the ID's prefix still matches its category. Editing any other column —
 * including "Featured?" — never touches IDs.
 */
function onEdit(e) {
  if (!e) return;
  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getName().startsWith("_")) return;

  // Only react when the edit touches the Category column below the header
  // (also handles pasting into several rows/columns at once).
  const firstCol = range.getColumn();
  const lastCol = firstCol + range.getNumColumns() - 1;
  if (CATEGORY_COLUMN < firstCol || CATEGORY_COLUMN > lastCol) return;
  if (range.getLastRow() < FIRST_DATA_ROW) return;

  const lock = LockService.getDocumentLock();
  lock.waitLock(10000); // two simultaneous edits can't grab the same number
  try {
    const startRow = Math.max(range.getRow(), FIRST_DATA_ROW);
    const endRow = range.getLastRow();
    for (let row = startRow; row <= endRow; row++) {
      assignId_(sheet, row);
    }
  } finally {
    lock.releaseLock();
  }
}

/** Gives one row the right ID for its category (or clears it if Category is blank). */
function assignId_(sheet, row) {
  const category = String(sheet.getRange(row, CATEGORY_COLUMN).getValue()).trim();
  const idCell = sheet.getRange(row, ID_COLUMN);

  if (category === "") {
    idCell.clearContent();
    return;
  }

  const prefix = makePrefix_(category);
  const currentId = String(idCell.getValue()).trim();

  // Keep the existing ID if it already belongs to this category.
  if (new RegExp("^" + prefix + "-\\d+$").test(currentId)) return;

  idCell.setValue(prefix + "-" + nextNumber_(prefix, sheet, row));
}

/** "Media & Press" -> "MED", "Nonprofits" -> "NON" (letters only, 3 chars). */
function makePrefix_(category) {
  const letters = category.replace(/[^A-Za-z]/g, "").toUpperCase();
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
 * Partners menu. Across all data tabs, finds rows whose ID is missing,
 * doesn't match their category, or duplicates an earlier row, and gives
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
        const category = String(sheet.getRange(row, CATEGORY_COLUMN).getValue()).trim();
        if (category === "") continue;
        const id = String(sheet.getRange(row, ID_COLUMN).getValue()).trim();
        const prefix = makePrefix_(category);
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
