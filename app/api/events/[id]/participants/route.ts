import { authorize, body, endpoint, json } from "@/lib/http";
import { participantSchema } from "@/lib/validation";
import { addParticipants } from "@/lib/event-service";
export const POST = endpoint(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  await authorize(request);
  const input = participantSchema.parse(await body(request));
  const result = await addParticipants((await context.params).id, [input], "MANUAL");
  return result.imported ? json(result, 201) : json({ error: "Uma participante com este contato ou estes dados já está cadastrada no evento." }, 409);
});
