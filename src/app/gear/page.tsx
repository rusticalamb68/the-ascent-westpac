import type { Metadata } from 'next';
import Link from 'next/link';
import { Shell, withDb } from '@/components/Shell';
import { GearIcon } from '@/components/GearIcon';
import { LeaveButton, KeyPanel } from '@/components/Forms';
import { getPlayer } from '@/server/session';
import { lockerData, liveStreak, BADGES, LEAGUES, type CampState } from '@/server/game';

export const metadata: Metadata = { title: 'Gear locker' };

export default function Page() {
  return (
    <Shell>
      <Gear />
    </Shell>
  );
}

function Radar({ camps }: { camps: CampState[] }) {
  const cx = 170, cy = 150, R = 100;
  const pt = (i: number, f: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / camps.length;
    return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f] as const;
  };
  const ring = (f: number) => camps.map((_, i) => pt(i, f).join(',')).join(' ');
  const shape = camps.map((c, i) => pt(i, Math.max(0.04, c.solved / c.total)).join(',')).join(' ');
  return (
    <svg className="radar" viewBox="0 0 340 300" role="img" aria-label={'Share of each camp climbed: ' + camps.map((c) => `${c.name} ${c.solved} of ${c.total}`).join(', ')}>
      {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} points={ring(f)} fill="none" stroke="#c9d4de" />)}
      {camps.map((c, i) => {
        const [x, y] = pt(i, 1);
        const [lx, ly] = pt(i, 1.22);
        return (
          <g key={c.id}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#c9d4de" />
            <text x={lx} y={ly + 4} textAnchor={Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end'}>{c.name}</text>
          </g>
        );
      })}
      <polygon points={shape} fill="#d9a62e" fillOpacity="0.35" stroke="#8f6a0e" strokeWidth="2" />
    </svg>
  );
}

async function Gear() {
  return withDb(async () => {
    const player = await getPlayer();
    if (!player) {
      return (
        <div className="wrap narrow">
          <h1>Gear locker</h1>
          <p style={{ marginTop: 16 }}>Your badges and progress live here once you have joined.</p>
          <Link className="btn gold" href="/join">Join the expedition</Link>
        </div>
      );
    }
    const data = await lockerData(player);
    const have = BADGES.filter((b) => data.earned.has(b.id));
    return (
      <div className="wrap">
        <div className="head">
          <div>
            <h1>{player.name}</h1>
            <p className="sub">
              {LEAGUES.find((l) => l.id === player.league)?.name} league
              {player.company_slug ? <>, climbing for <Link href={`/team/${player.company_slug}`}>{player.company_name}</Link></> : ', climbing solo'}
            </p>
          </div>
          <LeaveButton />
        </div>
        <div className="stats">
          <div><b className="num">{player.altitude.toLocaleString('en-NZ')} m</b><span>climbed in total</span></div>
          <div><b className="num">{data.stats.solved} / {data.stats.total}</b><span>challenges climbed</span></div>
          <div><b className="num">{data.stats.firstTries}</b><span>clean first attempts</span></div>
          <div><b className="num">{data.stats.stormWins}</b><span>storms beaten</span></div>
          <div><b className="num">{liveStreak(player)}</b><span>day streak (best {player.best_streak})</span></div>
          <div><b className="num">{player.oxygen}</b><span>oxygen in the tank</span></div>
        </div>
        <div className="cols">
          <section className="c7">
            <h2 style={{ marginBottom: 6 }}>Gear</h2>
            <p className="muted small">{have.length} of {BADGES.length} collected. Two pieces are hidden somewhere off the map.</p>
            <ul className="gear">
              {BADGES.map((b) => {
                const got = data.earned.has(b.id);
                return (
                  <li key={b.id} className={got ? 'have' : undefined}>
                    <GearIcon name={got || !b.secret ? b.icon : 'peak'} />
                    <b>{got || !b.secret ? b.name : 'Hidden'}</b>
                    <span>{got || !b.secret ? b.how : 'Not everything is in the catalogue.'}</span>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="c5">
            <h2 style={{ marginBottom: 6 }}>Skill map</h2>
            <p className="muted small">How much of each camp you have climbed.</p>
            <Radar camps={data.camps} />
            <h2 style={{ margin: '24px 0 10px' }}>Expedition log</h2>
            {data.camps.filter((c) => c.unlocked).map((c) => (
              <p key={c.id} className="small"><b>{c.name}.</b> {c.log}</p>
            ))}
            <p className="small muted">
              Rest days: {player.rest_days}. A rest day covers one missed day so your streak survives. You earn it back with each full week.
            </p>
            <h2 style={{ margin: '24px 0 10px' }}>Climber key</h2>
            <KeyPanel />
          </section>
        </div>
      </div>
    );
  });
}
