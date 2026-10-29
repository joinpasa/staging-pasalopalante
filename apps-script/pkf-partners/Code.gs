/**
 * Bound to the "PKF_Partners" Google Sheet. Every non-underscore tab gets
 * read; within each tab, every row's own Category column (not the tab
 * name) decides which site section it belongs to — so this keeps working
 * whether everything stays on one tab or you later split it into
 * per-category tabs, as long as each row's Category column is set.
 */

const CONFIG = {
  SYNC_URL: "https://tipfbleltjexofsjffwb.supabase.co/functions/v1/sync-partners",
  SYNC_SECRET: "PASTE_PARTNERS_SYNC_SECRET_HERE", // real value lives only in the sheet's script + Supabase secret PARTNERS_SYNC_SECRET — never commit it
  // GHL partner-application webhook (doPost below). Any long random text;
  // the same value goes at the end of the webhook URL in GHL (?key=...).
  // Never commit the real value.
  INTAKE_SECRET: "PASTE_ANY_LONG_RANDOM_TEXT_HERE",
  // Tab new applications land on. Blank = the first non-underscore tab.
  INTAKE_TAB: "",
  // Used when the form doesn't send a category (Category is required for
  // the row to sync and to get an ID). Fix it by hand when you approve.
  DEFAULT_CATEGORY: "Businesses",
};

// Column order: ID, Status, Featured?, Category, Name, Logo, Website, Facebook, Role, Dark, Sort Order, Internal Notes,
// Portal Access, Contact Email, Portal Link
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
  PORTAL: 12,        // M — "Yes" = give this partner a partner-portal account once Approved
  CONTACT_EMAIL: 13, // N — goes to the private portal org only, never to the website
  PORTAL_LINK: 14,   // O — filled in by the sync: the portal invite link to send them
};
const TOTAL_COLS = 15;
const PORTAL_HEADERS = { 13: "Portal Access", 14: "Contact Email", 15: "Portal Link" }; // 1-based column → header

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
  const rowOf = {}; // sheet row ID → { sheet, row } so portal links can be written back

  dataSheets_().forEach((sheet) => {
    ensurePortalHeaders_(sheet);
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) { // skip header row
      const row = values[i];
      const id = String(row[COLS.ID] || "").trim();
      const name = String(row[COLS.NAME] || "").trim();
      const category = String(row[COLS.CATEGORY] || "").trim();
      if (!id || !name || !category) continue; // blank/trailing row
      rowOf[id] = { sheet: sheet, row: i + 1 };

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
        portal: String(row[COLS.PORTAL] || "").trim(),
        contactEmail: String(row[COLS.CONTACT_EMAIL] || "").trim(),
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
  Logger.log("Sync OK: " + body); // lists duplicateIds / portalCreated here

  // Write each portal org's invite link into the Portal Link column.
  const result = JSON.parse(body);
  const links = result.portalLinks || {};
  Object.keys(links).forEach((id) => {
    const at = rowOf[id];
    if (!at) return;
    const cell = at.sheet.getRange(at.row, COLS.PORTAL_LINK + 1);
    if (String(cell.getValue()).trim() !== links[id]) cell.setValue(links[id]);
  });
  if (result.portalWarning) Logger.log("Portal: " + result.portalWarning);
}

/** Adds the three portal headers to row 1 if they're missing. */
function ensurePortalHeaders_(sheet) {
  Object.keys(PORTAL_HEADERS).forEach((col) => {
    const cell = sheet.getRange(1, Number(col));
    if (String(cell.getValue()).trim() === "") cell.setValue(PORTAL_HEADERS[col]);
  });
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

/* ------------------------------------------------------------------ */
/*  GHL partner applications → new Pending row                         */
/* ------------------------------------------------------------------ */

/**
 * Web-app endpoint for the GHL "Webhook" workflow action (trigger: the
 * partner application form is submitted). Adds ONE row per application
 * with Status = "Pending" and Portal Access = "Yes". Nothing happens until
 * someone on the team reviews it and changes Status to "Approved": the next
 * sync then puts it on the website AND creates its partner-portal account,
 * writing the invite link into the Portal Link column. The contact's email
 * goes to Contact Email (portal only); name/phone go in Internal Notes.
 * Neither is ever shown on the website.
 *
 * Setup: Deploy → New deployment → Web app, Execute as: Me, Who has
 * access: Anyone. In GHL use the plain "Webhook" action (POST) with the
 * web-app URL + "?key=" + CONFIG.INTAKE_SECRET.
 *
 * Field names: GHL sends its standard contact fields (first_name,
 * company_name, website, email, phone...). For anything else, add a
 * "Custom Data" line in the GHL Webhook action using one of these keys:
 * partner_name, category, website, facebook, logo, role.
 */
function doPost(e) {
  const params = (e && e.parameter) || {};
  if (!CONFIG.INTAKE_SECRET || CONFIG.INTAKE_SECRET.indexOf("PASTE_") === 0 || params.key !== CONFIG.INTAKE_SECRET) {
    return textOut_("unauthorized");
  }

  let payload = {};
  try {
    payload = JSON.parse((e.postData && e.postData.contents) || "{}");
  } catch (err) {
    return textOut_("bad json");
  }
  const f = flattenPayload_(payload);
  logIntake_(payload);

  const pick = (...keys) => {
    for (const k of keys) {
      const v = f[normKey_(k)];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
    return "";
  };

  const name = pick("partner_name", "organization_name", "organization", "company_name", "company", "business_name");
  if (!name) return textOut_("missing organization name");
  const category = pick("category", "partner_category", "organization_type", "type") || CONFIG.DEFAULT_CATEGORY;
  const contact = [pick("full_name", "name") || [pick("first_name"), pick("last_name")].join(" ").trim(), pick("email"), pick("phone")]
    .filter(Boolean)
    .join(" · ");

  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    const sheet = intakeSheet_();

    // Same organization submitted twice → don't add a second row.
    const existing = dataSheets_().some((sh) => {
      const last = sh.getLastRow();
      if (last < FIRST_DATA_ROW) return false;
      return sh.getRange(FIRST_DATA_ROW, COLS.NAME + 1, last - FIRST_DATA_ROW + 1, 1).getValues()
        .some((r) => String(r[0]).trim().toLowerCase() === name.toLowerCase());
    });
    if (existing) return textOut_("duplicate");

    const prefix = makePrefix_(category);
    const row = new Array(TOTAL_COLS).fill("");
    row[COLS.ID] = prefix + "-" + nextNumber_(prefix);
    row[COLS.STATUS] = "Pending";
    row[COLS.FEATURED] = "No";
    row[COLS.CATEGORY] = category;
    row[COLS.NAME] = name;
    row[COLS.LOGO] = pick("logo", "logo_url");
    row[COLS.WEBSITE] = pick("website", "website_url", "company_website");
    row[COLS.FACEBOOK] = pick("facebook", "facebook_url");
    row[COLS.ROLE] = pick("role", "partnership_type");
    row[COLS.DARK] = "FALSE";
    row[COLS.PORTAL] = "Yes"; // portal account is created when someone sets Status = Approved
    row[COLS.CONTACT_EMAIL] = pick("email");
    row[11] = "GHL application " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm") +
      (contact ? " — " + contact : "");
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }
  return textOut_("ok");
}

function intakeSheet_() {
  if (CONFIG.INTAKE_TAB) {
    const named = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.INTAKE_TAB);
    if (named) return named;
  }
  return dataSheets_()[0];
}

// GHL nests some fields (contact.*, customData.*); flatten to one level
// with normalized keys ("Company Name" / company_name → companyname).
function flattenPayload_(obj, out) {
  out = out || {};
  Object.keys(obj || {}).forEach((k) => {
    const v = obj[k];
    if (v && typeof v === "object" && !Array.isArray(v)) flattenPayload_(v, out);
    else if (!(normKey_(k) in out)) out[normKey_(k)] = Array.isArray(v) ? v.join(", ") : v;
  });
  return out;
}

function normKey_(k) {
  return String(k).toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Raw payloads go to "_intake_log" (underscore = ignored by the sync and
// ID numbering) so a field that didn't map can be traced. Last 200 kept.
function logIntake_(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const log = ss.getSheetByName("_intake_log") || ss.insertSheet("_intake_log");
  log.appendRow([new Date(), JSON.stringify(payload).slice(0, 45000)]);
  const extra = log.getLastRow() - 200;
  if (extra > 0) log.deleteRows(1, extra);
}

function textOut_(s) {
  return ContentService.createTextOutput(s);
}
