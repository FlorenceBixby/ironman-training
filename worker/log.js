// Renders the public "/log" page — the ship's log: every Strava activity
// since IRONMAN 70.3 Waco, with the weather it happened in and a short
// synopsis in the same Life Aquatic voice as the "/" dashboard.
//
// Reads only the `activities` table (see schema.sql). Location is shown at
// the city/county level Strava itself reports and nothing finer — no
// coordinates, no polylines, no street names — by design.

import { pageShell } from "./theme.js";

function esc(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const SPORT_LABEL = { run: "Run", bike: "Ride", swim: "Swim", strength: "Strength", walk: "Walk", other: "Other" };

function fmtDuration(s) {
  if (!s) return "";
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`;
}

function fmtDistance(a) {
  if (!a.distance_m) return "";
  if (a.sport === "swim") return `${Math.round(a.distance_m)} m`;
  return `${(a.distance_m / 1609.344).toFixed(1)} mi`;
}

function fmtDay(dateStr, startLocal) {
  const dt = new Date(dateStr + "T00:00:00");
  const day = dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const hh = parseInt(startLocal.slice(11, 13), 10);
  const mm = startLocal.slice(14, 16);
  const ampm = hh >= 12 ? "pm" : "am";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${day} · ${h12}:${mm} ${ampm}`;
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

function monthTitle(key) {
  const dt = new Date(key + "-01T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function weatherLine(a) {
  if (a.wx_temp_f === null || a.wx_temp_f === undefined) return "";
  const bits = [`${a.wx_temp_f}°F`];
  if (a.wx_feels_f !== null && a.wx_feels_f !== undefined && Math.abs(a.wx_feels_f - a.wx_temp_f) >= 3) bits.push(`feels ${a.wx_feels_f}°`);
  if (a.wx_sky) bits.push(a.wx_sky);
  if (a.wx_humidity !== null && a.wx_humidity !== undefined) bits.push(`${a.wx_humidity}% rh`);
  if (a.wx_wind_mph) bits.push(`wind ${a.wx_wind_mph} mph`);
  return bits.join(" · ");
}

function entry(a) {
  const stats = [fmtDistance(a), fmtDuration(a.moving_s), a.pace, a.elevation_m ? `${Math.round(a.elevation_m * 3.28084)} ft up` : ""]
    .filter(Boolean)
    .join(" · ");
  const hr = a.avg_hr ? ` · HR ${a.avg_hr}${a.max_hr ? `/${a.max_hr}` : ""}` : "";
  const where = a.indoor ? `Indoors · ${esc(a.locale || "")}` : esc(a.locale || "");
  const wx = weatherLine(a);
  return `<article class="entry" data-sport="${esc(a.sport)}">
    <div class="entry-head">
      <span class="badge badge-${esc(a.sport)}">${esc(SPORT_LABEL[a.sport] || a.sport)}</span>
      <span class="entry-when">${esc(fmtDay(a.date, a.start_local))}</span>
      <span class="entry-name">${esc(a.name || "")}</span>
    </div>
    <div class="entry-stats">${esc(stats)}${hr}</div>
    <div class="entry-wx">${where}${wx ? ` · ${a.indoor ? "outside: " : ""}${esc(wx)}` : ""}</div>
    ${a.synopsis ? `<p class="entry-syn">${esc(a.synopsis)}</p>` : ""}
  </article>`;
}

function totals(activities) {
  const t = { sessions: activities.length, runMi: 0, runs: 0, bikeMi: 0, rides: 0, swimM: 0, swims: 0, hours: 0 };
  for (const a of activities) {
    t.hours += (a.moving_s || 0) / 3600;
    if (a.sport === "run") { t.runs++; t.runMi += (a.distance_m || 0) / 1609.344; }
    if (a.sport === "bike") { t.rides++; t.bikeMi += (a.distance_m || 0) / 1609.344; }
    if (a.sport === "swim") { t.swims++; t.swimM += a.distance_m || 0; }
  }
  return t;
}

export function renderLog(activities) {
  // newest first, grouped by month
  const sorted = [...activities].sort((x, y) => (x.start_local < y.start_local ? 1 : -1));
  const groups = [];
  for (const a of sorted) {
    const k = monthKey(a.date);
    if (!groups.length || groups[groups.length - 1].key !== k) groups.push({ key: k, items: [] });
    groups[groups.length - 1].items.push(a);
  }
  const t = totals(activities);
  const first = sorted.length ? sorted[sorted.length - 1] : null;

  const body = `
  <span class="chapter-label">Exhibit Golf — The Belafonte</span>
  <h1>Ship's Log</h1>
  <p class="subhead">Every outing since Waco, as recorded by the instruments</p>
  <p class="lede">A complete record of the captain's training, pulled from Strava and annotated by the coach. Each entry notes the weather it happened in. Locations are given by county or town only — the streets he runs are his own business.</p>

  <nav class="crumbs"><a href="/">← The chart table</a></nav>

  <div class="facts">
    <div class="fact"><b>${t.sessions}</b><span>entries logged</span></div>
    <div class="fact"><b>${Math.round(t.hours)} hrs</b><span>moving time</span></div>
    <div class="fact"><b>${Math.round(t.runMi)} mi</b><span>on foot, ${t.runs} runs</span></div>
    <div class="fact"><b>${Math.round(t.bikeMi)} mi</b><span>outdoors by bicycle, ${t.rides} rides total</span></div>
    <div class="fact"><b>${Math.round(t.swimM / 1000 * 10) / 10} km</b><span>in the water, ${t.swims} swims</span></div>
  </div>

  <div class="stripe"></div>

  <div class="filters" role="group" aria-label="Filter by sport">
    <button class="chip active" data-filter="all">All</button>
    <button class="chip" data-filter="run">Run</button>
    <button class="chip" data-filter="bike">Ride</button>
    <button class="chip" data-filter="swim">Swim</button>
    <button class="chip" data-filter="strength">Strength</button>
    <button class="chip" data-filter="walk">Walk</button>
  </div>

  ${groups
    .map(
      (g) => `<section class="month" data-month="${esc(g.key)}">
    <h2>${esc(monthTitle(g.key))} <span class="month-count">${g.items.length}</span></h2>
    ${g.items.map(entry).join("\n")}
  </section>`
    )
    .join("\n")}

  ${first ? `<p class="log-end">The log opens ${esc(new Date(first.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }))}, five days before IRONMAN 70.3 Waco. Everything before that is prehistory.</p>` : ""}

  <script>
  (function(){
    var chips=document.querySelectorAll('.chip');
    var entries=document.querySelectorAll('.entry');
    var months=document.querySelectorAll('.month');
    function apply(f){
      chips.forEach(function(c){c.classList.toggle('active',c.dataset.filter===f)});
      entries.forEach(function(e){e.hidden = f!=='all' && e.dataset.sport!==f});
      months.forEach(function(m){
        var visible=m.querySelectorAll('.entry:not([hidden])').length;
        m.hidden = visible===0;
        var c=m.querySelector('.month-count'); if(c) c.textContent=visible;
      });
    }
    chips.forEach(function(c){c.addEventListener('click',function(){apply(c.dataset.filter)})});
  })();
  </script>`;

  const extraCss = `
.crumbs{margin-top:22px;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.crumbs a{text-decoration:none;border-bottom:1px solid var(--accent)}
.filters{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 8px}
.chip{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;background:transparent;color:var(--fg);border:2px solid var(--border);padding:6px 12px;cursor:pointer}
.chip.active{background:var(--ocean-deep);color:var(--ivory);border-color:var(--ocean-deep)}
:root[data-theme="dark"] .chip.active{background:var(--ivory);color:var(--ocean-deep);border-color:var(--ivory)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .chip.active{background:var(--ivory);color:var(--ocean-deep);border-color:var(--ivory)}}
section.month{margin-top:44px}
section.month h2{display:flex;align-items:baseline;gap:12px;border-bottom:2px solid var(--fg);padding-bottom:6px;margin-bottom:6px}
.month-count{font-family:var(--mono);font-style:normal;font-size:11px;letter-spacing:.12em;color:var(--muted)}
.entry{padding:16px 0 18px;border-bottom:1px solid var(--border)}
.entry-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px 14px}
.badge{font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;padding:3px 8px;color:var(--ivory);background:var(--ocean-mid)}
.badge-run{background:var(--red-zissou)}
.badge-bike{background:var(--ocean-deep)}
.badge-swim{background:var(--seafoam);color:var(--ocean-deep)}
.badge-strength{background:var(--sand-dark)}
.badge-walk{background:var(--sand);color:var(--ocean-deep)}
:root[data-theme="dark"] .badge-bike{background:var(--seafoam-light);color:var(--ocean-deep)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .badge-bike{background:var(--seafoam-light);color:var(--ocean-deep)}}
.entry-when{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.entry-name{font-family:var(--serif);font-style:italic;font-size:17px}
.entry-stats{margin-top:8px;font-size:13px;font-weight:500}
.entry-wx{margin-top:2px;font-size:11.5px;letter-spacing:.04em;color:var(--muted)}
.entry-syn{font-family:var(--serif);font-size:15.5px;line-height:1.55;margin:10px 0 0;max-width:62ch;color:var(--fg)}
.log-end{margin-top:40px;font-family:var(--serif);font-style:italic;color:var(--muted)}
`;

  return pageShell({
    title: "Ship's Log — The Belafonte",
    description: "Every training session since IRONMAN 70.3 Waco, with weather and a short synopsis.",
    body,
    extraCss,
  });
}
