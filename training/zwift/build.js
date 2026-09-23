#!/usr/bin/env node
// Generates Zwift custom workouts (.zwo) that match PLAN.md's bike menu for
// the rebuild block. Run `node training/zwift/build.js` from the repo root;
// it rewrites every .zwo in this folder from the definitions below. The
// worker serves them at im.burkeruder.ai/zwift (see worker/zwift.js).
//
// All power targets are fractions of the FTP set in Zwift. Until the 20-min
// test is done, Burke's Zwift FTP should be set to 133 W (Strava's estimate,
// unreliable but the only number we have) so Z2 lands near 85 W and doesn't
// feel like nothing. After the test, change the number in Zwift; these files
// don't need to change.
//
// Zone convention used here (Coggan): Z2 0.56–0.75, tempo 0.76–0.90,
// threshold 0.91–1.05. "Z2 endurance" in the plan = 0.62–0.68 here, which is
// the conversational middle of the zone, not the top of it.

const fs = require("fs");
const path = require("path");

const AUTHOR = "Florence (Burke's coach)";
const TAG = "Road to 140.6";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const min = (m) => Math.round(m * 60);

// Segment builders. Each returns an XML string. `msgs` is [[offsetSeconds, text], ...]
// shown as on-screen text at that offset within the segment.
const text = (msgs = []) => msgs.map(([t, m]) => `\n      <textevent timeoffset="${t}" message="${esc(m)}"/>`).join("");
const warmup = (m, lo, hi, msgs) => `    <Warmup Duration="${min(m)}" PowerLow="${lo}" PowerHigh="${hi}">${text(msgs)}\n    </Warmup>`;
const cooldown = (m, hi, lo, msgs) => `    <Cooldown Duration="${min(m)}" PowerLow="${hi}" PowerHigh="${lo}">${text(msgs)}\n    </Cooldown>`;
const steady = (m, p, opts = {}) => {
  const cad = opts.cadence ? ` Cadence="${opts.cadence}"` : "";
  return `    <SteadyState Duration="${min(m)}" Power="${p}"${cad}>${text(opts.msgs)}\n    </SteadyState>`;
};
const intervals = (n, onM, onP, offM, offP, opts = {}) =>
  `    <IntervalsT Repeat="${n}" OnDuration="${min(onM)}" OnPower="${onP}" OffDuration="${min(offM)}" OffPower="${offP}"${opts.cadence ? ` Cadence="${opts.cadence}"` : ""}>${text(opts.msgs)}\n    </IntervalsT>`;
// FreeRide turns ERG off — the trainer stops controlling resistance and Burke
// picks the effort. This is how a real FTP test has to be run.
const freeride = (m, msgs) => `    <FreeRide Duration="${min(m)}" FlatRoad="1">${text(msgs)}\n    </FreeRide>`;

function file(name, description, segments) {
  return `<workout_file>
  <author>${esc(AUTHOR)}</author>
  <name>${esc(name)}</name>
  <description>${esc(description)}</description>
  <sportType>bike</sportType>
  <tags>
    <tag name="${esc(TAG)}"/>
    <tag name="Rebuild"/>
  </tags>
  <workout>
${segments.join("\n")}
  </workout>
</workout_file>
`;
}

// A Z2 block of `totalMin` minutes: steady 0.65 with a one-minute 0.75
// pickup every 15 minutes so the ride has some texture and the legs remember
// how to change gear. Never above Z2's ceiling.
function z2Block(totalMin, startMsg) {
  const segs = [];
  let left = totalMin;
  let first = true;
  while (left > 0) {
    const chunk = Math.min(14, left);
    segs.push(
      steady(chunk, 0.65, {
        cadence: 88,
        msgs: first ? [[10, startMsg], [min(chunk) - 60, "Could you hold a full conversation right now? If not, you're above Z2. Ease off."]] : [],
      })
    );
    first = false;
    left -= chunk;
    if (left > 0) {
      segs.push(steady(1, 0.75, { cadence: 95, msgs: [[5, "One-minute pickup. Still smooth. Then straight back to steady."]] }));
      left -= 1;
    }
  }
  return segs;
}

const WORKOUTS = {
  "easy-spin-30": {
    name: "Belafonte — Easy Spin 30",
    description: "Recovery spin. 30 minutes, nothing above Z1/low Z2. For yellow days, the day after a long run, or when the calendar only leaves half an hour. Counts.",
    segments: [
      warmup(5, 0.4, 0.55, [[5, "Easy spin. The only goal is to finish feeling better than you started."]]),
      steady(20, 0.55, { cadence: 90, msgs: [[300, "High cadence, low force. Let the legs turn over."], [900, "Ten to go. Still easy."]] }),
      cooldown(5, 0.5, 0.4),
    ],
  },

  "rebuild-z2-45": {
    name: "Belafonte — Z2 Endurance 45",
    description: "Rebuild-block midweek ride, weeks 1–3. 8 min warmup, 25 min steady Z2, 5 min comfortably hard (upper tempo, NOT threshold), 7 min cooldown. Conversational until the last block.",
    segments: [
      warmup(8, 0.45, 0.62, [[10, "Warming up. Spin easy, let the heart rate settle before any work starts."]]),
      steady(25, 0.65, {
        cadence: 88,
        msgs: [
          [10, "Steady Z2 for 25 minutes. Could talk in full sentences the entire time."],
          [600, "Check: are you breathing through your nose? If yes, this is right."],
          [1200, "Halfway. Same effort. The point is to not drift up."],
        ],
      }),
      steady(5, 0.8, { cadence: 90, msgs: [[5, "Five minutes comfortably hard. Tempo, not a test. You should still finish wanting more."]] }),
      cooldown(7, 0.55, 0.4, [[5, "Cooldown. Done. Log it in Strava with the Zwift link on."]]),
    ],
  },

  "rebuild-z2-60": {
    name: "Belafonte — Z2 Endurance 60",
    description: "Rebuild-block midweek ride once 45 feels routine (weeks 4+). 10 min warmup, 42 min Z2 with three 1-minute high-cadence pickups, 8 min cooldown.",
    segments: [
      warmup(10, 0.45, 0.62, [[10, "Ten-minute warmup. Nothing happens fast today."]]),
      ...z2Block(42, "42 minutes of Z2. Sit in, breathe, ride."),
      cooldown(8, 0.55, 0.4),
    ],
  },

  "rebuild-tempo-3x5": {
    name: "Belafonte — Tempo 3×5",
    description: "Rebuild-block quality ride. 10 min warmup, 5 min Z2, then 3 × 5 min at tempo (85% FTP) with 2 min easy between, 4 min Z2, 5 min cooldown. 45 minutes. Only on a green day. Pair with 20 min strength afterward per the plan.",
    segments: [
      warmup(10, 0.45, 0.65, [[10, "Warmup. Ten minutes. The intervals come after the next block."]]),
      steady(5, 0.65, { cadence: 88, msgs: [[10, "Five minutes steady Z2 before the work."]] }),
      intervals(3, 5, 0.85, 2, 0.55, {
        cadence: 90,
        msgs: [
          [5, "Tempo. Five minutes at 85%. Hard-ish, sustainable, you could say short sentences."],
          [280, "Twenty seconds. Hold the cadence."],
          [305, "Two minutes easy. Spin it out."],
        ],
      }),
      steady(4, 0.6, { cadence: 88, msgs: [[5, "Four minutes Z2. Let it settle."]] }),
      cooldown(5, 0.55, 0.4, [[5, "Cooldown. Strength next if it's on the orders."]]),
    ],
  },

  "ftp-test-20": {
    name: "Belafonte — FTP Test (20 min)",
    description: "The 20-minute FTP test from the plan. 10 min warmup, 3 × 1 min openers, 4 min easy, then 20 MINUTES ALL-OUT WITH ERG OFF (free ride — you choose the gear and effort), 10 min cooldown. Zwift will offer to update your FTP to 95% of the 20-min average. Accept it. Green day only; zero drinks the night before.",
    segments: [
      warmup(10, 0.45, 0.65, [[10, "FTP test day. Warm up properly — ten full minutes."]]),
      intervals(3, 1, 0.95, 1, 0.5, { cadence: 95, msgs: [[5, "One-minute opener. Brisk, not sprinting."], [65, "Easy minute."]] }),
      steady(4, 0.55, { cadence: 85, msgs: [[10, "Four easy minutes. Drink. Breathe. Pick the gear you'll start the test in."], [200, "Test starts in 40 seconds. Start at an effort you think you can hold for 20 minutes, not one you hope to."]] }),
      freeride(20, [
        [3, "GO. 20 minutes. ERG is off — you control it. Start conservative."],
        [300, "5 min. If you can lift it slightly, lift it. If not, hold."],
        [600, "Halfway. This should feel hard and steady, not desperate."],
        [900, "5 to go. Now you can start emptying the tank."],
        [1080, "Two minutes. Everything you have left."],
        [1170, "Thirty seconds."],
      ]),
      cooldown(10, 0.5, 0.35, [[5, "Done. Accept Zwift's FTP update. Spin easy for ten. Log the number in the check-in."]]),
    ],
  },

  "ftp-test-plus-z2-90": {
    name: "Belafonte — FTP Test + Z2 (90 min)",
    description: "For a Saturday when the long ride slot is the only green-day slot left for the test. The full 20-min FTP test (ERG off during the 20), then 35 min of easy Z2 to still bank the long-ride time, 10 min cooldown. 90 minutes total. Do the test first while fresh; everything after it is genuinely easy.",
    segments: [
      warmup(10, 0.45, 0.65, [[10, "Long day. Test first, then an easy hour. Warm up properly."]]),
      intervals(3, 1, 0.95, 1, 0.5, { cadence: 95, msgs: [[5, "One-minute opener. Brisk, not sprinting."], [65, "Easy minute."]] }),
      steady(4, 0.55, { cadence: 85, msgs: [[10, "Four easy minutes. Drink. Pick your starting gear."], [200, "Test in 40 seconds. Start at what you can hold, not what you hope."]] }),
      freeride(20, [
        [3, "GO. 20 minutes. ERG off. Start conservative."],
        [300, "5 min. Lift slightly if you can."],
        [600, "Halfway. Hard and steady."],
        [900, "5 to go. Start emptying it."],
        [1080, "Two minutes."],
        [1170, "Thirty seconds."],
      ]),
      steady(6, 0.45, { cadence: 85, msgs: [[5, "Test done. Accept the FTP update when Zwift offers it. Six minutes very easy."]] }),
      ...z2Block(35, "35 minutes Z2. This is the long-ride part. Eat something. Talk to someone."),
      cooldown(10, 0.55, 0.4, [[5, "Cooldown. Ten minutes, then the 10-minute jog if the orders say so."]]),
    ],
  },
};

// Long rides for the rebuild block: 75 → 180 min, +15/wk when it happens.
for (const total of [75, 90, 105, 120, 135, 150, 165, 180]) {
  const body = total - 20; // 10 warmup + 10 cooldown
  WORKOUTS[`long-z2-${total}`] = {
    name: `Belafonte — Long Ride Z2 ${total}`,
    description: `Rebuild-block long ride, ${total} minutes. 10 min warmup, ${body} min Z2 with a 1-minute pickup every 15, 10 min cooldown. Bottle with carbs from minute 20. Then the 10-minute jog straight off the bike if the orders say so. Conversational the whole way — the long ride is the week's most valuable session and the one that should feel the least heroic.`,
    segments: [
      warmup(10, 0.45, 0.62, [[10, `Long ride. ${total} minutes. Start slower than feels necessary.`], [480, "Drink now and every 15 minutes from here."]]),
      ...z2Block(body, `${body} minutes of Z2. Settle in. Eat by minute 20, then every 30.`),
      cooldown(10, 0.55, 0.4, [[5, "Cooldown. Ten minutes. Then shoes on for the jog, or don't — either is on the orders."]]),
    ],
  };
}

const outDir = __dirname;
let n = 0;
for (const [slug, w] of Object.entries(WORKOUTS)) {
  fs.writeFileSync(path.join(outDir, `${slug}.zwo`), file(w.name, w.description, w.segments));
  n++;
}
fs.writeFileSync(
  path.join(outDir, "index.json"),
  JSON.stringify(
    Object.entries(WORKOUTS).map(([slug, w]) => ({ slug, name: w.name, description: w.description })),
    null,
    2
  )
);
console.log(`wrote ${n} .zwo files + index.json to ${outDir}`);
