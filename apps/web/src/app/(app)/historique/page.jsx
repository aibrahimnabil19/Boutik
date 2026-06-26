'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  History, TrendingUp, ShoppingCart, Wallet, ArrowDownCircle, ArrowUpCircle,
  PackageCheck, XCircle, FileText, Users, Truck, ArrowRight, Printer,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { getAll } from '@/lib/db/local'
import { formatFCFA } from '@/lib/core/calculations'
import {
  PageHeader, SearchBar, EmptyState, StatCard, Badge, Modal, Btn,
} from '@/components/ui'
import DateFilter from '@/components/DateFilter'
import { defaultDateFilter, isDateInFilter } from '@/lib/core/dateFilters'
import { printSaleDocument, printPurchaseDocument } from '@/lib/core/invoicePrint'
import { getDefaultDocumentOptions } from '@/components/DocumentPrintOptions'

// ─── Event type registry ────────────────────────────────────────────────────
const TYPE_META = {
  sale: { label: 'Vente', icon: TrendingUp, color: 'blue' },
  sale_advance: { label: 'Avance / Réservation', icon: PackageCheck, color: 'amber' },
  sale_cancelled: { label: 'Vente annulée', icon: XCircle, color: 'red' },
  purchase: { label: 'Entrée de stock', icon: ShoppingCart, color: 'purple' },
  expense: { label: 'Charge', icon: Wallet, color: 'red' },
  client_payment: { label: 'Paiement client', icon: ArrowDownCircle, color: 'green' },
  client_credit: { label: 'Créance client', icon: ArrowUpCircle, color: 'amber' },
  supplier_payment: { label: 'Paiement fournisseur', icon: ArrowDownCircle, color: 'green' },
  supplier_debt: { label: 'Dette fournisseur', icon: ArrowUpCircle, color: 'amber' },
  invoice: { label: 'Document émis', icon: FileText, color: 'blue' },
}

// ─── Tab registry ────────────────────────────────────────────────────────────
const TABS = [
  { key: 'all', label: 'Tout', icon: History, types: null },
  { key: 'sale', label: 'Ventes', icon: TrendingUp, types: ['sale', 'sale_advance', 'sale_cancelled'] },
  { key: 'purchase', label: 'Entrées de stock', icon: ShoppingCart, types: ['purchase'] },
  { key: 'expense', label: 'Charges', icon: Wallet, types: ['expense'] },
  { key: 'client', label: 'Clients', icon: Users, types: ['client_payment', 'client_credit'] },
  { key: 'supplier', label: 'Fournisseurs', icon: Truck, types: ['supplier_payment', 'supplier_debt'] },
  { key: 'invoice', label: 'Documents', icon: FileText, types: ['invoice'] },
]

function badgeBgClass(color) {
  return color === 'blue' ? 'bg-blue-50 text-blue-600' :
    color === 'green' ? 'bg-emerald-50 text-emerald-600' :
    color === 'amber' ? 'bg-amber-50 text-amber-600' :
    color === 'red' ? 'bg-red-50 text-red-600' :
    'bg-purple-50 text-purple-600'
}

export default function HistoriquePage() {
  const shop = useAppStore(s => s.shop)
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  const [sales, setSales] = useState([])
  const [purchases, setPurchases] = useState([])
  const [expenses, setExpenses] = useState([])
  const [clientTx, setClientTx] = useState([])
  const [supplierTx, setSupplierTx] = useState([])
  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [suppliers, setSuppliers] = useState([])

  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState(defaultDateFilter())
  const [selected, setSelected] = useState(null) // the clicked event (with .raw attached)

  const load = useCallback(async () => {
    if (!shop?.id) { setLoading(false); return }
    try {
      const [s, p, e, ct, st, inv, cl, su] = await Promise.all([
        getAll('sales', shop.id),
        getAll('purchases', shop.id),
        getAll('expenses', shop.id),
        getAll('client_transactions', shop.id),
        getAll('supplier_transactions', shop.id),
        getAll('invoices', shop.id),
        getAll('clients', shop.id),
        getAll('suppliers', shop.id),
      ])
      setSales(s)
      setPurchases(p)
      setExpenses(e)
      setClientTx(ct)
      setSupplierTx(st)
      setInvoices(inv)
      setClients(cl)
      setSuppliers(su)
    } catch (err) {
      console.error('[Historique load failed]', err)
    } finally {
      setLoading(false)
    }
  }, [shop?.id])

  useEffect(() => { load() }, [load])

  // ─── Normalize every source into one unified event shape, each carrying `raw` ──
  const events = useMemo(() => {
    const out = []

    // ── Sales, grouped by session ──
    const saleGroups = {}
    sales.forEach(s => {
      const key = s.session_id || s.id
      if (!saleGroups[key]) {
        saleGroups[key] = {
          key, date: s.date, created_at: s.created_at,
          client_name: s.client_name, items: [], cancelled: false, isAdvance: false,
        }
      }
      saleGroups[key].items.push(s)
      if (s.cancelled_at) saleGroups[key].cancelled = true
      if (s.status === 'pending_advance') saleGroups[key].isAdvance = true
      if (new Date(s.created_at || 0) > new Date(saleGroups[key].created_at || 0)) {
        saleGroups[key].created_at = s.created_at
      }
    })
    Object.values(saleGroups).forEach(g => {
      const productItems = g.items.filter(i => !i.is_charge)
      const total = productItems.reduce((a, i) => a + Number(i.total_sale || 0), 0)
      const count = productItems.length
      const namesPreview = productItems.slice(0, 2).map(i => i.product_name).filter(Boolean).join(', ')
      const type = g.cancelled ? 'sale_cancelled' : g.isAdvance ? 'sale_advance' : 'sale'
      out.push({
        id: `sale-${g.key}`,
        type,
        date: g.date,
        created_at: g.created_at || g.date,
        title: `Vente${count > 1 ? ` (${count} produits)` : ''} — ${namesPreview || '—'}`,
        subtitle: g.client_name ? `Client : ${g.client_name}` : 'Client de passage',
        amount: total,
        raw: g, // full group with .items
      })
    })

    // ── Purchases ──
    purchases.forEach(p => {
      out.push({
        id: `purchase-${p.id}`,
        type: 'purchase',
        date: p.date,
        created_at: p.created_at || p.date,
        title: `Entrée de stock — ${p.product_name || '—'}`,
        subtitle: p.supplier ? `Fournisseur : ${p.supplier}` : 'Fournisseur inconnu',
        amount: Number(p.total_amount || 0),
        raw: p,
      })
    })

    // ── Expenses ──
    expenses.forEach(e => {
      out.push({
        id: `expense-${e.id}`,
        type: 'expense',
        date: e.date,
        created_at: e.created_at || e.date,
        title: `Charge — ${e.description || e.category || '—'}`,
        subtitle: e.category ? `Catégorie : ${e.category}` : '',
        amount: Number(e.amount || 0),
        raw: e,
      })
    })

    // ── Client transactions ──
    clientTx.forEach(t => {
      const client = clients.find(c => c.id === t.client_id)
      const amt = Number(t.amount || 0)
      const type = amt < 0 ? 'client_payment' : 'client_credit'
      out.push({
        id: `ctx-${t.id}`,
        type,
        date: t.date,
        created_at: t.created_at || t.date,
        title: t.label || (amt < 0 ? 'Paiement client' : 'Créance client'),
        subtitle: client?.name ? `Client : ${client.name}` : '',
        amount: Math.abs(amt),
        raw: { ...t, client },
      })
    })

    // ── Supplier transactions ──
    supplierTx.forEach(t => {
      const supplier = suppliers.find(s => s.id === t.supplier_id)
      const amt = Number(t.amount || 0)
      const type = amt < 0 ? 'supplier_payment' : 'supplier_debt'
      out.push({
        id: `stx-${t.id}`,
        type,
        date: t.date,
        created_at: t.created_at || t.date,
        title: t.label || (amt < 0 ? 'Paiement fournisseur' : 'Dette fournisseur'),
        subtitle: supplier?.name ? `Fournisseur : ${supplier.name}` : '',
        amount: Math.abs(amt),
        raw: { ...t, supplier },
      })
    })

    // ── Invoices ──
    invoices.forEach(inv => {
      const typeLabel = {
        facture: 'Facture',
        proforma: 'Proforma',
        bon_livraison: 'Bon de livraison',
        bon_commande: 'Bon de commande',
      }[inv.type] || 'Document'
      out.push({
        id: `invoice-${inv.id}`,
        type: 'invoice',
        date: inv.date,
        created_at: inv.created_at || inv.date,
        title: `${typeLabel} ${inv.invoice_number || ''} émis`,
        subtitle: inv.client_name ? `Client : ${inv.client_name}` : '',
        amount: Number(inv.total_amount || 0),
        raw: inv,
      })
    })

    return out.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))
  }, [sales, purchases, expenses, clientTx, supplierTx, invoices, clients, suppliers])

  const dateFilteredEvents = useMemo(
    () => events.filter(ev => isDateInFilter(ev.date, dateFilter)),
    [events, dateFilter]
  )

  const tabCounts = useMemo(() => {
    const counts = {}
    for (const tab of TABS) {
      counts[tab.key] = tab.types === null
        ? dateFilteredEvents.length
        : dateFilteredEvents.filter(ev => tab.types.includes(ev.type)).length
    }
    return counts
  }, [dateFilteredEvents])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const activeTabDef = TABS.find(t => t.key === activeTab) || TABS[0]

    return dateFilteredEvents.filter(ev => {
      const matchesTab = activeTabDef.types === null || activeTabDef.types.includes(ev.type)
      const matchesSearch = !q ||
        ev.title?.toLowerCase().includes(q) ||
        ev.subtitle?.toLowerCase().includes(q)
      return matchesTab && matchesSearch
    })
  }, [dateFilteredEvents, activeTab, search])

  const stats = useMemo(() => {
    const salesCount = dateFilteredEvents.filter(e => e.type === 'sale').length
    const purchaseTotal = dateFilteredEvents.filter(e => e.type === 'purchase').reduce((a, e) => a + e.amount, 0)
    const expenseTotal = dateFilteredEvents.filter(e => e.type === 'expense').reduce((a, e) => a + e.amount, 0)
    return { total: dateFilteredEvents.length, salesCount, purchaseTotal, expenseTotal }
  }, [dateFilteredEvents])

  // ── Print actions reused directly from invoicePrint.js (no page-specific state needed) ──
  function handlePrintSaleGroup(group) {
    printSaleDocument({
      shop,
      type: 'facture',
      saleGroup: group,
      invoiceNumber: `V-${group.date}`,
      includeCachet: getDefaultDocumentOptions().includeCachet,
      includeSignature: getDefaultDocumentOptions().includeSignature,
      orientation: 'landscape',
    })
  }

  function handlePrintPurchase(purchase) {
    printPurchaseDocument({
      shop,
      type: 'bon_commande',
      purchase,
      invoiceNumber: `ACH-${purchase.date}-${String(purchase.id).slice(0, 4).toUpperCase()}`,
      includeCachet: getDefaultDocumentOptions().includeCachet,
      includeSignature: getDefaultDocumentOptions().includeSignature,
    })
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Historique"
        subtitle={`${dateFilteredEvents.length} événement${dateFilteredEvents.length !== 1 ? 's' : ''} — toutes opérations confondues`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Événements affichés" value={stats.total} color="blue" icon={History} />
        <StatCard label="Ventes" value={stats.salesCount} color="green" icon={TrendingUp} />
        <StatCard label="Entrées de stock" value={formatFCFA(stats.purchaseTotal)} color="purple" icon={ShoppingCart} />
        <StatCard label="Charges" value={formatFCFA(stats.expenseTotal)} color="red" icon={Wallet} />
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit overflow-x-auto max-w-full">
        {TABS.map(tab => {
          const Icon = tab.icon
          const count = tabCounts[tab.key] || 0
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                isActive ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-gray-100 text-gray-600' : 'bg-white text-gray-400'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex-1 min-w-[220px] max-w-xs">
            <SearchBar value={search} onChange={setSearch} placeholder="Rechercher dans cet onglet…" />
          </div>

          <DateFilter value={dateFilter} onChange={setDateFilter} />
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={History}
            title="Aucun événement"
            description="Aucune opération ne correspond à cet onglet et ces filtres."
          />
        ) : (
          <div className="divide-y divide-gray-50 zebra-list">
            {filtered.map(ev => {
              const meta = TYPE_META[ev.type] || TYPE_META.sale
              const Icon = meta.icon
              const isOutflow = ev.type === 'purchase' || ev.type === 'expense' ||
                ev.type === 'client_payment' || ev.type === 'supplier_payment'

              return (
                <div
                  key={ev.id}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelected(ev)}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-none ${badgeBgClass(meta.color)}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs text-gray-400">
                        {format(new Date(ev.date), 'dd MMM yyyy', { locale: fr })}
                        {ev.created_at && (
                          <span> · {format(new Date(ev.created_at), 'HH:mm', { locale: fr })}</span>
                        )}
                      </span>
                      <Badge color={meta.color}>{meta.label}</Badge>
                    </div>
                    <p className="font-medium text-gray-900 truncate">{ev.title}</p>
                    {ev.subtitle && <p className="text-xs text-gray-500 mt-0.5">{ev.subtitle}</p>}
                  </div>

                  <div className="text-right flex-none flex items-center gap-3">
                    <p className={`font-bold ${isOutflow ? 'text-red-600' : 'text-gray-900'}`}>
                      {isOutflow ? '-' : ''}{formatFCFA(ev.amount)}
                    </p>
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Detail Modal — content switches on event type ── */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? (TYPE_META[selected.type]?.label || 'Détails') : 'Détails'}
        maxW="max-w-2xl"
      >
        {selected && (
          <div className="space-y-5">
            {/* ── SALE / SALE_ADVANCE / SALE_CANCELLED ── */}
            {(selected.type === 'sale' || selected.type === 'sale_advance' || selected.type === 'sale_cancelled') && (() => {
              const group = selected.raw
              const productItems = group.items.filter(i => !i.is_charge)
              const chargeItems = group.items.filter(i => i.is_charge)
              const total = productItems.reduce((a, i) => a + Number(i.total_sale || 0), 0)
              const paid = productItems.reduce((a, i) => a + Number(i.paid_amount || 0), 0)
              const remaining = Math.max(0, total - paid)

              return (
                <div className="space-y-4">
                  {selected.type === 'sale_cancelled' && (
                    <div className="rounded-xl p-3 bg-red-50 border border-red-200 text-sm font-semibold text-red-700">
                      Cette vente a été annulée — stock restauré.
                    </div>
                  )}
                  {selected.type === 'sale_advance' && (
                    <div className="rounded-xl p-3 bg-amber-50 border border-amber-200 text-sm font-semibold text-amber-700">
                      Avance / réservation — {remaining > 0 ? `reste ${formatFCFA(remaining)} à payer, stock non déduit` : 'entièrement payée, prête à collecter'}
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Informations</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{format(new Date(group.date), 'dd MMM yyyy', { locale: fr })}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Client</span><span>{group.client_name || '—'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Articles</span><span>{productItems.length}</span></div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Paiement</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-semibold">{formatFCFA(total)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Payé</span><span>{formatFCFA(paid)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Reste</span><span className={remaining > 0 ? 'text-amber-600 font-semibold' : ''}>{formatFCFA(remaining)}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <p className="text-xs font-semibold text-gray-500 uppercase px-4 py-2 bg-gray-50">Produits vendus</p>
                    <div className="divide-y divide-gray-100">
                      {productItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                          <div>
                            <p className="font-medium text-gray-900">{item.product_name}</p>
                            <p className="text-xs text-gray-400">Qté {item.quantity} × {formatFCFA(item.unit_sale_price)}</p>
                          </div>
                          <p className="font-semibold">{formatFCFA(item.total_sale)}</p>
                        </div>
                      ))}
                    </div>
                    {chargeItems.length > 0 && (
                      <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
                        + {chargeItems.length} charge(s) interne(s) ({formatFCFA(chargeItems.reduce((a, i) => a + Number(i.total_sale || 0), 0))})
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 justify-end pt-1">
                    <Btn variant="secondary" onClick={() => setSelected(null)}>Fermer</Btn>
                    <Btn variant="secondary" icon={Printer} onClick={() => handlePrintSaleGroup(group)}>Imprimer</Btn>
                    <Btn onClick={() => router.push('/ventes')}>Ouvrir dans Ventes</Btn>
                  </div>
                </div>
              )
            })()}

            {/* ── PURCHASE ── */}
            {selected.type === 'purchase' && (() => {
              const p = selected.raw
              return (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Informations</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{format(new Date(p.date), 'dd MMM yyyy', { locale: fr })}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Fournisseur</span><span>{p.supplier || '—'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Produit</span><span>{p.product_name || '—'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Quantité</span><span>{p.quantity}</span></div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Paiement</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between"><span className="text-gray-500">Prix unitaire</span><span>{formatFCFA(p.unit_price)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Charges</span><span>{formatFCFA(p.charge_total || 0)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-semibold">{formatFCFA(p.total_amount)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Statut</span><span>{p.payment_status === 'credit' ? 'Crédit' : 'Payé'}</span></div>
                        {p.payment_status === 'credit' && (
                          <div className="flex justify-between"><span className="text-gray-500">Reste à payer</span><span className="text-amber-600 font-semibold">{formatFCFA(p.remaining_amount || 0)}</span></div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 justify-end pt-1">
                    <Btn variant="secondary" onClick={() => setSelected(null)}>Fermer</Btn>
                    <Btn variant="secondary" icon={Printer} onClick={() => handlePrintPurchase(p)}>Imprimer</Btn>
                    <Btn onClick={() => router.push('/achats')}>Ouvrir dans Entrées de stock</Btn>
                  </div>
                </div>
              )
            })()}

            {/* ── EXPENSE ── */}
            {selected.type === 'expense' && (() => {
              const e = selected.raw
              return (
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 p-4 text-sm space-y-1.5">
                    <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{format(new Date(e.date), 'dd MMM yyyy', { locale: fr })}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Description</span><span>{e.description || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Catégorie</span><span>{e.category || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Montant</span><span className="font-semibold text-red-600">{formatFCFA(e.amount)}</span></div>
                  </div>
                  <div className="flex gap-3 justify-end pt-1">
                    <Btn variant="secondary" onClick={() => setSelected(null)}>Fermer</Btn>
                    <Btn onClick={() => router.push('/depenses')}>Ouvrir dans Charges</Btn>
                  </div>
                </div>
              )
            })()}

            {/* ── CLIENT TRANSACTIONS ── */}
            {(selected.type === 'client_payment' || selected.type === 'client_credit') && (() => {
              const t = selected.raw
              return (
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 p-4 text-sm space-y-1.5">
                    <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{format(new Date(t.date), 'dd MMM yyyy', { locale: fr })}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Client</span><span>{t.client?.name || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Téléphone</span><span>{t.client?.phone || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Libellé</span><span>{t.label || '—'}</span></div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Montant</span>
                      <span className={`font-semibold ${selected.type === 'client_payment' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {selected.type === 'client_payment' ? '-' : '+'}{formatFCFA(Math.abs(t.amount))}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end pt-1">
                    <Btn variant="secondary" onClick={() => setSelected(null)}>Fermer</Btn>
                    <Btn onClick={() => router.push('/clients')}>Ouvrir dans Clients</Btn>
                  </div>
                </div>
              )
            })()}

            {/* ── SUPPLIER TRANSACTIONS ── */}
            {(selected.type === 'supplier_payment' || selected.type === 'supplier_debt') && (() => {
              const t = selected.raw
              return (
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 p-4 text-sm space-y-1.5">
                    <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{format(new Date(t.date), 'dd MMM yyyy', { locale: fr })}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Fournisseur</span><span>{t.supplier?.name || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Téléphone</span><span>{t.supplier?.phone || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Libellé</span><span>{t.label || '—'}</span></div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Montant</span>
                      <span className={`font-semibold ${selected.type === 'supplier_payment' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {selected.type === 'supplier_payment' ? '-' : '+'}{formatFCFA(Math.abs(t.amount))}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end pt-1">
                    <Btn variant="secondary" onClick={() => setSelected(null)}>Fermer</Btn>
                    <Btn onClick={() => router.push('/fournisseurs')}>Ouvrir dans Fournisseurs</Btn>
                  </div>
                </div>
              )
            })()}

            {/* ── INVOICE ── */}
            {selected.type === 'invoice' && (() => {
              const inv = selected.raw
              return (
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 p-4 text-sm space-y-1.5">
                    <div className="flex justify-between"><span className="text-gray-500">N° document</span><span className="font-mono font-semibold">{inv.invoice_number || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Type</span><span>{inv.type}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{format(new Date(inv.date), 'dd MMM yyyy', { locale: fr })}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Client</span><span>{inv.client_name || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Montant</span><span className="font-semibold">{formatFCFA(inv.total_amount)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Statut</span><span>{inv.status || '—'}</span></div>
                  </div>
                  <div className="flex gap-3 justify-end pt-1">
                    <Btn variant="secondary" onClick={() => setSelected(null)}>Fermer</Btn>
                    <Btn onClick={() => router.push('/documents')}>Ouvrir dans Documents</Btn>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </Modal>
    </div>
  )
}