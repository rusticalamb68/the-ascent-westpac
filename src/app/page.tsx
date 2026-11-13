import Link from 'next/link';
import { Shell, withDb } from '@/components/Shell';
import { Mountain, type MapCamp } from '@/components/Mountain';
import { getPlayer } from '@/server/session';
import { ORG_NAME } from '@/content/org';
import { getAttempts, campStates, individualBoard, teamBoard, getDaily, CHALLENGES, CAMPS, SEASON, challengeOpen } from '@/server/game';

export default function Page() {
  return (
    <Shell>
      <Home />
    </Shell>
  );
}

function Standings({ rows, teams, meId }: { rows: Awaited<ReturnType<typeof individualBoard>>; teams: Awaited<ReturnType<typeof teamBoard>>; meId?: string }) {
  return (
    <>
      <h2>{SEASON.name} standings</h2>
      {rows.length === 0 ? (
        <p className="empty">Nobody has scored yet. The first metres are yours to take.</p>
      ) : (
        <table className="board">
          <tbody>
            {rows.slice(0, 5).map((r) => (
              <tr key={r.id} className={r.id === meId ? 'me' : undefined}>
                <td className="pos">{r.pos}</td>
                <td><span className="name">{r.name}</span>{r.company && <span className="tag">{r.company}</span>}</td>
                <td className="r alt num">{r.pts.toLocaleString('en-NZ')} m</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {teams.length > 0 && (
        <p className="small muted" style={{ marginTop: 14 }}>
          Leading rope team: <b>{teams[0].name}</b> at {teams[0].altitude.toLocaleString('en-NZ')} m.
        </p>
      )}
      <p style={{ marginTop: 14 }}><Link href="/leaderboard">Full leaderboard</Link></p>
    </>
  );
}

async function Home() {
  return withDb(async () => {
    const player = await getPlayer();
    const [rows, teams] = await Promise.all([individualBoard('season', 'all'), teamBoard('season')]);

    if (!player) {
      const camps: MapCamp[] = CAMPS.map((c) => ({ id: c.id, name: c.name, altitude: c.altitude, state: 'open', solved: 0, total: CHALLENGES.filter((x) => x.camp === c.id).length }));
      return (
        <>
          <section className="hero">
            <div className="hero-in">
              <div className="hero-copy">
                <h1>A SQL climb for Snowflake analysts</h1>
                <p className="lede">Six camps, {CHALLENGES.length} challenges, one summit. Write real SQL in your browser and climb for yourself and your team at {ORG_NAME}.</p>
                <div className="row">
                  <Link className="btn gold" href="/join">Join the expedition</Link>
                </div>
              </div>
              <Mountain camps={camps} linkCamps={false} visitor />
            </div>
          </section>
          <div className="motto"><p>Skill is the snow that falls and melts. Capability is the cap that stays.</p></div>
          <div className="wrap">
            <div className="cols">
              <section className="c7">
                <h2 style={{ marginBottom: 16 }}>How the climb works</h2>
                <ol className="steps">
                  <li><b>Pick a climber name and a team</b>No email and no password. You need the access code from the programme team. Add your team name if you want your altitude to count on the team board.</li>
                  <li><b>Solve challenges to gain altitude</b>Each one is a real question about a ski-resort dataset. Your query runs in your own browser, so nothing touches {ORG_NAME} data.</li>
                  <li><b>Open the next camp</b>Base Camp is joins and filters. By the Ridge you are handling Time Travel, streams and governance. The Summit is three pitches that use all of it.</li>
                  <li><b>Climb the leaderboard</b>Ranked individually, by league and by team. A team is scored on its top five climbers, so a small team can beat a big one.</li>
                </ol>
                <div className="note gold" style={{ marginTop: 28 }}>
                  <p><b>Prizes are coming.</b> {SEASON.name} is open now and altitude earned this season will count. Details will be announced here.</p>
                </div>
              </section>
              <section className="c5">
                <div className="note">
                  <p><b>For {ORG_NAME} staff.</b> Join with the access code from the programme team. The leaderboard opens once you have joined.</p>
                </div>
              </section>
            </div>
          </div>
        </>
      );
    }

    const attempts = await getAttempts(player.id);
    const states = campStates(attempts);
    const camps: MapCamp[] = states.map((s) => ({ id: s.id, name: s.name, altitude: s.altitude, solved: s.solved, total: s.total, state: !s.unlocked ? 'locked' : s.solved === s.total ? 'done' : 'open' }));
    const next = CHALLENGES.find((c) => !attempts.get(c.id)?.solved_ms && challengeOpen(c, attempts).open);
    const daily = await getDaily(player);
    const me = rows.find((r) => r.id === player.id);
    return (
      <>
        <section className="hero signed">
          <div className="hero-in">
            <Mountain camps={camps} linkCamps />
          </div>
        </section>
        <div className="wrap">
          {next ? (
            <div className="next">
              <div>
                <h2>Next climb: {next.title}</h2>
                <p className="muted" style={{ margin: '4px 0 0' }}>{CAMPS.find((c) => c.id === next.camp)!.name}, {next.skill}, {next.points} m</p>
              </div>
              <Link className="btn gold" href={`/climb/${next.id}`}>{attempts.get(next.id) ? 'Continue the climb' : 'Go to the challenge'}</Link>
            </div>
          ) : (
            <div className="next">
              <div>
                <h2>You have climbed everything on the mountain</h2>
                <p className="muted" style={{ margin: '4px 0 0' }}>Keep your streak alive with the daily question, or suggest a challenge for next season.</p>
              </div>
              <Link className="btn gold" href="/rules#suggest">Suggest a challenge</Link>
            </div>
          )}
          <div className="cols section">
            <section className="c7">
              <h2 style={{ marginBottom: 12 }}>Today</h2>
              <ul className="list">
                <li>
                  <Link className="item" href="/daily">
                    <span className={`mark ${daily.answered ? 'done' : 'live'}`}>{daily.answered ? '✓' : '?'}</span>
                    <span><span className="t">Daily question</span><br /><span className="s">{daily.answered ? 'Answered. A new one arrives at midnight, New Zealand time.' : 'One question, 40 m and one oxygen if you get it right.'}</span></span>
                    <span className="p">{daily.answered ? '' : '+40 m'}</span>
                  </Link>
                </li>
                {player.company_slug && (
                  <li>
                    <Link className="item" href={`/team/${player.company_slug}`}>
                      <span className="mark live">T</span>
                      <span><span className="t">{player.company_name} team</span><br /><span className="s">See your team&apos;s weekly goal and who is climbing.</span></span>
                      <span className="p" />
                    </Link>
                  </li>
                )}
                <li>
                  <Link className="item" href="/gear">
                    <span className="mark live">G</span>
                    <span><span className="t">Gear locker</span><br /><span className="s">Your badges, skill map and expedition log.</span></span>
                    <span className="p" />
                  </Link>
                </li>
              </ul>
            </section>
            <section className="c5">
              <Standings rows={rows} teams={teams} meId={player.id} />
              {me && me.pos > 5 && <p className="small muted">You are in position {me.pos} with {me.pts.toLocaleString('en-NZ')} m this season.</p>}
            </section>
          </div>
        </div>
      </>
    );
  });
}
