import Dexie, { type Table } from "dexie";

/**
 * Orivraa offline database (IndexedDB via Dexie).
 *
 * This is the single local-first store for the mobile shopkeeper app. It lets
 * Nepali retailers on intermittent connections keep working: reads are served
 * from local mirror tables, and every mutation is written here first and queued
 * in the `outbox` for replay when the device comes back online.
 *
 * Designed to be shared by the PWA today and the future native mobile app:
 * the sync contract (an idempotent outbox keyed by a client-generated UUID) is
 * transport-agnostic and maps directly onto the backend's `clientId` upserts.
 */

export type SyncStatus = "pending" | "syncing" | "synced" | "failed";

/** A queued mutation to replay against the API when online. */
export interface OutboxOp {
  /** Client-generated UUID — also sent to the API as `clientId` for idempotency. */
  id: string;
  /** Logical entity, e.g. "repair", "savingsMember", "savingsPayment", "sale". */
  entity: string;
  /** HTTP method for replay. */
  method: "post" | "patch" | "put" | "delete";
  /** API path relative to the axios baseURL (already includes /api). */
  endpoint: string;
  /** Request body (clientId is injected automatically from `id`). */
  body: unknown;
  status: SyncStatus;
  attempts: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

/** Locally cached repair job (mirror of the server record). */
export interface LocalRepair {
  id: string; // clientId while pending, server id once synced
  clientId?: string; // present so synced server rows can supersede the pending row
  shopId: string;
  customerName: string;
  customerPhone?: string;
  itemDescription: string;
  issueDescription: string;
  status: "RECEIVED" | "DIAGNOSING" | "IN_REPAIR" | "READY" | "DELIVERED";
  estimatedCost?: number;
  finalCost?: number;
  expectedReadyDate?: string;
  notes?: string;
  createdAt: string;
  _sync: SyncStatus;
}

/** Locally cached savings member (mirror of the server record). */
export interface LocalSavingsMember {
  id: string;
  clientId?: string;
  shopId: string;
  customerName: string;
  customerPhone?: string;
  schemeType: "DAILY" | "WEEKLY" | "MONTHLY";
  installmentAmount: number;
  installmentsPaid: number;
  totalInstallments: number;
  bonusInstallments: number;
  currency: string;
  totalSaved: number;
  bonusAmount: number;
  payoutTotal: number;
  startDate: string;
  maturityDate: string;
  status: "ACTIVE" | "MATURED" | "REDEEMED" | "CANCELLED";
  _sync: SyncStatus;
}

/** Generic key/value cache for read-mostly data (gold rates, inventory snapshots). */
export interface KvEntry {
  key: string;
  value: unknown;
  updatedAt: number;
}

class OrivraaDB extends Dexie {
  outbox!: Table<OutboxOp, string>;
  repairs!: Table<LocalRepair, string>;
  savingsMembers!: Table<LocalSavingsMember, string>;
  kv!: Table<KvEntry, string>;

  constructor() {
    super("orivraa-offline");
    this.version(1).stores({
      outbox: "id, entity, status, createdAt",
      repairs: "id, shopId, status, createdAt, _sync",
      savingsMembers: "id, shopId, status, _sync",
      kv: "key, updatedAt",
    });
  }
}

let _db: OrivraaDB | null = null;

/** Lazily instantiate the DB so it never runs during SSR. */
export function getDB(): OrivraaDB {
  if (typeof window === "undefined") {
    throw new Error("Offline DB is only available in the browser");
  }
  if (!_db) _db = new OrivraaDB();
  return _db;
}

/** Cache a value under `key`. */
export async function kvSet(key: string, value: unknown): Promise<void> {
  await getDB().kv.put({ key, value, updatedAt: Date.now() });
}

/** Read a cached value (or undefined). */
export async function kvGet<T = unknown>(key: string): Promise<T | undefined> {
  const row = await getDB().kv.get(key);
  return row?.value as T | undefined;
}
