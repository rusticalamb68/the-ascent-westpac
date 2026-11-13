import 'server-only';

// Postgres access. On Vercel this talks to Neon over HTTP using DATABASE_URL.
// Locally, with no DATABASE_URL, it uses an embedded Postgres (PGlite) in ./.pglite

type Row = Record<string, unknown>;
type Runner = (text: string, params: unknown[]) => Promise<Row[]>;

export class NoDatabaseError extends Error {
  constructor() {
    super('No database is connected. Add a Postgres database to this project in Vercel (Storage tab) so that DATABASE_URL is set, then redeploy.');
    this.name = 'NoDatabaseError';
  }
}

const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS companies (
     id SERIAL PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, created_ms DOUBLE PRECISION NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS players (
     id TEXT PRIMARY KEY, name TEXT NOT NULL, name_key TEXT NOT NULL UNIQUE,
     company_id INTEGER REFERENCES companies(id), league TEXT NOT NULL, token_hash TEXT NOT NULL,
     oxygen INTEGER NOT NULL DEFAULT 3, altitude INTEGER NOT NULL DEFAULT 0,
     streak INTEGER NOT NULL DEFAULT 0, best_streak INTEGER NOT NULL DEFAULT 0, rest_days INTEGER NOT NULL DEFAULT 1,
     last_active_day TEXT, hidden BOOLEAN NOT NULL DEFAULT FALSE, created_ms DOUBLE PRECISION NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS attempts (
     player_id TEXT NOT NULL REFERENCES players(id), challenge_id TEXT NOT NULL, variant INTEGER NOT NULL,
     mode TEXT NOT NULL, started_ms DOUBLE PRECISION NOT NULL, tries INTEGER NOT NULL DEFAULT 0,
     hints INTEGER NOT NULL DEFAULT 0, last_try_ms DOUBLE PRECISION, solved_ms DOUBLE PRECISION,
     points INTEGER, first_try BOOLEAN, storm_won BOOLEAN, duration_ms DOUBLE PRECISION, sql_text TEXT,
     PRIMARY KEY (player_id, challenge_id))`,
  `CREATE TABLE IF NOT EXISTS ledger (
     id SERIAL PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id), points INTEGER NOT NULL,
     reason TEXT NOT NULL, ref TEXT, at_ms DOUBLE PRECISION NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS ledger_at_idx ON ledger(at_ms)`,
  `CREATE INDEX IF NOT EXISTS ledger_player_idx ON ledger(player_id)`,
  `CREATE TABLE IF NOT EXISTS badges (
     player_id TEXT NOT NULL REFERENCES players(id), badge_id TEXT NOT NULL, at_ms DOUBLE PRECISION NOT NULL,
     PRIMARY KEY (player_id, badge_id))`,
  `CREATE TABLE IF NOT EXISTS daily (
     player_id TEXT NOT NULL REFERENCES players(id), day TEXT NOT NULL, question_id TEXT NOT NULL,
     correct BOOLEAN NOT NULL, at_ms DOUBLE PRECISION NOT NULL, PRIMARY KEY (player_id, day))`,
  `CREATE TABLE IF NOT EXISTS suggestions (
     id SERIAL PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id), title TEXT NOT NULL,
     body TEXT NOT NULL, at_ms DOUBLE PRECISION NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS ascent_meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)`,
  `INSERT INTO ascent_meta (k, v) VALUES ('schema', '1') ON CONFLICT (k) DO NOTHING`,
];

// Idempotent upgrades, run on every cold start so existing databases pick up new columns.
const UPGRADES: string[] = [
  `ALTER TABLE attempts ADD COLUMN IF NOT EXISTS revealed BOOLEAN NOT NULL DEFAULT FALSE`,
];

async function connect(): Promise<Runner> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  let run: Runner;
  if (url) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);
    run = async (text, params) => (await sql.query(text, params)) as Row[];
  } else {
    if (process.env.VERCEL) throw new NoDatabaseError();
    const { PGlite } = await import('@electric-sql/pglite');
    const dir = process.env.PGLITE_DIR ?? './.pglite';
    const db = dir === 'memory' ? new PGlite() : new PGlite(dir);
    run = async (text, params) => (await db.query(text, params as unknown[])).rows as Row[];
  }
  const ready = await run(`SELECT to_regclass('public.ascent_meta') AS t`, []);
  if (!ready[0]?.t) for (const m of MIGRATIONS) await run(m, []);
  for (const u of UPGRADES) await run(u, []);
  return run;
}

const g = globalThis as unknown as { __ascentDb?: Promise<Runner> };

export async function q<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  if (!g.__ascentDb) {
    g.__ascentDb = connect().catch((e) => {
      g.__ascentDb = undefined;
      throw e;
    });
  }
  const run = await g.__ascentDb;
  return (await run(text, params)) as T[];
}
