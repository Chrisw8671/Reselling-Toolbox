// lib/format.ts
export function startOfWeekMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function moneyGBP(value: unknown) {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : value && typeof value === "object" && "toNumber" in (value as any)
          ? (value as any).toNumber()
          : Number(value);

  return `£${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

export function isoDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export function isoDateTime(iso: string) {
  return new Date(iso).toISOString().slice(0, 16).replace("T", " ");
}

export function isoDateFromDate(d: Date) {
  return d.toISOString().slice(0, 10);
}