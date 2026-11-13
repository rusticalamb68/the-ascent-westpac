import type { Metadata } from 'next';
import Link from 'next/link';
import { Shell, withDb } from '@/components/Shell';
import { DailyPanel } from '@/components/Forms';
import { getPlayer } from '@/server/session';
import { getDaily, todaysQuestion } from '@/server/game';

export const metadata: Metadata = { title: 'Daily question' };

export default function Page() {
  return (
    <Shell>
      <Daily />
    </Shell>
  );
}

async function Daily() {
  return withDb(async () => {
    const player = await getPlayer();
    if (!player) {
      const { question } = todaysQuestion();
      return (
        <div className="wrap narrow">
          <p className="crumb">Daily question</p>
          <h1 style={{ fontSize: '2rem', marginBottom: 16 }}>{question.q}</h1>
          <p>Join the expedition to answer. A correct answer is worth 40 m and one oxygen, and keeps your streak alive.</p>
          <Link className="btn gold" href="/join">Join the expedition</Link>
        </div>
      );
    }
    const d = await getDaily(player);
    return (
      <div className="wrap narrow">
        <p className="crumb">Daily question, {new Date(d.day + 'T00:00:00Z').toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}</p>
        <DailyPanel question={d.q} options={d.options} answered={d.answered} />
        {!d.answered && <p className="small muted" style={{ marginTop: 16 }}>One attempt. Correct answers earn 40 m and one oxygen, and count towards your streak.</p>}
      </div>
    );
  });
}
