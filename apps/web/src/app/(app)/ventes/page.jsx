'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { v4 as uuid } from 'uuid'
import { toast } from 'sonner'
import { TrendingUp, Plus, Trash2, XCircle, PlusCircle, FileText, Printer, Receipt, Truck } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { getAll, localUpsert, localDelete, cancelSale } from '@/lib/db/local'
import { formatFCFA, formatNumber } from '@/lib/core/calculations'
import {
  PageHeader, SearchBar, Modal, FormField, EmptyState,
  ConfirmDialog, Btn, StatCard, Badge, inputCls, selectCls
} from '@/components/ui'
import { printSaleDocument } from '@/lib/core/invoicePrint'
import FrenchInput from '@/components/FrenchInput'

function computeStock(product, purchases, sales) {
  const bought = purchases
    .filter((p) => p.product_id === product.id)
    .reduce((a, p) => a + Number(p.quantity || 0), 0)
  const sold = sales
    .filter((s) => s.product_id === product.id && !s.cancelled_at)
    .reduce((a, s) => a + Number(s.quantity || 0), 0)
  return Number(product.stock_initial || 0) + bought - sold
}

const emptyLine = () => ({
  _key: uuid(),
  product_id: '',
  product_name: '',
  product_code: '',
  unit_cost: 0,
  quantity: 1,
  unit_sale_price: '',
})

// Document types available after a sale
const SALE_DOC_TYPES = [
  { key: 'proforma', label: 'Facture proforma', icon: FileText, description: 'Devis / offre de prix' },
  { key: 'facture', label: 'Facture définitive', icon: Receipt, description: 'Document officiel de vente' },
  { key: 'bon_livraison', label: 'Bon de livraison', icon: Truck, description: 'Document de remise des articles' },
  { key: 'bon_commande', label: 'Bon de commande', icon: FileText, description: 'Document de commande lié à la vente' },
]

export default function VentesPage() {
  const shop = useAppStore(s => s.shop)
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [purchases, setPurchases] = useState([])
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [loading, setLoading] = useState(true)
  // Document modal
  const [docModal, setDocModal] = useState(null) // { group } - the sale group to print

  const [cart, setCart] = useState([emptyLine()])
  const [saleDate, setSaleDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [saleStore, setSaleStore] = useState('')
  const [saleClientId, setSaleClientId] = useState('')
  const [paymentMode, setPaymentMode] = useState('paid')
  const [paidAmount, setPaidAmount] = useState('')

  const load = useCallback(async () => {
    if (!shop?.id) return
    const [s, p, pu, c] = await Promise.all([
      getAll('sales', shop.id),
      getAll('products', shop.id),
      getAll('purchases', shop.id),
      getAll('clients', shop.id),
    ])
    setSales(s.sort((a, b) => new Date(b.date) - new Date(a.date)))
    setProducts(p)
    setPurchases(pu)
    setClients(c)
    setLoading(false)
  }, [shop?.id])

  useEffect(() => { load() }, [load])

  // ─── Cart helpers ──────────────────────────────────────────────────────────
  function updateLine(key, field, value) {
    setCart(prev => prev.map(line =>
      line._key === key ? { ...line, [field]: value } : line
    ))
  }

  function selectProductForLine(key, productId) {
    const prod = products.find(p => p.id === productId)
    if (!prod) return
    setCart(prev => prev.map(line =>
      line._key === key ? {
        ...line,
        product_id: prod.id,
        product_name: prod.name,
        product_code: prod.code || '',
        unit_cost: prod.purchase_price || 0,
        unit_sale_price: prod.sale_price || '',
      } : line
    ))
  }

  function removeLine(key) {
    if (cart.length === 1) return
    setCart(prev => prev.filter(l => l._key !== key))
  }

  function addLine() {
    setCart(prev => [...prev, emptyLine()])
  }

  const cartTotals = useMemo(() => cart.reduce((acc, line) => {
    const qty = Number(line.quantity || 0)
    const price = Number(line.unit_sale_price || 0)
    const cost = Number(line.unit_cost || 0)
    return {
      revenue: acc.revenue + qty * price,
      cost: acc.cost + qty * cost,
      profit: acc.profit + (qty * price - qty * cost),
    }
  }, { revenue: 0, cost: 0, profit: 0 }), [cart])

  const paidPreview = paymentMode === 'credit'
    ? Math.max(0, Number(paidAmount || 0))
    : cartTotals.revenue

  const remainingPreview = Math.max(0, cartTotals.revenue - paidPreview)

  // ─── Submit ────────────────────────────────────────────────────────────────
  async function onSubmit(e) {
    e.preventDefault()

    for (const line of cart) {
      if (!line.product_id) {
        toast.error('Sélectionnez un produit pour chaque ligne')
        return
      }
      if (!line.unit_sale_price || Number(line.unit_sale_price) <= 0) {
        toast.error(`Prix manquant pour ${line.product_name}`)
        return
      }
    }

    const requestedByProduct = new Map()

    for (const line of cart) {
      const q = Number(line.quantity || 0)

      if (q <= 0) {
        toast.error(`Quantité invalide pour ${line.product_name}`)
        return
      }

      requestedByProduct.set(
        line.product_id,
        (requestedByProduct.get(line.product_id) || 0) + q
      )
    }

    for (const [productId, requestedQty] of requestedByProduct.entries()) {
      const prod = products.find(p => p.id === productId)
      if (!prod) continue

      const currentStock = computeStock(prod, purchases, sales)

      if (requestedQty > currentStock) {
        toast.error(`Stock insuffisant pour ${prod.name}. Disponible : ${formatNumber(currentStock)}`)
        return
      }
    }

    const selectedClient = clients.find(c => c.id === saleClientId) || null
    const totalPaid = paymentMode === 'credit'
      ? Math.max(0, Number(paidAmount || 0))
      : cartTotals.revenue
    const remainingAmount = Math.max(0, cartTotals.revenue - totalPaid)
    const paymentStatus = remainingAmount > 0 ? 'credit' : 'paid'

    if (paymentStatus === 'credit' && !selectedClient) {
      toast.error('Choisissez un client pour enregistrer une vente à crédit.')
      return
    }

    if (totalPaid > cartTotals.revenue) {
      toast.error('Le montant payé ne peut pas dépasser le total de la vente.')
      return
    }

    const sessionId = uuid()
    const now = new Date().toISOString()

    try {
      const savedSales = []
      for (const line of cart) {
        const q = Number(line.quantity)
        const price = Number(line.unit_sale_price)
        const cost = Number(line.unit_cost)
        const lineTotal = q * price
        const linePaid = cartTotals.revenue > 0
          ? Math.round((lineTotal / cartTotals.revenue) * totalPaid)
          : 0
        const lineRemaining = Math.max(0, lineTotal - linePaid)
        const saleRecord = {
          id: uuid(),
          shop_id: shop.id,
          session_id: sessionId,
          date: saleDate,
          store: saleStore || '',
          client_id: selectedClient?.id || null,
          client_name: selectedClient?.name || '',
          payment_status: paymentStatus,
          paid_amount: linePaid,
          remaining_amount: lineRemaining,
          product_id: line.product_id,
          product_code: line.product_code || '',
          product_name: line.product_name,
          quantity: q,
          unit_sale_price: price,
          total_sale: lineTotal,
          unit_purchase_cost: cost,
          total_purchase_cost: q * cost,
          profit: q * price - q * cost,
          created_at: now,
          updated_at: now,
          sync_status: 'pending',
        }
        await localUpsert('sales', saleRecord)
        savedSales.push(saleRecord)
      }

      if (remainingAmount > 0 && selectedClient) {
        await localUpsert('client_transactions', {
          id: uuid(),
          shop_id: shop.id,
          client_id: selectedClient.id,
          date: saleDate,
          label: `Vente à crédit — ${sessionId.slice(0, 8).toUpperCase()}`,
          amount: remainingAmount,
          created_at: now,
          updated_at: now,
          sync_status: 'pending',
        })
      }

      toast.success(`Vente enregistrée (${cart.length} produit${cart.length > 1 ? 's' : ''})`)
      setModal(false)

      // Show document modal after successful sale
      const group = {
        key: sessionId,
        date: saleDate,
        store: saleStore,
        client_name: selectedClient?.name || '',
        payment_status: paymentStatus,
        paid_amount: totalPaid,
        remaining_amount: remainingAmount,
        items: savedSales,
      }
      setDocModal(group)

      load()
    } catch (err) {
      toast.error(err.message || 'Erreur lors de l\'enregistrement')
    }
  }

  function openAdd() {
    setCart([emptyLine()])
    setSaleDate(format(new Date(), 'yyyy-MM-dd'))
    setSaleStore('')
    setSaleClientId('')
    setPaymentMode('paid')
    setPaidAmount('')
    setModal(true)
  }

  // Group sales by session_id for display
  const groupedSales = useMemo(() => {
    const groups = {}
    const filtered = sales.filter(s =>
      s.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.store?.toLowerCase().includes(search.toLowerCase()) ||
      s.client_name?.toLowerCase().includes(search.toLowerCase())
    )
    filtered.forEach(s => {
      const key = s.session_id || s.id
      if (!groups[key]) {
        groups[key] = {
          key,
          date: s.date,
          store: s.store,
          client_name: s.client_name,
          payment_status: s.payment_status || 'paid',
          paid_amount: 0,
          remaining_amount: 0,
          items: [],
          cancelled: !!s.cancelled_at,
        }
      }
      groups[key].items.push(s)
      groups[key].paid_amount += Number(s.paid_amount || 0)
      groups[key].remaining_amount += Number(s.remaining_amount || 0)
      if (Number(s.remaining_amount || 0) > 0) groups[key].payment_status = 'credit'
      if (s.cancelled_at) groups[key].cancelled = true
    })
    return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [sales, search])

  const activeSales = useMemo(() => sales.filter(s => !s.cancelled_at), [sales])
  const totalRevenue = useMemo(() => activeSales.reduce((a, s) => a + (s.total_sale || 0), 0), [activeSales])
  const totalProfit = useMemo(() => activeSales.reduce((a, s) => a + (s.profit || 0), 0), [activeSales])

  async function handleCancel(sessionId) {
    const sessionSales = sales.filter(s => (s.session_id || s.id) === sessionId)
    for (const s of sessionSales) {
      await cancelSale(s.id, shop.id)
    }
    toast.success('Vente annulée — stock restauré')
    load()
  }

  async function handleDelete(sessionId) {
    const sessionSales = sales.filter(s => (s.session_id || s.id) === sessionId)
    for (const s of sessionSales) {
      await localDelete('sales', s.id)
    }
    toast.success('Vente supprimée')
    load()
  }

  function handlePrintDoc(group, docType) {
    printSaleDocument({
      shop,
      type: docType,
      saleGroup: group,
      invoiceNumber: `VTE-${group.date}-${group.key.slice(0, 4).toUpperCase()}`,
    })
    setDocModal(null)
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Ventes"
        subtitle={`${activeSales.length} transaction${activeSales.length !== 1 ? 's' : ''}`}
        action={<Btn icon={Plus} onClick={openAdd}>Nouvelle vente</Btn>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Chiffre d'affaires total" value={formatFCFA(totalRevenue)} color="blue" icon={TrendingUp} />
        <StatCard label="Bénéfice total" value={formatFCFA(totalProfit)} color="green" icon={TrendingUp} />
        <StatCard label="Nombre de ventes" value={activeSales.length} color="purple" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex-1 max-w-xs">
            <SearchBar value={search} onChange={setSearch} placeholder="Rechercher…" />
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Chargement…</div>
        ) : groupedSales.length === 0 ? (
          <EmptyState icon={TrendingUp} title="Aucune vente"
            description="Enregistrez vos premières ventes."
            action={<Btn icon={Plus} onClick={openAdd}>Nouvelle vente</Btn>}
          />
        ) : (
          <div className="divide-y divide-gray-50">
            {groupedSales.map(group => {
              const groupTotal = group.items.reduce((a, s) => a + (s.total_sale || 0), 0)
              const groupProfit = group.items.reduce((a, s) => a + (s.profit || 0), 0)
              return (
                <div
                  key={group.key}
                  className={`px-5 py-4 ${group.cancelled ? 'bg-red-50/40 opacity-70' : 'hover:bg-gray-50 cursor-pointer'} transition-colors`}
                  onClick={() => !group.cancelled && setDocModal(group)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs text-gray-400">
                          {format(new Date(group.date), 'dd MMM yyyy', { locale: fr })}
                        </span>
                        {group.store && <span className="text-xs text-gray-400">· {group.store}</span>}
                        {group.client_name && <span className="text-xs font-medium text-blue-600">· {group.client_name}</span>}
                        {group.cancelled && <Badge color="red">Annulée</Badge>}
                        {group.payment_status === 'credit' && (
                          <Badge color="amber">Crédit : {formatFCFA(group.remaining_amount)}</Badge>
                        )}
                        {group.items.length > 1 && (
                          <Badge color="blue">{group.items.length} produits</Badge>
                        )}
                        {!group.cancelled && (
                          <span className="text-xs text-gray-300 ml-1">· Cliquer pour imprimer un document</span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {group.items.map(s => (
                          <div key={s.id} className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-gray-800 max-w-[200px] truncate">{s.product_name}</span>
                            <span className="text-gray-400">×{s.quantity}</span>
                            <span className="text-gray-500">{formatFCFA(s.total_sale)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex-none">
                      <p className="font-bold text-gray-900">{formatFCFA(groupTotal)}</p>
                      {!group.cancelled && (
                        <p className="text-xs text-emerald-600">+{formatFCFA(groupProfit)}</p>
                      )}
                    </div>
                    {!group.cancelled && (
                      <div className="flex gap-1 flex-none" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setDocModal(group)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Imprimer un document"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDocModal(group)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors text-xs font-medium"
                          title="Documents"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Documents
                        </button>
                        <button
                          onClick={() => setConfirm({ type: 'cancel', id: group.key })}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-500 transition-colors"
                          title="Annuler la vente"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirm({ type: 'delete', id: group.key })}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Document Print Modal ── */}
      <Modal open={!!docModal} onClose={() => setDocModal(null)} title="Imprimer un document" maxW="max-w-sm">
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-4">
            Choisissez le type de document à générer pour cette vente.
          </p>
          {docModal && SALE_DOC_TYPES.map(doc => {
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

      {/* New Sale Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nouvelle vente" maxW="max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Date" required>
              <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className={inputCls} required />
            </FormField>
            <FormField label="Magasin / Point de vente">
              <input value={saleStore} onChange={e => setSaleStore(e.target.value)} placeholder="Ex: Dar es salam" className={inputCls} />
            </FormField>
            <FormField label="Client">
              <select value={saleClientId} onChange={e => setSaleClientId(e.target.value)} className={selectCls}>
                <option value="">— Choisir —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Paiement">
              <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className={selectCls}>
                <option value="paid">Payé comptant</option>
                <option value="credit">Vente à crédit</option>
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

          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Articles</span>
              <Btn size="sm" icon={PlusCircle} onClick={addLine} variant="ghost">Ajouter une ligne</Btn>
            </div>
            <div className="divide-y divide-gray-50">
              {cart.map((line, idx) => {
                const qty = Number(line.quantity || 0)
                const price = Number(line.unit_sale_price || 0)
                const lineTotal = qty * price
                const lineProfit = qty * price - qty * line.unit_cost
                const prod = products.find(p => p.id === line.product_id)
                const availStock = prod ? computeStock(prod, purchases, sales) : null

                return (
                  <div key={line._key} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-400">Ligne {idx + 1}</span>
                      <button type="button" onClick={() => removeLine(line._key)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <select
                      value={line.product_id}
                      onChange={e => selectProductForLine(line._key, e.target.value)}
                      className={selectCls}
                    >
                      <option value="">— Sélectionner un produit —</option>
                      {products.map(p => {
                        const stock = computeStock(p, purchases, sales)
                        return <option key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ''} — Stock: {formatNumber(stock)}</option>
                      })}
                    </select>
                    {line.product_id && availStock !== null && (
                      <p className="text-xs text-gray-400">Stock disponible: <strong className={availStock <= 0 ? 'text-red-500' : 'text-emerald-600'}>{formatNumber(availStock)}</strong></p>
                    )}
                    {line.product_id && (
                      <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                        <p className="text-xs text-gray-400">Désignation automatique</p>
                        <p className="text-sm font-medium text-gray-800">{line.product_name}</p>
                        {line.product_code && <p className="text-xs text-gray-400">{line.product_code}</p>}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-gray-400">Quantité</label>
                        <FrenchInput
                          value={line.quantity}
                          onChange={(value) => updateLine(line._key, 'quantity', value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Prix vente (FCFA)</label>
                        <FrenchInput
                          value={line.unit_sale_price}
                          onChange={(value) => updateLine(line._key, 'unit_sale_price', value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Total ligne</label>
                        <div className={`${inputCls} mt-0.5 bg-gray-50 flex items-center justify-between`}>
                          <span className="text-gray-600">{formatFCFA(lineTotal)}</span>
                          {lineTotal > 0 && (
                            <span className={`text-xs font-semibold ml-1 ${lineProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              +{formatFCFA(lineProfit)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {cartTotals.revenue > 0 && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 grid grid-cols-2 lg:grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-xs text-blue-500">Total vente</p>
                <p className="font-bold text-blue-900">{formatFCFA(cartTotals.revenue)}</p>
              </div>
              <div>
                <p className="text-xs text-blue-500">Coût total</p>
                <p className="font-bold text-blue-700">{formatFCFA(cartTotals.cost)}</p>
              </div>
              <div>
                <p className="text-xs text-blue-500">Bénéfice</p>
                <p className={`font-bold ${cartTotals.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {cartTotals.profit >= 0 ? '+' : ''}{formatFCFA(cartTotals.profit)}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-500">Reste à payer</p>
                <p className={`font-bold ${remainingPreview > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {formatFCFA(remainingPreview)}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="secondary" onClick={() => setModal(false)}>Annuler</Btn>
            <Btn type="submit">Enregistrer la vente</Btn>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm && confirm.type === 'cancel'}
        onClose={() => setConfirm(null)}
        onConfirm={() => handleCancel(confirm.id)}
        title="Annuler la vente"
        message="La vente sera marquée comme annulée. Les produits seront remis en stock et les montants retirés des totaux. La vente restera visible dans l'historique."
        confirmLabel="Annuler la vente"
        danger={true}
      />
      <ConfirmDialog
        open={!!confirm && confirm.type === 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={() => handleDelete(confirm.id)}
        title="Supprimer la vente"
        message="La vente sera supprimée. Les données resteront dans l'analyse de rentabilité."
        confirmLabel="Supprimer"
        danger={true}
      />
    </div>
  )
}