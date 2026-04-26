// Pushes the offline queue to Supabase whenever connection is available.

import { localDb } from '../db/local'
import { getSupabaseClient } from '../supabase/client'

let syncInProgress = false

export async function runSync() {
  if (syncInProgress) return
  syncInProgress = true

  const supabase = getSupabaseClient()
  const queue = await localDb.sync_queue.orderBy('created_at').toArray()

  for (const item of queue) {
    try {
      const { table_name, operation, payload } = item

      if (operation === 'delete') {
        await supabase.from(table_name).update({ deleted_at: payload.deleted_at }).eq('id', payload.id)
      } else {
        // insert or upsert
        const { error } = await supabase.from(table_name).upsert(payload, { onConflict: 'id' })
        if (error) throw error
      }

      // Mark record as synced locally
      await localDb[table_name]?.where('id').equals(item.record_id).modify({ sync_status: 'synced' })
      await localDb.sync_queue.delete(item._localId)
    } catch (err) {
      console.warn('[sync] failed for', item.table_name, item.record_id, err.message)
      // Leave in queue, will retry next time
    }
  }

  syncInProgress = false
}

/** Pull remote data for this shop and hydrate local DB */
export async function pullFromRemote(shopId) {
  const supabase = getSupabaseClient()
  const tables = ['products', 'purchases', 'sales', 'expenses', 'clients',
                  'client_transactions', 'suppliers', 'supplier_transactions',
                  'invoices', 'invoice_items']

  for (const table of tables) {
    const query = supabase.from(table).select('*')
    if (table !== 'invoice_items') query.eq('shop_id', shopId)

    const { data, error } = await query
    if (error || !data) continue

    // Bulk insert into local DB (put = upsert by primary key)
    await localDb[table].bulkPut(data)
  }
}

/** Start listening for online events and auto-sync */
export function startSyncListener() {
  if (typeof window === 'undefined') return

  const handleOnline = () => runSync()
  window.addEventListener('online', handleOnline)

  // Also sync every 2 minutes if online
  const interval = setInterval(() => {
    if (navigator.onLine) runSync()
  }, 2 * 60 * 1000)

  return () => {
    window.removeEventListener('online', handleOnline)
    clearInterval(interval)
  }
}