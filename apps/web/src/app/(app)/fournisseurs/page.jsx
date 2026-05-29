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
} from 'lucide-react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, isWithinInterval } from 'date-fns'
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

export default function FournisseursPage() {
  const shop = useAppStore(s => s.shop)

  const [suppliers, setSuppliers] = useState([])
  const [transactions, setTransactions] = useState([])
  const [purchases, setPurchases] = useState([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [modal, setModal] = useState(false)
  const [txModal, setTxModal] = useState(false)
  const [editingTx, setEditingTx] = useState(null)
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
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd'), type: 'debit', amount: '' },
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

  async function onAddTx(data) {
    if (submittingRef.current) return
    submittingRef.current = true

    try {
      const amount = Number(data.amount)
      const signed = data.type === 'credit' ? -Math.abs(amount) : Math.abs(amount)
      const now = new Date().toISOString()

      const record = {
        id: editingTx?.id || uuid(),
        shop_id: shop.id,
        supplier_id: selected.id,
        date: data.date,
        label: data.label,
        amount: signed,
        type: data.type,
        created_at: editingTx?.created_at || now,
        updated_at: now,
        sync_status: 'pending',
      }

      await localUpsert('supplier_transactions', record)
      toast.success(editingTx ? 'Ligne fournisseur modifiée' : data.type === 'credit' ? 'Paiement fournisseur enregistré' : 'Dette fournisseur ajoutée')

      setTxModal(false)
      setEditingTx(null)
      resetTx({ date: format(new Date(), 'yyyy-MM-dd'), type: 'debit', amount: '', label: '' })
      setTimeout(() => load(), 500)
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
      type: Number(tx.amount || 0) < 0 ? 'credit' : 'debit',
      label: tx.label || '',
      amount: String(Math.abs(Number(tx.amount || 0))),
    })
    setTxModal(true)
  }

  async function handleDeleteSupplier(supplier) {
    try {
      const relatedTransactions = transactions.filter(t => t.supplier_id === supplier.id)

      for (const tx of relatedTransactions) {
        await localDelete('supplier_transactions', tx.id)
      }

      await localDelete('suppliers', supplier.id)

      if (selected?.id === supplier.id) {
        setSelected(null)
      }

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

  const filtered = useMemo(() =>
    suppliers.filter(s =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search) ||
      s.address?.toLowerCase().includes(search.toLowerCase())
    ),
    [suppliers, search]
  )

  const withBalance = useMemo(() => {
    const suppliers = filtered.map(s => ({ ...s, balance: supplierBalance(s.id) }))

    const sorted = [...suppliers].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '', 'fr')
        case 'balance-desc':
          return (b.balance || 0) - (a.balance || 0)
        case 'balance-asc':
          return (a.balance || 0) - (b.balance || 0)
        case 'phone':
          return (a.phone || '').localeCompare(b.phone || '', 'fr')
        case 'address':
          return (a.address || '').localeCompare(b.address || '', 'fr')
        default:
          return 0
      }
    })

    return sorted
  }, [filtered, transactions, sortBy])

  const totalDebt = useMemo(() =>
    suppliers.reduce((sum, s) => sum + Math.max(0, supplierBalance(s.id)), 0),
    [suppliers, transactions]
  )

  const supplierTx = useMemo(() => {
    if (!selected) return []
    const { start, end } = getDateRange()
    return transactions
      .filter(t => t.supplier_id === selected.id && isWithinInterval(parseISO(t.date), { start, end }))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [selected, transactions, periodFilter, customDateStart, customDateEnd])

  const selectedPurchases = useMemo(() => {
    if (!selected) return []

    return purchases
      .filter(p => purchaseBelongsToSupplier(p, selected))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [selected, purchases])

  if (selected) {
    const balance = supplierBalance(selected.id)

    return (
      <div className="p-6 print:p-0">
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
            <Btn icon={Plus} onClick={() => {
              resetTx({ date: format(new Date(), 'yyyy-MM-dd'), type: 'debit', amount: '' })
              setTxModal(true)
            }}>
              Nouvelle ligne
            </Btn>
            <Btn variant="secondary" icon={Trash2} onClick={() => setConfirm(selected)}>
              Supprimer
            </Btn>
          </div>
        </div>

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

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-gray-800">Historique fournisseur</h3>
          </div>

          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Période</p>
            <div className="flex flex-wrap gap-2 mb-2">
              <button onClick={() => setPeriodFilter('all')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${periodFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                Tous les temps
              </button>
              <button onClick={() => setPeriodFilter('week')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${periodFilter === 'week' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                Cette semaine
              </button>
              <button onClick={() => setPeriodFilter('month')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${periodFilter === 'month' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                Ce mois
              </button>
              <button onClick={() => setPeriodFilter('year')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${periodFilter === 'year' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                Cette année
              </button>
              <button onClick={() => setPeriodFilter('custom')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${periodFilter === 'custom' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                Personnalisé
              </button>
            </div>
            {periodFilter === 'custom' && (
              <div className="flex gap-2">
                <input type="date" value={customDateStart} onChange={e => setCustomDateStart(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input type="date" value={customDateEnd} onChange={e => setCustomDateEnd(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            )}
          </div>

          {supplierTx.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="Aucune transaction"
              description="Ajoutez une dette ou un paiement fournisseur."
            />
          ) : (
            <table className="w-full text-sm table-zebra">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Date', 'Libellé', 'Type', 'Montant'].map(h => (
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
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <div className="card overflow-hidden mt-6">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-gray-800">Entrées de stock liées à ce fournisseur</h3>
          </div>

          {selectedPurchases.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Aucune entrée de stock"
              description="Aucune entrée de stock liée à ce fournisseur n’a été trouvée."
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
                  {selectedPurchases.map(p => (
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
                      <td className="px-4 py-3 font-bold text-gray-900">{formatFCFA(p.total_amount || 0)}</td>
                      <td className="px-4 py-3">
                        <Badge color={Number(p.remaining_amount || 0) > 0 ? 'amber' : 'green'}>
                          {Number(p.remaining_amount || 0) > 0 ? `Crédit ${formatFCFA(p.remaining_amount)}` : 'Payé'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

        <Modal open={txModal} onClose={() => setTxModal(false)} title="Nouvelle ligne fournisseur" maxW="max-w-md">
          <form onSubmit={handleTxSubmit(onAddTx)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Date" required>
                <input {...registerTx('date', { required: true })} type="date" className={inputCls} />
              </FormField>
              <FormField label="Type" required>
                <select {...registerTx('type')} className={inputCls}>
                  <option value="debit">Dette fournisseur</option>
                  <option value="credit">Paiement fournisseur</option>
                </select>
              </FormField>
            </div>

            <FormField label="Libellé" required>
              <input {...registerTx('label', { required: true })} placeholder="Ex: Achat stock, règlement..." className={inputCls} />
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
              <Btn variant="secondary" onClick={() => setTxModal(false)}>Annuler</Btn>
              <Btn type="submit">Enregistrer</Btn>
            </div>
          </form>
        </Modal>

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
            onChange={(e) => setSortBy(e.target.value)}
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
                  onClick={(e) => {
                    e.stopPropagation()
                    openEditSupplier(s)
                  }}
                  className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
                  title="Modifier"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirm(s)
                  }}
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
      onClose={() => {
        setModal(false)
        setEditingSupplier(null)
      }}
      title={editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
      maxW="max-w-md"
    >
      <form onSubmit={handleSubmit(onSaveSupplier)} className="space-y-4">
        <FormField label="Nom du fournisseur" required>
          <input {...register('name', { required: 'Requis' })} placeholder="Ex: Fournisseur principal" className={inputCls} />
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
            onClick={() => {
              setModal(false)
              setEditingSupplier(null)
              reset()
            }}
          >
            Annuler
          </Btn>
          <Btn type="submit">{editingSupplier ? 'Enregistrer' : 'Ajouter'}</Btn>
        </div>
      </form>
    </Modal>
  )
}