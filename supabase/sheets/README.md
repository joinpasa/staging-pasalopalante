# Partner submissions → Google Sheets review

Schools log acts in the partner portal. They land in a Google Sheet. You set **Status** to **Approved** and the act goes live on the Wall of Kindness (website and app).

```
Partner portal ──► partner-submit ──► partner_submissions (pending)
                                            │  pulled every minute
                                            ▼
                                     Google Sheet ("Submissions" tab)
                                            │  Status edited
                                            ▼
                 partner-sheet "review" ──► Approved: published acts_of_kindness row (wall)
                                            Other:   wall row taken down again
```

Supabase stays the source of truth, and the Sheet is a review surface. Deleting a row in the Sheet does nothing to the submission. Change its Status instead.

## One-time setup (about 5 minutes)

1. **Pick a secret.** Any long random string works, e.g. from `openssl rand -hex 32`.
2. **Give it to Supabase.** Dashboard → Edge Functions → Secrets → add `PARTNER_SHEET_SECRET` = that string.
3. **Create the Sheet.** New Google Sheet → **Extensions → Apps Script**. Delete the sample code and paste in [`partner-review.gs`](./partner-review.gs).
4. **Script properties.** In the Apps Script editor go to Project Settings (gear) → Script properties and add:
   - `SUPABASE_URL` = `https://tipfbleltjexofsjffwb.supabase.co`
   - `SHEET_SECRET` = the same string from step 1
5. **Run `setup`.** Pick `setup` in the function dropdown, click **Run** and approve the Google permissions. That creates the tab, the Status dropdown, the every-minute sync and the edit trigger.

After that the Sheet fills itself. **Partner review → Sync now** forces an immediate pull.

## Reviewing

| Status        | What happens                                                         |
|---------------|----------------------------------------------------------------------|
| Pending       | Default. Not on the wall.                                            |
| Approved      | Published to the wall with the school's name and its photos.         |
| Needs Changes | Not on the wall. The school sees "Needs Changes" and your **Note**.  |
| Rejected      | Not on the wall.                                                     |

- You can change your mind. Moving an Approved row to anything else takes it off the wall again.
- Photo/video links in the sheet are private, signed links that work for 30 days.
- Videos are kept for review and social use. The walls only embed YouTube links today, so an approved post shows its photos (or text only).
- If **Last synced** shows `ERROR: …`, the status change didn't reach Supabase. Fix the cause (usually a wrong secret) and change the Status again.
