import 'server-only';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { cache } from 'react';
import { createHash } from 'node:crypto';
import { q } from './db';

export const COOKIE = 'ascent';

export type Player = {
  id: string;
  name: string;
  league: string;
  oxygen: number;
  altitude: number;
  streak: number;
  best_streak: number;
  rest_days: number;
  last_active_day: string | null;
  hidden: boolean;
  company_id: number | null;
  company_name: string | null;
  company_slug: string | null;
  created_ms: number;
};

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function playerFromKey(key: string | undefined): Promise<Player | null> {
  if (!key) return null;
  const dot = key.indexOf('.');
  if (dot < 1) return null;
  const id = key.slice(0, dot);
  const token = key.slice(dot + 1);
  const rows = await q<Player & { token_hash: string }>(
    `SELECT p.id, p.name, p.league, p.oxygen, p.altitude, p.streak, p.best_streak, p.rest_days, p.last_active_day,
            p.hidden, p.company_id, p.created_ms, p.token_hash, c.name AS company_name, c.slug AS company_slug
       FROM players p LEFT JOIN companies c ON c.id = p.company_id WHERE p.id = $1`,
    [id],
  );
  const row = rows[0];
  if (!row || row.token_hash !== hashToken(token)) return null;
  const { token_hash: _drop, ...player } = row;
  void _drop;
  return player;
}

/** The signed-in climber for this request, or null. */
export const getPlayer = cache(async (): Promise<Player | null> => {
  const jar = await cookies();
  await connection();
  return playerFromKey(jar.get(COOKIE)?.value);
});

export async function setSessionCookie(key: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, key, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}
