# Kindness Hub tools

Two small tools for working on the hub from a terminal, including through Claude.

## The hub API (`hub.mjs`)

The edge function `supabase/functions/hub-api` lets a trusted tool read and change the hub's own
data with a key: cards, growth tasks, the weekly brief, the kit, the story bank, videos and
suggestions. It is how Claude can add a week's tasks, file new videos or update a card without
anyone clicking through the screens.

What it will not do, by design:

- post, schedule, email or message anyone (that stays with HighLevel and with people)
- approve a card, or change a card once it is approved (only its notes)
- show anyone's email address (members come back as names and roles only)

Every change it makes is written to the `hub_api_log` table, which the team can read, and to the
card's own history when a card changes.

### Turning it on

1. Make a long random key, for example with `openssl rand -hex 32`. Do not paste it into chat.
2. Add it on GitHub as the Actions secret `HUB_API_KEY` (Settings, Secrets and variables,
   Actions). The next deploy copies it to the function. Until then the API answers every request
   with "switched off".
3. Put the same key in `apps/hub/.env.hub.local` (never committed):

   ```
   HUB_API_KEY=the-key
   HUB_ACTOR=Claude for Simone
   ```

### Using it

```bash
node tools/hub.mjs                          # what the API offers
node tools/hub.mjs week                     # this week's brief, kit, cards and tasks
node tools/hub.mjs list tasks --week 2026-11-16 --owner Mark
node tools/hub.mjs add tasks '{"title":"Reply to comments","day":"2026-11-17","lever":"engage","ownerId":"Mark"}'
node tools/hub.mjs update tasks <id> '{"done":true}'
node tools/hub.mjs add videos '{"title":"A partner reel","url":"https://www.instagram.com/reel/...","group":"partner","rights":"ask"}'
node tools/hub.mjs log                      # what changed through the API
```

People can be given by name ("Simone", "Mark", "Dee") wherever a member is asked for.

## Loading the starting plan (`export-plan.mts`)

Once the hub is live, its tables start empty. This writes the week the team has been working
from (cards, growth tasks with their step-by-step guides, the brief, the kit and the video
gallery) as one file, which the API imports in one go:

```bash
npx tsx tools/export-plan.mts plan.json
node tools/hub.mjs import plan.json
```

Running the import twice is safe: anything already there is skipped. Cards that were already
approved arrive in Review, because approval is given in the hub by a person.

## Checking a week's plan (`check-plan.mts`)

Before a plan goes into the hub, this checks its shape, the house wording (no exclamation marks,
no all caps, the pledge and record wording), that every card and task has an owner from the team,
that cards start in Idea or Planning, and that every growth task says what we already have, what
is missing and how to do it:

```bash
npx tsx tools/check-plan.mts plan.json
```

The Monday brief (Claude's weekly draft of the next week's plan) runs this before delivering.
