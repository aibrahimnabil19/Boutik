// apps/web/src/app/(app)/dashboard/page.jsx
// Main dashboard: KPIs, monthly chart, recent transactions.

'use client'

import { useEffect, useState } from 'react'
import { getAll } from '@/lib/db/local'
import { useAppStore } from '@/context/store'
import { formatFCFA, formatNumber, getMonthlyTotals } from '@/lib/core/calculations'
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, ShoppingCart, Wallet, Package, AlertTriangle, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const shop = useAppStore(s => s.shop)
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState({ sales: 0, purchases: 0, expenses: 0, profit: 0, totalProducts: 0, totalDebt: 0 })
  const [chartData, setChartData] = useState([])
  const [recentSales, setRecentSales] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [productSummary, setProductSummary] = useState([])
  const [period, setPeriod] = useState('month')
  const [rawSales, setRawSales] = useState([])
  const [rawPurchases, setRawPurchases] = useState([])
  const [rawExpenses, setRawExpenses] = useState([])
  const router = useRouter()

  useEffect(() => {
    if (!shop?.id) return
    async function load() {
      try {
        const [sales, purchases, expenses, products, clientTx, supplierTx] = await Promise.all([
          getAll('sales', shop.id),
          getAll('purchases', shop.id),
          getAll('expenses', shop.id),
          getAll('products', shop.id),
          getAll('client_transactions', shop.id),
          getAll('supplier_transactions', shop.id),
        ])

        const now = new Date()
        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)
        const inMonth = (d) => isWithinInterval(new Date(d), { start: monthStart, end: monthEnd })

        const monthSales = sales.filter(s => inMonth(s.date) && !s.cancelled_at).reduce((a, s) => a + (s.total_sale || 0), 0)
        const monthPurchases = purchases.filter(p => inMonth(p.date)).reduce((a, p) => a + (p.total_amount || 0), 0)
        const monthExpenses = expenses.filter(e => inMonth(e.date)).reduce((a, e) => a + (e.amount || 0), 0)
        const monthProfit = sales.filter(s => inMonth(s.date) && !s.cancelled_at).reduce((a, s) => a + (s.profit || 0), 0) - monthExpenses

        // Total client debt (positive amounts = clients owe us)
        const totalClientDebt = clientTx
          .filter(t => t.amount > 0)
          .reduce((a, t) => a + t.amount, 0)
        const totalClientPaid = clientTx
          .filter(t => t.amount < 0)
          .reduce((a, t) => a + Math.abs(t.amount), 0)
        const netClientDebt = Math.max(0, totalClientDebt - totalClientPaid)

        // Total supplier debt
        const totalSupplierDebt = supplierTx
          .filter(t => t.amount > 0)
          .reduce((a, t) => a + t.amount, 0)
        const totalSupplierPaid = supplierTx
          .filter(t => t.amount < 0)
          .reduce((a, t) => a + Math.abs(t.amount), 0)
        const netSupplierDebt = Math.max(0, totalSupplierDebt - totalSupplierPaid)

        setKpis({
          sales: monthSales,
          purchases: monthPurchases,
          expenses: monthExpenses,
          profit: monthProfit,
          totalProducts: products.length,
          totalDebt: netClientDebt + netSupplierDebt,
        })

        setRawSales(sales.filter(s => !s.cancelled_at))
        setRawPurchases(purchases)
        setRawExpenses(expenses)

        setRecentSales([...sales].filter(s => !s.cancelled_at).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5))
        setLowStock(products.filter(p => p.alert_threshold != null && computeStock(p, purchases, sales) <= p.alert_threshold))
        setProductSummary(
          products.map(p => {
            const bought = purchases
              .filter(pu => pu.product_id === p.id || pu.product_code === p.code)
              .reduce((sum, pu) => sum + Number(pu.quantity || 0), 0)

            const sold = sales
              .filter(s => (s.product_id === p.id || s.product_code === p.code) && !s.cancelled_at)
              .reduce((sum, s) => sum + Number(s.quantity || 0), 0)

            const stockLeft = Number(p.stock_initial || 0) + bought - sold

            return {
              id: p.id,
              code: p.code || '',
              name: p.name,
              stockInitial: Number(p.stock_initial || 0),
              bought,
              sold,
              stockLeft,
              purchaseValue: bought * Number(p.purchase_price || 0),
              stockValue: stockLeft * Number(p.purchase_price || 0),
            }
          }).sort((a, b) => a.name.localeCompare(b.name))
        )
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [shop?.id])

  // 2. Separate top-level effect reacts to period or raw data changes
  useEffect(() => {
    if (rawSales.length === 0 && rawPurchases.length === 0) return
    setChartData(buildChartData({ sales: rawSales, purchases: rawPurchases, expenses: rawExpenses, period }))
  }, [period, rawSales, rawPurchases, rawExpenses])

  const primaryColor = shop?.color_primary || '#1a56db'
  const accentColor = shop?.color_accent || '#e3a008'

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">
          Bonjour 👋
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })} · {shop?.name}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => router.push('/ventes?action=new')}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Nouvelle vente
        </button>

        <button
          onClick={() => router.push('/achats?action=new')}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-emerald-700 transition"
        >
          <Plus className="w-4 h-4" />
          Nouvel achat
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Ventes du mois" value={formatFCFA(kpis.sales)} icon={TrendingUp} color="blue" loading={loading} />
        <KpiCard label="Bénéfice net" value={formatFCFA(kpis.profit)} icon={kpis.profit >= 0 ? TrendingUp : TrendingDown} color={kpis.profit >= 0 ? 'green' : 'red'} loading={loading} />
        <KpiCard label="Dépenses du mois" value={formatFCFA(kpis.expenses)} icon={Wallet} color="amber" loading={loading} />
        <KpiCard label="Achats du mois" value={formatFCFA(kpis.purchases)} icon={ShoppingCart} color="purple" loading={loading} />
        <KpiCard label="Produits en stock" value={kpis.totalProducts} icon={Package} color="blue" loading={loading} />
        <KpiCard label="Total créances" value={formatFCFA(kpis.totalDebt)} icon={TrendingDown} color={kpis.totalDebt > 0 ? 'amber' : 'green'} loading={loading} />
      </div>

      {/* Selector */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">Évolution</h2>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="7d">7 jours</option>
          <option value="30d">30 jours</option>
          <option value="month">Mois actuel</option>
          <option value="6m">6 mois</option>
          <option value="12m">12 mois</option>
        </select>
      </div>

      {/* Chart */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-800 mb-4">
          {period === '7d' && 'Évolution sur 7 jours'}
          {period === '30d' && 'Évolution sur 30 jours'}
          {period === 'month' && 'Évolution du mois'}
          {period === '6m' && 'Évolution sur 6 mois'}
          {period === '12m' && 'Évolution sur 12 mois'}
        </h2>
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            Pas encore de données
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={primaryColor} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={accentColor} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip formatter={(v, name) => [formatFCFA(v), name]} labelStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="ventes" name="Ventes" stroke={primaryColor} fill="url(#gSales)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="benefice" name="Bénéfice" stroke={accentColor} fill="url(#gProfit)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              Résumé des produits
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Nom, ID/code, stock restant et quantité achetée.
            </p>
          </div>
        </div>

        {productSummary.length === 0 ? (
          <div className="p-6 text-sm text-gray-400">
            Aucun produit enregistré.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Produit', 'ID / Code', 'Stock initial', 'Acheté', 'Vendu', 'Stock restant', 'Valeur achetée', 'Valeur stock'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {productSummary.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {p.name}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-gray-700">{p.code || '—'}</p>
                      <p className="font-mono text-[10px] text-gray-400 truncate max-w-[160px]" title={p.id}>
                        ID: {p.id}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatNumber(p.stockInitial)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatNumber(p.bought)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatNumber(p.sold)}</td>
                    <td className={`px-4 py-3 font-bold ${p.stockLeft <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatNumber(p.stockLeft)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatFCFA(p.purchaseValue)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatFCFA(p.stockValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent sales */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Ventes récentes
          </h2>
          {recentSales.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucune vente enregistrée</p>
          ) : (
            <div className="space-y-2">
              {recentSales.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800 truncate max-w-50">{s.product_name}</p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(s.date), 'dd MMM yyyy', { locale: fr })}
                      {s.created_at && ` · ${format(new Date(s.created_at), 'HH:mm', { locale: fr })}`}
                      · Qté: {s.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatFCFA(s.total_sale)}</p>
                    <p className="text-xs text-emerald-500">+{formatFCFA(s.profit)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low stock alerts */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Alertes stock ({lowStock.length})
          </h2>
          {lowStock.length === 0 ? (
            <p className="text-gray-400 text-sm">Tous les stocks sont suffisants ✓</p>
          ) : (
            <div className="space-y-2">
              {lowStock.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.code}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                    Seuil: {p.alert_threshold}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
const colorMap = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'text-blue-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'text-purple-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'text-amber-500' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'text-emerald-500' },
  red: { bg: 'bg-red-50', text: 'text-red-600', icon: 'text-red-500' },
}

function KpiCard({ label, value, icon: Icon, color, loading }) {
  const c = colorMap[color] || colorMap.blue
  return (
    <div className="card p-5">
      <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-4 h-4 ${c.icon}`} />
      </div>
      {loading ? (
        <div className="h-6 w-24 bg-gray-100 rounded animate-pulse mb-1" />
      ) : (
        <p className={`font-display text-xl font-bold ${c.text}`}>{value}</p>
      )}
      <p className="text-gray-400 text-xs mt-0.5">{label}</p>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function computeStock(product, purchases, sales) {
  const bought = purchases.filter(p => p.product_id === product.id).reduce((a, p) => a + p.quantity, 0)
  const sold = sales.filter(s => s.product_id === product.id).reduce((a, s) => a + s.quantity, 0)
  return (product.stock_initial || 0) + bought - sold
}

function buildChartData({ sales, purchases, expenses, period }) {
  if (period === '7d' || period === '30d' || period === 'month') {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : new Date().getDate()
    const result = []

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)

      const ventes = sales
        .filter((s) => String(s.date).slice(0, 10) === key)
        .reduce((a, s) => a + Number(s.total_sale || 0), 0)

      const benefice = sales
        .filter((s) => String(s.date).slice(0, 10) === key)
        .reduce((a, s) => a + Number(s.profit || 0), 0)

      const dep = expenses
        .filter((e) => String(e.date).slice(0, 10) === key)
        .reduce((a, e) => a + Number(e.amount || 0), 0)

      result.push({
        month: format(d, 'dd MMM', { locale: fr }),
        ventes,
        benefice: benefice - dep,
      })
    }

    return result
  }

  if (period === '12m') return getMonthlyTotals(sales, purchases, expenses, 12)

  return getMonthlyTotals(sales, purchases, expenses, 6)
}