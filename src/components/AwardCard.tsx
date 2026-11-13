import Link from 'next/link';
import { GearIcon } from './GearIcon';

export type AwardView = {
  points: number;
  parts: { label: string; points: number }[];
  badges: { id: string; name: string; how: string; icon: string }[];
  campComplete: string | null;
  unlocked: string | null;
  oxygen: number;
  streak: number;
  durationMs: number;
  next: { id: string; title: string } | null;
};

export function clock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

export function AwardCard({ award, campId, explain }: { award: AwardView; campId: string; explain?: string }) {
  return (
    <div className="summit-card" role="status">
      <h2>+{award.points.toLocaleString('en-NZ')} m</h2>
      <ul className="tally">
        {award.parts.map((p) => (
          <li key={p.label}><span>{p.label}</span><span className="num">{p.points > 0 ? '+' : ''}{p.points}</span></li>
        ))}
        {award.parts.length > 1 && <li><span>Total</span><span className="num">+{award.points}</span></li>}
      </ul>
      {explain && <p>{explain}</p>}
      <p>Climbed in {clock(award.durationMs)}. Streak: {award.streak} day{award.streak === 1 ? '' : 's'}.</p>
      {award.campComplete && <p className="earned">{award.campComplete} complete. One oxygen added.</p>}
      {award.unlocked && <p className="earned">{award.unlocked} is now open.</p>}
      {award.badges.map((b) => (
        <p className="earned" key={b.id}><GearIcon name={b.icon} size={22} /> New gear: {b.name}</p>
      ))}
      <div className="row" style={{ marginTop: 16 }}>
        <NextLink next={award.next} />
        <Link className="btn on-dark" href={`/camp/${campId}`}>Back to camp</Link>
      </div>
    </div>
  );
}

/** The main way forward after finishing a challenge: straight on to the next open one. */
export function NextLink({ next }: { next: { id: string; title: string } | null }) {
  return next
    ? <Link className="btn gold" href={`/climb/${next.id}`}>Next challenge: {next.title}</Link>
    : <Link className="btn gold" href="/">Back to the mountain</Link>;
}
