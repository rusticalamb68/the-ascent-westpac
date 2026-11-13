// The in-browser SQL engine. Everything here runs on the player's own machine.
import { CSV_FILES, loadStatements, prepareSql, wrapForValues } from './dataset';

type Conn = { query: (sql: string) => Promise<{ schema: { fields: { name: string }[] }; toArray: () => { toJSON: () => Record<string, unknown> }[] }> };

let ready: Promise<Conn> | null = null;

async function boot(): Promise<Conn> {
  const duckdb = await import('@duckdb/duckdb-wasm');
  const logger = new duckdb.VoidLogger();
  let db: InstanceType<typeof duckdb.AsyncDuckDB>;
  try {
    const worker = new Worker('/duckdb/duckdb-browser-eh.worker.js');
    db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate('/duckdb/duckdb-eh.wasm');
  } catch {
    // Fallback: load the same engine build from the jsDelivr CDN.
    const base = `https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@${duckdb.PACKAGE_VERSION}/dist/`;
    const blob = new Blob([`importScripts("${base}duckdb-browser-eh.worker.js");`], { type: 'text/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(base + 'duckdb-eh.wasm');
  }
  await Promise.all(
    CSV_FILES.map(async (f) => {
      const res = await fetch('/data/' + f);
      if (!res.ok) throw new Error('Could not load ' + f);
      await db.registerFileText(f, await res.text());
    }),
  );
  const conn = (await db.connect()) as unknown as Conn;
  for (const s of loadStatements()) await conn.query(s);
  return conn;
}

export function startEngine(): Promise<Conn> {
  if (!ready) {
    ready = boot().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

export type RunResult =
  | { ok: true; columns: string[]; rows: (string | null)[][]; ms: number }
  | { ok: false; error: string };

function clean(message: string): string {
  // Engine errors can carry a long internal trace; the first lines are the useful part.
  return message.split('\n').slice(0, 6).join('\n').trim();
}

export async function runQuery(text: string): Promise<RunResult> {
  const prep = prepareSql(text);
  if (!prep.ok) return { ok: false, error: prep.error };
  let conn: Conn;
  try {
    conn = await startEngine();
  } catch (e) {
    return { ok: false, error: 'The SQL engine could not start in this browser. ' + (e instanceof Error ? e.message : '') };
  }
  const t0 = performance.now();
  try {
    const first = await conn.query(prep.sql);
    const columns = first.schema.fields.map((f) => f.name);
    const n = columns.length;
    const res = await conn.query(wrapForValues(prep.sql, n));
    const rows = res.toArray().map((r) => {
      const o = r.toJSON();
      return Array.from({ length: n }, (_, i) => {
        const v = o['c' + i];
        return v === null || v === undefined ? null : String(v);
      });
    });
    return { ok: true, columns, rows, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return { ok: false, error: clean(e instanceof Error ? e.message : String(e)) };
  }
}
