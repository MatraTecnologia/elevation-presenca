import "dotenv/config";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { db } from "../lib/db";
import { normalize } from "../lib/attendance";

const inputSchema = z.object({
  eventStartsAt: z.iso.datetime({ offset: true }),
  capturedAt: z.iso.datetime({ offset: true }),
  expectedCount: z.number().int().positive(),
  buyers: z.array(z.object({
    externalId: z.string().min(1),
    name: z.string().min(2),
    document: z.string().min(11),
    phoneOriginal: z.string().min(8),
    registeredAt: z.iso.datetime({ offset: true }),
    grossAmountCents: z.number().int().positive(),
    coupon: z.string().optional(),
    netAmountRecordedCents: z.number().int().nonnegative().optional(),
  })),
});

const digits = (value: string | null | undefined) => value?.replace(/\D/g, "") || "";
const usablePhone = (value: string) => /[*xX•]/.test(value) ? null : digits(value);

async function main() {
  const filename = process.argv[2];
  if (!filename) throw new Error("Informe o arquivo JSON privado com a lista de compradoras.");
  const input = inputSchema.parse(JSON.parse(await readFile(filename, "utf8")));
  if (input.buyers.length !== input.expectedCount) throw new Error("A quantidade de compradoras diverge do total informado.");
  if (new Set(input.buyers.map(row => row.externalId)).size !== input.expectedCount) throw new Error("Há IDs de origem repetidos no arquivo.");
  if (new Set(input.buyers.map(row => digits(row.document))).size !== input.expectedCount) throw new Error("Há documentos repetidos no arquivo; confira a origem antes de importar.");

  const events = await db.event.findMany({ where: { name: "Elevation", startsAt: new Date(input.eventStartsAt) }, select: { id: true, name: true, edition: true, status: true } });
  if (events.length !== 1) throw new Error("Não foi possível identificar um único evento Elevation para a data informada.");
  const event = events[0];
  const masked = input.buyers.filter(row => usablePhone(row.phoneOriginal) === null).length;
  const before = await db.registration.count({ where: { eventId: event.id } });
  if (process.argv.includes("--dry-run")) {
    console.log(JSON.stringify({ mode: "preview", event: `${event.name} · ${event.edition}`, currentRegistrations: before, received: input.buyers.length, maskedPhones: masked, sharedPhoneGroups: sharedPhones(input.buyers) }));
    return;
  }

  const result = await db.$transaction(async tx => {
    const locked = await tx.event.update({ where: { id: event.id }, data: { revision: { increment: 1 } } });
    if (locked.status !== "OPEN") throw new Error("O evento está encerrado; reabra antes de adicionar inscrições.");
    const existing = await tx.registration.findMany({ where: { eventId: event.id }, include: { participant: true } });
    let created = 0;
    let updated = 0;
    for (const row of input.buyers) {
      const phone = usablePhone(row.phoneOriginal);
      const matches = existing.filter(registration =>
        registration.externalId === row.externalId ||
        digits(registration.participant.document) === digits(row.document) ||
        (normalize(registration.participant.name) === normalize(row.name) && !!phone && registration.participant.phone === phone),
      );
      if (matches.length > 1) throw new Error(`Mais de uma inscrição corresponde ao ID de origem ${row.externalId}; reconciliação manual necessária.`);
      const match = matches[0];
      if (match?.externalId && match.externalId !== row.externalId) throw new Error(`Conflito de identificação no ID de origem ${row.externalId}.`);
      if (match && normalize(match.participant.name) !== normalize(row.name)) throw new Error(`O ID de origem ${row.externalId} já está associado a outro nome.`);
      const participant = { name: row.name, phone, phoneOriginal: row.phoneOriginal, document: row.document };
      const metadata = {
        source: "BUYERS_LIST",
        externalId: row.externalId,
        identityKey: `external:${row.externalId}`,
        ticket: `Lote R$ ${(row.grossAmountCents / 100).toLocaleString("pt-BR")}`,
        sourceRegisteredAt: new Date(row.registeredAt),
        sourceCapturedAt: new Date(input.capturedAt),
        grossAmountCents: row.grossAmountCents,
        netAmountRecordedCents: row.netAmountRecordedCents ?? null,
        coupon: row.coupon ?? null,
      };
      if (match) {
        await tx.participant.update({ where: { id: match.participantId }, data: participant });
        await tx.registration.update({ where: { id: match.id }, data: metadata });
        updated++;
      } else {
        const registration = await tx.registration.create({ data: { event: { connect: { id: event.id } }, ...metadata, participant: { create: participant } }, include: { participant: true } });
        existing.push(registration);
        created++;
      }
    }
    return { created, updated };
  }, { maxWait: 15000, timeout: 60000 });

  const imported = await db.registration.findMany({ where: { eventId: event.id, externalId: { in: input.buyers.map(row => row.externalId) } }, include: { participant: true } });
  if (imported.length !== input.expectedCount) throw new Error("A verificação final não encontrou todas as inscrições.");
  for (const row of input.buyers) {
    const registration = imported.find(r => r.externalId === row.externalId)!;
    if (registration.participant.name !== row.name || registration.participant.phoneOriginal !== row.phoneOriginal || registration.participant.document !== row.document || registration.grossAmountCents !== row.grossAmountCents || registration.sourceRegisteredAt?.toISOString() !== new Date(row.registeredAt).toISOString()) throw new Error(`Divergência após importação no ID de origem ${row.externalId}.`);
  }
  console.log(JSON.stringify({ verified: true, event: `${event.name} · ${event.edition}`, ...result, sourceRegistrations: imported.length, totalRegistrations: await db.registration.count({ where: { eventId: event.id } }), maskedPhones: masked, sharedPhoneGroups: sharedPhones(input.buyers), states: Object.fromEntries([...new Set(imported.map(r => r.state))].map(state => [state, imported.filter(r => r.state === state).length])) }));
}

function sharedPhones(rows: { phoneOriginal: string }[]) {
  const counts = new Map<string, number>();
  for (const row of rows) { const phone = usablePhone(row.phoneOriginal); if (phone) counts.set(phone, (counts.get(phone) || 0) + 1); }
  return [...counts.values()].filter(count => count > 1).length;
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Falha na importação."); process.exitCode = 1; }).finally(() => db.$disconnect());
