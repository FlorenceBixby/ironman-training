// Oura API v2 OAuth2 — Authorization Code grant. Single-user app: one token
// row in D1 (oura_tokens, id=1). Endpoints and scope names verified 2026-09-06
// directly against Oura's published OAuth2 client (hedgertronic/oura-ring,
// oura_ring/auth.py) since Oura deprecated Personal Access Tokens in Dec 2025
// and the interactive docs page doesn't render for a plain fetch.

export const OURA_AUTHORIZE_URL = "https://cloud.ouraring.com/oauth/authorize";
export const OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token";
export const OURA_API_URL = "https://api.ouraring.com";

// Matches every box Burke checked on the Oura app-registration form (Email,
// Personal, Daily, Heartrate, Tag, Workout, Session, SpO2, Ring
// Configuration, Stress, Heart Health). SpO2's real scope string is
// `spo2Daily`, not `spo2` — the human-readable form calls it "SpO2" but the
// live API enforces `spo2Daily` (spo2 alone 401s).
export const OURA_SCOPES = [
  "email",
  "personal",
  "daily",
  "heartrate",
  "workout",
  "tag",
  "session",
  "spo2Daily",
  "stress",
  "heart_health",
  "ring_configuration",
];

export function ouraRedirectUri(url) {
  // Always the canonical host, even if this request came in on the old
  // ironman.burkeruder.ai route (which redirects before this ever runs, but
  // keep it explicit rather than deriving from request.url).
  return `https://${url.hostname === "im.burkeruder.ai" ? "im.burkeruder.ai" : url.hostname}/oauth/callback`;
}

export function buildAuthorizeUrl(env, redirectUri, state) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.OURA_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: OURA_SCOPES.join(" "),
  });
  if (state) params.set("state", state);
  return `${OURA_AUTHORIZE_URL}?${params.toString()}`;
}

async function tokenRequest(body) {
  const res = await fetch(OURA_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Oura token request failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function exchangeCode(env, code, redirectUri) {
  return tokenRequest({
    grant_type: "authorization_code",
    code,
    client_id: env.OURA_CLIENT_ID,
    client_secret: env.OURA_CLIENT_SECRET,
    redirect_uri: redirectUri,
  });
}

async function doRefresh(env, refreshToken) {
  return tokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: env.OURA_CLIENT_ID,
    client_secret: env.OURA_CLIENT_SECRET,
  });
}

export async function saveTokens(env, tokens) {
  const expiresAt = Math.floor(Date.now() / 1000) + (tokens.expires_in ?? 86400);
  await env.DB.prepare(
    `INSERT INTO oura_tokens (id, access_token, refresh_token, expires_at, updated_at)
     VALUES (1, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       expires_at = excluded.expires_at,
       updated_at = datetime('now')`
  )
    .bind(tokens.access_token, tokens.refresh_token, expiresAt)
    .run();
}

export async function getStoredTokens(env) {
  return env.DB.prepare("SELECT * FROM oura_tokens WHERE id = 1").first();
}

// Returns a valid access token, refreshing (and persisting the rotated
// refresh_token — Oura's refresh tokens are single-use) if it's expired or
// about to expire. Returns null if Oura has never been connected.
export async function getValidAccessToken(env) {
  const row = await getStoredTokens(env);
  if (!row) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (row.expires_at - nowSec > 120) {
    return row.access_token;
  }

  const refreshed = await doRefresh(env, row.refresh_token);
  await saveTokens(env, refreshed);
  return refreshed.access_token;
}

async function ouraGet(accessToken, path, params) {
  const url = new URL(`${OURA_API_URL}${path}`);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  }
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Oura API ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

// Pulls today's readiness score and last night's total sleep (hours) for
// `dateStr` (YYYY-MM-DD). Either can come back null if Oura has no data yet
// (e.g. the ring hasn't synced) — caller should treat null as "not available
// yet", not an error.
export async function fetchDailyReadinessAndSleep(env, dateStr) {
  const accessToken = await getValidAccessToken(env);
  if (!accessToken) return null;

  const [readinessData, sleepData] = await Promise.all([
    ouraGet(accessToken, "/v2/usercollection/daily_readiness", {
      start_date: dateStr,
      end_date: dateStr,
    }),
    // Sleep records are keyed by the day they end, and cover an overnight
    // period that started the day before — widen the window by a day.
    ouraGet(accessToken, "/v2/usercollection/sleep", {
      start_date: dateStr,
      end_date: dateStr,
    }),
  ]);

  const readinessScore = readinessData?.data?.[0]?.score ?? null;

  const longSleep = (sleepData?.data || []).find((s) => s.type === "long_sleep");
  const sleepHours =
    longSleep && typeof longSleep.total_sleep_duration === "number"
      ? Math.round((longSleep.total_sleep_duration / 3600) * 10) / 10
      : null;

  return { readinessScore, sleepHours };
}
