import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Shell, withDb } from '@/components/Shell';
import { getPlayer } from '@/server/session';
import { getAttempts, campStates, challengeOpen, CHALLENGES, type Attempt } from '@/server/game';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Shell>
      <Camp params={params} />
    </Shell>
  );
}

function Dots({ n }: { n: number }) {
  return (
    <span className="diff" aria-label={`Difficulty ${n} of 3`}>
      {[1, 2, 3].map((i) => <i key={i} className={i <= n ? 'on' : undefined} />)}
    </span>
  );
}

async function Camp({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withDb(async () => {
    const player = await getPlayer();
    const attempts = player ? await getAttempts(player.id) : new Map<string, Attempt>();
    const states = campStates(attempts);
    const camp = states.find((s) => s.id === id);
    if (!camp) notFound();
    const index = states.indexOf(camp);
    const prev = states[index - 1];
    const list = CHALLENGES.filter((c) => c.camp === camp.id);
    const earned = list.reduce((s, c) => s + (attempts.get(c.id)?.points ?? 0), 0);
    return (
      <div className="wrap">
        <p className="crumb"><Link href="/">The mountain</Link></p>
        <div className="head">
          <div>
            <h1>{camp.name}</h1>
            <p className="sub">{camp.altitude.toLocaleString('en-NZ')} m. {camp.skills}.</p>
          </div>
          <div style={{ minWidth: 220 }}>
            <p className="small muted" style={{ margin: '0 0 6px' }}>{camp.solved} of {camp.total} climbed, {earned.toLocaleString('en-NZ')} m earned here</p>
            <div className="meter"><i style={{ width: `${(camp.solved / camp.total) * 100}%` }} /></div>
          </div>
        </div>
        <p className="log">{camp.log}</p>
        {!player && <div className="note gold"><p><Link href="/join">Join the expedition</Link> to start climbing. Base Camp opens straight away.</p></div>}
        {player && !camp.unlocked && prev && (
          <div className="note"><p>This camp is locked. Climb {prev.needed} of the {prev.total} challenges at <Link href={`/camp/${prev.id}`}>{prev.name}</Link> to open it. You have {prev.solved}.</p></div>
        )}
        <ul className="list">
          {list.map((c) => {
            const a = attempts.get(c.id);
            const open = !!player && challengeOpen(c, attempts).open;
            const inner = (
              <>
                <span className={`mark ${a?.solved_ms ? (a.revealed ? 'shown' : 'done') : a ? 'live' : ''}`}>{a?.solved_ms ? (a.revealed ? '○' : '✓') : a ? '…' : ''}</span>
                <span>
                  <span className="t">{c.title}</span><Dots n={c.difficulty} /><br />
                  <span className="s">{c.skill}{c.kind === 'mcq' ? ', multiple choice' : c.starter ? ', fix the query' : ', write the query'}{a && !a.solved_ms ? `, in progress, ${a.tries} attempt${a.tries === 1 ? '' : 's'}` : ''}</span>
                </span>
                <span className="p num">{a?.solved_ms ? (a.revealed ? <>0 m<small>answer shown</small></> : <>+{a.points} m<small>climbed</small></>) : <>{c.points} m</>}</span>
              </>
            );
            return (
              <li key={c.id}>
                {open ? <Link className="item" href={`/climb/${c.id}`}>{inner}</Link> : <div className="item locked">{inner}</div>}
              </li>
            );
          })}
        </ul>
        {camp.unlocked && states[index + 1] && (
          <p className="small muted" style={{ marginTop: 18 }}>
            {states[index + 1].unlocked ? <>Next camp: <Link href={`/camp/${states[index + 1].id}`}>{states[index + 1].name}</Link>.</> : <>Climb {states[index + 1].needed} of these to open {states[index + 1].name}.</>}
          </p>
        )}
      </div>
    );
  });
}
