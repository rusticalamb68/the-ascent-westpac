import type { Metadata } from 'next';
import Link from 'next/link';
import { Shell, withDb } from '@/components/Shell';
import { JoinForm, JoinedPanel, ResumeForm } from '@/components/Forms';
import { getPlayer } from '@/server/session';
import { LEAGUES, listCompanies } from '@/server/game';
import { ORG_NAME } from '@/content/org';

export const metadata: Metadata = { title: 'Join the expedition' };

export default function Page() {
  return (
    <Shell>
      <Join />
    </Shell>
  );
}

async function Join() {
  return withDb(async () => {
    const player = await getPlayer();
    if (player) {
      return <div className="wrap narrow"><JoinedPanel name={player.name} /></div>;
    }
    const companies = (await listCompanies()).map((c) => c.name);
    return (
      <div className="wrap narrow">
        <h1 style={{ marginBottom: 12 }}>Join the expedition</h1>
        <p className="muted" style={{ marginBottom: 28 }}>Takes a minute, for {ORG_NAME} staff. We store a climber name, your league, an optional team name and your game progress. Nothing else.</p>
        <JoinForm leagues={LEAGUES.map((l) => ({ ...l }))} companies={companies} needsCode={Boolean(process.env.JOIN_CODE)} />
        <section className="section">
          <h2 style={{ marginBottom: 12 }}>Already climbing?</h2>
          <p className="muted">Paste the climber key you saved when you joined.</p>
          <ResumeForm />
        </section>
      </div>
    );
  });
}
