import { api } from "@/lib/api";
import { getDB, type OutboxOp } from "./db";

/**
 * Offline sync engine.
 *
 * Mutations are written to the local `outbox` (see `enqueue`) and replayed
 * against the API in FIFO order when the device is online. Replays are safe to
 * repeat because every op carries a client-generated UUID (`op.id`) that is
 * sent to the backend as `clientId`; the backend upserts on it, so a duplicate
 * replay never creates a duplicate record.
 */

const MAX_ATTEMPTS = 8;
let flushing = false;
const listeners = new Set<() => void>();

function crypoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Subscribe to outbox-state changes (e.g. to refresh a "pending sync" badge). */
export function onSyncChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      /* ignore listener errors */
    }
  });
}

/**
 * Queue a mutation for (eventual) replay. Returns the generated `clientId`,
 * which the caller should also use as the local record's id so the optimistic
 * UI row and the synced server row line up.
 */
export async function enqueue(args: {
  entity: string;
  method: OutboxOp["method"];
  endpoint: string;
  body: Record<string, unknown>;
  clientId?: string;
}): Promise<string> {
  const id = args.clientId ?? crypoRandomId();
  const now = Date.now();
  const op: OutboxOp = {
    id,
    entity: args.entity,
    method: args.method,
    endpoint: args.endpoint,
    body: { ...args.body, clientId: id },
    status: "pending",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
  await getDB().outbox.put(op);
  notify();
  // Best-effort immediate flush when we appear to be online.
  if (typeof navigator === "undefined" || navigator.onLine) {
    void flushOutbox();
  }
  return id;
}

/** Number of ops still waiting to sync. */
export async function pendingCount(): Promise<number> {
  return getDB()
    .outbox.where("status")
    .anyOf("pending", "failed")
    .count();
}

/**
 * Replay all pending ops in order. Idempotent and safe to call repeatedly;
 * a single in-flight flush is enforced via the `flushing` guard.
 */
export async function flushOutbox(): Promise<void> {
  if (flushing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  flushing = true;
  try {
    const db = getDB();
    const ops = await db.outbox
      .where("status")
      .anyOf("pending", "failed")
      .sortBy("createdAt");

    for (const op of ops) {
      if (op.attempts >= MAX_ATTEMPTS) continue;
      await db.outbox.update(op.id, { status: "syncing", updatedAt: Date.now() });
      notify();
      try {
        await api.request({
          url: op.endpoint,
          method: op.method,
          data: op.body,
        });
        // Success — drop the op from the queue.
        await db.outbox.delete(op.id);
        notify();
      } catch (err: any) {
        const httpStatus = err?.response?.status;
        // Client errors (4xx except 408/429) won't succeed on retry — give up
        // to avoid poisoning the queue, but keep the record for inspection.
        const permanent =
          typeof httpStatus === "number" &&
          httpStatus >= 400 &&
          httpStatus < 500 &&
          httpStatus !== 408 &&
          httpStatus !== 429;
        await db.outbox.update(op.id, {
          status: "failed",
          attempts: op.attempts + 1 + (permanent ? MAX_ATTEMPTS : 0),
          lastError:
            err?.response?.data?.message ?? err?.message ?? "sync failed",
          updatedAt: Date.now(),
        });
        notify();
        if (!permanent) break; // network blip — stop and retry later
      }
    }
  } finally {
    flushing = false;
  }
}

let started = false;

/** Wire up automatic flushing on reconnect and on tab focus. Call once. */
export function startSyncEngine(): () => void {
  if (started || typeof window === "undefined") return () => {};
  started = true;
  const onOnline = () => void flushOutbox();
  const onVisible = () => {
    if (document.visibilityState === "visible") void flushOutbox();
  };
  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisible);
  // Attempt an initial flush in case ops were queued in a previous session.
  void flushOutbox();
  return () => {
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisible);
    started = false;
  };
}
