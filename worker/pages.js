// Static pages: privacy, terms, and the OAuth connect/callback confirmation
// screens. Same look as dashboard.js (shares its palette/type by repeating
// the small subset of CSS these simple pages need).

function shell(title, bodyHtml) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Road to 140.6</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{
  --bg:#f3f4f1; --surface:#ffffff; --ink:#16211f; --muted:#5f6a67; --line:#d5dad6;
  --accent:#0e6b72; --accent-soft:#dcecec;
  --good:#3e8a5a; --bad:#b53a2c;
  --display:"Barlow Condensed","Arial Narrow",Impact,sans-serif;
  --body:"IBM Plex Sans","Helvetica Neue",Arial,sans-serif;
  --mono:"IBM Plex Mono",Menlo,Consolas,monospace;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --bg:#101715; --surface:#18211f; --ink:#e6ebe8; --muted:#9aa5a1; --line:#2c3835;
    --accent:#4fb3b8; --accent-soft:#173437; --good:#62b57e; --bad:#e0604f;
  }
}
:root[data-theme="dark"]{
  --bg:#101715; --surface:#18211f; --ink:#e6ebe8; --muted:#9aa5a1; --line:#2c3835;
  --accent:#4fb3b8; --accent-soft:#173437; --good:#62b57e; --bad:#e0604f;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--body);font-size:16px;line-height:1.6}
main{max-width:680px;margin:0 auto;padding:48px 24px 80px}
h1{font-family:var(--display);font-weight:600;font-size:clamp(32px,6vw,48px);text-transform:uppercase;margin:0 0 6px;letter-spacing:.005em}
h2{font-family:var(--display);font-weight:600;font-size:22px;margin:34px 0 8px}
p,li{max-width:64ch}
.eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
a{color:var(--accent)}
.card{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:22px 24px;margin-top:20px}
.pill{display:inline-block;font-family:var(--mono);font-size:12px;padding:3px 9px;border-radius:3px;letter-spacing:.03em}
.pill.good{background:color-mix(in srgb,var(--good) 18%,transparent);color:var(--good)}
.pill.bad{background:color-mix(in srgb,var(--bad) 18%,transparent);color:var(--bad)}
footer{margin-top:60px;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);font-size:13px;font-family:var(--mono)}
</style>
</head>
<body>
<main>
${bodyHtml}
<footer><a href="/">im.burkeruder.ai</a> — Burke Ruder's Ironman training dashboard.</footer>
</main>
</body>
</html>`;
}

export function renderPrivacyPage() {
  return shell(
    "Privacy Policy",
    `<div class="eyebrow">Last updated 2026-09-06</div>
<h1>Privacy Policy</h1>
<p>This is a single-user personal training dashboard built and used by Burke Ruder to plan and track his own Ironman training. It is not a commercial product, and it does not have other users.</p>

<h2>What data this app uses</h2>
<p>This app connects to fitness and health services Burke has authorized — currently Strava and, once connected, Oura — solely to read his own training and health data (activities, heart rate, sleep, readiness, and similar metrics) and use it to generate and adjust his own training plan.</p>

<h2>What's stored</h2>
<p>Planned and completed training sessions, daily readiness check-ins (Oura scores, sleep hours, Garmin readiness, weight, alcohol log), and OAuth tokens needed to keep the Oura connection alive are stored in a Cloudflare D1 database dedicated to this app. Nothing here is sold, shared, or used for anything other than running this dashboard and plan.</p>

<h2>Third parties</h2>
<p>Data is pulled from Strava's and Oura's APIs under Burke's own authorization with those services. This app does not send his data to any other third party, does not use it for advertising, and does not use it to train any model beyond what a coaching session directly reasons about to plan his training.</p>

<h2>Data removal</h2>
<p>Because this is a single-user app run by its own subject, removal is simple: Burke can revoke access from Oura's or Strava's own connected-apps settings at any time, which stops this app from pulling any further data, and can ask for the stored data to be deleted from the D1 database directly (it's his own infrastructure).</p>

<h2>Contact</h2>
<p>burke.ruder@gmail.com</p>`
  );
}

export function renderTermsPage() {
  return shell(
    "Terms of Service",
    `<div class="eyebrow">Last updated 2026-09-06</div>
<h1>Terms of Service</h1>
<p>This is a personal, single-user application. Burke Ruder built it and is its only user. There is no signup, no account creation for anyone else, and no service being offered to the public.</p>

<h2>What it does</h2>
<p>The app reads training and health data from services Burke connects (Strava, Oura) and uses it to plan, adjust, and track his own Ironman training. It is provided as-is, with no uptime guarantee, no warranty, and no support commitment beyond Burke's own maintenance of it.</p>

<h2>No liability</h2>
<p>This app is a training-planning aid, not medical or professional coaching advice. Burke uses his own judgment (and that of any real coach or doctor he consults) for training and health decisions. The app's author is not liable for outcomes from following its suggestions.</p>

<h2>Changes</h2>
<p>Since this is a personal tool, these terms may change at any time without notice as the app evolves.</p>

<h2>Contact</h2>
<p>burke.ruder@gmail.com</p>`
  );
}

function esc(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function renderOuraConnectedPage(ok, detail) {
  const pill = ok ? `<span class="pill good">connected</span>` : `<span class="pill bad">error</span>`;
  return shell(
    "Oura",
    `<div class="eyebrow">Oura connection</div>
<h1>${ok ? "Connected" : "Connection failed"}</h1>
<div class="card">
  <p>${pill}</p>
  <p>${esc(detail)}</p>
  ${ok ? `<p>The dashboard will pull readiness and sleep automatically each morning (~7:30am CT) from now on. No further action needed.</p>` : ""}
</div>`
  );
}
