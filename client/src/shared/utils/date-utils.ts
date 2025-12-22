export function toYmd(d: Date): string {
  // local date -> YYYY-MM-DD (avoids UTC shift from toISOString())
  return d.toLocaleDateString('en-CA');
}

export function getPastDays(count: number, includeToday = true): string[] {
  const start = includeToday ? 0 : 1;

  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (i + start));
    return toYmd(d);
  }).reverse();
}
