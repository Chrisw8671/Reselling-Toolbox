export function startOfWeekMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function moneyGBP(n: number) {
  return `£${n.toFixed(2)}`;
}

export function isoDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export function isoDateTime(iso: string) {
  return new Date(iso).toISOString().slice(0, 16).replace("T", " ");
}