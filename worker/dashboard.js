// Renders the Road to 140.6 dashboard HTML. Palette and type carried over
// from the original "Road to 140.6" draft page (Barlow Condensed / IBM Plex),
// extended to read live data out of D1 instead of being a static snapshot.

const SPORT_LABEL = { swim: "Swim", bike: "Bike", run: "Run", strength: "Strength", rest: "Rest" };

function esc(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target - now) / 86400000);
}

function sessionRow(s) {
  const done = s.status === "done";
  const missed = s.status === "missed";
  const pillClass = done ? "good" : missed ? "bad" : "warn";
  const pillText = done ? "done" : missed ? "missed" : "planned";
  return `<tr>
    <td>${esc(fmtDate(s.date))}</td>
    <td><span class="sport ${esc(s.sport)}"></span>${esc(SPORT_LABEL[s.sport] || s.sport)}</td>
    <td>${esc(s.planned_desc || "")}</td>
    <td class="num">${esc(s.planned_time || "")}</td>
    <td class="num">${s.planned_minutes ? s.planned_minutes + " min" : ""}</td>
    <td><span class="pill ${pillClass}">${pillText}</span></td>
  </tr>`;
}

function checkinRow(c) {
  const drinkDots = "●".repeat(Math.min(c.drinks || 0, 5)) + "○".repeat(Math.max(0, 3 - (c.drinks || 0)));
  const statusClass = c.status === "green" ? "good" : c.status === "red" ? "bad" : c.status === "yellow" ? "warn" : "";
  return `<tr>
    <td>${esc(fmtDate(c.date))}</td>
    <td class="num">${c.oura_readiness ?? "—"}</td>
    <td class="num">${c.sleep_hours ?? "—"}</td>
    <td class="num">${c.garmin_readiness ?? "—"}</td>
    <td class="num">${c.weight ?? "—"}</td>
    <td class="num" title="${c.drinks ?? 0} drinks">${drinkDots}</td>
    <td>${c.status ? `<span class="pill ${statusClass}">${esc(c.status)}</span>` : ""}</td>
  </tr>`;
}

function milestoneItem(m) {
  const days = daysUntil(m.target_date);
  const doneClass = m.status === "done" ? "good" : "";
  let when = "";
  if (m.status === "done") when = "done";
  else if (m.target_date) when = days >= 0 ? `${days}d out · ${fmtDate(m.target_date)}` : fmtDate(m.target_date);
  else when = "no fixed date";
  return `<li class="milestone">
    <span class="pill ${doneClass}">${when}</span>
    <span>${esc(m.label)}</span>
  </li>`;
}

export function renderDashboard(data) {
  const { activeWeek, sessions, recentCheckins, milestones, dryDaysLast14 } = data;

  const weekHours = activeWeek ? activeWeek.target_hours : null;
  const weekPhase = activeWeek ? activeWeek.phase : "—";
  const weekRange = activeWeek ? `${fmtDate(activeWeek.start_date)} – ${fmtDate(activeWeek.end_date)}` : "";
  const cap = activeWeek ? activeWeek.alcohol_cap : null;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Road to 140.6 — Burke Ruder</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{
  --bg:#f3f4f1; --surface:#ffffff; --ink:#16211f; --muted:#5f6a67; --line:#d5dad6;
  --accent:#0e6b72; --accent-ink:#ffffff; --accent-soft:#dcecec;
  --clay:#b4552a; --clay-soft:#f4e3da;
  --swim:#2f7da8; --bike:#b4552a; --run:#3e8a5a; --strength:#8a5ea8; --rest:#8a938f;
  --good:#3e8a5a; --warn:#c48a1c; --bad:#b53a2c;
  --display:"Barlow Condensed","Arial Narrow",Impact,sans-serif;
  --body:"IBM Plex Sans","Helvetica Neue",Arial,sans-serif;
  --mono:"IBM Plex Mono",Menlo,Consolas,monospace;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --bg:#101715; --surface:#18211f; --ink:#e6ebe8; --muted:#9aa5a1; --line:#2c3835;
    --accent:#4fb3b8; --accent-ink:#0b1413; --accent-soft:#173437;
    --clay:#e07a48; --clay-soft:#3a2418;
    --swim:#5aa6d0; --bike:#e07a48; --run:#62b57e; --strength:#b48fd0; --rest:#6c7975;
    --good:#62b57e; --warn:#d9a441; --bad:#e0604f;
  }
}
:root[data-theme="dark"]{
  --bg:#101715; --surface:#18211f; --ink:#e6ebe8; --muted:#9aa5a1; --line:#2c3835;
  --accent:#4fb3b8; --accent-ink:#0b1413; --accent-soft:#173437;
  --clay:#e07a48; --clay-soft:#3a2418;
  --swim:#5aa6d0; --bike:#e07a48; --run:#62b57e; --strength:#b48fd0; --rest:#6c7975;
  --good:#62b57e; --warn:#d9a441; --bad:#e0604f;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--body);font-size:16px;line-height:1.55}
main{max-width:960px;margin:0 auto;padding:40px 24px 80px}
h1,h2,h3{font-family:var(--display);font-weight:600;line-height:1.05;margin:0;letter-spacing:.005em}
h1{font-size:clamp(40px,7vw,68px);text-transform:uppercase}
h2{font-size:28px;margin-top:52px;margin-bottom:6px}
h3{font-size:19px;margin-top:18px}
p{max-width:66ch;margin:8px 0}
.eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.lede{font-size:17px;color:var(--muted);max-width:60ch}
.mast{display:grid;gap:18px;padding-bottom:26px;border-bottom:2px solid var(--ink)}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:14px;margin-top:22px}
.fact{border-top:2px solid var(--ink);padding-top:8px}
.fact b{display:block;font-family:var(--display);font-size:28px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums}
.fact span{font-size:12.5px;color:var(--muted)}
table{border-collapse:collapse;width:100%;font-size:14px;margin-top:12px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-family:var(--mono);font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);font-weight:500}
td.num{font-family:var(--mono);font-variant-numeric:tabular-nums;white-space:nowrap}
.scroll{overflow-x:auto}
.sport{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:7px;vertical-align:middle}
.swim{background:var(--swim)}.bike{background:var(--bike)}.run{background:var(--run)}.strength{background:var(--strength)}.rest{background:var(--rest)}
.pill{display:inline-block;font-family:var(--mono);font-size:10.5px;padding:2px 7px;border-radius:3px;letter-spacing:.03em;white-space:nowrap;background:var(--line);color:var(--muted)}
.pill.bad{background:var(--clay-soft);color:var(--bad)}
.pill.warn{background:color-mix(in srgb,var(--warn) 18%,transparent);color:var(--warn)}
.pill.good{background:color-mix(in srgb,var(--good) 18%,transparent);color:var(--good)}
.callout{background:var(--accent-soft);border-left:4px solid var(--accent);padding:14px 18px;margin:18px 0;max-width:72ch}
.callout p{margin:4px 0}
.card{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:20px 22px;margin-top:14px}
ul.milestones{list-style:none;margin:14px 0 0;padding:0;display:flex;flex-direction:column;gap:10px}
li.milestone{display:flex;align-items:center;gap:10px;font-size:14.5px}
li.milestone .pill{min-width:112px;text-align:center}
footer{margin-top:70px;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);font-size:13px;font-family:var(--mono)}
.rule{font-weight:600}
a{color:var(--accent)}
</style>
</head>
<body>
<main>
  <section class="mast">
    <div class="eyebrow">Coaching dashboard — updated live from D1</div>
    <h1>Road to 140.6</h1>
    <p class="lede">Burke Ruder, 40. Finished IRONMAN 70.3 Waco just inside the cutoff on Oct 6, 2024. Now training toward a full Ironman, around three kids under 7, a full-time job, and a side business. No workouts before 6:30am — that rule governs everything below.</p>
    <div class="facts">
      <div class="fact"><b>${esc(weekPhase)}</b><span>current phase</span></div>
      <div class="fact"><b>${weekHours ?? "—"} hrs</b><span>target this week</span></div>
      <div class="fact"><b>${dryDaysLast14}/14</b><span>dry days, last 2 weeks</span></div>
      <div class="fact"><b>${cap ?? "—"}</b><span>drink cap this phase</span></div>
    </div>
  </section>

  <section>
    <h2>This week</h2>
    <p class="eyebrow">${esc(weekRange)}</p>
    <p>This isn't a fixed schedule set in advance — each row below gets added the morning of, sized to whatever gap actually exists that day against the week's budget (${weekHours ?? "—"} hrs, roughly split across swim/bike/run/strength). A quiet day shrinks the week; it doesn't get "made up" on a specific later day.</p>
    <div class="scroll">
      <table>
        <thead><tr><th>Day</th><th>Sport</th><th>Session</th><th>Slot</th><th>Length</th><th>Status</th></tr></thead>
        <tbody>
          ${sessions.length ? sessions.map(sessionRow).join("") : `<tr><td colspan="6">No sessions decided yet this week — they're added day by day, not pre-planned.</td></tr>`}
        </tbody>
      </table>
    </div>
    <div class="callout"><p><span class="rule">Standing rule:</span> nothing starts before 6:30am. Kickr and swim sessions run late-morning, at lunch, or evening — never pre-dawn. <span class="rule">Adaptive by design:</span> a missed low-value session is dropped, not owed; a missed long ride/run compresses into the same week if there's room, or the week just gets smaller — never pinned to a specific make-up day. Doing more than planned shrinks the rest of that week's ask, not next week's.</p></div>
  </section>

  <section>
    <h2>Milestones</h2>
    <ul class="milestones">
      ${milestones.length ? milestones.map(milestoneItem).join("") : "<li>No milestones set.</li>"}
    </ul>
  </section>

  <section>
    <h2>Readiness &amp; alcohol log</h2>
    <div class="scroll">
      <table>
        <thead><tr><th>Date</th><th>Oura</th><th>Sleep</th><th>Garmin</th><th>Weight</th><th>Drinks</th><th>Day</th></tr></thead>
        <tbody>
          ${recentCheckins.length ? recentCheckins.map(checkinRow).join("") : `<tr><td colspan="7">No check-ins logged yet — the daily "today" protocol will start filling this in.</td></tr>`}
        </tbody>
      </table>
    </div>
  </section>

  <section>
    <h2>The three timelines</h2>
    <div class="card">
      <h3><span class="sport bike"></span>A — Pushing it</h3>
      <p>IRONMAN Texas, The Woodlands, Apr 17 2027. 32 weeks. ~14–15 peak hrs/wk. <span class="pill warn">~50% odds</span></p>
    </div>
    <div class="card">
      <h3><span class="sport run"></span>B — Recommended</h3>
      <p>A fall 2027 full (Chattanooga, Florida, or Arizona). 55–62 weeks. ~13–14 peak hrs/wk. <span class="pill good">~78% odds</span>. Galveston 70.3 (Apr 4, 2027) as the dress rehearsal.</p>
    </div>
    <div class="card">
      <h3><span class="sport swim"></span>C — Dragging feet</h3>
      <p>IRONMAN Texas, Apr 2028. 84 weeks. ~11–12 peak hrs/wk. <span class="pill good">~85% odds</span>.</p>
    </div>
    <p>All three share a 10-week rebuild (Sep 7 – Nov 15, 2026) and the same intermediate goal: <b>70.3-ready on 30 days' notice</b> by mid-December — swim 2000m continuous, ride 3hrs, run 10mi in one normal week. Decide A/B/C by Oct 15, 2026.</p>
    <div class="callout"><p><span class="rule">Swim correction, 2026-09-06:</span> the Waco 70.3 swim split included a ~20–25 min panic response to first-ever open water, not clean pace. Backed out, his controlled pace projects to ~1:38–2:05 for the full 2.4mi swim — comfortably under the 2:20:00 cutoff, versus the ~2:15–2:25 (at/over cutoff) the raw split implied. Odds above were revised up accordingly. The real remaining risk is panic recurrence and untested endurance, not raw pace — see <code>PLAN.md</code>'s open-water acclimation section.</p></div>
  </section>

  <footer>
    im.burkeruder.ai — Cloudflare Worker + D1. Source of truth: <code>ironman-training</code> repo, <code>training/PLAN.md</code> and <code>training/ATHLETE.md</code>.
    &nbsp;·&nbsp; <a href="/privacy">Privacy</a> &nbsp;·&nbsp; <a href="/terms">Terms</a>
  </footer>
</main>
</body>
</html>`;
}
