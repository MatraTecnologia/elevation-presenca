import { z } from "zod";
import { authorize, body, endpoint, json } from "@/lib/http";
import { participantSchema } from "@/lib/validation";
import { addParticipants } from "@/lib/event-service";
export const POST = endpoint(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  await authorize(request, true);
  const { rows } = z.object({ rows: z.array(participantSchema).min(1).max(1000, "Importe até 1.000 participantes por arquivo.") }).parse(await body(request));
  return json(await addParticipants((await context.params).id, rows, "CSV"));
});
