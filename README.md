# ironman-training

Burke Ruder's full-Ironman coaching workspace and live dashboard.

- **Dashboard**: https://im.burkeruder.ai — Cloudflare Worker (`worker/`) reading/writing a D1 database (`ironman-training-db`). (The old `ironman.burkeruder.ai` still works — it 301-redirects here.)
  - `/` — today's orders, this week's manifest, the three routes, waypoints.
  - `/log` — the ship's log: every Strava activity since Waco with weather + a synopsis (`worker/log.js`, D1 `activities`).
  - `/api/dashboard`, `/api/activities` — JSON.
- **Coaching workspace**: `training/` — `README.md` (the "today" protocol), `ATHLETE.md` (who Burke is as an athlete), `PLAN.md` (timelines, weekly template, adjustment rules, alcohol protocol), `log/` (one file per ISO week).

Any coaching session (Claude Code or otherwise) working with Burke on this should read `training/README.md` first.

## Deploy

```
export CLOUDFLARE_API_TOKEN="$CLOUDFLARE_CLAUDE_WRITE"   # from TheInterestingGroup/interesting-group-agents/.env
wrangler d1 execute ironman-training-db --remote --file=worker/schema.sql
wrangler deploy
```

Account id `39c192c934290776b0b406805133fa4b` (same account as `dnd-table` / `burkeruder-ai`).
