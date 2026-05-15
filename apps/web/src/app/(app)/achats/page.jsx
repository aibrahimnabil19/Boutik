// apps/web/src/app/(app)/achats/page.jsx
'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { v4 as uuid } from 'uuid'
import { toast } from 'sonner'
import { ShoppingCart, Plus, Trash2, Printer, FileText, Package } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { getAll, localUpsert, localDelete } from '@/lib/db/local'
import { formatFCFA, formatNumber, calculateStock } from '@/lib/core/calculations'
import {
  PageHeader, SearchBar, Modal, FormField, EmptyState,
  ConfirmDialog, Btn, StatCard, inputCls, selectCls
} from '@/components/ui'
import { printPurchaseDocument } from '@/lib/core/invoicePrint'
import FrenchInput from '@/components/FrenchInput'
import { useRouter, useSearchParams } from 'next/navigation'

// Document types for purchases
const PURCHASE_DOC_TYPES = [
  { key: 'bon_commande', label: 'Bon de commande', icon: FileText, description: 'Document de commande fournisseur' },
  { key: 'bon_livraison', label: 'Bon de réception', icon: Package, description: 'Confirme la réception des marchandises' },
]

export default function AchatsPage() {
  const shop = useAppStore(s => s.shop)
  const router = useRouter()
  const searchParams = useSearchParams()
  const action = searchParams.get('action')
  const [purchases, setPurchases] = useState([])
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  // Document modal: holds the purchase to print
  const [docModal, setDocModal] = useState(null)
  const [paymentMode, setPaymentMode] = useState('paid')
  const [paidAmount, setPaidAmount] = useState('')
  const [supplierModal, setSupplierModal] = useState(false)
  const [quickSupplier, setQuickSupplier] = useState({ name: '', phone: '', address: '' })

  const { register, handleSubmit, reset, watch, setValue, control } = useForm({
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd'), quantity: 1, unit_price: '' }
  })

  const qty = Number(watch('quantity') || 0)
  const price = Number(watch('unit_price') || 0)
  const total = qty * price

  const load = useCallback(async () => {
    if (!shop?.id) return
    const [p, pr, su, sa] = await Promise.all([
      getAll('purchases', shop.id),
      getAll('products', shop.id),
      getAll('suppliers', shop.id),
      getAll('sales', shop.id),
    ])
    setSuppliers(su)
    setPurchases(p.sort((a, b) => new Date(b.date) - new Date(a.date)))
    setProducts(pr)
    setSales(sa)
    setLoading(false)
  }, [shop?.id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (action !== 'new') return

    openAdd()
    router.replace('/achats', { scroll: false })
  }, [action, router])

  function handleProductSelect(e) {
    const prod = products.find(p => p.id === e.target.value)
    setSelectedProduct(prod || null)

    if (prod) {
      setValue('unit_price', prod.purchase_price || '')
      setValue('supplier', prod.supplier || '')
    }
  }

  async function handleQuickSupplierSubmit(e) {
    e.preventDefault()

    const name = quickSupplier.name.trim()
    if (!name) {
      toast.error('Nom du fournisseur requis.')
      return
    }

    const now = new Date().toISOString()
    const record = {
      id: uuid(),
      shop_id: shop.id,
      name,
      phone: quickSupplier.phone || '',
      address: quickSupplier.address || '',
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
    }

    await localUpsert('suppliers', record)

    setSuppliers(prev => [...prev, record].sort((a, b) => a.name.localeCompare(b.name)))
    setValue('supplier', record.name)
    setSupplierModal(false)
    setQuickSupplier({ name: '', phone: '', address: '' })
    toast.success('Fournisseur ajouté')
  }

  async function onSubmit(data) {
    const q = Number(data.quantity)
    const up = Number(data.unit_price)
    const totalAmount = q * up
    const supplier = suppliers.find(s => s.name === data.supplier) || null
    if (!supplier) {
      toast.error('Choisissez un fournisseur.')
      return
    }

    if (!selectedProduct) {
      toast.error('Choisissez un produit du catalogue.')
      return
    }

    const totalPaid = paymentMode === 'credit'
      ? Math.max(0, Number(paidAmount || 0))
      : totalAmount

    const remainingAmount = Math.max(0, totalAmount - totalPaid)
    const paymentStatus = remainingAmount > 0 ? 'credit' : 'paid'

    if (paymentStatus === 'credit' && !supplier) {
      toast.error('Choisissez un fournisseur pour enregistrer un achat à crédit.')
      return
    }

    if (totalPaid > totalAmount) {
      toast.error('Le montant payé ne peut pas dépasser le total de l’achat.')
      return
    }

    const now = new Date().toISOString()

    const record = {
      id: uuid(),
      shop_id: shop.id,
      date: data.date,
      supplier_id: supplier?.id || null,
      supplier: supplier.name,
      product_id: selectedProduct.id,
      product_code: selectedProduct.code || '',
      product_name: selectedProduct.name,
      quantity: q,
      unit_price: up,
      total_amount: totalAmount,
      payment_status: paymentStatus,
      paid_amount: totalPaid,
      remaining_amount: remainingAmount,
      notes: data.notes || '',
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
    }

    await localUpsert('purchases', record)

    if (remainingAmount > 0 && supplier) {
      await localUpsert('supplier_transactions', {
        id: uuid(),
        shop_id: shop.id,
        supplier_id: supplier.id,
        date: data.date,
        label: `Achat à crédit — ${record.id.slice(0, 8).toUpperCase()}`,
        amount: remainingAmount,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
      })
    }

    toast.success('Achat enregistré')
    setModal(false)
    setDocModal(record)
    load()
  }

  function openAdd() {
    reset({ date: format(new Date(), 'yyyy-MM-dd'), quantity: 1 })
    setSelectedProduct(null)
    setPaymentMode('paid')
    setPaidAmount('')
    setModal(true)
  }

  function handlePrintDoc(purchase, docType) {
    printPurchaseDocument({
      shop,
      type: docType,
      purchase,
      invoiceNumber: `ACH-${purchase.date}-${purchase.id.slice(0, 4).toUpperCase()}`,
    })
    setDocModal(null)
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
          value={new Set(purchases.map(p => p.supplier).filter(Boolean)).size} color="amber" />
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
                  {['Date', 'Fournisseur', 'Produit', 'Quantité', 'Prix unit.', 'Total', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setDocModal(p)}
                  >
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
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button onClick={() => setDocModal(p)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Imprimer document">
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirm(p.id)}
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

      {/* ── Document Print Modal ── */}
      <Modal open={!!docModal} onClose={() => setDocModal(null)} title="Imprimer un document" maxW="max-w-sm">
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-4">
            Choisissez le type de document à générer pour cet achat.
          </p>
          {docModal && PURCHASE_DOC_TYPES.map(doc => {
            const Icon = doc.icon
            return (
              <button
                key={doc.key}
                onClick={() => handlePrintDoc(docModal, doc.key)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center flex-none transition-colors">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{doc.label}</p>
                  <p className="text-xs text-gray-400">{doc.description}</p>
                </div>
                <Printer className="w-4 h-4 text-gray-300 group-hover:text-blue-400 ml-auto transition-colors" />
              </button>
            )
          })}
          <div className="pt-2">
            <Btn variant="secondary" onClick={() => setDocModal(null)} className="w-full">Fermer</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={modal} onClose={() => setModal(false)} title="Nouvel achat" maxW="max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" required>
              <input {...register('date', { required: true })} type="date" className={inputCls} />
            </FormField>
            <FormField label="Fournisseur" required>
              <div className="flex gap-2">
                <select
                  {...register('supplier', { required: true })}
                  className={selectCls}
                  required
                >
                  <option value="">— Choisir un fournisseur —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setSupplierModal(true)}
                  className="h-11 w-11 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition"
                  title="Ajouter un fournisseur"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </FormField>
          </div>

          <FormField label="Produit du catalogue" required>
            <select
              onChange={handleProductSelect}
              className={selectCls}
              value={selectedProduct?.id || ''}
              required
            >
              <option value="">— Choisir un produit —</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ''}</option>
              ))}
            </select>
          </FormField>

          {selectedProduct && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 grid sm:grid-cols-3 gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">
                  ID du produit
                </p>
                <p className="font-mono text-xs text-blue-900 break-all">
                  {selectedProduct.id}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">
                  Code produit
                </p>
                <p className="font-mono text-sm font-bold text-blue-900">
                  {selectedProduct.code || '—'}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">
                  Stock restant actuel
                </p>
                <p className="text-lg font-bold text-blue-900">
                  {formatNumber(calculateStock(selectedProduct, purchases, sales))}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Quantité" required>
              <Controller
                name="quantity"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <FrenchInput
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    required
                    className={inputCls}
                  />
                )}
              />
            </FormField>
            <FormField label="Prix unitaire (FCFA)" required>
              <Controller
                name="unit_price"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <FrenchInput
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="0"
                    required
                    className={inputCls}
                  />
                )}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Paiement">
              <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className={selectCls}>
                <option value="paid">Payé comptant</option>
                <option value="credit">Achat à crédit</option>
              </select>
            </FormField>

            {paymentMode === 'credit' && (
              <FormField label="Montant payé">
                <FrenchInput
                  value={paidAmount}
                  onChange={setPaidAmount}
                  placeholder="0"
                  className={inputCls}
                />
              </FormField>
            )}
          </div>

          {total > 0 && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-blue-700 font-medium">Montant total</span>
              <div className="text-right">
                <span className="font-bold text-blue-800 block">{formatFCFA(total)}</span>
                {paymentMode === 'credit' && (
                  <span className="text-xs text-amber-700">
                    Reste : {formatFCFA(Math.max(0, total - Number(paidAmount || 0)))}
                  </span>
                )}
              </div>
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

      <Modal
        open={supplierModal}
        onClose={() => setSupplierModal(false)}
        title="Nouveau fournisseur"
        maxW="max-w-md"
      >
        <form onSubmit={handleQuickSupplierSubmit} className="space-y-4">
          <FormField label="Nom du fournisseur" required>
            <input
              value={quickSupplier.name}
              onChange={e => setQuickSupplier(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Fournisseur principal"
              className={inputCls}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Téléphone">
              <FrenchInput
                value={quickSupplier.phone}
                onChange={value => setQuickSupplier(prev => ({ ...prev, phone: value }))}
                placeholder="96 87 75 88"
                className={inputCls}
              />
            </FormField>

            <FormField label="Adresse">
              <input
                value={quickSupplier.address}
                onChange={e => setQuickSupplier(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Ex: Niamey"
                className={inputCls}
              />
            </FormField>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="secondary" onClick={() => setSupplierModal(false)}>
              Annuler
            </Btn>
            <Btn type="submit">
              Ajouter
            </Btn>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => { localDelete('purchases', confirm); load(); toast.success('Achat supprimé') }}
        title="Supprimer l'achat" message="Êtes-vous sûr ?" />
    </div>
  )
}