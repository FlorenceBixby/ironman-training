# Athlete profile — Burke Ruder

Last updated: 2026-09-06. Strava numbers below were re-pulled and spot-checked live against the Strava API on this date (not just carried over from the prior session) — the Waco splits, the Sep 5 HR data, and the 133W FTP estimate all matched exactly. **Corrected again same day:** the Waco swim analysis originally treated the raw 1:01:45 split as clean pace; Burke clarified it included a ~20–25 min panic response to his first-ever open water, and the race history below now reflects the corrected breakdown.

## Basics
- Age 40 (just turned). Lives in Sunfield, Buda TX (Hays County). Central time.
- Three kids: 6, 4, 18 months. Full-time job (Cloudflare, very flexible, meeting-dense 9am–2pm Tue/Thu) plus side business (TIG, The Interesting Group).
- Equipment: Garmin Forerunner 970, Oura Ring, Wahoo Kickr + 2018 Trek Domane (rides indoors only, "set up perfectly"), Zwift, Renpho scale, neighborhood lap pool, sidewalks for running.
- **Will not train before 6:30am. Ever.** Up at 5:30, kids up 5:30–6am, struggles to go to bed early enough to make pre-6:30 training work, and feels bad doing it. This overrides any "best training window" logic below — do not schedule anything earlier than 6:30am under any circumstance.
- Goal 1: be "70.3-ready on 30 days' notice" as a standing baseline.
- Goal 2: finish a full Ironman (140.6). No race chosen yet.
- Goal 3: severely limit alcohol as part of this. Already reducing.

## Race history
- IRONMAN 70.3 Waco, 2024-10-06. Finished just inside the 8:30 cutoff. (Verified directly against Strava on 2026-09-06.)
  - Swim: 1:01:45 total (course 1931 m; Strava logged 1637 m, GPS under-reads in open water). **Correction, 2026-09-06 (from Burke directly): this raw split is not a clean pace effort.** It was his first time ever in open water. A panic response hit as soon as he entered — heart rate "off the charts" — and for roughly the first 20–25 minutes he essentially couldn't swim, covering only ~0.3–0.4 mi in that stretch. Once his heart rate settled he swam the rest at what he recalls as ~30–40 min/mi.
    - Backing that out against the verified totals (1:01:45 / 1931 m): the panic segment ran at an effective ~50–83 min/mi (moving, but barely). The remaining, controlled segment — ~36.75–41.75 min covering the remaining ~0.8–0.9 mi — works out to a **controlled open-water pace of roughly 41–52 min/mi (2:32–3:15 /100 m), central estimate ~46 min/mi (~2:52 /100 m)**. That's a bit slower than his own recalled "30–40 min/mi," which was likely an optimistic in-the-moment impression; the backed-out figure is grounded in the two hard verified numbers (official time, real course distance) rather than a felt-pace memory, so the plan uses it.
    - Net effect: the raw 1:01:45 split materially understates his real swimming ability — a third of it was a panic freeze, not swimming. See `PLAN.md` for what this changes about the full-distance swim risk (it's a real, positive change — but the swim isn't "solved," see there for why).
  - Bike: not recorded on Strava (no ride activity between the swim and run entries that day).
  - Run: 20.96 km in 2:55:16 moving / 3:09:47 elapsed. ~13:30–14:30 /mi. Avg HR 171, max 187 late in the run.
- RAGBRAI July 2025: four consecutive days of 77 / 46 / 102 / 76 miles outdoors at 13–14 mph. Proves multi-hour bike durability exists when trained.

## Current fitness (as of 2026-09-06, from Strava)
- Running: 13 runs in the last 4 weeks (Aug 6–Sep 5), ~42 miles total (~10.5 mi/week), almost all 3.0–3.5 mi at 10:30–11:00 /mi. One 5.1 mi run on Aug 30 (54 min).
  - HR on these runs is high: Sep 5 lunch run avg 171, max 187 (confirmed via `get_activity_performance`). Runs are at noon–2pm in 95°F. These are threshold efforts, not easy runs.
  - Run power ~305–320 W avg (Garmin). Cadence ~77–79 spm (single-leg count, so ~154–158 total): low, worth raising toward 170+ total.
  - Strava-estimated 5k: ~30:16 (flagged as estimated). Recent actual 5k splits ~32–34 min.
- Cycling: no indoor rides since Sep 2025. Two outdoor rides in Iowa in July 2026 (18–20 mi, 13–14 mph, no power). Strava FTP estimate 133 W (confirmed via `get_athlete_zones`), flagged as estimated and unreliable — no recent power-based ride to base it on.
- Swimming: one 550 m session on 2026-05-26. Nothing since. In Sep 2024 was swimming 730–1875 m sessions at roughly 3:20–4:00 /100 m (wide range — some clearly technique/rest-heavy sessions).
- Strength: sporadic. Dec 2025–Feb 2026 had a decent 2x/week block.
- Weight: not set in Strava. Track via Renpho, report in check-ins.

## Zones (provisional, need testing)
Live Strava zones (age-formula, `MaxHeartRateFromAge` source) are HR1 0–117, HR2 118–146, HR3 147–160, HR4 161–175, HR5 176+. Observed real max HR is 187 (Sep 5 run), so these are too conservative at the top end — treat them as a floor, not gospel, until tested. Until tested, use:
- Easy / Z2 run: HR 130–150. Conversational. This is where 80% of run time goes.
- Tempo: 155–165. Threshold: 165–175. Above 175 is race-finish territory.
- Bike: hold rides at "could talk in full sentences" until an FTP test. Strava's power zones (source `EstimatedFtpFromPower`, FTP 133W) are not trustworthy — no recent power-based ride to derive them from.

Tests to schedule in weeks 2–3 of the rebuild (all at or after 6:30am):
- 20-min FTP test on Zwift (Kickr in ERG off).
- 30-min run LTHR test (avg HR of last 20 min = LTHR).
- 400 m swim time trial.

## Constraints and preferences
- Heat: Aug–Sep runs at midday are the reason HR is so high. Runs move out of 11am–4pm until October — late morning after 6:30am, lunch, or evening (after ~7:30pm once it's cooled some).
- **Training windows, in order of realism**: (1) late morning, 6:30–8am once kids are up and settled — the Kickr lives here now, not at 5am; (2) lunch, 12–1pm on days without a 12:00 meeting — this is already a standing habit (3mi runs, 4x/week); (3) evening, after 8pm bedtime. Nothing before 6:30am, full stop.
- Neighborhood pool hours/season are unverified. If it closes for winter, need a plan B (YMCA Hays, Buda rec center).
- **Open-water access, resolved 2026-09-06 (from Burke directly):** no lake close to home, but three real options — Barton Springs, an Austin open-water swim meetup group, and a buddy on a kayak or a rented boat on an Austin lake. Sequenced in `PLAN.md`'s open-water acclimation section (Barton Springs first, meetup group next, kayak/boat for the longer continuous efforts). Still open: actually booking the first Barton Springs session and finding/joining a specific meetup group — the venue *type* question is resolved, the scheduling isn't.

## Data plumbing status
| Source | Status | Path |
|---|---|---|
| Garmin FR970 | Working | Garmin Connect → Strava. HR, run power, cadence all visible. |
| Zwift / Kickr | Needs check | Zwift → Strava connection. **Ride in Zwift going forward** — old trainer rides recorded via the watch's indoor profile have no power/distance. |
| Oura | Built, pending Burke's client ID/secret | Full OAuth2 at `im.burkeruder.ai/oauth/start` (`worker/oura.js`). Cron pulls readiness + sleep hours daily once connected. See `HANDOFF.md`. |
| Garmin readiness | Not connected, by design | Real API needs a business dev relationship; unofficial route needs Burke's actual Garmin password — rejected as a security tradeoff. Type it in check-in when it disagrees with Oura. |
| Renpho | Not connected, by design | No clean public API. Type weight weekly, or use Renpho's export-by-email into Gmail. |
| Calendar | Resolved | Primary Google calendar (`burke.ruder@gmail.com`, `primary`), synced daily by a GitHub Action in `burke-portfolio` (`personal-agents/training_calendar_sync.py`). See `README.md`. |
| Dashboard D1 | Working | `ironman-training-db`, binding `DB`. Schema in `worker/schema.sql`. |
