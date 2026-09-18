import type { EngineEvent, WorkerIn } from "./engine";

/**
 * Something that runs the pose engine and talks the worker message protocol.
 * Either a real Web Worker or an in-page fallback with the same shape, so
 * the detection hook does not care which one it got.
 */
export interface PoseEndpoint {
  readonly kind: "worker" | "main-thread";
  postMessage(msg: WorkerIn, transfer?: Transferable[]): void;
  onmessage: ((ev: { data: EngineEvent }) => void) | null;
  onerror: ((message: string) => void) | null;
  terminate(): void;
}

export function createWorkerEndpoint(): PoseEndpoint | null {
  if (typeof Worker === "undefined") return null;
  let worker: Worker;
  try {
    worker = new Worker(new URL("../../workers/pose.worker.ts", import.meta.url));
  } catch {
    return null;
  }
  const endpoint: PoseEndpoint = {
    kind: "worker",
    onmessage: null,
    onerror: null,
    postMessage: (msg, transfer) => worker.postMessage(msg, transfer ?? []),
    terminate: () => worker.terminate(),
  };
  worker.onmessage = (ev) => endpoint.onmessage?.(ev);
  worker.onerror = (ev) => {
    ev.preventDefault?.();
    endpoint.onerror?.(ev.message || "Worker failed to start");
  };
  return endpoint;
}

/** Runs the engine on the page's own thread. Heavier on the UI, but always works. */
export function createMainThreadEndpoint(): PoseEndpoint {
  let handle: ((msg: WorkerIn) => Promise<void>) | null = null;
  let disposed = false;
  const endpoint: PoseEndpoint = {
    kind: "main-thread",
    onmessage: null,
    onerror: null,
    postMessage: (msg) => {
      void (async () => {
        try {
          if (!handle) {
            const { createPoseEngine } = await import("./engine");
            if (disposed) return;
            handle = createPoseEngine((event) => {
              if (!disposed) endpoint.onmessage?.({ data: event });
            });
          }
          await handle(msg);
        } catch (err) {
          endpoint.onerror?.(err instanceof Error ? err.message : String(err));
        }
      })();
    },
    terminate: () => {
      disposed = true;
    },
  };
  return endpoint;
}
