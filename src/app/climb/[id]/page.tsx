import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Shell, withDb } from '@/components/Shell';
import { Workbench } from '@/components/Workbench';
import { StartPanel, HintBox, ChoicePanel } from '@/components/ClimbPanels';
import { clock, NextLink } from '@/components/AwardCard';
import { getPlayer } from '@/server/session';
import { getAttempts, challengeOpen, publicChallenge, hintsShown, fastest, nextChallenge, workedAnswer, CAMPS, HINT_COST, STORM_MINUTES, REVEAL_AFTER } from '@/server/game';
import { getChallenge } from '@/content/challenges';
import { TABLES } from '@/lib/dataset';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Shell>
      <Climb params={params} />
    </Shell>
  );
}

function Schema() {
  return (
    <details className="schema">
      <summary>Tables you can query</summary>
      <div className="tables">
        {TABLES.filter((t) => !t.hidden && !t.staging).map((t) => (
          <div className="tbl" key={t.name}>
            <b>{t.name}</b>
            <p>{t.about}</p>
            <ul>
              {t.columns.map((c) => (
                <li key={c.name}>{c.name} <span>{c.type.toLowerCase()}</span>{c.note && <em>{c.note}</em>}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}

async function Climb({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getChallenge(id);
  if (!c) notFound();
  const camp = CAMPS.find((x) => x.id === c.camp)!;
  return withDb(async () => {
    const player = await getPlayer();
    const crumb = <p className="crumb"><Link href="/">The mountain</Link> / <Link href={`/camp/${camp.id}`}>{camp.name}</Link></p>;
    if (!player) {
      return (
        <div className="wrap narrow">
          {crumb}
          <h1>{c.title}</h1>
          <p style={{ marginTop: 16 }}>Join the expedition to take on this challenge.</p>
          <Link className="btn gold" href="/join">Join the expedition</Link>
        </div>
      );
    }
    const attempts = await getAttempts(player.id);
    const attempt = attempts.get(c.id);
    if (!attempt) {
      const open = challengeOpen(c, attempts);
      return (
        <div className="wrap narrow">
          {crumb}
          <h1>{c.title}</h1>
          <p className="muted" style={{ marginTop: 8 }}>{c.skill}. Worth {c.points} m.</p>
          {open.open ? (
            <StartPanel challengeId={c.id} kind={c.kind} points={c.points} stormMinutes={STORM_MINUTES[c.difficulty]} />
          ) : (
            <div className="note" style={{ marginTop: 20 }}><p>{open.why} <Link href={`/camp/${camp.id}`}>Back to {camp.name}</Link>.</p></div>
          )}
        </div>
      );
    }
    const pub = publicChallenge(c, player.id, attempt.variant);
    const solved = !!attempt.solved_ms;
    const revealed = solved && attempt.revealed;
    const next = solved ? nextChallenge(c.id, attempts) : null;
    const records = await fastest(c.id);
    const stormEnds = attempt.mode === 'storm' && !solved ? attempt.started_ms + STORM_MINUTES[c.difficulty] * 60000 : null;
    return (
      <div className="wrap">
        {crumb}
        <div className="bench">
          <div className="brief">
            <h1>{pub.title}</h1>
            <p className="skill">{pub.skill}, {pub.points} m{attempt.mode === 'storm' ? ', storm run' : ''}</p>
            {revealed && (
              <div className="note gold">
                <p><b>Answer shown</b> after {attempt.tries} attempts. No altitude for this one, but it counts as passed for opening the next camp.</p>
              </div>
            )}
            {solved && !revealed && (
              <div className="note ok">
                <p><b>Climbed for {attempt.points} m</b> in {clock(attempt.duration_ms ?? 0)}{attempt.first_try ? ', first attempt' : `, ${attempt.tries} attempts`}.{pub.kind === 'sql' ? ' The editor stays open if you want to keep exploring.' : ''}</p>
              </div>
            )}
            <p className="ask">{pub.brief}</p>
            {pub.returns && <div className="returns"><span>Return these columns, in this order</span><code>{pub.returns}</code></div>}
            {pub.snowflakeNote && <p className="sf">{pub.snowflakeNote}</p>}
            {!solved && <HintBox challengeId={c.id} shown={hintsShown(c, attempt)} total={c.hints.length} oxygen={player.oxygen} costs={HINT_COST} />}
            {solved && c.kind === 'mcq' && <p className="sf">{c.explain}</p>}
            {records.length > 0 && (
              <>
                <h2 className="side-h">Fastest ascents</h2>
                <ol className="fast">
                  {records.map((r, i) => <li key={i}><span>{r.name}</span><span className="num">{clock(r.duration_ms)}</span></li>)}
                </ol>
              </>
            )}
          </div>
          <div>
            {pub.kind === 'sql' ? (
              <>
                <Workbench challengeId={c.id} campId={camp.id} starter={pub.starter ?? ''} solved={solved} stormEndsMs={stormEnds} stormMinutes={pub.stormMinutes ?? 0}
                  tries={attempt.tries} revealAfter={REVEAL_AFTER} worked={revealed && c.kind === 'sql' ? workedAnswer(c, attempt.variant) : null} next={next} />
                <Schema />
              </>
            ) : (
              <>
                <ChoicePanel challengeId={c.id} campId={camp.id} options={pub.options ?? []} solved={solved} tries={attempt.tries} />
                {solved && <NextLink next={next} />}
              </>
            )}
          </div>
        </div>
      </div>
    );
  });
}
