// apps/web/src/app/(app)/factures/page.jsx
'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Receipt, Plus, Printer, Eye, Trash2, FileCheck, FileClock } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { localDb, getAll, localUpsert } from '@/lib/db/local'
import { formatFCFA, amountToWordsFCFA, generateInvoiceNumber } from '@/lib/core/calculations'
import { v4 as uuid } from 'uuid'
import { PageHeader, SearchBar, EmptyState, ConfirmDialog, Btn, Badge, StatCard, Modal } from '@/components/ui'
import FrenchInput from '@/components/FrenchInput'
import DocumentPrintOptions, { getDefaultDocumentOptions } from '@/components/DocumentPrintOptions'
import GuaranteePicker from '@/components/GuaranteePicker'
import { GUARANTEE_OPTIONS } from '@/lib/core/guarantees'

export default function FacturesPage() {
  const router = useRouter()
  const shop = useAppStore(s => s.shop)
  const [invoices, setInvoices] = useState([])
  const [sales, setSales] = useState([])
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingSale, setPendingSale] = useState(null)
  const [docOptions, setDocOptions] = useState({
    ...getDefaultDocumentOptions(shop),
    guaranteeKey: GUARANTEE_OPTIONS[0].key,
    guaranteeText: GUARANTEE_OPTIONS[0].text,
  })

  const load = useCallback(async () => {
    if (!shop?.id) return
    const [inv, saleRows] = await Promise.all([
      getAll('invoices', shop.id),
      getAll('sales', shop.id),
    ])

    setInvoices(inv.filter(i => i.type === 'facture').sort((a, b) => new Date(b.date) - new Date(a.date)))
    setSales(saleRows.filter(s => !s.cancelled_at).sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date)))
    setLoading(false)
  }, [shop?.id])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() =>
    invoices.filter(i =>
      i.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      i.client_name?.toLowerCase().includes(search.toLowerCase())
    ), [invoices, search])

  const totalRevenue = useMemo(() => invoices.reduce((a, i) => a + (i.total_amount || 0), 0), [invoices])

  const saleGroups = useMemo(() => {
    const groups = {}

    for (const s of sales) {
      const key = s.session_id || s.sale_batch_id || s.id

      if (!groups[key]) {
        groups[key] = {
          key,
          date: s.date,
          created_at: s.created_at,
          client_name: s.client_name || '',
          client_phone: s.client_phone || '',
          items: [],
        }
      }

      groups[key].items.push(s)
    }

    return Object.values(groups).sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))
  }, [sales])

  async function createFactureFromSale(group, options = docOptions) {
    const now = new Date().toISOString()
    const invoiceId = uuid()
    const total = group.items.reduce((sum, item) => sum + Number(item.total_sale || 0), 0)

    const invoiceNumber = generateInvoiceNumber(invoices, 'facture', group.date)

    await localUpsert('invoices', {
      id: invoiceId,
      shop_id: shop.id,
      invoice_number: invoiceNumber,
      type: 'facture',
      client_name: group.client_name || '',
      client_phone: group.client_phone || '',
      client_address: '',
      date: group.date,
      city: shop?.city || 'Niamey',
      total_amount: total,
      amount_in_words: amountToWordsFCFA(total, 'facture'),
      guarantee_text: options.guaranteeText || '',
      include_cachet: !!options.includeCachet,
      include_signature: !!options.includeSignature,
      status: 'draft',
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
    })

    for (let i = 0; i < group.items.length; i++) {
      const item = group.items[i]

      await localUpsert('invoice_items', {
        id: uuid(),
        invoice_id: invoiceId,
        shop_id: shop.id,
        designation: item.product_name,
        quantity: Number(item.quantity || 0),
        unit: 'Pièces',
        unit_price: Number(item.unit_sale_price || 0),
        total_price: Number(item.total_sale || 0),
        sort_order: i,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
      })
    }

    toast.success('Facture créée depuis la vente')
    router.push(
      `/factures/nouvelle?id=${invoiceId}&cachet=${options.includeCachet ? '1' : '0'}&signature=${options.includeSignature ? '1' : '0'}`
    )
  }

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

  function openCreateFactureOptions(group) {
    setPendingSale(group)
    setDocOptions({
      ...getDefaultDocumentOptions(shop),
      guaranteeKey: GUARANTEE_OPTIONS[0].key,
      guaranteeText: GUARANTEE_OPTIONS[0].text,
    })
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
        <StatCard label="Brouillons" value={invoices.filter(i => i.status === 'draft').length} color="amber" />
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
            <table className="w-full text-sm table-zebra">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['N° Facture', 'Date', 'Client', 'Montant', 'Statut', ''].map(h => (
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

      <div className="card overflow-hidden mt-6">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Ventes disponibles pour facture</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Choisissez une vente existante pour générer une facture définitive.
            </p>
          </div>
        </div>

        {saleGroups.length === 0 ? (
          <div className="p-6 text-sm text-gray-400">Aucune vente disponible.</div>
        ) : (
          <div className="divide-y divide-gray-50 zebra-list">
            {saleGroups.map(group => {
              const total = group.items.reduce((sum, item) => sum + Number(item.total_sale || 0), 0)

              return (
                <div key={group.key} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {group.client_name || 'Client non renseigné'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(group.date), 'dd MMM yyyy', { locale: fr })}
                      {group.created_at ? ` · ${format(new Date(group.created_at), 'HH:mm', { locale: fr })}` : ''}
                      {' · '}
                      {group.items.length} ligne{group.items.length > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {group.items.map(i => i.product_name).filter(Boolean).join(', ')}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatFCFA(total)}</p>
                    <Btn size="sm" icon={Plus} onClick={() => openCreateFactureOptions(group)} className="mt-2">
                      Créer facture
                    </Btn>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        open={!!pendingSale}
        onClose={() => setPendingSale(null)}
        title="Options de la facture"
        maxW="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Choisissez les éléments à inclure avant de créer la facture.
          </p>

          <DocumentPrintOptions
            shop={shop}
            value={docOptions}
            onChange={setDocOptions}
          />

          <GuaranteePicker
            value={{
              key: docOptions.guaranteeKey,
              text: docOptions.guaranteeText,
            }}
            onChange={(next) =>
              setDocOptions(prev => ({
                ...prev,
                guaranteeKey: next.key,
                guaranteeText: next.text,
              }))
            }
          />

          <div className="flex gap-3 justify-end">
            <Btn variant="secondary" onClick={() => setPendingSale(null)}>
              Annuler
            </Btn>
            <Btn
              icon={Plus}
              onClick={async () => {
                await createFactureFromSale(pendingSale, docOptions)
                setPendingSale(null)
              }}
            >
              Créer facture
            </Btn>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => { handleDelete(confirm) }}
        title="Supprimer la facture" message="La facture et ses lignes seront définitivement supprimées." />
    </div>
  )
}