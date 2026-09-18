/// <reference lib="webworker" />

import { createPoseEngine, type WorkerIn } from "@/lib/pose/engine";

const handle = createPoseEngine((event) => self.postMessage(event));

self.onmessage = (ev: MessageEvent<WorkerIn>) => {
  void handle(ev.data);
};

export {};
