# Handoff

This repo (`ironman-training`) is the dedicated home for Burke's full-Ironman coaching. Read `README.md` first, then `ATHLETE.md`, `PLAN.md`, and the current week's file under `log/`.

## What's live right now (2026-09-07)

- **Dashboard**: `im.burkeruder.ai` (Cloudflare Worker + D1, `ironman-training-db`, binding `DB`). `ironman.burkeruder.ai` still resolves but 301-redirects here. See `worker/wrangler.toml`, `worker/schema.sql`.
- **Oura**: fully connected and verified pulling real data (readiness score 70 confirmed via a live manual pull on 2026-09-06). OAuth2 at `/oauth/start` → `/oauth/callback`, tokens in D1 `oura_tokens`, daily cron `30 12 * * *` (~7:30am CT) auto-pulls readiness + sleep. Nothing left to do here.
- **Calendar**: training sessions sync daily to Burke's real primary Google calendar (`burke.ruder@gmail.com`), via `burke-portfolio/personal-agents/training_calendar_sync.py` + `.github/workflows/training-calendar-sync.yml` (~9:30am CT), reusing the existing personal Calendar OAuth token from that repo.
- **Projects page**: `burkeruder.ai/projects` — "Exhibit Golf," titled "The Belafonte," links to `im.burkeruder.ai`.
- **Plan**: adaptive weekly-budget model (not a fixed Mon–Sun table) — see `PLAN.md`'s "How the plan actually works now." Swim risk was corrected 2026-09-06 (the Waco 70.3 split included a ~20-25 min first-time-open-water panic response, not clean pace — backed-out controlled pace projects comfortably under the full-distance cutoff; see `PLAN.md`).
- **Open-water venue**: Burke has three real options — Barton Springs, an Austin open-water swim meetup group, and a buddy on a kayak/rented boat — sequenced into the acclimation plan (`PLAN.md`). Options are resolved; specific dates/group are not yet locked in.

## Added 2026-09-07 (after the handoff above was written) — what the site does now

- **`/log` — the ship's log** (`worker/log.js`, D1 `activities`, 248 rows back to 2024-10-01). Burke asked for "a training log that shows all of my workouts that you pull from strava" with "a wes anderson type synopsis of them. weather, distance, etc but not location exact like my streets I run." Done and live. Weather is Open-Meteo archive data at the activity's midpoint; location is Strava's county/city string only. Going forward, the daily "today" protocol appends new rows (see `training/README.md` steps 7–8) — there is no cron for this and shouldn't be, the synopsis needs a writer.
- **`/` now shows "Orders of the day" and "This week's manifest"** straight from D1 `sessions`, plus a readiness color from today's Oura score. Burke asked "where will I see the activity I need to be doing for the day/week?" — this is the answer. **W37's seven sessions were seeded into `sessions` from `log/2026-W37.md` on 2026-09-07** (all `status: planned`) so the page wasn't empty on day one; from here, keep `sessions` current daily via `POST /api/session` or `wrangler d1 execute`, and mark rows done/modified/missed as the week unfolds. If a day's orders change from what's seeded, update the row — the site is what he reads.
- `worker/theme.js` holds the shared palette/type/shell for both pages. `todayCT()` in `index.js` computes "today" in America/Chicago (UTC was rolling the day over at 7pm CT).
- Today (Mon 2026-09-07): Oura readiness 73 → yellow. Seeded orders: swim 30 min easy, any time. Nothing logged yet as of this note.

## Active, unresolved thread as of right now — read this carefully before doing anything else

**Apple Health / Garmin / Renpho automation has been a back-and-forth across this whole session — don't re-litigate it, just pick up where it actually is:**

1. Built a webhook (`POST /api/apple-health/pull`, `worker/apple_health.js`, bearer-token auth via Worker secret `APPLE_HEALTH_WEBHOOK_TOKEN`) for an iOS Shortcuts automation to push resting heart rate + weight (Renpho, via Apple Health) into `checkins`. Verified working end-to-end with a manual test payload.
2. Burke tried building the iOS Shortcut himself, found it too fiddly, and separately tried an app called **Health Auto Export**. At that point he abandoned the whole idea — I corrected `README.md`/`PLAN.md` to state plainly that nothing is automated here, Garmin's Training Readiness and weight are both manual, and told him nobody would bring this up again unless he did.
3. **He then changed his mind and is actively mid-setup on Health Auto Export's free plan right now.** He configured a REST API destination pointed at the webhook above. Two things are genuinely unresolved:
   - **Whether the free plan actually supports scheduled/automatic REST API export**, or only a manual "export now" — unconfirmed. If it's paywalled, that needs a real decision from Burke (pay, or actually abandon this time), not another workaround attempt assumed on his behalf.
   - **Whether Health Auto Export's actual JSON payload shape matches what `/api/apple-health/pull` expects** (`{date?, resting_heart_rate?, sleep_hours?, weight_lbs?}`). This was never confirmed against real documentation (it wouldn't load cleanly for me) — the plan was to have Burke trigger one real test send and check what actually lands in D1 (`SELECT * FROM checkins ORDER BY created_at DESC LIMIT 5`) or, if it lands as a 400/failed request, that tells you the field names don't match and the endpoint needs to be adapted to whatever Health Auto Export actually sends, not the other way around.
   - Last concrete action: Burke tapped a button in the app and asked "does it work now" — I checked D1, saw no new row, and asked what the app actually displayed (success/error/nothing) to figure out whether the request never fired or fired and got rejected. **That question was never answered before this handoff.** Start there — ask Burke what happened, or check D1 yourself first since a row may have landed since.
4. **If a test payload does land**, verify its actual shape (even if the 400-error path is what reveals it — Cloudflare Worker logs or a temporary looser endpoint that just logs whatever it receives would tell you fast), adjust `worker/apple_health.js`'s field parsing to match reality, redeploy, retest, then update `README.md`/`PLAN.md` back to "automated" — but only once actually verified working, the same way Oura was.
5. **If it turns out free-plan scheduling isn't available or the payload can't be reasonably matched**, don't keep pushing on your own judgment — this has already flip-flopped twice; surface the real tradeoff (cost, or just drop it) and let Burke decide, then update the docs to match whatever's actually decided and stop there.

Whatever the outcome, resting heart rate and weight are genuinely low-stakes data — don't let this eat a disproportionate amount of a session. Oura already carries the main readiness signal.

## Open items for Burke (unchanged, still real)

1. **Decide the specific fall-2027 full** (Chattanooga vs. Florida vs. Arizona) by 2026-10-15, and register for 70.3 Galveston (Apr 4, 2027) now regardless.
2. **Lock down open-water dates**: book the first Barton Springs session, find and join a specific Austin open-water meetup group. D1 milestone target 2026-09-27 is a placeholder — confirm or move it.

## History

- 2026-09-06: a phone session first built this workspace but as a branch inside `dnd-table` (Sunfield's repo, wrong), with several sessions scheduled before 6:30am (Burke doesn't train that early — up at 5:30 with kids also up by then).
- 2026-09-06: moved into this standalone repo, verified Strava data directly, fixed all session times to the 6:30am floor, built the live dashboard.
- 2026-09-06: corrected the swim risk analysis after Burke clarified the Waco split included a real panic response, not clean pace — see `PLAN.md` for the full numbers.
- 2026-09-06: calendar resolved to Burke's real primary Gmail calendar, subdomain renamed to `im.burkeruder.ai`, Oura OAuth2 built end-to-end, plan rewritten around an adaptive weekly budget instead of a fixed schedule.
- 2026-09-06, later: Oura fully verified live (real readiness score pulled). Open-water venue options resolved directly by Burke (Barton Springs / meetup group / kayak-boat) and sequenced into the plan.
- 2026-09-06/07: Apple Health webhook built and verified → Burke found both the Shortcuts and app-based setup too much friction, automation abandoned, docs corrected to reflect manual-only → Burke reconsidered and is now actively (as of this handoff) setting up Health Auto Export's free plan against the same webhook. **See "Active, unresolved thread" above — this is exactly where the next session picks up.**
