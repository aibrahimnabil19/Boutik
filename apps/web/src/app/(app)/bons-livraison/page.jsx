'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Truck, Printer, Search } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { getAll } from '@/lib/db/local'
import { formatFCFA } from '@/lib/core/calculations'
import { printSaleDocument } from '@/lib/core/invoicePrint'
import DocumentPrintOptions, { getDefaultDocumentOptions } from '@/components/DocumentPrintOptions'
import {
  PageHeader,
  SearchBar,
  EmptyState,
  Btn,
  StatCard,
  Badge,
} from '@/components/ui'

export default function BonsLivraisonPage() {
  const shop = useAppStore(s => s.shop)
  const [sales, setSales] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [printOptions, setPrintOptions] = useState(getDefaultDocumentOptions(shop))

  const load = useCallback(async () => {
    if (!shop?.id) return

    const rows = await getAll('sales', shop.id)
    setSales(rows.filter(s => !s.cancelled_at).sort((a, b) => new Date(b.date) - new Date(a.date)))
    setLoading(false)
  }, [shop?.id])

  useEffect(() => { load() }, [load])

  const saleGroups = useMemo(() => {
    const groups = {}

    for (const s of sales) {
      const key = s.session_id || s.sale_batch_id || s.id

      if (!groups[key]) {
        groups[key] = {
          key,
          date: s.date,
          store: s.store || '',
          client_name: s.client_name || '',
          items: [],
        }
      }

      groups[key].items.push(s)
    }

    return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [sales])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()

    return saleGroups.filter(g =>
      g.client_name?.toLowerCase().includes(q) ||
      g.store?.toLowerCase().includes(q) ||
      g.items.some(i => i.product_name?.toLowerCase().includes(q))
    )
  }, [saleGroups, search])

  function groupTotal(group) {
    return group.items.reduce((sum, item) => sum + Number(item.total_sale || 0), 0)
  }

  function handlePrint(group) {
    printSaleDocument({
      shop,
      type: 'bon_livraison',
      saleGroup: group,
      invoiceNumber: `BL-${String(group.date).replaceAll('-', '')}-${String(group.key).slice(0, 4).toUpperCase()}`,
      includeCachet: printOptions.includeCachet,
      includeSignature: printOptions.includeSignature,
    })
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Bons de livraison"
        subtitle={`${saleGroups.length} vente${saleGroups.length !== 1 ? 's' : ''} disponible${saleGroups.length !== 1 ? 's' : ''}`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Ventes disponibles" value={saleGroups.length} color="blue" icon={Truck} />
        <StatCard
          label="Montant total"
          value={formatFCFA(saleGroups.reduce((sum, g) => sum + groupTotal(g), 0))}
          color="green"
        />
        <StatCard
          label="Articles"
          value={saleGroups.reduce((sum, g) => sum + g.items.length, 0)}
          color="amber"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <DocumentPrintOptions
            shop={shop}
            value={printOptions}
            onChange={setPrintOptions}
          />
          <div className="flex-1 max-w-xs">
            <SearchBar value={search} onChange={setSearch} placeholder="Client, produit, magasin…" />
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Aucune vente trouvée"
            description="Les bons de livraison se génèrent à partir des ventes enregistrées."
          />
        ) : (
          <div className="divide-y divide-gray-50 zebra-list">
            {filtered.map(group => (
              <div key={group.key} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-none">
                    <Truck className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">
                        {group.client_name || 'Client non renseigné'}
                      </p>
                      <Badge color="blue">{group.items.length} ligne{group.items.length > 1 ? 's' : ''}</Badge>
                    </div>

                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(group.date), 'dd MMM yyyy', { locale: fr })}
                      {group.store ? ` · ${group.store}` : ''}
                    </p>

                    <div className="mt-2 text-sm text-gray-600">
                      {group.items.map(item => item.product_name).filter(Boolean).join(', ')}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatFCFA(groupTotal(group))}</p>
                    <Btn
                      size="sm"
                      variant="secondary"
                      icon={Printer}
                      onClick={() => handlePrint(group)}
                      className="mt-2"
                    >
                      Imprimer
                    </Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}