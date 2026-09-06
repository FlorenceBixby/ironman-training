-- ironman-training-db schema

CREATE TABLE IF NOT EXISTS weeks (
  week_id TEXT PRIMARY KEY,        -- e.g. '2026-W37'
  start_date TEXT NOT NULL,        -- YYYY-MM-DD (Monday)
  end_date TEXT NOT NULL,          -- YYYY-MM-DD (Sunday)
  phase TEXT NOT NULL,             -- e.g. 'Rebuild wk 1'
  target_hours REAL,
  alcohol_cap INTEGER,
  summary_hours REAL,
  summary_swim_m REAL,
  summary_bike_hours REAL,
  summary_run_mi REAL,
  dry_days INTEGER,
  weight REAL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,              -- YYYY-MM-DD
  week_id TEXT REFERENCES weeks(week_id),
  sport TEXT NOT NULL,             -- swim | bike | run | strength | rest
  planned_desc TEXT,
  planned_time TEXT,               -- e.g. 'lunch', '6:30am', 'evening'
  planned_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'planned', -- planned | done | modified | missed
  actual_summary TEXT,
  strava_activity_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- resting_heart_rate was added 2026-09-06 via a live `ALTER TABLE checkins
-- ADD COLUMN resting_heart_rate REAL;` against the already-existing remote
-- table (CREATE TABLE IF NOT EXISTS below is a no-op on a table that already
-- exists, so it can't backfill a new column on its own — this definition is
-- only what a *fresh* install gets). Fed by the Apple Health webhook
-- (worker/apple_health.js), same COALESCE upsert pattern as Oura.
CREATE TABLE IF NOT EXISTS checkins (
  date TEXT PRIMARY KEY,           -- YYYY-MM-DD
  oura_readiness INTEGER,
  sleep_hours REAL,
  garmin_readiness INTEGER,
  weight REAL,
  resting_heart_rate REAL,
  drinks INTEGER DEFAULT 0,
  status TEXT,                     -- green | yellow | red
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL UNIQUE,
  target_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | done
  notes TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Oura OAuth2 tokens. Single-user app: exactly one row, id fixed at 1.
-- refresh_token rotates on every use (Oura issues a new one per refresh and
-- invalidates the old one) — always overwrite both columns together.
CREATE TABLE IF NOT EXISTS oura_tokens (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,     -- unix seconds
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed: week 1 (rebuild). Idempotent on week_id, safe to re-run. The old
-- per-day session seed rows were removed 2026-09-06 when the plan moved to
-- the adaptive weekly-budget model (see PLAN.md) — sessions get added
-- day-by-day by the "today" protocol now, not pre-seeded for the whole
-- week. `sessions` intentionally has no unique constraint (a day can
-- legitimately log more than one entry), so re-running this file will
-- never silently re-add stale pre-planned sessions.
INSERT OR IGNORE INTO weeks (week_id, start_date, end_date, phase, target_hours, alcohol_cap, notes)
VALUES ('2026-W37', '2026-09-07', '2026-09-13', 'Rebuild wk 1', 5.5, 3,
  'Labor Day Monday. Every session moved to 6:30am or later — see PLAN.md.');

-- `label` is UNIQUE, so this stays idempotent across repeated runs (unlike
-- before 2026-09-06, when repeated schema.sql runs silently duplicated
-- every row — that duplication was found and cleaned up live in D1 this
-- session).
INSERT OR IGNORE INTO milestones (label, target_date, sort_order) VALUES
  ('Register 70.3 Galveston (Apr 4, 2027)', NULL, 1),
  ('Find/confirm an open-water venue for acclimation swims (lake, reservoir, or OW swim group)', '2026-09-27', 2),
  ('Rebuild block complete', '2026-11-15', 3),
  ('70.3-ready on 30 days'' notice (swim 2000m continuous, ride 3hrs, run 10mi in one week)', '2026-12-15', 4),
  ('Decide the specific fall-2027 full (Chattanooga / Florida / Arizona)', '2026-10-15', 5),
  ('IRONMAN 70.3 Texas, Galveston — full-dress rehearsal', '2027-04-04', 6);
