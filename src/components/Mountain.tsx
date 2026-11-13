import Link from 'next/link';

export type MapCamp = { id: string; name: string; altitude: number; state: 'done' | 'open' | 'locked'; solved: number; total: number };

// Fixed positions for the six camps on the face.
const POS: Record<string, [number, number]> = {
  base: [232, 437],
  treeline: [452, 358],
  glacier: [372, 279],
  icefall: [548, 209],
  ridge: [498, 139],
  summit: [566, 66],
};

const y = (alt: number) => 472 - ((alt - 1000) / 2400) * 420;

/** The mountain: a side-on face with the route and camps. It is both picture and navigation. */
export function Mountain({ camps, linkCamps, visitor }: { camps: MapCamp[]; linkCamps: boolean; visitor?: boolean }) {
  const pts = camps.map((c) => POS[c.id]);
  // The gold line runs to the highest camp the climber can enter.
  let reach = 0;
  if (!visitor) camps.forEach((c, i) => { if (c.state !== 'locked') reach = i; });
  const line = (from: number, to: number) => pts.slice(from, to + 1).map((p) => p.join(',')).join(' ');
  return (
    <svg className="mountain" viewBox="0 0 960 520" role="img" aria-label="The mountain, showing six camps from Base Camp at 1,200 metres to the Summit at 3,300 metres">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0B1730" />
          <stop offset="1" stopColor="#1D3461" />
        </linearGradient>
      </defs>
      <rect width="960" height="520" fill="url(#sky)" />
      {/* altitude scale */}
      {[1200, 1650, 2100, 2500, 2900, 3300].map((alt) => (
        <g key={alt}>
          <line x1="64" x2="960" y1={y(alt)} y2={y(alt)} stroke="#F6F9FC" strokeOpacity="0.07" />
          <text x="54" y={y(alt) + 4} textAnchor="end" className="mt-alt">{alt.toLocaleString('en-NZ')}</text>
        </g>
      ))}
      <text x="54" y="500" textAnchor="end" className="mt-alt">metres</text>
      {/* far ranges */}
      <path d="M0 520 L0 372 L78 318 L130 352 L214 262 L286 330 L352 288 L420 350 L960 520 Z" fill="#2A4270" opacity="0.55" />
      <path d="M520 520 L640 300 L700 352 L772 246 L830 316 L884 270 L960 338 L960 520 Z" fill="#2A4270" opacity="0.55" />
      {/* the peak */}
      <path d="M60 520 L168 446 L236 396 L300 372 L352 300 L410 268 L452 196 L500 150 L528 96 L566 52 L598 104 L640 146 L672 214 L722 262 L764 338 L826 392 L900 470 L960 520 Z" fill="#35507F" />
      <path d="M566 52 L598 104 L640 146 L672 214 L722 262 L764 338 L826 392 L900 470 L960 520 L600 520 L588 300 Z" fill="#2B4472" />
      {/* the snowcap */}
      <path d="M566 52 L528 96 L500 150 L470 180 L492 196 L512 176 L530 214 L556 182 L574 226 L600 186 L622 222 L648 190 L662 204 L640 146 L598 104 Z" fill="#F6F9FC" />
      <path d="M566 52 L598 104 L640 146 L662 204 L648 190 L622 222 L600 186 L588 150 Z" fill="#D5E0EA" />
      {/* route */}
      <polyline points={line(0, camps.length - 1)} fill="none" stroke="#C9D4DE" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
      {reach > 0 && <polyline points={line(0, reach)} fill="none" stroke="#D9A62E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      {/* camps */}
      {camps.map((c) => {
        const [cx, cy] = POS[c.id];
        const left = c.id === 'glacier' || c.id === 'ridge';
        const lx = left ? cx - 18 : cx + 18;
        const dy = c.id === 'icefall' ? 30 : 0; // keep this label below the snowline
        const node = (
          <g className={`camp camp-${c.state}`}>
            <circle cx={cx} cy={cy} r="20" fill="transparent" />
            <circle cx={cx} cy={cy} r="9" className="camp-dot" />
            {c.state === 'done' && <path d={`M${cx - 4} ${cy} l3 3 l5 -6`} fill="none" stroke="#0B1730" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
            <text x={lx} y={cy - 2 + dy} textAnchor={left ? 'end' : 'start'} className="camp-name">{c.name}</text>
            <text x={lx} y={cy + 15 + dy} textAnchor={left ? 'end' : 'start'} className="camp-meta">
              {visitor
                ? `${c.altitude.toLocaleString('en-NZ')} m, ${c.total} challenges`
                : c.state === 'locked'
                  ? `${c.altitude.toLocaleString('en-NZ')} m, locked`
                  : `${c.altitude.toLocaleString('en-NZ')} m, ${c.solved} of ${c.total} climbed`}
            </text>
          </g>
        );
        return linkCamps && c.state !== 'locked' ? (
          <Link key={c.id} href={`/camp/${c.id}`} aria-label={`${c.name}, ${c.solved} of ${c.total} climbed`}>{node}</Link>
        ) : (
          <g key={c.id}>{node}</g>
        );
      })}
    </svg>
  );
}
