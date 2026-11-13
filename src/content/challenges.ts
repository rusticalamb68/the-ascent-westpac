// SERVER ONLY. This file contains solutions. Never import it from a client component.

export type Params = Record<string, string | number>;

export type SqlChallenge = {
  id: string;
  camp: string;
  kind: 'sql';
  title: string;
  skill: string;
  difficulty: 1 | 2 | 3;
  points: number;
  ordered: boolean;
  variants: Params[];
  brief: string;
  returns: string;
  starter?: string;
  solution: string;
  hints: [string, string];
  requires?: string;
  snowflakeNote?: string;
};

export type McqChallenge = {
  id: string;
  camp: string;
  kind: 'mcq';
  title: string;
  skill: string;
  difficulty: 1 | 2 | 3;
  points: number;
  brief: string;
  options: string[];
  answer: number;
  explain: string;
  hints: [string, string];
  requires?: string;
};

export type Challenge = SqlChallenge | McqChallenge;

export type Camp = {
  id: string;
  name: string;
  altitude: number;
  skills: string;
  log: string;
};

export const CAMPS: Camp[] = [
  {
    id: 'base',
    name: 'Base Camp',
    altitude: 1200,
    skills: 'SELECT, filters and joins',
    log: 'Kea Peak Alpine Co. has hired you for the winter. The data team is three people and a whiteboard. First job: prove you can find your way around the tables.',
  },
  {
    id: 'treeline',
    name: 'Treeline',
    altitude: 1650,
    skills: 'Aggregation, CTEs and window functions',
    log: 'The trees thin out and so do the easy questions. Finance and marketing have found out you exist. They want totals, rankings and running numbers.',
  },
  {
    id: 'glacier',
    name: 'Glacier',
    altitude: 2100,
    skills: 'QUALIFY and nested data',
    log: 'Lift telemetry arrives as nested payloads and nobody has dared open them. Rope up. Somewhere in the inspection notes, a liftie logged something they found on tower 7.',
  },
  {
    id: 'icefall',
    name: 'Icefall',
    altitude: 2500,
    skills: 'Performance, pruning and cost',
    log: 'The warehouse bill arrived. The head of data would like a word about a query that ran for forty minutes. Move carefully: everything here costs money.',
  },
  {
    id: 'ridge',
    name: 'The Ridge',
    altitude: 2900,
    skills: 'Time Travel, cloning, streams and governance',
    log: 'Exposed ground. Someone ran an UPDATE without a WHERE clause this morning, and the night groomers keep muttering about a table called yeti_sightings that is not in any catalogue.',
  },
  {
    id: 'summit',
    name: 'Summit',
    altitude: 3300,
    skills: 'Three pitches that use everything',
    log: 'The board meets on Friday and wants the season in three numbers. Three pitches, climbed in order. No fixed ropes.',
  },
];

const MONTHS = {
  may: { monthName: 'May', mm: '05', mmNext: '06' },
  jun: { monthName: 'June', mm: '06', mmNext: '07' },
  jul: { monthName: 'July', mm: '07', mmNext: '08' },
  aug: { monthName: 'August', mm: '08', mmNext: '09' },
  sep: { monthName: 'September', mm: '09', mmNext: '10' },
};

export const CHALLENGES: Challenge[] = [
  // ------------------------------------------------------------ Base Camp
  {
    id: 'b1', camp: 'base', kind: 'sql', title: 'Roll call', skill: 'WHERE and ORDER BY', difficulty: 1, points: 100, ordered: true,
    variants: [{ elev: 2000 }, { elev: 2100 }, { elev: 2200 }],
    brief: 'Mountain safety wants the high resorts. List every resort whose summit is above {{elev}} m, highest first.',
    returns: 'resort_name, summit_elevation_m',
    solution: `SELECT resort_name, summit_elevation_m FROM resorts WHERE summit_elevation_m > {{elev}} ORDER BY summit_elevation_m DESC`,
    hints: ['Filter rows with WHERE, then sort with ORDER BY … DESC.', 'SELECT resort_name, summit_elevation_m FROM resorts WHERE summit_elevation_m > … ORDER BY summit_elevation_m DESC'],
  },
  {
    id: 'b2', camp: 'base', kind: 'sql', title: 'Lift inventory', skill: 'GROUP BY', difficulty: 1, points: 100, ordered: false,
    variants: [{ year: 2005 }, { year: 2010 }, { year: 2015 }],
    brief: 'Engineering is planning replacements. Looking only at lifts installed before {{year}}, show each lift type with how many lifts it has and their combined hourly capacity.',
    returns: 'lift_type, lift_count, total_capacity',
    solution: `SELECT lift_type, COUNT(*), SUM(capacity_per_hour) FROM lifts WHERE installed_year < {{year}} GROUP BY lift_type`,
    hints: ['One row per lift type means GROUP BY lift_type, with COUNT and SUM.', 'Filter first (WHERE installed_year < …), then GROUP BY lift_type and select COUNT(*) and SUM(capacity_per_hour).'],
  },
  {
    id: 'b3', camp: 'base', kind: 'sql', title: 'New faces', skill: 'Date filters', difficulty: 1, points: 100, ordered: true,
    variants: [MONTHS.may, MONTHS.jun, MONTHS.jul],
    brief: 'Marketing wants to welcome the beginners who signed up in {{monthName}} 2026. List them with the earliest sign-up first, breaking ties by guest_id.',
    returns: 'guest_id, first_name, last_name, signup_date',
    solution: `SELECT guest_id, first_name, last_name, signup_date FROM guests WHERE skill_level = 'beginner' AND signup_date >= DATE '2026-{{mm}}-01' AND signup_date < DATE '2026-{{mmNext}}-01' ORDER BY signup_date, guest_id`,
    hints: ['Two conditions joined with AND: the skill level, and a date range covering the month.', "A half-open range is the safest way to say 'in a month': signup_date >= DATE '2026-MM-01' AND signup_date < the first of the next month."],
  },
  {
    id: 'b4', camp: 'base', kind: 'sql', title: 'Which lift, which mountain', skill: 'INNER JOIN', difficulty: 1, points: 100, ordered: true,
    variants: [{ type: 'chairlift' }, { type: 't-bar' }, { type: 'magic carpet' }],
    brief: 'List every {{type}} with the resort it belongs to and its vertical rise. Biggest vertical first; break ties by lift name.',
    returns: 'resort_name, lift_name, vertical_m',
    solution: `SELECT r.resort_name, l.lift_name, l.vertical_m FROM lifts l JOIN resorts r ON r.resort_id = l.resort_id WHERE l.lift_type = '{{type}}' ORDER BY l.vertical_m DESC, l.lift_name`,
    hints: ['The resort name lives in resorts; join it to lifts on resort_id.', 'FROM lifts l JOIN resorts r ON r.resort_id = l.resort_id WHERE l.lift_type = … ORDER BY l.vertical_m DESC, l.lift_name'],
  },
  {
    id: 'b5', camp: 'base', kind: 'sql', title: 'The vanishing resorts', skill: 'LEFT JOIN', difficulty: 2, points: 120, ordered: false,
    variants: [{ type: 'gondola' }, { type: 't-bar' }, { type: 'magic carpet' }],
    brief: 'Ops asked for every resort with its number of {{type}} lifts, including resorts that have none (those should show 0). The query in the editor loses those resorts. Fix it.',
    returns: 'resort_name, lift_count',
    starter: `SELECT r.resort_name, COUNT(l.lift_id) AS lift_count
FROM resorts r
LEFT JOIN lifts l ON l.resort_id = r.resort_id
WHERE l.lift_type = '{{type}}'
GROUP BY r.resort_name`,
    solution: `SELECT r.resort_name, COUNT(l.lift_id) FROM resorts r LEFT JOIN lifts l ON l.resort_id = r.resort_id AND l.lift_type = '{{type}}' GROUP BY r.resort_name`,
    hints: ['A WHERE condition on the right-hand table throws away the unmatched rows a LEFT JOIN worked to keep.', 'Move the lift_type condition out of WHERE and into the ON clause.'],
  },

  // ------------------------------------------------------------- Treeline
  {
    id: 't1', camp: 'treeline', kind: 'sql', title: 'Pass revenue', skill: 'Aggregation', difficulty: 1, points: 150, ordered: false,
    variants: [MONTHS.jun, MONTHS.jul, MONTHS.aug],
    brief: 'Finance wants pass sales for passes purchased in {{monthName}} 2026: for each pass type, the number sold and the total revenue.',
    returns: 'pass_type, passes_sold, revenue',
    solution: `SELECT pass_type, COUNT(*), SUM(price_nzd) FROM passes WHERE purchase_date >= DATE '2026-{{mm}}-01' AND purchase_date < DATE '2026-{{mmNext}}-01' GROUP BY pass_type`,
    hints: ['Filter on purchase_date (not valid_from), then group by pass_type.', 'WHERE purchase_date >= … AND purchase_date < … GROUP BY pass_type, selecting COUNT(*) and SUM(price_nzd).'],
  },
  {
    id: 't2', camp: 'treeline', kind: 'sql', title: 'Busiest lifts', skill: 'Joins with aggregation', difficulty: 2, points: 150, ordered: true,
    variants: [MONTHS.jul, MONTHS.aug, MONTHS.sep],
    brief: 'Which five lifts carried the most riders in {{monthName}} 2026? Show each lift, its resort and its number of scans, busiest first. Break ties by lift name.',
    returns: 'lift_name, resort_name, scans',
    solution: `SELECT l.lift_name, r.resort_name, COUNT(*) AS scans FROM lift_scans s JOIN lifts l ON l.lift_id = s.lift_id JOIN resorts r ON r.resort_id = l.resort_id WHERE s.scan_ts >= TIMESTAMP '2026-{{mm}}-01 00:00:00' AND s.scan_ts < TIMESTAMP '2026-{{mmNext}}-01 00:00:00' GROUP BY l.lift_name, r.resort_name ORDER BY scans DESC, l.lift_name LIMIT 5`,
    hints: ['Join lift_scans to lifts to resorts, count rows per lift, sort and LIMIT 5.', 'scan_ts is a timestamp: use a half-open range from the first of the month to the first of the next. ORDER BY scans DESC, lift_name LIMIT 5.'],
  },
  {
    id: 't3', camp: 'treeline', kind: 'sql', title: 'Powder days', skill: 'Conditional aggregation', difficulty: 2, points: 150, ordered: false,
    variants: [{ cm: 15 }, { cm: 20 }, { cm: 25 }],
    brief: 'A powder day is any day with at least {{cm}} cm of snowfall. For each resort, count its powder days and give the average temperature on those days, rounded to 2 decimal places.',
    returns: 'resort_name, powder_days, avg_temp_c',
    solution: `SELECT r.resort_name, COUNT(*), ROUND(AVG(w.temp_c), 2) FROM weather w JOIN resorts r ON r.resort_id = w.resort_id WHERE w.snowfall_cm >= {{cm}} GROUP BY r.resort_name`,
    hints: ['Filter weather to powder days first, then aggregate per resort.', 'JOIN resorts for the name, WHERE snowfall_cm >= …, GROUP BY resort_name with COUNT(*) and ROUND(AVG(temp_c), 2).'],
  },
  {
    id: 't4', camp: 'treeline', kind: 'sql', title: 'Running total', skill: 'Window functions', difficulty: 2, points: 180, ordered: true,
    variants: [{ resort: 'Kea Peak' }, { resort: 'Blue Tarn' }, { resort: 'Pipit Ridge' }],
    brief: "Show the season's snowfall building up at {{resort}}: one row per day with that day's snowfall and the cumulative snowfall so far, in date order.",
    returns: 'obs_date, snowfall_cm, cumulative_cm',
    solution: `SELECT w.obs_date, w.snowfall_cm, SUM(w.snowfall_cm) OVER (ORDER BY w.obs_date) FROM weather w JOIN resorts r ON r.resort_id = w.resort_id WHERE r.resort_name = '{{resort}}' ORDER BY w.obs_date`,
    hints: ['A running total is SUM(…) OVER (ORDER BY …).', 'SUM(snowfall_cm) OVER (ORDER BY obs_date), after filtering weather to the one resort.'],
  },
  {
    id: 't5', camp: 'treeline', kind: 'sql', title: 'Top of the class', skill: 'CTEs and RANK', difficulty: 3, points: 200, ordered: false,
    variants: [{ disc: 'ski' }, { disc: 'snowboard' }],
    brief: 'For each resort, find the three biggest spenders on {{disc}} lessons there. Use RANK so that ties share a place (which can mean more than three rows for a resort). Show the resort, the guest, their total spend and their rank.',
    returns: 'resort_name, guest_id, total_spend, spend_rank',
    solution: `WITH spend AS (SELECT resort_id, guest_id, SUM(price_nzd) AS total FROM lessons WHERE discipline = '{{disc}}' GROUP BY resort_id, guest_id), ranked AS (SELECT *, RANK() OVER (PARTITION BY resort_id ORDER BY total DESC) AS rk FROM spend) SELECT r.resort_name, k.guest_id, k.total, k.rk FROM ranked k JOIN resorts r ON r.resort_id = k.resort_id WHERE k.rk <= 3`,
    hints: ['Two steps: total spend per resort and guest, then rank within each resort.', 'CTE one: SUM(price_nzd) GROUP BY resort_id, guest_id. CTE two: RANK() OVER (PARTITION BY resort_id ORDER BY total DESC). Then keep rank <= 3.'],
  },

  // -------------------------------------------------------------- Glacier
  {
    id: 'g1', camp: 'glacier', kind: 'sql', title: 'First chair', skill: 'QUALIFY', difficulty: 2, points: 200, ordered: false,
    variants: [{ date: '2026-07-18' }, { date: '2026-08-08' }, { date: '2026-08-22' }],
    brief: 'On {{date}}, who was first through the gate at each lift? Show the lift, the guest and the time of that first scan. If two scans share a timestamp, the lower scan_id wins.',
    returns: 'lift_name, guest_id, scan_ts',
    solution: `SELECT l.lift_name, s.guest_id, s.scan_ts FROM lift_scans s JOIN lifts l ON l.lift_id = s.lift_id WHERE CAST(s.scan_ts AS DATE) = DATE '{{date}}' QUALIFY ROW_NUMBER() OVER (PARTITION BY s.lift_id ORDER BY s.scan_ts, s.scan_id) = 1`,
    hints: ['Number the scans within each lift by time, then keep number one. QUALIFY filters on a window function without a subquery.', 'QUALIFY ROW_NUMBER() OVER (PARTITION BY lift_id ORDER BY scan_ts, scan_id) = 1'],
  },
  {
    id: 'g2', camp: 'glacier', kind: 'sql', title: 'Reading the payload', skill: 'Nested data', difficulty: 2, points: 200, ordered: false,
    variants: [{ cause: 'wind' }, { cause: 'mechanical' }, { cause: 'guest' }],
    brief: 'Lift events arrive as nested data in lift_events.payload. For stoppages caused by {{cause}}, show each operator shift with its number of stoppages and the total minutes lost.',
    returns: 'shift, stoppages, total_minutes',
    solution: `SELECT payload.operator.shift, COUNT(*), SUM(payload.duration_min) FROM lift_events WHERE payload.type = 'stoppage' AND payload.cause = '{{cause}}' GROUP BY 1`,
    snowflakeNote: 'In Snowflake a VARIANT payload is read with a colon path and a cast, such as payload:operator.shift::string. In this practice engine the same idea uses dots: payload.operator.shift.',
    hints: ['Reach into the payload with dots: payload.type, payload.cause, payload.operator.shift.', "WHERE payload.type = 'stoppage' AND payload.cause = … GROUP BY payload.operator.shift, with COUNT(*) and SUM(payload.duration_min)."],
  },
  {
    id: 'g3', camp: 'glacier', kind: 'sql', title: 'Flatten the sensors', skill: 'Flattening arrays', difficulty: 3, points: 220, ordered: false,
    variants: [{ kind: 'wind' }, { kind: 'temp' }, { kind: 'vibration' }],
    brief: "Each event's payload carries a list of sensor readings. Flatten it: for {{kind}} sensors, show each sensor id with how many readings it logged and its highest reading.",
    returns: 'sensor_id, readings, max_reading',
    solution: `SELECT s.id, COUNT(*), MAX(s.reading) FROM (SELECT UNNEST(payload.sensors) AS s FROM lift_events) WHERE s.kind = '{{kind}}' GROUP BY s.id`,
    snowflakeNote: 'In Snowflake this is LATERAL FLATTEN(input => payload:sensors), reading f.value:id and friends. Here, UNNEST(payload.sensors) turns each list element into its own row.',
    hints: ['UNNEST(payload.sensors) gives one row per sensor reading. Do that in a subquery, then aggregate.', 'FROM (SELECT UNNEST(payload.sensors) AS s FROM lift_events) WHERE s.kind = … GROUP BY s.id, with COUNT(*) and MAX(s.reading).'],
  },
  {
    id: 'g4', camp: 'glacier', kind: 'sql', title: 'Latest pass', skill: 'Deduplicating with QUALIFY', difficulty: 2, points: 200, ordered: false,
    variants: [{ region: 'Otago' }, { region: 'Wellington' }, { region: 'Tasman' }],
    brief: "For guests whose home region is {{region}}, return each guest's most recently purchased pass. If a guest bought two passes on the same day, keep the one with the higher pass_id.",
    returns: 'guest_id, pass_type, purchase_date',
    solution: `SELECT p.guest_id, p.pass_type, p.purchase_date FROM passes p JOIN guests g ON g.guest_id = p.guest_id WHERE g.home_region = '{{region}}' QUALIFY ROW_NUMBER() OVER (PARTITION BY p.guest_id ORDER BY p.purchase_date DESC, p.pass_id DESC) = 1`,
    hints: ['"Latest row per group" is ROW_NUMBER partitioned by the group and ordered newest first.', 'QUALIFY ROW_NUMBER() OVER (PARTITION BY p.guest_id ORDER BY p.purchase_date DESC, p.pass_id DESC) = 1'],
  },

  // -------------------------------------------------------------- Icefall
  {
    id: 'i1', camp: 'icefall', kind: 'mcq', title: 'Prune or scan', skill: 'Partition pruning', difficulty: 2, points: 150,
    brief: 'In production, LIFT_SCANS holds four years of scans and is clustered by scan_ts. Which filter gives Snowflake the best chance of skipping micro-partitions for a report on August 2026?',
    options: [
      "WHERE TO_CHAR(scan_ts, 'YYYY-MM') = '2026-08'",
      "WHERE scan_ts >= '2026-08-01' AND scan_ts < '2026-09-01'",
      'WHERE MONTH(scan_ts) = 8 AND YEAR(scan_ts) = 2026',
      "WHERE scan_ts::VARCHAR LIKE '2026-08%'",
    ],
    answer: 1,
    explain: "A plain range on the clustered column can be checked against each micro-partition's minimum and maximum values, so whole partitions are skipped. Wrapping the column in a function or cast generally forces Snowflake to read the rows to evaluate it.",
    hints: ['Pruning works from the min and max values Snowflake stores for each micro-partition.', 'Look for the filter that compares the bare column to constants.'],
  },
  {
    id: 'i2', camp: 'icefall', kind: 'mcq', title: 'Spilling', skill: 'Warehouse sizing', difficulty: 2, points: 150,
    brief: "A nightly aggregation runs alone on a Medium warehouse for 40 minutes. Its query profile shows a large 'Bytes spilled to remote storage'. What is the most direct fix?",
    options: [
      'Make the warehouse multi-cluster so it can scale out',
      'Run it on a larger warehouse, or cut the data it has to process',
      'Lengthen the auto-suspend time',
      'Rely on the result cache',
    ],
    answer: 1,
    explain: 'Spilling means the query ran out of memory and wrote intermediate data to storage, which is slow. A larger warehouse gives a single query more memory. Extra clusters help when many queries queue, not when one query is too big.',
    hints: ['Spilling is a memory problem for a single query.', 'Scaling out adds clusters for concurrency. Scaling up adds memory per query.'],
  },
  {
    id: 'i3', camp: 'icefall', kind: 'mcq', title: 'The nine o’clock queue', skill: 'Concurrency', difficulty: 2, points: 150,
    brief: "At 9am, sixty analysts open dashboards at once. Each query is quick when it runs, but many sit in 'Queued' first. Which change targets the problem?",
    options: [
      'Resize the warehouse from Small to 2X-Large',
      'Use a multi-cluster warehouse so more clusters start under load',
      'Add a clustering key to the largest table',
      'Increase the Time Travel retention period',
    ],
    answer: 1,
    explain: 'Queuing with fast individual queries is a concurrency problem. A multi-cluster warehouse adds clusters when demand rises and removes them afterwards. Sizing up mainly makes each query faster, which is not the issue here.',
    hints: ['The queries are already fast. The problem is how many arrive together.', 'Scale out for concurrency, scale up for heavy queries.'],
  },
  {
    id: 'i4', camp: 'icefall', kind: 'sql', title: 'Fan-out', skill: 'Join fan-out', difficulty: 3, points: 250, ordered: false,
    variants: [{ region: 'Canterbury' }, { region: 'Auckland' }, { region: 'Otago' }],
    brief: "This query reports each {{region}} guest's pass spend and rental spend, but the totals are inflated: joining passes and rentals to guests in one go multiplies the rows. Fix it so both totals are right. Only include guests with at least one pass and at least one rental.",
    returns: 'guest_id, pass_spend, rental_spend',
    starter: `SELECT g.guest_id,
       SUM(p.price_nzd) AS pass_spend,
       SUM(r.days * r.daily_rate) AS rental_spend
FROM guests g
JOIN passes p ON p.guest_id = g.guest_id
JOIN rentals r ON r.guest_id = g.guest_id
WHERE g.home_region = '{{region}}'
GROUP BY g.guest_id`,
    solution: `WITH p AS (SELECT guest_id, SUM(price_nzd) AS pass_spend FROM passes GROUP BY guest_id), r AS (SELECT guest_id, SUM(days * daily_rate) AS rental_spend FROM rentals GROUP BY guest_id) SELECT g.guest_id, p.pass_spend, r.rental_spend FROM guests g JOIN p ON p.guest_id = g.guest_id JOIN r ON r.guest_id = g.guest_id WHERE g.home_region = '{{region}}'`,
    hints: ['A guest with 3 passes and 2 rentals becomes 6 joined rows, so every amount is counted several times.', 'Aggregate passes per guest in one CTE and rentals per guest in another, then join those one-row-per-guest results to guests.'],
  },
  {
    id: 'i5', camp: 'icefall', kind: 'mcq', title: 'Paying for idle', skill: 'Cost control', difficulty: 1, points: 150,
    brief: 'A warehouse used for ad hoc analysis runs one two-minute query about once an hour. Auto-suspend is set to 30 minutes. What is the cheapest sensible change?',
    options: [
      'Lower auto-suspend to about a minute',
      'Size the warehouse up so the query finishes sooner',
      'Turn off auto-resume',
      'Convert it to a multi-cluster warehouse',
    ],
    answer: 0,
    explain: 'A running warehouse bills by the second, with a 60-second minimum each time it starts. With a 30-minute auto-suspend this one bills about 32 minutes an hour for 2 minutes of work.',
    hints: ['Work out how many minutes an hour this warehouse is running, and how many it is working.', 'The setting that controls how long an idle warehouse keeps billing is auto-suspend.'],
  },

  // ---------------------------------------------------------------- Ridge
  {
    id: 'r1', camp: 'ridge', kind: 'mcq', title: 'Undo', skill: 'Time Travel', difficulty: 2, points: 150,
    brief: 'Twenty minutes ago someone ran an UPDATE that corrupted PASSES. The table has one day of Time Travel. Which statement gives you a copy of the table as it was before the mistake?',
    options: [
      'UNDROP TABLE passes;',
      'CREATE TABLE passes_restored CLONE passes AT (OFFSET => -60*30);',
      "ALTER TABLE passes ROLLBACK TO '20 minutes';",
      'SELECT * FROM passes VERSION AS OF 20;',
    ],
    answer: 1,
    explain: 'Time Travel lets you query or clone a table as it was at an earlier point, using AT or BEFORE with an offset in seconds, a timestamp or a statement id. Cloning at 30 minutes ago recreates the pre-mistake table. UNDROP only restores dropped objects.',
    hints: ['The table was not dropped, so UNDROP has nothing to restore.', 'Time Travel is expressed with AT or BEFORE. The offset is in seconds.'],
  },
  {
    id: 'r2', camp: 'ridge', kind: 'mcq', title: 'Zero-copy', skill: 'Cloning', difficulty: 1, points: 150,
    brief: 'You clone a 2 TB production database into DEV for testing. Straight after the clone, how much extra storage are you paying for?',
    options: [
      'About 2 TB: the data is copied',
      'About 1 TB: clones are compressed to half',
      'Almost none: the clone shares the same micro-partitions until data in either copy changes',
      'None, ever, whatever you do to the clone',
    ],
    answer: 2,
    explain: 'A clone is metadata that points at the existing micro-partitions. Storage is only added as data is changed or added in either copy, because changed micro-partitions are written afresh.',
    hints: ['The feature is called zero-copy cloning for a reason.', 'Think about what happens later, when rows in the clone are updated.'],
  },
  {
    id: 'r3', camp: 'ridge', kind: 'mcq', title: 'Where the stream stands', skill: 'Streams and tasks', difficulty: 3, points: 150,
    brief: "A stream on LIFT_SCANS feeds a task that loads a daily summary table. When does the stream's offset move forward?",
    options: [
      'Whenever anyone runs SELECT against the stream',
      'When the stream is used in a DML statement and that transaction commits',
      "Every time the task's schedule fires, whether or not it reads the stream",
      'The next time rows are inserted into LIFT_SCANS',
    ],
    answer: 1,
    explain: 'Querying a stream does not consume it. The offset advances only when the stream is used in a DML statement (such as INSERT … SELECT FROM the stream) and the transaction commits.',
    hints: ['You can SELECT from a stream as often as you like without changing it.', 'Consumption is tied to a committed change that reads from the stream.'],
  },
  {
    id: 'r4', camp: 'ridge', kind: 'mcq', title: 'Who sees what', skill: 'Governance', difficulty: 2, points: 150,
    brief: 'Resort managers should see only the LIFT_SCANS rows for their own resort. Analysts should see every row of GUESTS but with birth_year hidden. Which pairing does this on the base tables?',
    options: [
      'A row access policy on LIFT_SCANS and a masking policy on GUESTS.birth_year',
      'Two masking policies, one on each table',
      'A network policy for managers and a resource monitor for analysts',
      'A separate copy of each table per role, refreshed nightly',
    ],
    answer: 0,
    explain: 'Row access policies decide which rows a role can see. Masking policies decide how a column value appears to a role. Both are attached to the table, so every query is covered without maintaining copies.',
    hints: ['One requirement is about rows, the other about a column.', 'Row access policy filters rows. Masking policy changes what a column shows.'],
  },
  {
    id: 'r5', camp: 'ridge', kind: 'sql', title: 'Change capture by hand', skill: 'Comparing snapshots', difficulty: 2, points: 250, ordered: false,
    variants: [{ col: 'skill_level', label: 'skill level' }, { col: 'home_region', label: 'home region' }],
    brief: 'guests_snapshot holds guest records as they stood on 1 July 2026. Compare it with guests as recorded today and list every guest whose {{label}} has changed, with the old value and the new one.',
    returns: 'guest_id, old_value, new_value',
    solution: `SELECT g.guest_id, s.{{col}}, g.{{col}} FROM guests g JOIN guests_snapshot s ON s.guest_id = g.guest_id WHERE g.{{col}} <> s.{{col}}`,
    hints: ['Join the snapshot to the current table on guest_id and keep rows where the two values differ.', 'FROM guests g JOIN guests_snapshot s ON s.guest_id = g.guest_id WHERE g.<column> <> s.<column>. Old value comes from the snapshot.'],
  },

  // --------------------------------------------------------------- Summit
  {
    id: 's1', camp: 'summit', kind: 'sql', title: 'Pitch one: who came back', skill: 'Cohorts', difficulty: 3, points: 400, ordered: true,
    variants: [{ n: 2, words: 'two' }, { n: 3, words: 'three' }],
    brief: 'For each sign-up month, count the guests who signed up and how many of them skied in at least {{words}} different calendar months. Add the retention rate as a percentage rounded to 2 decimal places. Show the sign-up month as the first day of that month, in date order.',
    returns: 'signup_month, guests, returning_guests, retention_pct',
    solution: `WITH months AS (SELECT guest_id, COUNT(DISTINCT DATE_TRUNC('month', scan_ts)) AS m FROM lift_scans GROUP BY guest_id) SELECT CAST(DATE_TRUNC('month', g.signup_date) AS DATE), COUNT(*), COUNT(*) FILTER (WHERE COALESCE(m.m, 0) >= {{n}}), ROUND(100.0 * COUNT(*) FILTER (WHERE COALESCE(m.m, 0) >= {{n}}) / COUNT(*), 2) FROM guests g LEFT JOIN months m ON m.guest_id = g.guest_id GROUP BY 1 ORDER BY 1`,
    hints: ['First work out, per guest, how many distinct months they have scans in. Then group guests by sign-up month.', "COUNT(DISTINCT DATE_TRUNC('month', scan_ts)) per guest in a CTE; LEFT JOIN it to guests so guests who never skied still count; then conditional counts per DATE_TRUNC('month', signup_date)."],
  },
  {
    id: 's2', camp: 'summit', kind: 'sql', title: 'Pitch two: the cost of wind', skill: 'Multi-table analysis', difficulty: 3, points: 500, ordered: false, requires: 's1',
    variants: [{}],
    brief: "Wind holds hurt. For each resort, compare the average number of lift scans per day on days with status 'open' against days on 'wind hold'. Days with no scans count as zero. Show both averages rounded to 2 decimal places, and the percentage drop from open to wind hold (calculated from the unrounded averages, then rounded to 2 decimal places).",
    returns: 'resort_name, avg_scans_open, avg_scans_wind_hold, pct_drop',
    solution: `WITH daily AS (SELECT l.resort_id, CAST(s.scan_ts AS DATE) AS d, COUNT(*) AS scans FROM lift_scans s JOIN lifts l ON l.lift_id = s.lift_id GROUP BY 1, 2), per_day AS (SELECT w.resort_id, w.status, COALESCE(d.scans, 0) AS scans FROM weather w LEFT JOIN daily d ON d.resort_id = w.resort_id AND d.d = w.obs_date WHERE w.status IN ('open', 'wind hold')), agg AS (SELECT resort_id, AVG(scans) FILTER (WHERE status = 'open') AS a_open, AVG(scans) FILTER (WHERE status = 'wind hold') AS a_hold FROM per_day GROUP BY resort_id) SELECT r.resort_name, ROUND(a.a_open, 2), ROUND(a.a_hold, 2), ROUND(100.0 * (a.a_open - a.a_hold) / a.a_open, 2) FROM agg a JOIN resorts r ON r.resort_id = a.resort_id`,
    hints: ['Start from weather (one row per resort per day) so that days without scans are still there, and LEFT JOIN daily scan counts onto it.', 'Daily scans per resort in a CTE (via lifts). LEFT JOIN to weather on resort and date, COALESCE to 0, then AVG with FILTER (WHERE status = …) for each status.'],
  },
  {
    id: 's3', camp: 'summit', kind: 'sql', title: 'Pitch three: the longest run', skill: 'Gaps and islands', difficulty: 3, points: 600, ordered: true, requires: 's2',
    variants: [{}],
    brief: "The summit report. Find each guest's longest streak of consecutive days on snow (any lift, any resort). Return the ten longest, with the date each streak began. If a guest has two equal streaks, keep the earlier one. Order by streak length, longest first, then guest_id.",
    returns: 'guest_id, streak_days, streak_start',
    solution: `WITH days AS (SELECT DISTINCT guest_id, CAST(scan_ts AS DATE) AS d FROM lift_scans), grp AS (SELECT guest_id, d, d - CAST(ROW_NUMBER() OVER (PARTITION BY guest_id ORDER BY d) AS INTEGER) AS g FROM days), streaks AS (SELECT guest_id, MIN(d) AS streak_start, COUNT(*) AS streak_days FROM grp GROUP BY guest_id, g), best AS (SELECT * FROM streaks QUALIFY ROW_NUMBER() OVER (PARTITION BY guest_id ORDER BY streak_days DESC, streak_start) = 1) SELECT guest_id, streak_days, streak_start FROM best ORDER BY streak_days DESC, guest_id LIMIT 10`,
    hints: ['This is a gaps-and-islands problem. Reduce scans to one row per guest per day first.', 'For consecutive dates, date minus ROW_NUMBER() is constant. Group by guest and that value to get each streak, keep the best per guest, then sort and LIMIT 10.'],
  },
];

export function fill(template: string, params: Params): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => String(params[k] ?? ''));
}

export function getChallenge(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id);
}

// ------------------------------------------------------------ daily questions
export type Trivia = { id: string; q: string; options: string[]; answer: number; explain: string };

export const TRIVIA: Trivia[] = [
  { id: 'd01', q: 'Which clause filters on a window function without needing a subquery?', options: ['HAVING', 'QUALIFY', 'WHERE', 'FILTER'], answer: 1, explain: 'QUALIFY is evaluated after window functions, the way HAVING is evaluated after GROUP BY.' },
  { id: 'd02', q: 'In Snowflake, what does a virtual warehouse provide?', options: ['Storage for tables', 'Compute for running queries', 'A network boundary', 'A backup copy of data'], answer: 1, explain: 'Warehouses are compute clusters. Storage is separate and billed separately.' },
  { id: 'd03', q: 'What is the longest Time Travel retention for a permanent table on Enterprise Edition?', options: ['1 day', '7 days', '30 days', '90 days'], answer: 3, explain: 'Standard Edition allows up to 1 day. Enterprise Edition and above allow up to 90 days for permanent tables.' },
  { id: 'd04', q: 'COUNT(*) and COUNT(email) return different numbers on the same table. Why?', options: ['COUNT(email) ignores rows where email is NULL', 'COUNT(*) counts distinct rows only', 'COUNT(email) counts distinct emails', 'One of them is rounding'], answer: 0, explain: 'COUNT(column) counts non-NULL values. COUNT(*) counts rows.' },
  { id: 'd05', q: 'Which Snowflake data type holds semi-structured data such as JSON?', options: ['TEXT', 'VARIANT', 'BINARY', 'GEOGRAPHY'], answer: 1, explain: 'VARIANT stores semi-structured values, including nested OBJECT and ARRAY data.' },
  { id: 'd06', q: 'What does FLATTEN do in Snowflake?', options: ['Removes NULLs from a column', 'Turns the elements of an array or object into rows', 'Compresses a table', 'Removes duplicate rows'], answer: 1, explain: 'FLATTEN is a table function that explodes nested values into one row per element, usually with LATERAL.' },
  { id: 'd07', q: 'Three rows tie for first place. Which function gives the next row the number 2?', options: ['RANK', 'ROW_NUMBER', 'DENSE_RANK', 'NTILE'], answer: 2, explain: 'DENSE_RANK leaves no gaps after ties. RANK would give the next row 4.' },
  { id: 'd08', q: 'How long can Snowflake reuse a cached query result if the underlying data has not changed?', options: ['5 minutes', '1 hour', '24 hours', '7 days by default'], answer: 2, explain: 'Results persist for 24 hours, and each reuse resets that window, up to a maximum of 31 days.' },
  { id: 'd09', q: 'What is the difference between WHERE and HAVING?', options: ['HAVING filters groups after aggregation', 'HAVING runs before WHERE', 'WHERE only works on numbers', 'There is none'], answer: 0, explain: 'WHERE filters rows before grouping. HAVING filters the grouped result.' },
  { id: 'd10', q: 'Which Snowflake object runs a SQL statement on a schedule?', options: ['Stream', 'Stage', 'Task', 'Pipe'], answer: 2, explain: 'Tasks run SQL on a schedule or after another task. Streams track changes; pipes load files.' },
  { id: 'd11', q: 'Snowflake stores table data in…', options: ['Row-based pages', 'Micro-partitions', 'Indexes', 'Tablespaces'], answer: 1, explain: 'Tables are divided automatically into columnar micro-partitions, with metadata that allows pruning.' },
  { id: 'd12', q: 'What does NULL = NULL evaluate to?', options: ['TRUE', 'FALSE', 'NULL', 'An error'], answer: 2, explain: 'Any comparison with NULL is unknown. Use IS NULL, or IS NOT DISTINCT FROM for null-safe equality.' },
  { id: 'd13', q: 'UNION compared with UNION ALL:', options: ['UNION removes duplicate rows', 'UNION ALL removes duplicate rows', 'UNION is faster', 'They are identical'], answer: 0, explain: 'UNION de-duplicates the combined result, which costs extra work. UNION ALL keeps everything.' },
  { id: 'd14', q: 'What does GROUP BY ALL do?', options: ['Groups by every column in the table', 'Groups by every non-aggregated item in the SELECT list', 'Returns one row for the whole table', 'Disables grouping'], answer: 1, explain: 'It saves repeating the non-aggregate expressions from the SELECT list.' },
  { id: 'd15', q: 'A LEFT JOIN returns…', options: ['Only matching rows', 'Every row from the left table, matched or not', 'Every row from the right table, matched or not', 'Every combination of rows'], answer: 1, explain: 'Unmatched left rows are kept, with NULLs for the right-hand columns.' },
  { id: 'd16', q: 'Which statement about a multi-cluster warehouse is true?', options: ['It makes a single large query faster', 'It adds clusters to handle more queries at once', 'It stores data in several regions', 'It is required for Time Travel'], answer: 1, explain: 'Multi-cluster warehouses scale out for concurrency. To speed up one heavy query, scale up.' },
];
