// ironman-training worker — serves the Road to 140.6 dashboard and its API.

import { renderDashboard } from "./dashboard.js";
import { renderLog } from "./log.js";
import { renderZwiftIndex, zwiftFile } from "./zwift.js";
import { renderPrivacyPage, renderTermsPage, renderOuraConnectedPage } from "./pages.js";
import {
  buildAuthorizeUrl,
  exchangeCode,
  saveTokens,
  ouraRedirectUri,
  fetchDailyReadinessAndSleep,
} from "./oura.js";
import { isAuthorizedAppleHealthRequest, upsertAppleHealthCheckin } from "./apple_health.js";

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json", ...(init.headers || {}) },
    status: init.status || 200,
  });
}

// "Today" in Burke's timezone. new Date().toISOString() is UTC, which is
// already tomorrow after 7pm CT — wrong day for "today's orders" and for the
// Oura upsert alike.
// Write auth (added 2026-10-20). Every POST that changes D1 needs a key:
//   TRAINING_WRITE_KEY  full write (Claude coaching sessions)
//   BELA_SCHEDULE_KEY   can ONLY set/clear a session's scheduled time
// Sent as "Authorization: Bearer <key>". Reads stay public.
function bearer(request) {
  const h = request.headers.get("Authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}
function timingSafeEq(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function canWrite(request, env) {
  return timingSafeEq(bearer(request), env.TRAINING_WRITE_KEY || "");
}
function canSchedule(request, env) {
  const k = bearer(request);
  return timingSafeEq(k, env.BELA_SCHEDULE_KEY || "") || timingSafeEq(k, env.TRAINING_WRITE_KEY || "");
}
const UNAUTHORIZED = () => json({ ok: false, error: "unauthorized" }, { status: 401 });

// The planner never schedules before this, and Bela may not either.
const EARLIEST = "06:30";
const LATEST_END = "22:00";
const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const isHHMM = (v) => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

function parseJSON(v, fallback) {
  try { return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}

// Shape one session row for the Bela plan feed.
function planSession(s) {
  return {
    id: s.id,
    date: s.date,
    sport: s.sport,
    summary: s.planned_desc,
    intensity: s.intensity,
    ideal_minutes: s.planned_minutes,
    min_minutes: s.min_minutes ?? s.planned_minutes,
    windows: parseJSON(s.windows, []),
    fallback: s.fallback,
    status: s.status,
    scheduled: s.scheduled_start
      ? { start: s.scheduled_start, minutes: s.scheduled_minutes, by: s.scheduled_by, at: s.scheduled_at }
      : null,
    unscheduled_reason: s.unscheduled_reason,
  };
}

function todayCT() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isoWeek(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const target = new Date(d.valueOf());
  const dayNr = (d.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const weekNumber =
    1 +
    Math.round(
      ((target - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7
    );
  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

async function getDashboardData(env) {
  const today = todayCT();
  const currentWeekId = isoWeek(today);

  const week = await env.DB.prepare("SELECT * FROM weeks WHERE week_id = ?")
    .bind(currentWeekId)
    .first();

  // Fall back to the latest known week if we're outside logged range.
  const fallbackWeek = week
    ? null
    : await env.DB.prepare("SELECT * FROM weeks ORDER BY start_date DESC LIMIT 1").first();

  const activeWeek = week || fallbackWeek;

  const sessions = activeWeek
    ? (
        await env.DB.prepare("SELECT * FROM sessions WHERE week_id = ? ORDER BY date ASC")
          .bind(activeWeek.week_id)
          .all()
      ).results
    : [];

  const recentCheckins = (
    await env.DB.prepare("SELECT * FROM checkins ORDER BY date DESC LIMIT 14").all()
  ).results;

  const milestones = (
    await env.DB.prepare("SELECT * FROM milestones ORDER BY sort_order ASC").all()
  ).results;

  const weekCount = (await env.DB.prepare("SELECT COUNT(*) as c FROM weeks").first()).c;

  const dryDaysLast14 = recentCheckins.filter((c) => (c.drinks || 0) === 0).length;

  // Today's prescribed session(s) may sit outside the active week's rows if
  // we're on a fallback week, so query by date rather than filtering above.
  const todaySessions = (
    await env.DB.prepare("SELECT * FROM sessions WHERE date = ? ORDER BY id ASC").bind(today).all()
  ).results;
  const todayCheckin = recentCheckins.find((c) => c.date === today) || null;
  const activityCount = (await env.DB.prepare("SELECT COUNT(*) as c FROM activities").first()).c;

  return {
    today,
    activeWeek,
    sessions,
    todaySessions,
    todayCheckin,
    activityCount,
    recentCheckins,
    milestones,
    weekCount,
    dryDaysLast14,
  };
}

// Upserts today's Oura readiness/sleep into checkins without clobbering
// other fields (garmin_readiness, weight, drinks, status, notes) that the
// daily "today" check-in may have already written, or will write later.
async function upsertOuraReadiness(env, date, readinessScore, sleepHours) {
  await env.DB.prepare(
    `INSERT INTO checkins (date, oura_readiness, sleep_hours)
     VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       oura_readiness = COALESCE(excluded.oura_readiness, checkins.oura_readiness),
       sleep_hours = COALESCE(excluded.sleep_hours, checkins.sleep_hours)`
  )
    .bind(date, readinessScore ?? null, sleepHours ?? null)
    .run();
}

async function pullOuraForToday(env) {
  const today = todayCT();
  const data = await fetchDailyReadinessAndSleep(env, today);
  if (!data) return { ok: false, reason: "not connected" };
  if (data.readinessScore === null && data.sleepHours === null) {
    return { ok: false, reason: "no data yet" };
  }
  await upsertOuraReadiness(env, today, data.readinessScore, data.sleepHours);
  return { ok: true, ...data };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    // The old ironman.burkeruder.ai subdomain redirects permanently to the
    // new one instead of serving a second live copy.
    if (url.hostname === "ironman.burkeruder.ai") {
      const dest = new URL(request.url);
      dest.hostname = "im.burkeruder.ai";
      return Response.redirect(dest.toString(), 301);
    }

    try {
      if (pathname === "/privacy") {
        return new Response(renderPrivacyPage(), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      if (pathname === "/terms") {
        return new Response(renderTermsPage(), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      if (pathname === "/oauth/start") {
        if (!env.OURA_CLIENT_ID) {
          return new Response(
            "Oura isn't configured yet — OURA_CLIENT_ID / OURA_CLIENT_SECRET secrets are missing.",
            { status: 500 }
          );
        }
        const redirectUri = ouraRedirectUri(url);
        const state = crypto.randomUUID();
        const authorizeUrl = buildAuthorizeUrl(env, redirectUri, state);
        return Response.redirect(authorizeUrl, 302);
      }

      if (pathname === "/oauth/callback") {
        const code = url.searchParams.get("code");
        const errorParam = url.searchParams.get("error");
        if (errorParam) {
          return new Response(renderOuraConnectedPage(false, `Oura returned an error: ${errorParam}`), {
            status: 400,
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        }
        if (!code) {
          return new Response(renderOuraConnectedPage(false, "No authorization code in the callback."), {
            status: 400,
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        }
        try {
          const redirectUri = ouraRedirectUri(url);
          const tokens = await exchangeCode(env, code, redirectUri);
          await saveTokens(env, tokens);
          return new Response(
            renderOuraConnectedPage(true, "Oura is connected. Readiness and sleep will pull in automatically each morning."),
            { headers: { "content-type": "text/html; charset=utf-8" } }
          );
        } catch (err) {
          return new Response(
            renderOuraConnectedPage(false, String(err && err.message ? err.message : err)),
            { status: 500, headers: { "content-type": "text/html; charset=utf-8" } }
          );
        }
      }

      if (pathname === "/api/oura/pull" && request.method === "POST") {
        if (!canWrite(request, env)) return UNAUTHORIZED();
        // Manual trigger, mainly for testing — the scheduled handler does
        // this automatically every morning.
        const result = await pullOuraForToday(env);
        return json(result);
      }

      if (pathname === "/api/apple-health/pull" && request.method === "POST") {
        // Pushed to by an iOS Shortcuts personal automation on Burke's phone
        // (see worker/apple_health.js — Apple Health has no cloud API, so
        // this is push not pull, despite the URL matching the /oura/pull
        // naming convention). Body: { date, resting_heart_rate?, sleep_hours?,
        // weight_lbs? }. date defaults to today (UTC) if omitted.
        if (!isAuthorizedAppleHealthRequest(request, env)) {
          return json({ ok: false, error: "unauthorized" }, { status: 401 });
        }

        let body;
        try {
          body = await request.json();
        } catch {
          return json({ ok: false, error: "invalid JSON body" }, { status: 400 });
        }

        const date = body.date || new Date().toISOString().slice(0, 10);
        const { resting_heart_rate, sleep_hours, weight_lbs } = body;

        if (
          resting_heart_rate === undefined &&
          sleep_hours === undefined &&
          weight_lbs === undefined
        ) {
          return json(
            { ok: false, error: "at least one of resting_heart_rate, sleep_hours, weight_lbs is required" },
            { status: 400 }
          );
        }

        await upsertAppleHealthCheckin(env, date, {
          resting_heart_rate: resting_heart_rate ?? null,
          sleep_hours: sleep_hours ?? null,
          weight: weight_lbs ?? null,
        });

        return json({ ok: true, date, resting_heart_rate, sleep_hours, weight_lbs });
      }

      if (pathname === "/" || pathname === "/index.html") {
        const data = await getDashboardData(env);
        return new Response(renderDashboard(data), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      if (pathname === "/zwift" || pathname === "/zwift/") {
        return new Response(renderZwiftIndex(), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      if (pathname.startsWith("/zwift/") && pathname.endsWith(".zwo")) {
        const slug = pathname.slice("/zwift/".length, -".zwo".length);
        const res = zwiftFile(slug);
        return res || new Response("No such workout", { status: 404 });
      }

      if (pathname === "/log") {
        const activities = (
          await env.DB.prepare("SELECT * FROM activities ORDER BY start_local DESC").all()
        ).results;
        return new Response(renderLog(activities), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      // Public JSON mirror of /log. Heart rate columns are deliberately not
      // selected — they stay in D1 for coaching only.
      if (pathname === "/api/activities" && request.method === "GET") {
        const activities = (
          await env.DB.prepare(
            `SELECT strava_id, start_local, date, sport, strava_type, name, locale, indoor,
                    distance_m, moving_s, elapsed_s, elevation_m, avg_cadence, calories,
                    relative_effort, pace, wx_temp_f, wx_feels_f, wx_humidity, wx_wind_mph,
                    wx_precip_mm, wx_sky, synopsis
             FROM activities ORDER BY start_local DESC`
          ).all()
        ).results;
        return json({ count: activities.length, activities });
      }

      if (pathname === "/api/dashboard" && request.method === "GET") {
        const data = await getDashboardData(env);
        return json(data);
      }

      // Bela feed: what today's (or ?date=) training needs, in a shape a
      // scheduler can fit around a calendar it can see and we can't.
      if ((pathname === "/api/plan" || pathname === "/api/plan/today") && request.method === "GET") {
        const date = url.searchParams.get("date") || todayCT();
        const rows = (await env.DB.prepare("SELECT * FROM sessions WHERE date = ? ORDER BY id ASC").bind(date).all()).results;
        const checkin = await env.DB.prepare("SELECT oura_readiness, drinks FROM checkins WHERE date = ?").bind(date).first();
        return json({
          date,
          timezone: "America/Chicago",
          rules: {
            earliest_start: EARLIEST,
            latest_end: LATEST_END,
            note: "Never schedule before 06:30. Prefer the first window that fits ideal_minutes; shrink toward min_minutes before giving up. If nothing fits, POST start:null with a reason.",
          },
          readiness: checkin ? { oura: checkin.oura_readiness, drinks: checkin.drinks } : null,
          sessions: rows.map(planSession),
          schedule_endpoint: "POST /api/session/{id}/schedule  {start:'HH:MM', minutes:int} or {start:null, reason:'...'}  Authorization: Bearer <BELA_SCHEDULE_KEY>",
        });
      }

      const sched = pathname.match(/^\/api\/session\/(\d+)\/schedule$/);
      if (sched && request.method === "POST") {
        if (!canSchedule(request, env)) return UNAUTHORIZED();
        const id = Number(sched[1]);
        const row = await env.DB.prepare("SELECT * FROM sessions WHERE id = ?").bind(id).first();
        if (!row) return json({ ok: false, error: "no such session" }, { status: 404 });
        const body = await request.json().catch(() => ({}));
        const by = body.by || (timingSafeEq(bearer(request), env.BELA_SCHEDULE_KEY || "") ? "bela" : "coach");

        if (body.start === null) {
          await env.DB.prepare(
            `UPDATE sessions SET scheduled_start = NULL, scheduled_minutes = NULL, scheduled_by = ?, scheduled_at = datetime('now'), unscheduled_reason = ? WHERE id = ?`
          ).bind(by, String(body.reason || "no slot").slice(0, 200), id).run();
          return json({ ok: true, id, scheduled: null });
        }
        if (!isHHMM(body.start)) return json({ ok: false, error: "start must be HH:MM (24h, America/Chicago) or null" }, { status: 400 });
        const minutes = Number.isInteger(body.minutes) ? body.minutes : row.planned_minutes;
        if (!minutes || minutes < 10 || minutes > 360) return json({ ok: false, error: "minutes must be 10-360" }, { status: 400 });
        if (toMin(body.start) < toMin(EARLIEST)) return json({ ok: false, error: `nothing before ${EARLIEST}` }, { status: 422 });
        if (toMin(body.start) + minutes > toMin(LATEST_END)) return json({ ok: false, error: `must end by ${LATEST_END}` }, { status: 422 });

        const label = `${body.start}, ${minutes} min`;
        await env.DB.prepare(
          `UPDATE sessions SET scheduled_start = ?, scheduled_minutes = ?, scheduled_by = ?, scheduled_at = datetime('now'),
             unscheduled_reason = NULL, planned_time = ? WHERE id = ?`
        ).bind(body.start, minutes, by, label, id).run();
        const warn = row.min_minutes && minutes < row.min_minutes ? `shorter than min_minutes (${row.min_minutes})` : undefined;
        return json({ ok: true, id, scheduled: { start: body.start, minutes, by }, warning: warn });
      }

      if (pathname === "/api/checkin" && request.method === "POST") {
        if (!canWrite(request, env)) return UNAUTHORIZED();
        const body = await request.json();
        const {
          date,
          oura_readiness,
          sleep_hours,
          garmin_readiness,
          weight,
          drinks = 0,
          status,
          notes,
        } = body;
        if (!date) return json({ error: "date is required (YYYY-MM-DD)" }, { status: 400 });

        await env.DB.prepare(
          `INSERT INTO checkins (date, oura_readiness, sleep_hours, garmin_readiness, weight, drinks, status, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(date) DO UPDATE SET
             oura_readiness = excluded.oura_readiness,
             sleep_hours = excluded.sleep_hours,
             garmin_readiness = excluded.garmin_readiness,
             weight = excluded.weight,
             drinks = excluded.drinks,
             status = excluded.status,
             notes = excluded.notes`
        )
          .bind(
            date,
            oura_readiness ?? null,
            sleep_hours ?? null,
            garmin_readiness ?? null,
            weight ?? null,
            drinks,
            status ?? null,
            notes ?? null
          )
          .run();

        return json({ ok: true });
      }

      if (pathname === "/api/session" && request.method === "POST") {
        if (!canWrite(request, env)) return UNAUTHORIZED();
        const body = await request.json();
        const {
          id,
          date,
          week_id,
          sport,
          planned_desc,
          planned_time,
          planned_minutes,
          status,
          actual_summary,
          strava_activity_id,
          notes,
          min_minutes,
          windows,
          intensity,
          fallback,
        } = body;

        if (id) {
          await env.DB.prepare(
            `UPDATE sessions SET status = ?, actual_summary = ?, strava_activity_id = ?, notes = ? WHERE id = ?`
          )
            .bind(status ?? "done", actual_summary ?? null, strava_activity_id ?? null, notes ?? null, id)
            .run();
          return json({ ok: true, id });
        }

        if (!date || !sport) return json({ error: "date and sport are required" }, { status: 400 });
        const wk = week_id || isoWeek(date);

        const result = await env.DB.prepare(
          `INSERT INTO sessions (date, week_id, sport, planned_desc, planned_time, planned_minutes, status, actual_summary, strava_activity_id, notes,
                                 min_minutes, windows, intensity, fallback)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            date,
            wk,
            sport,
            planned_desc ?? null,
            planned_time ?? null,
            planned_minutes ?? null,
            status ?? "planned",
            actual_summary ?? null,
            strava_activity_id ?? null,
            notes ?? null,
            min_minutes ?? null,
            windows ? JSON.stringify(windows) : null,
            intensity ?? null,
            fallback ?? null
          )
          .run();

        return json({ ok: true, id: result.meta.last_row_id });
      }

      if (pathname === "/api/week" && request.method === "POST") {
        if (!canWrite(request, env)) return UNAUTHORIZED();
        const body = await request.json();
        const { week_id, start_date, end_date, phase, target_hours, alcohol_cap, notes } = body;
        if (!week_id || !start_date || !end_date || !phase)
          return json({ error: "week_id, start_date, end_date, phase are required" }, { status: 400 });

        await env.DB.prepare(
          `INSERT INTO weeks (week_id, start_date, end_date, phase, target_hours, alcohol_cap, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(week_id) DO UPDATE SET
             phase = excluded.phase, target_hours = excluded.target_hours,
             alcohol_cap = excluded.alcohol_cap, notes = excluded.notes`
        )
          .bind(week_id, start_date, end_date, phase, target_hours ?? null, alcohol_cap ?? null, notes ?? null)
          .run();

        return json({ ok: true });
      }

      return new Response("Not found", { status: 404 });
    } catch (err) {
      return json({ error: String(err && err.message ? err.message : err) }, { status: 500 });
    }
  },

  // Cron trigger (wrangler.toml [triggers]) — pulls today's Oura readiness
  // and sleep automatically each morning, replacing the manual "tell me your
  // Oura numbers" step in the daily check-in. No-ops quietly if Oura isn't
  // connected yet (env has no OURA_CLIENT_ID, or the token row doesn't exist).
  async scheduled(event, env, ctx) {
    if (!env.OURA_CLIENT_ID) return;
    try {
      await pullOuraForToday(env);
    } catch (err) {
      console.error("Oura scheduled pull failed:", err && err.message ? err.message : err);
    }
  },
};
