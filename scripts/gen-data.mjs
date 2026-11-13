// Generates the synthetic Kea Peak Alpine Co. dataset as CSV files.
// Deterministic: the same seed always produces the same files.
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(import.meta.dirname, '../public/data');
fs.mkdirSync(OUT, { recursive: true });

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261112);
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const weighted = (pairs) => {
  const total = pairs.reduce((s, p) => s + p[1], 0);
  let r = rnd() * total;
  for (const [v, w] of pairs) { if ((r -= w) < 0) return v; }
  return pairs[pairs.length - 1][0];
};
const DAY = 86400000;
const d = (s) => new Date(s + 'T00:00:00Z');
const iso = (dt) => dt.toISOString().slice(0, 10);
const addDays = (dt, n) => new Date(dt.getTime() + n * DAY);
const csvCell = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
function write(name, header, rows) {
  const text = [header.join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n') + '\n';
  fs.writeFileSync(path.join(OUT, name + '.csv'), text);
  console.log(name.padEnd(22), String(rows.length).padStart(6), 'rows', (text.length / 1024).toFixed(0).padStart(5), 'KB');
}

const SEASON_START = d('2026-06-13');
const SEASON_DAYS = 107; // to 2026-09-27

// ---------------------------------------------------------------- resorts
const resorts = [
  [1, 'Kea Peak', 'Canterbury', 1250, 2180, 1972],
  [2, 'Tussock Basin', 'Otago', 1100, 1960, 1985],
  [3, 'Mount Harrier', 'Tasman', 1320, 2075, 1994],
  [4, 'Blue Tarn', 'Otago', 1480, 2310, 2008],
  [5, 'Pipit Ridge', 'Central Plateau', 1600, 2250, 1961],
];
write('resorts', ['resort_id', 'resort_name', 'region', 'base_elevation_m', 'summit_elevation_m', 'opened_year'], resorts);

// ------------------------------------------------------------------ lifts
const lifts = [
  [1, 1, 'Kea Express', 'gondola', 2400, 620, 2015],
  [2, 1, 'Scree Quad', 'chairlift', 2000, 410, 2004],
  [3, 1, 'Ridge Six', 'chairlift', 2800, 530, 2019],
  [4, 1, 'Fledgling Carpet', 'magic carpet', 900, 35, 2011],
  [5, 2, 'Tussock Triple', 'chairlift', 1500, 380, 1998],
  [6, 2, 'Basin T-Bar', 't-bar', 1000, 290, 1987],
  [7, 2, 'Snowgrass Quad', 'chairlift', 2200, 450, 2012],
  [8, 2, 'Hare Carpet', 'magic carpet', 800, 28, 2016],
  [9, 3, 'Harrier Quad', 'chairlift', 2000, 470, 2001],
  [10, 3, 'Hawk T-Bar', 't-bar', 1100, 340, 1994],
  [11, 3, 'Talon Double', 'chairlift', 1200, 300, 1996],
  [12, 3, 'Updraft Six', 'chairlift', 3000, 560, 2021],
  [13, 4, 'Tarn Gondola', 'gondola', 2600, 700, 2018],
  [14, 4, 'Moraine Quad', 'chairlift', 2100, 430, 2009],
  [15, 4, 'Cirque Express', 'chairlift', 2700, 590, 2022],
  [16, 4, 'Tadpole Carpet', 'magic carpet', 850, 30, 2010],
  [17, 5, 'Pipit Double', 'chairlift', 1100, 310, 1975],
  [18, 5, 'Ridge T-Bar', 't-bar', 950, 360, 1968],
  [19, 5, 'Lookout Quad', 'chairlift', 2000, 440, 2003],
  [20, 5, 'Chick Carpet', 'magic carpet', 800, 25, 2014],
];
write('lifts', ['lift_id', 'resort_id', 'lift_name', 'lift_type', 'capacity_per_hour', 'vertical_m', 'installed_year'], lifts);
const liftsByResort = {};
for (const l of lifts) (liftsByResort[l[1]] ||= []).push(l);

// ---------------------------------------------------------------- weather
const weather = [];
const statusOn = {}; // `${resort}|${date}` -> status
for (const r of resorts) {
  const harsh = (r[4] - 1900) / 400; // higher summits are windier
  for (let i = 0; i < SEASON_DAYS; i++) {
    const date = iso(addDays(SEASON_START, i));
    const snowing = rnd() < 0.38;
    const snowfall = snowing ? Math.min(48, Math.round(-Math.log(1 - rnd()) * 9) + 1) : 0;
    const temp = Math.round((-6 + rnd() * 9 - (snowing ? 1.5 : 0)) * 10) / 10;
    const wind = Math.max(3, Math.round(12 + rnd() * 45 + (rnd() < 0.12 + harsh * 0.05 ? 30 + rnd() * 25 : 0)));
    let status = 'open';
    if (snowfall >= 40 || rnd() < 0.012) status = 'closed';
    else if (wind >= 70) status = 'wind hold';
    const nLifts = liftsByResort[r[0]].length;
    const liftsOpen = status === 'closed' ? 0 : status === 'wind hold' ? int(1, 2) : nLifts - (rnd() < 0.15 ? 1 : 0);
    weather.push([r[0], date, snowfall, temp.toFixed(1), wind, liftsOpen, status]);
    statusOn[r[0] + '|' + date] = status;
  }
}
write('weather', ['resort_id', 'obs_date', 'snowfall_cm', 'temp_c', 'wind_kmh', 'lifts_open', 'status'], weather);

// ----------------------------------------------------------------- guests
const FIRST = ['Aroha', 'Ben', 'Charlotte', 'Daniel', 'Emma', 'Finn', 'Grace', 'Hemi', 'Isla', 'Jack', 'Kiri', 'Liam', 'Mia', 'Nikau', 'Olivia', 'Piripi', 'Quinn', 'Ruby', 'Sam', 'Tane', 'Una', 'Violet', 'Wiremu', 'Xanthe', 'Yasmin', 'Zoe', 'Anika', 'Callum', 'Dev', 'Eleni', 'Hana', 'Jonah', 'Leilani', 'Mateo', 'Ngaio', 'Oscar', 'Priya', 'Rewi', 'Sofia', 'Tui'];
const LAST = ['Aperahama', 'Bennett', 'Chen', 'Douglas', 'Edwards', 'Faleolo', 'Gupta', 'Harris', 'Ihaka', 'Jones', 'Kumar', 'Lee', 'MacDonald', 'Ngata', 'OBrien', 'Patel', 'Qureshi', 'Rangi', 'Smith', 'Tamihana', 'Urquhart', 'Vaifale', 'Walker', 'Xu', 'Young', 'Zhang', 'Anderson', 'Brown', 'Clarke', 'Dalton', 'Fraser', 'Graham', 'Hohepa', 'Kaur', 'Moana', 'Nguyen', 'Parata', 'Reid', 'Singh', 'Thompson'];
const NZ_REGIONS = [['Auckland', 22], ['Wellington', 14], ['Canterbury', 20], ['Otago', 16], ['Tasman', 7], ['Waikato', 9], ['Bay of Plenty', 7], ['Southland', 5]];
const AU_REGIONS = [['New South Wales', 5], ['Victoria', 5], ['Queensland', 4]];
const SKILLS = [['beginner', 30], ['intermediate', 40], ['advanced', 22], ['expert', 8]];
const SKILL_ORDER = ['beginner', 'intermediate', 'advanced', 'expert'];
const guests = [];
const N_GUESTS = 600;
for (let id = 1; id <= N_GUESTS; id++) {
  const au = rnd() < 0.14;
  const signup = addDays(d('2026-04-01'), int(0, 152)); // to 2026-08-31
  guests.push([1000 + id, pick(FIRST), pick(LAST), weighted(au ? AU_REGIONS : NZ_REGIONS), au ? 'AU' : 'NZ', iso(signup), weighted(SKILLS), int(1952, 2006)]);
}
write('guests', ['guest_id', 'first_name', 'last_name', 'home_region', 'country', 'signup_date', 'skill_level', 'birth_year'], guests);

// A snapshot of guests as they were recorded on 1 July 2026 (for change-detection work)
const snapshot = [];
for (const g of guests) {
  if (g[5] > '2026-07-01') continue;
  let region = g[3], skill = g[6];
  if (rnd() < 0.09) { const i = SKILL_ORDER.indexOf(skill); if (i > 0) skill = SKILL_ORDER[i - 1]; }
  if (rnd() < 0.05) { region = weighted(g[4] === 'AU' ? AU_REGIONS : NZ_REGIONS); }
  if (rnd() < 0.02) continue; // a few records were missing from the snapshot
  snapshot.push([g[0], region, skill]);
}
write('guests_snapshot', ['guest_id', 'home_region', 'skill_level'], snapshot);

// ----------------------------------------------------------------- passes
const DAY_PRICE = { 1: 139, 2: 119, 3: 125, 4: 149, 5: 129 };
const passes = [];
let passId = 50000;
const seasonEnd = addDays(SEASON_START, SEASON_DAYS - 1);
for (const g of guests) {
  const n = weighted([[1, 30], [2, 35], [3, 22], [4, 13]]);
  const home = int(1, 5);
  const signup = d(g[5]);
  for (let k = 0; k < n; k++) {
    const type = weighted([['day', 55], ['multi-day', 30], ['season', 15]]);
    const resort = rnd() < 0.7 ? home : int(1, 5);
    let from, to, price;
    if (type === 'season') {
      from = SEASON_START; to = seasonEnd; price = resort === 4 || resort === 1 ? 1099 : 899;
    } else {
      const earliest = Math.max(0, Math.ceil((signup - SEASON_START) / DAY));
      const len = type === 'day' ? 1 : int(3, 5);
      const start = int(earliest, SEASON_DAYS - len);
      from = addDays(SEASON_START, start); to = addDays(from, len - 1);
      price = type === 'day' ? DAY_PRICE[resort] : Math.round(DAY_PRICE[resort] * len * 0.9);
    }
    let purchase = addDays(from, -int(0, 14));
    if (purchase < signup) purchase = signup;
    passes.push([++passId, g[0], resort, type, iso(purchase), iso(from), iso(to), price.toFixed(2)]);
  }
}
write('passes', ['pass_id', 'guest_id', 'resort_id', 'pass_type', 'purchase_date', 'valid_from', 'valid_to', 'price_nzd'], passes);

// ------------------------------------------------------------- lift scans
const scans = [];
const skiDays = new Set(); // guest|resort|date
for (const p of passes) {
  const [, guestId, resort, type, , from, to] = p;
  const days = [];
  if (type === 'season') {
    // season-pass holders ski in a few runs of consecutive days
    const trips = int(2, 4);
    const signedUp = guests[guestId - 1001][5];
    const earliest = Math.min(SEASON_DAYS - 6, Math.max(0, Math.ceil((d(signedUp) - SEASON_START) / DAY)));
    for (let t = 0; t < trips; t++) {
      const start = int(earliest, SEASON_DAYS - 6);
      const len = int(1, 5);
      for (let i = 0; i < len; i++) days.push(iso(addDays(SEASON_START, start + i)));
    }
  } else {
    for (let dt = d(from); dt <= d(to); dt = addDays(dt, 1)) days.push(iso(dt));
  }
  for (const date of new Set(days)) {
    const key = guestId + '|' + resort + '|' + date;
    if (skiDays.has(key)) continue;
    const status = statusOn[resort + '|' + date];
    if (status === 'closed') continue;
    if (status === 'wind hold' && rnd() < 0.45) continue;
    skiDays.add(key);
    const n = status === 'wind hold' ? int(1, 3) : int(2, 6);
    const opts = liftsByResort[resort];
    for (let i = 0; i < n; i++) {
      const lift = pick(opts);
      const minutes = 9 * 60 + int(0, 7 * 60 - 1);
      const ts = `${date} ${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}`;
      scans.push([guestId, lift[0], ts]);
    }
  }
}
scans.sort((a, b) => (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : a[0] - b[0]));
write('lift_scans', ['scan_id', 'guest_id', 'lift_id', 'scan_ts'], scans.map((s, i) => [700000 + i + 1, ...s]));

// ---------------------------------------------------------------- rentals
const ITEMS = [['skis', 38, 45], ['snowboard', 26, 45], ['boots', 18, 20], ['helmet', 10, 12], ['jacket', 8, 25]];
const rentals = [];
let rentalId = 30000;
const skiDayList = [...skiDays].map((k) => k.split('|'));
for (const [guestId, resort, date] of skiDayList) {
  if (rnd() < 0.2) {
    const k = int(1, 2);
    const chosen = new Set();
    for (let i = 0; i < k; i++) chosen.add(weighted(ITEMS.map((it) => [it, it[1]])));
    for (const it of chosen) rentals.push([++rentalId, Number(guestId), Number(resort), date, it[0], int(1, 3), it[2].toFixed(2)]);
  }
}
rentals.sort((a, b) => (a[3] < b[3] ? -1 : a[3] > b[3] ? 1 : a[0] - b[0]));
rentals.forEach((r, i) => (r[0] = 30001 + i));
write('rentals', ['rental_id', 'guest_id', 'resort_id', 'rental_date', 'item', 'days', 'daily_rate'], rentals);

// ---------------------------------------------------------------- lessons
const INSTRUCTORS = ['Mere Tipoki', 'Jonty Fairweather', 'Sina Leavasa', 'Hugo Brandt', 'Ana Ruiz', 'Tom Whitcombe', 'Kahu Paewai', 'Ingrid Solberg', 'Raj Mehta', 'Bex Carmody'];
const lessons = [];
for (const [guestId, resort, date] of skiDayList) {
  const g = guests[Number(guestId) - 1001];
  const p = g[6] === 'beginner' ? 0.22 : g[6] === 'intermediate' ? 0.09 : 0.03;
  if (rnd() < p) {
    const type = rnd() < 0.7 ? 'group' : 'private';
    const price = type === 'group' ? pick([85, 95, 110]) : pick([240, 280, 320]);
    lessons.push([0, Number(guestId), Number(resort), date, type, rnd() < 0.62 ? 'ski' : 'snowboard', INSTRUCTORS[(Number(resort) * 2 + int(0, 3)) % INSTRUCTORS.length], price.toFixed(2)]);
  }
}
lessons.sort((a, b) => (a[3] < b[3] ? -1 : a[3] > b[3] ? 1 : a[1] - b[1]));
lessons.forEach((r, i) => (r[0] = 9001 + i));
write('lessons', ['lesson_id', 'guest_id', 'resort_id', 'lesson_date', 'lesson_type', 'discipline', 'instructor', 'price_nzd'], lessons);

// ------------------------------------------------- lift events (nested data)
const OPERATORS = ['Wiki Marsh', 'Dan Okafor', 'Jules Petit', 'Hine Rewa', 'Pat Leary', 'Moana Keepa'];
const events = [];
const sensors = [];
let eventId = 8000;
for (let i = 0; i < 420; i++) {
  const lift = pick(lifts);
  const date = iso(addDays(SEASON_START, int(0, SEASON_DAYS - 1)));
  const hour = int(7, 16), minute = int(0, 59);
  const type = weighted([['stoppage', 55], ['maintenance', 25], ['inspection', 20]]);
  const cause = type === 'stoppage' ? weighted([['wind', 40], ['mechanical', 25], ['guest', 25], ['power', 10]]) : null;
  const duration = type === 'stoppage' ? (cause === 'wind' ? int(10, 95) : cause === 'guest' ? int(1, 8) : int(5, 60)) : type === 'maintenance' ? int(30, 180) : int(15, 45);
  const id = ++eventId;
  events.push([id, lift[0], `${date} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`, type, cause, duration, pick(OPERATORS), hour < 12 ? 'AM' : 'PM', null]);
  const n = int(1, 3);
  const kinds = [['W', 'wind'], ['T', 'temp'], ['V', 'vibration']].sort(() => rnd() - 0.5).slice(0, n);
  for (const [prefix, kind] of kinds) {
    const value = kind === 'wind' ? (cause === 'wind' ? int(62, 110) : int(5, 60)) : kind === 'temp' ? Math.round((-9 + rnd() * 12) * 10) / 10 : Math.round((0.1 + rnd() * (cause === 'mechanical' ? 4 : 1.2)) * 100) / 100;
    sensors.push([id, prefix + int(1, 3), kind, value]);
  }
}
events.sort((a, b) => (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : a[0] - b[0]));
// one inspection note hides something a liftie found
const inspections = events.filter((e) => e[3] === 'inspection');
inspections[Math.floor(inspections.length / 2)][8] = 'lost glove found on tower 7';
write('lift_events_flat', ['event_id', 'lift_id', 'event_ts', 'event_type', 'cause', 'duration_min', 'operator_name', 'shift', 'note'], events);
write('lift_event_sensors', ['event_id', 'sensor_id', 'kind', 'reading'], sensors);

// ----------------------------------------------------------- hidden cache
write('yeti_sightings', ['sighting_id', 'resort_id', 'seen_on', 'witness', 'note'], [
  [1, 4, '2026-06-21', 'night groomer', 'Large prints crossing the Cirque bowl at 3am'],
  [2, 4, '2026-07-09', 'ski patrol', 'Something tall watching from the moraine'],
  [3, 1, '2026-07-30', 'lift operator', 'Kea Express cabin 14 arrived with white fur on the seat'],
  [4, 5, '2026-08-12', 'snowmaker', 'Heard humming near the Ridge T-Bar top station'],
  [5, 3, '2026-08-28', 'cafe staff', 'Two flat whites paid for in pine cones'],
  [6, 2, '2026-09-15', 'guest', 'Blurry photo. Honestly could be a hare.'],
]);
