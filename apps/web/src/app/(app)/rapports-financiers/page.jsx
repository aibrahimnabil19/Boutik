'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { BookOpen, Scale, FileBarChart, Table2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { getAll } from '@/lib/db/local'
import { calculateStock, formatFCFA } from '@/lib/core/calculations'
import { PageHeader, StatCard, Badge } from '@/components/ui'
import DateFilter from '@/components/DateFilter'
import { defaultDateFilter, isDateInFilter, describeDateFilter } from '@/lib/core/dateFilters'

function n(v) {
  return Number(v || 0)
}

function balanceByEntity(rows, key) {
  const map = {}

  for (const row of rows || []) {
    if (!row[key]) continue
    map[row[key]] = (map[row[key]] || 0) + n(row.amount)
  }

  return map
}

export default function RapportsFinanciersPage() {
  const shop = useAppStore(s => s.shop)

  const [tab, setTab] = useState('resultat')
  const [dateFilter, setDateFilter] = useState(defaultDateFilter())
  const [loading, setLoading] = useState(true)

  const [products, setProducts] = useState([])
  const [purchases, setPurchases] = useState([])
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [clientTransactions, setClientTransactions] = useState([])
  const [supplierTransactions, setSupplierTransactions] = useState([])

  const load = useCallback(async () => {
    if (!shop?.id) return

    const [pr, pu, sa, ex, ct, st] = await Promise.all([
      getAll('products', shop.id),
      getAll('purchases', shop.id),
      getAll('sales', shop.id),
      getAll('expenses', shop.id),
      getAll('client_transactions', shop.id),
      getAll('supplier_transactions', shop.id),
    ])

    setProducts(pr)
    setPurchases(pu)
    setSales(sa.filter(s => !s.cancelled_at))
    setExpenses(ex)
    setClientTransactions(ct)
    setSupplierTransactions(st)
    setLoading(false)
  }, [shop?.id])

  useEffect(() => { load() }, [load])

  const filteredSales = useMemo(
    () => sales.filter(s => isDateInFilter(s.date, dateFilter)),
    [sales, dateFilter]
  )

  const filteredPurchases = useMemo(
    () => purchases.filter(p => isDateInFilter(p.date, dateFilter)),
    [purchases, dateFilter]
  )

  const filteredExpenses = useMemo(
    () => expenses.filter(e => isDateInFilter(e.date, dateFilter)),
    [expenses, dateFilter]
  )

  const filteredClientTx = useMemo(
    () => clientTransactions.filter(t => isDateInFilter(t.date, dateFilter)),
    [clientTransactions, dateFilter]
  )

  const filteredSupplierTx = useMemo(
    () => supplierTransactions.filter(t => isDateInFilter(t.date, dateFilter)),
    [supplierTransactions, dateFilter]
  )

  const income = useMemo(() => {
    const revenue = filteredSales.reduce((s, r) => s + n(r.total_sale), 0)
    const costOfSales = filteredSales.reduce((s, r) => s + n(r.total_purchase_cost), 0)
    const grossProfit = revenue - costOfSales
    const charges = filteredExpenses.reduce((s, r) => s + n(r.amount), 0)
    const netProfit = grossProfit - charges

    return {
      revenue,
      costOfSales,
      grossProfit,
      charges,
      netProfit,
      grossMargin: revenue > 0 ? grossProfit / revenue : 0,
    }
  }, [filteredSales, filteredExpenses])

  const balanceSheet = useMemo(() => {
    const stockValue = products.reduce((sum, product) => {
      const stock = calculateStock(product, purchases, sales)
      return sum + stock * n(product.purchase_price)
    }, 0)

    const clientBalances = balanceByEntity(clientTransactions, 'client_id')
    const supplierBalances = balanceByEntity(supplierTransactions, 'supplier_id')

    const clientReceivables = Object.values(clientBalances)
      .filter(v => v > 0)
      .reduce((s, v) => s + v, 0)

    const clientAdvances = Math.abs(
      Object.values(clientBalances)
        .filter(v => v < 0)
        .reduce((s, v) => s + v, 0)
    )

    const supplierDebt = Object.values(supplierBalances)
      .filter(v => v > 0)
      .reduce((s, v) => s + v, 0)

    const supplierCredit = Math.abs(
      Object.values(supplierBalances)
        .filter(v => v < 0)
        .reduce((s, v) => s + v, 0)
    )

    const paidSales = sales.reduce((s, r) => s + n(r.paid_amount || r.total_sale), 0)
    const paidPurchases = purchases.reduce((s, r) => s + n(r.paid_amount || r.total_amount), 0)
    const paidCharges = expenses.reduce((s, r) => s + n(r.amount), 0)

    const clientPayments = clientTransactions
      .filter(t => n(t.amount) < 0)
      .reduce((s, t) => s + Math.abs(n(t.amount)), 0)

    const supplierPayments = supplierTransactions
      .filter(t => n(t.amount) < 0)
      .reduce((s, t) => s + Math.abs(n(t.amount)), 0)

    const estimatedCash = paidSales + clientPayments - paidPurchases - supplierPayments - paidCharges

    const totalAssets = stockValue + clientReceivables + Math.max(0, estimatedCash) + supplierCredit
    const totalLiabilities = supplierDebt + clientAdvances
    const equity = totalAssets - totalLiabilities

    return {
      stockValue,
      clientReceivables,
      supplierCredit,
      estimatedCash,
      supplierDebt,
      clientAdvances,
      totalAssets,
      totalLiabilities,
      equity,
    }
  }, [products, purchases, sales, expenses, clientTransactions, supplierTransactions])

  const ledgerRows = useMemo(() => {
    const rows = []

    for (const sale of filteredSales) {
      const label = `Vente — ${sale.product_name || ''}`

      rows.push({
        date: sale.date,
        journal: 'Vente',
        account: sale.payment_status === 'credit' ? 'Clients / Créances' : 'Caisse',
        label,
        debit: n(sale.total_sale),
        credit: 0,
      })

      rows.push({
        date: sale.date,
        journal: 'Vente',
        account: 'Chiffre d’affaires',
        label,
        debit: 0,
        credit: n(sale.total_sale),
      })

      rows.push({
        date: sale.date,
        journal: 'Coût vente',
        account: 'Coût des ventes',
        label,
        debit: n(sale.total_purchase_cost),
        credit: 0,
      })

      rows.push({
        date: sale.date,
        journal: 'Stock',
        account: 'Stock marchandises',
        label,
        debit: 0,
        credit: n(sale.total_purchase_cost),
      })
    }

    for (const purchase of filteredPurchases) {
      const label = `Entrée stock — ${purchase.product_name || ''}`

      rows.push({
        date: purchase.date,
        journal: 'Achat',
        account: 'Stock marchandises',
        label,
        debit: n(purchase.total_amount),
        credit: 0,
      })

      rows.push({
        date: purchase.date,
        journal: 'Achat',
        account: purchase.payment_status === 'credit' ? 'Fournisseurs / Dettes' : 'Caisse',
        label,
        debit: 0,
        credit: n(purchase.total_amount),
      })
    }

    for (const charge of filteredExpenses) {
      rows.push({
        date: charge.date,
        journal: 'Charge',
        account: `Charges — ${charge.category || 'Autre'}`,
        label: charge.description || '',
        debit: n(charge.amount),
        credit: 0,
      })

      rows.push({
        date: charge.date,
        journal: 'Charge',
        account: 'Caisse',
        label: charge.description || '',
        debit: 0,
        credit: n(charge.amount),
      })
    }

    for (const tx of filteredClientTx) {
      rows.push({
        date: tx.date,
        journal: 'Client',
        account: n(tx.amount) < 0 ? 'Caisse / Avance client' : 'Clients / Créances',
        label: tx.label || '',
        debit: n(tx.amount) < 0 ? Math.abs(n(tx.amount)) : n(tx.amount),
        credit: 0,
      })
    }

    for (const tx of filteredSupplierTx) {
      rows.push({
        date: tx.date,
        journal: 'Fournisseur',
        account: n(tx.amount) < 0 ? 'Fournisseurs / Paiement' : 'Fournisseurs / Dettes',
        label: tx.label || '',
        debit: n(tx.amount) < 0 ? Math.abs(n(tx.amount)) : 0,
        credit: n(tx.amount) > 0 ? n(tx.amount) : 0,
      })
    }

    return rows.sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [filteredSales, filteredPurchases, filteredExpenses, filteredClientTx, filteredSupplierTx])

  const tabs = [
    { key: 'resultat', label: 'Compte de résultat', icon: FileBarChart },
    { key: 'bilan', label: 'Bilan', icon: Scale },
    { key: 'grand-livre', label: 'Grand livre', icon: Table2 },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Rapports financiers"
        subtitle={`Période : ${describeDateFilter(dateFilter)}`}
      />

      <div className="card p-4 mb-6">
        <DateFilter value={dateFilter} onChange={setDateFilter} />
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-10 text-center text-gray-400 text-sm">Chargement…</div>
      ) : tab === 'resultat' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Chiffre d’affaires" value={formatFCFA(income.revenue)} color="blue" />
            <StatCard label="Coût des ventes" value={formatFCFA(income.costOfSales)} color="purple" />
            <StatCard label="Marge brute" value={formatFCFA(income.grossProfit)} color="green" sub={`${(income.grossMargin * 100).toFixed(1)}%`} />
            <StatCard label="Charges" value={formatFCFA(income.charges)} color="red" />
            <StatCard label="Résultat net" value={formatFCFA(income.netProfit)} color={income.netProfit >= 0 ? 'green' : 'red'} />
          </div>
        </div>
      ) : tab === 'bilan' ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Actif</h2>
            </div>

            <table className="w-full text-sm table-zebra">
              <tbody>
                <tr><td className="px-4 py-3">Stock marchandises</td><td className="px-4 py-3 text-right font-bold">{formatFCFA(balanceSheet.stockValue)}</td></tr>
                <tr><td className="px-4 py-3">Créances clients</td><td className="px-4 py-3 text-right font-bold">{formatFCFA(balanceSheet.clientReceivables)}</td></tr>
                <tr><td className="px-4 py-3">Crédit fournisseur</td><td className="px-4 py-3 text-right font-bold">{formatFCFA(balanceSheet.supplierCredit)}</td></tr>
                <tr><td className="px-4 py-3">Caisse estimée</td><td className="px-4 py-3 text-right font-bold">{formatFCFA(balanceSheet.estimatedCash)}</td></tr>
                <tr className="border-t-2 border-gray-200"><td className="px-4 py-3 font-bold">Total actif</td><td className="px-4 py-3 text-right font-bold">{formatFCFA(balanceSheet.totalAssets)}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Passif & Capitaux propres</h2>
            </div>

            <table className="w-full text-sm table-zebra">
              <tbody>
                <tr><td className="px-4 py-3">Dettes fournisseurs</td><td className="px-4 py-3 text-right font-bold">{formatFCFA(balanceSheet.supplierDebt)}</td></tr>
                <tr><td className="px-4 py-3">Avances clients</td><td className="px-4 py-3 text-right font-bold">{formatFCFA(balanceSheet.clientAdvances)}</td></tr>
                <tr><td className="px-4 py-3 font-bold">Total passif</td><td className="px-4 py-3 text-right font-bold">{formatFCFA(balanceSheet.totalLiabilities)}</td></tr>
                <tr className="border-t-2 border-gray-200"><td className="px-4 py-3 font-bold">Situation nette</td><td className="px-4 py-3 text-right font-bold">{formatFCFA(balanceSheet.equity)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <h2 className="font-semibold text-gray-900">Grand livre</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm table-zebra">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Date', 'Journal', 'Compte', 'Libellé', 'Débit', 'Crédit'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {ledgerRows.map((row, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {format(new Date(row.date), 'dd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color="blue">{row.journal}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.account}</td>
                    <td className="px-4 py-3 text-gray-600">{row.label}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.debit ? formatFCFA(row.debit) : '—'}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.credit ? formatFCFA(row.credit) : '—'}</td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={4} className="px-4 py-3 font-semibold text-gray-700">Totaux</td>
                  <td className="px-4 py-3 font-bold">{formatFCFA(ledgerRows.reduce((s, r) => s + n(r.debit), 0))}</td>
                  <td className="px-4 py-3 font-bold">{formatFCFA(ledgerRows.reduce((s, r) => s + n(r.credit), 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}