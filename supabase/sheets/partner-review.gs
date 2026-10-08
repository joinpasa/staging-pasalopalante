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
 *      It creates the header row itself — don't type headers by hand.
 *
 * "Needs Changes" emails go out from the Gmail account that ran `setup`
 * (they show in its Sent folder and replies come back to it). Optional
 * script properties: SENDER_NAME (default "Pass Kindness Forward"),
 * REPLY_TO (a different reply address), FROM_ALIAS (a "Send mail as" alias
 * already set up in that Gmail, e.g. teampkf@passkindnessforward.com).
 */

const TAB = 'Submissions';

// Review columns on the left, admin/reference columns on the right.
const HEADERS = [
  'Status', 'Note', 'Organization', 'Org type', 'What happened', 'People',
  'Act date', 'Photos / videos', 'Media', 'Media consent', 'YouTube link',
  'Submitted by', 'City', 'Submitted', 'Batch', 'Reviewed by', 'Reviewed at',
  'Org contact', 'Last synced', 'Submission ID',
  // Added later — kept at the end so existing sheets don't shift columns.
  'Submitter email',
];
const COL = {};
HEADERS.forEach((h, i) => (COL[h] = i + 1));

const STATUSES = ['Pending', 'Approved', 'Needs Changes', 'Rejected'];
const RESUBMITTED_BG = '#FFF4D6'; // light yellow: edited by the organization, waiting for a new decision
const PORTAL_URL = 'https://partners.passkindnessforward.com';
const EMAILED_MARK = 'Emailed '; // prefix of the Status cell's note once the org has been emailed for this round

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
  } else if (sh.getLastColumn() < HEADERS.length) {
    // A sheet set up before newer columns existed: add their headers at the end.
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  }
  return sh;
}

function menu_() {
  SpreadsheetApp.getActive().addMenu('Partner review', [{ name: 'Sync now', functionName: 'pullSubmissions' }]);
}

/** Run once from the editor: creates the tab, headers, Status dropdown, and triggers. */
function setup() {
  const sh = sheet_();
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build();
  sh.getRange(2, COL['Status'], sh.getMaxRows() - 1, 1).setDataValidation(rule);
  sh.setFrozenColumns(COL['Organization']); // Status, Note, Organization stay visible while scrolling right
  sh.getRange(2, COL['What happened'], sh.getMaxRows() - 1, 1).setWrap(true);
  sh.setColumnWidth(COL['What happened'], 320);

  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('pullSubmissions').timeBased().everyMinutes(1).create();
  // Installable (not simple) onEdit — simple triggers can't call external URLs.
  ScriptApp.newTrigger('onStatusEdit').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();

  menu_();
  pullSubmissions();
}

function onOpen() {
  menu_();
}

/**
 * Appends new submissions (skipping any ID already in the sheet), then acks
 * them. An act the organization edited after "Needs Changes" comes back with
 * resubmitted_at set: its existing row is updated in place and put back to
 * Pending, with the previous reviewer note kept in Note for context.
 */
function pullSubmissions() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try {
    const sh = sheet_();
    const { rows } = call_({ action: 'pull' });
    if (!rows || rows.length === 0) return;

    const last = sh.getLastRow();
    const rowOf = new Map();
    if (last > 1) {
      sh.getRange(2, COL['Submission ID'], last - 1, 1).getValues()
        .forEach((r, i) => rowOf.set(r[0], i + 2));
    }
    const now = new Date();
    const toValues = (r, extra) => {
      const v = Object.assign({
        'Status': 'Pending',
        'Note': '',
        'Organization': r.organization,
        'Org type': r.org_type,
        'What happened': r.description,
        'People': r.people,
        'Act date': r.act_date,
        'Photos / videos': (r.media_links || []).join('\n'),
        'Media': r.media_summary,
        'Media consent': r.media_consent ? 'Yes' : 'No',
        'YouTube link': '',
        'Submitted by': r.staff,
        'City': r.city,
        'Submitted': new Date(r.submitted_at),
        'Batch': r.batch,
        'Reviewed by': '',
        'Reviewed at': '',
        'Org contact': r.org_contact,
        'Last synced': now,
        'Submission ID': r.id,
        'Submitter email': r.submitter_email || '',
      }, extra || {});
      return HEADERS.map((h) => v[h]);
    };

    const fresh = [];
    rows.forEach((r) => {
      const existing = rowOf.get(r.id);
      if (!existing) {
        fresh.push(toValues(r));
      } else if (r.resubmitted_at) {
        const when = Utilities.formatDate(new Date(r.resubmitted_at), Session.getScriptTimeZone(), 'MMM d, h:mm a');
        // Note keeps the reviewer's previous note (it's what the org was
        // answering); "Reviewed by" flags the resubmission until the next
        // Status change overwrites it. The YouTube link, if pasted, is kept.
        const keepYouTube = sh.getRange(existing, COL['YouTube link']).getValue();
        sh.getRange(existing, 1, 1, HEADERS.length).setValues([toValues(r, {
          'Note': r.previous_note || '',
          'YouTube link': keepYouTube,
          'Reviewed by': 'RESUBMITTED ' + when,
        })]);
        sh.getRange(existing, 1, 1, HEADERS.length).setBackground(RESUBMITTED_BG);
        sh.getRange(existing, COL['Status']).setNote(''); // a new round: next "Needs Changes" emails again
      }
    });
    if (fresh.length) {
      sh.getRange(sh.getLastRow() + 1, 1, fresh.length, HEADERS.length).setValues(fresh);
    }
    call_({ action: 'ack', ids: rows.map((r) => r.id) });
  } finally {
    lock.releaseLock();
  }
}

function escapeHtml_(v) {
  return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/**
 * Emails the person who logged the act (cc the organization's contact) once
 * per "Needs Changes" round, from this Gmail. No submitter email on file →
 * it goes to the org contact alone.
 * Waits for a Note (setting the Status before typing the note is the usual
 * order), and remembers it was sent in a note on the Status cell, so later
 * edits don't send duplicates. Moving the row off "Needs Changes" resets it.
 */
function maybeEmailNeedsChanges_(sh, r) {
  const statusCell = sh.getRange(r, COL['Status']);
  if (statusCell.getValue() !== 'Needs Changes') {
    if (statusCell.getNote()) statusCell.setNote('');
    return;
  }
  if (String(statusCell.getNote()).indexOf(EMAILED_MARK) === 0) return;

  const note = String(sh.getRange(r, COL['Note']).getValue()).trim();
  const submitter = String(sh.getRange(r, COL['Submitter email']).getValue()).trim();
  const orgContact = String(sh.getRange(r, COL['Org contact']).getValue()).trim();
  const to = submitter || orgContact;
  const cc = submitter && orgContact && orgContact.toLowerCase() !== submitter.toLowerCase() ? orgContact : '';
  if (!to) {
    statusCell.setNote('Not emailed: no Submitter email or Org contact on file.');
    return;
  }
  if (!note) {
    statusCell.setNote('Type a Note to email ' + to + ' what to change.');
    return;
  }

  const org = String(sh.getRange(r, COL['Organization']).getValue());
  const what = String(sh.getRange(r, COL['What happened']).getValue());
  const p = PropertiesService.getScriptProperties();
  const opts = {
    name: p.getProperty('SENDER_NAME') || 'Pass Kindness Forward',
    htmlBody:
      '<div style="font-family:Montserrat,Arial,sans-serif;background:#F8F6F1;padding:28px 14px;color:#0e234b">' +
      '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:18px;padding:28px">' +
      '<h2 style="margin:0 0 8px;font-size:20px">An act needs a quick change</h2>' +
      '<p style="margin:0 0 16px;color:#4A5875">Thanks for sharing ' + escapeHtml_(org) +
      "'s kindness! Before this act can go on the Wall of Kindness, our team asked for a small update:</p>" +
      '<p style="margin:0 0 16px;padding:12px 14px;background:#F8F6F1;border-radius:10px">“' + escapeHtml_(what) + '”</p>' +
      '<p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.06em;color:#A3134A">NOTE FROM THE REVIEWER</p>' +
      '<p style="margin:0 0 20px;padding:12px 14px;background:#FCE4EE;border-radius:10px">' + escapeHtml_(note) + '</p>' +
      '<a href="' + PORTAL_URL + '" style="display:inline-block;background:#f37023;color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:12px">Open the Partner Portal</a>' +
      '<p style="margin:18px 0 0;font-size:13px;color:#4A5875">Log in, tap the act marked “Needs Changes”, update it and resubmit. ' +
      'Questions? Just reply to this email.</p></div></div>',
  };
  if (cc) opts.cc = cc;
  if (p.getProperty('REPLY_TO')) opts.replyTo = p.getProperty('REPLY_TO');
  if (p.getProperty('FROM_ALIAS')) opts.from = p.getProperty('FROM_ALIAS');

  const plain =
    'An act needs a quick change before it can go on the Wall of Kindness:\n\n"' + what + '"\n\n' +
    'Note from the reviewer: ' + note + '\n\n' +
    'Log in at ' + PORTAL_URL + ', tap the act marked "Needs Changes", update it and resubmit. Questions? Just reply to this email.';

  GmailApp.sendEmail(to, 'One of your acts needs a quick change', plain, opts);
  statusCell.setNote(EMAILED_MARK + to + (cc ? ' (cc ' + cc + ')' : '') + ' · ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMM d, h:mm a'));
}

/** Who made this edit. Works for reviewers in the same Google Workspace as the script owner. */
function editorEmail_(e) {
  try {
    if (e && e.user && e.user.getEmail && e.user.getEmail()) return e.user.getEmail();
  } catch (err) {
    /* not available for this account type */
  }
  return Session.getActiveUser().getEmail() || '';
}

/** Sends Status / Note / YouTube link changes back to Supabase. */
function onStatusEdit(e) {
  const range = e.range;
  const sh = range.getSheet();
  if (sh.getName() !== TAB || range.getRow() < 2) return;
  const first = range.getColumn();
  const last = first + range.getNumColumns() - 1;
  const touches = (c) => c >= first && c <= last;
  const statusChanged = touches(COL['Status']);
  const review = statusChanged || touches(COL['Note']);
  const video = touches(COL['YouTube link']);
  if (!review && !video) return;

  const who = statusChanged ? editorEmail_(e) : '';
  for (let r = range.getRow(); r < range.getRow() + range.getNumRows(); r++) {
    const id = sh.getRange(r, COL['Submission ID']).getValue();
    if (!id) continue;
    try {
      // Link first, so approving in the same paste already has the video.
      if (video) {
        const res = call_({
          action: 'video',
          submission_id: id,
          youtube_url: String(sh.getRange(r, COL['YouTube link']).getValue()),
        });
        if (res.youtube_url) sh.getRange(r, COL['YouTube link']).setValue(res.youtube_url);
      }
      const status = sh.getRange(r, COL['Status']).getValue();
      if (review && status) {
        call_({ action: 'review', submission_id: id, status: status, note: sh.getRange(r, COL['Note']).getValue() });
        if (statusChanged) {
          sh.getRange(r, COL['Reviewed by']).setValue(who);
          sh.getRange(r, COL['Reviewed at']).setValue(new Date());
          sh.getRange(r, 1, 1, HEADERS.length).setBackground(null); // clear the "resubmitted" highlight
        }
        maybeEmailNeedsChanges_(sh, r);
      }
      sh.getRange(r, COL['Last synced']).setValue(new Date());
    } catch (err) {
      sh.getRange(r, COL['Last synced']).setValue('ERROR: ' + err.message);
    }
  }
}
