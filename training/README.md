# Full Ironman training — coaching workspace

This folder is the memory for Burke's Ironman coaching sessions. Every session
that coaches should read these files first, then pull live data.

**This repo (`ironman-training`) is the home for all of it.** It used to be a
branch inside `dnd-table` (Sunfield's repo) for one afternoon on 2026-09-06 —
that was wrong, `dnd-table` is a completely different project. Everything
Ironman-related lives here now, including the live dashboard at
`im.burkeruder.ai` (the old `ironman.burkeruder.ai` still resolves — the
worker 301-redirects it), which reads from the same D1 database this
workspace writes to.

## Standing rule: no workouts before 6:30am. Ever.

Burke is up at 5:30 most days and his kids are usually up 5:30–6am. He will
not train before 6:30am — it doesn't happen, and forcing it into a plan just
produces a plan he ignores. Every session in `PLAN.md` and every week's log
must be scheduled at 6:30am or later: late morning once kids are settled,
lunch (he already runs 3 miles at lunch on workdays — that slot works),
or evening. This is a hard constraint, not a preference, and it applies to
every future week, not just the ones already written.

## Files

| File | What it is |
|---|---|
| `ATHLETE.md` | Who Burke is as an athlete: history, current fitness, zones, constraints, data sources. Update when something durable changes (new test result, new race registered, injury). |
| `PLAN.md` | The macro plan: goal, timelines, phases, weekly template, adjustment rules, alcohol protocol. |
| `log/YYYY-Www.md` | One file per ISO week: the planned sessions, what actually happened, and the readiness numbers Burke reported. |

## Daily protocol ("today")

**As of 2026-09-06 the plan is adaptive, not a fixed weekly grid — see `PLAN.md`'s "How the plan actually works now."** There is no pre-written Monday–Sunday schedule to read a session off of; every day's session is computed fresh from that week's budget, what's been done so far, and today's actual readiness and calendar.

When Burke says "today" (or "plan my day", "what's on", etc.):

1. Read `ATHLETE.md`, `PLAN.md` (especially "How the plan actually works now"), and this week's log (create it from the template at the bottom of `PLAN.md` if missing, using this week's phase budget).
2. Pull Strava: last 7 days of activities (`list_activities`), and `get_activity_performance` on anything since the last check-in to see HR and power. Use this to see what's actually been done against the week's budget so far.
3. Pull his calendar for today and tomorrow (his primary Google calendar, `burke.ruder@gmail.com` — see "Which calendar" below).
4. Get the readiness numbers. Oura readiness, sleep hours, resting heart rate, and weight all pull automatically — Oura via the OAuth connection every morning, and resting HR / sleep / weight (Renpho, via Apple Health) via a daily iOS Shortcuts automation on Burke's phone (see "Data sources" below). Check today's `checkins` row in D1 first; only ask Burke directly for **Garmin Training Readiness** — that one number is Garmin-exclusive and does not sync to Apple Health, so it's the only readiness input still manual, and only worth asking about when he wants to report it (e.g. it disagrees with Oura). If Oura or the Apple Health data is missing, it means the ring/phone automation hasn't synced yet, not that you should chase Burke for numbers that should already be automatic.
5. Run the picking logic in `PLAN.md`: readiness color sets the ceiling, the sport furthest behind its weekly minimum with the fewest days left to fit it leads, pick the next item on that sport's menu, fit it to today's actual calendar gap. Give ONE session: what, when (a real gap in the calendar, **never before 6:30am**), how long, intensity target, and the one thing to focus on. Offer a fallback if the day blows up.
6. Append to this week's log: date, readiness numbers, session prescribed, and (once Strava shows it) session done.
7. Write the check-in and session to D1 via the dashboard's API (`POST /api/checkin`, `POST /api/session` — see `worker/index.js` in this repo) so the live dashboard stays current. Calendar sync is automatic (see below) — no need to ask or do it by hand.

Keep it short. Burke has three kids and two jobs; the answer to "today" should fit on a phone screen.

## Weekly protocol (Sunday evening or Monday morning)

1. Summarize last week from Strava: hours, sessions per sport, longest ride, longest run, swim yards, and how HR trended at easy pace.
2. Compare to the phase target in `PLAN.md`. Set next week's **budget** (total hours + per-sport minimums — never more than +10% hours over last week's *actual* completed hours, not planned). This is a budget for the daily protocol to draw from, not seven pre-assigned sessions.
3. Start next week's log file (template at the bottom of `PLAN.md`) with that budget line and an empty daily table — the daily protocol fills each row in as the week happens.
4. Note dry days reported and alcohol trend. Flag any two-week pattern of a missed high-value session (per `PLAN.md`'s absorption rules) as something worth an actual conversation.

## Which calendar

**Resolved 2026-09-06: Burke's actual primary personal calendar** (`burke.ruder@gmail.com`, the account's `primary` calendar — not a new dedicated calendar, and not the private "Family Events" calendar used for kid/family events). Do not default to the TIG calendar (`burke@theinterestinggroup.com`) — that mixes personal fitness into his business calendar.

**How it's wired:** the `burke-portfolio` repo (`personal-agents/calendar_agent.py`, `_get_calendar_service`) already has a working Calendar-scoped OAuth token for `burke.ruder@gmail.com` (client credentials + refresh token stored as GitHub Actions secrets `GMAIL_CREDENTIALS_PERSONAL` / `GMAIL_TOKEN_PERSONAL` on that repo — see its `.github/workflows/personal-mailbox-manager.yml` for the pattern). A daily scheduled GitHub Action in that repo (`personal-agents/training_calendar_sync.py`, workflow `.github/workflows/training-calendar-sync.yml`) reuses that same token, reads today's session from this dashboard's public `GET /api/dashboard` endpoint, and creates the event on the `primary` calendar (deduplicated by date via the same `extendedProperties.private.source_msg_id` pattern `calendar_agent.py` already uses for the Family Events sync) — so this workspace's Worker never needs its own separate Google OAuth app. Runs after the "today" session for a given day is expected to already be in D1 (mid-morning CT).

## Data sources

- **Strava** (connected): activities from the Garmin Forerunner 970 (HR, run power, cadence) and Zwift/Kickr rides (power) once Zwift is linked to Strava. Verified directly against live Strava data on 2026-09-06 — see `ATHLETE.md`.
- **Calendar**: see above. Resolved and automated.
- **Oura** (connected as of the OAuth setup on 2026-09-06): full OAuth2 connection at `im.burkeruder.ai/oauth/start` (see `worker/oura.js`). A Cloudflare cron trigger pulls readiness score and sleep hours automatically every morning (~7:30am CT) into that day's `checkins` row — no more typing Oura numbers into the daily check-in by hand. If a check-in is missing Oura data, it means the ring hasn't synced yet or the connection needs re-authorizing at `/oauth/start`.
- **Apple Health webhook** (added 2026-09-06): Garmin and Renpho both already sync into Apple Health on Burke's phone. Apple Health itself has no cloud API, so a daily iOS Shortcuts "Personal Automation" running on his phone reads resting heart rate, sleep, and weight (Renpho's Body Mass) out of HealthKit and pushes them to `POST /api/apple-health/pull` (bearer-token authed, see `worker/apple_health.js`), which upserts into that day's `checkins` row using the same COALESCE pattern as the Oura pull — a partial payload never nulls out a field another source already wrote. **This does not and cannot carry Garmin's actual Training Readiness score** — HRV Status, Body Battery, stress score, VO2max, and Training Load are all Garmin-exclusive and never sync to Apple Health, by Garmin's own design. If resting HR / sleep / weight are missing from a check-in, it means the phone automation hasn't run yet (or Burke's phone was off/asleep at the trigger time), not that those numbers need to be asked for by hand.
- **Garmin Training Readiness**: still manual, by design, and now the *only* manual readiness input. A real Garmin API integration needs a business developer relationship (not a personal token); the unofficial alternative requires handing an agent Burke's actual Garmin username/password, which was assessed and rejected as a real security tradeoff. Burke reports it in the check-in only when he wants to (e.g. it disagrees with Oura).
- **Renpho** (weight): automated as of 2026-09-06 via the Apple Health webhook above — Renpho syncs weight (Body Mass) to Apple Health on its own, no manual weigh-in entry needed anymore.
- **Dashboard D1** (`ironman-training-db`, binding `DB` in `worker/wrangler.toml`): the source of truth for logged sessions, check-ins, weekly summaries, and the Oura token (`oura_tokens` table). Schema in `worker/schema.sql`.
