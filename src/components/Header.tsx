import Link from 'next/link';
import { getPlayer } from '@/server/session';
import { liveStreak } from '@/server/game';
import { NoDatabaseError } from '@/server/db';

export function HeaderBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="bar">
      <div className="bar-in">
        <Link href="/" className="brand">
          <b>The Ascent</b>
          <span>by SnowCap</span>
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/">Mountain</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/daily">Daily question</Link>
          <Link href="/rules">Rules and field guide</Link>
        </nav>
        {children}
      </div>
    </header>
  );
}

export async function Header() {
  let player = null;
  try {
    player = await getPlayer();
  } catch (e) {
    if (!(e instanceof NoDatabaseError)) throw e;
  }
  if (!player) {
    return (
      <HeaderBar>
        <Link href="/join" className="btn gold small">Join the expedition</Link>
      </HeaderBar>
    );
  }
  const streak = liveStreak(player);
  return (
    <HeaderBar>
      <div className="vitals">
        <div className="vital gold"><b className="num">{player.altitude.toLocaleString('en-NZ')} m</b><span>climbed</span></div>
        <div className="vital"><b className="num">{player.oxygen}</b><span>oxygen</span></div>
        <div className="vital"><b className="num">{streak}</b><span>day streak</span></div>
        <Link href="/gear" className="who">{player.name}</Link>
      </div>
    </HeaderBar>
  );
}
