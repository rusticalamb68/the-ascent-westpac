// Compares a submitted result with the expected one. Runs on the server (grading)
// and in the build script (sanity checks). Cells arrive as text or null.

export type Cell = string | null;
export type Verdict =
  | { ok: true }
  | { ok: false; reason: 'columns' | 'rows' | 'order' | 'values'; detail: string };

type Canon = string | number | null;
const NUM = /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;
const TOL = 0.006;

export function canon(v: Cell): Canon {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === '') return '';
  if (NUM.test(s)) {
    const x = Number(s);
    if (Number.isFinite(x)) return x;
  }
  const midnight = /^(\d{4}-\d{2}-\d{2})[ T]00:00:00(\.0+)?$/.exec(s);
  if (midnight) return midnight[1];
  return s;
}

function cellEq(a: Canon, b: Canon): boolean {
  if (a === null || b === null) return a === b;
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= TOL;
  return a === b;
}

function rowEq(a: Canon[], b: Canon[]): boolean {
  for (let i = 0; i < a.length; i++) if (!cellEq(a[i], b[i])) return false;
  return true;
}

function sortKey(r: Canon[]): string {
  return r.map((c) => (c === null ? '\u0000' : typeof c === 'number' ? 'n' + (Math.round(c * 10) / 10).toFixed(1).padStart(18, ' ') : 's' + c)).join('\u0001');
}

function sorted(rows: Canon[][]): Canon[][] {
  return rows.map((r) => ({ r, k: sortKey(r) })).sort((x, y) => (x.k < y.k ? -1 : x.k > y.k ? 1 : 0)).map((x) => x.r);
}

function sameSet(a: Canon[][], b: Canon[][]): boolean {
  // Sorted pairwise match first; fall back to a greedy match in case two rows
  // straddle a rounding boundary and sort differently.
  const sa = sorted(a), sb = sorted(b);
  let all = true;
  for (let i = 0; i < sa.length; i++) if (!rowEq(sa[i], sb[i])) { all = false; break; }
  if (all) return true;
  if (a.length > 400) return false;
  const used = new Array(sb.length).fill(false);
  for (const ra of sa) {
    let hit = -1;
    for (let j = 0; j < sb.length; j++) if (!used[j] && rowEq(ra, sb[j])) { hit = j; break; }
    if (hit === -1) return false;
    used[hit] = true;
  }
  return true;
}

export function compareResults(expected: Cell[][], got: Cell[][], ordered: boolean, expectedCols: number): Verdict {
  const gotCols = got.length ? got[0].length : expectedCols;
  if (got.length && gotCols !== expectedCols) {
    return { ok: false, reason: 'columns', detail: `Your result has ${gotCols} column${gotCols === 1 ? '' : 's'}; the answer has ${expectedCols}.` };
  }
  if (got.length !== expected.length) {
    return { ok: false, reason: 'rows', detail: `Your result has ${got.length} row${got.length === 1 ? '' : 's'}; the answer has ${expected.length}.` };
  }
  const e = expected.map((r) => r.map(canon));
  const g = got.map((r) => r.map(canon));
  if (ordered) {
    let inOrder = true;
    for (let i = 0; i < e.length; i++) if (!rowEq(e[i], g[i])) { inOrder = false; break; }
    if (inOrder) return { ok: true };
    if (sameSet(e, g)) return { ok: false, reason: 'order', detail: 'Right rows, wrong order. Check the sort the brief asks for.' };
    return { ok: false, reason: 'values', detail: 'The shape is right but some values differ. Check filters, joins and column order.' };
  }
  if (sameSet(e, g)) return { ok: true };
  return { ok: false, reason: 'values', detail: 'The shape is right but some values differ. Check filters, joins and column order.' };
}
