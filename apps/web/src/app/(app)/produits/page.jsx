// apps/web/src/app/(app)/produits/page.jsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { v4 as uuid } from 'uuid'
import { toast } from 'sonner'
import { Package, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
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
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState('all')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [loading, setLoading] = useState(true)

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm()

  async function load() {
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
    let list = withStock

    if (stockFilter === 'low') list = list.filter(p => p.isLow)
    if (stockFilter === 'urgent') list = list.filter(p => p.isUrgent)
    if (stockFilter === 'ok') list = list.filter(p => !p.isLow && !p.isUrgent)

    return list
  }, [withStock, stockFilter])

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
            <table className="w-full text-sm">
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
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs font-semibold text-gray-700">{p.code || '—'}</p>
                        <p className="font-mono text-[10px] text-gray-400 truncate max-w-[120px]" title={p.id}>
                          ID: {p.id}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.unit}</p>
                      </td>

                      <td className="px-4 py-3 font-medium text-gray-800">{formatFCFA(p.purchase_price)}</td>
                      <td className="px-4 py-3 text-gray-600">{p.sale_price ? formatFCFA(p.sale_price) : '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{formatNumber(p.stock_initial || 0)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatNumber(p.bought)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatNumber(p.sold)}</td>

                      <td className="px-4 py-3">
                        <span className={`font-bold ${p.currentStock <= 0 ? 'text-red-600' : low ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {formatNumber(p.currentStock)}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-medium text-gray-800">
                        {formatFCFA(p.stockValue)}
                      </td>
                      <td className="px-4 py-3">
                        {low
                          ? <Badge color="red">⚠ Bas</Badge>
                          : p.alert_threshold != null
                            ? <Badge color="green">OK</Badge>
                            : <span className="text-gray-300 text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
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

      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => handleDelete(confirm)}
        title="Supprimer le produit"
        message="Cette action est irréversible. Les achats et ventes liés ne seront pas supprimés."
      />
    </div>
  )
}