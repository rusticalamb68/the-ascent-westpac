// Computes the expected result for every SQL challenge variant, using the same
// DuckDB-WASM build the browser runs. Output is server-only.
import fs from 'node:fs';
import path from 'node:path';
import { openDuck } from './duck.mjs';
import { TABLES, CSV_FILES, loadStatements, prepareSql, wrapForValues } from '../src/lib/dataset.ts';
import { CHALLENGES, fill } from '../src/content/challenges.ts';
import { compareResults } from '../src/lib/compare.ts';

const root = path.resolve(import.meta.dirname, '..');
const db = await openDuck();
for (const f of CSV_FILES) db.registerFileText(f, fs.readFileSync(path.join(root, 'public/data', f), 'utf8'));
const conn = db.connect();
for (const s of loadStatements()) conn.query(s);

export function run(sqlText) {
  const prep = prepareSql(sqlText);
  if (!prep.ok) throw new Error(prep.error);
  const first = conn.query(prep.sql);
  const n = first.schema.fields.length;
  const res = conn.query(wrapForValues(prep.sql, n));
  const rows = res.toArray().map((r) => { const o = r.toJSON(); return Array.from({ length: n }, (_, i) => (o['c' + i] === null || o['c' + i] === undefined ? null : String(o['c' + i]))); });
  return { cols: first.schema.fields.map((f) => f.name), rows };
}

const answers = {};
let problems = 0;
const verbose = process.argv.includes('-v');
for (const c of CHALLENGES) {
  if (c.kind !== 'sql') continue;
  answers[c.id] = [];
  const sigs = new Set();
  for (const [vi, params] of c.variants.entries()) {
    const { cols, rows } = run(fill(c.solution, params));
    answers[c.id].push({ cols: cols.length, rows });
    sigs.add(JSON.stringify(rows));
    let note = '';
    if (rows.length === 0) { note += ' EMPTY!'; problems++; }
    if (c.starter) {
      const s = run(fill(c.starter, params));
      const v = compareResults(rows, s.rows, c.ordered, cols.length);
      if (v.ok) { note += ' STARTER ALREADY PASSES!'; problems++; } else note += ` (starter fails: ${v.reason})`;
    }
    console.error(`${c.id} v${vi} ${String(rows.length).padStart(4)} rows x ${cols.length}${note}`);
    if (verbose) console.error(rows.slice(0, 6).map((r) => '    ' + r.join(' | ')).join('\n'));
  }
  if (c.variants.length > 1 && sigs.size !== c.variants.length) { console.error(`  ${c.id}: variants give identical answers!`); problems++; }
}
const visible = TABLES.filter((t) => !t.staging).map((t) => t.name);
for (const t of visible) console.error(t.padEnd(18), run(`SELECT COUNT(*) FROM ${t}`).rows[0][0]);
fs.mkdirSync(path.join(root, 'src/server'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/server/answers.generated.json'), JSON.stringify(answers));
console.error('wrote answers', (JSON.stringify(answers).length / 1024).toFixed(0), 'KB;', problems, 'problems');
process.exit(problems ? 1 : 0);
