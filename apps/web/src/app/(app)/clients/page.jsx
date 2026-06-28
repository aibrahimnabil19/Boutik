'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { v4 as uuid } from 'uuid'
import { toast } from 'sonner'
import {
  Users,
  Plus,
  Trash2,
  ChevronRight,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Printer,
  FileText,
  ShoppingBag,
  Pencil,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { getAll, localUpsert, localDelete } from '@/lib/db/local'
import { calculateStock, formatFCFA } from '@/lib/core/calculations'
import {
  PageHeader, SearchBar, Modal, FormField, EmptyState,
  ConfirmDialog, Btn, StatCard, Badge, inputCls
} from '@/components/ui'
import FrenchInput from '@/components/FrenchInput'
import PhoneInput from '@/components/PhoneInput'

export default function ClientsPage() {
  const shop = useAppStore(s => s.shop)
  const [clients, setClients] = useState([])
  const [transactions, setTransactions] = useState([])
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [purchases, setPurchases] = useState([])
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState('alpha')
  const [modal, setModal] = useState(false)
  const [txModal, setTxModal] = useState(false)
  const [editingTx, setEditingTx] = useState(null)
  const [selected, setSelected] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [editingClient, setEditingClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const submittingRef = useRef(false)

  const { register, handleSubmit, reset, control } = useForm({
    defaultValues: {
      name: '',
      phone: '',
      address: '',
      date: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const {
    register: registerTx,
    handleSubmit: handleTxSubmit,
    reset: resetTx,
    control: controlTx,
  } = useForm({
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd'), type: 'debit', amount: '' }
  })

  // Replace the `load` useCallback in ClientsPage with this version.
//
// Bug: setLoading(false) was only reached if shop?.id was truthy AND
// every getAll() call succeeded. Any thrown error in the Promise.all,
// or a falsy shop?.id, left `loading` stuck at `true` forever — this is
// the "Chargement..." that never resolves.
//
// Fix: try/finally guarantees setLoading(false) always runs. Errors are
// surfaced via toast instead of silently hanging. The falsy shop?.id case
// now also clears loading (with empty data) instead of returning early.

const load = useCallback(async () => {
  if (!shop?.id) {
    setLoading(false)
    return
  }

  setLoading(true)

  try {
    const [c, t, s, p, pu] = await Promise.all([
      getAll('clients', shop.id),
      getAll('client_transactions', shop.id),
      getAll('sales', shop.id),
      getAll('products', shop.id),
      getAll('purchases', shop.id),
    ])

    setClients(c)
    setTransactions(t)
    setSales(s)
    setProducts(p)
    setPurchases(pu)
  } catch (err) {
    console.error('[ClientsPage load failed]', err)
    toast.error(err.message || 'Erreur de chargement des clients')
  } finally {
    setLoading(false)
  }
}, [shop?.id])

  useEffect(() => { load() }, [load])

  function clientBalance(clientId) {
    return transactions
      .filter(t => t.client_id === clientId)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)
  }

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase()
  }

  const selectedSales = useMemo(() => {
    if (!selected) return []

    const selectedName = normalizeText(selected.name)

    return sales
      .filter((s) => normalizeText(s.client_name) === selectedName)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [sales, selected])

  const salesSummary = useMemo(() => {
    const totalSales = selectedSales.reduce((sum, s) => sum + Number(s.total_sale || 0), 0)
    const totalProfit = selectedSales.reduce((sum, s) => sum + Number(s.profit || 0), 0)
    const totalQty = selectedSales.reduce((sum, s) => sum + Number(s.quantity || 0), 0)

    return {
      totalSales,
      totalProfit,
      totalQty,
      count: selectedSales.length,
    }
  }, [selectedSales])

  async function onAddClient(data) {
    if (submittingRef.current) return
    submittingRef.current = true

    try {
      const now = new Date().toISOString()

      const record = {
        id: editingClient?.id || uuid(),
        shop_id: shop.id,
        name: data.name.trim(),
        phone: data.phone || '',
        address: data.address || '',
        created_at: editingClient?.created_at || now,
        updated_at: now,
        sync_status: 'pending',
      }

      await localUpsert('clients', record)
      toast.success(editingClient ? 'Client modifié' : 'Client ajouté')
      setModal(false)
      setEditingClient(null)
      reset()
      setTimeout(() => load(), 500)
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
      const signed =
        data.type === 'credit' || data.type === 'advance_product'
          ? -Math.abs(amount)
          : Math.abs(amount)
      const now = new Date().toISOString()

      const record = {
        id: editingTx?.id || uuid(),
        shop_id: shop.id,
        client_id: selected.id,
        date: data.date,
        label:
          data.label ||
          (data.type === 'advance_product'
            ? 'Avance pour achat futur'
            : data.type === 'credit'
              ? 'Paiement client'
              : 'Créance client'),
        amount: signed,
        type: data.type,
        created_at: editingTx?.created_at || now,
        updated_at: now,
        sync_status: 'pending',
      }

      await localUpsert('client_transactions', record)
      toast.success(editingTx ? 'Ligne modifiée' : data.type === 'credit' ? 'Paiement enregistré' : 'Créance ajoutée')

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

  async function handleDeleteClient(client) {
    try {
      const relatedTransactions = transactions.filter(t => t.client_id === client.id)

      for (const tx of relatedTransactions) {
        await localDelete('client_transactions', tx.id)
      }

      await localDelete('clients', client.id)

      if (selected?.id === client.id) {
        setSelected(null)
      }

      toast.success('Client supprimé')
      setConfirm(null)
      setTimeout(() => load(), 500)
    } catch (err) {
      toast.error(err.message || 'Suppression impossible')
    }
  }

  function handlePrintStatement() {
    window.print()
  }

  function openEditClient(client) {
    setEditingClient(client)
    reset({
      name: client.name || '',
      phone: client.phone || '',
      address: client.address || '',
    })
    setModal(true)
  }

  const filtered = useMemo(() =>
    clients.filter(c =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    ),
    [clients, search]
  )

  const withBalance = useMemo(() => {
    const list = filtered.map(c => ({ ...c, balance: clientBalance(c.id) }))

    return list.sort((a, b) => {
      const alpha = String(a.name || '').localeCompare(String(b.name || ''), 'fr', { sensitivity: 'base' })

      if (sortMode === 'alpha') return alpha
      if (sortMode === 'debt_desc') return Math.max(0, b.balance) - Math.max(0, a.balance) || alpha
      if (sortMode === 'debt_asc') return Math.max(0, a.balance) - Math.max(0, b.balance) || alpha
      if (sortMode === 'credit_desc') return Math.max(0, -b.balance) - Math.max(0, -a.balance) || alpha
      if (sortMode === 'recent') return new Date(b.created_at || 0) - new Date(a.created_at || 0)

      return alpha
    })
  }, [filtered, transactions, sortMode])

  const totalCreances = useMemo(() =>
    clients.reduce((s, c) => s + Math.max(0, clientBalance(c.id)), 0),
    [clients, transactions]
  )

  const clientTx = useMemo(() =>
    selected
      ? transactions
        .filter(t => t.client_id === selected.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
      : [],
    [selected, transactions]
  )

  if (selected) {
    const balance = clientBalance(selected.id)
    const clientCredit = Math.max(0, -balance)

    const affordableProducts = products
      .map(product => ({
        ...product,
        currentStock: calculateStock(product, purchases, sales),
        salePrice: Number(product.sale_price || 0),
      }))
      .filter(product =>
        product.salePrice > 0 &&
        product.currentStock > 0 &&
        product.salePrice <= clientCredit
      )
      .sort((a, b) => Number(b.salePrice || 0) - Number(a.salePrice || 0))

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
            <Btn icon={Plus} onClick={() => {
              setEditingTx(null)
              resetTx({
                date: format(new Date(), 'yyyy-MM-dd'),
                type: 'credit',
                label: 'Règlement créance',
                amount: '',
              })
              setTxModal(true)
            }}>
              Régler créance
            </Btn>
            <Btn
              variant="secondary"
              icon={Pencil}
              onClick={() => openEditClient(selected)}
            >
              Modifier
            </Btn>
            <Btn
              variant="secondary"
              icon={Trash2}
              onClick={() => setConfirm(selected)}
            >
              Supprimer
            </Btn>
          </div>
        </div>

        <div className="print-only mb-8">
          <div className="flex justify-between items-start border-b border-gray-200 pb-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-gray-900">Relevé client</h1>
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
            sub={balance > 0 ? '⚠ Client doit payer' : balance < 0 ? '✓ Crédit client' : 'Solde nul'}
          />
          <StatCard
            label="Total dû"
            value={formatFCFA(Math.max(0, balance))}
            color="red"
            sub={balance > 0 ? 'Restant à payer' : 'Aucune dette en cours'}
          />
          <StatCard
            label="Achats enregistrés"
            value={salesSummary.count}
            color="blue"
            sub={formatFCFA(salesSummary.totalSales)}
          />
          <StatCard
            label="Avance disponible"
            value={formatFCFA(clientCredit)}
            color="green"
            sub="Pour achat futur"
          />
        </div>

        {clientCredit > 0 && (
          <div className="card p-5 mb-6 border border-emerald-100">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Crédit disponible du client</h3>
                <p className="text-sm text-gray-500">
                  Ce montant peut être utilisé pour payer une prochaine vente.
                </p>
              </div>

              <p className="font-display text-xl font-bold text-emerald-600">
                {formatFCFA(clientCredit)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Produits que ce crédit peut acheter
              </p>

              {affordableProducts.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Aucun produit en stock avec un prix de vente inférieur ou égal à ce crédit.
                </p>
              ) : (
                <div className="grid md:grid-cols-2 gap-2">
                  {affordableProducts.slice(0, 8).map(product => (
                    <div key={product.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-400">
                        Stock : {product.currentStock} · Prix : {formatFCFA(product.salePrice)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold text-gray-800">Historique des transactions</h3>
            </div>

            {clientTx.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Aucune transaction"
                description="Ajoutez une créance ou un paiement."
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
                  {clientTx.map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">
                        {format(new Date(tx.date), 'dd MMM yyyy', { locale: fr })}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{tx.label}</td>
                      <td className="px-4 py-3">
                        <Badge color={tx.amount > 0 ? 'red' : tx.type === 'advance_product' ? 'blue' : 'green'}>
                          {tx.amount > 0
                            ? 'Créance'
                            : tx.type === 'advance_product'
                              ? 'Avance produit'
                              : 'Paiement'}
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
                              await localDelete('client_transactions', tx.id)
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
                    <td colSpan={4} className="px-4 py-3 font-semibold text-gray-700">Solde</td>
                    <td className={`px-4 py-3 font-bold text-lg ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                      {formatFCFA(balance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-500" />
              <h3 className="font-semibold text-gray-800">Détail des achats du client</h3>
            </div>

            {selectedSales.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="Aucun achat trouvé"
                description="Aucune vente liée à ce client n’a été trouvée."
              />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <div>
                    <p className="text-xs text-gray-500">Nombre de lignes</p>
                    <p className="font-bold text-gray-900">{salesSummary.count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Quantité totale</p>
                    <p className="font-bold text-gray-900">{salesSummary.totalQty}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Montant total</p>
                    <p className="font-bold text-gray-900">{formatFCFA(salesSummary.totalSales)}</p>
                  </div>
                </div>

                <table className="w-full text-sm table-zebra">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Date', 'Produit', 'Qté', 'PU', 'Total'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {selectedSales.map(sale => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500">
                          {format(new Date(sale.date), 'dd MMM yyyy', { locale: fr })}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {sale.product_name || '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {sale.quantity}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {formatFCFA(sale.unit_sale_price || 0)}
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">
                          {formatFCFA(sale.total_sale || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td colSpan={4} className="px-4 py-3 font-semibold text-gray-700">Total achats</td>
                      <td className="px-4 py-3 font-bold text-lg text-gray-900">
                        {formatFCFA(salesSummary.totalSales)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </>
            )}
          </div>
        </div>

        <Modal open={txModal} onClose={() => setTxModal(false)} title={editingTx ? 'Modifier la ligne' : 'Nouvelle ligne'} maxW="max-w-md">
          <form onSubmit={handleTxSubmit(onAddTx)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Date" required>
                <input {...registerTx('date', { required: true })} type="date" className={inputCls} />
              </FormField>
              <FormField label="Type" required>
                <select {...registerTx('type')} className={inputCls}>
                  <option value="debit">Créance (client doit)</option>
                  <option value="credit">Paiement d’une créance</option>
                </select>
              </FormField>
            </div>

            <FormField label="Libellé" required>
              <input {...registerTx('label', { required: true })} placeholder="Ex: Facture N°01, Règlement..." className={inputCls} />
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
          onConfirm={() => handleDeleteClient(confirm)}
          title="Supprimer le client"
          message="Le client et son historique de créances/paiements seront supprimés."
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
        title="Clients"
        subtitle={`${clients.length} client${clients.length !== 1 ? 's' : ''}`}
        action={<Btn icon={Plus} onClick={() => {
          setEditingClient(null)
          reset({ name: '', phone: '', address: '' })
          setModal(true)
        }}>
          Nouveau client
        </Btn>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total clients" value={clients.length} color="blue" icon={Users} />
        <StatCard label="Créances totales" value={formatFCFA(totalCreances)} color="amber" icon={TrendingUp} />
        <StatCard
          label="Avec solde dû"
          value={clients.filter(c => clientBalance(c.id) > 0).length}
          color="red"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex-1 min-w-[220px] max-w-xs">
            <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un client…" />
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
              <option value="debt_desc">Plus grosse dette</option>
              <option value="debt_asc">Plus petite dette</option>
              <option value="credit_desc">Plus gros crédit client</option>
              <option value="recent">Plus récent</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Chargement…</div>
        ) : withBalance.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun client"
            description="Ajoutez vos clients pour suivre leurs créances."
            action={<Btn icon={Plus} onClick={() => setModal(true)}>Ajouter un client</Btn>}
          />
        ) : (
          <div className="divide-y divide-gray-50 zebra-list">
            {withBalance.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setSelected(c)}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-none"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {(c.name || '?')[0].toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.phone || c.address || '—'}</p>
                </div>

                <div className="text-right">
                  {c.balance !== 0 ? (
                    <>
                      <p className={`font-bold ${c.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatFCFA(Math.abs(c.balance))}
                      </p>
                      <p className="text-xs text-gray-400">{c.balance > 0 ? 'à payer' : 'crédit'}</p>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">Solde nul</span>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openEditClient(c)
                  }}
                  className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
                  title="Modifier"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirm(c)
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

      <Modal
        open={modal}
        onClose={() => {
          setModal(false)
          setEditingClient(null)
        }}
        title={editingClient ? 'Modifier le client' : 'Nouveau client'}
        maxW="max-w-md"
      >
        <form onSubmit={handleSubmit(onAddClient)} className="space-y-4">
          <FormField label="Nom du client" required>
            <input {...register('name', { required: 'Requis' })} placeholder="Ex: Energie Plus" className={inputCls} />
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
              <input
                {...register('address')}
                placeholder="Ex: Niamey"
                className={inputCls}
              />
            </FormField>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="secondary" onClick={() => setModal(false)}>Annuler</Btn>
            <Btn type="submit">{editingClient ? 'Enregistrer' : 'Ajouter'}</Btn>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => handleDeleteClient(confirm)}
        title="Supprimer le client"
        message="Le client et son historique de créances/paiements seront supprimés."
      />
    </div>
  )
}