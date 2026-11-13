import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Shell, withDb } from '@/components/Shell';
import { getPlayer } from '@/server/session';
import { teamPage, LEAGUES } from '@/server/game';
import { TEAM_SEATS } from '@/content/season';

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Shell>
      <Team params={params} />
    </Shell>
  );
}

async function Team({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return withDb(async () => {
    const [team, player] = await Promise.all([teamPage(slug), getPlayer()]);
    if (!player) redirect('/join');
    if (!team) notFound();
    const pct = Math.min(100, Math.round((team.weekTotal / team.goal) * 100));
    return (
      <div className="wrap">
        <p className="crumb"><Link href="/leaderboard?board=teams">Teams</Link></p>
        <div className="head">
          <div>
            <h1>{team.name}</h1>
            <p className="sub">{team.members.length} climber{team.members.length === 1 ? '' : 's'}. Team altitude {team.altitude.toLocaleString('en-NZ')} m (average of the top {TEAM_SEATS}).</p>
          </div>
        </div>
        <section style={{ maxWidth: 620, marginBottom: 40 }}>
          <h2 style={{ marginBottom: 8 }}>This week&apos;s team goal</h2>
          <p className="muted" style={{ marginBottom: 10 }}>
            Climb {team.goal.toLocaleString('en-NZ')} m together before Sunday midnight. So far: <b>{team.weekTotal.toLocaleString('en-NZ')} m</b>{pct >= 100 ? '. Goal reached.' : '.'}
          </p>
          <div className="meter" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Weekly team goal"><i style={{ width: `${pct}%` }} /></div>
        </section>
        <table className="board">
          <thead><tr><th>Seat</th><th>Climber</th><th>League</th><th className="r">This week</th><th className="r">Altitude</th></tr></thead>
          <tbody>
            {team.members.map((m, i) => (
              <tr key={m.name} className={m.name === player?.name ? 'me' : undefined}>
                <td className="pos num">{i + 1}</td>
                <td><span className="name">{m.name}</span>{i < TEAM_SEATS && <span className="tag">counts for the team</span>}</td>
                <td className="small muted">{LEAGUES.find((l) => l.id === m.league)?.name}</td>
                <td className="r num">{m.week > 0 ? `+${m.week.toLocaleString('en-NZ')} m` : ''}</td>
                <td className="r alt num">{m.altitude.toLocaleString('en-NZ')} m</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  });
}
