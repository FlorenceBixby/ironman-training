// Renders the public "/" dashboard page — the showcase view of the Ironman
// training project, styled to match burkeruder.ai (Wes Anderson / Life
// Aquatic voice; palette + type live in theme.js).
//
// This file only controls what HTML gets rendered at "/". It does not touch
// getDashboardData()/the D1 queries in index.js, the JSON returned by
// GET /api/dashboard, or any of the checkin/session/oauth/apple-health
// endpoints — those keep serving the real coaching-session data untouched.
//
// What's shown from the live data, as of 2026-09-07 (per Burke's ask to see
// "the activity I need to be doing for the day/week" on the site): today's
// prescribed session and the current week's session list from D1 `sessions`,
// plus a readiness color derived from today's Oura score. Still deliberately
// left out of the public render: weight, the drinks/alcohol log, and
// anything from `checkins` beyond the readiness color.

import { pageShell } from "./theme.js";

function esc(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDow(d) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const SPORT_LABEL = { run: "Run", bike: "Ride", swim: "Swim", strength: "Strength", walk: "Walk", rest: "Rest" };

function milestoneItem(m) {
  const when = m.status === "done" ? "logged" : m.target_date ? fmtDate(m.target_date) : "no fixed date";
  const doneClass = m.status === "done" ? "done" : "";
  return `<li class="waypoint ${doneClass}">
    <span class="waypoint-date">${esc(when)}</span>
    <span class="waypoint-label">${esc(m.label)}</span>
  </li>`;
}

// Readiness color per PLAN.md's rules, from whatever is actually in today's
// checkin row. Sleep and Garmin are usually null (Oura's cron pulls sleep
// only when the ring has synced), so this is mostly the Oura score.
function readinessColor(c) {
  if (!c) return null;
  const o = c.oura_readiness;
  const s = c.sleep_hours;
  if ((o !== null && o !== undefined && o < 60) || (s !== null && s !== undefined && s < 5)) return "red";
  if ((o !== null && o !== undefined && o < 75) || (s !== null && s !== undefined && s < 6.5)) return "yellow";
  if (o !== null && o !== undefined) return "green";
  return null;
}

const COLOR_NOTE = {
  green: "Green day — the session runs at full planned intensity and length.",
  yellow: "Yellow day — the session still happens, but intensity caps at Z2 and length at 45 minutes.",
  red: "Red day — a 20-minute walk or full rest. It counts, and it isn't made up later.",
};

function todayCard(today, todaySessions, checkin) {
  const color = readinessColor(checkin);
  const colorTag = color ? `<span class="tag tag-${color}">${esc(color)} day</span>` : "";
  if (!todaySessions.length) {
    return `<div class="card">
      ${colorTag}
      <h3>Today's orders — ${esc(fmtDow(today))}</h3>
      <p>Nothing posted for today yet. Orders are written each morning from what's left in the week's budget, today's readiness, and the gaps in the calendar — never read off a grid.</p>
      ${color ? `<p class="note">${esc(COLOR_NOTE[color])}</p>` : ""}
    </div>`;
  }
  return todaySessions
    .map(
      (s) => `<div class="card today">
      ${colorTag}
      <h3>Today's orders — ${esc(fmtDow(today))}</h3>
      <p class="orders-sport"><span class="badge badge-${esc(s.sport)}">${esc(SPORT_LABEL[s.sport] || s.sport)}</span> ${s.planned_minutes ? `${s.planned_minutes} min` : ""}${s.planned_time ? ` · ${esc(s.planned_time)}` : ""}</p>
      <p class="orders-desc">${esc(s.planned_desc || "")}</p>
      ${s.notes ? `<p class="note">${esc(s.notes)}</p>` : ""}
      ${s.status && s.status !== "planned" ? `<p class="note">Status: ${esc(s.status)}${s.actual_summary ? ` — ${esc(s.actual_summary)}` : ""}</p>` : ""}
      ${color ? `<p class="note">${esc(COLOR_NOTE[color])}</p>` : ""}
    </div>`
    )
    .join("");
}

function weekList(activeWeek, sessions, today) {
  if (!activeWeek) return "<p>No week on the books yet.</p>";
  const days = [];
  const start = new Date(activeWeek.start_date + "T00:00:00");
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.valueOf() + i * 86400000);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push(iso);
  }
  const byDate = {};
  for (const s of sessions) (byDate[s.date] = byDate[s.date] || []).push(s);

  const loggedMin = sessions
    .filter((s) => s.status === "done" || s.status === "modified")
    .reduce((acc, s) => acc + (s.planned_minutes || 0), 0);
  const plannedMin = sessions.reduce((acc, s) => acc + (s.planned_minutes || 0), 0);

  const rows = days
    .map((iso) => {
      const list = byDate[iso] || [];
      const isToday = iso === today;
      const isPast = iso < today;
      const cells = list.length
        ? list
            .map(
              (s) => `<div class="wk-session ${esc(s.status || "planned")}">
              <span class="badge badge-${esc(s.sport)}">${esc(SPORT_LABEL[s.sport] || s.sport)}</span>
              <span class="wk-desc">${esc(s.planned_desc || "")}</span>
              <span class="wk-meta">${s.planned_minutes ? `${s.planned_minutes} min` : ""}${s.planned_time ? ` · ${esc(s.planned_time)}` : ""}${s.status && s.status !== "planned" ? ` · ${esc(s.status)}` : ""}</span>
            </div>`
            )
            .join("")
        : `<div class="wk-session empty"><span class="wk-desc">${isPast ? "Nothing logged." : "Not yet written — set the morning of."}</span></div>`;
      return `<li class="wk-day ${isToday ? "today" : ""} ${isPast ? "past" : ""}">
        <span class="wk-date">${esc(fmtDow(iso))}${isToday ? " · today" : ""}</span>
        <div class="wk-cells">${cells}</div>
      </li>`;
    })
    .join("");

  return `
    <div class="facts">
      <div class="fact"><b>${activeWeek.target_hours ?? "—"} hrs</b><span>this week's budget</span></div>
      <div class="fact"><b>${(plannedMin / 60).toFixed(1)} hrs</b><span>written so far</span></div>
      <div class="fact"><b>${(loggedMin / 60).toFixed(1)} hrs</b><span>logged done</span></div>
    </div>
    <ul class="week">${rows}</ul>
    <p class="note">The week is a budget, not a schedule: ${activeWeek.target_hours ?? "—"} hours, with at least two swims, two rides including the long one, two runs including the long one, and one short strength session. Which day each lands on is decided the morning of. A missed easy session is dropped, not owed.</p>`;
}

export function renderDashboard(data) {
  const { activeWeek, milestones, sessions = [], today, todaySessions = [], todayCheckin = null, activityCount = 0 } = data;

  const weekPhase = activeWeek ? activeWeek.phase : "between phases";
  const weekHours = activeWeek ? activeWeek.target_hours : null;

  const body = `
  <span class="chapter-label">Exhibit Golf — The Belafonte</span>
  <h1>Road to 140.6</h1>
  <p class="subhead">A dispatch from an expedition still being provisioned</p>
  <p class="lede">Burke Ruder, forty years old, cleared IRONMAN 70.3 Waco just inside the cutoff in October 2024. He is now outfitting for the full distance — 2.4 miles of open water, 112 by bicycle, 26.2 on foot — around a full-time job, a side business, and three deckhands under seven who never signed a waiver. Standing order for the whole operation: nothing shoves off before 6:30am.</p>

  <nav class="topnav"><a href="/" class="here">Chart table</a><a href="/log">Ship's log</a></nav>

  <div class="facts">
    <div class="fact"><b>${esc(weekPhase)}</b><span>current heading</span></div>
    <div class="fact"><b>${weekHours ?? "—"} hrs</b><span>this week's target</span></div>
  </div>

  <div class="stripe"></div>

  <section class="orders">
    <h2>Orders of the day</h2>
    ${todayCard(today, todaySessions, todayCheckin)}
  </section>

  <section>
    <h2>This week's manifest</h2>
    <p class="subhead">${activeWeek ? `${esc(activeWeek.week_id)} · ${esc(activeWeek.phase)} · ${esc(fmtDate(activeWeek.start_date))} – ${esc(fmtDate(activeWeek.end_date))}` : ""}</p>
    ${weekList(activeWeek, sessions, today)}
  </section>

  <div class="stripe"></div>

  <section>
    <h2>Nothing committed yet</h2>
    <p>Three routes are spread out on the chart table. None are inked in — the decision doesn't have to be made until mid-October, and until then all three stay in play.</p>

    <div class="card">
      <span class="tag">Route A</span>
      <h3>Full steam ahead</h3>
      <p>IRONMAN Texas, The Woodlands — April 2027. Thirty-two weeks of runway, peak weeks pushing 14–15 hours. The ambitious line, and the one with the least margin for error.</p>
    </div>
    <div class="card">
      <span class="tag">Route B</span>
      <h3>The recommended course</h3>
      <p>A fall 2027 full — Chattanooga, Florida, or Arizona, still to be named. Fifty-five to sixty-two weeks, with a 70.3 in Galveston next April standing in as the dress rehearsal. Currently in the lead.</p>
    </div>
    <div class="card">
      <span class="tag">Route C</span>
      <h3>Taking the scenic route</h3>
      <p>IRONMAN Texas again, but April 2028. The better part of two years of runway, and the gentlest slope for a life that already has plenty going on.</p>
    </div>

    <p>All three routes share the same first leg — a ten-week rebuild running through mid-November — and the same near-term checkpoint: a continuous 2000-meter swim, a three-hour ride, and a ten-mile run, all inside one ordinary week, by mid-December.</p>
  </section>

  <blockquote class="quote">"Here's the next adventure being planned. Nothing committed yet."<cite>— B. Ruder, Captain</cite></blockquote>

  <section>
    <h2>Waypoints</h2>
    <ul class="waypoints">
      ${milestones && milestones.length ? milestones.map(milestoneItem).join("") : "<li>No waypoints charted yet.</li>"}
    </ul>
  </section>

  <section>
    <h2>The record</h2>
    <p>Every session since Waco — ${activityCount} of them at last count, each with the weather it happened in — lives in the <a href="/log">ship's log</a>.</p>
  </section>`;

  const extraCss = `
ul.waypoints{list-style:none;margin:20px 0 0;padding:0;display:flex;flex-direction:column;gap:2px}
li.waypoint{display:flex;gap:16px;align-items:baseline;padding:10px 0;border-bottom:1px solid var(--border);font-size:14px}
li.waypoint.done{color:var(--muted)}
li.waypoint.done .waypoint-label::after{content:" — logged";font-style:italic;color:var(--seafoam)}
.waypoint-date{font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);min-width:96px;flex-shrink:0}
.waypoint-label{font-family:var(--serif);font-size:15.5px;color:var(--fg)}
.note{font-size:12.5px;color:var(--muted);margin-top:10px !important}
.card.today{border-color:var(--accent)}
.tag-green{background:#2E7D5B !important}
.tag-yellow{background:var(--sand-dark) !important;color:var(--ocean-deep) !important}
.tag-red{background:var(--red-zissou) !important}
.orders-sport{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:8px !important}
.orders-desc{font-family:var(--serif);font-size:18px !important;line-height:1.5}
.badge{font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;padding:3px 8px;color:var(--ivory);background:var(--ocean-mid);margin-right:6px}
.badge-run{background:var(--red-zissou)}
.badge-bike{background:var(--ocean-deep)}
.badge-swim{background:var(--seafoam);color:var(--ocean-deep)}
.badge-strength{background:var(--sand-dark)}
.badge-walk,.badge-rest{background:var(--sand);color:var(--ocean-deep)}
:root[data-theme="dark"] .badge-bike{background:var(--seafoam-light);color:var(--ocean-deep)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .badge-bike{background:var(--seafoam-light);color:var(--ocean-deep)}}
ul.week{list-style:none;margin:20px 0 0;padding:0}
li.wk-day{display:grid;grid-template-columns:132px 1fr;gap:14px;padding:12px 0;border-bottom:1px solid var(--border);align-items:start}
li.wk-day.today{background:var(--card-bg);border:2px solid var(--accent);padding:12px 14px;margin:6px -16px}
li.wk-day.past{color:var(--muted)}
.wk-date{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding-top:3px}
li.wk-day.today .wk-date{color:var(--accent);font-weight:700}
.wk-session{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 8px;margin-bottom:6px}
.wk-session.done .wk-desc,.wk-session.modified .wk-desc{text-decoration:line-through;text-decoration-color:var(--seafoam)}
.wk-session.missed .wk-desc{text-decoration:line-through;text-decoration-color:var(--accent)}
.wk-desc{font-family:var(--serif);font-size:15px;flex:1 1 100%}
.wk-session.empty .wk-desc{font-style:italic;color:var(--muted)}
.wk-meta{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
@media (max-width:520px){li.wk-day{grid-template-columns:1fr;gap:4px}}
`;

  return pageShell({
    title: "The Belafonte — Road to 140.6",
    description: "A solitary captain provisions an expedition vessel for the longest voyage of his career. Nothing committed yet.",
    body,
    extraCss,
  });
}
