// apps/web/src/app/(app)/factures/page.jsx
'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Receipt, Plus, Printer, Eye, Trash2, FileCheck, FileClock } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { localDb, getAll } from '@/lib/db/local'
import { formatFCFA } from '@/lib/core/calculations'
import { PageHeader, SearchBar, EmptyState, ConfirmDialog, Btn, Badge, StatCard } from '@/components/ui'
import FrenchInput from '@/components/FrenchInput'

export default function FacturesPage() {
  const router = useRouter()
  const shop   = useAppStore(s => s.shop)
  const [invoices, setInvoices] = useState([])
  const [search, setSearch]     = useState('')
  const [confirm, setConfirm]   = useState(null)
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    if (!shop?.id) return
    const inv = await getAll('invoices', shop.id)
    setInvoices(inv.filter(i => i.type === 'facture').sort((a, b) => new Date(b.date) - new Date(a.date)))
    setLoading(false)
  }, [shop?.id])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() =>
    invoices.filter(i =>
      i.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      i.client_name?.toLowerCase().includes(search.toLowerCase())
    ), [invoices, search])

  const totalRevenue = useMemo(() => invoices.reduce((a, i) => a + (i.total_amount || 0), 0), [invoices])

  async function handleDelete(id) {
    await localDb.invoice_items.where('invoice_id').equals(id).delete()
    await localDb.invoices.delete(id)
    toast.success('Facture supprimée')
    load()
  }

  function getStatusBadge(status) {
    return status === 'finalized'
      ? <Badge color="green">Finalisée</Badge>
      : status === 'cancelled'
      ? <Badge color="red">Annulée</Badge>
      : <Badge color="amber">Brouillon</Badge>
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Factures"
        subtitle={`${invoices.length} facture${invoices.length !== 1 ? 's' : ''}`}
        action={<Btn icon={Plus} onClick={() => router.push('/factures/nouvelle')}>Nouvelle facture</Btn>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Chiffre d'affaires factures" value={formatFCFA(totalRevenue)} color="blue" icon={Receipt} />
        <StatCard label="Finalisées" value={invoices.filter(i => i.status === 'finalized').length} color="green" />
        <StatCard label="Brouillons"  value={invoices.filter(i => i.status === 'draft').length}     color="amber" />
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
          <EmptyState icon={Receipt} title="Aucune facture"
            description="Créez votre première facture de vente."
            action={<Btn icon={Plus} onClick={() => router.push('/factures/nouvelle')}>Nouvelle facture</Btn>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['N° Facture','Date','Client','Montant','Statut',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-blue-600">
                        {inv.invoice_number}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {format(new Date(inv.date), 'dd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{inv.client_name || '—'}</p>
                      {inv.client_phone && <p className="text-xs text-gray-400">{inv.client_phone}</p>}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatFCFA(inv.total_amount)}</td>
                    <td className="px-4 py-3">{getStatusBadge(inv.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => router.push(`/factures/nouvelle?id=${inv.id}`)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Voir / Imprimer"
                        >
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
        onConfirm={() => { handleDelete(confirm) }}
        title="Supprimer la facture" message="La facture et ses lignes seront définitivement supprimées." />
    </div>
  )
}