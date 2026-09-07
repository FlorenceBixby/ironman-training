// Shared page chrome for im.burkeruder.ai — palette, type, and the outer
// HTML shell used by "/" (dashboard.js) and "/log" (log.js). Matches
// burkeruder.ai's globals.css / "Exhibit Golf" entry: Life Aquatic palette,
// IBM Plex Mono for utility text, Georgia italic for headings.

export const SHARED_CSS = `
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
.topnav{display:flex;flex-wrap:wrap;gap:18px;margin:26px 0 0;font-size:11px;letter-spacing:.14em;text-transform:uppercase}
.topnav a{color:var(--fg);text-decoration:none;border-bottom:2px solid transparent;padding-bottom:2px}
.topnav a.here,.topnav a:hover{border-bottom-color:var(--accent)}
footer{margin-top:70px;padding-top:22px;border-top:2px solid var(--border);color:var(--muted);font-size:11px}
footer .sign{font-family:var(--serif);font-style:italic;color:var(--seafoam);font-size:13px;margin-top:8px}
a{color:var(--accent)}
`;

export function pageShell({ title, description, body, extraCss = "" }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&display=swap">
<style>${SHARED_CSS}${extraCss}</style>
</head>
<body>
<main>
${body}
  <footer>
    <div>im.burkeruder.ai — a Cloudflare-hosted expedition log. Part of the <a href="https://burkeruder.ai/projects">Exhibit Hall</a> at burkeruder.ai.</div>
    <div class="sign">"We're all very excited about the next expedition." — Team Zissou</div>
    <div style="margin-top:14px">&nbsp;·&nbsp;<a href="/">Chart table</a>&nbsp;·&nbsp;<a href="/log">Ship's log</a>&nbsp;·&nbsp;<a href="/privacy">Privacy</a>&nbsp;·&nbsp;<a href="/terms">Terms</a></div>
  </footer>
</main>
</body>
</html>`;
}
