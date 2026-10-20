# Training scheduling — instructions for Bela

Burke is training for an Ironman. His personal coach (Claude, running on his
personal machine) decides **what** he trains each day. You decide **when**,
because you can see his Cloudflare calendar and nothing outside Cloudflare can.

The contract is one-way on purpose: you read the plan, you send back a time.
Never send meeting titles, attendees, or any other work-calendar detail — only
`HH:MM` and a minute count (or a short generic reason when nothing fits).

## 1. Read today's plan

```
GET https://im.burkeruder.ai/api/plan            (today, America/Chicago)
GET https://im.burkeruder.ai/api/plan?date=YYYY-MM-DD
```

No auth. Response:

```json
{
  "date": "2026-10-20",
  "timezone": "America/Chicago",
  "rules": { "earliest_start": "06:30", "latest_end": "22:00", "note": "..." },
  "readiness": { "oura": 88, "drinks": 0 },
  "sessions": [{
    "id": 29,
    "sport": "bike",
    "summary": "Kickr, Zwift Z2 endurance ride, 45 min...",
    "intensity": "easy",
    "ideal_minutes": 45,
    "min_minutes": 30,
    "windows": [
      { "start": "06:30", "end": "08:00", "label": "before work" },
      { "start": "12:00", "end": "13:00", "label": "lunch" },
      { "start": "20:00", "end": "21:30", "label": "after kids bedtime" }
    ],
    "fallback": "If no 30-min slot: 20-min easy spin or a 20-min walk...",
    "status": "planned",
    "scheduled": null
  }]
}
```

The coach usually posts the day's session by ~9:30am CT. If `sessions` is
empty, check again later.

## 2. Pick a slot

For each session where `status` is `planned`:

1. Walk `windows` in order. Find the first stretch of free work-calendar time
   inside a window that fits `ideal_minutes`.
2. If none fits, shrink toward `min_minutes` and try again.
3. **Hard rules:** never start before 06:30, never end after 22:00. Leave
   ~10 minutes after a meeting ends before the session starts (changing,
   getting on the bike).
4. If nothing fits even at `min_minutes`, don't force it — report "no slot"
   (below). The coach will use the `fallback`.

## 3. Send back the time

```
POST https://im.burkeruder.ai/api/session/{id}/schedule
Authorization: Bearer <BELA_SCHEDULE_KEY>
Content-Type: application/json

{ "start": "12:00", "minutes": 45 }
```

or, when nothing fits:

```json
{ "start": null, "reason": "back-to-back meetings all day" }
```

Keep `reason` generic (no meeting names). Responses:

| Status | Meaning |
|---|---|
| 200 `{ok:true, scheduled:{...}}` | Saved. A `warning` field means minutes < `min_minutes`. |
| 401 | Missing/wrong key |
| 400 | `start` isn't `HH:MM` 24h, or minutes outside 10–360 |
| 404 | No such session id |
| 422 | Starts before 06:30 or ends after 22:00 |

Re-posting moves it; the latest call wins. If a meeting lands on top of the
session later in the day, re-run steps 2–3.

Within the hour, the session appears on Burke's **personal** Google calendar as
a timed block (until then it's an all-day reminder). Block the same time on the
work calendar as "Busy" if you want it protected there; that block never leaves
Cloudflare.

## The key

`BELA_SCHEDULE_KEY` can **only** set or clear a session's time. It can't create,
edit or delete training data. Burke gets it from his Mac's Keychain:

```bash
security find-generic-password -a burke -s ironman-bela-key -w
```

Store it in Bela as a secret. Never put it in a prompt or a log. To rotate it,
generate a new value, update the Keychain item, then
`wrangler secret put BELA_SCHEDULE_KEY` in the ironman-training repo.
