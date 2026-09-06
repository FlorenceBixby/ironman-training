// Apple Health webhook — pushed to by an iOS Shortcuts "Personal Automation"
// running on Burke's phone (not pulled by us; Apple Health has no cloud API,
// so the phone has to push). Auth is a single shared-secret bearer token
// (APPLE_HEALTH_WEBHOOK_TOKEN, a Worker secret) checked against the
// `Authorization: Bearer <token>` header — this only needs to stop random
// internet POSTs hitting a guessable URL, not defend against a targeted
// attacker, so no per-request signing/nonce/etc.
//
// Only three HealthKit types reliably sync from Garmin/Renpho into Apple
// Health and are worth wiring up: resting heart rate, sleep, and weight
// (Renpho's Body Mass). Garmin's actual Training Readiness score, HRV
// Status, Body Battery, stress score, VO2max, and Training Load are
// Garmin-exclusive and do NOT sync to Apple Health — this endpoint will
// never carry a "Training Readiness" number. See training/README.md.

// Checks the request's Authorization header against the configured secret.
// Returns true if authorized. No-ops to "unauthorized" (not "misconfigured")
// if the secret hasn't been set yet, so a missing secret fails closed.
export function isAuthorizedAppleHealthRequest(request, env) {
  if (!env.APPLE_HEALTH_WEBHOOK_TOKEN) return false;
  const auth = request.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  return match[1] === env.APPLE_HEALTH_WEBHOOK_TOKEN;
}

// Upserts whichever subset of { resting_heart_rate, sleep_hours, weight } is
// present into that date's checkins row, without clobbering fields another
// source (Oura's automatic pull, or a manual /api/checkin) already wrote for
// the same day — same COALESCE-on-conflict pattern as upsertOuraReadiness in
// worker/index.js. A field omitted from the payload stays untouched; a field
// explicitly sent as null also stays untouched (COALESCE only overwrites
// when the incoming value is non-null).
export async function upsertAppleHealthCheckin(env, date, fields) {
  const { resting_heart_rate, sleep_hours, weight } = fields;
  await env.DB.prepare(
    `INSERT INTO checkins (date, resting_heart_rate, sleep_hours, weight)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       resting_heart_rate = COALESCE(excluded.resting_heart_rate, checkins.resting_heart_rate),
       sleep_hours = COALESCE(excluded.sleep_hours, checkins.sleep_hours),
       weight = COALESCE(excluded.weight, checkins.weight)`
  )
    .bind(date, resting_heart_rate ?? null, sleep_hours ?? null, weight ?? null)
    .run();
}
