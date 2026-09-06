# Full Ironman training — coaching workspace

This folder is the memory for Burke's Ironman coaching sessions. Every session
that coaches should read these files first, then pull live data.

**This repo (`ironman-training`) is the home for all of it.** It used to be a
branch inside `dnd-table` (Sunfield's repo) for one afternoon on 2026-09-06 —
that was wrong, `dnd-table` is a completely different project. Everything
Ironman-related lives here now, including the live dashboard at
`ironman.burkeruder.ai`, which reads from the same D1 database this workspace
writes to.

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

When Burke says "today" (or "plan my day", "what's on", etc.):

1. Read `ATHLETE.md`, `PLAN.md`, and this week's log (create it from the template at the bottom of `PLAN.md` if missing).
2. Pull Strava: last 7 days of activities (`list_activities`), and `get_activity_performance` on anything since the last check-in to see HR and power.
3. Pull his calendar for today and tomorrow (see "Which calendar" below).
4. Ask for (or read from the message) the four readiness numbers: Oura readiness, Oura sleep hours, Garmin Training Readiness, weight if weighed. Missing numbers are fine.
5. Apply the adjustment rules in `PLAN.md` and give ONE session for today with: what, when (a real gap in the calendar, **never before 6:30am**), how long, intensity target, and the one thing to focus on. Offer a fallback if the day blows up.
6. Append to this week's log: date, readiness numbers, session prescribed, and (once Strava shows it) session done.
7. Write the check-in and session to D1 via the dashboard's API (`POST /api/checkin`, `POST /api/session` — see `worker/index.js` in this repo) so the live dashboard stays current. If asked, also put the session on his calendar.

Keep it short. Burke has three kids and two jobs; the answer to "today" should fit on a phone screen.

## Weekly protocol (Sunday evening or Monday morning)

1. Summarize last week from Strava: hours, sessions per sport, longest ride, longest run, swim yards, and how HR trended at easy pace.
2. Compare to the phase target in `PLAN.md`. Adjust next week up or down (never more than +10% hours week over week).
3. Write next week's log file with the seven planned sessions — all at or after 6:30am.
4. Note dry days reported and alcohol trend.

## Which calendar

There is no single obvious calendar for this. Options on the table, pending Burke's answer:
1. His actual primary personal calendar (`burke.ruder@gmail.com`).
2. A new dedicated "Ironman Training" calendar (same account).
3. The existing private "Family Events" calendar (id in `FAMILY_CALENDAR_ID`, same OAuth token).

**Do not default to the TIG calendar** (`burke@theinterestinggroup.com`) — that mixes personal fitness into his business calendar and was only ever a placeholder from a session that had nothing else connected. The working OAuth connection for `burke.ruder@gmail.com` itself lives in the `burke-portfolio` repo at `personal-agents/calendar_agent.py` (see `_get_calendar_service` / `create_event_if_new`) — reuse that pattern, not TIG's.

## Data sources

- **Strava** (connected): activities from the Garmin Forerunner 970 (HR, run power, cadence) and Zwift/Kickr rides (power) once Zwift is linked to Strava. Verified directly against live Strava data on 2026-09-06 — see `ATHLETE.md`.
- **Calendar**: see above — unresolved, ask Burke.
- **Oura, Garmin recovery/readiness, Renpho**: not connected. Burke types them in during the daily check-in. An `OURA_TOKEN` env var would allow curling `https://api.ouraring.com/v2/usercollection/daily_readiness` directly — ask Burke if he wants this later, don't block on it.
- **Dashboard D1** (`ironman-training-db`, binding `DB` in `worker/wrangler.toml`): the source of truth for logged sessions, check-ins, and weekly summaries once this workspace starts writing to it. Schema in `worker/schema.sql`.
