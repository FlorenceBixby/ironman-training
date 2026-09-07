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
4. Get the readiness numbers. Oura readiness and sleep hours pull automatically via the OAuth connection every morning — check today's `checkins` row in D1 first; if missing, the ring hasn't synced yet, don't chase Burke for it. Ask Burke directly for **Garmin Training Readiness** (manual by design, only worth asking when he wants to report it disagreeing with Oura) and, on Mondays only, **weight** (the weekly Renpho weigh-in — see "Data sources" for why this stays manual).
5. Run the picking logic in `PLAN.md`: readiness color sets the ceiling, the sport furthest behind its weekly minimum with the fewest days left to fit it leads, pick the next item on that sport's menu, fit it to today's actual calendar gap. Give ONE session: what, when (a real gap in the calendar, **never before 6:30am**), how long, intensity target, and the one thing to focus on. Offer a fallback if the day blows up.
6. Append to this week's log: date, readiness numbers, session prescribed, and (once Strava shows it) session done.
7. **Post the session to the site** so Burke sees it at `im.burkeruder.ai`: `POST /api/session` (or `wrangler d1 execute ... --remote`) with `date`, `sport`, `planned_desc`, `planned_time`, `planned_minutes` — the "Orders of the day" card and the week's manifest render straight from `sessions`. When Strava shows it done, `POST /api/session` with the row's `id`, `status: done|modified`, `actual_summary`, `strava_activity_id`.
8. **Append the activity to the ship's log** (`activities` table) once it's on Strava: one `INSERT OR REPLACE` per activity with the Strava summary fields, `avg_hr`/`max_hr` from `get_activity_performance` (stored, not shown), the Open-Meteo weather for that hour, and a synopsis in the same voice as the existing 248 (read a page of `/log` first to match tone — deadpan, specific numbers, weather as a character, no street names, 1–3 sentences). Walks count. Sub-10-minute fragments don't.
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
- **Apple Health webhook, built but not in use** (added 2026-09-06, abandoned by Burke's choice same day): `POST /api/apple-health/pull` exists and is verified working (bearer-token authed, see `worker/apple_health.js`) — it would take resting heart rate and weight pushed from an iOS Shortcuts automation or an app like Health Auto Export. Burke tried both the DIY Shortcuts route and Health Auto Export and found neither worth the setup friction for what it actually bought (resting HR overlaps heavily with what Oura's readiness already captures; weight was only ever a 5-second weekly entry to begin with). Left in place in case he wants to revisit it later, but **nothing currently pushes to it** — don't assume resting HR or weight will show up in `checkins` automatically, and don't prompt Burke to go set it up again unless he brings it up himself.
- **Garmin Training Readiness**: manual, by design — a real Garmin API integration needs a business developer relationship (not a personal token), and the unofficial alternative requires handing an agent Burke's actual Garmin username/password, rejected as a real security tradeoff. Burke reports it in the check-in only when he wants to (e.g. it disagrees with Oura).
- **Renpho** (weight): manual, reported at the Monday weigh-in per the original plan — see the abandoned automation note above for why this stayed manual.
- **Dashboard D1** (`ironman-training-db`, binding `DB` in `wrangler.toml`): the source of truth for logged sessions, check-ins, weekly summaries, and the Oura token (`oura_tokens` table). Schema in `worker/schema.sql`.
- **Ship's log** (`activities` table, rendered at `im.burkeruder.ai/log`, added 2026-09-07 at Burke's ask): every Strava activity since 2024-10-01 (five days before Waco), backfilled from the Strava connector in one pass — 248 rows, Nike Run Club duplicates of Garmin runs and anything under 10 minutes dropped. Each row carries the historical weather at the activity's midpoint (Open-Meteo archive API, hourly, free, no key: `https://archive-api.open-meteo.com/v1/archive?latitude=..&longitude=..&start_date=..&end_date=..&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/Chicago`; home is ~30.085,-97.84) and a 1–3 sentence synopsis in the site's Life Aquatic voice. **Location is coarse by design** — Strava's own `location_summary` (county/city), never coordinates, polylines, or streets. Burke asked for this explicitly. **Heart rate is private.** `avg_hr`/`max_hr` live in the table for building the plan but are never rendered at `/log` or returned by `/api/activities` — keep it that way. Only the Waco run and the 2026-09-05 run are backfilled (Burke: no need to look at HR that far in the past); record HR on new rows as you log them, for your own use.
