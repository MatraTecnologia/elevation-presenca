import { db } from "@/lib/db";
import { authorize, body, endpoint, json } from "@/lib/http";
import { eventSchema } from "@/lib/validation";

export const GET = endpoint(async request => {
  await authorize(request);
  return json(await db.event.findMany({ orderBy: { startsAt: "desc" }, include: { _count: { select: { registrations: true } } } }));
});
export const POST = endpoint(async request => {
  await authorize(request, true);
  const input = eventSchema.parse(await body(request));
  return json(await db.event.create({ data: input }), 201);
});
