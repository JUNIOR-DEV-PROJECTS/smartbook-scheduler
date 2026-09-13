// Pure scheduling helpers shared by the server (slot generation) and the UI.

export interface Interval {
  start: number; // epoch ms
  end: number;
}

/** Offset in minutes between the given IANA timezone and UTC at a point in time. */
export function tzOffsetMinutes(timeZone: string, at: Date): number {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = Object.fromEntries(dtf.formatToParts(at).map((p) => [p.type, p.value]));
    const asUTC = Date.UTC(
      Number(parts["year"]),
      Number(parts["month"]) - 1,
      Number(parts["day"]),
      Number(parts["hour"]) === 24 ? 0 : Number(parts["hour"]),
      Number(parts["minute"]),
      Number(parts["second"]),
    );
    return (asUTC - at.getTime()) / 60000;
  } catch {
    return 0;
  }
}

/** Convert a wall-clock date + time in a business timezone to a UTC instant. */
export function zonedToUtc(dateISO: string, time: string, timeZone: string): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naive = Date.UTC(y!, (m ?? 1) - 1, d!, hh ?? 0, mm ?? 0);
  const guess = new Date(naive);
  const offset = tzOffsetMinutes(timeZone, guess);
  return new Date(naive - offset * 60000);
}

/** Weekday (0=Sunday) of a yyyy-mm-dd date string. */
export function weekdayOf(dateISO: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d!)).getUTCDay();
}

export function overlaps(a: Interval, b: Interval) {
  return a.start < b.end && b.start < a.end;
}

export interface SlotInput {
  dateISO: string;
  timeZone: string;
  /** Working windows for that weekday, as { start_time, end_time } wall clock. */
  windows: { start_time: string; end_time: string }[];
  /** Already-taken intervals (appointments, time off) in epoch ms. */
  busy: Interval[];
  durationMinutes: number;
  stepMinutes?: number;
  /** Earliest bookable instant (e.g. now + lead time). */
  notBefore?: number;
}

export function buildSlots({
  dateISO,
  timeZone,
  windows,
  busy,
  durationMinutes,
  stepMinutes = 15,
  notBefore = Date.now(),
}: SlotInput): number[] {
  const slots: number[] = [];
  const durationMs = durationMinutes * 60000;

  for (const w of windows) {
    const windowStart = zonedToUtc(dateISO, w.start_time.slice(0, 5), timeZone).getTime();
    const windowEnd = zonedToUtc(dateISO, w.end_time.slice(0, 5), timeZone).getTime();
    for (let t = windowStart; t + durationMs <= windowEnd; t += stepMinutes * 60000) {
      if (t < notBefore) continue;
      const candidate: Interval = { start: t, end: t + durationMs };
      if (busy.some((b) => overlaps(candidate, b))) continue;
      slots.push(t);
    }
  }
  return [...new Set(slots)].sort((a, b) => a - b);
}

export function toDateISO(d: Date, timeZone?: string) {
  if (!timeZone) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return `${parts["year"]}-${parts["month"]}-${parts["day"]}`;
}
