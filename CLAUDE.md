# Working in this repo

See `README.md` for the project layout (apps/website, apps/app, packages/shared, supabase/). This file is operational notes for Claude Code sessions — including teammates' own accounts working on the same repo.

## Work on one branch: `claude/app-website-separation-lgg5nb`

All work goes on `claude/app-website-separation-lgg5nb` — it's the branch Cloudflare and the Supabase deploy workflow track, so pushing there is what ships. Don't create or push per-session working branches (`claude/<random-name>`), even if the session's setup names one; the team asked for a single branch to keep things clean. At the start of a session:

```
git fetch origin claude/app-website-separation-lgg5nb
git checkout -B claude/app-website-separation-lgg5nb origin/claude/app-website-separation-lgg5nb
```

Teammates push here too, so `git pull origin claude/app-website-separation-lgg5nb` before committing and again right before pushing (merge, don't force-push or rebase shared history). Push with `git push origin claude/app-website-separation-lgg5nb`.

## Deploys

- **Frontend (`apps/website`, `apps/app`)**: auto-deploys via Cloudflare on push to the tracked branch. Nothing manual needed after a push.
- **Supabase edge functions and migrations**: also auto-deploy now, via `.github/workflows/deploy-supabase.yml` — a push to the tracked branch touching `supabase/**` runs `supabase db push` then `supabase functions deploy` in GitHub Actions. This requires the `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` repo secrets to be set (Settings → Secrets and variables → Actions on GitHub); if they're missing or wrong, the workflow run fails visibly in the Actions tab rather than silently no-op'ing.
  - **Fallback**: if the Action is failing (bad secret, Supabase outage, whatever) and something needs to go out now, it can still be pushed by hand: `supabase db push` / `supabase functions deploy <name> --no-verify-jwt` from a terminal with the CLI linked (`supabase link --project-ref tipfbleltjexofsjffwb`). This can't be done from a sandboxed/remote Claude Code session — no network path to `*.supabase.co` from there.
  - If a fresh checkout's migration history is out of sync with what's actually live (CLI wants to replay everything from scratch), that's a bookkeeping problem, not a real conflict — see `supabase migration list` / `supabase migration repair --status applied <versions...>` before assuming anything is broken.

After pushing a change to `supabase/**`, check the Actions tab (or ask the user to) rather than assuming it deployed — a red run there means it didn't ship.

## The two domains (app lives at pasalopalante.com/app) — this already happened

This used to document a *planned* cutover. It's done — don't follow it as a future to-do, and don't tell anyone the app still lives on its own subdomain. Here's the actual current state:

- The `pasalopalante.com` Cloudflare project's build command is `npm run build:combined` (`scripts/build-combined.mjs`), live since 2026-09-08: the website serves at `/`, the installable app is embedded at `/app/*`, same origin. This is what makes the one-tap "Get the app → native install dialog" work (an install prompt can't be triggered across origins). `build:website`/`build:app` still exist and are unaffected — other things still use them (e.g. `app.pasalopalante.com` below).
- **`app.pasalopalante.com` is still a real, independently-deployed, fully-working app** — not a redirect, and not retired. It's `build:app`'s own separate Cloudflare project, kept intentionally live so old bookmarks and previously-shared/printed Pass QR codes keep working. Any new QR code, share link, or "Open/Get the app" button on the website now points at same-origin `pasalopalante.com/app/...` instead (see `getAppBaseUrl()` in `packages/shared/src/lib/canonicalDomain.ts`) — `app.pasalopalante.com` is a fallback for existing links, not where new traffic is sent.
- Supabase's Auth → URL Configuration → Redirect URLs allow-list already includes `https://pasalopalante.com/app/**` (has to, for magic links/password reset to work on the combined path, which they do).
- **Still genuinely pending**: pointing `app.pasalopalante.com` at a redirect to `pasalopalante.com/app/$1` instead of keeping it as a second live deployment, and retiring that old Cloudflare project once that's confirmed stable. Don't do this unprompted — it's a deliberate, not-yet-made call, not an oversight.
- `passkindnessforward.com` shares the same Cloudflare Worker as `pasalopalante.com` (same combined build), which once caused it to silently spin up its own separate install/account system — fixed (`canonicalDomain.ts`, covered by `canonicalDomain.test.ts`): its `/auth` and `/account` routes redirect to canonical `pasalopalante.com`, and its app links always point at `app.pasalopalante.com` rather than installing a second, disconnected copy of the app.

## Set real git identity at the start of every session


This repo is worked on by more than one person, each through their own Claude Code account. By default every environment commits as generic `Claude <noreply@anthropic.com>`, which makes it impossible to tell from git alone who asked for what. Fix that at the start of each session, before making any commit: if this session's context gives you a `userEmail`, run

```
git config user.name "<local-part of the email> (Claude Code)"
git config user.email "<the actual userEmail>"
```

(e.g. `git config user.name "va.deedumlao (Claude Code)"` / `git config user.email "va.deedumlao@gmail.com"`). This only sets local repo config for this session's commits going forward — it doesn't rewrite any existing history. If no `userEmail` is available in context, leave the default as-is rather than guessing.

## Keep CHANGELOG.md current

`CHANGELOG.md` is still the readable, human-facing record — git log is not something anyone should have to read to find out what shipped and why. Keep it current:

1. After finishing a real, user-facing or functionally meaningful change (a fix, a feature, a behavior change) — not a typo or a comment tweak — add an entry to `CHANGELOG.md`.
2. Entries are newest-first. If there's already a section for today's date at the top, add your bullet(s) there. Otherwise add a new `## YYYY-MM-DD — <requester>` section above the previous one.
3. `<requester>` is whoever asked for the change this session — use the `userEmail` given in this session's own context. If genuinely unclear (e.g. a self-initiated cleanup), use `team`.
4. Write the bullet in plain, non-technical language — what changed and why it matters, not a restatement of the diff. One or two sentences is usually enough; group multiple related commits from the same piece of work into one bullet rather than listing each commit.
5. Don't edit or renumber older entries. This is a log, not a living doc.

## Auth flows are fragile — verify before marking any shared-code task done

Login, signup, account creation, and forgot-password break easily from changes 
that had nothing to do with auth — a layout tweak, a color/theme token swap, a 
shared component edit, a routing change. This has happened repeatedly and is 
the main source of "the app isn't working" reports from the team.

**Rule:** before marking a task complete, if the session touched any of the 
following, verify the four auth flows still work:
- Shared layout components (headers, footers, nav, modals, form wrappers)
- Global CSS / theme / color tokens / design system files
- Routing config
- Anything in `packages/shared`

**Verification, in order of cost:**
1. Cheapest — read the diff and reason about whether it could plausibly touch 
   auth-rendering paths. If clearly unrelated (e.g. a copy-only change to the 
   Donate page), skip the rest.
2. If plausibly affected — actually load `/login`, `/signup`, and the 
   forgot-password page in a browser/preview and confirm they render and the 
   forms submit. Don't just check that the build didn't error; a page can 
   build fine and still render broken (missing theme variable, broken import).
3. If something's broken — fix it as part of the same task, before considering 
   the task done. Don't hand back a task that silently broke auth even if that 
   wasn't what was asked.

If you can't verify live rendering in this session (e.g. sandboxed with no 
browser), say so explicitly in your summary to the user instead of assuming 
it's fine — "I changed shared layout files but could not verify login/signup 
still render; please check before considering this done" is the honest and 
correct thing to say.
