import { auth } from "@/lib/auth";
import {
  ensureMainVibeRoom,
  getVibeSnapshot,
  subscribeToVibe,
  syncActiveVibeJobs,
} from "@/lib/vibe-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const room = await ensureMainVibeRoom();
  const encoder = new TextEncoder();
  let closed = false;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let unsubscribe: () => void = () => undefined;
  let closeStream: () => void = () => undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let lastPayload = "";
      let snapshotInFlight = false;

      const send = (payload: string) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: vibe\ndata: ${payload}\n\n`));
      };

      const sendSnapshot = async () => {
        if (closed || snapshotInFlight) return;
        snapshotInFlight = true;
        try {
          await syncActiveVibeJobs(room.id);
          const payload = JSON.stringify(await getVibeSnapshot(room.id));
          if (payload !== lastPayload) {
            lastPayload = payload;
            send(payload);
          }
        } catch {
          // The three-second poll is a best-effort backup; the next pass retries.
        } finally {
          snapshotInFlight = false;
        }
      };

      const onVibeUpdate = () => { void sendSnapshot(); };
      unsubscribe = subscribeToVibe(onVibeUpdate);
      pollTimer = setInterval(() => { void sendSnapshot(); }, 3_000);
      heartbeatTimer = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 15_000);
      closeStream = () => {
        if (closed) return;
        closed = true;
        if (pollTimer) clearInterval(pollTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        unsubscribe();
        try { controller.close(); } catch { /* The browser already disconnected. */ }
      };
      request.signal.addEventListener("abort", closeStream, { once: true });
      void sendSnapshot();
    },
    cancel() {
      closeStream();
    },
  });

  return new Response(stream, {
    headers: {
      "cache-control": "no-cache, no-transform",
      "connection": "keep-alive",
      "content-type": "text/event-stream; charset=utf-8",
      "x-accel-buffering": "no",
    },
  });
}
