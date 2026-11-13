export type Badge = { id: string; name: string; how: string; icon: string; secret?: boolean };

// icon values are keys into the icon set in components/GearIcon.tsx
export const BADGES: Badge[] = [
  { id: 'boots', name: 'Boots', how: 'Solve your first challenge', icon: 'boots' },
  { id: 'tent', name: 'Tent', how: 'Complete every challenge at Base Camp', icon: 'tent' },
  { id: 'axe', name: 'Ice axe', how: 'Complete every challenge at Treeline', icon: 'axe' },
  { id: 'crampons', name: 'Crampons', how: 'Complete every challenge on the Glacier', icon: 'crampons' },
  { id: 'rope', name: 'Rope', how: 'Complete every challenge in the Icefall', icon: 'rope' },
  { id: 'headlamp', name: 'Headlamp', how: 'Complete every challenge on the Ridge', icon: 'headlamp' },
  { id: 'flag', name: 'Summit flag', how: 'Climb all three summit pitches', icon: 'flag' },
  { id: 'clean-line', name: 'Clean line', how: 'Solve five challenges on the first attempt', icon: 'line' },
  { id: 'storm-chaser', name: 'Storm chaser', how: 'Beat the clock on three storm runs', icon: 'storm' },
  { id: 'weather-window', name: 'Weather window', how: 'Be active three days in a row', icon: 'sun' },
  { id: 'bluebird', name: 'Bluebird week', how: 'Be active seven days in a row', icon: 'bird' },
  { id: 'alpine-style', name: 'Alpine style', how: 'Complete a whole camp without buying a hint', icon: 'peak' },
  { id: 'forecaster', name: 'Forecaster', how: 'Answer five daily questions correctly', icon: 'gauge' },
  { id: 'roped-up', name: 'Roped up', how: 'Join a team rope', icon: 'carabiner' },
  { id: 'yeti', name: 'Yeti spotter', how: 'Found the table that is not in the catalogue', icon: 'yeti', secret: true },
  { id: 'glove', name: 'Lost glove', how: 'Found what the liftie logged on tower 7', icon: 'glove', secret: true },
];
