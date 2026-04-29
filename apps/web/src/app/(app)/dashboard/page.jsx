// apps/web/src/app/(app)/dashboard/page.jsx
// Main dashboard: KPIs, monthly chart, recent transactions.

'use client'

import { useEffect, useState } from 'react'
import { getAll } from '@/lib/db/local'
import { useAppStore } from '@/context/store'
import { formatFCFA, getMonthlyTotals } from '@/lib/core/calculations'
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, ShoppingCart, Wallet, Package, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const shop = useAppStore(s => s.shop)
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState({ sales: 0, purchases: 0, expenses: 0, profit: 0 })
  const [chartData, setChartData] = useState([])
  const [recentSales, setRecentSales] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [period, setPeriod] = useState('6m')
  const [productsCount, setProductsCount] = useState(0)
  const router = useRouter()

  const totalProductsCount = products.length

  useEffect(() => {
    if (!shop?.id) return
    async function load() {
      try {
        const [sales, purchases, expenses, products] = await Promise.all([
          getAll('sales', shop.id),
          getAll('purchases', shop.id),
          getAll('expenses', shop.id),
          getAll('products', shop.id),
        ])

        // This month KPIs
        const now = new Date()
        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)
        const inMonth = (d) => isWithinInterval(new Date(d), { start: monthStart, end: monthEnd })

        const monthSales = sales.filter(s => inMonth(s.date)).reduce((a, s) => a + (s.total_sale || 0), 0)
        const monthPurchases = purchases.filter(p => inMonth(p.date)).reduce((a, p) => a + (p.total_amount || 0), 0)
        const monthExpenses = expenses.filter(e => inMonth(e.date)).reduce((a, e) => a + (e.amount || 0), 0)
        const monthProfit = sales.filter(s => inMonth(s.date)).reduce((a, s) => a + (s.profit || 0), 0) - monthExpenses

        setKpis({ sales: monthSales, purchases: monthPurchases, expenses: monthExpenses, profit: monthProfit })

        // Chart: last 6 months
        setChartData(buildChartData({ sales, purchases, expenses, period }))

        // Recent sales (last 5)
        setRecentSales([...sales].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5))

        setProductsCount(products.length)

        // Low stock products
        setLowStock(products.filter(p => p.alert_threshold != null && computeStock(p, purchases, sales) <= p.alert_threshold))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [shop?.id])

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <button
    onClick={() => router.push('/ventes')}
    className="rounded-2xl bg-blue-600 text-white p-5 text-left shadow-sm hover:bg-blue-700 transition"
  >
    <p className="text-sm opacity-90">Accès rapide</p>
    <p className="text-xl font-bold mt-1">Nouvelle vente</p>
  </button>

  <button
    onClick={() => router.push('/achats')}
    className="rounded-2xl bg-emerald-600 text-white p-5 text-left shadow-sm hover:bg-emerald-700 transition"
  >
    <p className="text-sm opacity-90">Accès rapide</p>
    <p className="text-xl font-bold mt-1">Nouvel achat</p>
  </button>
</div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ventes du mois"
          value={formatFCFA(kpis.sales)}
          icon={TrendingUp}
          color="blue"
          loading={loading}
        />
        <KpiCard
          label="Achats du mois"
          value={formatFCFA(kpis.purchases)}
          icon={ShoppingCart}
          color="purple"
          loading={loading}
        />
        <KpiCard
          label="Dépenses"
          value={formatFCFA(kpis.expenses)}
          icon={Wallet}
          color="amber"
          loading={loading}
        />
        <KpiCard
          label="Bénéfice net"
          value={formatFCFA(kpis.profit)}
          icon={kpis.profit >= 0 ? TrendingUp : TrendingDown}
          color={kpis.profit >= 0 ? 'green' : 'red'}
          loading={loading}
        />
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
                    <p className="text-xs text-gray-400">{format(new Date(s.date), 'dd MMM', { locale: fr })} · Qté: {s.quantity}</p>
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