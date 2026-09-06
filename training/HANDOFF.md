# Handoff

This repo (`ironman-training`) is the dedicated home for Burke's full-Ironman coaching. Read `README.md` first, then `ATHLETE.md`, `PLAN.md`, and the current week's file under `log/`.

## History
- 2026-09-06: a phone session first built this workspace (athlete profile, three timelines, week 1 plan, an Artifact "Road to 140.6" page) — but built it as a branch inside `dnd-table`, Sunfield's D&D repo, which was wrong. It also scheduled several sessions before 6:30am (5:15am Kickr rides, a run "before 7am"), which Burke does not do — he's up at 5:30 with kids also up by then, and pre-6:30 training doesn't happen in practice.
- 2026-09-06, same day: a dedicated session (this one) verified the Strava numbers directly (Waco splits, Sep 5 HR, FTP estimate — all matched exactly), moved the whole workspace into this standalone repo, fixed every session time to respect the 6:30am floor, and built the live dashboard at `ironman.burkeruder.ai` (Cloudflare Worker + D1, `worker/`). The `dnd-table` branch (`claude/full-ironman-training-rlyifu`) and its Artifact page are superseded — this repo and this dashboard are the source of truth going forward.

## What's live
- Dashboard: `ironman.burkeruder.ai` — reads/writes `ironman-training-db` (D1, binding `DB`). See `worker/wrangler.toml` and `worker/schema.sql`.
- This training workspace, read by every future "today" session per `README.md`'s protocol.

## Open items for Burke
1. Which calendar for training sessions — his primary personal calendar, a new dedicated one, or the existing private Family Events calendar. Do not default to TIG's calendar.
2. Whether to add an `OURA_TOKEN` env var so readiness pulls automatically instead of being typed in each morning.
3. Confirm the subdomain choice (`ironman.burkeruder.ai`) or pick a different one.
4. Decide the specific fall-2027 full (Chattanooga vs. Florida vs. Arizona) by 2026-10-15, and register for 70.3 Galveston (Apr 4, 2027) now.
5. **New, 2026-09-06:** find/confirm a real open-water venue (lake, reservoir, or organized open-water swim group) near Buda/Austin for acclimation swims — the lap pool doesn't cover this, and it's now the actual swim risk (see `PLAN.md`'s "Open-water acclimation" section). Milestone target date 2026-09-27 in D1 is a placeholder guess, not confirmed with Burke.

## History (continued)
- 2026-09-06, later same day: corrected the swim risk analysis after Burke clarified the Waco 70.3 swim split (1:01:45) included a ~20-25 min panic response to his first-ever open water exposure, not clean pace. Backed the panic segment out of the verified totals and got a controlled pace that projects to ~1:38-2:05 for a full 2.4mi swim — comfortably under the 2:20:00 cutoff, versus the prior "at/over cutoff" conclusion built on the raw split. Rewrote `ATHLETE.md` and `PLAN.md`, added an open-water acclimation training component, revised the three-timeline odds, added a D1 milestone for finding an open-water venue, and redeployed the live dashboard. See the git commit for full numbers.
