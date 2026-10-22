import { z } from "zod";
import { authorize, body, endpoint, json } from "@/lib/http";
import { movementSchema } from "@/lib/validation";
import { recordMovement, undoMovement } from "@/lib/event-service";
export const POST = endpoint(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const user = await authorize(request);
  return json(await recordMovement((await context.params).id, movementSchema.parse(await body(request)), user.id), 201);
});
export const PATCH = endpoint(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const user = await authorize(request);
  const input = z.object({ movementId: z.string().min(1), reason: z.string().trim().min(5, "Descreva o motivo com pelo menos 5 caracteres.").max(500) }).parse(await body(request));
  return json(await undoMovement((await context.params).id, input.movementId, input.reason, user.id));
});
