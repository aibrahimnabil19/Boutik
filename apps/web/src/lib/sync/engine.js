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

    for (const item of queue) {
      try {
        const { table_name, operation, payload, record_id, _localId } = item

        if (operation === 'delete') {
          const { error } = await supabase
            .from(table_name)
            .update({ deleted_at: payload.deleted_at })
            .eq('id', payload.id)

          if (error) throw error
        } else {
          const { error } = await supabase
            .from(table_name)
            .upsert(payload, { onConflict: 'id' })

          if (error) throw error
        }

        if (localDb[table_name]) {
          await localDb[table_name]
            .where('id')
            .equals(record_id)
            .modify({ sync_status: 'synced' })
        }

        await localDb.sync_queue.delete(_localId)
      } catch (err) {
        console.warn('[sync push failed]', item.table_name, item.record_id, err?.message)
      }
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
      let query = supabase.from(table).select('*')

      if (table === 'invoice_items') {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id')
          .eq('shop_id', shopId)

        const invoiceIds = (invoices || []).map((x) => x.id)
        if (!invoiceIds.length) continue

        const { data, error } = await supabase
          .from('invoice_items')
          .select('*')
          .in('invoice_id', invoiceIds)

        if (error) throw error
        await localDb.invoice_items.bulkPut(data || [])
        continue
      }

      query = query.eq('shop_id', shopId)

      const { data, error } = await query
      if (error) throw error

      await localDb[table].bulkPut((data || []).filter((row) => !row.deleted_at))
    } catch (err) {
      console.warn('[sync pull failed]', table, err?.message)
    }
  }
}

export function startSyncListener(shopId) {
  if (typeof window === 'undefined') return () => {}

  const handleOnline = () => runSync(shopId)

  window.addEventListener('online', handleOnline)

  const interval = setInterval(() => {
    if (navigator.onLine) runSync(shopId)
  }, 30000)

  return () => {
    window.removeEventListener('online', handleOnline)
    clearInterval(interval)
  }
}