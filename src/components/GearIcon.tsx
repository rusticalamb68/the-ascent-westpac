// Small line icons for gear badges. 24×24, drawn with currentColor.
const PATHS: Record<string, string> = {
  boots: 'M7 3h5v9l6 3a3 3 0 0 1 2 3v2H5v-6l2-2V3zM5 17h15M12 7h-2M12 10h-2',
  tent: 'M12 4 3 20h18L12 4zm0 0v16M9.5 20 12 14l2.5 6',
  axe: 'M6 21 17 4M17 4l-6 .5 2.5 3M17 4l2 5-3.5-1',
  crampons: 'M4 9h16v4H4zM6 13l-1 5M10 13l-.5 5M14 13l.5 5M18 13l1 5M8 9V6M16 9V6',
  rope: 'M12 3a4 4 0 0 1 0 8 4 4 0 0 0 0 8M8 7a4 4 0 0 0 4 4 4 4 0 0 1 4 4M12 19v2',
  headlamp: 'M4 12h16M8 8h8a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2zM12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
  flag: 'M6 21V3M6 4h11l-2.5 4L17 12H6',
  line: 'M4 19c4-1 3-6 7-7s3-6 9-8M4 19h3M17 4h3v3',
  storm: 'M7 15a4 4 0 0 1 .5-8 5 5 0 0 1 9.6 1A3.5 3.5 0 0 1 17 15M12 12l-2 4h3l-2 4',
  sun: 'M12 12m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4',
  bird: 'M3 14c3-5 6-5 9-1 3-4 6-4 9 1M12 13v5',
  peak: 'M3 20 10 7l3 5 2-3 6 11H3zM8.5 10l1.5 1.5L11.5 10',
  gauge: 'M4 16a8 8 0 1 1 16 0M12 16l4-6M12 16m-1 0a1 1 0 1 0 2 0 1 1 0 1 0-2 0',
  carabiner: 'M9 4h4a5 5 0 0 1 5 5v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V9M9 4v7',
  yeti: 'M8 9a4 4 0 0 1 8 0v3c2 1 3 3 3 6v2H5v-2c0-3 1-5 3-6V9zM10 9h.01M14 9h.01M10 13h4',
  glove: 'M7 12V6a1.5 1.5 0 0 1 3 0v4-6a1.5 1.5 0 0 1 3 0v6-5a1.5 1.5 0 0 1 3 0v8l1.5-2a1.6 1.6 0 0 1 2.6 1.8L17 19a5 5 0 0 1-4 2h-1a5 5 0 0 1-5-5v-4z',
};

export function GearIcon({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? PATHS.peak} />
    </svg>
  );
}
