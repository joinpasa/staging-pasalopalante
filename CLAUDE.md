# Working in this repo

See `README.md` for the project layout (apps/website, apps/app, packages/shared, supabase/). This file is operational notes for Claude Code sessions — including teammates' own accounts working on the same repo.

## Deploys are not fully automatic — know which parts are

- **Frontend (`apps/website`, `apps/app`)**: auto-deploys via Cloudflare on push to the tracked branch. Nothing manual needed after a push.
- **Supabase edge functions** (`supabase/functions/*`): do **not** auto-deploy. Changes only go live after someone runs `supabase functions deploy <name> --no-verify-jwt` from their own terminal (this can't be done from a sandboxed/remote session — no network path to `*.supabase.co`). Always tell the user exactly which function to deploy.
- **Supabase migrations** (`supabase/migrations/*.sql`): also don't auto-apply. Someone needs to run `supabase db push` from a terminal with the CLI linked (`supabase link --project-ref tipfbleltjexofsjffwb`) to the project. If a fresh checkout's migration history is out of sync with what's actually live (CLI wants to replay everything from scratch), that's a bookkeeping problem, not a real conflict — see `supabase migration list` / `supabase migration repair --status applied <versions...>` before assuming anything is broken.

When you finish work that touches either of these, say clearly what still needs to be run, and by whom — don't assume it shipped just because it's pushed to GitHub.

## Keep CHANGELOG.md current

This repo is worked on by more than one person, each through their own Claude Code account. Git commit authorship doesn't distinguish between them (commits show as "Claude" regardless of who's driving), so `CHANGELOG.md` is the one place that tracks **who asked for what**. Keep it that way:

1. After finishing a real, user-facing or functionally meaningful change (a fix, a feature, a behavior change) — not a typo or a comment tweak — add an entry to `CHANGELOG.md`.
2. Entries are newest-first. If there's already a section for today's date at the top, add your bullet(s) there. Otherwise add a new `## YYYY-MM-DD — <requester>` section above the previous one.
3. `<requester>` is whoever asked for the change this session — use the `userEmail` given in this session's own context. If genuinely unclear (e.g. a self-initiated cleanup), use `team`.
4. Write the bullet in plain, non-technical language — what changed and why it matters, not a restatement of the diff. One or two sentences is usually enough; group multiple related commits from the same piece of work into one bullet rather than listing each commit.
5. Don't edit or renumber older entries. This is a log, not a living doc.
