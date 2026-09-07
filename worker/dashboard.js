// Renders the public "/" dashboard page — the showcase view of the Ironman
// training project, styled to match burkeruder.ai (Wes Anderson / Life
// Aquatic voice, same palette + type as the main site's globals.css and
// src/lib/projects.ts "Exhibit Golf" entry).
//
// This file only controls what HTML gets rendered at "/". It does not touch
// getDashboardData()/the D1 queries in index.js, the JSON returned by
// GET /api/dashboard, or any of the checkin/session/oauth/apple-health
// endpoints — those keep serving the real coaching-session data untouched.
// Personal/private fields (weight, drinks/alcohol log, granular swim splits,
// the live day-by-day session grid) are intentionally left out of this
// render even though they still exist in `data` and in D1.

function esc(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function milestoneItem(m) {
  const when = m.status === "done" ? "logged" : m.target_date ? fmtDate(m.target_date) : "no fixed date";
  const doneClass = m.status === "done" ? "done" : "";
  return `<li class="waypoint ${doneClass}">
    <span class="waypoint-date">${esc(when)}</span>
    <span class="waypoint-label">${esc(m.label)}</span>
  </li>`;
}

export function renderDashboard(data) {
  const { activeWeek, milestones } = data;

  const weekPhase = activeWeek ? activeWeek.phase : "between phases";
  const weekHours = activeWeek ? activeWeek.target_hours : null;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Belafonte — Road to 140.6</title>
<meta name="description" content="A solitary captain provisions an expedition vessel for the longest voyage of his career. Nothing committed yet.">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&display=swap">
<style>
:root{
  --seafoam:#7FB5B0; --seafoam-light:#A8D4D0; --ocean-deep:#1B3A4B; --ocean-mid:#2A5568;
  --ivory:#F5F0E8; --ivory-dark:#E8E0D0; --red-zissou:#C0392B; --sand:#D4B896; --sand-dark:#B8956A;
  --bg:var(--ivory); --fg:var(--ocean-deep); --card-bg:#FFFDF8; --border:var(--sand);
  --accent:var(--red-zissou); --muted:#7A6B54;
  --mono:"IBM Plex Mono",Menlo,Consolas,monospace;
  --serif:Georgia,"Times New Roman",serif;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --bg:var(--ocean-deep); --fg:var(--ivory); --card-bg:#243F52; --border:var(--ocean-mid);
    --accent:var(--red-zissou); --muted:var(--seafoam-light);
  }
}
:root[data-theme="dark"]{
  --bg:var(--ocean-deep); --fg:var(--ivory); --card-bg:#243F52; --border:var(--ocean-mid);
  --accent:var(--red-zissou); --muted:var(--seafoam-light);
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--mono);font-size:15px;line-height:1.65}
main{max-width:760px;margin:0 auto;padding:56px 24px 90px;position:relative}
.chapter-label{font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.25em;text-transform:uppercase;color:var(--accent);border-top:2px solid var(--accent);border-bottom:2px solid var(--accent);padding:4px 12px;display:inline-block}
h1{font-family:var(--serif);font-style:italic;font-weight:400;font-size:clamp(34px,7vw,54px);line-height:1.08;margin:18px 0 4px;color:var(--fg)}
h2{font-family:var(--serif);font-style:italic;font-weight:400;font-size:24px;margin:0 0 6px;color:var(--fg)}
h3{font-family:var(--mono);font-size:14px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin:0 0 8px;color:var(--fg)}
p{max-width:64ch;margin:10px 0}
.subhead{font-family:var(--mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-top:0}
.lede{font-size:15.5px;color:var(--muted);max-width:60ch}
section{margin-top:56px}
.stripe{height:4px;margin:36px 0;background:repeating-linear-gradient(90deg,var(--red-zissou) 0px,var(--red-zissou) 40px,var(--bg) 40px,var(--bg) 44px)}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-top:24px}
.fact{border-top:2px solid var(--fg);padding-top:8px}
.fact b{display:block;font-family:var(--serif);font-style:italic;font-size:26px;font-weight:400;line-height:1.1}
.fact span{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.quote{font-family:var(--serif);font-style:italic;font-size:17px;color:var(--accent);border-left:3px solid var(--accent);padding:2px 0 2px 18px;margin:24px 0}
.quote cite{display:block;margin-top:8px;font-family:var(--mono);font-style:normal;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.card{background:var(--card-bg);border:2px solid var(--border);padding:22px 24px;margin-top:16px;position:relative}
.card .tag{position:absolute;top:0;right:0;background:var(--ocean-deep);color:var(--ivory);font-size:10px;letter-spacing:.15em;text-transform:uppercase;padding:4px 10px}
.card p{margin:0;font-size:14.5px;color:var(--fg)}
ul.waypoints{list-style:none;margin:20px 0 0;padding:0;display:flex;flex-direction:column;gap:2px}
li.waypoint{display:flex;gap:16px;align-items:baseline;padding:10px 0;border-bottom:1px solid var(--border);font-size:14px}
li.waypoint.done{color:var(--muted)}
li.waypoint.done .waypoint-label::after{content:" — logged";font-style:italic;color:var(--seafoam)}
.waypoint-date{font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);min-width:96px;flex-shrink:0}
.waypoint-label{font-family:var(--serif);font-size:15.5px;color:var(--fg)}
footer{margin-top:70px;padding-top:22px;border-top:2px solid var(--border);color:var(--muted);font-size:11px}
footer .sign{font-family:var(--serif);font-style:italic;color:var(--seafoam);font-size:13px;margin-top:8px}
a{color:var(--accent)}
</style>
</head>
<body>
<main>
  <span class="chapter-label">Exhibit Golf — The Belafonte</span>
  <h1>Road to 140.6</h1>
  <p class="subhead">A dispatch from an expedition still being provisioned</p>
  <p class="lede">Burke Ruder, forty years old, cleared IRONMAN 70.3 Waco just inside the cutoff in October 2024. He is now outfitting for the full distance — 2.4 miles of open water, 112 by bicycle, 26.2 on foot — around a full-time job, a side business, and three deckhands under seven who never signed a waiver. Standing order for the whole operation: nothing shoves off before 6:30am.</p>

  <div class="facts">
    <div class="fact"><b>${esc(weekPhase)}</b><span>current heading</span></div>
    <div class="fact"><b>${weekHours ?? "—"} hrs</b><span>this week's target</span></div>
  </div>

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

  <footer>
    <div>im.burkeruder.ai — a Cloudflare-hosted expedition log. Part of the <a href="https://burkeruder.ai/projects">Exhibit Hall</a> at burkeruder.ai.</div>
    <div class="sign">"We're all very excited about the next expedition." — Team Zissou</div>
    <div style="margin-top:14px">&nbsp;·&nbsp;<a href="/privacy">Privacy</a>&nbsp;·&nbsp;<a href="/terms">Terms</a></div>
  </footer>
</main>
</body>
</html>`;
}
