// Offline-first local database powered by Dexie (IndexedDB wrapper)
// Every write goes here first, then syncs to Supabase when online.

import Dexie from 'dexie'

export const localDb = new Dexie('BmSuiteDB')

localDb.version(1).stores({
  // Format: 'primary_key, indexed_field, ...'
  products:              '++_localId, id, shop_id, code, name, supplier, sync_status, deleted_at',
  purchases:             '++_localId, id, shop_id, date, supplier, product_id, sync_status, deleted_at',
  sales: '++_localId, id, sale_batch_id, shop_id, date, product_id, sync_status, deleted_at',
  expenses:              '++_localId, id, shop_id, date, sync_status, deleted_at',
  clients:               '++_localId, id, shop_id, name',
  client_transactions:   '++_localId, id, shop_id, client_id, date, deleted_at',
  suppliers:             '++_localId, id, shop_id, name',
  supplier_transactions: '++_localId, id, shop_id, supplier_id, date, deleted_at',
  invoices:              '++_localId, id, shop_id, type, status, date, invoice_number',
  invoice_items: '++_localId, id, invoice_id, deleted_at',
  // Offline queue: records mutations that need to be pushed to Supabase
  sync_queue: '++_localId, table_name, record_id, operation, created_at',
  // Local app settings
  app_settings: 'key',
})

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Get a setting value from local storage */
export async function getSetting(key) {
  const row = await localDb.app_settings.get(key)
  return row ? row.value : null
}

/** Set a setting value in local storage */
export async function setSetting(key, value) {
  await localDb.app_settings.put({ key, value })
}

/** Mark a record as pending sync */
export async function queueSync(tableName, operation, recordId, payload) {
  await localDb.sync_queue.add({
    table_name: tableName,
    operation,
    record_id: recordId,
    payload,
    created_at: new Date().toISOString(),
  })
}

/** Generic upsert that also queues for sync */
export async function localUpsert(table, record, operation = 'upsert') {
  await localDb[table].put(record)
  await queueSync(table, operation, record.id, record)
  return record
}

/** Soft delete a record */
export async function localDelete(table, id) {
  const now = new Date().toISOString()
  await localDb[table].where('id').equals(id).modify({ deleted_at: now, sync_status: 'pending' })
  await queueSync(table, 'delete', id, { id, deleted_at: now })
}

/** Get all non-deleted records for a shop */
export async function getAll(table, shopId) {
  return localDb[table]
    .where('shop_id').equals(shopId)
    .filter(r => !r.deleted_at)
    .toArray()
}