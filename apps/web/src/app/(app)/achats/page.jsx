// apps/web/src/app/(app)/achats/page.jsx
'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { v4 as uuid } from 'uuid'
import { toast } from 'sonner'
import { ShoppingCart, Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { getAll, localUpsert, localDelete } from '@/lib/db/local'
import { formatFCFA } from '@/lib/core/calculations'
import {
  PageHeader, SearchBar, Modal, FormField, EmptyState,
  ConfirmDialog, Btn, StatCard, inputCls, selectCls
} from '@/components/ui'

export default function AchatsPage() {
  const shop = useAppStore(s => s.shop)
  const [purchases, setPurchases] = useState([])
  const [products, setProducts]   = useState([])
  const [search, setSearch]       = useState('')
  const [modal, setModal]         = useState(false)
  const [confirm, setConfirm]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [selectedProduct, setSelectedProduct] = useState(null)

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd'), quantity: 1 }
  })

  const qty   = Number(watch('quantity') || 0)
  const price = Number(watch('unit_price') || 0)
  const total = qty * price

  const load = useCallback(async () => {
    if (!shop?.id) return
    const [p, pr] = await Promise.all([getAll('purchases', shop.id), getAll('products', shop.id)])
    setPurchases(p.sort((a, b) => new Date(b.date) - new Date(a.date)))
    setProducts(pr)
    setLoading(false)
  }, [shop?.id])

  useEffect(() => { load() }, [load])

  function handleProductSelect(e) {
    const prod = products.find(p => p.id === e.target.value)
    setSelectedProduct(prod || null)
    if (prod) {
      setValue('product_name', prod.name)
      setValue('unit_price', prod.purchase_price || '')
      setValue('supplier', prod.supplier || '')
    }
  }

  async function onSubmit(data) {
    const q = Number(data.quantity)
    const up = Number(data.unit_price)
    const record = {
      id:           uuid(),
      shop_id:      shop.id,
      date:         data.date,
      supplier:     data.supplier || '',
      product_id:   selectedProduct?.id || null,
      product_code: selectedProduct?.code || '',
      product_name: data.product_name,
      quantity:     q,
      unit_price:   up,
      total_amount: q * up,
      notes:        data.notes || '',
      created_at:   new Date().toISOString(),
      updated_at:   new Date().toISOString(),
      sync_status:  'pending',
    }
    await localUpsert('purchases', record)
    toast.success('Achat enregistré')
    setModal(false)
    load()
  }

  function openAdd() {
    reset({ date: format(new Date(), 'yyyy-MM-dd'), quantity: 1 })
    setSelectedProduct(null)
    setModal(true)
  }

  const filtered = useMemo(() =>
    purchases.filter(p =>
      p.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier?.toLowerCase().includes(search.toLowerCase())
    ), [purchases, search])

  const totalSpent = useMemo(() => purchases.reduce((a, p) => a + (p.total_amount || 0), 0), [purchases])

  return (
    <div className="p-6">
      <PageHeader
        title="Achats"
        subtitle={`${purchases.length} achat${purchases.length !== 1 ? 's' : ''}`}
        action={<Btn icon={Plus} onClick={openAdd}>Nouvel achat</Btn>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total dépensé" value={formatFCFA(totalSpent)} color="purple" icon={ShoppingCart} />
        <StatCard label="Nombre d'achats" value={purchases.length} color="blue" />
        <StatCard label="Fournisseurs distincts"
          value={new Set(purchases.map(p=>p.supplier).filter(Boolean)).size} color="amber" />
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
          <EmptyState icon={ShoppingCart} title="Aucun achat"
            description="Enregistrez vos achats fournisseurs."
            action={<Btn icon={Plus} onClick={openAdd}>Nouvel achat</Btn>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Date','Fournisseur','Produit','Quantité','Prix unit.','Total',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {format(new Date(p.date), 'dd MMM yy', { locale: fr })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{p.supplier || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 max-w-[200px] truncate">{p.product_name}</p>
                      {p.product_code && <p className="text-xs text-gray-400">{p.product_code}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.quantity}</td>
                    <td className="px-4 py-3 text-gray-600">{formatFCFA(p.unit_price)}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatFCFA(p.total_amount)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setConfirm(p.id)}
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

      <Modal open={modal} onClose={() => setModal(false)} title="Nouvel achat" maxW="max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" required>
              <input {...register('date', { required: true })} type="date" className={inputCls} />
            </FormField>
            <FormField label="Fournisseur">
              <input {...register('supplier')} placeholder="Ex: TATA" className={inputCls} />
            </FormField>
          </div>

          <FormField label="Produit du catalogue" hint="Optionnel — remplit les champs ci-dessous">
            <select onChange={handleProductSelect} className={selectCls} defaultValue="">
              <option value="">— Choisir un produit —</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ''}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Désignation du produit" required>
            <input {...register('product_name', { required: 'Requis' })}
              placeholder="Nom exact du produit acheté" className={inputCls} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Quantité" required>
              <input {...register('quantity', { required: true, min: 0.001 })}
                type="number" step="0.001" min="0.001" className={inputCls} />
            </FormField>
            <FormField label="Prix unitaire (FCFA)" required>
              <input {...register('unit_price', { required: true, min: 0 })}
                type="number" min="0" placeholder="0" className={inputCls} />
            </FormField>
          </div>

          {total > 0 && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-blue-700 font-medium">Montant total</span>
              <span className="font-bold text-blue-800">{formatFCFA(total)}</span>
            </div>
          )}

          <FormField label="Notes">
            <input {...register('notes')} placeholder="Optionnel" className={inputCls} />
          </FormField>

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="secondary" onClick={() => setModal(false)}>Annuler</Btn>
            <Btn type="submit">Enregistrer</Btn>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => { localDelete('purchases', confirm); load(); toast.success('Achat supprimé') }}
        title="Supprimer l'achat" message="Êtes-vous sûr ?" />
    </div>
  )
}