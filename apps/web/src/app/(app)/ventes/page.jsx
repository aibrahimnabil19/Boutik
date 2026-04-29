// apps/web/src/app/(app)/ventes/page.jsx
'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { v4 as uuid } from 'uuid'
import { toast } from 'sonner'
import { TrendingUp, Plus, Trash2, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { getAll, localUpsert, localDelete } from '@/lib/db/local'
import { formatFCFA } from '@/lib/core/calculations'
import {
  PageHeader, SearchBar, Modal, FormField, EmptyState,
  ConfirmDialog, Btn, StatCard, inputCls, selectCls
} from '@/components/ui'

export default function VentesPage() {
  const shop = useAppStore(s => s.shop)
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [purchases, setPurchases] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [productId, setProductId] = useState('')
  const [unitCost, setUnitCost] = useState(0)
  const [clients, setClients] = useState([])
  const [items, setItems] = useState([
    { id: uuid(), product_id: '', quantity: 1, unit_sale_price: 0 }
  ])

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd'), quantity: 1, unit_sale_price: '' }
  })

  function addItem() {
    setItems((prev) => [...prev, { id: uuid(), product_id: '', quantity: 1, unit_sale_price: 0 }])
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((x) => x.id !== id))
  }

  function updateItem(id, patch) {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }

  function computeStock(product, purchases, sales) {
    const bought = purchases
      .filter((p) => p.product_id === product.id)
      .reduce((a, p) => a + Number(p.quantity || 0), 0)

    const sold = sales
      .filter((s) => s.product_id === product.id)
      .reduce((a, s) => a + Number(s.quantity || 0), 0)

    return Number(product.stock_initial || 0) + bought - sold
  }

  const qty = Number(watch('quantity') || 0)
  const price = Number(watch('unit_sale_price') || 0)
  const total = qty * price
  const profit = total - (qty * unitCost)

  const load = useCallback(async () => {
    if (!shop?.id) return
    const [s, p, pu, c] = await Promise.all([
      getAll('sales', shop.id),
      getAll('products', shop.id),
      getAll('purchases', shop.id),
      getAll('clients', shop.id),
    ])
    setClients(c)
    setSales(s.sort((a, b) => new Date(b.date) - new Date(a.date)))
    setProducts(p)
    setPurchases(a)
    setLoading(false)
  }, [shop?.id])

  useEffect(() => { load() }, [load])

  function handleProductChange(e) {
    const id = e.target.value
    setProductId(id)
    const prod = products.find(p => p.id === id)
    if (prod) {
      setUnitCost(prod.purchase_price || 0)
      if (prod.sale_price) setValue('unit_sale_price', prod.sale_price)
    }
  }

  async function onSubmit(data) {
    const saleBatchId = uuid()
    const now = new Date().toISOString()

    for (const item of items) {
      const prod = products.find((p) => p.id === item.product_id)
      const q = Number(item.quantity || 0)
      const price = Number(item.unit_sale_price || 0)

      if (!prod) {
        toast.error('Un article n’a pas de produit sélectionné')
        return
      }

      const currentStock = computeStock(prod, purchases, sales)
      if (q > currentStock) {
        toast.error(`Stock insuffisant pour ${prod.name}. Disponible : ${currentStock}`)
        return
      }
    }

    for (const item of items) {
      const prod = products.find((p) => p.id === item.product_id)
      const q = Number(item.quantity || 0)
      const price = Number(item.unit_sale_price || 0)
      const total = q * price
      const cost = Number(prod.purchase_price || 0)

      await localUpsert('sales', {
        id: uuid(),
        sale_batch_id: saleBatchId,
        shop_id: shop.id,
        date: data.date,
        store: data.store || '',
        product_id: prod.id,
        product_code: prod.code || '',
        product_name: prod.name,
        quantity: q,
        unit_sale_price: price,
        total_sale: total,
        unit_purchase_cost: cost,
        total_purchase_cost: q * cost,
        profit: total - q * cost,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
      })
    }

    toast.success('Vente enregistrée')
    setModal(false)
    load()
  }

  function openAdd() {
    reset({ date: format(new Date(), 'yyyy-MM-dd'), quantity: 1, unit_sale_price: '' })
    setProductId('')
    setUnitCost(0)
    setModal(true)
  }

  const filtered = useMemo(() =>
    sales.filter(s =>
      s.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.store?.toLowerCase().includes(search.toLowerCase())
    ), [sales, search])

  const totalRevenue = useMemo(() => sales.reduce((a, s) => a + (s.total_sale || 0), 0), [sales])
  const totalProfit = useMemo(() => sales.reduce((a, s) => a + (s.profit || 0), 0), [sales])

  return (
    <div className="p-6">
      <PageHeader
        title="Ventes"
        subtitle={`${sales.length} transaction${sales.length !== 1 ? 's' : ''}`}
        action={<Btn icon={Plus} onClick={openAdd}>Nouvelle vente</Btn>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Chiffre d'affaires total" value={formatFCFA(totalRevenue)} color="blue" icon={TrendingUp} />
        <StatCard label="Bénéfice total" value={formatFCFA(totalProfit)} color="green" icon={TrendingUp} />
        <StatCard label="Nombre de ventes" value={sales.length} color="purple" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex-1 max-w-xs">
            <SearchBar value={search} onChange={setSearch} placeholder="Rechercher…" />
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={TrendingUp} title="Aucune vente"
            description="Enregistrez vos premières ventes."
            action={<Btn icon={Plus} onClick={openAdd}>Nouvelle vente</Btn>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Date', 'Produit', 'Magasin', 'Qté', 'Prix unit.', 'Total', 'Coût', 'Bénéfice', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {format(new Date(s.date), 'dd MMM yy', { locale: fr })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 max-w-[220px] truncate">{s.product_name}</p>
                      {s.product_code && <p className="text-xs text-gray-400">{s.product_code}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{s.store || '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-700">{s.quantity}</td>
                    <td className="px-4 py-3 text-gray-600">{formatFCFA(s.unit_sale_price)}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatFCFA(s.total_sale)}</td>
                    <td className="px-4 py-3 text-gray-400">{formatFCFA(s.total_purchase_cost)}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">+{formatFCFA(s.profit)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setConfirm(s.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Sale Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nouvelle vente" maxW="max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" required>
              <input {...register('date', { required: true })} type="date" className={inputCls} />
            </FormField>
            <FormField label="Magasin / Point de vente">
              <input {...register('store')} placeholder="Ex: Dar es salam" className={inputCls} />
            </FormField>
          </div>

          <FormField label="Produit (catalogue)">
            <select value={productId} onChange={handleProductChange} className={selectCls}>
              <option value="">— Sélectionner un produit —</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ''}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Client">
            <select {...register('client_name')} className={selectCls}>
              <option value="">— Choisir un client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Désignation" required error={errors.product_name?.message}
            hint="Modifiez si différent du catalogue">
            <input {...register('product_name', { required: 'Désignation requise' })}
              placeholder="Nom exact du produit vendu" className={inputCls} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Quantité" required>
              <input {...register('quantity', { required: true, min: 0.001 })}
                type="number" step="0.001" min="0.001" className={inputCls} />
            </FormField>
            <FormField label="Prix de vente unitaire (FCFA)" required>
              <input {...register('unit_sale_price', { required: true, min: 0 })}
                type="number" min="0" placeholder="0" className={inputCls} />
            </FormField>
          </div>

          {/* Live preview */}
          {total > 0 && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-gray-400">Total vente</p>
                <p className="font-bold text-gray-900 text-sm">{formatFCFA(total)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Coût total</p>
                <p className="font-bold text-gray-600 text-sm">{formatFCFA(qty * unitCost)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Bénéfice</p>
                <p className={`font-bold text-sm ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {profit >= 0 ? '+' : ''}{formatFCFA(profit)}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="secondary" onClick={() => setModal(false)}>Annuler</Btn>
            <Btn type="submit">Enregistrer</Btn>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => { localDelete('sales', confirm); load(); toast.success('Vente supprimée') }}
        title="Supprimer la vente" message="Êtes-vous sûr de vouloir supprimer cette vente ?" />
    </div>
  )
}