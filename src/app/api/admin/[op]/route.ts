import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { q } from '@/server/db';

// Organiser tools. Set ADMIN_KEY in the Vercel project settings, then call e.g.
//   GET  /api/admin/suggestions   with header  x-admin-key: <key>
//   GET  /api/admin/players
//   GET  /api/admin/audit?top=20  (winning SQL for the top climbers, for prize checks)
//   POST /api/admin/hide          {"name": "Climber Name", "hidden": true}

function allowed(request: Request): boolean {
  const key = process.env.ADMIN_KEY;
  if (!key || key.length < 12) return false;
  const given = request.headers.get('x-admin-key') ?? '';
  const a = Buffer.from(given);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request, ctx: { params: Promise<{ op: string }> }) {
  if (!allowed(request)) return NextResponse.json({ ok: false, error: 'Not allowed.' }, { status: 401 });
  const { op } = await ctx.params;
  if (op === 'suggestions') {
    return NextResponse.json({ ok: true, rows: await q(`SELECT s.id, p.name, s.title, s.body, s.at_ms FROM suggestions s JOIN players p ON p.id = s.player_id ORDER BY s.at_ms DESC LIMIT 500`) });
  }
  if (op === 'players') {
    return NextResponse.json({ ok: true, rows: await q(`SELECT p.name, p.league, c.name AS company, p.altitude, p.hidden, p.created_ms FROM players p LEFT JOIN companies c ON c.id = p.company_id ORDER BY p.altitude DESC LIMIT 5000`) });
  }
  if (op === 'audit') {
    const top = Math.min(200, Math.max(1, Number(new URL(request.url).searchParams.get('top') ?? 20)));
    return NextResponse.json({
      ok: true,
      rows: await q(
        `SELECT p.name, a.challenge_id, a.variant, a.mode, a.tries, a.hints, a.points, a.duration_ms, a.solved_ms, a.sql_text
           FROM attempts a JOIN players p ON p.id = a.player_id
          WHERE a.solved_ms IS NOT NULL AND p.id IN (SELECT id FROM players WHERE NOT hidden ORDER BY altitude DESC LIMIT $1)
          ORDER BY p.altitude DESC, p.name, a.solved_ms`,
        [top],
      ),
    });
  }
  return NextResponse.json({ ok: false, error: 'Unknown operation.' }, { status: 404 });
}

export async function POST(request: Request, ctx: { params: Promise<{ op: string }> }) {
  if (!allowed(request)) return NextResponse.json({ ok: false, error: 'Not allowed.' }, { status: 401 });
  const { op } = await ctx.params;
  if (op === 'hide') {
    const body = (await request.json()) as { name?: string; hidden?: boolean };
    const rows = await q(`UPDATE players SET hidden = $2 WHERE name_key = $1 RETURNING name, hidden`, [String(body.name ?? '').toLowerCase(), body.hidden !== false]);
    return NextResponse.json({ ok: true, rows });
  }
  return NextResponse.json({ ok: false, error: 'Unknown operation.' }, { status: 404 });
}
