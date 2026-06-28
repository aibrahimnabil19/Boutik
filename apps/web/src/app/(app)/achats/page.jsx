// apps/web/src/app/(app)/achats/page.jsx
'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { v4 as uuid } from 'uuid'
import { toast } from 'sonner'
import { ShoppingCart, Plus, Trash2, Printer, FileText, Package, Wallet, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { getAll, localUpsert, localDelete } from '@/lib/db/local'
import { formatFCFA, formatNumber, calculateStock } from '@/lib/core/calculations'
import {
  PageHeader, SearchBar, Modal, FormField, EmptyState,
  ConfirmDialog, Btn, StatCard, inputCls, selectCls
} from '@/components/ui'
import { printPurchaseDocument, printPurchaseDocumentMulti } from '@/lib/core/invoicePrint'
import FrenchInput from '@/components/FrenchInput'
import PhoneInput from '@/components/PhoneInput'
import { useRouter, useSearchParams } from 'next/navigation'
import DateFilter from '@/components/DateFilter'
import { defaultDateFilter, isDateInFilter } from '@/lib/core/dateFilters'
import DocumentPrintOptions, { getDefaultDocumentOptions } from '@/components/DocumentPrintOptions'
import PaymentBreakdownInput, {
  cleanPaymentBreakdown,
  sumPaymentBreakdown,
} from '@/components/PaymentBreakdownInput'
import GuaranteePicker from '@/components/GuaranteePicker'
import { GUARANTEE_OPTIONS } from '@/lib/core/guarantees'

// Document types for purchases
const PURCHASE_DOC_TYPES = [
  { key: 'bon_commande', label: 'Bon de commande', icon: FileText, description: 'Document de commande fournisseur' },
  { key: 'bon_livraison', label: 'Bon de réception', icon: Package, description: 'Confirme la réception des marchandises' },
]

const emptyPurchaseLine = () => ({
  _key: uuid(),
  product_id: '',
  product_code: '',
  product_name: '',
  quantity: 1,
  unit_price: '',
})

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
  const [purchaseLines, setPurchaseLines] = useState([emptyPurchaseLine()])
  const [suppliers, setSuppliers] = useState([])
  const [purchaseDetail, setPurchaseDetail] = useState(null)
  const [editingPurchase, setEditingPurchase] = useState(null)
  // Document modal: holds the purchase to print
  const [docModal, setDocModal] = useState(null)
  const [paymentMode, setPaymentMode] = useState('')
  const [paidAmount, setPaidAmount] = useState('')
  const [supplierModal, setSupplierModal] = useState(false)
  const [quickSupplier, setQuickSupplier] = useState({ name: '', phone: '', address: '' })
  const [paymentModal, setPaymentModal] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [dateFilter, setDateFilter] = useState(defaultDateFilter())
  const [printOptions, setPrintOptions] = useState(getDefaultDocumentOptions())
  const [docGuarantee, setDocGuarantee] = useState({
    key: GUARANTEE_OPTIONS[0].key,
    text: GUARANTEE_OPTIONS[0].text,
  })
  const [chargeRows, setChargeRows] = useState([])
  const [paymentBreakdown, setPaymentBreakdown] = useState([])
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

  const { register, handleSubmit, reset, watch, setValue, control } = useForm({
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd'), quantity: 1, unit_price: '' }
  })

  const stockSubtotal = useMemo(() => {
    return purchaseLines.reduce((sum, line) => {
      return sum + Number(line.quantity || 0) * Number(line.unit_price || 0)
    }, 0)
  }, [purchaseLines])

  const chargeTotal = useMemo(() => {
    return chargeRows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
  }, [chargeRows])

  const total = stockSubtotal + chargeTotal

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

  function updatePurchaseLine(key, field, value) {
    setPurchaseLines(prev =>
      prev.map(line =>
        line._key === key ? { ...line, [field]: value } : line
      )
    )
  }

  function handlePurchaseProductSelect(key, productId) {
    const prod = products.find(p => p.id === productId)

    if (!prod) {
      setPurchaseLines(prev =>
        prev.map(line =>
          line._key === key
            ? { ...line, product_id: '', product_code: '', product_name: '', unit_price: '' }
            : line
        )
      )
      return
    }

    setPurchaseLines(prev =>
      prev.map(line =>
        line._key === key
          ? {
            ...line,
            product_id: prod.id,
            product_code: prod.code || '',
            product_name: prod.name || '',
            unit_price: prod.purchase_price || '',
          }
          : line
      )
    )
  }

  function addPurchaseLine() {
    setPurchaseLines(prev => [...prev, emptyPurchaseLine()])
  }

  function removePurchaseLine(key) {
    setPurchaseLines(prev =>
      prev.length <= 1 ? prev : prev.filter(line => line._key !== key)
    )
  }

  function openPayment(purchase) {
    if (!purchase || Number(purchase.remaining_amount || 0) <= 0) return
    setPaymentModal(purchase)
    setPaymentAmount('')
  }

  async function handleCreditPayment(e) {
    e.preventDefault()

    if (!paymentModal) return

    const amount = Number(paymentAmount || 0)
    const remaining = Number(paymentModal.remaining_amount || 0)

    if (amount <= 0) {
      toast.error('Montant invalide.')
      return
    }

    if (amount > remaining) {
      toast.error('Le paiement dépasse le reste à payer.')
      return
    }

    const now = new Date().toISOString()
    const newRemaining = remaining - amount
    const newPaid = Number(paymentModal.paid_amount || 0) + amount

    await localUpsert('purchases', {
      ...paymentModal,
      paid_amount: newPaid,
      remaining_amount: newRemaining,
      payment_status: newRemaining <= 0 ? 'paid' : 'credit',
      updated_at: now,
      sync_status: 'pending',
    })

    if (paymentModal.supplier_id) {
      await localUpsert('supplier_transactions', {
        id: uuid(),
        shop_id: shop.id,
        supplier_id: paymentModal.supplier_id,
        date: format(new Date(), 'yyyy-MM-dd'),
        label: `Paiement fournisseur — ${paymentModal.id.slice(0, 8).toUpperCase()}`,
        amount: -amount,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
      })
    }

    toast.success('Paiement fournisseur enregistré')
    setPaymentModal(null)
    setPaymentAmount('')
    await load()
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

  function addChargeRow() {
    setChargeRows(prev => [
      ...prev,
      { _key: uuid(), label: '', amount: '' },
    ])
  }

  function updateChargeRow(key, field, value) {
    setChargeRows(prev =>
      prev.map(row =>
        row._key === key ? { ...row, [field]: value } : row
      )
    )
  }

  function removeChargeRow(key) {
    setChargeRows(prev => prev.filter(row => row._key !== key))
  }

  function cleanChargeRows() {
    return chargeRows
      .map(row => ({
        label: String(row.label || '').trim(),
        amount: Number(row.amount || 0),
      }))
      .filter(row => row.label && row.amount > 0)
  }

  async function onSubmit(data) {
    if (!paymentMode) {
      toast.error('Choisissez le mode de paiement.')
      return
    }

    const validLines = purchaseLines
      .map(line => ({
        ...line,
        quantity: Number(line.quantity || 0),
        unit_price: Number(line.unit_price || 0),
      }))
      .filter(line => line.product_id)

    if (!validLines.length) {
      toast.error('Ajoutez au moins un produit.')
      return
    }

    for (const line of validLines) {
      if (line.quantity <= 0) {
        toast.error(`Quantité invalide pour ${line.product_name}`)
        return
      }

      if (line.unit_price <= 0) {
        toast.error(`Prix unitaire invalide pour ${line.product_name}`)
        return
      }
    }

    const supplier = suppliers.find(s => s.name === data.supplier) || null

    if (!supplier) {
      toast.error('Choisissez un fournisseur.')
      return
    }

    const cleanCharges = cleanChargeRows()
    const chargesTotal = cleanCharges.reduce((sum, row) => sum + Number(row.amount || 0), 0)
    const totalAmount = stockSubtotal + chargesTotal

    if (paymentMode === 'paid') {
      const breakdownTotal = sumPaymentBreakdown(paymentBreakdown)

      if (paymentBreakdown.length === 0) {
        toast.error('Choisissez au moins un moyen de paiement.')
        return
      }

      if (Math.abs(breakdownTotal - totalAmount) > 0.01) {
        toast.error('La somme des moyens de paiement doit être égale au total de l’entrée de stock.')
        return
      }
    }

    const totalPaid = paymentMode === 'credit'
      ? Math.max(0, Number(paidAmount || 0))
      : totalAmount

    const remainingAmount = Math.max(0, totalAmount - totalPaid)
    const paymentStatus = remainingAmount > 0 ? 'credit' : 'paid'

    if (paymentStatus === 'credit' && !supplier) {
      toast.error('Choisissez un fournisseur pour enregistrer un Entrée de stock à crédit.')
      return
    }

    if (totalPaid > totalAmount) {
      toast.error('Le montant payé ne peut pas dépasser le total de l’achat.')
      return
    }

    const now = new Date().toISOString()

    const purchaseBatchId = editingPurchase?.purchase_batch_id || uuid()

    const savedPurchases = []

    for (const line of validLines) {
      const lineStockAmount = Number(line.quantity || 0) * Number(line.unit_price || 0)
      const chargeShare = stockSubtotal > 0
        ? Math.round((lineStockAmount / stockSubtotal) * chargesTotal)
        : 0

      const lineTotal = lineStockAmount + chargeShare
      const linePaid = totalAmount > 0
        ? Math.round((lineTotal / totalAmount) * totalPaid)
        : 0

      const lineRemaining = Math.max(0, lineTotal - linePaid)

      const record = {
        id: editingPurchase?.id && validLines.length === 1 ? editingPurchase.id : uuid(),
        purchase_batch_id: purchaseBatchId,
        shop_id: shop.id,
        date: data.date,
        supplier_id: supplier?.id || null,
        supplier: supplier.name,
        product_id: line.product_id,
        product_code: line.product_code || '',
        product_name: line.product_name,
        quantity: line.quantity,
        unit_price: line.unit_price,
        charge_total: chargeShare,
        charges: cleanCharges,
        total_amount: lineTotal,
        payment_status: lineRemaining > 0 ? 'credit' : 'paid',
        paid_amount: linePaid,
        remaining_amount: lineRemaining,
        payment_method: paymentMode,
        payment_breakdown: paymentMode === 'paid' ? cleanPaymentBreakdown(paymentBreakdown) : [],
        notes: data.notes || '',
        created_at: editingPurchase?.created_at || now,
        updated_at: now,
        sync_status: 'pending',
      }

      await localUpsert('purchases', record)
      savedPurchases.push(record)
    }

    if (editingPurchase) {
      const oldKey = String(editingPurchase.id).slice(0, 8).toUpperCase()
      const oldSupplierTx = await getAll('supplier_transactions', shop.id)

      for (const tx of oldSupplierTx) {
        const label = String(tx.label || '')
        const isLinkedToThisPurchase =
          label.includes(oldKey) &&
          label.startsWith('Entrée de stock à crédit')

        if (isLinkedToThisPurchase) {
          await localDelete('supplier_transactions', tx.id)
        }
      }
    }

    if (remainingAmount > 0 && supplier) {
      await localUpsert('supplier_transactions', {
        id: uuid(),
        shop_id: shop.id,
        supplier_id: supplier.id,
        date: data.date,
        label: `Entrée de stock à crédit — ${purchaseBatchId.slice(0, 8).toUpperCase()}`,
        amount: remainingAmount,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
      })
    }

    toast.success(editingPurchase ? 'Entrée de stock modifiée' : 'Entrée de stock enregistrée')
    setModal(false)
    setEditingPurchase(null)
    setPrintOptions(getDefaultDocumentOptions())
    setDocGuarantee({
      key: GUARANTEE_OPTIONS[0].key,
      text: GUARANTEE_OPTIONS[0].text,
    })
    setDocModal(savedPurchases[0])
    load()
  }

  function openAdd() {
    setEditingPurchase(null)
    reset({ date: format(new Date(), 'yyyy-MM-dd'), quantity: 1, unit_price: '' })
    setChargeRows([])
    setPurchaseLines([emptyPurchaseLine()])
    setPaymentMode('')
    setPaidAmount('')
    setPaymentBreakdown([])
    setModal(true)
  }

  function openEditPurchase(purchase) {
    setEditingPurchase(purchase)
    setPurchaseLines([
      {
        _key: uuid(),
        product_id: purchase.product_id || '',
        product_code: purchase.product_code || '',
        product_name: purchase.product_name || '',
        quantity: purchase.quantity || 1,
        unit_price: purchase.unit_price || '',
      },
    ])
    reset({
      date: purchase.date || format(new Date(), 'yyyy-MM-dd'),
      quantity: purchase.quantity || 1,
      unit_price: purchase.unit_price || '',
      supplier: purchase.supplier || '',
      notes: purchase.notes || '',
    })
    setPaymentMode(purchase.payment_status === 'credit' ? 'credit' : 'paid')
    setPaidAmount(String(purchase.paid_amount || ''))
    setPaymentBreakdown(purchase.payment_breakdown || [])

    const existingCharges = Array.isArray(purchase.charges)
      ? purchase.charges
      : []

    setChargeRows(
      existingCharges.map(charge => ({
        _key: uuid(),
        label: charge.label || '',
        amount: String(charge.amount || ''),
      }))
    )
    setModal(true)
  }

  function handlePrintDoc(purchase, docType) {
    printPurchaseDocument({
      shop,
      type: docType,
      purchase,
      invoiceNumber: `ACH-${purchase.date}-${purchase.id.slice(0, 4).toUpperCase()}`,
      guaranteeText: docGuarantee.text || '',
      includeCachet: printOptions.includeCachet,
      includeSignature: printOptions.includeSignature,
    })
    setDocModal(null)
  }

function handlePrintDocMulti(purchases, docType) {
  const earliestDate = purchases.map(p => p.date).filter(Boolean).sort()[0] || purchases[0]?.date
  printPurchaseDocumentMulti({
    shop,
    type: docType,
    purchases,
    invoiceNumber: `ACH-${earliestDate}-GRP`,
    guaranteeText: docGuarantee.text || '',
    includeCachet: printOptions.includeCachet,
    includeSignature: printOptions.includeSignature,
  })
  setDocModal(null)
  exitSelectMode()
}

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()

    return purchases.filter(p => {
      const matchesSearch =
        !q ||
        p.product_name?.toLowerCase().includes(q) ||
        p.product_code?.toLowerCase().includes(q) ||
        p.supplier?.toLowerCase().includes(q)

      return matchesSearch && isDateInFilter(p.date, dateFilter)
    })
  }, [purchases, search, dateFilter])

  const totalSpent = useMemo(
    () => filtered.reduce((a, p) => a + Number(p.total_amount || 0), 0),
    [filtered]
  )

  const selectionSupplierName = useMemo(() => {
    if (selectedIds.size === 0) return null
    const firstId = Array.from(selectedIds)[0]
    const firstPurchase = filtered.find(p => p.id === firstId)
    return firstPurchase?.supplier || ''
  }, [selectedIds, filtered])

  function canSelectPurchase(purchase) {
    if (selectedIds.size === 0) return true
    return String(purchase.supplier || '').trim().toLowerCase() ===
      String(selectionSupplierName || '').trim().toLowerCase()
  }

  function toggleSelectPurchase(purchase) {
    if (!canSelectPurchase(purchase) && !selectedIds.has(purchase.id)) return
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(purchase.id)) next.delete(purchase.id)
      else next.add(purchase.id)
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  const selectedPurchases = useMemo(
    () => filtered.filter(p => selectedIds.has(p.id)),
    [filtered, selectedIds]
  )

  const purchaseProductOptions = useMemo(() => {
    return products
      .map(p => ({
        ...p,
        currentStock: calculateStock(p, purchases, sales),
      }))
      .sort((a, b) => {
        const aOut = Number(a.currentStock || 0) <= 0 ? 1 : 0
        const bOut = Number(b.currentStock || 0) <= 0 ? 1 : 0

        if (aOut !== bOut) return aOut - bOut

        return String(a.name || '').localeCompare(String(b.name || ''), 'fr', { sensitivity: 'base' })
      })
  }, [products, purchases, sales])

  return (
    <div className="p-6">
      <PageHeader
        action={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}>
              {selectMode ? 'Annuler la sélection' : 'Sélectionner plusieurs'}
            </Btn>
            <Btn icon={Plus} onClick={openAdd}>Nouvelle entrée</Btn>
          </div>
        }
        subtitle={`${filtered.length} achat${filtered.length !== 1 ? 's' : ''}`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total dépensé" value={formatFCFA(totalSpent)} color="purple" icon={ShoppingCart} />
        <StatCard label="Nombre d'entrées" value={filtered.length} color="blue" />
        <StatCard label="Fournisseurs distincts"
          value={new Set(filtered.map(p => p.supplier).filter(Boolean)).size} color="amber" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex-1 min-w-[220px] max-w-xs">
            <SearchBar value={search} onChange={setSearch} placeholder="Produit, code, fournisseur…" />
          </div>

          <DateFilter value={dateFilter} onChange={setDateFilter} />
        </div>

        {selectMode && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-blue-50 border-b border-blue-100">
            <div className="text-sm text-blue-800 font-medium">
              {selectedIds.size === 0
                ? 'Sélectionnez des entrées de stock du même fournisseur pour générer un document groupé.'
                : `${selectedIds.size} entrée${selectedIds.size > 1 ? 's' : ''} sélectionnée${selectedIds.size > 1 ? 's' : ''} — Fournisseur : ${selectionSupplierName || '—'}`}
            </div>
            {selectedIds.size > 0 && (
              <div className="flex gap-2">
                <Btn variant="secondary" onClick={() => setSelectedIds(new Set())}>Désélectionner tout</Btn>
                <Btn
                  icon={Printer}
                  onClick={() => {
                    setPrintOptions(getDefaultDocumentOptions())
                    setDocGuarantee({ key: GUARANTEE_OPTIONS[0].key, text: GUARANTEE_OPTIONS[0].text })
                    setDocModal({ _multi: true, purchases: selectedPurchases })
                  }}
                >
                  Créer un document groupé
                </Btn>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Aucun achat"
            description="Enregistrez vos achats fournisseurs."
            action={<Btn icon={Plus} onClick={openAdd}>Nouvel achat</Btn>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-zebra">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {selectMode && <th className="px-4 py-3 w-8" />}
                  {['Date', 'Fournisseur', 'Produit', 'Quantité', 'Prix unit.', 'Charges', 'Total', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => selectMode ? toggleSelectPurchase(p) : setPurchaseDetail(p)}
                  >
                    {selectMode && (
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          disabled={!canSelectPurchase(p) && !selectedIds.has(p.id)}
                          onChange={() => toggleSelectPurchase(p)}
                          className="w-4 h-4 rounded border-gray-300 disabled:opacity-30"
                          title={!canSelectPurchase(p) && !selectedIds.has(p.id) ? `Fournisseur différent (${p.supplier || '—'})` : ''}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {format(new Date(p.date), 'dd MMM yy', { locale: fr })}
                      {p.created_at && (
                        <span className="block text-[11px] text-gray-400">
                          {format(new Date(p.created_at), 'HH:mm', { locale: fr })}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{p.supplier || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 max-w-[200px] truncate">{p.product_name}</p>
                      {p.product_code && <p className="text-xs text-gray-400">{p.product_code}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.quantity}</td>
                    <td className="px-4 py-3 text-gray-600">{formatFCFA(p.unit_price)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {Number(p.charge_total || 0) > 0 ? formatFCFA(p.charge_total) : '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatFCFA(p.total_amount)}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {!selectMode && (
                        <div className="flex gap-1">
                          <button onClick={() => setDocModal(p)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Imprimer document">
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditPurchase(p)
                            }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Modifier l’entrée de stock"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openPayment(p)
                            }}
                            disabled={Number(p.remaining_amount || 0) <= 0}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Payer le crédit"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                          </button>

                          <button onClick={() => setConfirm(p.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Document Print Modal ── */}
      <Modal open={!!purchaseDetail} onClose={() => setPurchaseDetail(null)} title="Détails de l'entrée de stock" maxW="max-w-4xl">
        {purchaseDetail && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-blue-500">Entrée de stock</p>
                  <h3 className="mt-2 font-semibold text-gray-900 text-lg">{purchaseDetail.product_name || 'Produit non renseigné'}</h3>
                  <p className="text-sm text-gray-500">{purchaseDetail.supplier || 'Fournisseur non renseigné'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Total</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">{formatFCFA(purchaseDetail.total_amount || 0)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-400">Informations de base</p>
                <div className="mt-4 space-y-3 text-sm text-gray-700">
                  <div className="flex justify-between"><span>Date</span><span>{format(new Date(purchaseDetail.date), 'dd MMM yyyy', { locale: fr })}</span></div>
                  {purchaseDetail.created_at && <div className="flex justify-between"><span>Créée le</span><span>{format(new Date(purchaseDetail.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}</span></div>}
                  <div className="flex justify-between"><span>Fournisseur</span><span>{purchaseDetail.supplier || '—'}</span></div>
                  <div className="flex justify-between"><span>Produit</span><span>{purchaseDetail.product_name || '—'}</span></div>
                  <div className="flex justify-between"><span>Code produit</span><span>{purchaseDetail.product_code || purchaseDetail.product_id || '—'}</span></div>
                  <div className="flex justify-between"><span>Quantité</span><span>{purchaseDetail.quantity}</span></div>
                  <div className="flex justify-between"><span>Prix unitaire</span><span>{formatFCFA(purchaseDetail.unit_price || 0)}</span></div>
                  <div className="flex justify-between"><span>Prix stock</span><span>{formatFCFA(Number(purchaseDetail.quantity || 0) * Number(purchaseDetail.unit_price || 0))}</span></div>
                  <div className="flex justify-between"><span>Notes</span><span className="text-right max-w-[220px]">{purchaseDetail.notes || '—'}</span></div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-400">Paiement</p>
                <div className="mt-4 space-y-3 text-sm text-gray-700">
                  <div className="flex justify-between"><span>Charges</span><span>{formatFCFA(purchaseDetail.charge_total || 0)}</span></div>
                  <div className="flex justify-between"><span>Total</span><span>{formatFCFA(purchaseDetail.total_amount || 0)}</span></div>
                  <div className="flex justify-between"><span>Montant payé</span><span>{formatFCFA(purchaseDetail.paid_amount || 0)}</span></div>
                  <div className="flex justify-between"><span>Reste à payer</span><span>{formatFCFA(purchaseDetail.remaining_amount || 0)}</span></div>
                  <div className="flex justify-between"><span>Statut</span><span>{purchaseDetail.payment_status === 'credit' ? 'Crédit' : 'Payé'}</span></div>
                </div>
              </div>
            </div>

            {Array.isArray(purchaseDetail.charges) && purchaseDetail.charges.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">Détail des charges</p>
                <div className="space-y-2">
                  {purchaseDetail.charges.map((charge, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">{charge.label}</span>
                      <span className="font-semibold text-gray-900">{formatFCFA(charge.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 justify-end">
              <Btn variant="secondary" onClick={() => setPurchaseDetail(null)}>Fermer</Btn>
              <Btn onClick={() => { setPurchaseDetail(null); setDocModal(purchaseDetail) }}>Imprimer</Btn>
              <Btn onClick={() => { setPurchaseDetail(null); openEditPurchase(purchaseDetail) }}>Modifier</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!docModal} onClose={() => setDocModal(null)} title="Imprimer un document" maxW="max-w-sm">
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-4">
            {docModal?._multi
              ? `Choisissez le type de document à générer pour ces ${docModal.purchases.length} entrées groupées.`
              : 'Choisissez le type de document à générer pour cet achat.'}
          </p>
          <DocumentPrintOptions shop={shop} value={printOptions} onChange={setPrintOptions} />
          <GuaranteePicker value={docGuarantee} onChange={setDocGuarantee} />
          {docModal && PURCHASE_DOC_TYPES.map(doc => {
            const Icon = doc.icon
            return (
              <button
                key={doc.key}
                onClick={() => docModal._multi ? handlePrintDocMulti(docModal.purchases, doc.key) : handlePrintDoc(docModal, doc.key)}
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

      <Modal open={modal} onClose={() => { setModal(false); setEditingPurchase(null) }} title={editingPurchase ? 'Modifier l’entrée de stock' : 'Nouvelle entrée de stock'} maxW="max-w-lg">
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

          <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Produits de l’entrée</p>
                <p className="text-xs text-gray-400">Ajoutez un ou plusieurs produits dans cette entrée de stock.</p>
              </div>

              <button
                type="button"
                onClick={addPurchaseLine}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-3 py-2 text-xs font-semibold hover:bg-blue-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter une ligne
              </button>
            </div>

            <div className="space-y-2">
              {purchaseLines.map((line, index) => (
                <div
                  key={line._key}
                  className="grid grid-cols-[1.7fr_110px_150px_36px] gap-2 items-end rounded-xl bg-gray-50 border border-gray-100 p-3"
                >
                  <FormField label={`Produit ${index + 1}`} required>
                    <select
                      value={line.product_id}
                      onChange={(e) => handlePurchaseProductSelect(line._key, e.target.value)}
                      className={selectCls}
                      required
                    >
                      <option value="">— Choisir —</option>
                      {purchaseProductOptions.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.code ? `(${p.code})` : ''} — Stock: {formatNumber(p.currentStock)}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Qté" required>
                    <FrenchInput
                      value={line.quantity}
                      onChange={(value) => updatePurchaseLine(line._key, 'quantity', value)}
                      placeholder="1"
                      className={inputCls}
                    />
                  </FormField>

                  <FormField label="Prix unitaire" required>
                    <FrenchInput
                      value={line.unit_price}
                      onChange={(value) => updatePurchaseLine(line._key, 'unit_price', value)}
                      placeholder="0"
                      className={inputCls}
                    />
                  </FormField>

                  <button
                    type="button"
                    onClick={() => removePurchaseLine(line._key)}
                    disabled={purchaseLines.length <= 1}
                    className="h-11 w-9 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-30"
                    title="Supprimer la ligne"
                  >
                    <Trash2 className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">Charges supplémentaires</p>
                <p className="text-xs text-gray-400">
                  Ex: taxe, frais bancaires, transport, manutention…
                </p>
              </div>

              <button
                type="button"
                onClick={addChargeRow}
                className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter
              </button>
            </div>

            {chargeRows.length === 0 ? (
              <p className="text-xs text-gray-400">Aucune charge ajoutée.</p>
            ) : (
              <div className="space-y-2">
                {chargeRows.map(row => (
                  <div key={row._key} className="grid grid-cols-[1fr_160px_36px] gap-2 items-center">
                    <input
                      value={row.label}
                      onChange={(e) => updateChargeRow(row._key, 'label', e.target.value)}
                      placeholder="Libellé de la charge"
                      className={inputCls}
                    />

                    <FrenchInput
                      value={row.amount}
                      onChange={(value) => updateChargeRow(row._key, 'amount', value)}
                      placeholder="Montant"
                      className={inputCls}
                    />

                    <button
                      type="button"
                      onClick={() => removeChargeRow(row._key)}
                      className="h-11 w-9 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Paiement" required>
              <select
                value={paymentMode}
                onChange={e => {
                  setPaymentMode(e.target.value)
                  setPaymentBreakdown([])
                  setPaidAmount('')
                }}
                className={selectCls}
                required
              >
                <option value="">— Choisir le mode de paiement —</option>
                <option value="paid">Payé comptant</option>
                <option value="credit">Entrée de stock à crédit</option>
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

          {paymentMode === 'paid' && (
            <PaymentBreakdownInput
              value={paymentBreakdown}
              onChange={setPaymentBreakdown}
              total={total}
            />
          )}

          {total > 0 && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-blue-500 font-semibold">Prix stock</p>
                <p className="font-bold text-blue-900">{formatFCFA(stockSubtotal)}</p>
              </div>

              <div>
                <p className="text-xs text-blue-500 font-semibold">Charges</p>
                <p className="font-bold text-blue-900">{formatFCFA(chargeTotal)}</p>
              </div>

              <div>
                <p className="text-xs text-blue-500 font-semibold">Prix total</p>
                <p className="font-bold text-blue-900">{formatFCFA(total)}</p>
                {paymentMode === 'credit' && (
                  <p className="text-xs text-amber-700">
                    Reste : {formatFCFA(Math.max(0, total - Number(paidAmount || 0)))}
                  </p>
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
              <PhoneInput
                value={quickSupplier.phone}
                onChange={value => setQuickSupplier(prev => ({ ...prev, phone: value }))}
                placeholder="99 12 34 56"
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

      <Modal
        open={!!paymentModal}
        onClose={() => setPaymentModal(null)}
        title="Paiement fournisseur"
        maxW="max-w-md"
      >
        {paymentModal && (
          <form onSubmit={handleCreditPayment} className="space-y-4">
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
              <p className="text-xs text-amber-600">Total entrée de stock</p>
              <p className="font-bold text-gray-900">{formatFCFA(paymentModal.total_amount)}</p>

              <p className="text-xs text-amber-600 mt-2">Déjà payé</p>
              <p className="font-bold text-gray-900">{formatFCFA(paymentModal.paid_amount)}</p>

              <p className="text-xs text-amber-600 mt-2">Reste à payer</p>
              <p className="font-bold text-amber-700">{formatFCFA(paymentModal.remaining_amount)}</p>
            </div>

            <FormField label="Montant payé maintenant" required>
              <FrenchInput
                value={paymentAmount}
                onChange={setPaymentAmount}
                placeholder="0"
                required
                className={inputCls}
              />
            </FormField>

            <div className="flex gap-3 justify-end">
              <Btn variant="secondary" onClick={() => setPaymentModal(null)}>Annuler</Btn>
              <Btn type="submit">Enregistrer paiement</Btn>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => { localDelete('purchases', confirm); load(); toast.success('Achat supprimé') }}
        title="Supprimer l'achat" message="Êtes-vous sûr ?" />
    </div>
  )
}