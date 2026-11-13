// Copies the DuckDB-WASM engine into /public so the site serves it itself
// (no third-party CDN needed at runtime). Runs automatically after npm install.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const dist = path.dirname(require.resolve('@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs'));
const out = path.resolve(import.meta.dirname, '../public/duckdb');
fs.mkdirSync(out, { recursive: true });
for (const f of ['duckdb-eh.wasm', 'duckdb-browser-eh.worker.js']) {
  fs.copyFileSync(path.join(dist, f), path.join(out, f));
}
console.log('DuckDB engine copied to public/duckdb');
