# Changelog

Internal record of what changed on **pasalopalante.com** and the **app** (website, app, and shared backend), for the team — not published anywhere public.

This is maintained by Claude Code. Anyone on the team can work on this repo from their own Claude Code account (different logins are fine — it's the same GitHub repo either way), and every session that finishes a real change adds an entry here before it's done, newest entry at the top. See `CLAUDE.md` for the exact convention.

Format per entry: **date — who asked for it — what changed, in plain terms.**

---

## 2026-09-08 — va.deedumlao@gmail.com

- **"Install app" now shows up reliably from the very first visit.** The mechanism was already right — tapping the button opens the browser's own native install confirmation, same as the old Lovable build did — but the service worker it depends on only registered after someone turned on push notifications, so on a fresh visit the button could just fail to appear. It now registers eagerly on page load instead, on both the website and the app. Also fixed the push notification icon pointing at a path that never existed.
- **Fixed the website claiming the app was already installed when it wasn't.** Root cause: the website has no PWA manifest of its own, so the browser's real "is this already installed" signal could never fire there — every visit, installed or not, fell into a fallback that assumed "already installed." The website now just always offers a "Get the app" link to the actual app, where the real install flow lives (that part already worked correctly and needed no change).
- **Cut "Get the app" down from three taps to two.** A website can never trigger a *different* domain's install prompt directly — that's a hard browser rule, true for every site, not something specific to ours (this is also why the old single-domain Lovable version could do it in one tap: back then the marketing pages and the app were the same site). Landing on the app after tapping "Get the app" can't be skipped, but the extra manual "Install app" tap once there now can be — the native dialog opens automatically the moment the app finishes loading.
- **Built (not yet fully live) a combined deployment that would restore true one-tap install.** Since the one-tap experience needs the marketing pages and the app to share one domain, added `npm run build:combined`, which builds the app embedded at `pasalopalante.com/app/*` instead of its own subdomain. This is pure groundwork — it doesn't change what's live today (verified the normal builds are byte-for-byte unaffected, and confirmed the combined output works end to end in a real browser). Going live needs a deliberate Cloudflare/Supabase cutover — steps are in `CLAUDE.md`. Mid-cutover, Cloudflare rejected the first version of the app's SPA-fallback rule as a false-positive "infinite loop" (it treats a literal `index.html` destination as self-normalizing); fixed by pointing the fallback at a differently-named duplicate of the same file instead.

## 2026-09-04 — va.deedumlao@gmail.com

- **Gamification was quietly broken — fixed and back in sync.** Seven badges (Time Giver, Sleeves Up, Open Hand, Good Word, Wave Maker, Grateful Heart, Kindness Spotter) had been computed by the backend since July but were never added to the actual badge list, so they never showed up anywhere and could never be earned. Also fixed a bug where manually approving a held-for-review act (via the Supabase SQL editor) never unlocked that person's badges, and made the app's badge screen self-heal the same way the website's already did, so the two can't disagree on whether someone earned a badge.
- **Kindness Map search fixed.** Searching for a country with no logged acts yet (e.g. "South Africa") returned nothing — it was only searching countries that already had data. Now searches every country.
- **`/tech-form` now redirects to the GHL lead form** (`pasalopalante.com/tech-form` → LeadConnector). A Cloudflare dashboard Page Rule couldn't work for this domain (the site's Worker intercepts requests first), so the redirect now lives in the site's own deploy config instead.
- Added this changelog and the `CLAUDE.md` team convention that keeps it current.
- Fixed commits showing generic `Claude <noreply@anthropic.com>` authorship no matter who was actually driving. Every Claude Code session now sets its own git identity from the account's email at the start of the session, so `git log`/`git blame` show who really made a change, not just the changelog.
- **Supabase edge functions and migrations now auto-deploy too**, via a new GitHub Actions workflow (`.github/workflows/deploy-supabase.yml`) — same idea as Cloudflare already does for the website/app. This means neither of you needs a personal terminal to ship a backend change anymore; it happens on push. Confirmed working with a live test run.
- **Fixed the app's Install Prompt covering its own Home tab.** On sections like the Pass/QR page, the "Open app" install card could sit directly on top of the bottom tab bar, so tapping Home actually hit that card instead — triggering a full-page reload that looked like getting kicked out to a website. Reproduced and confirmed fixed: the prompt no longer shows that fallback (or overlaps the tab bar at all) while already inside the app.

## 2026-09-02 — va.deedumlao@gmail.com

The busiest day so far — most of today was root-causing and fixing why acts of kindness sometimes failed to submit, plus a big batch of app/website parity work.

- **Wall of Kindness was empty / public data wasn't loading.** Root cause: Supabase had disabled the old JWT-format API key project-wide. Fixed by switching the app and website to the new `sb_publishable_...` key everywhere, and moved every public/anonymous read (wall, map, badges, reactions, streaks) onto a session-free Supabase client so a signed-out visitor's page doesn't depend on having a session at all.
- **"Something went wrong" / 429 / 500 on submitting an act of kindness — fully resolved**, in three parts:
  1. The AI moderation call (Gemini) has rate limits with no fallback — added one: if AI moderation is temporarily unavailable, the act is now held for manual review instead of the submission failing outright.
  2. Found and fixed a stale local deploy issue (uncommitted local files were silently overriding what got pushed to GitHub every time functions were redeployed).
  3. Found a real bug underneath both: held-for-review acts were being saved with a status value the database didn't actually allow, causing a hard failure. Fixed the status value.
- **App login brought up to parity with the website's**: forgot-password flow, magic-link cooldown, clearer error messaging for accounts that don't have a password set yet.
- **Pass QR (in-person "connect" hand-off) — several real bugs fixed:**
  - Codes always said "not valid" — a case-sensitivity mismatch between how codes were generated (lowercase) and how they were displayed/scanned (uppercased somewhere in the middle).
  - Scanning someone's pass while already having the app installed never actually connected/attributed the referral, and an in-app scan showed "success" but never navigated anywhere.
  - The QR code's "Save" button was a stub — wired it up to actually download a real image.
- **Organization/group pledges**: fixed missing GHL tags (`get-involved-group`, and tags for every org type including `faith`/`other`), and Pledge vs. Commitment now sync to two separate GHL fields instead of one overwriting the other.
- Restored the app's Home dashboard as the landing page for signed-out visitors; removed a redundant "Join to unlock the full app" banner (kept the dashboard card + bottom popup); the Install Prompt no longer overlaps the Share Act dialog; added a downloadable QR code to the website's "Your Invitations" section; added Google Analytics to both apps; added Cayman Islands to the country list.

## 2026-09-01 — team

- Added a friendly reset-password prompt for accounts migrated without a password.
- Logo splash on initial load instead of a text flash.
- Redesigned "Live From The Wall" (type tags, rotation, motion) and fixed card heights/timestamps/dropdown stacking.
- Hero video now autoplays and has more room.
- Moved auth emails off the old relay onto Resend + Supabase's native Auth Hook; fixed the sender domain, a broken logo URL, and an auth-key mismatch along the way.
- Added Sign in / Create account tabs to the website's auth page, plus a "Forgot password?" link.
- Website Create Account signups now sync to GHL immediately.
- Website sign-ins/sign-ups route into the app's dashboard with onboarding (later revisited).
- Added the DeepL-backed translation sync script (`npm run translate`).

## 2026-08-31 — team

- Restructured the post-share "Thanks" page into a two-stage layout, refined to match the design mockup.
- Homepage redesign per the Claude Design handoff; moved the language switcher into the navbar and rebalanced nav layout/social links.

## 2026-08-30 — team

- Split the app's signup into quick account setup + a separate welcome walkthrough.
- Unverified accounts are now restricted to the Wall until they set a password.
- Fixed magic links always redirecting to the website even when requested from the app.
- Added the pass-scan hand-off (`/wave`) — this existed as a route but was never actually wired up.
- Added reactions and "thanks" messaging to the app.
- Split the website's `/account` into a dashboard + a separate settings page.
- Swapped AI moderation/generation over to calling Gemini directly (previously went through a gateway that's being retired).
- Turned "Share an act" into a site-wide popup instead of a full page navigation.
- Cloudflare deploy config (`wrangler.toml`) added for both apps as part of moving off Netlify.

## 2026-08-29 — Claude

- **Split the single Lovable-generated project into this monorepo**: `apps/website`, `apps/app`, and `packages/shared`, each independently deployable, sharing one design system/auth/Supabase backend. This is the foundation everything above was built on.

## 2026-08-27 — team

- Initial import from Lovable, first Supabase key/config pass, first Netlify deploy setup (later replaced by Cloudflare — see 08-30).

---

*Older history than this predates this changelog and isn't reconstructed here — start from the git log if you need anything before 2026-08-27.*
