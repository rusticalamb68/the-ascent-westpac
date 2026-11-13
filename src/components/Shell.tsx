import { Suspense, type ReactNode } from 'react';
import { connection } from 'next/server';
import { NoDatabaseError } from '@/server/db';

/** Every page reads the signed-in climber, so page content streams inside a Suspense boundary. */
export function Shell({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="wait" aria-busy="true">Loading the mountain…</div>}>{children}</Suspense>;
}

/** Runs a page body and shows a setup message if the database is not connected yet. */
export async function withDb(body: () => Promise<ReactNode>): Promise<ReactNode> {
  await connection(); // everything below is per-request: scores, clocks, the signed-in climber
  try {
    return await body();
  } catch (e) {
    if (e instanceof NoDatabaseError) {
      return (
        <div className="wrap narrow">
          <h1>One step left: connect a database</h1>
          <p style={{ marginTop: 16 }}>
            The site is deployed, but it has nowhere to keep climbers and scores yet. In Vercel, open this project, go to the Storage tab,
            create a Neon Postgres database and connect it to the project. Then redeploy. The tables are created automatically on the first visit.
          </p>
        </div>
      );
    }
    throw e;
  }
}
