import { currentSession } from "@/lib/api";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

// Server-sent events: tells signed-in pages that something changed so they
// re-read their (role-scoped) snapshot. Stands in for Supabase Realtime.
export async function GET(req: Request) {
  if (!(await currentSession())) return new Response("Sign in first.", { status: 401 });
  const enc = new TextEncoder();
  let unsubscribe = () => {};
  let ping: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try { controller.enqueue(enc.encode(data)); } catch { /* closed */ }
      };
      send("retry: 3000\n\n");
      unsubscribe = getStore().subscribe((e) => send(`data: ${JSON.stringify(e)}\n\n`));
      ping = setInterval(() => send(": ping\n\n"), 20_000);
      req.signal.addEventListener("abort", () => {
        unsubscribe();
        clearInterval(ping);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
    cancel() { unsubscribe(); clearInterval(ping); },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" },
  });
}
