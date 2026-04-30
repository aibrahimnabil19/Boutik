import { localDb } from '@/lib/db/local'
import { getSupabaseClient } from '@/lib/supabase/client'

let syncInProgress = false

const TABLES = [
  'products',
  'purchases',
  'sales',
  'expenses',
  'clients',
  'client_transactions',
  'suppliers',
  'supplier_transactions',
  'invoices',
  'invoice_items',
]

export async function runSync(shopId) {
  if (syncInProgress) return
  if (!shopId) return

  syncInProgress = true
  const supabase = getSupabaseClient()

  try {
    const queue = await localDb.sync_queue.orderBy('created_at').toArray()

let failCount = 0

for (const item of queue) {
  try {
    const { table_name, operation, payload, record_id, _localId } = item

    // Strip local-only fields before sending to Supabase (see Bug 2)
    const { sync_status, _localId: _lid, ...cleanPayload } = payload

    if (operation === 'delete') {
      const { error } = await supabase
        .from(table_name)
        .update({ deleted_at: cleanPayload.deleted_at })
        .eq('id', cleanPayload.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from(table_name)
        .upsert(cleanPayload, { onConflict: 'id' })
      if (error) throw error
    }

    if (localDb[table_name]) {
      await localDb[table_name]
        .where('id').equals(record_id)
        .modify({ sync_status: 'synced' })
    }

    await localDb.sync_queue.delete(_localId)
  } catch (err) {
    failCount++
    console.error('[sync push failed]', {
      table: item.table_name,
      recordId: item.record_id,
      message: err?.message,
    })
  }
}

if (failCount > 0) {
  throw new Error(`${failCount} élément(s) n'ont pas pu être synchronisés. Vérifiez la console.`)
}

    await pullFromRemote(shopId)
  } finally {
    syncInProgress = false
  }
}

export async function pullFromRemote(shopId) {
  if (!shopId) return

  const supabase = getSupabaseClient()

  for (const table of TABLES) {
    try {
      if (table === 'invoice_items') {
        const { data: invoices, error: invoicesError } = await supabase
          .from('invoices')
          .select('id')
          .eq('shop_id', shopId)

        if (invoicesError) throw invoicesError

        const invoiceIds = (invoices || []).map((x) => x.id)
        if (!invoiceIds.length) {
          await localDb.invoice_items.clear()
          continue
        }

        const { data, error } = await supabase
          .from('invoice_items')
          .select('*')
          .in('invoice_id', invoiceIds)

        if (error) throw error

        await localDb.invoice_items.bulkPut((data || []).filter((row) => !row.deleted_at))
        continue
      }

      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('shop_id', shopId)

      if (error) throw error

      await localDb[table].bulkPut((data || []).filter((row) => !row.deleted_at))
    } catch (err) {
      console.warn('[sync pull failed]', table, err?.message)
    }
  }
}

export function startSyncListener(shopId) {
  if (typeof window === 'undefined') return () => {}
  if (!shopId) return () => {}

  const handleOnline = () => runSync(shopId)

  window.addEventListener('online', handleOnline)

  const interval = setInterval(() => {
    if (navigator.onLine) runSync(shopId)
  }, 15000)

  return () => {
    window.removeEventListener('online', handleOnline)
    clearInterval(interval)
  }
}