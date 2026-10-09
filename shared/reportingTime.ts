export function istDayBounds(now = Date.now()) {
  const shifted = new Date(now + 5.5 * 60 * 60 * 1000);
  const start = Date.parse(`${shifted.toISOString().slice(0, 10)}T00:00:00+05:30`);
  return { start, end: start + 86_400_000 };
}
