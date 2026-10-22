import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { transition, identityKey } from "@/lib/attendance";
import type { State, MoveKind } from "@/lib/contracts";
import type { z } from "zod";
import type { participantSchema, movementSchema } from "@/lib/validation";

export async function snapshot(eventId: string) {
  return db.$transaction(async tx => {
    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event) throw new HttpError(404, "Evento não encontrado.");
    const registrations = await tx.registration.findMany({ where: { eventId }, include: { participant: true }, orderBy: { participant: { name: "asc" } } });
    const movements = await tx.movement.findMany({ where: { registration: { eventId } }, include: { recordedBy: { select: { name: true } }, voidedBy: { select: { name: true } }, registration: { include: { participant: { select: { name: true } } } } }, orderBy: [{ recordedAt: "asc" }, { id: "asc" }] });
    return {
      event, registrations,
      movements: movements.map(m => ({ id: m.id, registrationId: m.registrationId, name: m.registration.participant.name, kind: m.kind, previousState: m.previousState, nextState: m.nextState, recordedAt: m.recordedAt, operator: m.recordedBy.name, voidedAt: m.voidedAt, voidReason: m.voidReason, correctedBy: m.voidedBy?.name ?? null })),
      serverTime: new Date().toISOString(),
    };
  }, { isolationLevel: "RepeatableRead", timeout: 20000 });
}

export async function addParticipants(eventId: string, rows: z.infer<typeof participantSchema>[], source: "MANUAL" | "CSV") {
  return db.$transaction(async tx => {
    // Event lock serializes imports and close-event operations across all app instances.
    const event = await tx.event.update({ where: { id: eventId }, data: { revision: { increment: 1 } } });
    if (event.status !== "OPEN") throw new HttpError(409, "Este evento está encerrado.");
    let imported = 0;
    let skipped = 0;
    for (const row of rows) {
      const key = identityKey(row.email, row.phone);
      const duplicate = await tx.registration.findFirst({ where: { eventId, OR: [
        ...(key ? [{ identityKey: key }] : []),
        ...(row.externalId ? [{ externalId: row.externalId }] : []),
        ...(row.email ? [{ participant: { email: row.email.toLowerCase() } }] : []),
        ...(row.phone ? [{ participant: { phone: row.phone.replace(/\D/g, "") } }] : []),
        { participant: { name: { equals: row.name, mode: "insensitive" as const }, email: row.email?.toLowerCase() || null, phone: row.phone?.replace(/\D/g, "") || null } },
      ] } });
      if (duplicate) { skipped++; continue; }
      await tx.registration.create({ data: { event: { connect: { id: eventId } }, ticket: row.ticket || "Geral", source, externalId: row.externalId || null, identityKey: key, participant: { create: { name: row.name, email: row.email?.toLowerCase() || null, phone: row.phone?.replace(/\D/g, "") || null, company: row.company || null } } } });
      imported++;
    }
    return { imported, skipped };
  }, { timeout: 60000 });
}

export async function recordMovement(eventId: string, input: z.infer<typeof movementSchema>, userId: string) {
  return db.$transaction(async tx => {
    // Consistent lock order: event, registration, movement. No double counting across tablets.
    const event = await tx.event.update({ where: { id: eventId }, data: { revision: { increment: 1 } } });
    if (event.status !== "OPEN") throw new HttpError(409, "Este evento está encerrado.");
    const existing = await tx.movement.findUnique({ where: { requestId: input.requestId }, include: { registration: true } });
    if (existing) {
      if (existing.registration.eventId !== eventId || existing.registrationId !== input.registrationId || existing.kind !== input.kind) throw new HttpError(409, "Identificador da operação já utilizado.");
      return existing;
    }
    const registration = await tx.registration.findFirst({ where: { id: input.registrationId, eventId } });
    if (!registration) throw new HttpError(404, "Participante não encontrada neste evento.");
    if (registration.version !== input.version) throw new HttpError(409, "Outra pessoa atualizou este credenciamento. A lista será atualizada; confira antes de tentar novamente.");
    let nextState: State;
    try { nextState = transition(registration.state as State, input.kind as MoveKind); }
    catch (error) { throw new HttpError(409, (error as Error).message); }
    await tx.registration.update({ where: { id: registration.id }, data: { state: nextState, version: { increment: 1 } } });
    // PostgreSQL now() is the transaction start time, which may precede lock acquisition.
    // clock_timestamp() records the actual instant after serialized state validation.
    const [clock] = await tx.$queryRaw<{ at: Date }[]>`SELECT clock_timestamp() AS at`;
    return tx.movement.create({ data: { registrationId: registration.id, kind: input.kind, previousState: registration.state, nextState, recordedById: userId, requestId: input.requestId, recordedAt: clock.at } });
  }, { timeout: 20000 });
}

export async function undoMovement(eventId: string, movementId: string, reason: string, userId: string) {
  return db.$transaction(async tx => {
    const event = await tx.event.update({ where: { id: eventId }, data: { revision: { increment: 1 } } });
    if (event.status !== "OPEN") throw new HttpError(409, "Reabra o evento antes de corrigir uma movimentação.");
    const movement = await tx.movement.findFirst({ where: { id: movementId, registration: { eventId } } });
    if (!movement || movement.voidedAt) throw new HttpError(409, "Movimentação não encontrada ou já desfeita.");
    const latest = await tx.movement.findFirst({ where: { registrationId: movement.registrationId, voidedAt: null }, orderBy: [{ recordedAt: "desc" }, { id: "desc" }] });
    if (latest?.id !== movement.id) throw new HttpError(409, "Desfaça primeiro a movimentação mais recente desta participante.");
    await tx.registration.update({ where: { id: movement.registrationId }, data: { state: movement.previousState, version: { increment: 1 } } });
    return tx.movement.update({ where: { id: movementId }, data: { voidedAt: new Date(), voidedById: userId, voidReason: reason } });
  });
}
