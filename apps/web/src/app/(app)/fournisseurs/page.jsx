'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { v4 as uuid } from 'uuid'
import { toast } from 'sonner'
import {
  Truck,
  Plus,
  ChevronRight,
  ArrowLeft,
  Trash2,
  Pencil,
  Printer,
  FileText,
  ShoppingCart,
  CreditCard,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  parseISO,
  isWithinInterval,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { getAll, localUpsert, localDelete } from '@/lib/db/local'
import { formatFCFA } from '@/lib/core/calculations'
import {
  PageHeader,
  SearchBar,
  Modal,
  FormField,
  EmptyState,
  ConfirmDialog,
  Btn,
  StatCard,
  Badge,
  inputCls,
} from '@/components/ui'
import FrenchInput from '@/components/FrenchInput'
import PhoneInput from '@/components/PhoneInput'

// ─── Payment Modal ────────────────────────────────────────────────────────────
// Replaces the old "Nouvelle ligne fournisseur" modal.
// Shows only unpaid/partial purchases; user selects which ones to pay and
// enters the amount paid per purchase. One supplier_transaction is created
// per selected purchase.
function PaymentModal({ open, onClose, supplier, purchases, shop, onSaved }) {
  // purchases prop = all purchases for this supplier with remaining_amount > 0
  const [selections, setSelections] = useState({}) // { [purchaseId]: amountString }
  const [submitting, setSubmitting] = useState(false)
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [label, setLabel] = useState('')

  // Reset state whenever modal opens
  useEffect(() => {
    if (open) {
      setDate(format(new Date(), 'yyyy-MM-dd'))
      setLabel('')
      // Pre-select all unpaid purchases, pre-fill with their remaining amount
      const initial = {}
      purchases.forEach(p => {
        initial[p.id] = String(Math.round(Number(p.remaining_amount || 0)))
      })
      setSelections(initial)
    }
  }, [open, purchases])

  function togglePurchase(purchaseId, remaining) {
    setSelections(prev => {
      if (purchaseId in prev) {
        // Deselect: remove key
        const next = { ...prev }
        delete next[purchaseId]
        return next
      } else {
        // Select: default to remaining amount
        return { ...prev, [purchaseId]: String(Math.round(remaining)) }
      }
    })
  }

  function setAmount(purchaseId, value) {
    setSelections(prev => ({ ...prev, [purchaseId]: value }))
  }

  const selectedCount = Object.keys(selections).length
  const totalPaying = Object.values(selections).reduce(
    (sum, v) => sum + (Number(v) || 0),
    0
  )

  async function handleSubmit() {
    if (selectedCount === 0) {
      toast.error('Sélectionnez au moins une entrée de stock à régler.')
      return
    }
    if (!label.trim()) {
      toast.error('Ajoutez un libellé pour ce paiement.')
      return
    }
    for (const [pid, amt] of Object.entries(selections)) {
      if (!amt || Number(amt) <= 0) {
        toast.error('Chaque montant doit être supérieur à 0.')
        return
      }
    }

    setSubmitting(true)
    try {
      const now = new Date().toISOString()

      for (const [purchaseId, amtStr] of Object.entries(selections)) {
        const purchase = purchases.find(p => p.id === purchaseId)
        if (!purchase) continue

        const paying = Math.abs(Number(amtStr))
        const newPaid = Number(purchase.paid_amount || 0) + paying
        const newRemaining = Math.max(0, Number(purchase.total_amount || 0) - newPaid)

        // 1. Update the purchase's payment tracking
        await localUpsert('purchases', {
          ...purchase,
          paid_amount: newPaid,
          remaining_amount: newRemaining,
          updated_at: now,
          sync_status: 'pending',
        })

        // 2. Create one supplier_transaction (credit = negative amount)
        await localUpsert('supplier_transactions', {
          id: uuid(),
          shop_id: shop.id,
          supplier_id: supplier.id,
          date,
          label: `${label.trim()} — ${purchase.product_name || 'Entrée #' + purchaseId.slice(0, 6)}`,
          amount: -paying, // credit: reduces the balance owed
          type: 'credit',
          purchase_id: purchaseId, // link back for traceability
          created_at: now,
          updated_at: now,
          sync_status: 'pending',
        })
      }

      toast.success(
        selectedCount === 1
          ? 'Paiement enregistré'
          : `${selectedCount} paiements enregistrés`
      )
      onClose()
      onSaved()
    } catch (err) {
      toast.error(err.message || 'Erreur lors de l\'enregistrement')
    } finally {
      setSubmitting(false)
    }
  }

  const hasPurchases = purchases.length > 0

  return (
    <Modal open={open} onClose={onClose} title="Régler des dettes fournisseur" maxW="max-w-2xl">
      <div className="space-y-4">
        {/* Date + Label row */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Date du paiement" required>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={inputCls}
            />
          </FormField>
          <FormField label="Libellé / Référence" required>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Ex: Virement bancaire, Espèces…"
              className={inputCls}
            />
          </FormField>
        </div>

        {/* Purchase list */}
        {!hasPurchases ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 py-10 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Toutes les entrées de stock sont réglées</p>
            <p className="text-xs text-gray-400 mt-1">Il n'y a aucune dette en attente pour ce fournisseur.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Entrées de stock avec solde dû
              </p>
              <button
                onClick={() => {
                  // Toggle: if all selected, deselect all; else select all
                  if (selectedCount === purchases.length) {
                    setSelections({})
                  } else {
                    const all = {}
                    purchases.forEach(p => {
                      all[p.id] = String(Math.round(Number(p.remaining_amount || 0)))
                    })
                    setSelections(all)
                  }
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedCount === purchases.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
              {purchases.map(p => {
                const isSelected = p.id in selections
                const totalAmt = Number(p.total_amount || 0)
                const paidAmt = Number(p.paid_amount || 0)
                const remainingAmt = Number(p.remaining_amount || 0)
                const isPartial = paidAmt > 0 && remainingAmt > 0

                return (
                  <div
                    key={p.id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors ${isSelected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                      }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => togglePurchase(p.id, remainingAmt)}
                      className={`mt-0.5 flex-none w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 hover:border-blue-400'
                        }`}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    {/* Purchase info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {p.product_name || '—'}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {format(new Date(p.date), 'dd MMM yyyy', { locale: fr })}
                            {p.product_code && ` · ${p.product_code}`}
                            {` · ${p.quantity} unité${p.quantity > 1 ? 's' : ''}`}
                          </p>
                        </div>

                        {/* Debt status pill */}
                        <div className="flex-none text-right">
                          {isPartial ? (
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200">
                              <AlertCircle className="w-3 h-3 text-amber-500 flex-none" />
                              <div className="text-right">
                                <p className="text-xs font-bold text-amber-700">
                                  {formatFCFA(paidAmt)} / {formatFCFA(totalAmt)}
                                </p>
                                <p className="text-xs text-amber-600">
                                  reste {formatFCFA(remainingAmt)}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 border border-red-200">
                              <div className="text-right">
                                <p className="text-xs font-bold text-red-700">
                                  {formatFCFA(remainingAmt)}
                                </p>
                                <p className="text-xs text-red-500">non réglé</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Amount input when selected */}
                      {isSelected && (
                        <div className="mt-2 flex items-center gap-2">
                          <label className="text-xs text-gray-500 whitespace-nowrap">
                            Montant réglé :
                          </label>
                          <div className="relative flex-1 max-w-[180px]">
                            <FrenchInput
                              value={selections[p.id]}
                              onChange={val => setAmount(p.id, val)}
                              placeholder="0"
                              className={inputCls + ' pr-14 text-sm'}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                              FCFA
                            </span>
                          </div>
                          {/* Quick-fill button */}
                          {Number(selections[p.id]) !== remainingAmt && (
                            <button
                              onClick={() => setAmount(p.id, String(Math.round(remainingAmt)))}
                              className="text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap font-medium"
                            >
                              Tout régler
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer summary + actions */}
        {hasPurchases && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div>
              {selectedCount > 0 ? (
                <p className="text-sm text-gray-600">
                  <span className="font-bold text-gray-900">{selectedCount}</span> entrée{selectedCount > 1 ? 's' : ''} sélectionnée{selectedCount > 1 ? 's' : ''} ·{' '}
                  <span className="font-bold text-blue-700">{formatFCFA(totalPaying)}</span> à enregistrer
                </p>
              ) : (
                <p className="text-sm text-gray-400">Aucune entrée sélectionnée</p>
              )}
            </div>
            <div className="flex gap-3">
              <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
              <Btn
                icon={CreditCard}
                onClick={handleSubmit}
                disabled={submitting || selectedCount === 0 || !hasPurchases}
              >
                {submitting ? 'Enregistrement…' : 'Enregistrer le paiement'}
              </Btn>
            </div>
          </div>
        )}

        {!hasPurchases && (
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <Btn variant="secondary" onClick={onClose}>Fermer</Btn>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FournisseursPage() {
  const shop = useAppStore(s => s.shop)

  const [suppliers, setSuppliers] = useState([])
  const [transactions, setTransactions] = useState([])
  const [purchases, setPurchases] = useState([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [modal, setModal] = useState(false)
  const [paymentModal, setPaymentModal] = useState(false)
  const [editingTx, setEditingTx] = useState(null)
  const [txEditModal, setTxEditModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [loading, setLoading] = useState(true)
  const [periodFilter, setPeriodFilter] = useState('all')
  const [customDateStart, setCustomDateStart] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [customDateEnd, setCustomDateEnd] = useState(format(new Date(), 'yyyy-MM-dd'))

  const submittingRef = useRef(false)

  const {
    register,
    handleSubmit,
    reset,
    control,
  } = useForm()

  const {
    register: registerTx,
    handleSubmit: handleTxSubmit,
    reset: resetTx,
    control: controlTx,
  } = useForm({
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd'), amount: '' },
  })

  const load = useCallback(async () => {
    if (!shop?.id) return
    const [s, t, p] = await Promise.all([
      getAll('suppliers', shop.id),
      getAll('supplier_transactions', shop.id),
      getAll('purchases', shop.id),
    ])
    setSuppliers(s)
    setTransactions(t)
    setPurchases(p)
    setLoading(false)
  }, [shop?.id])

  useEffect(() => { load() }, [load])

  // Keep `selected` in sync after a reload (so balance refreshes)
  useEffect(() => {
    if (selected) {
      const refreshed = suppliers.find(s => s.id === selected.id)
      if (refreshed) setSelected(refreshed)
    }
  }, [suppliers])

  function supplierBalance(supplierId) {
    return transactions
      .filter(t => t.supplier_id === supplierId)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)
  }

  function normalizeText(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  }

  function purchaseBelongsToSupplier(purchase, supplier) {
    if (!purchase || !supplier) return false
    return (
      purchase.supplier_id === supplier.id ||
      normalizeText(purchase.supplier) === normalizeText(supplier.name)
    )
  }

  function getDateRange() {
    const today = new Date()
    switch (periodFilter) {
      case 'week': return { start: startOfWeek(today), end: endOfWeek(today) }
      case 'month': return { start: startOfMonth(today), end: endOfMonth(today) }
      case 'year': return { start: startOfYear(today), end: endOfYear(today) }
      case 'custom': return { start: parseISO(customDateStart), end: parseISO(customDateEnd) }
      default: return { start: new Date(1900, 0, 1), end: new Date(2100, 0, 1) }
    }
  }

  function openAddSupplier() {
    setEditingSupplier(null)
    reset({ name: '', phone: '', address: '' })
    setModal(true)
  }

  function openEditSupplier(supplier) {
    setEditingSupplier(supplier)
    reset({
      name: supplier.name || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
    })
    setModal(true)
  }

  async function onSaveSupplier(data) {
    if (submittingRef.current) return
    submittingRef.current = true
    try {
      const now = new Date().toISOString()
      const record = {
        id: editingSupplier?.id || uuid(),
        shop_id: shop.id,
        name: data.name.trim(),
        phone: data.phone || '',
        address: data.address || '',
        created_at: editingSupplier?.created_at || now,
        updated_at: now,
        sync_status: 'pending',
      }
      await localUpsert('suppliers', record)
      toast.success(editingSupplier ? 'Fournisseur modifié' : 'Fournisseur ajouté')
      setModal(false)
      setEditingSupplier(null)
      reset()
      await load()
    } catch (err) {
      toast.error(err.message || 'Erreur')
    } finally {
      submittingRef.current = false
    }
  }

  // Edit an existing transaction line (pencil icon in history table)
  async function onEditTx(data) {
    if (submittingRef.current) return
    submittingRef.current = true
    try {
      const amount = Number(data.amount)
      const signed = editingTx.type === 'credit' ? -Math.abs(amount) : Math.abs(amount)
      const now = new Date().toISOString()
      const record = {
        ...editingTx,
        date: data.date,
        label: data.label,
        amount: signed,
        updated_at: now,
        sync_status: 'pending',
      }
      await localUpsert('supplier_transactions', record)
      toast.success('Ligne modifiée')
      setTxEditModal(false)
      setEditingTx(null)
      resetTx({ date: format(new Date(), 'yyyy-MM-dd'), amount: '' })
      await load()
    } catch (err) {
      toast.error(err.message || 'Erreur')
    } finally {
      submittingRef.current = false
    }
  }

  function openEditTx(tx) {
    setEditingTx(tx)
    resetTx({
      date: tx.date || format(new Date(), 'yyyy-MM-dd'),
      label: tx.label || '',
      amount: String(Math.abs(Number(tx.amount || 0))),
    })
    setTxEditModal(true)
  }

  async function handleDeleteSupplier(supplier) {
    try {
      const relatedTransactions = transactions.filter(t => t.supplier_id === supplier.id)
      for (const tx of relatedTransactions) {
        await localDelete('supplier_transactions', tx.id)
      }
      await localDelete('suppliers', supplier.id)
      if (selected?.id === supplier.id) setSelected(null)
      toast.success('Fournisseur supprimé')
      setConfirm(null)
      await load()
    } catch (err) {
      toast.error(err.message || 'Suppression impossible')
    }
  }

  function handlePrintStatement() {
    window.print()
  }

  const supplierUnpaidPurchases = useMemo(() => {
    if (!selected) return []
    return purchases
      .filter(p => {
        if (!purchaseBelongsToSupplier(p, selected)) return false
        const total = Number(p.total_amount || 0)
        const paid = Number(p.paid_amount || 0)
        const remaining = p.remaining_amount !== undefined && p.remaining_amount !== null
          ? Number(p.remaining_amount)
          : total - paid
        return remaining > 0 && total > 0
      })
      .map(p => ({
        ...p,
        remaining_amount: p.remaining_amount !== undefined && p.remaining_amount !== null
          ? Number(p.remaining_amount)
          : Number(p.total_amount || 0) - Number(p.paid_amount || 0),
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [selected, purchases])

  const filtered = useMemo(() =>
    suppliers.filter(s =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search) ||
      s.address?.toLowerCase().includes(search.toLowerCase())
    ),
    [suppliers, search]
  )

  const withBalance = useMemo(() => {
    const list = filtered.map(s => ({ ...s, balance: supplierBalance(s.id) }))
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'name': return (a.name || '').localeCompare(b.name || '', 'fr')
        case 'balance-desc': return (b.balance || 0) - (a.balance || 0)
        case 'balance-asc': return (a.balance || 0) - (b.balance || 0)
        case 'phone': return (a.phone || '').localeCompare(b.phone || '', 'fr')
        case 'address': return (a.address || '').localeCompare(b.address || '', 'fr')
        default: return 0
      }
    })
  }, [filtered, transactions, sortBy])

  const totalDebt = useMemo(() =>
    suppliers.reduce((sum, s) => sum + Math.max(0, supplierBalance(s.id)), 0),
    [suppliers, transactions]
  )

  const supplierTx = useMemo(() => {
    if (!selected) return []
    const { start, end } = getDateRange()
    return transactions
      .filter(t =>
        t.supplier_id === selected.id &&
        isWithinInterval(parseISO(t.date), { start, end })
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [selected, transactions, periodFilter, customDateStart, customDateEnd])

  const selectedPurchases = useMemo(() => {
    if (!selected) return []
    return purchases
      .filter(p => purchaseBelongsToSupplier(p, selected))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [selected, purchases])

  // ─── Detail view (supplier selected) ───────────────────────────────────────
  if (selected) {
    const balance = supplierBalance(selected.id)

    return (
      <div className="p-6 print:p-0">
        {/* Header */}
        <div className="no-print flex items-center gap-3 mb-6">
          <button
            onClick={() => setSelected(null)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">{selected.name}</h1>
            <p className="text-gray-500 text-sm">{selected.phone || selected.address || '—'}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Btn variant="secondary" icon={Printer} onClick={handlePrintStatement}>
              Imprimer relevé
            </Btn>
            <Btn variant="secondary" icon={Pencil} onClick={() => openEditSupplier(selected)}>
              Modifier
            </Btn>
            <Btn
              icon={CreditCard}
              onClick={() => setPaymentModal(true)}
            >
              Régler une dette
            </Btn>
            <Btn variant="secondary" icon={Trash2} onClick={() => setConfirm(selected)}>
              Supprimer
            </Btn>
          </div>
        </div>

        {/* Print header */}
        <div className="print-only mb-8">
          <div className="flex justify-between items-start border-b border-gray-200 pb-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-gray-900">Relevé fournisseur</h1>
              <p className="text-sm text-gray-500 mt-1">{shop?.name}</p>
              {shop?.address && <p className="text-sm text-gray-500">{shop.address}</p>}
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">{selected.name}</p>
              {selected.phone && <p className="text-sm text-gray-500">{selected.phone}</p>}
              {selected.address && <p className="text-sm text-gray-500">{selected.address}</p>}
              <p className="text-sm text-gray-500 mt-1">
                Date : {format(new Date(), 'dd MMMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Solde actuel"
            value={formatFCFA(Math.abs(balance))}
            color={balance > 0 ? 'amber' : balance < 0 ? 'green' : 'blue'}
            sub={balance > 0 ? 'À payer au fournisseur' : balance < 0 ? 'Crédit fournisseur' : 'Solde nul'}
          />
          <StatCard
            label="Total dettes"
            value={formatFCFA(supplierTx.filter(t => t.amount > 0).reduce((s, t) => s + Number(t.amount || 0), 0))}
            color="red"
          />
          <StatCard
            label="Total payé"
            value={formatFCFA(Math.abs(supplierTx.filter(t => t.amount < 0).reduce((s, t) => s + Number(t.amount || 0), 0)))}
            color="green"
          />
          <StatCard
            label="Entrées de stock"
            value={selectedPurchases.length}
            color="purple"
            icon={ShoppingCart}
            sub={formatFCFA(selectedPurchases.reduce((s, p) => s + Number(p.total_amount || 0), 0))}
          />
        </div>

        {/* Transaction history */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-gray-800">Historique fournisseur</h3>
          </div>

          {/* Period filter */}
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Période</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {[
                { value: 'all', label: 'Tous les temps' },
                { value: 'week', label: 'Cette semaine' },
                { value: 'month', label: 'Ce mois' },
                { value: 'year', label: 'Cette année' },
                { value: 'custom', label: 'Personnalisé' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPeriodFilter(opt.value)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${periodFilter === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {periodFilter === 'custom' && (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={customDateStart}
                  onChange={e => setCustomDateStart(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="date"
                  value={customDateEnd}
                  onChange={e => setCustomDateEnd(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {supplierTx.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="Aucune transaction"
              description="Réglez une dette fournisseur pour commencer l'historique."
            />
          ) : (
            <table className="w-full text-sm table-zebra">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Date', 'Libellé', 'Type', 'Montant', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {supplierTx.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">
                      {format(new Date(tx.date), 'dd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{tx.label}</td>
                    <td className="px-4 py-3">
                      <Badge color={tx.amount > 0 ? 'red' : 'green'}>
                        {tx.amount > 0 ? 'Dette' : 'Paiement'}
                      </Badge>
                    </td>
                    <td className={`px-4 py-3 font-bold ${tx.amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {tx.amount > 0 ? '+' : ''}{formatFCFA(tx.amount)}
                    </td>
                    <td className="px-4 py-3 no-print">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => openEditTx(tx)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Modifier la ligne"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            await localDelete('supplier_transactions', tx.id)
                            toast.success('Ligne supprimée')
                            await load()
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="Supprimer la ligne"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={3} className="px-4 py-3 font-semibold text-gray-700">Solde</td>
                  <td className={`px-4 py-3 font-bold text-lg ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    {formatFCFA(balance)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Linked purchases */}
        <div className="card overflow-hidden mt-6">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-gray-800">Entrées de stock liées à ce fournisseur</h3>
          </div>

          {selectedPurchases.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Aucune entrée de stock"
              description="Aucune entrée de stock liée à ce fournisseur n'a été trouvée."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-zebra">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Date', 'Produit', 'Quantité', 'Prix unit.', 'Charges', 'Total', 'Paiement'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {selectedPurchases.map(p => {
                    const totalAmt = Number(p.total_amount || 0)
                    const paidAmt = Number(p.paid_amount || 0)
                    const remainingAmt = Number(p.remaining_amount || 0)
                    const isPartial = paidAmt > 0 && remainingAmt > 0
                    const isPaid = remainingAmt === 0

                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {format(new Date(p.date), 'dd MMM yyyy', { locale: fr })}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{p.product_name || '—'}</p>
                          {p.product_code && <p className="text-xs text-gray-400">{p.product_code}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{p.quantity}</td>
                        <td className="px-4 py-3 text-gray-700">{formatFCFA(p.unit_price || 0)}</td>
                        <td className="px-4 py-3 text-gray-700">{formatFCFA(p.charge_total || 0)}</td>
                        <td className="px-4 py-3 font-bold text-gray-900">{formatFCFA(totalAmt)}</td>
                        <td className="px-4 py-3">
                          {isPaid ? (
                            <Badge color="green">Payé</Badge>
                          ) : isPartial ? (
                            <div className="inline-flex flex-col">
                              <Badge color="amber">Partiel</Badge>
                              <span className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">
                                {formatFCFA(paidAmt)} / {formatFCFA(totalAmt)}
                              </span>
                              <span className="text-xs text-red-500 font-medium whitespace-nowrap">
                                reste {formatFCFA(remainingAmt)}
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex flex-col">
                              <Badge color="red">Non réglé</Badge>
                              <span className="text-xs text-red-500 font-medium mt-0.5 whitespace-nowrap">
                                {formatFCFA(remainingAmt)} dû
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment modal */}
        <PaymentModal
          open={paymentModal}
          onClose={() => setPaymentModal(false)}
          supplier={selected}
          purchases={supplierUnpaidPurchases}
          shop={shop}
          onSaved={load}
        />

        {/* Edit transaction modal (pencil in history) */}
        <Modal
          open={txEditModal}
          onClose={() => { setTxEditModal(false); setEditingTx(null) }}
          title="Modifier la ligne"
          maxW="max-w-md"
        >
          <form onSubmit={handleTxSubmit(onEditTx)} className="space-y-4">
            <FormField label="Date" required>
              <input {...registerTx('date', { required: true })} type="date" className={inputCls} />
            </FormField>
            <FormField label="Libellé" required>
              <input {...registerTx('label', { required: true })} placeholder="Ex: Achat stock, règlement…" className={inputCls} />
            </FormField>
            <FormField label="Montant (FCFA)" required>
              <Controller
                name="amount"
                control={controlTx}
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
            <div className="flex gap-3 justify-end pt-2">
              <Btn variant="secondary" onClick={() => { setTxEditModal(false); setEditingTx(null) }}>Annuler</Btn>
              <Btn type="submit">Enregistrer</Btn>
            </div>
          </form>
        </Modal>

        {/* Supplier form modal */}
        <SupplierModal
          modal={modal}
          setModal={setModal}
          editingSupplier={editingSupplier}
          setEditingSupplier={setEditingSupplier}
          handleSubmit={handleSubmit}
          onSaveSupplier={onSaveSupplier}
          register={register}
          reset={reset}
          control={control}
        />

        <ConfirmDialog
          open={!!confirm}
          onClose={() => setConfirm(null)}
          onConfirm={() => handleDeleteSupplier(confirm)}
          title="Supprimer le fournisseur"
          message="Le fournisseur et son historique seront supprimés."
        />

        <style jsx global>{`
          @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            body { background: white !important; }
          }
          @media screen {
            .print-only { display: none !important; }
          }
        `}</style>
      </div>
    )
  }

  // ─── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      <PageHeader
        title="Fournisseurs"
        subtitle={`${suppliers.length} fournisseur${suppliers.length !== 1 ? 's' : ''}`}
        action={<Btn icon={Plus} onClick={openAddSupplier}>Nouveau fournisseur</Btn>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total fournisseurs" value={suppliers.length} color="blue" icon={Truck} />
        <StatCard label="Dettes fournisseurs" value={formatFCFA(totalDebt)} color="amber" />
        <StatCard label="Avec solde dû" value={suppliers.filter(s => supplierBalance(s.id) > 0).length} color="red" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex-1 max-w-xs">
            <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un fournisseur…" />
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className={inputCls + ' max-w-xs'}
          >
            <option value="name">Trier par : Nom (A-Z)</option>
            <option value="balance-desc">Trier par : Dettes décroissantes</option>
            <option value="balance-asc">Trier par : Dettes croissantes</option>
            <option value="phone">Trier par : Téléphone</option>
            <option value="address">Trier par : Adresse</option>
          </select>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Chargement…</div>
        ) : withBalance.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="Aucun fournisseur"
            description="Ajoutez vos fournisseurs pour suivre les dettes."
            action={<Btn icon={Plus} onClick={openAddSupplier}>Ajouter un fournisseur</Btn>}
          />
        ) : (
          <div className="divide-y divide-gray-50 zebra-list">
            {withBalance.map(s => (
              <div
                key={s.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setSelected(s)}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-none"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {(s.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.phone || s.address || '—'}</p>
                </div>
                <div className="text-right">
                  {s.balance !== 0 ? (
                    <>
                      <p className={`font-bold ${s.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatFCFA(Math.abs(s.balance))}
                      </p>
                      <p className="text-xs text-gray-400">{s.balance > 0 ? 'à payer' : 'crédit'}</p>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">Solde nul</span>
                  )}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); openEditSupplier(s) }}
                  className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
                  title="Modifier"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setConfirm(s) }}
                  className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-none" />
              </div>
            ))}
          </div>
        )}
      </div>

      <SupplierModal
        modal={modal}
        setModal={setModal}
        editingSupplier={editingSupplier}
        setEditingSupplier={setEditingSupplier}
        handleSubmit={handleSubmit}
        onSaveSupplier={onSaveSupplier}
        register={register}
        reset={reset}
        control={control}
      />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => handleDeleteSupplier(confirm)}
        title="Supprimer le fournisseur"
        message="Le fournisseur et son historique seront supprimés."
      />
    </div>
  )
}

// ─── Supplier form modal (unchanged) ─────────────────────────────────────────
function SupplierModal({
  modal,
  setModal,
  editingSupplier,
  setEditingSupplier,
  handleSubmit,
  onSaveSupplier,
  register,
  reset,
  control,
}) {
  return (
    <Modal
      open={modal}
      onClose={() => { setModal(false); setEditingSupplier(null) }}
      title={editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
      maxW="max-w-md"
    >
      <form onSubmit={handleSubmit(onSaveSupplier)} className="space-y-4">
        <FormField label="Nom du fournisseur" required>
          <input
            {...register('name', { required: 'Requis' })}
            placeholder="Ex: Fournisseur principal"
            className={inputCls}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Téléphone">
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="99 12 34 56"
                  className={inputCls}
                />
              )}
            />
          </FormField>
          <FormField label="Adresse">
            <input {...register('address')} placeholder="Ex: Niamey" className={inputCls} />
          </FormField>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Btn
            variant="secondary"
            onClick={() => { setModal(false); setEditingSupplier(null); reset() }}
          >
            Annuler
          </Btn>
          <Btn type="submit">{editingSupplier ? 'Enregistrer' : 'Ajouter'}</Btn>
        </div>
      </form>
    </Modal>
  )
}