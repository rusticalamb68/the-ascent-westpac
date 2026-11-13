'use client';

import { useEffect, useState } from 'react';
import { ORG_NAME } from '@/content/org';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/api';
import { GearIcon } from './GearIcon';

type League = { id: string; name: string; blurb: string };

const NEW_KEY = 'ascent-new-key';

function KeyScreen({ keyText }: { keyText: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <h1>You are on the mountain</h1>
      <p style={{ marginTop: 16 }}>
        This is your climber key. There is no password and no email, so this key is the only way to pick up your climb on another device or after clearing your browser. Save it somewhere safe.
      </p>
      <div className="note gold"><code style={{ wordBreak: 'break-all' }}>{keyText}</code></div>
      <div className="row">
        <button className="btn quiet" onClick={async () => { try { await navigator.clipboard.writeText(keyText); setCopied(true); } catch { setCopied(false); } }}>
          {copied ? 'Copied' : 'Copy key'}
        </button>
        <Link className="btn gold" href="/camp/base" onClick={() => { try { window.sessionStorage.removeItem(NEW_KEY); } catch { /* ignore */ } }}>Go to Base Camp</Link>
      </div>
    </div>
  );
}

/** Shown on the join page to a signed-in climber: their new key straight after joining, otherwise a way back. */
export function JoinedPanel({ name }: { name: string }) {
  const [key, setKey] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    try { setKey(window.sessionStorage.getItem(NEW_KEY)); } catch { /* ignore */ }
    setChecked(true);
  }, []);
  if (!checked) return <div className="wait" aria-busy="true">Loading the mountain…</div>;
  if (key) return <KeyScreen keyText={key} />;
  return (
    <div>
      <h1>You are already climbing, {name}</h1>
      <p style={{ marginTop: 16 }}><Link className="btn gold" href="/">Back to the mountain</Link></p>
    </div>
  );
}

export function JoinForm({ leagues, companies, needsCode }: { leagues: League[]; companies: string[]; needsCode: boolean }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [code, setCode] = useState('');
  const [league, setLeague] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [key, setKey] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const r = await post<{ key: string }>('join', { name, company, league, code });
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    // The page re-renders for a signed-in climber after this, so keep the key where the next screen can show it.
    try { window.sessionStorage.setItem(NEW_KEY, r.key); } catch { /* ignore */ }
    setKey(r.key);
    router.refresh();
  }

  if (key) return <KeyScreen keyText={key} />;

  return (
    <form onSubmit={submit}>
      {error && <div className="note bad" role="alert">{error}</div>}
      <label className="field">
        Climber name
        <small>Shown on the leaderboard to other climbers at {ORG_NAME}. It does not have to be your real name.</small>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} required autoComplete="nickname" />
      </label>
      {needsCode && (
        <label className="field">
          Access code
          <small>Given to {ORG_NAME} staff by the programme team.</small>
          <input type="text" value={code} onChange={(e) => setCode(e.target.value)} maxLength={60} required autoComplete="off" />
        </label>
      )}
      <label className="field">
        Team (optional)
        <small>Your altitude counts towards this team on the team board. Use your squad or team name, or leave it blank and climb solo.</small>
        <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={40} list="companies" autoComplete="off" />
        <datalist id="companies">{companies.map((c) => <option key={c} value={c} />)}</datalist>
      </label>
      <fieldset>
        <legend>Your league</legend>
        {leagues.map((l) => (
          <label className="choice" key={l.id}>
            <input type="radio" name="league" value={l.id} checked={league === l.id} onChange={() => setLeague(l.id)} required />
            <span><b>{l.name}</b>{l.blurb}</span>
          </label>
        ))}
        <span className="help">Everyone climbs the same mountain. Leagues let you compare yourself with people at a similar level. It cannot be changed later.</span>
      </fieldset>
      <button className="btn gold" disabled={busy}>{busy ? 'Joining…' : 'Join the expedition'}</button>
    </form>
  );
}

export function ResumeForm() {
  const router = useRouter();
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const r = await post('resume', { key });
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    router.push('/');
    router.refresh();
  }
  return (
    <form onSubmit={submit}>
      {error && <div className="note bad" role="alert">{error}</div>}
      <label className="field">
        Climber key
        <input type="text" value={key} onChange={(e) => setKey(e.target.value)} required autoComplete="off" spellCheck={false} />
      </label>
      <button className="btn quiet" disabled={busy}>{busy ? 'Checking…' : 'Resume my climb'}</button>
    </form>
  );
}

export function LeaveButton() {
  const router = useRouter();
  const [sure, setSure] = useState(false);
  if (!sure) return <button className="btn quiet small" onClick={() => setSure(true)}>Sign out on this device</button>;
  return (
    <div className="note bad">
      <p>You will need your climber key to get back in. If you have not saved it, use Get my climber key on this page first. Sign out?</p>
      <div className="row">
        <button className="btn small" onClick={async () => { await post('leave'); router.push('/'); router.refresh(); }}>Sign out</button>
        <button className="btn quiet small" onClick={() => setSure(false)}>Stay</button>
      </div>
    </div>
  );
}

export function KeyPanel() {
  const [step, setStep] = useState<'idle' | 'confirm' | 'shown'>('idle');
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function issue() {
    setBusy(true);
    setError('');
    const r = await post<{ key: string }>('rekey');
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setKey(r.key);
    setStep('shown');
  }

  if (step === 'shown') {
    return (
      <div>
        <p className="small">This is your new climber key. Your old key no longer works. Save this one somewhere safe.</p>
        <div className="note gold"><code style={{ wordBreak: 'break-all' }}>{key}</code></div>
        <button className="btn quiet small" onClick={async () => { try { await navigator.clipboard.writeText(key); setCopied(true); } catch { setCopied(false); } }}>
          {copied ? 'Copied' : 'Copy key'}
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="small muted">Your key lets you pick up your climb on another device or after clearing your browser. Keys are never stored in readable form, so getting your key issues a new one and the old one stops working.</p>
      {error && <div className="note bad" role="alert">{error}</div>}
      {step === 'idle' ? (
        <button className="btn quiet small" onClick={() => setStep('confirm')}>Get my climber key</button>
      ) : (
        <div className="row">
          <button className="btn small" disabled={busy} onClick={issue}>{busy ? 'Issuing…' : 'Issue a new key'}</button>
          <button className="btn quiet small" onClick={() => setStep('idle')}>Cancel</button>
        </div>
      )}
    </div>
  );
}

type DailyState = { correct: boolean; answer: number; explain: string; points?: number; badges?: { id: string; name: string; icon: string }[] };

export function DailyPanel({ question, options, answered }: { question: string; options: string[]; answered: DailyState | null }) {
  const router = useRouter();
  const [pick, setPick] = useState<number | null>(null);
  const [state, setState] = useState<DailyState | null>(answered);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (pick === null) return;
    setBusy(true);
    const r = await post<DailyState>('daily', { choice: pick });
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setState(r);
    router.refresh();
  }
  return (
    <form onSubmit={send}>
      <h2 style={{ marginBottom: 16 }}>{question}</h2>
      <fieldset disabled={!!state}>
        <legend className="sr">Choose one answer</legend>
        {options.map((o, i) => (
          <label className="choice" key={i} style={state && i === state.answer ? { borderColor: 'var(--ok)', boxShadow: 'inset 0 0 0 1px var(--ok)' } : undefined}>
            <input type="radio" name="daily" checked={pick === i} onChange={() => setPick(i)} />
            <span><b>{o}</b></span>
          </label>
        ))}
      </fieldset>
      {error && <div className="note bad" role="alert">{error}</div>}
      {!state && <button className="btn gold" disabled={busy || pick === null}>{busy ? 'Checking…' : 'Lock in answer'}</button>}
      {state && (
        <div className={`note ${state.correct ? 'ok' : 'bad'}`} role="status">
          <p><b>{state.correct ? `Correct${state.points ? `: +${state.points} m and one oxygen` : ''}.` : 'Not this time.'}</b> {state.explain}</p>
          {state.badges?.map((b) => <p key={b.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><GearIcon name={b.icon} size={20} /> New gear: {b.name}</p>)}
          <p>The next question arrives at midnight, New Zealand time.</p>
        </div>
      )}
    </form>
  );
}

export function SuggestForm() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await post('suggest', { title, body });
    setBusy(false);
    if (!r.ok) { setMessage({ ok: false, text: r.error }); return; }
    setMessage({ ok: true, text: 'Sent. The best ideas go into the next season, credited to you.' });
    setTitle('');
    setBody('');
  }
  return (
    <form onSubmit={send}>
      {message && <div className={`note ${message.ok ? 'ok' : 'bad'}`} role="status">{message.text}</div>}
      <label className="field">
        Challenge title
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
      </label>
      <label className="field">
        The question, and the skill it tests
        <small>Use the practice tables. Include your solution query if you have one.</small>
        <textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} required />
      </label>
      <button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Send idea'}</button>
    </form>
  );
}
