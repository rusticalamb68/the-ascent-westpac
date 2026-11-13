'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SqlEditor } from './SqlEditor';
import { AwardCard, NextLink, clock, type AwardView } from './AwardCard';
import { post } from '@/lib/api';
import { startEngine, runQuery, type RunResult } from '@/lib/duck-client';

type Props = {
  challengeId: string;
  campId: string;
  starter: string;
  solved: boolean;
  stormEndsMs: number | null;
  stormMinutes: number;
  tries: number;
  revealAfter: number;
  worked: string | null;
  next: { id: string; title: string } | null;
};

const SHOW = 200;

export function Workbench({ challengeId, campId, starter, solved, stormEndsMs, stormMinutes, tries: triesIn, revealAfter, worked, next }: Props) {
  const router = useRouter();
  const draftKey = 'ascent-draft-' + challengeId;
  const [sqlText, setSqlText] = useState(starter);
  const [engine, setEngine] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState<null | 'run' | 'submit'>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [verdict, setVerdict] = useState<{ ok: boolean; text: string } | null>(null);
  const [award, setAward] = useState<AwardView | null>(null);
  const [found, setFound] = useState<string | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [tries, setTries] = useState(triesIn);
  const [askReveal, setAskReveal] = useState(false);
  const [revealError, setRevealError] = useState('');
  const textRef = useRef(sqlText);
  textRef.current = sqlText;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(draftKey);
      if (saved) setSqlText(saved);
    } catch { /* storage unavailable: start from the starter text */ }
    startEngine().then(() => setEngine('ready'), () => setEngine('error'));
  }, [draftKey]);

  useEffect(() => {
    if (!stormEndsMs || solved || award) return;
    const tick = () => setLeft(stormEndsMs - Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [stormEndsMs, solved, award]);

  const change = useCallback((v: string) => {
    setSqlText(v);
    try { window.localStorage.setItem(draftKey, v); } catch { /* ignore */ }
  }, [draftKey]);

  const lookForCaches = useCallback(async (text: string, res: RunResult) => {
    if (!res.ok) return;
    let which: string | null = null;
    if (/yeti_sightings/i.test(text)) which = 'yeti';
    else if (res.rows.some((r) => r.some((c) => c !== null && c.toLowerCase().includes('lost glove')))) which = 'glove';
    if (!which) return;
    const r = await post<{ badge: { name: string } | null }>('cache', { which });
    if (r.ok && r.badge) { setFound(r.badge.name); router.refresh(); }
  }, [router]);

  const run = useCallback(async () => {
    if (busy) return;
    setBusy('run');
    setVerdict(null);
    const text = textRef.current;
    const res = await runQuery(text);
    setResult(res);
    setBusy(null);
    void lookForCaches(text, res);
  }, [busy, lookForCaches]);

  const submit = useCallback(async () => {
    if (busy) return;
    setBusy('submit');
    setVerdict(null);
    const text = textRef.current;
    const res = await runQuery(text);
    setResult(res);
    const r = await post<{ correct: boolean; detail?: string; award?: AwardView; tries?: number }>('submit', { challengeId, sql: text, rows: res.ok ? res.rows.slice(0, 2001) : [] });
    if (!res.ok) {
      setBusy(null);
      if (r.ok && typeof r.tries === 'number') setTries(r.tries);
      setVerdict({ ok: false, text: r.ok ? 'That query did not run, so it counts as a missed attempt. The error is shown below.' : r.error });
      return;
    }
    setBusy(null);
    if (!r.ok) { setVerdict({ ok: false, text: r.error }); return; }
    if (r.correct && r.award) {
      setAward(r.award);
      try { window.localStorage.removeItem(draftKey); } catch { /* ignore */ }
      router.refresh();
    } else {
      if (typeof r.tries === 'number') setTries(r.tries);
      setVerdict({ ok: false, text: r.detail ?? 'Not yet.' });
    }
  }, [busy, challengeId, draftKey, router]);

  const done = solved || !!award;

  const reveal = useCallback(async () => {
    setBusy('submit');
    setRevealError('');
    const r = await post('reveal', { challengeId });
    setBusy(null);
    if (!r.ok) { setRevealError(r.error); return; }
    try { window.localStorage.removeItem(draftKey); } catch { /* ignore */ }
    router.refresh();
  }, [challengeId, draftKey, router]);

  return (
    <div>
      {award && <AwardCard award={award} campId={campId} />}
      {worked && (
        <div className="worked">
          <h2>Worked answer</h2>
          <p className="small">One query that gives the right result. Put it in the editor and run it to see the rows, then compare it with what you tried. Answers are checked on values and column order, so your column names can differ.</p>
          <pre>{worked}</pre>
          <div className="row">
            <NextLink next={next} />
            <button className="btn quiet" onClick={() => change(worked)}>Put it in the editor</button>
          </div>
        </div>
      )}
      {solved && !award && !worked && (
        <div className="row" style={{ marginBottom: 16 }}><NextLink next={next} /></div>
      )}
      {found && <div className="note gold" role="status">You found something off the map. New gear: {found}.</div>}
      {!done && left !== null && (
        <p>
          {left > 0 ? (
            <span className="storm" aria-live="off">Storm arrives in {clock(left)}</span>
          ) : (
            <span className="storm over">The storm caught you. This climb now scores 75%.</span>
          )}
        </p>
      )}
      <SqlEditor value={sqlText} onChange={change} onRun={run} />
      <div className="toolbar">
        <button className="btn quiet" onClick={run} disabled={!!busy || engine !== 'ready'}>{busy === 'run' ? 'Running…' : 'Run query'}</button>
        {!done && <button className="btn gold" onClick={submit} disabled={!!busy || engine !== 'ready'}>{busy === 'submit' ? 'Checking…' : 'Submit answer'}</button>}
        <span className="kbd">Ctrl</span><span className="kbd">Enter</span><span className="small muted">runs</span>
        <span className="status" aria-live="polite">
          {engine === 'loading' && 'Loading the SQL engine and dataset (about 8 MB, first visit only)…'}
          {engine === 'ready' && 'Engine ready. Queries run in your browser.'}
          {engine === 'error' && 'The SQL engine could not start. Try a current version of Chrome, Edge, Firefox or Safari.'}
        </span>
      </div>
      {!done && (
        <p className="small muted attempts">
          Attempts: <b className="num">{tries}</b>.
          {tries < revealAfter
            ? ` The worked answer opens after ${revealAfter} attempts${tries > 0 ? `, ${revealAfter - tries} to go` : ''}.`
            : ' You can see the worked answer whenever you are ready.'}
        </p>
      )}
      {verdict && <div className={`note ${verdict.ok ? 'ok' : 'bad'}`} role="alert">{verdict.text}</div>}
      {!done && tries >= revealAfter && (
        <div className="note gold">
          {!askReveal ? (
            <>
              <p><b>Stuck?</b> You can see a worked answer and move on. This challenge then scores 0 m, but it still counts towards opening the next camp.</p>
              <button className="btn small" onClick={() => setAskReveal(true)}>Show me the answer</button>
            </>
          ) : (
            <>
              <p>Show the answer and finish this challenge with 0 m? You cannot climb it for altitude afterwards.</p>
              <div className="row">
                <button className="btn small" disabled={!!busy} onClick={reveal}>{busy ? 'Opening…' : 'Yes, show the answer'}</button>
                <button className="btn quiet small" onClick={() => setAskReveal(false)}>Keep trying</button>
              </div>
            </>
          )}
          {revealError && <p className="small" role="alert">{revealError}</p>}
        </div>
      )}
      {result && !result.ok && <pre className="err" role="alert">{result.error}</pre>}
      {result && result.ok && (
        <>
          <div className="result" tabIndex={0} aria-label="Query result">
            <table>
              <thead><tr>{result.columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
              <tbody>
                {result.rows.slice(0, SHOW).map((r, i) => (
                  <tr key={i}>{r.map((c, j) => (c === null ? <td key={j} className="null">null</td> : <td key={j} title={c.length > 40 ? c : undefined}>{c}</td>))}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="result-meta">
            {result.rows.length.toLocaleString('en-NZ')} row{result.rows.length === 1 ? '' : 's'} in {result.ms} ms
            {result.rows.length > SHOW ? `. Showing the first ${SHOW}.` : '.'}
          </p>
        </>
      )}
      {!result && !done && stormEndsMs === null && stormMinutes > 0 && (
        <p className="small muted">Run as often as you like. Only Submit counts as an attempt, and a clean first submission earns 20% more.</p>
      )}
    </div>
  );
}
