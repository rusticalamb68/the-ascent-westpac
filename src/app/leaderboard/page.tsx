import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Shell, withDb } from '@/components/Shell';
import { getPlayer } from '@/server/session';
import { individualBoard, teamBoard, LEAGUES, SEASON, type BoardWindow, type BoardRow } from '@/server/game';
import { TEAM_SEATS } from '@/content/season';

export const metadata: Metadata = { title: 'Leaderboard' };

type Search = Promise<{ board?: string; window?: string; league?: string }>;

export default function Page({ searchParams }: { searchParams: Search }) {
  return (
    <Shell>
      <Board searchParams={searchParams} />
    </Shell>
  );
}

const WINDOWS: { id: BoardWindow; name: string }[] = [
  { id: 'season', name: SEASON.name },
  { id: 'week', name: 'This week' },
  { id: 'all', name: 'All time' },
];

function href(board: string, window: string, league: string) {
  const p = new URLSearchParams();
  if (board !== 'climbers') p.set('board', board);
  if (window !== 'season') p.set('window', window);
  if (league !== 'all') p.set('league', league);
  const s = p.toString();
  return '/leaderboard' + (s ? '?' + s : '');
}

/** Top 25, plus the signed-in climber with three neighbours either side. */
function visibleRows(rows: BoardRow[], meId?: string): (BoardRow | null)[] {
  const top = rows.slice(0, 25);
  const mine = meId ? rows.findIndex((r) => r.id === meId) : -1;
  if (mine < 25) return top;
  const from = Math.max(25, mine - 3);
  const out: (BoardRow | null)[] = [...top];
  if (from > 25) out.push(null);
  return out.concat(rows.slice(from, mine + 4));
}

async function Board({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const board = sp.board === 'teams' ? 'teams' : 'climbers';
  const window: BoardWindow = sp.window === 'week' || sp.window === 'all' ? sp.window : 'season';
  const league = LEAGUES.some((l) => l.id === sp.league) ? (sp.league as string) : 'all';
  return withDb(async () => {
    const player = await getPlayer();
    if (!player) redirect('/join');
    return (
      <div className="wrap">
        <div className="head">
          <div>
            <h1>Leaderboard</h1>
            <p className="sub">Altitude is metres climbed. Ties go to whoever got there first. Weeks start on Monday, New Zealand time.</p>
          </div>
        </div>
        <div className="note gold"><p><b>Prizes are coming.</b> {SEASON.name} standings will count. Winning entries will be checked before any prize is awarded.</p></div>
        <nav className="tabs" aria-label="Board">
          <Link href={href('climbers', window, league)} aria-current={board === 'climbers' ? 'page' : undefined}>Climbers</Link>
          <Link href={href('teams', window, 'all')} aria-current={board === 'teams' ? 'page' : undefined}>Teams</Link>
        </nav>
        <nav className="tabs minor" aria-label="Period">
          {WINDOWS.map((w) => (
            <Link key={w.id} href={href(board, w.id, league)} aria-current={window === w.id ? 'page' : undefined}>{w.name}</Link>
          ))}
        </nav>
        {board === 'climbers' && (
          <nav className="tabs minor" aria-label="League">
            <Link href={href(board, window, 'all')} aria-current={league === 'all' ? 'page' : undefined}>All leagues</Link>
            {LEAGUES.map((l) => (
              <Link key={l.id} href={href(board, window, l.id)} aria-current={league === l.id ? 'page' : undefined}>{l.name}</Link>
            ))}
          </nav>
        )}
        {board === 'climbers' ? <Climbers window={window} league={league} meId={player?.id} /> : <Teams window={window} mySlug={player?.company_slug ?? undefined} />}
      </div>
    );
  });
}

async function Climbers({ window, league, meId }: { window: BoardWindow; league: string; meId?: string }) {
  const rows = await individualBoard(window, league);
  if (!rows.length) return <p className="empty">No altitude on this board yet. Be the first on it.</p>;
  const leagueName = (id: string) => LEAGUES.find((l) => l.id === id)?.name ?? id;
  return (
    <table className="board">
      <thead><tr><th>Place</th><th>Climber</th><th>League</th><th className="r">Altitude</th></tr></thead>
      <tbody>
        {visibleRows(rows, meId).map((r, i) =>
          r === null ? (
            <tr className="gap" key={'gap' + i}><td colSpan={4}>…</td></tr>
          ) : (
            <tr key={r.id} className={`${r.id === meId ? 'me' : ''} ${r.pos === 1 ? 'podium-1' : ''}`}>
              <td className="pos num">{r.pos}</td>
              <td>
                <span className="name">{r.name}</span>
                {r.id === meId && <span className="tag">you</span>}
                {r.company && r.slug && <Link className="tag" href={`/team/${r.slug}`}>{r.company}</Link>}
              </td>
              <td className="small muted">{leagueName(r.league)}</td>
              <td className="r alt num">{r.pts.toLocaleString('en-NZ')} m</td>
            </tr>
          ),
        )}
      </tbody>
    </table>
  );
}

async function Teams({ window, mySlug }: { window: BoardWindow; mySlug?: string }) {
  const rows = await teamBoard(window);
  if (!rows.length) return <p className="empty">No team has scored yet. Add your team name when you join and put it on the board.</p>;
  return (
    <>
      <p className="small muted" style={{ marginTop: 12 }}>
        Team altitude is the average of a team&apos;s top {TEAM_SEATS} climbers. Empty seats count as zero, so the first {TEAM_SEATS} people matter most and headcount beyond that does not.
      </p>
      <table className="board">
        <thead><tr><th>Place</th><th>Team</th><th className="r">Climbers</th><th className="r">Team altitude</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.slug} className={`${r.slug === mySlug ? 'me' : ''} ${r.pos === 1 ? 'podium-1' : ''}`}>
              <td className="pos num">{r.pos}</td>
              <td><Link className="name" href={`/team/${r.slug}`}>{r.name}</Link>{r.slug === mySlug && <span className="tag">your team</span>}</td>
              <td className="r num">{r.climbers}</td>
              <td className="r alt num">{r.altitude.toLocaleString('en-NZ')} m</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
