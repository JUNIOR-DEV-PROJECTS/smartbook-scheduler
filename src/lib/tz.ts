export function fmtTime(value: string | number | Date, tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function fmtDate(value: string | number | Date, tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function fmtDateTime(value: string | number | Date, tz: string) {
  return `${fmtDate(value, tz)}, ${fmtTime(value, tz)}`;
}

/** UTC instant for local-midnight of a yyyy-mm-dd string (browser local). */
export function dayRange(dateISO: string, days = 1) {
  const start = new Date(`${dateISO}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return { fromISO: start.toISOString(), toISO: end.toISOString(), start, end };
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function startOfMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}
