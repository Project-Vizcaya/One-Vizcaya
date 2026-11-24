import { MemoryStore } from "./memoryStore";
import type { HubStore } from "./types";
import { sendCitizenUpdate } from "../bridgeOut";

// One store per server process. The prototype keeps everything in memory
// (lost on restart). To use the co-dev's Supabase database, implement
// HubStore against it and return that here; pages and API routes don't change.
const g = globalThis as unknown as { __hubStore?: HubStore; __hubPurge?: ReturnType<typeof setInterval> };

export function getStore(): HubStore {
  if (!g.__hubStore) {
    g.__hubStore = new MemoryStore({ onCitizenUpdate: (u) => { void sendCitizenUpdate(u); } });
    // Daily purge of location history not linked to an incident.
    g.__hubPurge = setInterval(() => { void g.__hubStore?.purgeHistory(); }, 24 * 3600e3);
    g.__hubPurge.unref?.();
  }
  return g.__hubStore;
}

export { HubError } from "./types";
