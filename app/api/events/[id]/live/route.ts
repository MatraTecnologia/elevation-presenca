import { db } from "@/lib/db";
import { authorize, endpoint } from "@/lib/http";
import { snapshot } from "@/lib/event-service";

export const GET = endpoint(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  await authorize(request);
  const { id } = await context.params;
  const encoder = new TextEncoder();
  let stopped = false;
  const stream = new ReadableStream({
    async start(controller) {
      let revision = -1;
      const started = Date.now();
      const stop = () => { stopped = true; };
      request.signal.addEventListener("abort", stop, { once: true });
      try {
        controller.enqueue(encoder.encode("retry: 2000\n\n"));
        while (!stopped && Date.now() - started < 50000) {
          await authorize(request);
          const event = await db.event.findUnique({ where: { id }, select: { revision: true } });
          if (!event) break;
          if (revision !== event.revision) {
            const data = await snapshot(id);
            revision = data.event.revision;
            if (stopped) break;
            controller.enqueue(encoder.encode(`event: snapshot\ndata: ${JSON.stringify(data)}\n\n`));
          } else {
            controller.enqueue(encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`));
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch {
        if (!stopped) controller.enqueue(encoder.encode("event: unavailable\ndata: {}\n\n"));
      } finally {
        request.signal.removeEventListener("abort", stop);
        try { controller.close(); } catch { /* The client already disconnected. */ }
      }
    },
    cancel() { stopped = true; },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "private, no-cache, no-store, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
});
