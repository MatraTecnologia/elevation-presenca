import type { Snapshot } from "@/lib/contracts";

export function summarize(data: Snapshot) {
  const active = data.movements.filter(m => !m.voidedAt);
  const attendees = new Set(active.filter(m => m.kind === "ENTRY").map(m => m.registrationId));
  const inside = data.registrations.filter(r => r.state === "INSIDE").length;
  const outside = data.registrations.filter(r => r.state === "OUTSIDE").length;
  const departed = data.registrations.filter(r => r.state === "LEFT").length;
  const total = data.registrations.length;
  return { total, attended: attendees.size, inside, outside, departed, waiting: total - attendees.size, rate: total ? Math.round(attendees.size / total * 100) : 0 };
}

export function peakOccupancy(data: Snapshot) {
  let occupancy = 0;
  let peak = 0;
  for (const movement of data.movements) {
    if (movement.voidedAt) continue;
    if (movement.nextState === "INSIDE") occupancy++;
    else if (movement.previousState === "INSIDE") occupancy--;
    peak = Math.max(peak, occupancy);
  }
  return peak;
}

const clock = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
export function timeline(data: Snapshot) {
  const active = data.movements.filter(m => !m.voidedAt);
  const first = active.length ? Math.min(new Date(data.event.startsAt).getTime(), new Date(active[0].recordedAt).getTime()) : new Date(data.event.startsAt).getTime();
  const last = active.length ? Math.max(new Date(data.event.endsAt).getTime(), new Date(active[active.length - 1].recordedAt).getTime()) : new Date(data.event.endsAt).getTime();
  const interval = Math.max(900000, Math.ceil((last - first) / (120 * 900000)) * 900000);
  const start = Math.floor(first / interval) * interval;
  const buckets = Array.from({ length: Math.ceil((last - start) / interval) + 1 }, (_, i) => ({ time: clock.format(new Date(start + i * interval)), timestamp: start + i * interval, entradas: 0, saidas: 0, ocupacao: 0 }));
  for (const movement of active) {
    const bucket = buckets[Math.floor((new Date(movement.recordedAt).getTime() - start) / interval)];
    if (!bucket) continue;
    if (movement.nextState === "INSIDE") bucket.entradas++;
    else if (movement.previousState === "INSIDE") bucket.saidas++;
  }
  let occupancy = 0;
  return buckets.map(bucket => { occupancy += bucket.entradas - bucket.saidas; return { ...bucket, ocupacao: occupancy }; });
}

export function time(value: string | null | undefined) { return value ? clock.format(new Date(value)) : "—"; }
export function date(value: string) { return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }
