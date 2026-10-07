/**
 * Partner Portal → Google Sheets review loop.
 *
 * Every minute this pulls new partner submissions into the "Submissions"
 * tab. Change a row's Status (Pending / Approved / Needs Changes / Rejected)
 * and it's sent straight back: Approved publishes it to the Wall of
 * Kindness (website + app), anything else takes it down again. The Note
 * column is shown to the organization next to "Needs Changes".
 *
 * Videos: upload the file to the YouTube channel (Public or Unlisted — not
 * Private, private videos can't play on the wall) and paste the link into
 * "YouTube link". It plays on the website's Wall of Kindness once the row is
 * Approved. Works no matter which Google account manages the channel.
 *
 * SETUP (once, ~5 minutes) — see supabase/sheets/README.md for the full steps:
 *   1. New Google Sheet → Extensions → Apps Script → paste this file.
 *   2. Project Settings → Script properties:
 *        SUPABASE_URL  = https://tipfbleltjexofsjffwb.supabase.co
 *        SHEET_SECRET  = (same value as the PARTNER_SHEET_SECRET function secret)
 *   3. Run `setup` once from the editor and approve the permissions.
 */

const TAB = 'Submissions';
const HEADERS = [
  'Submission ID', 'Submitted', 'Organization', 'City', 'Submitted by', 'What happened',
  'People', 'Act date', 'Photos / videos', 'Media consent', 'Status', 'Note',
  'YouTube link', 'Last synced',
];
const COL = { ID: 1, STATUS: 11, NOTE: 12, YOUTUBE: 13, SYNCED: 14 };
const STATUSES = ['Pending', 'Approved', 'Needs Changes', 'Rejected'];

function props_() {
  const p = PropertiesService.getScriptProperties();
  const url = p.getProperty('SUPABASE_URL');
  const secret = p.getProperty('SHEET_SECRET');
  if (!url || !secret) throw new Error('Set SUPABASE_URL and SHEET_SECRET in Project Settings → Script properties.');
  return { url: url.replace(/\/$/, ''), secret };
}

function call_(payload) {
  const { url, secret } = props_();
  const res = UrlFetchApp.fetch(url + '/functions/v1/partner-sheet', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-sheet-secret': secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  const body = JSON.parse(res.getContentText() || '{}');
  if (code >= 300) throw new Error('partner-sheet ' + code + ': ' + (body.error || res.getContentText()));
  return body;
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(TAB);
  if (!sh) sh = ss.insertSheet(TAB);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

/** Run once from the editor: creates the tab, the Status dropdown, and the triggers. */
function setup() {
  const sh = sheet_();
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build();
  sh.getRange(2, COL.STATUS, sh.getMaxRows() - 1, 1).setDataValidation(rule);

  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('pullSubmissions').timeBased().everyMinutes(1).create();
  // Installable (not simple) onEdit — simple triggers can't call external URLs.
  ScriptApp.newTrigger('onStatusEdit').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();

  SpreadsheetApp.getActive().addMenu('Partner review', [{ name: 'Sync now', functionName: 'pullSubmissions' }]);
  pullSubmissions();
}

function onOpen() {
  SpreadsheetApp.getActive().addMenu('Partner review', [{ name: 'Sync now', functionName: 'pullSubmissions' }]);
}

/** Appends new submissions (skipping any ID already in the sheet), then acks them. */
function pullSubmissions() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try {
    const sh = sheet_();
    const { rows } = call_({ action: 'pull' });
    if (!rows || rows.length === 0) return;

    const last = sh.getLastRow();
    const existing = new Set(last > 1 ? sh.getRange(2, COL.ID, last - 1, 1).getValues().map((r) => r[0]) : []);
    const now = new Date();
    const out = rows
      .filter((r) => !existing.has(r.id))
      .map((r) => [
        r.id,
        new Date(r.submitted_at),
        r.school,
        r.city,
        r.staff,
        r.description,
        r.people,
        r.act_date,
        (r.media_links || []).join('\n'),
        r.media_consent ? 'Yes' : 'No',
        'Pending',
        '',
        '',
        now,
      ]);
    if (out.length) {
      sh.getRange(sh.getLastRow() + 1, 1, out.length, HEADERS.length).setValues(out);
    }
    call_({ action: 'ack', ids: rows.map((r) => r.id) });
  } finally {
    lock.releaseLock();
  }
}

/** Sends Status / Note / YouTube link changes back to Supabase. */
function onStatusEdit(e) {
  const range = e.range;
  const sh = range.getSheet();
  if (sh.getName() !== TAB || range.getRow() < 2) return;
  const first = range.getColumn();
  const last = first + range.getNumColumns() - 1;
  const touches = (c) => c >= first && c <= last;
  const review = touches(COL.STATUS) || touches(COL.NOTE);
  const video = touches(COL.YOUTUBE);
  if (!review && !video) return;

  for (let r = range.getRow(); r < range.getRow() + range.getNumRows(); r++) {
    const id = sh.getRange(r, COL.ID).getValue();
    if (!id) continue;
    try {
      // Link first, so approving in the same paste already has the video.
      if (video) {
        const res = call_({ action: 'video', submission_id: id, youtube_url: String(sh.getRange(r, COL.YOUTUBE).getValue()) });
        if (res.youtube_url) sh.getRange(r, COL.YOUTUBE).setValue(res.youtube_url);
      }
      const status = sh.getRange(r, COL.STATUS).getValue();
      if (review && status) {
        call_({ action: 'review', submission_id: id, status: status, note: sh.getRange(r, COL.NOTE).getValue() });
      }
      sh.getRange(r, COL.SYNCED).setValue(new Date());
    } catch (err) {
      sh.getRange(r, COL.SYNCED).setValue('ERROR: ' + err.message);
    }
  }
}
