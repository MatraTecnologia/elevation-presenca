import { z } from "zod";

export const eventSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome do evento.").max(120),
  edition: z.string().trim().max(80).default(""),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  venue: z.string().trim().min(2, "Informe o local.").max(160),
  capacity: z.number().int().min(1).max(100000),
}).refine(v => new Date(v.endsAt) > new Date(v.startsAt), { message: "O encerramento deve ser depois do início.", path: ["endsAt"] });

export const participantSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome completo.").max(160),
  email: z.union([z.email("E-mail inválido."), z.literal("")]).optional().default(""),
  phone: z.string().trim().max(30).default("").refine(v => !v || v.replace(/\D/g, "").length >= 10, "Informe o telefone com DDD."),
  company: z.string().trim().max(160).default(""),
  ticket: z.string().trim().max(80).default("Geral"),
  externalId: z.string().trim().max(160).optional(),
});

export const movementSchema = z.object({
  registrationId: z.string().min(1),
  kind: z.enum(["ENTRY", "EXIT", "DEPARTURE"]),
  version: z.number().int().min(0),
  requestId: z.uuid(),
});
