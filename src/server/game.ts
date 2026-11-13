import 'server-only';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { q } from './db';
import { hashToken, type Player } from './session';
import { nzDay, nzDayStartMs, dayNumber, addDays, nzWeekStartDay } from './time';
import { CAMPS, CHALLENGES, TRIVIA, fill, getChallenge, type Challenge, type SqlChallenge, type McqChallenge } from '@/content/challenges';
import { BADGES, type Badge } from '@/content/badges';
import { SEASON, TEAM_SEATS, TEAM_WEEKLY_GOAL_M } from '@/content/season';
import { compareResults, type Cell } from '@/lib/compare';
import answersJson from './answers.generated.json';

const ANSWERS = answersJson as unknown as Record<string, { cols: number; rows: Cell[][] }[]>;

export class GameError extends Error {}

export const LEAGUES = [
  { id: 'new', name: 'New to SQL', blurb: 'Under a year writing SQL' },
  { id: 'practising', name: 'Practising', blurb: 'You write SQL most weeks' },
  { id: 'advanced', name: 'Advanced', blurb: 'Window functions before breakfast' },
] as const;

export const OXYGEN_START = 3;
export const OXYGEN_MAX = 9;
export const HINT_COST = [1, 2];
export const STORM_MINUTES: Record<number, number> = { 1: 4, 2: 7, 3: 12 };
const FIRST_TRY_BONUS = 0.2;
const STORM_WIN = 1.5;
const STORM_LOSS = 0.75;
const DAILY_POINTS = 40;
const MIN_GAP_MS = 1500;
export const REVEAL_AFTER = 3;

export type Attempt = {
  player_id: string;
  challenge_id: string;
  variant: number;
  mode: 'standard' | 'storm';
  started_ms: number;
  tries: number;
  hints: number;
  last_try_ms: number | null;
  solved_ms: number | null;
  points: number | null;
  first_try: boolean | null;
  storm_won: boolean | null;
  duration_ms: number | null;
  revealed: boolean;
};

// ------------------------------------------------------------------ helpers
function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function variantFor(playerId: string, c: Challenge): number {
  return c.kind === 'sql' ? fnv(playerId + ':' + c.id) % c.variants.length : 0;
}

/** A per-player shuffle of multiple-choice options, so "it's B" is not shareable. */
export function optionOrder(playerId: string, c: McqChallenge): number[] {
  const order = c.options.map((_, i) => i);
  let seed = fnv(playerId + '#' + c.id) || 1;
  for (let i = order.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export async function getAttempts(playerId: string): Promise<Map<string, Attempt>> {
  const rows = await q<Attempt>(
    `SELECT player_id, challenge_id, variant, mode, started_ms, tries, hints, last_try_ms, solved_ms, points, first_try, storm_won, duration_ms, revealed
       FROM attempts WHERE player_id = $1`,
    [playerId],
  );
  return new Map(rows.map((r) => [r.challenge_id, r]));
}

export type CampState = { id: string; name: string; altitude: number; skills: string; log: string; total: number; solved: number; unlocked: boolean; needed: number };

export function campStates(attempts: Map<string, Attempt>): CampState[] {
  const out: CampState[] = [];
  CAMPS.forEach((camp, i) => {
    const list = CHALLENGES.filter((c) => c.camp === camp.id);
    const solved = list.filter((c) => attempts.get(c.id)?.solved_ms).length;
    const prev = out[i - 1];
    const needed = prev ? Math.max(1, prev.total - 1) : 0;
    const unlocked = i === 0 || (prev.unlocked && prev.solved >= needed);
    out.push({ ...camp, total: list.length, solved, unlocked, needed });
  });
  return out;
}

export function challengeOpen(c: Challenge, attempts: Map<string, Attempt>): { open: boolean; why?: string } {
  const camp = campStates(attempts).find((s) => s.id === c.camp)!;
  if (!camp.unlocked) return { open: false, why: `${camp.name} is still locked.` };
  if (c.requires && !attempts.get(c.requires)?.solved_ms) {
    const need = getChallenge(c.requires)!;
    return { open: false, why: `Climb "${need.title}" first.` };
  }
  return { open: true };
}

/** The next open, unfinished challenge after this one, following the mountain's order. */
export function nextChallenge(currentId: string, attempts: Map<string, Attempt>): { id: string; title: string } | null {
  const idx = CHALLENGES.findIndex((c) => c.id === currentId);
  const order = [...CHALLENGES.slice(idx + 1), ...CHALLENGES.slice(0, Math.max(0, idx))];
  const pick = order.find((c) => !attempts.get(c.id)?.solved_ms && challengeOpen(c, attempts).open);
  return pick ? { id: pick.id, title: pick.title } : null;
}

/** A readable version of a challenge's reference query for this climber's variant. */
export function workedAnswer(c: SqlChallenge, variant: number): string {
  return formatSql(fill(c.solution, c.variants[variant] ?? c.variants[0]));
}

const CLAUSES = ['LEFT JOIN', 'JOIN', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'QUALIFY', 'ORDER BY', 'LIMIT', 'SELECT'];

/** Line breaks before each clause of a query or subquery, never inside function calls or window specs. */
export function formatSql(sql: string): string {
  const stack: boolean[] = []; // true when this parenthesis opens a subquery
  let out = '';
  let i = 0;
  let quote = false;
  const indent = () => '  '.repeat(stack.filter(Boolean).length);
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "'") { quote = !quote; out += ch; i++; continue; }
    if (quote) { out += ch; i++; continue; }
    if (ch === '(') {
      const isSub = /^\(\s*(SELECT|WITH)\b/i.test(sql.slice(i));
      stack.push(isSub);
      out += '(';
      i++;
      if (isSub) { out += '\n' + indent(); while (sql[i] === ' ') i++; }
      continue;
    }
    if (ch === ')') {
      const wasSub = stack.pop();
      out = out.replace(/\s+$/, '');
      if (wasSub) out += '\n' + indent();
      out += ')';
      i++;
      continue;
    }
    if (ch === ' ' && (stack.length === 0 || stack[stack.length - 1])) {
      const rest = sql.slice(i + 1);
      const kw = CLAUSES.find((k) => rest.toUpperCase().startsWith(k + ' ') || rest.toUpperCase().startsWith(k + '\n'));
      if (kw && !(kw === 'JOIN' && /LEFT$/i.test(out))) {
        out += '\n' + indent();
        i++;
        continue;
      }
    }
    out += ch;
    i++;
  }
  return out.replace(/\),\s*(\w+ AS)/g, '),\n$1').trim();
}

export function liveStreak(p: Pick<Player, 'streak' | 'last_active_day' | 'rest_days'>, now = Date.now()): number {
  if (!p.last_active_day) return 0;
  const gap = dayNumber(nzDay(now)) - dayNumber(p.last_active_day);
  if (gap <= 1) return p.streak;
  if (gap === 2 && p.rest_days > 0) return p.streak;
  return 0;
}

// ------------------------------------------------------------- public views
export type PublicChallenge = {
  id: string;
  camp: string;
  kind: 'sql' | 'mcq';
  title: string;
  skill: string;
  difficulty: number;
  points: number;
  brief: string;
  returns?: string;
  starter?: string;
  snowflakeNote?: string;
  options?: string[];
  stormMinutes?: number;
};

export function publicChallenge(c: Challenge, playerId: string, variant: number): PublicChallenge {
  if (c.kind === 'sql') {
    const params = c.variants[variant] ?? c.variants[0];
    return {
      id: c.id, camp: c.camp, kind: 'sql', title: c.title, skill: c.skill, difficulty: c.difficulty, points: c.points,
      brief: fill(c.brief, params), returns: c.returns, starter: c.starter ? fill(c.starter, params) : undefined,
      snowflakeNote: c.snowflakeNote, stormMinutes: STORM_MINUTES[c.difficulty],
    };
  }
  const order = optionOrder(playerId, c);
  return {
    id: c.id, camp: c.camp, kind: 'mcq', title: c.title, skill: c.skill, difficulty: c.difficulty, points: c.points,
    brief: c.brief, options: order.map((i) => c.options[i]),
  };
}

export function hintsShown(c: Challenge, attempt: Attempt | undefined): string[] {
  return c.hints.slice(0, attempt?.hints ?? 0);
}

// ------------------------------------------------------------------ joining
const NAME_OK = /^[\p{L}\p{N}][\p{L}\p{N} ._'-]{1,22}[\p{L}\p{N}.]$/u;

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

export async function listCompanies(): Promise<{ name: string; slug: string }[]> {
  return q(`SELECT name, slug FROM companies ORDER BY name LIMIT 500`);
}

export async function join(input: { name?: unknown; company?: unknown; league?: unknown; code?: unknown }): Promise<{ key: string; player: { id: string; name: string } }> {
  const required = process.env.JOIN_CODE;
  if (required) {
    const given = Buffer.from(String(input.code ?? '').trim().toLowerCase());
    const want = Buffer.from(required.trim().toLowerCase());
    if (given.length !== want.length || !timingSafeEqual(given, want)) throw new GameError('That access code is not right. Ask the programme team for the current one.');
  }
  const name = String(input.name ?? '').trim().replace(/\s+/g, ' ');
  const companyName = String(input.company ?? '').trim().replace(/\s+/g, ' ');
  const league = String(input.league ?? '');
  if (!NAME_OK.test(name)) throw new GameError('Choose a climber name of 3 to 24 letters, numbers or spaces.');
  if (!LEAGUES.some((l) => l.id === league)) throw new GameError('Pick the league that fits your experience.');
  if (companyName && (companyName.length < 2 || companyName.length > 40)) throw new GameError('Team names are 2 to 40 characters.');

  let companyId: number | null = null;
  if (companyName) {
    const slug = slugify(companyName);
    if (!slug) throw new GameError('That team name has no letters or numbers in it.');
    const rows = await q<{ id: number }>(
      `INSERT INTO companies (name, slug, created_ms) VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug RETURNING id`,
      [companyName, slug, Date.now()],
    );
    companyId = rows[0].id;
  }

  const id = randomUUID();
  const token = randomBytes(24).toString('base64url');
  const made = await q<{ id: string }>(
    `INSERT INTO players (id, name, name_key, company_id, league, token_hash, oxygen, created_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (name_key) DO NOTHING RETURNING id`,
    [id, name, name.toLowerCase(), companyId, league, hashToken(token), OXYGEN_START, Date.now()],
  );
  if (!made.length) throw new GameError('That climber name is taken. Try another.');
  if (companyId) await grantBadges(id, ['roped-up']);
  return { key: `${id}.${token}`, player: { id, name } };
}

/** Issue a fresh climber key. The old key stops working. */
export async function newKey(player: Player): Promise<{ key: string }> {
  const token = randomBytes(24).toString('base64url');
  await q(`UPDATE players SET token_hash = $1 WHERE id = $2`, [hashToken(token), player.id]);
  return { key: `${player.id}.${token}` };
}

// ----------------------------------------------------------------- climbing
export async function startChallenge(player: Player, challengeId: string, mode: string): Promise<Attempt> {
  const c = getChallenge(challengeId);
  if (!c) throw new GameError('No such challenge.');
  const attempts = await getAttempts(player.id);
  const existing = attempts.get(c.id);
  if (existing) return existing;
  const open = challengeOpen(c, attempts);
  if (!open.open) throw new GameError(open.why ?? 'Locked.');
  const m = mode === 'storm' && c.kind === 'sql' ? 'storm' : 'standard';
  await q(
    `INSERT INTO attempts (player_id, challenge_id, variant, mode, started_ms) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (player_id, challenge_id) DO NOTHING`,
    [player.id, c.id, variantFor(player.id, c), m, Date.now()],
  );
  return (await getAttempts(player.id)).get(c.id)!;
}

async function mustHaveAttempt(player: Player, challengeId: string): Promise<{ c: Challenge; a: Attempt }> {
  const c = getChallenge(challengeId);
  if (!c) throw new GameError('No such challenge.');
  const a = (await getAttempts(player.id)).get(c.id);
  if (!a) throw new GameError('Start the climb first.');
  return { c, a };
}

export async function buyHint(player: Player, challengeId: string): Promise<{ hint: string; oxygen: number; hints: number }> {
  const { c, a } = await mustHaveAttempt(player, challengeId);
  if (a.solved_ms) throw new GameError('Already solved.');
  if (a.hints >= c.hints.length) throw new GameError('No more hints for this one.');
  const cost = HINT_COST[a.hints];
  const paid = await q<{ oxygen: number }>(
    `UPDATE players SET oxygen = oxygen - $2 WHERE id = $1 AND oxygen >= $2 RETURNING oxygen`,
    [player.id, cost],
  );
  if (!paid.length) throw new GameError(`That hint costs ${cost} oxygen and you have ${player.oxygen}. Daily questions and finished camps earn more.`);
  await q(`UPDATE attempts SET hints = hints + 1 WHERE player_id = $1 AND challenge_id = $2 AND hints = $3`, [player.id, c.id, a.hints]);
  return { hint: c.hints[a.hints], oxygen: paid[0].oxygen, hints: a.hints + 1 };
}

export type Award = {
  points: number;
  parts: { label: string; points: number }[];
  badges: Badge[];
  campComplete: string | null;
  unlocked: string | null;
  oxygen: number;
  streak: number;
  durationMs: number;
  next: { id: string; title: string } | null;
};

export type SubmitResult =
  | { correct: true; award: Award; explain?: string }
  | { correct: false; detail: string; tries: number; explain?: string };

function tooFast(a: Attempt, now: number): boolean {
  return a.last_try_ms !== null && now - a.last_try_ms < MIN_GAP_MS;
}

export async function submitSql(player: Player, challengeId: string, sqlText: unknown, rowsIn: unknown): Promise<SubmitResult> {
  const { c, a } = await mustHaveAttempt(player, challengeId);
  if (c.kind !== 'sql') throw new GameError('This one is multiple choice.');
  if (a.solved_ms) throw new GameError('Already solved.');
  const now = Date.now();
  if (tooFast(a, now)) throw new GameError('Catch your breath: wait a second between submissions.');
  const sqlStr = typeof sqlText === 'string' ? sqlText.slice(0, 10000) : '';
  if (!Array.isArray(rowsIn) || rowsIn.length > 2000) throw new GameError('That result is too large to check. The answer has far fewer rows.');
  const rows: Cell[][] = [];
  for (const r of rowsIn) {
    if (!Array.isArray(r) || r.length > 40) throw new GameError('That result has too many columns to check.');
    rows.push(r.map((v) => (v === null || v === undefined ? null : String(v).slice(0, 400))));
  }
  const expected = ANSWERS[c.id]?.[a.variant];
  if (!expected) throw new GameError('This challenge has no answer on file. Tell the organiser.');
  const verdict = compareResults(expected.rows, rows, c.ordered, expected.cols);
  if (!verdict.ok) {
    await q(`UPDATE attempts SET tries = tries + 1, last_try_ms = $3 WHERE player_id = $1 AND challenge_id = $2`, [player.id, c.id, now]);
    return { correct: false, detail: verdict.detail, tries: a.tries + 1 };
  }
  return { correct: true, award: await award(player, c, a, now, sqlStr) };
}

export async function submitChoice(player: Player, challengeId: string, choice: unknown): Promise<SubmitResult> {
  const { c, a } = await mustHaveAttempt(player, challengeId);
  if (c.kind !== 'mcq') throw new GameError('This one needs a query.');
  if (a.solved_ms) throw new GameError('Already solved.');
  const now = Date.now();
  if (tooFast(a, now)) throw new GameError('Catch your breath: wait a second between answers.');
  const order = optionOrder(player.id, c);
  const picked = order[Number(choice)];
  if (picked === undefined) throw new GameError('Pick one of the options.');
  if (picked !== c.answer) {
    await q(`UPDATE attempts SET tries = tries + 1, last_try_ms = $3 WHERE player_id = $1 AND challenge_id = $2`, [player.id, c.id, now]);
    return { correct: false, detail: 'Not that one. A second look costs half the altitude.', tries: a.tries + 1 };
  }
  return { correct: true, award: await award(player, c, a, now, null), explain: c.explain };
}

export async function revealAnswer(player: Player, challengeId: string): Promise<{ unlocked: string | null; next: { id: string; title: string } | null }> {
  const { c, a } = await mustHaveAttempt(player, challengeId);
  if (c.kind !== 'sql') throw new GameError('Multiple choice questions show the answer once you find it.');
  if (a.solved_ms) throw new GameError('Already finished.');
  if (a.tries < REVEAL_AFTER) throw new GameError(`The answer opens after ${REVEAL_AFTER} attempts. You have made ${a.tries}.`);
  const now = Date.now();
  const gate = await q(
    `UPDATE attempts SET solved_ms = $3, points = 0, first_try = FALSE, storm_won = NULL, duration_ms = $4, revealed = TRUE
      WHERE player_id = $1 AND challenge_id = $2 AND solved_ms IS NULL RETURNING challenge_id`,
    [player.id, c.id, now, now - a.started_ms],
  );
  if (!gate.length) throw new GameError('Already finished.');
  const attempts = await getAttempts(player.id);
  const before = new Map(attempts);
  before.set(c.id, { ...attempts.get(c.id)!, solved_ms: null });
  const campNow = campStates(attempts);
  const campBefore = campStates(before);
  const newlyOpen = campNow.find((st, i) => st.unlocked && !campBefore[i].unlocked);
  return { unlocked: newlyOpen?.name ?? null, next: nextChallenge(c.id, attempts) };
}

async function award(player: Player, c: Challenge, a: Attempt, now: number, sqlText: string | null): Promise<Award> {
  const parts: { label: string; points: number }[] = [];
  const firstTry = a.tries === 0;
  let stormWon: boolean | null = null;
  let total: number;
  if (c.kind === 'mcq') {
    const factor = a.tries === 0 ? 1 : a.tries === 1 ? 0.5 : 0.25;
    total = Math.round(c.points * factor);
    parts.push({ label: a.tries === 0 ? 'Right first time' : a.tries === 1 ? 'Second look (half)' : 'Got there (quarter)', points: total });
  } else {
    parts.push({ label: 'Climb', points: c.points });
    total = c.points;
    if (firstTry) {
      const b = Math.round(c.points * FIRST_TRY_BONUS);
      parts.push({ label: 'Clean first attempt', points: b });
      total += b;
    }
    if (a.mode === 'storm') {
      stormWon = now - a.started_ms <= STORM_MINUTES[c.difficulty] * 60000;
      const delta = Math.round(total * (stormWon ? STORM_WIN : STORM_LOSS)) - total;
      parts.push({ label: stormWon ? 'Beat the storm' : 'Caught by the storm', points: delta });
      total += delta;
    }
  }
  const duration = now - a.started_ms;
  // The WHERE clause is the gate: only one request can ever mark an attempt solved.
  const gate = await q(
    `UPDATE attempts SET solved_ms = $3, points = $4, first_try = $5, storm_won = $6, duration_ms = $7, sql_text = $8,
            tries = tries + 1, last_try_ms = $3
      WHERE player_id = $1 AND challenge_id = $2 AND solved_ms IS NULL RETURNING challenge_id`,
    [player.id, c.id, now, total, firstTry, stormWon, duration, sqlText],
  );
  if (!gate.length) throw new GameError('Already solved.');
  await q(`INSERT INTO ledger (player_id, points, reason, ref, at_ms) VALUES ($1, $2, 'solve', $3, $4)`, [player.id, total, c.id, now]);

  const attempts = await getAttempts(player.id);
  const before = new Map(attempts);
  before.set(c.id, { ...attempts.get(c.id)!, solved_ms: null });
  const campNow = campStates(attempts);
  const campBefore = campStates(before);
  const mine = campNow.find((s) => s.id === c.camp)!;
  const campComplete = mine.solved === mine.total ? mine.name : null;
  const newlyOpen = campNow.find((s, i) => s.unlocked && !campBefore[i].unlocked);

  const streak = await touchStreak(player, now);
  const oxy = await q<{ oxygen: number }>(
    `UPDATE players SET altitude = altitude + $2, oxygen = LEAST($4, oxygen + $3) WHERE id = $1 RETURNING oxygen`,
    [player.id, total, campComplete ? 1 : 0, OXYGEN_MAX],
  );
  const badges = await evaluateBadges(player.id, streak);
  return { points: total, parts, badges, campComplete, unlocked: newlyOpen?.name ?? null, oxygen: oxy[0].oxygen, streak, durationMs: duration, next: nextChallenge(c.id, attempts) };
}

async function touchStreak(player: Player, now: number): Promise<number> {
  const today = nzDay(now);
  const rows = await q<{ streak: number; rest_days: number; last_active_day: string | null; best_streak: number }>(
    `SELECT streak, rest_days, last_active_day, best_streak FROM players WHERE id = $1`,
    [player.id],
  );
  const p = rows[0];
  if (p.last_active_day === today) return p.streak;
  let streak = 1;
  let rest = p.rest_days;
  if (p.last_active_day) {
    const gap = dayNumber(today) - dayNumber(p.last_active_day);
    if (gap === 1) streak = p.streak + 1;
    else if (gap === 2 && rest > 0) { streak = p.streak + 1; rest -= 1; }
  }
  if (streak % 7 === 0) rest = 1; // a full week earns the rest day back
  await q(`UPDATE players SET streak = $2, best_streak = GREATEST(best_streak, $2), rest_days = $3, last_active_day = $4 WHERE id = $1`, [player.id, streak, rest, today]);
  return streak;
}

// ------------------------------------------------------------------- badges
async function grantBadges(playerId: string, ids: string[]): Promise<Badge[]> {
  const got: Badge[] = [];
  for (const id of ids) {
    const r = await q(`INSERT INTO badges (player_id, badge_id, at_ms) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING badge_id`, [playerId, id, Date.now()]);
    if (r.length) { const b = BADGES.find((x) => x.id === id); if (b) got.push(b); }
  }
  return got;
}

const CAMP_BADGE: Record<string, string> = { base: 'tent', treeline: 'axe', glacier: 'crampons', icefall: 'rope', ridge: 'headlamp', summit: 'flag' };

async function evaluateBadges(playerId: string, streak: number): Promise<Badge[]> {
  const attempts = await getAttempts(playerId);
  const solved = [...attempts.values()].filter((a) => a.solved_ms && !a.revealed);
  const have = new Set((await q<{ badge_id: string }>(`SELECT badge_id FROM badges WHERE player_id = $1`, [playerId])).map((r) => r.badge_id));
  const want: string[] = [];
  if (solved.length >= 1) want.push('boots');
  if (solved.filter((a) => a.first_try).length >= 5) want.push('clean-line');
  if (solved.filter((a) => a.storm_won).length >= 3) want.push('storm-chaser');
  if (streak >= 3) want.push('weather-window');
  if (streak >= 7) want.push('bluebird');
  for (const camp of campStates(attempts)) {
    const list = CHALLENGES.filter((c) => c.camp === camp.id);
    if (!list.every((c) => { const a = attempts.get(c.id); return a?.solved_ms && !a.revealed; })) continue;
    want.push(CAMP_BADGE[camp.id]);
    if (list.every((c) => (attempts.get(c.id)?.hints ?? 0) === 0)) want.push('alpine-style');
  }
  return grantBadges(playerId, want.filter((id) => !have.has(id)));
}

export async function claimCache(player: Player, which: unknown): Promise<{ badge: Badge | null }> {
  const id = which === 'yeti' ? 'yeti' : which === 'glove' ? 'glove' : null;
  if (!id) throw new GameError('Nothing there.');
  const got = await grantBadges(player.id, [id]);
  return { badge: got[0] ?? null };
}

// -------------------------------------------------------------------- daily
export function todaysQuestion(now = Date.now()) {
  const day = nzDay(now);
  return { day, question: TRIVIA[dayNumber(day) % TRIVIA.length] };
}

export async function getDaily(player: Player) {
  const { day, question } = todaysQuestion();
  const done = await q<{ correct: boolean }>(`SELECT correct FROM daily WHERE player_id = $1 AND day = $2`, [player.id, day]);
  return {
    day,
    q: question.q,
    options: question.options,
    answered: done.length ? { correct: done[0].correct, answer: question.answer, explain: question.explain } : null,
  };
}

export async function answerDaily(player: Player, choice: unknown) {
  const now = Date.now();
  const { day, question } = todaysQuestion(now);
  const idx = Number(choice);
  if (!Number.isInteger(idx) || idx < 0 || idx >= question.options.length) throw new GameError('Pick one of the options.');
  const correct = idx === question.answer;
  const ins = await q(
    `INSERT INTO daily (player_id, day, question_id, correct, at_ms) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING RETURNING day`,
    [player.id, day, question.id, correct, now],
  );
  if (!ins.length) throw new GameError("You have already answered today's question. A new one arrives at midnight, New Zealand time.");
  let badges: Badge[] = [];
  let oxygen = player.oxygen;
  let streak = liveStreak(player, now);
  if (correct) {
    await q(`INSERT INTO ledger (player_id, points, reason, ref, at_ms) VALUES ($1, $2, 'daily', $3, $4)`, [player.id, DAILY_POINTS, question.id, now]);
    streak = await touchStreak(player, now);
    const r = await q<{ oxygen: number }>(`UPDATE players SET altitude = altitude + $2, oxygen = LEAST($3, oxygen + 1) WHERE id = $1 RETURNING oxygen`, [player.id, DAILY_POINTS, OXYGEN_MAX]);
    oxygen = r[0].oxygen;
    badges = await evaluateBadges(player.id, streak);
    const n = await q<{ n: number }>(`SELECT COUNT(*)::int AS n FROM daily WHERE player_id = $1 AND correct`, [player.id]);
    if (n[0].n >= 5) badges = badges.concat(await grantBadges(player.id, ['forecaster']));
  }
  return { correct, answer: question.answer, explain: question.explain, points: correct ? DAILY_POINTS : 0, oxygen, streak, badges };
}

// -------------------------------------------------------------- suggestions
export async function suggest(player: Player, title: unknown, body: unknown) {
  const t = String(title ?? '').trim().slice(0, 120);
  const b = String(body ?? '').trim().slice(0, 4000);
  if (t.length < 4 || b.length < 20) throw new GameError('Give your challenge a title and at least a sentence or two of detail.');
  const n = await q<{ n: number }>(`SELECT COUNT(*)::int AS n FROM suggestions WHERE player_id = $1 AND at_ms > $2`, [player.id, Date.now() - 86400000]);
  if (n[0].n >= 5) throw new GameError('Five ideas a day is the limit. Come back tomorrow.');
  await q(`INSERT INTO suggestions (player_id, title, body, at_ms) VALUES ($1, $2, $3, $4)`, [player.id, t, b, Date.now()]);
  return {};
}

// ------------------------------------------------------------- leaderboards
export type BoardWindow = 'week' | 'season' | 'all';

export function windowRange(w: BoardWindow, now = Date.now()): [number, number] {
  if (w === 'week') {
    const start = nzWeekStartDay(now);
    return [nzDayStartMs(start), nzDayStartMs(addDays(start, 7))];
  }
  if (w === 'season') return [nzDayStartMs(SEASON.startDay), nzDayStartMs(addDays(SEASON.endDay, 1))];
  return [0, 8.64e15];
}

export type BoardRow = { id: string; name: string; league: string; company: string | null; slug: string | null; pts: number; pos: number };

export async function individualBoard(w: BoardWindow, league: string): Promise<BoardRow[]> {
  const [from, to] = windowRange(w);
  return q<BoardRow>(
    `WITH s AS (SELECT player_id, SUM(points)::int AS pts, MAX(at_ms) AS last FROM ledger WHERE at_ms >= $1 AND at_ms < $2 GROUP BY player_id)
     SELECT p.id, p.name, p.league, c.name AS company, c.slug, s.pts,
            (ROW_NUMBER() OVER (ORDER BY s.pts DESC, s.last ASC))::int AS pos
       FROM s JOIN players p ON p.id = s.player_id LEFT JOIN companies c ON c.id = p.company_id
      WHERE NOT p.hidden AND s.pts > 0 AND ($3 = 'all' OR p.league = $3)
      ORDER BY pos LIMIT 2000`,
    [from, to, league],
  );
}

export type TeamRow = { name: string; slug: string; total: number; climbers: number; altitude: number; pos: number };

export async function teamBoard(w: BoardWindow): Promise<TeamRow[]> {
  const [from, to] = windowRange(w);
  const rows = await q<{ name: string; slug: string; total: number; climbers: number }>(
    `WITH s AS (SELECT player_id, SUM(points)::int AS pts FROM ledger WHERE at_ms >= $1 AND at_ms < $2 GROUP BY player_id),
          r AS (SELECT p.company_id, s.pts, ROW_NUMBER() OVER (PARTITION BY p.company_id ORDER BY s.pts DESC) AS rn
                  FROM s JOIN players p ON p.id = s.player_id WHERE p.company_id IS NOT NULL AND NOT p.hidden AND s.pts > 0)
     SELECT c.name, c.slug, COALESCE(SUM(r.pts) FILTER (WHERE r.rn <= $3), 0)::int AS total, COUNT(*)::int AS climbers
       FROM r JOIN companies c ON c.id = r.company_id GROUP BY c.name, c.slug ORDER BY total DESC, c.name LIMIT 500`,
    [from, to, TEAM_SEATS],
  );
  return rows.map((r, i) => ({ ...r, altitude: Math.round(r.total / TEAM_SEATS), pos: i + 1 }));
}

export async function teamPage(slug: string) {
  const co = await q<{ id: number; name: string; slug: string }>(`SELECT id, name, slug FROM companies WHERE slug = $1`, [slug]);
  if (!co.length) return null;
  const [wFrom, wTo] = windowRange('week');
  const members = await q<{ name: string; league: string; altitude: number; week: number }>(
    `SELECT p.name, p.league, p.altitude,
            COALESCE((SELECT SUM(l.points) FROM ledger l WHERE l.player_id = p.id AND l.at_ms >= $2 AND l.at_ms < $3), 0)::int AS week
       FROM players p WHERE p.company_id = $1 AND NOT p.hidden ORDER BY p.altitude DESC, p.name LIMIT 200`,
    [co[0].id, wFrom, wTo],
  );
  const weekTotal = members.reduce((s, m) => s + m.week, 0);
  const top = members.slice(0, TEAM_SEATS).reduce((s, m) => s + m.altitude, 0);
  return { ...co[0], members, weekTotal, goal: TEAM_WEEKLY_GOAL_M, altitude: Math.round(top / TEAM_SEATS) };
}

export async function fastest(challengeId: string): Promise<{ name: string; duration_ms: number }[]> {
  return q(
    `SELECT p.name, a.duration_ms FROM attempts a JOIN players p ON p.id = a.player_id
      WHERE a.challenge_id = $1 AND a.solved_ms IS NOT NULL AND NOT a.revealed AND NOT p.hidden ORDER BY a.duration_ms ASC LIMIT 3`,
    [challengeId],
  );
}

export async function lockerData(player: Player) {
  const attempts = await getAttempts(player.id);
  const earned = await q<{ badge_id: string; at_ms: number }>(`SELECT badge_id, at_ms FROM badges WHERE player_id = $1`, [player.id]);
  const daily = await q<{ n: number }>(`SELECT COUNT(*)::int AS n FROM daily WHERE player_id = $1 AND correct`, [player.id]);
  const solved = [...attempts.values()].filter((a) => a.solved_ms && !a.revealed);
  const [sFrom, sTo] = windowRange('season');
  const season = await q<{ pts: number }>(`SELECT COALESCE(SUM(points), 0)::int AS pts FROM ledger WHERE player_id = $1 AND at_ms >= $2 AND at_ms < $3`, [player.id, sFrom, sTo]);
  return {
    camps: campStates(attempts),
    earned: new Map(earned.map((e) => [e.badge_id, e.at_ms])),
    stats: {
      solved: solved.length,
      total: CHALLENGES.length,
      firstTries: solved.filter((a) => a.first_try).length,
      stormWins: solved.filter((a) => a.storm_won).length,
      hints: [...attempts.values()].reduce((s, a) => s + a.hints, 0),
      dailyCorrect: daily[0].n,
      seasonPoints: season[0].pts,
    },
  };
}

export { CAMPS, CHALLENGES, BADGES, SEASON };
export type { Challenge, SqlChallenge, McqChallenge };
