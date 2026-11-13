// Game days and weeks follow New Zealand time.
const TZ = 'Pacific/Auckland';
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });

function parts(ms: number): Record<string, string> {
  const o: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date(ms))) o[p.type] = p.value;
  return o;
}

/** The NZ calendar day (YYYY-MM-DD) for an instant. */
export function nzDay(ms: number): string {
  const p = parts(ms);
  return `${p.year}-${p.month}-${p.day}`;
}

/** The instant at which an NZ calendar day starts. */
export function nzDayStartMs(day: string): number {
  const guess = Date.parse(day + 'T00:00:00Z');
  // offset = local wall-clock (read as UTC) minus the real instant
  const off = (ms: number) => {
    const p = parts(ms);
    return Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`) - ms;
  };
  let t = guess - off(guess);
  t = guess - off(t); // settle across daylight-saving changes
  return t;
}

export function dayNumber(day: string): number {
  return Math.round(Date.parse(day + 'T00:00:00Z') / 86400000);
}

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(day + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
}

/** Monday (NZ) of the week containing the instant, as a day string. */
export function nzWeekStartDay(ms: number): string {
  const day = nzDay(ms);
  const dow = (new Date(day + 'T00:00:00Z').getUTCDay() + 6) % 7; // Monday = 0
  return addDays(day, -dow);
}
