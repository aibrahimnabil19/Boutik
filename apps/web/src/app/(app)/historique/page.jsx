'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  History, TrendingUp, ShoppingCart, Wallet, ArrowDownCircle, ArrowUpCircle,
  PackageCheck, XCircle, FileText, Users, Truck,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { getAll } from '@/lib/db/local'
import { formatFCFA } from '@/lib/core/calculations'
import {
  PageHeader, SearchBar, EmptyState, StatCard, Badge,
} from '@/components/ui'
import DateFilter from '@/components/DateFilter'
import { defaultDateFilter, isDateInFilter } from '@/lib/core/dateFilters'

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

// ─── Tab registry: each tab owns a set of event types ──────────────────────
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

  // ─── Normalize every source into one unified event shape ──────────────────
  const events = useMemo(() => {
    const out = []

    // ── Sales, grouped by session so one "vente" = one event ──
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
      })
    })

    return out.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))
  }, [sales, purchases, expenses, clientTx, supplierTx, invoices, clients, suppliers])

  // ─── Per-tab counts (computed before search/date filtering, so badges reflect date range only) ──
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
                <div key={ev.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
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

                  <div className="text-right flex-none">
                    <p className={`font-bold ${isOutflow ? 'text-red-600' : 'text-gray-900'}`}>
                      {isOutflow ? '-' : ''}{formatFCFA(ev.amount)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}