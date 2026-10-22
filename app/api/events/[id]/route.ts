import { z } from "zod";
import { db } from "@/lib/db";
import { authorize, body, endpoint, json } from "@/lib/http";
export const PATCH = endpoint(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  await authorize(request, true);
  const { id } = await context.params;
  const input = z.object({ status: z.enum(["OPEN", "CLOSED"]) }).parse(await body(request));
  return json(await db.event.update({ where: { id }, data: { ...input, revision: { increment: 1 } } }));
});
