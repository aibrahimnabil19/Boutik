// Core business logic: formatting, amount conversion, monthly aggregation.
// Import this anywhere — no framework dependencies.

import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Currency formatting ──────────────────────────────────────────────────────

/** Format a number as FCFA: "1 250 000 FCFA" */
export function formatFCFA(amount, currency = 'FCFA') {
  if (amount == null || isNaN(amount)) return `— ${currency}`
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ` ${currency}`
}

/** Format without currency label */
export function formatNumber(n) {
  return new Intl.NumberFormat('fr-FR').format(n || 0)
}

// ─── Amount to words (French, FCFA) ──────────────────────────────────────────

const ONES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
              'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept',
              'dix-huit', 'dix-neuf']
const TENS = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante',
              'quatre-vingt', 'quatre-vingt']

function belowThousand(n) {
  if (n === 0) return ''
  if (n < 20) return ONES[n]
  const ten = Math.floor(n / 10)
  const one = n % 10
  if (ten === 7) return 'soixante-' + ONES[10 + one]
  if (ten === 9) return 'quatre-vingt-' + (one === 0 ? '' : ONES[one])
  if (ten === 8) return 'quatre-vingt' + (one === 0 ? 's' : '-' + ONES[one])
  if (one === 1 && ten !== 8) return TENS[ten] + (ten === 7 ? '-et-onze' : '-et-un')
  return TENS[ten] + (one > 0 ? '-' + ONES[one] : '')
}

function numberToWordsFR(n) {
  if (n === 0) return 'zéro'
  let result = ''
  if (n >= 1000000000) {
    const b = Math.floor(n / 1000000000)
    result += (b === 1 ? 'un milliard' : belowThousand(b) + ' milliards')
    n %= 1000000000
  }
  if (n >= 1000000) {
    const m = Math.floor(n / 1000000)
    result += (result ? ' ' : '') + (m === 1 ? 'un million' : belowThousand(m) + ' millions')
    n %= 1000000
  }
  if (n >= 1000) {
    const k = Math.floor(n / 1000)
    result += (result ? ' ' : '') + (k === 1 ? 'mille' : belowThousand(k) + ' mille')
    n %= 1000
  }
  if (n > 0) {
    const h = Math.floor(n / 100)
    const rest = n % 100
    if (h > 0) result += (result ? ' ' : '') + (h === 1 ? 'cent' : belowThousand(h) + ' cent' + (rest === 0 ? 's' : ''))
    if (rest > 0) result += (result ? ' ' : '') + belowThousand(rest)
  }
  return result
}

/** Convert amount to French words for invoices */
export function amountToWordsFCFA(amount) {
  const n = Math.round(Number(amount))
  if (isNaN(n)) return ''
  return 'Arrêté la présente à la somme de ' + numberToWordsFR(n) + ' francs CFA'
}

// ─── Monthly aggregation for charts ──────────────────────────────────────────

/**
 * Build last N months of aggregated data for the area chart.
 * @param {Array} sales
 * @param {Array} purchases
 * @param {Array} expenses
 * @param {number} months
 */
export function getMonthlyTotals(sales, purchases, expenses, months = 6) {
  const result = []
  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(new Date(), i)
    const start = startOfMonth(date)
    const end = endOfMonth(date)
    const inPeriod = (d) => isWithinInterval(new Date(d), { start, end })

    const totalSales     = sales.filter(s => inPeriod(s.date)).reduce((a, s) => a + (s.total_sale || 0), 0)
    const totalPurchases = purchases.filter(p => inPeriod(p.date)).reduce((a, p) => a + (p.total_amount || 0), 0)
    const totalExpenses  = expenses.filter(e => inPeriod(e.date)).reduce((a, e) => a + (e.amount || 0), 0)
    const profit         = sales.filter(s => inPeriod(s.date)).reduce((a, s) => a + (s.profit || 0), 0) - totalExpenses

    result.push({
      month: format(date, 'MMM yy', { locale: fr }),
      ventes: totalSales,
      achats: totalPurchases,
      depenses: totalExpenses,
      benefice: profit,
    })
  }
  return result
}

// ─── Invoice numbering ────────────────────────────────────────────────────────

/**
 * Generate next invoice number.
 * Format: NN-MM-YYYY (e.g., 03-04-2026)
 */
export function generateInvoiceNumber(existingInvoices, type = 'facture') {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year  = now.getFullYear()
  const prefix = `${month}-${year}`

  const sameMonth = existingInvoices.filter(inv => {
    return inv.invoice_number?.includes(prefix) && inv.type === type
  })

  const next = sameMonth.length + 1
  return `${String(next).padStart(2, '0')}-${prefix}`
}

// ─── Stock calculation ────────────────────────────────────────────────────────

/** Calculate current stock for a product */
export function calculateStock(product, purchases, sales) {
  const bought = purchases
    .filter(p => p.product_id === product.id || p.product_code === product.code)
    .reduce((a, p) => a + (p.quantity || 0), 0)

  const sold = sales
    .filter(s => s.product_id === product.id || s.product_code === product.code)
    .reduce((a, s) => a + (s.quantity || 0), 0)

  return (product.stock_initial || 0) + bought - sold
}

// ─── Client/Supplier balance ──────────────────────────────────────────────────

/** Sum all transactions for a client (positive = owes us, negative = we owe them) */
export function calculateClientBalance(clientId, transactions) {
  return transactions
    .filter(t => t.client_id === clientId && !t.deleted_at)
    .reduce((a, t) => a + (t.amount || 0), 0)
}

export function calculateSupplierBalance(supplierId, transactions) {
  return transactions
    .filter(t => t.supplier_id === supplierId && !t.deleted_at)
    .reduce((a, t) => a + (t.amount || 0), 0)
}

// ─── Invoice total ────────────────────────────────────────────────────────────

export function calculateInvoiceTotal(items) {
  return items.reduce((a, item) => a + (item.total_price || item.quantity * item.unit_price || 0), 0)
}