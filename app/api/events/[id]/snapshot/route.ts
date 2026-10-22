import { authorize, endpoint, json } from "@/lib/http";
import { snapshot } from "@/lib/event-service";
export const GET = endpoint(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  await authorize(request);
  return json(await snapshot((await context.params).id));
});
