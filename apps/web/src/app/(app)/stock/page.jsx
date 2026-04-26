// apps/web/src/app/(app)/stock/page.jsx
// Stock Intelligent: computed stock per product, alerts, value.
'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Package, AlertTriangle, TrendingDown, DollarSign, Search } from 'lucide-react'
import { useAppStore } from '@/context/store'
import { getAll } from '@/lib/db/local'
import { formatFCFA, calculateStock } from '@/lib/core/calculations'
import { PageHeader, SearchBar, StatCard, Badge } from '@/components/ui'

export default function StockPage() {
  const shop = useAppStore(s => s.shop)
  const [products, setProducts] = useState([])
  const [purchases, setPurchases] = useState([])
  const [sales, setSales] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | low | ok
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!shop?.id) return
    const [p, pu, s] = await Promise.all([
      getAll('products', shop.id),
      getAll('purchases', shop.id),
      getAll('sales', shop.id),
    ])
    setProducts(p)
    setPurchases(pu)
    setSales(s)
    setLoading(false)
  }, [shop?.id])

  useEffect(() => { load() }, [load])

  const withStock = useMemo(() =>
    products.map(p => {
      const stock = calculateStock(p, purchases, sales)
      const isLow = p.alert_threshold != null && stock <= p.alert_threshold
      const isUrgent = p.alert_threshold != null && stock <= 0
      return { ...p, currentStock: stock, isLow, isUrgent }
    }), [products, purchases, sales])

  const filtered = useMemo(() => {
    let list = withStock.filter(p =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier?.toLowerCase().includes(search.toLowerCase())
    )
    if (filter === 'low') list = list.filter(p => p.isLow)
    if (filter === 'ok') list = list.filter(p => !p.isLow)
    return list.sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1
      if (!a.isUrgent && b.isUrgent) return 1
      if (a.isLow && !b.isLow) return -1
      if (!a.isLow && b.isLow) return 1
      return a.name?.localeCompare(b.name)
    })
  }, [withStock, search, filter])

  const totalValue = useMemo(() =>
    withStock.reduce((s, p) => s + (p.currentStock * (p.purchase_price || 0)), 0), [withStock])
  const lowCount = useMemo(() => withStock.filter(p => p.isLow).length, [withStock])
  const urgentCount = useMemo(() => withStock.filter(p => p.isUrgent).length, [withStock])

  return (
    <div className="p-6">
      <PageHeader
        title="Stock Intelligent"
        subtitle={`${products.length} produit${products.length !== 1 ? 's' : ''} · mis à jour en temps réel`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Produits total" value={products.length} icon={Package} color="blue" />
        <StatCard label="Alertes stock" value={lowCount} icon={AlertTriangle} color="amber" />
        <StatCard label="Commande urgente" value={urgentCount} icon={TrendingDown} color="red" />
        <StatCard label="Valeur totale stock" value={formatFCFA(totalValue)} icon={DollarSign} color="green" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex-1 min-w-48 max-w-xs">
            <SearchBar value={search} onChange={setSearch} placeholder="Produit, code, fournisseur…" />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[
              { key: 'all', label: 'Tout' },
              { key: 'low', label: `⚠ Alertes (${lowCount})` },
              { key: 'ok', label: 'OK' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-800'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Calcul du stock…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Aucun produit trouvé</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Code','Produit','Fournisseur','Stock init.','Achats','Ventes','Stock dispo','Seuil','Valeur stock','Statut'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => {
                  const bought = purchases
                    .filter(pu => pu.product_id === p.id || pu.product_code === p.code)
                    .reduce((s, pu) => s + (pu.quantity || 0), 0)
                  const sold = sales
                    .filter(s => s.product_id === p.id || s.product_code === p.code)
                    .reduce((s2, s) => s2 + (s.quantity || 0), 0)

                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${p.isUrgent ? 'bg-red-50/30' : p.isLow ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.code || '—'}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 max-w-[200px] truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.unit}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{p.supplier || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{p.stock_initial || 0}</td>
                      <td className="px-4 py-3 text-blue-600 font-medium">+{bought}</td>
                      <td className="px-4 py-3 text-red-500 font-medium">-{sold}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold text-base ${
                          p.isUrgent ? 'text-red-600' :
                          p.isLow ? 'text-amber-600' :
                          'text-emerald-600'
                        }`}>
                          {p.currentStock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{p.alert_threshold ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-gray-700">
                        {formatFCFA(p.currentStock * (p.purchase_price || 0))}
                      </td>
                      <td className="px-4 py-3">
                        {p.isUrgent ? (
                          <Badge color="red">⚠ URGENT</Badge>
                        ) : p.isLow ? (
                          <Badge color="amber">⚠ Bas</Badge>
                        ) : (
                          <Badge color="green">OK</Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={8} className="px-4 py-3 font-semibold text-gray-700">Valeur totale du stock</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{formatFCFA(totalValue)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}