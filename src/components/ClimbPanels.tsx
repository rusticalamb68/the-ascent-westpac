'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/api';
import { AwardCard, type AwardView } from './AwardCard';

export function StartPanel({ challengeId, kind, points, stormMinutes }: { challengeId: string; kind: 'sql' | 'mcq'; points: number; stormMinutes: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function start(mode: 'standard' | 'storm') {
    setBusy(true);
    setError('');
    const r = await post('start', { challengeId, mode });
    if (!r.ok) { setError(r.error); setBusy(false); return; }
    router.refresh();
  }
  return (
    <div>
      {error && <div className="note bad" role="alert">{error}</div>}
      {kind === 'mcq' ? (
        <div className="routes">
          <div className="route">
            <h3>One question, {points} m</h3>
            <p>Right first time scores the full {points} m. A second look scores half, and after that a quarter.</p>
            <button className="btn" disabled={busy} onClick={() => start('standard')}>Open the question</button>
          </div>
        </div>
      ) : (
        <>
          <h2 style={{ marginTop: 8 }}>Choose your route</h2>
          <div className="routes">
            <div className="route">
              <h3>Standard route</h3>
              <p>No clock. {points} m for the climb, plus 20% if your first submission is right.</p>
              <button className="btn" disabled={busy} onClick={() => start('standard')}>Start the climb</button>
            </div>
            <div className="route dark">
              <h3>Storm run</h3>
              <p>Solve it within {stormMinutes} minutes and score 150%. Miss the window and it scores 75%. The clock starts when you do, and you cannot switch back.</p>
              <button className="btn gold" disabled={busy} onClick={() => start('storm')}>Start a storm run</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function HintBox({ challengeId, shown, total, oxygen, costs }: { challengeId: string; shown: string[]; total: number; oxygen: number; costs: number[] }) {
  const router = useRouter();
  const [hints, setHints] = useState(shown);
  const [o2, setO2] = useState(oxygen);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const cost = costs[hints.length];
  async function buy() {
    setBusy(true);
    setError('');
    const r = await post<{ hint: string; oxygen: number }>('hint', { challengeId });
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setHints((h) => [...h, r.hint]);
    setO2(r.oxygen);
    router.refresh();
  }
  return (
    <div>
      <h2 className="side-h">Hints</h2>
      {hints.map((h, i) => <p className="hint" key={i}>{h}</p>)}
      {error && <div className="note bad" role="alert">{error}</div>}
      {hints.length < total ? (
        <button className="btn quiet small" onClick={buy} disabled={busy}>
          {hints.length === 0 ? 'Buy a hint' : 'Buy the stronger hint'} ({cost} oxygen, you have {o2})
        </button>
      ) : (
        <p className="small muted">That is every hint for this one.</p>
      )}
    </div>
  );
}

export function ChoicePanel({ challengeId, campId, options, solved, tries = 0 }: { challengeId: string; campId: string; options: string[]; solved: boolean; tries?: number }) {
  const router = useRouter();
  const [pick, setPick] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState('');
  const [award, setAward] = useState<{ award: AwardView; explain?: string } | null>(null);
  async function send() {
    if (pick === null) return;
    setBusy(true);
    setMessage('');
    const r = await post<{ correct: boolean; detail?: string; award?: AwardView; explain?: string }>('choose', { challengeId, choice: pick });
    setBusy(false);
    if (!r.ok) { setMessage(r.error); return; }
    if (r.correct && r.award) {
      setAward({ award: r.award, explain: r.explain });
      router.refresh();
    } else {
      setWrong((w) => new Set(w).add(pick));
      setMessage(r.detail ?? 'Not that one.');
      setPick(null);
    }
  }
  if (award) return <AwardCard award={award.award} campId={campId} explain={award.explain} />;
  if (solved) return null;
  return (
    <form onSubmit={(e) => { e.preventDefault(); void send(); }}>
      <fieldset>
        <legend className="sr">Choose one answer</legend>
        {options.map((o, i) => (
          <label className="choice wide" key={i} style={wrong.has(i) ? { opacity: 0.5 } : undefined}>
            <input type="radio" name="choice" checked={pick === i} disabled={wrong.has(i)} onChange={() => setPick(i)} />
            <code>{o}</code>
          </label>
        ))}
      </fieldset>
      {message && <div className="note bad" role="alert">{message}</div>}
      <p className="small muted attempts">Attempts: <b className="num">{tries + wrong.size}</b>. Each wrong pick is greyed out, so you will always get there.</p>
      <button className="btn gold" disabled={busy || pick === null}>{busy ? 'Checking…' : 'Lock in answer'}</button>
    </form>
  );
}
