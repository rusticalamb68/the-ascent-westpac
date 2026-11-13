// The practice dataset: a fictional alpine resort company. Shared by the browser
// (which loads it into DuckDB-WASM) and by the build script that computes answers.

export type Col = { name: string; type: string; note?: string };
export type TableDef = {
  name: string;
  about: string;
  columns: Col[];
  hidden?: boolean; // loaded, but not shown in the schema browser
  staging?: boolean; // only used to build another table, then dropped
};

export const TABLES: TableDef[] = [
  {
    name: 'resorts',
    about: 'The five resorts run by Kea Peak Alpine Co.',
    columns: [
      { name: 'resort_id', type: 'INTEGER' },
      { name: 'resort_name', type: 'VARCHAR' },
      { name: 'region', type: 'VARCHAR' },
      { name: 'base_elevation_m', type: 'INTEGER' },
      { name: 'summit_elevation_m', type: 'INTEGER' },
      { name: 'opened_year', type: 'INTEGER' },
    ],
  },
  {
    name: 'lifts',
    about: 'Every lift at every resort.',
    columns: [
      { name: 'lift_id', type: 'INTEGER' },
      { name: 'resort_id', type: 'INTEGER' },
      { name: 'lift_name', type: 'VARCHAR' },
      { name: 'lift_type', type: 'VARCHAR', note: 'chairlift, gondola, t-bar, magic carpet' },
      { name: 'capacity_per_hour', type: 'INTEGER' },
      { name: 'vertical_m', type: 'INTEGER' },
      { name: 'installed_year', type: 'INTEGER' },
    ],
  },
  {
    name: 'guests',
    about: 'Registered guests, as recorded today.',
    columns: [
      { name: 'guest_id', type: 'INTEGER' },
      { name: 'first_name', type: 'VARCHAR' },
      { name: 'last_name', type: 'VARCHAR' },
      { name: 'home_region', type: 'VARCHAR' },
      { name: 'country', type: 'VARCHAR', note: 'NZ or AU' },
      { name: 'signup_date', type: 'DATE' },
      { name: 'skill_level', type: 'VARCHAR', note: 'beginner, intermediate, advanced, expert' },
      { name: 'birth_year', type: 'INTEGER' },
    ],
  },
  {
    name: 'guests_snapshot',
    about: 'Guest records as they stood on 1 July 2026.',
    columns: [
      { name: 'guest_id', type: 'INTEGER' },
      { name: 'home_region', type: 'VARCHAR' },
      { name: 'skill_level', type: 'VARCHAR' },
    ],
  },
  {
    name: 'passes',
    about: 'Lift passes sold for the 2026 season (13 June to 27 September).',
    columns: [
      { name: 'pass_id', type: 'INTEGER' },
      { name: 'guest_id', type: 'INTEGER' },
      { name: 'resort_id', type: 'INTEGER' },
      { name: 'pass_type', type: 'VARCHAR', note: 'day, multi-day, season' },
      { name: 'purchase_date', type: 'DATE' },
      { name: 'valid_from', type: 'DATE' },
      { name: 'valid_to', type: 'DATE' },
      { name: 'price_nzd', type: 'DECIMAL(8,2)' },
    ],
  },
  {
    name: 'lift_scans',
    about: 'One row each time a guest passes through a lift gate.',
    columns: [
      { name: 'scan_id', type: 'INTEGER' },
      { name: 'guest_id', type: 'INTEGER' },
      { name: 'lift_id', type: 'INTEGER' },
      { name: 'scan_ts', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'rentals',
    about: 'Gear hire. Spend is days × daily_rate.',
    columns: [
      { name: 'rental_id', type: 'INTEGER' },
      { name: 'guest_id', type: 'INTEGER' },
      { name: 'resort_id', type: 'INTEGER' },
      { name: 'rental_date', type: 'DATE' },
      { name: 'item', type: 'VARCHAR' },
      { name: 'days', type: 'INTEGER' },
      { name: 'daily_rate', type: 'DECIMAL(6,2)' },
    ],
  },
  {
    name: 'lessons',
    about: 'Ski and snowboard lessons.',
    columns: [
      { name: 'lesson_id', type: 'INTEGER' },
      { name: 'guest_id', type: 'INTEGER' },
      { name: 'resort_id', type: 'INTEGER' },
      { name: 'lesson_date', type: 'DATE' },
      { name: 'lesson_type', type: 'VARCHAR', note: 'group, private' },
      { name: 'discipline', type: 'VARCHAR', note: 'ski, snowboard' },
      { name: 'instructor', type: 'VARCHAR' },
      { name: 'price_nzd', type: 'DECIMAL(8,2)' },
    ],
  },
  {
    name: 'weather',
    about: 'One observation per resort per day of the season.',
    columns: [
      { name: 'resort_id', type: 'INTEGER' },
      { name: 'obs_date', type: 'DATE' },
      { name: 'snowfall_cm', type: 'INTEGER' },
      { name: 'temp_c', type: 'DECIMAL(4,1)' },
      { name: 'wind_kmh', type: 'INTEGER' },
      { name: 'lifts_open', type: 'INTEGER' },
      { name: 'status', type: 'VARCHAR', note: 'open, wind hold, closed' },
    ],
  },
  {
    name: 'lift_events',
    about: 'Lift telemetry. The payload column is nested data.',
    columns: [
      { name: 'event_id', type: 'INTEGER' },
      { name: 'lift_id', type: 'INTEGER' },
      { name: 'event_ts', type: 'TIMESTAMP' },
      {
        name: 'payload',
        type: 'STRUCT',
        note: 'type, cause, duration_min, operator {name, shift}, note, sensors [{id, kind, reading}]',
      },
    ],
  },
  {
    name: '_events',
    about: '',
    staging: true,
    columns: [
      { name: 'event_id', type: 'INTEGER' },
      { name: 'lift_id', type: 'INTEGER' },
      { name: 'event_ts', type: 'TIMESTAMP' },
      { name: 'event_type', type: 'VARCHAR' },
      { name: 'cause', type: 'VARCHAR' },
      { name: 'duration_min', type: 'INTEGER' },
      { name: 'operator_name', type: 'VARCHAR' },
      { name: 'shift', type: 'VARCHAR' },
      { name: 'note', type: 'VARCHAR' },
    ],
  },
  {
    name: '_sensors',
    about: '',
    staging: true,
    columns: [
      { name: 'event_id', type: 'INTEGER' },
      { name: 'sensor_id', type: 'VARCHAR' },
      { name: 'kind', type: 'VARCHAR' },
      { name: 'reading', type: 'DOUBLE' },
    ],
  },
  {
    name: 'yeti_sightings',
    about: 'Unofficial.',
    hidden: true,
    columns: [
      { name: 'sighting_id', type: 'INTEGER' },
      { name: 'resort_id', type: 'INTEGER' },
      { name: 'seen_on', type: 'DATE' },
      { name: 'witness', type: 'VARCHAR' },
      { name: 'note', type: 'VARCHAR' },
    ],
  },
];

// CSV file each loaded table comes from (lift_events is built from the two staging tables).
export const CSV_FOR: Record<string, string> = {
  resorts: 'resorts.csv',
  lifts: 'lifts.csv',
  guests: 'guests.csv',
  guests_snapshot: 'guests_snapshot.csv',
  passes: 'passes.csv',
  lift_scans: 'lift_scans.csv',
  rentals: 'rentals.csv',
  lessons: 'lessons.csv',
  weather: 'weather.csv',
  _events: 'lift_events_flat.csv',
  _sensors: 'lift_event_sensors.csv',
  yeti_sightings: 'yeti_sightings.csv',
};

export const CSV_FILES: string[] = Object.values(CSV_FOR);

/** SQL statements that build the whole database once the CSV files are registered. */
export function loadStatements(): string[] {
  const out: string[] = [
    // Core engine only: never try to download extensions at runtime.
    'SET autoinstall_known_extensions = false',
    'SET autoload_known_extensions = false',
  ];
  for (const t of TABLES) {
    const file = CSV_FOR[t.name];
    if (!file) continue;
    const cols = t.columns.map((c) => `'${c.name}': '${c.type}'`).join(', ');
    out.push(`CREATE TABLE ${t.name} AS SELECT * FROM read_csv('${file}', header = true, columns = {${cols}})`);
  }
  out.push(`CREATE TABLE lift_events AS
SELECT e.event_id, e.lift_id, e.event_ts,
  {'type': e.event_type, 'cause': e.cause, 'duration_min': e.duration_min,
   'operator': {'name': e.operator_name, 'shift': e.shift},
   'note': e.note,
   'sensors': (SELECT list({'id': s.sensor_id, 'kind': s.kind, 'reading': s.reading} ORDER BY s.sensor_id, s.kind)
               FROM _sensors s WHERE s.event_id = e.event_id)} AS payload
FROM _events e ORDER BY e.event_ts, e.event_id`);
  out.push('DROP TABLE _events', 'DROP TABLE _sensors');
  // A few Snowflake functions the engine lacks, so familiar habits still work.
  out.push(
    'CREATE MACRO iff(c, a, b) AS CASE WHEN c THEN a ELSE b END',
    'CREATE MACRO nvl(a, b) AS coalesce(a, b)',
    'CREATE MACRO nvl2(a, b, c) AS CASE WHEN a IS NOT NULL THEN b ELSE c END',
    'CREATE MACRO zeroifnull(a) AS coalesce(a, 0)',
    'CREATE MACRO div0(a, b) AS CASE WHEN b = 0 THEN 0 ELSE a / b END',
    'CREATE MACRO to_varchar(a) AS CAST(a AS VARCHAR)',
    'CREATE MACRO to_date(a) AS CAST(a AS DATE)',
    `CREATE MACRO dateadd(part, n, d) AS d + CASE lower(part)
       WHEN 'year' THEN to_years(n) WHEN 'quarter' THEN to_months(3 * n) WHEN 'month' THEN to_months(n)
       WHEN 'week' THEN to_days(7 * n) WHEN 'day' THEN to_days(n) WHEN 'hour' THEN to_hours(n)
       WHEN 'minute' THEN to_minutes(n) ELSE to_seconds(n) END`,
  );
  return out;
}

export type Prepared = { ok: true; sql: string } | { ok: false; error: string };

/**
 * Checks that the text is one read-only statement and applies a light Snowflake
 * compatibility pass (unquoted date parts such as DATEDIFF(day, a, b)).
 */
export function prepareSql(input: string): Prepared {
  // Strip comments and find statement boundaries, respecting quotes.
  let out = '';
  let i = 0;
  const n = input.length;
  let semis = 0;
  let afterSemi = false;
  while (i < n) {
    const ch = input[i];
    const two = input.slice(i, i + 2);
    if (two === '--') {
      while (i < n && input[i] !== '\n') i++;
      continue;
    }
    if (two === '/*') {
      const end = input.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      out += ' ';
      continue;
    }
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < n) {
        if (input[j] === ch) {
          if (input[j + 1] === ch) { j += 2; continue; }
          break;
        }
        j++;
      }
      if (afterSemi) return { ok: false, error: 'Run one statement at a time.' };
      out += input.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch === ';') { semis++; afterSemi = true; i++; continue; }
    if (afterSemi && !/\s/.test(ch)) return { ok: false, error: 'Run one statement at a time.' };
    if (!afterSemi) out += ch;
    i++;
  }
  let sql = out.trim();
  if (!sql) return { ok: false, error: 'Write a query first.' };
  if (!/^(\(|\s)*(select|with)\b/i.test(sql)) {
    return { ok: false, error: 'Only SELECT queries run here (they can start with WITH).' };
  }
  void semis;
  sql = sql.replace(
    /\b(datediff|dateadd|date_trunc|datetrunc|date_part|datepart)\s*\(\s*(year|quarter|month|week|day|hour|minute|second)s?\s*,/gi,
    (_m, fn: string, part: string) => `${fn}('${part.toLowerCase()}',`,
  );
  return { ok: true, sql };
}

/** Wraps a query so every column comes back as text, in the original row order. */
export function wrapForValues(sql: string, nCols: number): string {
  const names = Array.from({ length: nCols }, (_, i) => `c${i}`);
  return `SELECT ${names.map((c) => `CAST(${c} AS VARCHAR) AS ${c}`).join(', ')} FROM (\n${sql}\n) AS __q(${names.join(', ')})`;
}
