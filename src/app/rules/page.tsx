import type { Metadata } from 'next';
import Link from 'next/link';
import { Shell, withDb } from '@/components/Shell';
import { SuggestForm } from '@/components/Forms';
import { getPlayer } from '@/server/session';
import { SEASON, TEAM_SEATS, TEAM_WEEKLY_GOAL_M } from '@/content/season';

export const metadata: Metadata = { title: 'Rules and field guide' };

export default function Page() {
  return (
    <div className="wrap">
      <div className="head"><h1>Rules and field guide</h1></div>
      <div className="cols">
        <div className="c7">
          <section>
            <h2 style={{ marginBottom: 12 }}>Scoring</h2>
            <table className="board">
              <tbody>
                <tr><td className="name">Climb a challenge</td><td>100 to 600 m, shown on each challenge</td></tr>
                <tr><td className="name">Clean first attempt</td><td>20% more on query challenges. Running a query is free. Only Submit counts as an attempt.</td></tr>
                <tr><td className="name">Storm run</td><td>Optional. Beat the clock for 150%, miss it for 75%.</td></tr>
                <tr><td className="name">Multiple choice</td><td>Full altitude first time, half on the second look, a quarter after that.</td></tr>
                <tr><td className="name">Daily question</td><td>40 m and one oxygen for a correct answer. One attempt a day.</td></tr>
                <tr><td className="name">Hints</td><td>Cost oxygen, never altitude: 1 for the first hint, 2 for the stronger one. You start with 3 and earn more from daily questions and finished camps.</td></tr>
                <tr><td className="name">Stuck</td><td>After 3 submissions you can see a worked answer and move on. That challenge scores 0 m, but it still counts towards opening the next camp. Gear for a finished camp needs every challenge climbed without the answer.</td></tr>
                <tr><td className="name">Streak</td><td>Days in a row with a climb or a correct daily answer. One rest day covers a missed day.</td></tr>
                <tr><td className="name">Gear and hidden finds</td><td>Badges only. They never change your altitude.</td></tr>
              </tbody>
            </table>
            <p className="small muted" style={{ marginTop: 12 }}>
              To open a camp, climb all but one of the challenges at the camp below. Rope teams score the average of their top {TEAM_SEATS} climbers and share a weekly goal of {TEAM_WEEKLY_GOAL_M.toLocaleString('en-NZ')} m.
              {' '}{SEASON.name} runs from {new Date(SEASON.startDay + 'T00:00:00Z').toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })} to {new Date(SEASON.endDay + 'T00:00:00Z').toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}, New Zealand time.
            </p>
          </section>

          <section className="section">
            <h2 style={{ marginBottom: 12 }}>Fair play and prizes</h2>
            <p>Prizes for {SEASON.name} will be announced here. Until then, climb for the standings.</p>
            <p>Each climber gets their own version of most challenges, so answers do not transfer between people. The query behind every correct answer is kept, and winning entries will be re-run and checked before any prize is awarded. One climber, one account. Work it out yourself: that is the whole point.</p>
            <p>Use a climber name you would be happy for your colleagues to see. Names that are offensive or impersonate someone will be hidden.</p>
          </section>

          <section className="section">
            <h2 style={{ marginBottom: 12 }}>Privacy</h2>
            <p>There is no email and no password. The site stores your climber name, league, optional team name, your progress and scores, and the SQL you submit as answers. It sets one cookie, which keeps you signed in on this device. Your queries run inside your own browser against a made-up ski-resort dataset. No real bank or customer data is involved at any point.</p>
            <p>Your climber name and team name are shown on the leaderboard, but only to people who have joined with the access code. The site is not listed in search engines. To have your climber removed, contact the programme team or SnowCap APAC.</p>
          </section>
        </div>

        <div className="c5">
          <section>
            <h2 style={{ marginBottom: 12 }}>Field guide: the SQL engine</h2>
            <p>Queries run on DuckDB compiled for the browser. Its SQL is close to Snowflake&apos;s for everyday analysis, with a few differences worth knowing before you climb.</p>
            <table className="board">
              <thead><tr><th>In Snowflake</th><th>On the mountain</th></tr></thead>
              <tbody>
                <tr><td><code>QUALIFY</code>, <code>GROUP BY ALL</code>, <code>ILIKE</code>, <code>::type</code></td><td>Work the same</td></tr>
                <tr><td><code>IFF</code>, <code>NVL</code>, <code>NVL2</code>, <code>ZEROIFNULL</code>, <code>DIV0</code></td><td>Work the same</td></tr>
                <tr><td><code>DATEDIFF(day, a, b)</code>, <code>DATEADD(day, n, d)</code>, <code>DATE_TRUNC(month, d)</code></td><td>Work the same, quoted or unquoted</td></tr>
                <tr><td><code>payload:operator.shift::string</code></td><td><code>payload.operator.shift</code></td></tr>
                <tr><td><code>LATERAL FLATTEN(input =&gt; payload:sensors)</code></td><td><code>UNNEST(payload.sensors)</code></td></tr>
                <tr><td><code>TO_CHAR(d, &apos;YYYY-MM&apos;)</code></td><td><code>strftime(d, &apos;%Y-%m&apos;)</code></td></tr>
                <tr><td><code>CURRENT_DATE</code></td><td>Not available. The dataset is fixed to the 2026 season, 13 June to 27 September.</td></tr>
              </tbody>
            </table>
            <p className="small muted" style={{ marginTop: 12 }}>
              Only SELECT statements run, one at a time. Answers are checked on values, not column names: return the columns asked for, in the order asked. Numbers are compared to two decimal places.
            </p>
            <p className="small muted">Time Travel, cloning, warehouses and policies cannot run in a browser, so the Icefall and the Ridge test those through scenarios.</p>
          </section>

          <section className="section" id="suggest">
            <h2 style={{ marginBottom: 12 }}>Suggest a challenge</h2>
            <p>The best ideas from climbers go into the next season.</p>
            <Shell><Suggest /></Shell>
          </section>
        </div>
      </div>
    </div>
  );
}

async function Suggest() {
  return withDb(async () => {
    const player = await getPlayer();
    if (!player) return <p><Link href="/join">Join the expedition</Link> to send an idea.</p>;
    return <SuggestForm />;
  });
}
