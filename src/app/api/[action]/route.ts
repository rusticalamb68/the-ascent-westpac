import { NextResponse } from 'next/server';
import { getPlayer, playerFromKey, setSessionCookie, clearSessionCookie, type Player } from '@/server/session';
import { GameError, join, startChallenge, buyHint, submitSql, submitChoice, answerDaily, claimCache, suggest, newKey, revealAnswer } from '@/server/game';
import { NoDatabaseError } from '@/server/db';

type Body = Record<string, unknown>;

const open: Record<string, (b: Body) => Promise<unknown>> = {
  async join(b) {
    const { key, player } = await join(b);
    await setSessionCookie(key);
    return { key, name: player.name };
  },
  async resume(b) {
    const key = String(b.key ?? '').trim();
    const player = await playerFromKey(key);
    if (!player) throw new GameError('That climber key does not match anyone. Check you pasted all of it.');
    await setSessionCookie(key);
    return { name: player.name };
  },
  async leave() {
    await clearSessionCookie();
    return {};
  },
};

const authed: Record<string, (p: Player, b: Body) => Promise<unknown>> = {
  start: (p, b) => startChallenge(p, String(b.challengeId), String(b.mode ?? 'standard')).then(() => ({})),
  hint: (p, b) => buyHint(p, String(b.challengeId)),
  submit: (p, b) => submitSql(p, String(b.challengeId), b.sql, b.rows),
  choose: (p, b) => submitChoice(p, String(b.challengeId), b.choice),
  daily: (p, b) => answerDaily(p, b.choice),
  cache: (p, b) => claimCache(p, b.which),
  suggest: (p, b) => suggest(p, b.title, b.body),
  reveal: (p, b) => revealAnswer(p, String(b.challengeId)),
  async rekey(p) {
    const { key } = await newKey(p);
    await setSessionCookie(key);
    return { key };
  },
};

export async function POST(request: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    /* empty body is fine */
  }
  try {
    if (open[action]) return NextResponse.json({ ok: true, ...(await open[action](body) as object) });
    if (authed[action]) {
      const player = await getPlayer();
      if (!player) return NextResponse.json({ ok: false, error: 'Join the expedition first.' }, { status: 401 });
      return NextResponse.json({ ok: true, ...(await authed[action](player, body) as object) });
    }
    return NextResponse.json({ ok: false, error: 'Unknown action.' }, { status: 404 });
  } catch (e) {
    if (e instanceof GameError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    if (e instanceof NoDatabaseError) return NextResponse.json({ ok: false, error: e.message }, { status: 503 });
    console.error('api error', action, e);
    return NextResponse.json({ ok: false, error: 'Something went wrong on the mountain. Try again.' }, { status: 500 });
  }
}
