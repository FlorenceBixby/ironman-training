// ironman-training worker — serves the Road to 140.6 dashboard and its API.

import { renderDashboard } from "./dashboard.js";
import { renderLog } from "./log.js";
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

      if (pathname === "/log") {
        const activities = (
          await env.DB.prepare("SELECT * FROM activities ORDER BY start_local DESC").all()
        ).results;
        return new Response(renderLog(activities), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      if (pathname === "/api/activities" && request.method === "GET") {
        const activities = (
          await env.DB.prepare("SELECT * FROM activities ORDER BY start_local DESC").all()
        ).results;
        return json({ count: activities.length, activities });
      }

      if (pathname === "/api/dashboard" && request.method === "GET") {
        const data = await getDashboardData(env);
        return json(data);
      }

      if (pathname === "/api/checkin" && request.method === "POST") {
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
          `INSERT INTO sessions (date, week_id, sport, planned_desc, planned_time, planned_minutes, status, actual_summary, strava_activity_id, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
            notes ?? null
          )
          .run();

        return json({ ok: true, id: result.meta.last_row_id });
      }

      if (pathname === "/api/week" && request.method === "POST") {
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
