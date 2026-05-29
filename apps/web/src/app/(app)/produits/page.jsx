// apps/web/src/app/(app)/produits/page.jsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { v4 as uuid } from 'uuid'
import { toast } from 'sonner'
import { Package, Plus, Pencil, Trash2, AlertTriangle, Eye } from 'lucide-react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, isWithinInterval } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { getAll, localUpsert, localDelete } from '@/lib/db/local'
import { formatFCFA, formatNumber, calculateStock } from '@/lib/core/calculations'
import {
  PageHeader, SearchBar, Modal, FormField, EmptyState,
  ConfirmDialog, Btn, Badge, inputCls, StatCard
} from '@/components/ui'
import FrenchInput from '@/components/FrenchInput'

export default function ProduitsPage() {
  const shop = useAppStore(s => s.shop)
  const [products, setProducts] = useState([])
  const [purchases, setPurchases] = useState([])
  const [sales, setSales] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState('all')
  const [sortMode, setSortMode] = useState('alpha')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [productDetail, setProductDetail] = useState(null)
  const [periodFilter, setPeriodFilter] = useState('month')
  const [customDateStart, setCustomDateStart] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [customDateEnd, setCustomDateEnd] = useState(format(new Date(), 'yyyy-MM-dd'))

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm()

  async function load() {
    if (!shop?.id) return
    const [p, pu, s, sup] = await Promise.all([
      getAll('products', shop.id),
      getAll('purchases', shop.id),
      getAll('sales', shop.id),
      getAll('suppliers', shop.id),
    ])
    setProducts(p)
    setPurchases(pu)
    setSales(s)
    setSuppliers(sup)
    setLoading(false)
  }

  useEffect(() => { load() }, [shop?.id])

  function openAdd() { reset({}); setEditing(null); setModal(true) }
  function openEdit(p) {
    setEditing(p)
    reset({
      code: p.code,
      name: p.name,
      purchase_price: p.purchase_price,
      sale_price: p.sale_price,
      stock_initial: p.stock_initial,
      alert_threshold: p.alert_threshold,
      unit: p.unit
    })
    setModal(true)
  }

  async function onSubmit(data) {
    const record = {
      id: editing?.id || uuid(),
      shop_id: shop.id,
      code: data.code || '',
      name: data.name,
      purchase_price: Number(data.purchase_price) || 0,
      sale_price: data.sale_price ? Number(data.sale_price) : null,
      stock_initial: Number(data.stock_initial) || 0,
      alert_threshold: data.alert_threshold ? Number(data.alert_threshold) : null,
      supplier: editing?.supplier || '',
      unit: data.unit || 'Pièces',
      updated_at: new Date().toISOString(),
      created_at: editing?.created_at || new Date().toISOString(),
      sync_status: 'pending',
    }
    await localUpsert('products', record)
    toast.success(editing ? 'Produit mis à jour' : 'Produit ajouté')
    setModal(false)
    load()
  }

  async function handleDelete(id) {
    await localDelete('products', id)
    toast.success('Produit supprimé')
    load()
  }

  function getDateRange() {
    const today = new Date()
    switch (periodFilter) {
      case 'week':
        return { start: startOfWeek(today), end: endOfWeek(today) }
      case 'month':
        return { start: startOfMonth(today), end: endOfMonth(today) }
      case 'year':
        return { start: startOfYear(today), end: endOfYear(today) }
      case 'custom':
        return { start: parseISO(customDateStart), end: parseISO(customDateEnd) }
      default:
        return { start: new Date(1900, 0, 1), end: new Date(2100, 0, 1) }
    }
  }

  function getProductAnalytics(product) {
    const { start, end } = getDateRange()

    const inRange = (dateValue) => {
      if (!dateValue) return false
      const d = new Date(dateValue)
      if (Number.isNaN(d.getTime())) return false
      return isWithinInterval(d, { start, end })
    }

    const productSales = sales
      .filter(s =>
        s.product_id === product.id &&
        !s.cancelled_at &&
        inRange(s.date)
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    const productPurchases = purchases
      .filter(p =>
        p.product_id === product.id &&
        inRange(p.date)
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    const totalQtySold = productSales.reduce((sum, s) => sum + Number(s.quantity || 0), 0)
    const totalRevenue = productSales.reduce((sum, s) => sum + Number(s.total_sale || 0), 0)
    const totalCost = productSales.reduce((sum, s) => sum + Number(s.total_purchase_cost || 0), 0)
    const totalProfit = productSales.reduce((sum, s) => sum + Number(s.profit || 0), 0)
    const avgSalePrice = totalQtySold > 0 ? totalRevenue / totalQtySold : 0

    const totalQtyBought = productPurchases.reduce((sum, p) => sum + Number(p.quantity || 0), 0)
    const totalStockCost = productPurchases.reduce((sum, p) => {
      return sum + Number(p.quantity || 0) * Number(p.unit_price || 0)
    }, 0)
    const totalCharges = productPurchases.reduce((sum, p) => sum + Number(p.charge_total || 0), 0)
    const totalSpent = productPurchases.reduce((sum, p) => sum + Number(p.total_amount || 0), 0)
    const avgPurchasePrice = totalQtyBought > 0 ? totalStockCost / totalQtyBought : 0
    const avgRealCost = totalQtyBought > 0 ? totalSpent / totalQtyBought : 0

    const currentStock = calculateStock(product, purchases, sales)
    const stockValue = currentStock * Number(product.purchase_price || 0)
    const marginRate = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    return {
      totalQtySold,
      totalRevenue,
      totalCost,
      totalProfit,
      marginRate,
      avgSalePrice,

      totalQtyBought,
      totalStockCost,
      totalCharges,
      totalSpent,
      avgPurchasePrice,
      avgRealCost,

      currentStock,
      stockValue,

      productSales,
      productPurchases,
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()

    return products.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q) ||
      p.unit?.toLowerCase().includes(q)
    )
  }, [products, search])

  const withStock = useMemo(() =>
    filtered.map(p => {
      const bought = purchases
        .filter(pu => pu.product_id === p.id || pu.product_code === p.code)
        .reduce((sum, pu) => sum + Number(pu.quantity || 0), 0)

      const sold = sales
        .filter(s => (s.product_id === p.id || s.product_code === p.code) && !s.cancelled_at)
        .reduce((sum, s) => sum + Number(s.quantity || 0), 0)

      const currentStock = calculateStock(p, purchases, sales)
      const isLow = p.alert_threshold != null && currentStock <= p.alert_threshold
      const isUrgent = currentStock <= 0

      return {
        ...p,
        bought,
        sold,
        currentStock,
        stockValue: currentStock * Number(p.purchase_price || 0),
        isLow,
        isUrgent,
      }
    }), [filtered, purchases, sales])

  const displayedProducts = useMemo(() => {
    let list = [...withStock]

    if (stockFilter === 'low') list = list.filter(p => p.isLow)
    if (stockFilter === 'urgent') list = list.filter(p => p.isUrgent)
    if (stockFilter === 'ok') list = list.filter(p => !p.isLow && !p.isUrgent)

    return list.sort((a, b) => {
      const alpha = String(a.name || '').localeCompare(String(b.name || ''), 'fr', { sensitivity: 'base' })

      if (sortMode === 'alpha') return alpha
      if (sortMode === 'stock_desc') return Number(b.currentStock || 0) - Number(a.currentStock || 0) || alpha
      if (sortMode === 'stock_asc') return Number(a.currentStock || 0) - Number(b.currentStock || 0) || alpha
      if (sortMode === 'value_desc') return Number(b.stockValue || 0) - Number(a.stockValue || 0) || alpha
      if (sortMode === 'low_first') return Number(a.isLow ? 0 : 1) - Number(b.isLow ? 0 : 1) || alpha
      if (sortMode === 'sold_desc') return Number(b.sold || 0) - Number(a.sold || 0) || alpha

      return alpha
    })
  }, [withStock, stockFilter, sortMode])

  const lowStockCount = withStock.filter(p => p.alert_threshold != null && p.currentStock <= p.alert_threshold).length

  return (
    <div className="p-6">
      <PageHeader
        title="Produits"
        subtitle={`${products.length} produit${products.length !== 1 ? 's' : ''}`}
        action={<Btn icon={Plus} onClick={openAdd}>Nouveau produit</Btn>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total produits" value={products.length} icon={Package} color="blue" />
        <StatCard label="Alertes stock" value={lowStockCount} icon={AlertTriangle} color="amber" />
        <StatCard label="Valeur achat" value={formatFCFA(products.reduce((a, p) => a + (p.purchase_price || 0) * calculateStock(p, purchases, sales), 0))} color="purple" />
        <StatCard
          label="Stock total"
          value={formatNumber(withStock.reduce((sum, p) => sum + Number(p.currentStock || 0), 0))}
          color="green"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex-1 min-w-48 max-w-xs">
            <SearchBar value={search} onChange={setSearch} placeholder="Produit, code…" />
          </div>

          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[
              { key: 'all', label: 'Tout' },
              { key: 'urgent', label: 'Rupture' },
              { key: 'low', label: 'Stock bas' },
              { key: 'ok', label: 'OK' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStockFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${stockFilter === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-800'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-400 mb-1">
              Trier par
            </label>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              className={inputCls}
            >
              <option value="alpha">Nom A-Z</option>
              <option value="sold_desc">Les plus vendus</option>
              <option value="stock_desc">Stock le plus élevé</option>
              <option value="stock_asc">Stock le plus bas</option>
              <option value="low_first">Stock bas d’abord</option>
              <option value="value_desc">Valeur stock élevée</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Chargement…</div>
        ) : displayedProducts.length === 0 ? (
          <EmptyState icon={Package} title="Aucun produit"
            description="Commencez par ajouter vos produits au catalogue."
            action={<Btn icon={Plus} onClick={openAdd}>Ajouter un produit</Btn>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-zebra">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['ID / Code', 'Nom', 'Prix achat', 'Prix vente', 'Stock initial', 'Acheté', 'Vendu', 'Stock restant', 'Valeur stock', 'Alerte', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayedProducts.map(p => {
                  const low = p.alert_threshold != null && p.currentStock <= p.alert_threshold
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setProductDetail(p)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <p className="font-mono text-xs font-semibold text-gray-700">{p.code || '—'}</p>
                        <p className="font-mono text-[10px] text-gray-400 truncate max-w-[120px]" title={p.id}>
                          ID: {p.id}
                        </p>
                      </td>

                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <p className="font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.unit}</p>
                      </td>

                      <td className="px-4 py-3 font-medium text-gray-800">{formatFCFA(p.purchase_price)}</td>
                      <td className="px-4 py-3 text-gray-600">{p.sale_price ? formatFCFA(p.sale_price) : '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{formatNumber(p.stock_initial || 0)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatNumber(p.bought)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatNumber(p.sold)}</td>

                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <span className={`font-bold ${p.currentStock <= 0 ? 'text-red-600' : low ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {formatNumber(p.currentStock)}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-medium text-gray-800">
                        {formatFCFA(p.stockValue)}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {low
                          ? <Badge color="red">⚠ Bas</Badge>
                          : p.alert_threshold != null
                            ? <Badge color="green">OK</Badge>
                            : <span className="text-gray-300 text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => setProductDetail(p)}
                            className="p-1.5 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors"
                            title="Voir détails">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setConfirm(p.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? 'Modifier le produit' : 'Nouveau produit'} maxW="max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Code produit">
              <input {...register('code')} placeholder="Ex: HYF648" className={inputCls} />
            </FormField>
            <FormField label="Unité">
              <select {...register('unit')} className={inputCls}>
                <option>Pièces</option>
                <option>Mètre</option>
                <option>Litre</option>
                <option>Kg</option>
                <option>Lot</option>
              </select>
            </FormField>
          </div>

          <FormField label="Nom du produit" required error={errors.name?.message}>
            <input {...register('name', { required: 'Nom requis' })}
              placeholder="Ex: Onduleur Hybride Felicity 6Kva/48V" className={inputCls} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Prix d'achat (FCFA)">
              <Controller
                name="purchase_price"
                control={control}
                render={({ field }) => (
                  <FrenchInput
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="0"
                    className={inputCls}
                  />
                )}
              />
            </FormField>
            <FormField label="Prix de vente (FCFA)" hint="Optionnel">
              <Controller
                name="sale_price"
                control={control}
                render={({ field }) => (
                  <FrenchInput
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="0"
                    className={inputCls}
                  />
                )}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Stock initial">
              <Controller
                name="stock_initial"
                control={control}
                render={({ field }) => (
                  <FrenchInput
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="0"
                    className={inputCls}
                  />
                )}
              />
            </FormField>
            <FormField label="Seuil d'alerte" hint="Optionnel">
              <Controller
                name="alert_threshold"
                control={control}
                render={({ field }) => (
                  <FrenchInput
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="0"
                    className={inputCls}
                  />
                )}
              />
            </FormField>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="secondary" onClick={() => setModal(false)}>Annuler</Btn>
            <Btn type="submit">{editing ? 'Enregistrer' : 'Ajouter'}</Btn>
          </div>
        </form>
      </Modal>

      <Modal open={!!productDetail} onClose={() => setProductDetail(null)} title={productDetail?.name ? `Détails du produit: ${productDetail.name}` : 'Détails du produit'}>
        {productDetail && (() => {
          const analytics = getProductAnalytics(productDetail)
          const { start, end } = getDateRange()
          const periodLabel = periodFilter === 'custom' ? `du ${customDateStart} au ${customDateEnd}` : periodFilter === 'all' ? 'Tous les temps' : periodFilter === 'week' ? 'Cette semaine' : periodFilter === 'month' ? 'Ce mois-ci' : 'Cette année'

          return (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Code</p>
                  <p className="font-mono text-sm text-gray-800">{productDetail.code || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Unité</p>
                  <p className="text-sm text-gray-800">{productDetail.unit || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Prix d'achat</p>
                  <p className="text-sm text-gray-800">{formatFCFA(productDetail.purchase_price)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Prix de vente</p>
                  <p className="text-sm text-gray-800">{formatFCFA(productDetail.sale_price || 0)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Stock Initial</p>
                  <p className="text-sm text-gray-800">{productDetail.stock_initial}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Stock Actuel</p>
                  <p className="text-sm text-gray-800">{formatNumber(calculateStock(productDetail, purchases, sales))}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Seuil d'alerte</p>
                  <p className="text-sm text-gray-800">{productDetail.alert_threshold ?? '—'}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Période: {periodLabel}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <button onClick={() => setPeriodFilter('all')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${periodFilter === 'all' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    Tous les temps
                  </button>
                  <button onClick={() => setPeriodFilter('week')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${periodFilter === 'week' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    Cette semaine
                  </button>
                  <button onClick={() => setPeriodFilter('month')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${periodFilter === 'month' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    Ce mois
                  </button>
                  <button onClick={() => setPeriodFilter('year')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${periodFilter === 'year' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    Cette année
                  </button>
                  <button onClick={() => setPeriodFilter('custom')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${periodFilter === 'custom' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    Personnalisé
                  </button>
                </div>
                {periodFilter === 'custom' && (
                  <div className="flex gap-2 mb-4">
                    <input type="date" value={customDateStart} onChange={e => setCustomDateStart(e.target.value)}
                      className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
                    <input type="date" value={customDateEnd} onChange={e => setCustomDateEnd(e.target.value)}
                      className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Ventes</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-600">Qté vendue</p>
                      <p className="text-lg font-bold text-blue-900">{analytics.totalQtySold}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Revenu</p>
                      <p className="text-sm font-bold text-blue-900">{formatFCFA(analytics.totalRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Prix moyen</p>
                      <p className="text-sm font-bold text-blue-900">{formatFCFA(analytics.avgSalePrice)}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                  <p className="text-xs font-semibold text-orange-600 uppercase mb-2">Achats</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-600">Qté achetée</p>
                      <p className="text-lg font-bold text-orange-900">{analytics.totalQtyBought}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Dépensé</p>
                      <p className="text-sm font-bold text-orange-900">{formatFCFA(analytics.totalSpent)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Prix moyen</p>
                      <p className="text-sm font-bold text-orange-900">{formatFCFA(analytics.avgPurchasePrice)}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-xs font-semibold text-green-600 uppercase mb-2">Profit</p>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-green-900">{formatFCFA(analytics.totalProfit)}</p>
                    <p className="text-xs text-gray-600">Bénéfice brut sur la période</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-xs font-semibold text-slate-600 uppercase">Stock actuel</p>
                  <p className="text-lg font-bold text-slate-900">{formatNumber(analytics.currentStock)}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-xs font-semibold text-slate-600 uppercase">Valeur stock</p>
                  <p className="text-lg font-bold text-slate-900">{formatFCFA(analytics.stockValue)}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-xs font-semibold text-slate-600 uppercase">Charges achat</p>
                  <p className="text-lg font-bold text-slate-900">{formatFCFA(analytics.totalCharges)}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-xs font-semibold text-slate-600 uppercase">Marge</p>
                  <p className="text-lg font-bold text-slate-900">{analytics.marginRate.toFixed(1)}%</p>
                </div>
              </div>

              {analytics.productSales.length > 0 && (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <p className="text-xs font-semibold text-gray-700 bg-gray-50 px-4 py-2">Historique des ventes</p>
                  <table className="w-full text-xs table-zebra">
                    <thead>
                      <tr className="border-t border-gray-200 bg-gray-50">
                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Date</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-600">Quantité</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-600">Prix unitaire</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.productSales.map(s => (
                        <tr key={s.id} className="border-t border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-2">{format(parseISO(s.date), 'dd MMM yyyy', { locale: fr })}</td>
                          <td className="px-4 py-2 text-right">{s.quantity}</td>
                          <td className="px-4 py-2 text-right">{formatFCFA(s.unit_sale_price || 0)}</td>
                          <td className="px-4 py-2 text-right font-medium">{formatFCFA(s.total_sale || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {analytics.productPurchases.length > 0 && (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <p className="text-xs font-semibold text-gray-700 bg-gray-50 px-4 py-2">Historique des achats</p>
                  <table className="w-full text-xs table-zebra">
                    <thead>
                      <tr className="border-t border-gray-200 bg-gray-50">
                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Date</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Fournisseur</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-600">Quantité</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-600">Prix unitaire</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.productPurchases.map(p => {
                        const supplier = (suppliers || []).find(s => s.id === p.supplier_id)
                        return (
                          <tr key={p.id} className="border-t border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-2">{format(parseISO(p.date), 'dd MMM yyyy', { locale: fr })}</td>
                            <td className="px-4 py-2 text-sm">{supplier?.name || 'Inconnu'}</td>
                            <td className="px-4 py-2 text-right">{p.quantity}</td>
                            <td className="px-4 py-2 text-right">{formatFCFA(p.unit_price || 0)}</td>
                            <td className="px-4 py-2 text-right font-medium">{formatFCFA(p.total_amount || 0)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })()}
      </Modal>

      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => handleDelete(confirm)}
        title="Supprimer le produit"
        message="Cette action est irréversible. Les achats et ventes liés ne seront pas supprimés."
      />
    </div>
  )
}