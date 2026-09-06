// ironman-training worker — serves the Road to 140.6 dashboard and its API.

import { renderDashboard } from "./dashboard.js";

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json", ...(init.headers || {}) },
    status: init.status || 200,
  });
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
  const today = new Date().toISOString().slice(0, 10);
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

  return {
    today,
    activeWeek,
    sessions,
    recentCheckins,
    milestones,
    weekCount,
    dryDaysLast14,
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    try {
      if (pathname === "/" || pathname === "/index.html") {
        const data = await getDashboardData(env);
        return new Response(renderDashboard(data), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
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
};
