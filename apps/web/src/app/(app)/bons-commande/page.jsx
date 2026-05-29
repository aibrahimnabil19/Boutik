'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { ShoppingBag, Printer, Search } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { getAll } from '@/lib/db/local'
import { formatFCFA } from '@/lib/core/calculations'
import { printPurchaseDocument } from '@/lib/core/invoicePrint'
import DocumentPrintOptions, { getDefaultDocumentOptions } from '@/components/DocumentPrintOptions'
import {
  PageHeader,
  SearchBar,
  EmptyState,
  Btn,
  StatCard,
  Badge,
} from '@/components/ui'

export default function BonsCommandePage() {
  const shop = useAppStore(s => s.shop)
  const [purchases, setPurchases] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [printOptions, setPrintOptions] = useState(getDefaultDocumentOptions(shop))

  const load = useCallback(async () => {
    if (!shop?.id) return

    const rows = await getAll('purchases', shop.id)
    setPurchases(rows.sort((a, b) => new Date(b.date) - new Date(a.date)))
    setLoading(false)
  }, [shop?.id])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()

    return purchases.filter(p =>
      p.supplier?.toLowerCase().includes(q) ||
      p.product_name?.toLowerCase().includes(q) ||
      p.product_code?.toLowerCase().includes(q)
    )
  }, [purchases, search])

  function handlePrint(purchase) {
    printPurchaseDocument({
      shop,
      type: 'bon_commande',
      purchase,
      invoiceNumber: `BC-${String(purchase.date).replaceAll('-', '')}-${String(purchase.id).slice(0, 4).toUpperCase()}`,
      includeCachet: printOptions.includeCachet,
      includeSignature: printOptions.includeSignature,
    })
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Bons de commande"
        subtitle={`${purchases.length} achat${purchases.length !== 1 ? 's' : ''} disponible${purchases.length !== 1 ? 's' : ''}`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Achats disponibles" value={purchases.length} color="blue" icon={ShoppingBag} />
        <StatCard
          label="Montant total"
          value={formatFCFA(purchases.reduce((sum, p) => sum + Number(p.total_amount || 0), 0))}
          color="purple"
        />
        <StatCard
          label="Fournisseurs"
          value={new Set(purchases.map(p => p.supplier).filter(Boolean)).size}
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
            <SearchBar value={search} onChange={setSearch} placeholder="Fournisseur, produit…" />
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Aucun achat trouvé"
            description="Les bons de commande se génèrent à partir des achats enregistrés."
          />
        ) : (
          <div className="divide-y divide-gray-50 zebra-list">
            {filtered.map(purchase => (
              <div key={purchase.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-none">
                    <ShoppingBag className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">
                        {purchase.supplier || 'Fournisseur non renseigné'}
                      </p>
                      {purchase.payment_status === 'credit' && (
                        <Badge color="amber">Crédit</Badge>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(purchase.date), 'dd MMM yyyy', { locale: fr })}
                    </p>

                    <div className="mt-2 text-sm text-gray-600">
                      {purchase.product_name || '—'}
                      {purchase.product_code ? ` · ${purchase.product_code}` : ''}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatFCFA(purchase.total_amount || 0)}</p>
                    <Btn
                      size="sm"
                      variant="secondary"
                      icon={Printer}
                      onClick={() => handlePrint(purchase)}
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