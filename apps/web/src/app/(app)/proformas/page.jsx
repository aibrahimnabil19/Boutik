'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileText, Plus, Printer, Trash2, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { localDb, getAll, localDelete, localUpsert } from '@/lib/db/local'
import { formatFCFA } from '@/lib/core/calculations'
import { PageHeader, SearchBar, EmptyState, ConfirmDialog, Btn, Badge, StatCard } from '@/components/ui'
import { v4 as uuid } from 'uuid'

export default function ProformasPage() {
  const router = useRouter()
  const shop = useAppStore(s => s.shop)
  const [invoices, setInvoices] = useState([])
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!shop?.id) return
    const inv = await getAll('invoices', shop.id)
    setInvoices(inv.filter(i => i.type === 'proforma').sort((a, b) => new Date(b.date) - new Date(a.date)))
    setLoading(false)
  }, [shop?.id])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() =>
    invoices.filter(i =>
      i.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      i.client_name?.toLowerCase().includes(search.toLowerCase())
    ), [invoices, search])

  async function handleDelete(id) {
    try {
      const items = await localDb.invoice_items.where('invoice_id').equals(id).toArray()

      for (const item of items) {
        await localDelete('invoice_items', item.id)
      }

      await localDelete('invoices', id)

      toast.success('Proforma supprimé')
      await load()
    } catch (err) {
      toast.error('Suppression impossible')
    }
  }

  async function handleConvertToSale(inv) {
    try {
      // Load proforma items
      const items = await localDb.invoice_items
        .where('invoice_id').equals(inv.id)
        .toArray()

      if (!items.length) {
        toast.error('Ce proforma ne contient aucun article')
        return
      }

      const products = await getAll('products', shop.id)
      const sessionId = uuid()
      const now = new Date().toISOString()

      for (const item of items) {
        const prod = products.find(p => p.name === item.designation)
        await localUpsert('sales', {
          id: uuid(),
          shop_id: shop.id,
          session_id: sessionId,
          date: inv.date,
          store: '',
          client_name: inv.client_name || '',
          product_id: prod?.id || null,
          product_code: prod?.code || '',
          product_name: item.designation,
          quantity: item.quantity,
          unit_sale_price: item.unit_price,
          total_sale: item.total_price,
          unit_purchase_cost: prod?.purchase_price || 0,
          total_purchase_cost: (prod?.purchase_price || 0) * item.quantity,
          profit: item.total_price - (prod?.purchase_price || 0) * item.quantity,
          created_at: now,
          updated_at: now,
          sync_status: 'pending',
        })
      }

      // Mark proforma as converted
      await localUpsert('invoices', {
        ...inv,
        status: 'converted',
        updated_at: now,
      })

      toast.success('Proforma converti en vente réelle !')
      load()
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la conversion')
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Proformas"
        subtitle={`${invoices.length} proforma${invoices.length !== 1 ? 's' : ''}`}
        action={<Btn icon={Plus} onClick={() => router.push('/proformas/nouvelle')}>Nouveau proforma</Btn>}
      />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard label="Total proformas" value={invoices.length} color="purple" icon={FileText} />
        <StatCard label="Valeur totale" value={formatFCFA(invoices.reduce((a, i) => a + (i.total_amount || 0), 0))} color="blue" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex-1 max-w-xs">
            <SearchBar value={search} onChange={setSearch} placeholder="N° ou client…" />
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={FileText} title="Aucun proforma"
            action={<Btn icon={Plus} onClick={() => router.push('/proformas/nouvelle')}>Nouveau proforma</Btn>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['N° Proforma', 'Date', 'Client', 'Montant', 'Statut', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-purple-600">{inv.invoice_number}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {format(new Date(inv.date), 'dd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{inv.client_name || '—'}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatFCFA(inv.total_amount)}</td>
                    {inv.status === 'converted' && (
                      <td className="px-4 py-3"><Badge color="green">Converti</Badge></td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {inv.status !== 'converted' && (
                          <button
                            onClick={() => handleConvertToSale(inv)}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                            title="Convertir en vente réelle"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => router.push(`/proformas/nouvelle?id=${inv.id}`)}
                          className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors">
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirm(inv.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => handleDelete(confirm)}
        title="Supprimer le proforma" message="Le proforma sera définitivement supprimé." />
    </div>
  )
}