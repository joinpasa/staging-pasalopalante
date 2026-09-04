# Working in this repo

See `README.md` for the project layout (apps/website, apps/app, packages/shared, supabase/). This file is operational notes for Claude Code sessions — including teammates' own accounts working on the same repo.

## Deploys

- **Frontend (`apps/website`, `apps/app`)**: auto-deploys via Cloudflare on push to the tracked branch. Nothing manual needed after a push.
- **Supabase edge functions and migrations**: also auto-deploy now, via `.github/workflows/deploy-supabase.yml` — a push to the tracked branch touching `supabase/**` runs `supabase db push` then `supabase functions deploy` in GitHub Actions. This requires the `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` repo secrets to be set (Settings → Secrets and variables → Actions on GitHub); if they're missing or wrong, the workflow run fails visibly in the Actions tab rather than silently no-op'ing.
  - **Fallback**: if the Action is failing (bad secret, Supabase outage, whatever) and something needs to go out now, it can still be pushed by hand: `supabase db push` / `supabase functions deploy <name> --no-verify-jwt` from a terminal with the CLI linked (`supabase link --project-ref tipfbleltjexofsjffwb`). This can't be done from a sandboxed/remote Claude Code session — no network path to `*.supabase.co` from there.
  - If a fresh checkout's migration history is out of sync with what's actually live (CLI wants to replay everything from scratch), that's a bookkeeping problem, not a real conflict — see `supabase migration list` / `supabase migration repair --status applied <versions...>` before assuming anything is broken.

After pushing a change to `supabase/**`, check the Actions tab (or ask the user to) rather than assuming it deployed — a red run there means it didn't ship.

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
