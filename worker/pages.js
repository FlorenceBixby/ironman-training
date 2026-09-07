// Static pages: privacy, terms, and the OAuth connect/callback confirmation
// screens. Shares dashboard.js's exact palette, type, and component classes
// (chapter-label, stripe, card, quote) so these pages read as the same
// expedition rather than a different app bolted on.

function esc(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function shell(title, chapterLabel, bodyHtml) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — Road to 140.6</title>
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
main{max-width:680px;margin:0 auto;padding:56px 24px 90px;position:relative}
.chapter-label{font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.25em;text-transform:uppercase;color:var(--accent);border-top:2px solid var(--accent);border-bottom:2px solid var(--accent);padding:4px 12px;display:inline-block}
h1{font-family:var(--serif);font-style:italic;font-weight:400;font-size:clamp(30px,6vw,44px);line-height:1.1;margin:18px 0 4px;color:var(--fg)}
h2{font-family:var(--serif);font-style:italic;font-weight:400;font-size:21px;margin:34px 0 8px;color:var(--fg)}
p,li{max-width:64ch;margin:10px 0;font-size:14.5px}
.subhead{font-family:var(--mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-top:0}
.stripe{height:4px;margin:28px 0;background:repeating-linear-gradient(90deg,var(--red-zissou) 0px,var(--red-zissou) 40px,var(--bg) 40px,var(--bg) 44px)}
.card{background:var(--card-bg);border:2px solid var(--border);padding:22px 24px;margin-top:16px;position:relative}
.card .tag{position:absolute;top:0;right:0;background:var(--ocean-deep);color:var(--ivory);font-size:10px;letter-spacing:.15em;text-transform:uppercase;padding:4px 10px}
.card.status .tag.connected{background:var(--seafoam);color:var(--ocean-deep)}
.card.status .tag.error{background:var(--accent);color:var(--ivory)}
.card p{margin:0 0 10px;font-size:14.5px;color:var(--fg)}
.card p:last-child{margin-bottom:0}
a{color:var(--accent)}
footer{margin-top:60px;padding-top:22px;border-top:2px solid var(--border);color:var(--muted);font-size:11px}
footer a{color:var(--muted)}
</style>
</head>
<body>
<main>
  <span class="chapter-label">${esc(chapterLabel)}</span>
${bodyHtml}
  <div class="stripe"></div>
  <footer><a href="/">← Back to the Belafonte</a> — im.burkeruder.ai, Burke Ruder's Ironman expedition log.</footer>
</main>
</body>
</html>`;
}

export function renderPrivacyPage() {
  return shell(
    "Privacy Policy",
    "Ship's Log — Privacy",
    `<h1>What's logged, and why</h1>
<p class="subhead">Last updated 2026-09-06</p>
<p>The Belafonte carries a crew of one. This is a single-user personal training dashboard built and used by Burke Ruder to plan and track his own Ironman training — not a commercial product, and nobody else has an account here.</p>

<h2>What data this app uses</h2>
<p>It connects to fitness and health services Burke has personally authorized — currently Strava and Oura — solely to read his own training and health data (activities, heart rate, sleep, readiness, and similar) and use it to plan and adjust his own training.</p>

<h2>What's stored</h2>
<p>Planned and completed training sessions, daily readiness check-ins, and the OAuth tokens needed to keep the Oura connection alive are stored in a Cloudflare D1 database dedicated to this app. Nothing here is sold, shared, or used for anything beyond running this dashboard and plan.</p>

<h2>Third parties</h2>
<p>Data is pulled from Strava's and Oura's APIs under Burke's own authorization with those services. This app doesn't send his data anywhere else, doesn't use it for advertising, and doesn't use it to train any model beyond what a coaching session directly reasons about to plan his training.</p>

<h2>Data removal</h2>
<p>Because this is a single-user app run by its own subject, removal is simple: Burke can revoke access from Oura's or Strava's own connected-apps settings at any time, and can have the stored data removed from the D1 database directly — it's his own infrastructure.</p>

<h2>Contact</h2>
<p>burke.ruder@gmail.com</p>`
  );
}

export function renderTermsPage() {
  return shell(
    "Terms of Service",
    "Ship's Log — Terms",
    `<h1>The fine print</h1>
<p class="subhead">Last updated 2026-09-06</p>
<p>This is a personal, single-user application. Burke Ruder built it and is its only user. There's no signup, no account creation for anyone else, and no service being offered to the public.</p>

<h2>What it does</h2>
<p>The app reads training and health data from services Burke connects (Strava, Oura) and uses it to plan, adjust, and track his own Ironman training. It's provided as-is, with no uptime guarantee, no warranty, and no support commitment beyond Burke's own maintenance of it.</p>

<h2>No liability</h2>
<p>This app is a training-planning aid, not medical or professional coaching advice. Burke uses his own judgment — and that of any real coach or doctor he consults — for training and health decisions. The app's author isn't liable for outcomes from following its suggestions.</p>

<h2>Changes</h2>
<p>Since this is a personal tool, these terms may change at any time without notice as the expedition evolves.</p>

<h2>Contact</h2>
<p>burke.ruder@gmail.com</p>`
  );
}

export function renderOuraConnectedPage(ok, detail) {
  const tag = ok ? `<span class="tag connected">Connected</span>` : `<span class="tag error">Error</span>`;
  return shell(
    "Oura",
    "Instrument Check — Oura",
    `<h1>${ok ? "Reading clear" : "Signal lost"}</h1>
<p class="subhead">Ring-to-ship telemetry</p>
<div class="card status">
  ${tag}
  <p>${esc(detail)}</p>
  ${ok ? `<p>Readiness and sleep will be logged automatically every morning (~7:30am CT) from here on. Nothing further to do.</p>` : ""}
</div>`
  );
}
