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

CREATE TABLE IF NOT EXISTS checkins (
  date TEXT PRIMARY KEY,           -- YYYY-MM-DD
  oura_readiness INTEGER,
  sleep_hours REAL,
  garmin_readiness INTEGER,
  weight REAL,
  drinks INTEGER DEFAULT 0,
  status TEXT,                     -- green | yellow | red
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
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

-- Seed: week 1 (rebuild)
INSERT OR IGNORE INTO weeks (week_id, start_date, end_date, phase, target_hours, alcohol_cap, notes)
VALUES ('2026-W37', '2026-09-07', '2026-09-13', 'Rebuild wk 1', 5.5, 3,
  'Labor Day Monday. Every session moved to 6:30am or later — see PLAN.md.');

INSERT OR IGNORE INTO sessions (date, week_id, sport, planned_desc, planned_time, planned_minutes, status)
VALUES
  ('2026-09-07', '2026-W37', 'swim', '8x50 easy, 4x100, 200 continuous, 4x50 easy (~1100m). First swim since May.', 'any time (holiday)', 30, 'planned'),
  ('2026-09-08', '2026-W37', 'bike', 'Kickr 45 min Z2 on Zwift. Last 10 min comfortably hard.', '6:30-8am or lunch', 45, 'planned'),
  ('2026-09-09', '2026-W37', 'run', 'Easy 40 min. HR cap 150. Walk breaks fine.', 'lunch or 6:30-8am', 40, 'planned'),
  ('2026-09-10', '2026-W37', 'bike', 'Kickr 45 min w/ 3x5min tempo, then 20 min strength.', '6:30-8am or lunch', 65, 'planned'),
  ('2026-09-11', '2026-W37', 'swim', 'Same set as Mon, continuous piece to 250m.', 'lunch', 30, 'planned'),
  ('2026-09-12', '2026-W37', 'bike', 'Long ride 75 min Z2 + 10-15 min brick jog. First brick.', 'late morning (8-10am)', 90, 'planned'),
  ('2026-09-13', '2026-W37', 'run', 'Long run 50 min easy, or rest if the week was rough.', '6:30am', 50, 'planned');

INSERT OR IGNORE INTO milestones (label, target_date, sort_order) VALUES
  ('Register 70.3 Galveston (Apr 4, 2027)', NULL, 1),
  ('Find/confirm an open-water venue for acclimation swims (lake, reservoir, or OW swim group)', '2026-09-27', 2),
  ('Rebuild block complete', '2026-11-15', 3),
  ('70.3-ready on 30 days'' notice (swim 2000m continuous, ride 3hrs, run 10mi in one week)', '2026-12-15', 4),
  ('Decide the specific fall-2027 full (Chattanooga / Florida / Arizona)', '2026-10-15', 5),
  ('IRONMAN 70.3 Texas, Galveston — full-dress rehearsal', '2027-04-04', 6);
