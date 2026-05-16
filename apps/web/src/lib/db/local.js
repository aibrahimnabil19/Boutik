// Offline-first local database powered by Dexie (IndexedDB wrapper)
// Every write goes here first, then syncs to Supabase when online.

import Dexie from "dexie";

export const localDb = new Dexie("BmSuiteDB");

localDb.version(5).stores({
  products: "id, shop_id, code, name, supplier, sync_status, deleted_at",
  purchases:
    "id, shop_id, supplier_id, date, supplier, product_id, payment_status, sync_status, sync_error, deleted_at",
  sales:
    "id, session_id, sale_batch_id, shop_id, client_id, date, product_id, payment_status, sync_status, sync_error, deleted_at, cancelled_at",
  expenses: "id, shop_id, date, sync_status, deleted_at",
  clients: "id, shop_id, name",
  client_transactions: "id, shop_id, client_id, date, deleted_at",
  suppliers: "id, shop_id, name",
  supplier_transactions: "id, shop_id, supplier_id, date, deleted_at",
  invoices: "id, shop_id, type, status, date, invoice_number",
  invoice_items: "id, invoice_id, shop_id, deleted_at",
  sync_queue: "++_localId, table_name, record_id, operation, created_at",
  app_settings: "key",
});

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Get a setting value from local storage */
export async function getSetting(key) {
  const row = await localDb.app_settings.get(key);
  return row ? row.value : null;
}

/** Set a setting value in local storage */
export async function setSetting(key, value) {
  await localDb.app_settings.put({ key, value });
}

/** Mark a record as pending sync */
export async function queueSync(tableName, operation, recordId, payload) {
  await localDb.sync_queue.add({
    table_name: tableName,
    operation,
    record_id: recordId,
    payload,
    created_at: new Date().toISOString(),
  });
}

// Debounce sync trigger to prevent it firing multiple times per save
// (which caused pullFromRemote to re-bulkPut records creating apparent duplicates)
let syncDebounceTimer = null;

/** Generic upsert that also queues for sync */
export async function localUpsert(table, record, operation = "upsert") {
  await localDb[table].put(record);
  await queueSync(table, operation, record.id, record);
  scheduleSyncNow(record.shop_id);
  return record;
}

/** Soft delete a record */
export async function localDelete(table, id) {
  const existing = await localDb[table].where("id").equals(id).first();
  const now = new Date().toISOString();

  await localDb[table]
    .where("id")
    .equals(id)
    .modify({ deleted_at: now, sync_status: "pending" });

  await queueSync(table, "delete", id, { id, deleted_at: now });
  scheduleSyncNow(existing?.shop_id);
}

/** Get all non-deleted records for a shop */
export async function getAll(table, shopId) {
  return localDb[table]
    .where("shop_id")
    .equals(shopId)
    .filter((r) => !r.deleted_at)
    .toArray();
}

export async function getPendingSyncItems() {
  return localDb.sync_queue.orderBy("created_at").toArray();
}

/**
 * Schedule a sync after a short delay to batch multiple writes together.
 * This prevents the race condition where pullFromRemote runs mid-save
 * and appears to create duplicate entries.
 */
function scheduleSyncNow(shopId) {
  if (typeof window === "undefined") return;
  if (!navigator.onLine) return;
  if (!shopId) return;

  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(async () => {
    syncDebounceTimer = null;
    try {
      const { runSync } = await import("@/lib/sync/engine");
      await runSync(shopId);
    } catch (err) {
      console.warn("[scheduledSync failed]", err?.message);
    }
  }, 2000); // wait 2s after last write before syncing
}

/** Get all records INCLUDING soft-deleted (for analysis/history) */
export async function getAllIncludingDeleted(table, shopId) {
  return localDb[table].where("shop_id").equals(shopId).toArray();
}

/** Cancel a sale (removes from stock/totals but keeps in history) */
export async function cancelSale(id, shopId) {
  const now = new Date().toISOString();
  await localDb.sales
    .where("id")
    .equals(id)
    .modify({ cancelled_at: now, sync_status: "pending" });
  await queueSync("sales", "upsert", id, { id, cancelled_at: now });
  scheduleSyncNow(shopId);
}
