// apps/web/src/app/(app)/rentabilite/page.jsx
// Analyse Rentabilité: margin per product, top performers, monthly profit breakdown.
'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { PieChart, TrendingUp, TrendingDown, Package } from 'lucide-react'
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from 'recharts'
import { useAppStore } from '@/context/store'
import { getAll } from '@/lib/db/local'
import { formatFCFA } from '@/lib/core/calculations'
import { PageHeader, StatCard } from '@/components/ui'
import { getAllIncludingDeleted } from '@/lib/db/local'

export default function RentabilitePage() {
  const shop = useAppStore(s => s.shop)
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month') // month | quarter | all

const load = useCallback(async () => {
    if (!shop?.id) return
    const [p, s, e] = await Promise.all([
      getAll('products', shop.id),
      getAllIncludingDeleted('sales', shop.id),   // ← includes soft-deleted
      getAllIncludingDeleted('expenses', shop.id), // ← includes soft-deleted
    ])
    setProducts(p)
    // Include deleted sales but NOT cancelled ones for profitability (or mark them)
    setSales(s.filter(sale => !sale.cancelled_at))
    setExpenses(e)
    setLoading(false)
  }, [shop?.id])

  useEffect(() => { load() }, [load])

  // Filter sales by period
  const filteredSales = useMemo(() => {
    const now = new Date()
    if (period === 'month') {
      const start = startOfMonth(now)
      const end = endOfMonth(now)
      return sales.filter(s => isWithinInterval(new Date(s.date), { start, end }))
    }
    if (period === 'quarter') {
      const start = startOfMonth(subMonths(now, 2))
      const end = endOfMonth(now)
      return sales.filter(s => isWithinInterval(new Date(s.date), { start, end }))
    }
    return sales
  }, [sales, period])

  const filteredExpenses = useMemo(() => {
    const now = new Date()
    if (period === 'month') {
      const start = startOfMonth(now)
      const end = endOfMonth(now)
      return expenses.filter(e => isWithinInterval(new Date(e.date), { start, end }))
    }
    if (period === 'quarter') {
      const start = startOfMonth(subMonths(now, 2))
      const end = endOfMonth(now)
      return expenses.filter(e => isWithinInterval(new Date(e.date), { start, end }))
    }
    return expenses
  }, [expenses, period])

  // Per-product profitability
  const productStats = useMemo(() => {
    const map = {}
    for (const s of filteredSales) {
      const key = s.product_id || s.product_name
      if (!map[key]) {
        map[key] = {
          name: s.product_name,
          code: s.product_code || '',
          totalSale: 0,
          totalCost: 0,
          totalProfit: 0,
          qty: 0,
        }
      }
      map[key].totalSale += s.total_sale || 0
      map[key].totalCost += s.total_purchase_cost || 0
      map[key].totalProfit += s.profit || 0
      map[key].qty += s.quantity || 0
    }
    return Object.values(map)
      .map(p => ({ ...p, margin: p.totalSale > 0 ? (p.totalProfit / p.totalSale) * 100 : 0 }))
      .sort((a, b) => b.totalProfit - a.totalProfit)
  }, [filteredSales])

  const totalRevenue = useMemo(() => filteredSales.reduce((s, v) => s + (v.total_sale || 0), 0), [filteredSales])
  const totalCost = useMemo(() => filteredSales.reduce((s, v) => s + (v.total_purchase_cost || 0), 0), [filteredSales])
  const totalGrossProfit = useMemo(() => filteredSales.reduce((s, v) => s + (v.profit || 0), 0), [filteredSales])
  const totalExpAmount = useMemo(() => filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0), [filteredExpenses])
  const netProfit = totalGrossProfit - totalExpAmount
  const grossMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0

  // Monthly chart data (last 6 months)
  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i)
      const start = startOfMonth(date)
      const end = endOfMonth(date)
      const inPeriod = (d) => isWithinInterval(new Date(d), { start, end })
      const monthSales = sales.filter(s => inPeriod(s.date))
      const monthExpenses = expenses.filter(e => inPeriod(e.date))
      const revenue = monthSales.reduce((s, v) => s + (v.total_sale || 0), 0)
      const gross = monthSales.reduce((s, v) => s + (v.profit || 0), 0)
      const exp = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0)
      return {
        month: format(date, 'MMM yy', { locale: fr }),
        'Marge brute': gross,
        'Dépenses': exp,
        'Bénéfice net': Math.max(0, gross - exp),
      }
    })
  }, [sales, expenses])

  const primaryColor = shop?.color_primary || '#1a56db'

  return (
    <div className="p-6">
      <PageHeader
        title="Analyse Rentabilité"
        subtitle="Marges, bénéfices et performance par produit"
      />

      {/* Period selector */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {[
          { key: 'month', label: 'Ce mois' },
          { key: 'quarter', label: '3 derniers mois' },
          { key: 'all', label: 'Tout' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setPeriod(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>{label}</button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Chiffre d'affaires" value={formatFCFA(totalRevenue)} color="blue" icon={TrendingUp} />
        <StatCard label="Coût des ventes" value={formatFCFA(totalCost)} color="purple" />
        <StatCard label="Marge brute" value={formatFCFA(totalGrossProfit)} color="green"
          sub={`${grossMargin.toFixed(1)}% du CA`} />
        <StatCard label="Dépenses" value={formatFCFA(totalExpAmount)} color="red" />
        <StatCard
          label="Bénéfice net"
          value={formatFCFA(netProfit)}
          color={netProfit >= 0 ? 'green' : 'red'}
          icon={netProfit >= 0 ? TrendingUp : TrendingDown}
        />
      </div>

      {/* Monthly chart */}
      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Évolution sur 6 mois</h2>
        {loading ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Chargement…</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                     tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip formatter={(v) => formatFCFA(v)} labelStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Marge brute" fill={primaryColor} radius={[4,4,0,0]} />
              <Bar dataKey="Dépenses" fill="#f87171" radius={[4,4,0,0]} />
              <Bar dataKey="Bénéfice net" fill="#34d399" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Per-product table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-500" />
            Rentabilité par produit
          </h2>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Calcul en cours…</div>
        ) : productStats.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Aucune vente sur cette période</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['#','Produit','Qté vendue','CA total','Coût total','Marge brute','Marge %'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {productStats.map((p, i) => (
                  <tr key={p.name} className={`hover:bg-gray-50 ${i === 0 ? 'bg-emerald-50/30' : ''}`}>
                    <td className="px-4 py-3 text-gray-400 text-xs">#{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 max-w-[200px] truncate">{p.name}</p>
                      {p.code && <p className="text-xs text-gray-400">{p.code}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.qty}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatFCFA(p.totalSale)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatFCFA(p.totalCost)}</td>
                    <td className={`px-4 py-3 font-bold ${p.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatFCFA(p.totalProfit)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-20">
                          <div className="h-full bg-emerald-400 rounded-full"
                               style={{ width: `${Math.min(100, Math.max(0, p.margin))}%` }} />
                        </div>
                        <span className={`text-xs font-semibold ${p.margin >= 20 ? 'text-emerald-600' : p.margin >= 10 ? 'text-amber-600' : 'text-red-500'}`}>
                          {p.margin.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={3} className="px-4 py-3 font-semibold text-gray-700">TOTAL</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{formatFCFA(totalRevenue)}</td>
                  <td className="px-4 py-3 font-bold text-gray-700">{formatFCFA(totalCost)}</td>
                  <td className={`px-4 py-3 font-bold text-lg ${totalGrossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatFCFA(totalGrossProfit)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-600">{grossMargin.toFixed(1)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}