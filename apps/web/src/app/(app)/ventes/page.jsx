'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { v4 as uuid } from 'uuid'
import { toast } from 'sonner'
import { TrendingUp, Plus, Trash2, Pencil, PlusCircle, FileText, Printer, Receipt, Truck, Wallet, CheckCircle, PackageCheck } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { localDb, getAll, localUpsert, localDelete, cancelSale } from '@/lib/db/local'
import { formatFCFA, formatNumber, generateDocumentNumber } from '@/lib/core/calculations'
import {
  PageHeader, SearchBar, Modal, FormField, EmptyState,
  ConfirmDialog, Btn, StatCard, Badge, inputCls, selectCls
} from '@/components/ui'
import { printSaleDocument, printSaleDocumentMulti } from '@/lib/core/invoicePrint'
import FrenchInput from '@/components/FrenchInput'
import { useRouter, useSearchParams } from 'next/navigation'
import DateFilter from '@/components/DateFilter'
import { defaultDateFilter, isDateInFilter } from '@/lib/core/dateFilters'
import PhoneInput from '@/components/PhoneInput'
import DocumentPrintOptions, { getDefaultDocumentOptions } from '@/components/DocumentPrintOptions'
import PaymentBreakdownInput, {
  cleanPaymentBreakdown,
  sumPaymentBreakdown,
} from '@/components/PaymentBreakdownInput'
import GuaranteePicker from '@/components/GuaranteePicker'
import { GUARANTEE_OPTIONS } from '@/lib/core/guarantees'

function computeStock(product, purchases, sales) {
  const bought = purchases
    .filter((p) => p.product_id === product.id)
    .reduce((a, p) => a + Number(p.quantity || 0), 0)
  // Exclude pending_advance sales from stock deduction — stock only deducted on collect
  const sold = sales
    .filter((s) => s.product_id === product.id && !s.cancelled_at && s.status !== 'pending_advance')
    .reduce((a, s) => a + Number(s.quantity || 0), 0)
  return Number(product.stock_initial || 0) + bought - sold
}

const emptyLine = () => ({
  _key: uuid(),
  product_id: '',
  purchase_id: '',
  product_name: '',
  product_code: '',
  unit_cost: 0,
  manual_cost: false,
  quantity: 1,
  unit_sale_price: '',
})

const SALE_DOC_TYPES = [
  { key: 'proforma', label: 'Facture proforma', icon: FileText, description: 'Devis / offre de prix' },
  { key: 'facture', label: 'Facture définitive', icon: Receipt, description: 'Document officiel de vente' },
  { key: 'bon_livraison', label: 'Bon de livraison', icon: Truck, description: 'Document de remise des articles' },
  { key: 'bon_commande', label: 'Bon de commande', icon: FileText, description: 'Document de commande lié à la vente' },
]

export default function VentesPage() {
  const shop = useAppStore(s => s.shop)
  const router = useRouter()
  const searchParams = useSearchParams()
  const action = searchParams.get('action')
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [purchases, setPurchases] = useState([])
  const [clients, setClients] = useState([])
  const [clientTransactions, setClientTransactions] = useState([])
  const [invoices, setInvoices] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paymentModal, setPaymentModal] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [advancePaymentBreakdown, setAdvancePaymentBreakdown] = useState([])
  const [clientModal, setClientModal] = useState(false)
  const [quickClient, setQuickClient] = useState({ name: '', phone: '', address: '' })
  const [editingGroup, setEditingGroup] = useState(null)
  const [printOptions, setPrintOptions] = useState(getDefaultDocumentOptions())
  const [docGuarantee, setDocGuarantee] = useState({
    key: GUARANTEE_OPTIONS[0].key,
    text: GUARANTEE_OPTIONS[0].text,
  })
  const [docModal, setDocModal] = useState(null)
  const [saleDetail, setSaleDetail] = useState(null)
  const [dateFilter, setDateFilter] = useState(defaultDateFilter())

  const [cart, setCart] = useState([emptyLine()])
  const [saleCharges, setSaleCharges] = useState([])
  const [newLineKey, setNewLineKey] = useState(null)
  const [saleDate, setSaleDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [saleClientId, setSaleClientId] = useState('')
  const [paymentMode, setPaymentMode] = useState('')
  const [paidAmount, setPaidAmount] = useState('')
  const [paymentBreakdown, setPaymentBreakdown] = useState([])
  const [selectMode, setSelectMode] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState(new Set())

  const load = useCallback(async () => {
    if (!shop?.id) return
    const [s, p, pu, c, ct, inv] = await Promise.all([
      getAll('sales', shop.id),
      getAll('products', shop.id),
      getAll('purchases', shop.id),
      getAll('clients', shop.id),
      getAll('client_transactions', shop.id),
      getAll('invoices', shop.id),
    ])
    setClientTransactions(ct)
    setInvoices(inv)
    setSales(s.sort((a, b) => new Date(b.date) - new Date(a.date)))
    setProducts(p)
    setPurchases(pu)
    setClients(c)
    setLoading(false)
  }, [shop?.id])

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), 'fr', { sensitivity: 'base' })
    )
  }, [clients])

  function clientBalance(clientId) {
    return clientTransactions
      .filter(t => t.client_id === clientId)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)
  }

  // ── Advance payment modal (add more money to a pending_advance sale) ──
  function openAdvancePayment(group) {
    const grandTotal = group.items
      .filter(i => !i.is_charge)
      .reduce((s, i) => s + Number(i.total_sale || 0), 0)
    const alreadyPaid = group.items
      .filter(i => !i.is_charge)
      .reduce((s, i) => s + Number(i.paid_amount || 0), 0)
    if (alreadyPaid >= grandTotal) {
      toast('Cette vente est déjà entièrement payée. Vous pouvez la collecter.')
      return
    }
    setPaymentModal({ ...group, _advanceMode: true, _grandTotal: grandTotal, _alreadyPaid: alreadyPaid })
    setPaymentAmount('')
    setAdvancePaymentBreakdown([])
  }

  // ── Credit payment modal (legacy credit sales) ──
  function openPayment(group) {
    if (!group || Number(group.remaining_amount || 0) <= 0) {
      toast.error('Cette vente est déjà entièrement payée.')
      return
    }
    setPaymentModal(group)
    setPaymentAmount('')
    setAdvancePaymentBreakdown([])
  }

  function emptyCharge() {
    return { _key: uuid(), label: 'Charge supplémentaire', amount: '' }
  }

  function addSaleCharge() {
    setSaleCharges((prev) => [...prev, emptyCharge()])
  }

  function updateSaleCharge(key, field, value) {
    setSaleCharges((prev) =>
      prev.map((row) => row._key === key ? { ...row, [field]: value } : row)
    )
  }

  function removeSaleCharge(key) {
    setSaleCharges((prev) => prev.filter((row) => row._key !== key))
  }

  const cleanSaleCharges = useMemo(() => {
    return saleCharges
      .map((row) => ({
        label: String(row.label || 'Charge supplémentaire').trim() || 'Charge supplémentaire',
        amount: Number(row.amount || 0),
      }))
      .filter((row) => row.amount > 0)
  }, [saleCharges])

  const saleChargeTotal = useMemo(() => {
    return cleanSaleCharges.reduce((sum, row) => sum + Number(row.amount || 0), 0)
  }, [cleanSaleCharges])

  function saleKeyLabel(key) {
    return String(key || '').slice(0, 8).toUpperCase()
  }

  async function cleanupSettledCreditLabels(saleKey, clientId) {
    if (!shop?.id || !clientId) return
    const key = saleKeyLabel(saleKey)
    const txs = await getAll('client_transactions', shop.id)
    const linked = txs.filter((tx) => {
      const label = String(tx.label || '')
      return (
        tx.client_id === clientId &&
        label.includes(key) &&
        (label.startsWith('Vente à crédit') || label.startsWith('Paiement vente'))
      )
    })
    if (!linked.length) return
    const net = linked.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
    if (Math.abs(net) > 0.01) return
    for (const tx of linked) {
      await localDelete('client_transactions', tx.id)
    }
  }

  // ── Handle adding payment to an advance/pending_advance sale ──
  async function handleAdvancePayment(e) {
    e.preventDefault()
    if (!paymentModal) return
    const amount = Number(paymentAmount || 0)
    const remaining = paymentModal._grandTotal - paymentModal._alreadyPaid
    if (amount <= 0) { toast.error('Montant invalide.'); return }
    if (amount > remaining + 0.01) { toast.error('Le paiement dépasse le reste à payer.'); return }

    // Validate breakdown if provided
    if (advancePaymentBreakdown.length > 0) {
      const breakdownTotal = sumPaymentBreakdown(advancePaymentBreakdown)
      if (Math.abs(breakdownTotal - amount) > 0.01) {
        toast.error('La somme des moyens de paiement doit correspondre au montant payé.')
        return
      }
    }

    const now = new Date().toISOString()
    const groupItems = (paymentModal.items || []).filter(i => !i.is_charge)
    if (!groupItems.length) { toast.error('Aucune ligne de vente trouvée.'); return }

    const newTotalPaid = paymentModal._alreadyPaid + amount
    const isFullyPaid = newTotalPaid >= paymentModal._grandTotal - 0.01

    // Distribute across product lines proportionally
    let leftToApply = amount
    for (const item of groupItems) {
      const itemRemaining = Number(item.remaining_amount || 0)
      if (itemRemaining <= 0) continue
      const applied = Math.min(leftToApply, itemRemaining)
      const newRemaining = Math.max(0, itemRemaining - applied)
      leftToApply -= applied
      await localUpsert('sales', {
        ...item,
        paid_amount: Number(item.paid_amount || 0) + applied,
        remaining_amount: newRemaining,
        payment_status: newRemaining <= 0 ? 'paid' : 'credit',
        // Keep status as pending_advance until collected
        updated_at: now,
        sync_status: 'pending',
      })
      if (leftToApply <= 0) break
    }

    // Record client transaction if client is linked
    const firstItem = groupItems[0]
    const clientId = firstItem.client_id
    if (clientId) {
      await localUpsert('client_transactions', {
        id: uuid(), shop_id: shop.id, client_id: clientId,
        date: format(new Date(), 'yyyy-MM-dd'),
        label: `Paiement avance — ${String(paymentModal.key).slice(0, 8).toUpperCase()}`,
        amount: -amount, created_at: now, updated_at: now, sync_status: 'pending',
      })
    }

    if (isFullyPaid) {
      toast.success('✅ Vente entièrement payée ! Vous pouvez maintenant collecter les articles.')
    } else {
      toast.success('Paiement enregistré')
    }

    setPaymentModal(null)
    setPaymentAmount('')
    setAdvancePaymentBreakdown([])
    await load()
  }

  // ── Handle legacy credit payment ──
  async function handleCreditPayment(e) {
    e.preventDefault()
    if (!paymentModal || paymentModal._advanceMode) return
    const amount = Number(paymentAmount || 0)
    const remaining = Number(paymentModal.remaining_amount || 0)
    if (amount <= 0) { toast.error('Montant invalide.'); return }
    if (amount > remaining) { toast.error('Le paiement dépasse le reste à payer.'); return }

    const now = new Date().toISOString()
    const groupItems = paymentModal.items || []
    if (!groupItems.length) { toast.error('Aucune ligne de vente trouvée.'); return }

    const firstItem = groupItems[0]
    let clientId = firstItem.client_id || null

    if (!clientId && firstItem.client_name) {
      const existingClient = clients.find(
        c => String(c.name || '').trim().toLowerCase() === String(firstItem.client_name || '').trim().toLowerCase()
      )
      if (existingClient) {
        clientId = existingClient.id
      } else {
        const newClient = {
          id: uuid(), shop_id: shop.id, name: firstItem.client_name,
          phone: firstItem.client_phone || '', address: '',
          created_at: now, updated_at: now, sync_status: 'pending',
        }
        await localUpsert('clients', newClient)
        clientId = newClient.id
      }
    }

    if (!clientId) { toast.error('Client introuvable pour cette vente à crédit.'); return }

    let leftToApply = amount
    for (const item of groupItems) {
      const itemRemaining = Number(item.remaining_amount || 0)
      if (itemRemaining <= 0) continue
      const applied = Math.min(leftToApply, itemRemaining)
      const newRemaining = Math.max(0, itemRemaining - applied)
      leftToApply -= applied
      await localUpsert('sales', {
        ...item,
        client_id: item.client_id || clientId,
        paid_amount: Number(item.paid_amount || 0) + applied,
        remaining_amount: newRemaining,
        payment_status: newRemaining <= 0 ? 'paid' : 'credit',
        updated_at: now,
        sync_status: 'pending',
      })
      if (leftToApply <= 0) break
    }

    await localUpsert('client_transactions', {
      id: uuid(), shop_id: shop.id, client_id: clientId,
      date: format(new Date(), 'yyyy-MM-dd'),
      label: `Paiement vente — ${String(paymentModal.key).slice(0, 8).toUpperCase()}`,
      amount: -amount, created_at: now, updated_at: now, sync_status: 'pending',
    })

    if (Math.abs(amount - remaining) <= 0.01) {
      await cleanupSettledCreditLabels(paymentModal.key, clientId)
    }

    toast.success('Paiement enregistré')
    setPaymentModal(null)
    setPaymentAmount('')
    await load()
  }

  // ── Collect a pending_advance sale (deduct stock) ──
  async function handleCollectAdvanceSale(group) {
    const sessionSales = sales.filter(s => (s.session_id || s.id) === group.key)
    const now = new Date().toISOString()

    // Check stock for product lines
    for (const item of sessionSales.filter(s => !s.is_charge)) {
      const prod = products.find(p => p.id === item.product_id)
      if (!prod) continue
      const otherSales = sales.filter(s => (s.session_id || s.id) !== group.key)
      const currentStock = computeStock(prod, purchases, otherSales)
      if (Number(item.quantity || 0) > currentStock) {
        toast.error(`Stock insuffisant pour ${prod.name}. Disponible : ${formatNumber(currentStock)}`)
        return
      }
    }

    const grandTotal = sessionSales
      .filter(s => !s.is_charge)
      .reduce((sum, s) => sum + Number(s.total_sale || 0), 0)
    const alreadyPaid = sessionSales
      .filter(s => !s.is_charge)
      .reduce((sum, s) => sum + Number(s.paid_amount || 0), 0)
    const remaining = Math.max(0, grandTotal - alreadyPaid)

    for (const s of sessionSales) {
      await localUpsert('sales', {
        ...s,
        status: 'completed',
        payment_status: remaining > 0 ? 'credit' : 'paid',
        updated_at: now,
        sync_status: 'pending',
      })
    }

    // If there's a remaining balance and a client, record it as credit
    const firstItem = sessionSales.find(s => !s.is_charge)
    if (remaining > 0 && firstItem?.client_id) {
      await localUpsert('client_transactions', {
        id: uuid(), shop_id: shop.id, client_id: firstItem.client_id,
        date: format(new Date(), 'yyyy-MM-dd'),
        label: `Solde vente collectée — ${String(group.key).slice(0, 8).toUpperCase()}`,
        amount: remaining, created_at: now, updated_at: now, sync_status: 'pending',
      })
    }

    toast.success('✅ Vente collectée — stock déduit')
    load()
  }

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (action !== 'new') return
    openAdd()
    router.replace('/ventes', { scroll: false })
  }, [action, router])

  useEffect(() => {
    if (!newLineKey) return
    const timer = setTimeout(() => setNewLineKey(null), 1800)
    return () => clearTimeout(timer)
  }, [newLineKey])

  // ─── Cart helpers ──────────────────────────────────────────────────────────
  function updateLine(key, field, value) {
    setCart(prev => prev.map(line => line._key === key ? { ...line, [field]: value } : line))
  }

  function getPurchaseCostOptions(productId) {
    const product = products.find(p => p.id === productId)
    const rows = purchases
      .filter(p => p.product_id === productId && !p.deleted_at)
      .map(p => {
        const soldFromThisPurchase = sales
          .filter(s => s.purchase_id === p.id && !s.deleted_at && !s.cancelled_at)
          .reduce((sum, s) => sum + Number(s.quantity || 0), 0)
        const remainingQty = Number(p.quantity || 0) - soldFromThisPurchase
        const qty = Number(p.quantity || 0)
        const unit = Number(p.unit_price || 0)
        const charges = Number(p.charge_total || 0)
        const realUnitCost = qty > 0 ? unit + charges / qty : unit
        return {
          purchaseId: p.id, value: realUnitCost, remainingQty, date: p.date,
          label: `${formatFCFA(realUnitCost)} — ${format(new Date(p.date), 'dd MMM yyyy', { locale: fr })} · reste ${formatNumber(Math.max(0, remainingQty))}${charges > 0 ? ' · charges incluses' : ''}`,
        }
      })
      .filter(option => Number(option.value || 0) > 0 && option.remainingQty > 0)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    if (product?.purchase_price) {
      rows.push({
        purchaseId: '', value: Number(product.purchase_price || 0), remainingQty: null, date: '',
        label: `${formatFCFA(product.purchase_price)} — prix catalogue`,
      })
    }
    return rows
  }

  function getDefaultPurchaseCost(productId) {
    return getPurchaseCostOptions(productId)[0]?.value || 0
  }

  function handleCostSelect(key, rawValue) {
    if (rawValue === 'manual') {
      setCart(prev => prev.map(line =>
        line._key === key ? { ...line, manual_cost: true, purchase_id: '', unit_cost: '' } : line
      ))
      return
    }
    const [purchaseId, cost] = String(rawValue).split('|')
    setCart(prev => prev.map(line =>
      line._key === key
        ? { ...line, manual_cost: false, purchase_id: purchaseId || '', unit_cost: Number(cost || 0) }
        : line
    ))
  }

  function selectProductForLine(key, productId) {
    if (!productId) {
      setCart(prev => prev.map(line =>
        line._key === key
          ? { ...line, product_id: '', product_name: '', product_code: '', unit_cost: 0, manual_cost: false, unit_sale_price: '' }
          : line
      ))
      return
    }
    const alreadySelected = cart.some(line => line._key !== key && line.product_id === productId)
    if (alreadySelected) {
      toast.error('Ce produit est déjà dans la vente. Augmentez simplement sa quantité.')
      return
    }
    const prod = products.find(p => p.id === productId)
    if (!prod) return
    const costOptions = getPurchaseCostOptions(prod.id)
    const defaultCost = costOptions[0]
    setCart(prev => prev.map(line =>
      line._key === key ? {
        ...line,
        product_id: prod.id, product_name: prod.name, product_code: prod.code || '',
        purchase_id: defaultCost?.purchaseId || '',
        unit_cost: defaultCost?.value || prod.purchase_price || 0,
        manual_cost: false, unit_sale_price: prod.sale_price || '',
      } : line
    ))
  }

  function removeLine(key) {
    if (cart.length === 1) return
    setCart(prev => prev.filter(l => l._key !== key))
  }

  function addLine() {
    const line = emptyLine()
    setCart(prev => [...prev, line])
    setNewLineKey(line._key)
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

  // ── CRITICAL: saleGrandTotal is PRODUCT REVENUE ONLY — charges are internal costs ──
  const saleGrandTotal = cartTotals.revenue

  const selectedClientForSale = clients.find(c => c.id === saleClientId) || null

  // For advance payment mode: paidAmount is the advance given now
  const advancePaid = paymentMode === 'advance' ? Math.max(0, Number(paidAmount || 0)) : 0
  const cashPaid = paymentMode === 'credit'
    ? Math.max(0, Number(paidAmount || 0))
    : paymentMode === 'paid'
      ? saleGrandTotal
      : 0

  const paidPreview = paymentMode === 'advance' ? advancePaid : cashPaid
  const remainingPreview = Math.max(0, saleGrandTotal - paidPreview)

  // ─── Submit ────────────────────────────────────────────────────────────────
  async function onSubmit(e) {
    e.preventDefault()

    if (!paymentMode) { toast.error('Choisissez le mode de paiement.'); return }

    if (paymentMode === 'paid') {
      const breakdownTotal = sumPaymentBreakdown(paymentBreakdown)
      if (paymentBreakdown.length === 0) { toast.error('Choisissez au moins un moyen de paiement.'); return }
      if (Math.abs(breakdownTotal - saleGrandTotal) > 0.01) {
        toast.error('La somme des moyens de paiement doit être égale au total de la vente.')
        return
      }
    }

    // Validate advance breakdown matches paidAmount
    if (paymentMode === 'advance' && paymentBreakdown.length > 0) {
      const breakdownTotal = sumPaymentBreakdown(paymentBreakdown)
      const advPaid = Number(paidAmount || 0)
      if (advPaid > 0 && Math.abs(breakdownTotal - advPaid) > 0.01) {
        toast.error('La somme des moyens de paiement doit correspondre au montant payé.')
        return
      }
    }

    // Validate credit breakdown matches paidAmount
    if (paymentMode === 'credit' && paymentBreakdown.length > 0) {
      const breakdownTotal = sumPaymentBreakdown(paymentBreakdown)
      const creditPaid = Number(paidAmount || 0)
      if (Math.abs(breakdownTotal - creditPaid) > 0.01) {
        toast.error('La somme des moyens de paiement doit correspondre au montant payé.')
        return
      }
    }

    for (const line of cart) {
      if (!line.product_id) { toast.error('Sélectionnez un produit pour chaque ligne'); return }
      if (!line.unit_sale_price || Number(line.unit_sale_price) <= 0) { toast.error(`Prix manquant pour ${line.product_name}`); return }
      if (!line.unit_cost || Number(line.unit_cost) <= 0) { toast.error(`Choisissez le prix d'achat pour ${line.product_name}`); return }
    }

    const requestedByProduct = new Map()
    for (const line of cart) {
      const q = Number(line.quantity || 0)
      if (q <= 0) { toast.error(`Quantité invalide pour ${line.product_name}`); return }
      requestedByProduct.set(line.product_id, (requestedByProduct.get(line.product_id) || 0) + q)
    }

    // For advance sales, DON'T check stock — stock is only deducted on collection
    if (paymentMode !== 'advance') {
      for (const [productId, requestedQty] of requestedByProduct.entries()) {
        const prod = products.find(p => p.id === productId)
        if (!prod) continue
        const stockSales = editingGroup
          ? sales.filter(s => (s.session_id || s.id) !== editingGroup.key)
          : sales
        const currentStock = computeStock(prod, purchases, stockSales)
        if (requestedQty > currentStock) {
          toast.error(`Stock insuffisant pour ${prod.name}. Disponible : ${formatNumber(currentStock)}`)
          return
        }
      }
    }

    const selectedClient = clients.find(c => c.id === saleClientId) || null

    let totalPaid = 0
    let remainingAmount = 0
    let paymentStatus = 'paid'
    let saleStatus = 'completed'

    if (paymentMode === 'paid') {
      totalPaid = saleGrandTotal
      remainingAmount = 0
      paymentStatus = 'paid'
      saleStatus = 'completed'
    } else if (paymentMode === 'credit') {
      const cashPaidFinal = Math.max(0, Number(paidAmount || 0))
      totalPaid = cashPaidFinal
      remainingAmount = Math.max(0, saleGrandTotal - totalPaid)
      paymentStatus = remainingAmount > 0 ? 'credit' : 'paid'
      saleStatus = 'completed'

      if (paymentStatus === 'credit' && !selectedClient) {
        toast.error('Choisissez un client pour enregistrer une vente à crédit.')
        return
      }
    } else if (paymentMode === 'advance') {
      // Advance: save as pending_advance, stock NOT deducted
      totalPaid = Math.max(0, Number(paidAmount || 0))
      remainingAmount = Math.max(0, saleGrandTotal - totalPaid)
      paymentStatus = remainingAmount <= 0 ? 'paid' : 'credit'
      saleStatus = 'pending_advance'
    }

    if (totalPaid > saleGrandTotal) {
      toast.error('Le montant payé ne peut pas dépasser le total de la vente.')
      return
    }

    const sessionId = editingGroup?.key || uuid()
    const now = new Date().toISOString()

    try {
      if (editingGroup) {
        const oldSales = sales.filter(s => (s.session_id || s.id) === editingGroup.key)
        for (const oldSale of oldSales) { await localDelete('sales', oldSale.id) }
        const oldKey = String(editingGroup.key).slice(0, 8).toUpperCase()
        const oldClientTx = await getAll('client_transactions', shop.id)
        for (const tx of oldClientTx) {
          const label = String(tx.label || '')
          const isLinked = label.includes(oldKey) &&
            (label.startsWith('Vente à crédit') || label.startsWith('Utilisation avance client') ||
              label.startsWith('Paiement vente') || label.startsWith('Paiement avance'))
          if (isLinked) await localDelete('client_transactions', tx.id)
        }
      }

      // Distribute payment proportionally across product lines only
      let paidLeft = totalPaid
      const savedSales = []

      // ── Save product lines ──
      for (const line of cart) {
        const q = Number(line.quantity || 0)
        const price = Number(line.unit_sale_price || 0)
        const cost = Number(line.unit_cost || 0)
        const lineTotal = q * price

        const linePaid = Math.min(lineTotal, paidLeft)
        paidLeft -= linePaid
        const lineRemaining = Math.max(0, lineTotal - linePaid)

        const saleRecord = {
          id: uuid(),
          shop_id: shop.id,
          session_id: sessionId,
          date: saleDate,
          store: '',
          client_id: selectedClient?.id || null,
          client_name: selectedClient?.name || '',
          client_phone: selectedClient?.phone || '',
          client_address: selectedClient?.address || '',
          purchase_id: line.purchase_id || null,
          product_id: line.product_id,
          product_code: line.product_code,
          product_name: line.product_name,
          quantity: q,
          unit_sale_price: price,
          total_sale: lineTotal,
          unit_purchase_cost: cost,
          total_purchase_cost: q * cost,
          profit: q * price - q * cost,
          payment_status: lineRemaining <= 0 ? 'paid' : 'credit',
          payment_method: paymentMode,
          payment_breakdown: (paymentMode === 'paid' || paymentMode === 'advance' || paymentMode === 'credit')
            ? cleanPaymentBreakdown(paymentBreakdown)
            : [],
          advance_used: 0,
          paid_amount: linePaid,
          remaining_amount: lineRemaining,
          status: saleStatus,
          is_charge: false,
          created_at: now,
          updated_at: now,
          sync_status: 'pending',
        }
        await localUpsert('sales', saleRecord)
        savedSales.push(saleRecord)
      }

      // ── Save charge lines ──
      for (const charge of cleanSaleCharges) {
        const lineTotal = Number(charge.amount || 0)
        const saleRecord = {
          id: uuid(),
          shop_id: shop.id,
          session_id: sessionId,
          date: saleDate,
          store: '',
          client_id: selectedClient?.id || null,
          client_name: selectedClient?.name || '',
          client_phone: selectedClient?.phone || '',
          client_address: selectedClient?.address || '',
          purchase_id: null,
          product_id: null,
          product_code: '',
          product_name: charge.label || 'Charge supplémentaire',
          quantity: 1,
          unit_sale_price: lineTotal,
          total_sale: lineTotal,
          unit_purchase_cost: 0,
          total_purchase_cost: 0,
          profit: -lineTotal,
          payment_status: 'paid',
          payment_method: paymentMode,
          payment_breakdown: [],
          advance_used: 0,
          paid_amount: lineTotal,
          remaining_amount: 0,
          status: saleStatus,
          is_charge: true,
          created_at: now,
          updated_at: now,
          sync_status: 'pending',
        }
        await localUpsert('sales', saleRecord)
        savedSales.push(saleRecord)
      }

      // ── Client transaction for credit sales ──
      if (paymentMode === 'credit' && remainingAmount > 0 && selectedClient) {
        await localUpsert('client_transactions', {
          id: uuid(), shop_id: shop.id, client_id: selectedClient.id,
          date: saleDate,
          label: `Vente à crédit — ${sessionId.slice(0, 8).toUpperCase()}`,
          amount: remainingAmount, created_at: now, updated_at: now, sync_status: 'pending',
        })
      }

      // ── Client transaction for advance sales ──
      if (paymentMode === 'advance' && totalPaid > 0 && selectedClient) {
        await localUpsert('client_transactions', {
          id: uuid(), shop_id: shop.id, client_id: selectedClient.id,
          date: saleDate,
          label: `Paiement avance — ${sessionId.slice(0, 8).toUpperCase()}`,
          amount: -totalPaid, created_at: now, updated_at: now, sync_status: 'pending',
        })
      }

      const successMsg = paymentMode === 'advance'
        ? `Vente en avance enregistrée — stock réservé (non déduit)`
        : editingGroup ? 'Vente modifiée' : `Vente enregistrée (${cart.length} produit${cart.length > 1 ? 's' : ''})`

      toast.success(successMsg)
      setEditingGroup(null)
      setModal(false)

      const group = {
        key: sessionId,
        date: saleDate,
        store: '',
        client_name: selectedClient?.name || '',
        client_phone: selectedClient?.phone || '',
        client_address: selectedClient?.address || '',
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

  async function handleQuickClientSubmit(e) {
    e.preventDefault()
    const name = quickClient.name.trim()
    if (!name) { toast.error('Nom du client requis.'); return }
    const now = new Date().toISOString()
    const record = {
      id: uuid(), shop_id: shop.id, name,
      phone: quickClient.phone || '', address: quickClient.address || '',
      created_at: now, updated_at: now, sync_status: 'pending',
    }
    await localUpsert('clients', record)
    setClients(prev =>
      [...prev, record].sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''), 'fr', { sensitivity: 'base' })
      )
    )
    setSaleClientId(record.id)
    setClientModal(false)
    setQuickClient({ name: '', phone: '', address: '' })
    toast.success('Client ajouté')
  }

  function openEditSale(group) {
    const firstItem = group.items?.[0]
    const matchedClient = clients.find(c =>
      c.id === firstItem?.client_id ||
      String(c.name || '').trim().toLowerCase() === String(group.client_name || '').trim().toLowerCase()
    )
    setEditingGroup(group)
    setSaleDate(group.date || format(new Date(), 'yyyy-MM-dd'))
    setSaleClientId(matchedClient?.id || '')

    const isAdvance = (group.items || []).some(i => i.status === 'pending_advance')
    if (isAdvance) {
      setPaymentMode('advance')
    } else {
      setPaymentMode(Number(group.remaining_amount || 0) > 0 ? 'credit' : 'paid')
    }
    setPaidAmount(String(group.paid_amount || ''))

    const productItems = (group.items || []).filter((item) => !item.is_charge)
    const chargeItems = (group.items || []).filter((item) => item.is_charge)

    setCart(
      productItems.map(item => ({
        _key: uuid(),
        existing_id: item.id,
        product_id: item.product_id || '',
        purchase_id: item.purchase_id || '',
        product_name: item.product_name || '',
        product_code: item.product_code || '',
        unit_cost: item.unit_purchase_cost || 0,
        manual_cost: !item.purchase_id,
        quantity: item.quantity || 1,
        unit_sale_price: item.unit_sale_price || '',
      }))
    )
    setSaleCharges(
      chargeItems.map((item) => ({
        _key: uuid(),
        existing_id: item.id,
        label: item.product_name || 'Charge supplémentaire',
        amount: item.unit_sale_price || '',
      }))
    )
    setPaymentBreakdown(firstItem?.payment_breakdown || [])
    setModal(true)
  }

  function openAdd() {
    setEditingGroup(null)
    setCart([emptyLine()])
    setSaleCharges([])
    setSaleDate(format(new Date(), 'yyyy-MM-dd'))
    setSaleClientId('')
    setPaymentMode('')
    setPaidAmount('')
    setPaymentBreakdown([])
    setModal(true)
  }

  const filteredSales = useMemo(() => {
    const q = search.toLowerCase().trim()
    return sales.filter(s => {
      const matchesSearch = !q ||
        s.product_name?.toLowerCase().includes(q) ||
        s.product_code?.toLowerCase().includes(q) ||
        s.client_name?.toLowerCase().includes(q)
      return matchesSearch && isDateInFilter(s.date, dateFilter)
    })
  }, [sales, search, dateFilter])

  const groupedSales = useMemo(() => {
    const groups = {}
    filteredSales.forEach(s => {
      const key = s.session_id || s.id
      if (!groups[key]) {
        groups[key] = {
          key, date: s.date, created_at: s.created_at, store: s.store,
          client_name: s.client_name,
          client_phone: s.client_phone || '',
          client_address: s.client_address || '',
          payment_status: s.payment_status || 'paid',
          paid_amount: 0, remaining_amount: 0, items: [], cancelled: !!s.cancelled_at,
          is_advance: false,
        }
      }
      groups[key].items.push(s)
      groups[key].paid_amount += Number(s.paid_amount || 0)
      if (!s.is_charge) {
        groups[key].remaining_amount += Number(s.remaining_amount || 0)
      }
      if (!s.is_charge && Number(s.remaining_amount || 0) > 0) groups[key].payment_status = 'credit'
      if (s.cancelled_at) groups[key].cancelled = true
      if (s.status === 'pending_advance') groups[key].is_advance = true
      if (s.client_phone && !groups[key].client_phone) groups[key].client_phone = s.client_phone
      if (s.client_address && !groups[key].client_address) groups[key].client_address = s.client_address
    })
    return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [filteredSales])

  // The client that "locks" the current selection (null if nothing selected yet)
  const selectionClientName = useMemo(() => {
    if (selectedKeys.size === 0) return null
    const firstKey = Array.from(selectedKeys)[0]
    const firstGroup = groupedSales.find(g => g.key === firstKey)
    return firstGroup?.client_name || ''
  }, [selectedKeys, groupedSales])

  function canSelectGroup(group) {
    if (group.cancelled || group.is_advance) return false
    if (selectedKeys.size === 0) return true
    return String(group.client_name || '').trim().toLowerCase() ===
      String(selectionClientName || '').trim().toLowerCase()
  }

  function toggleSelectGroup(group) {
    if (!canSelectGroup(group) && !selectedKeys.has(group.key)) return
    setSelectedKeys(prev => {
      const next = new Set(prev)
      if (next.has(group.key)) next.delete(group.key)
      else next.add(group.key)
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedKeys(new Set())
  }

  const selectedGroups = useMemo(
    () => groupedSales.filter(g => selectedKeys.has(g.key)),
    [groupedSales, selectedKeys]
  )

  // Stats: exclude charge rows and pending_advance from revenue/profit
  const activeSales = useMemo(
    () => filteredSales.filter(s => !s.cancelled_at && !s.is_charge && s.status !== 'pending_advance'),
    [filteredSales]
  )
  const totalRevenue = useMemo(() => activeSales.reduce((a, s) => a + (s.total_sale || 0), 0), [activeSales])
  const totalProfit = useMemo(() => activeSales.reduce((a, s) => a + (s.profit || 0), 0), [activeSales])
  const pendingAdvanceCount = useMemo(() => groupedSales.filter(g => g.is_advance && !g.cancelled).length, [groupedSales])

  async function handleCancel(sessionId) {
    const sessionSales = sales.filter(s => (s.session_id || s.id) === sessionId)
    for (const s of sessionSales) { await cancelSale(s.id, shop.id) }
    toast.success('Vente annulée — stock restauré')
    load()
  }

  async function handleDelete(sessionId) {
    const sessionSales = sales.filter(s => (s.session_id || s.id) === sessionId)
    for (const s of sessionSales) { await localDelete('sales', s.id) }
    toast.success('Vente supprimée')
    load()
  }

  async function handlePrintDoc(group, docType) {
    const now = new Date().toISOString()
    const sourceId = String(group.key)
    const existingDoc = invoices.find(inv =>
      inv.type === docType && inv.source_type === 'sale' &&
      inv.source_id === sourceId && inv.invoice_number
    )
    const invoiceNumber = existingDoc?.invoice_number ||
      generateDocumentNumber(invoices, docType, group.date || new Date())

    if (!existingDoc) {
      const total = group.items
        .filter(s => !s.is_charge)
        .reduce((sum, s) => sum + Number(s.total_sale || 0), 0)

      await localUpsert('invoices', {
        id: uuid(), shop_id: shop.id, type: docType,
        source_type: 'sale', source_id: sourceId,
        invoice_number: invoiceNumber, date: group.date,
        city: shop?.city || '',
        client_id: group.items?.[0]?.client_id || null,
        client_name: group.client_name || '',
        client_address: group.client_address || '',
        client_phone: group.client_phone || '',
        total_amount: total,
        amount_in_words: '',
        guarantee_text: docGuarantee.text || '',
        include_cachet: !!printOptions.includeCachet,
        include_signature: !!printOptions.includeSignature,
        status: 'finalized', created_at: now, updated_at: now, sync_status: 'pending',
      })

      setInvoices(prev => [...prev, {
        type: docType, source_type: 'sale', source_id: sourceId, invoice_number: invoiceNumber,
      }])
    }

    printSaleDocument({
      shop, type: docType, saleGroup: group,
      invoiceNumber,
      guaranteeText: docGuarantee.text || '',
      includeCachet: printOptions.includeCachet,
      includeSignature: printOptions.includeSignature,
      orientation: printOptions.orientation || 'landscape',
    })
    setDocModal(null)
  }

  async function handlePrintDocMulti(groups, docType) {
    const now = new Date().toISOString()
    // Stable composite id so re-printing the *same* combination reuses the invoice number
    const sourceId = groups.map(g => g.key).sort().join('+')

    const existingDoc = invoices.find(inv =>
      inv.type === docType && inv.source_type === 'sale_multi' &&
      inv.source_id === sourceId && inv.invoice_number
    )
    const earliestDate = groups.map(g => g.date).filter(Boolean).sort()[0] || groups[0]?.date
    const invoiceNumber = existingDoc?.invoice_number ||
      generateDocumentNumber(invoices, docType, earliestDate || new Date())

    if (!existingDoc) {
      const total = groups.reduce(
        (sum, g) => sum + g.items.filter(s => !s.is_charge).reduce((a, s) => a + Number(s.total_sale || 0), 0),
        0
      )
      const anchor = groups[0]

      await localUpsert('invoices', {
        id: uuid(), shop_id: shop.id, type: docType,
        source_type: 'sale_multi', source_id: sourceId,
        invoice_number: invoiceNumber, date: earliestDate,
        city: shop?.city || '',
        client_id: anchor.items?.[0]?.client_id || null,
        client_name: anchor.client_name || '',
        client_address: anchor.client_address || '',
        client_phone: anchor.client_phone || '',
        total_amount: total,
        amount_in_words: '',
        guarantee_text: docGuarantee.text || '',
        include_cachet: !!printOptions.includeCachet,
        include_signature: !!printOptions.includeSignature,
        status: 'finalized', created_at: now, updated_at: now, sync_status: 'pending',
      })

      setInvoices(prev => [...prev, {
        type: docType, source_type: 'sale_multi', source_id: sourceId, invoice_number: invoiceNumber,
      }])
    }

    printSaleDocumentMulti({
      shop, type: docType, saleGroups: groups,
      invoiceNumber,
      guaranteeText: docGuarantee.text || '',
      includeCachet: printOptions.includeCachet,
      includeSignature: printOptions.includeSignature,
      orientation: printOptions.orientation || 'landscape',
    })
    setDocModal(null)
    exitSelectMode()
  }

  const saleProductOptions = useMemo(() => {
    const stockSales = editingGroup
      ? sales.filter(s => (s.session_id || s.id) !== editingGroup.key)
      : sales
    return products
      .map(p => ({ ...p, currentStock: computeStock(p, purchases, stockSales) }))
      .sort((a, b) => {
        const aOut = Number(a.currentStock || 0) <= 0 ? 1 : 0
        const bOut = Number(b.currentStock || 0) <= 0 ? 1 : 0
        if (aOut !== bOut) return aOut - bOut
        return String(a.name || '').localeCompare(String(b.name || ''), 'fr', { sensitivity: 'base' })
      })
  }, [products, purchases, sales, editingGroup])

  return (
    <div className="p-6">
      <PageHeader
        title="Ventes"
        subtitle={`${activeSales.length} transaction${activeSales.length !== 1 ? 's' : ''}`}
        action={
          <div className="flex gap-2">
            <Btn
              variant={selectMode ? 'secondary' : 'secondary'}
              onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
            >
              {selectMode ? 'Annuler la sélection' : 'Sélectionner plusieurs'}
            </Btn>
            <Btn icon={Plus} onClick={openAdd}>Nouvelle vente</Btn>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Chiffre d'affaires total" value={formatFCFA(totalRevenue)} color="blue" icon={TrendingUp} />
        <StatCard label="Marge total" value={formatFCFA(totalProfit)} color="green" icon={TrendingUp} />
        <StatCard label="Nombre de ventes" value={activeSales.length} color="purple" />
        {pendingAdvanceCount > 0 && (
          <StatCard label="En attente collecte" value={pendingAdvanceCount} color="amber" icon={PackageCheck} />
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex-1 min-w-[220px] max-w-xs">
            <SearchBar value={search} onChange={setSearch} placeholder="Client, produit, code…" />
          </div>
          <DateFilter value={dateFilter} onChange={setDateFilter} />
        </div>

        {selectMode && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-blue-50 border-b border-blue-100">
            <div className="text-sm text-blue-800 font-medium">
              {selectedKeys.size === 0
                ? 'Sélectionnez des ventes du même client pour générer une facture groupée.'
                : `${selectedKeys.size} vente${selectedKeys.size > 1 ? 's' : ''} sélectionnée${selectedKeys.size > 1 ? 's' : ''} — Client : ${selectionClientName || '—'}`}
            </div>
            {selectedKeys.size > 0 && (
              <div className="flex gap-2">
                <Btn
                  variant="secondary"
                  onClick={() => setSelectedKeys(new Set())}
                >
                  Désélectionner tout
                </Btn>
                <Btn
                  icon={Printer}
                  onClick={() => {
                    setPrintOptions(getDefaultDocumentOptions())
                    setDocGuarantee({ key: GUARANTEE_OPTIONS[0].key, text: GUARANTEE_OPTIONS[0].text })
                    setDocModal({ _multi: true, groups: selectedGroups })
                  }}
                >
                  Créer une facture groupée
                </Btn>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Chargement…</div>
        ) : groupedSales.length === 0 ? (
          <EmptyState icon={TrendingUp} title="Aucune vente"
            description="Enregistrez vos premières ventes."
            action={<Btn icon={Plus} onClick={openAdd}>Nouvelle vente</Btn>}
          />
        ) : (
          <div className="divide-y divide-gray-50 zebra-list">
            {groupedSales.map(group => {
              const groupTotal = group.items
                .filter(s => !s.is_charge)
                .reduce((a, s) => a + (s.total_sale || 0), 0)
              const groupProfit = group.items
                .filter(s => !s.is_charge)
                .reduce((a, s) => a + (s.profit || 0), 0)
              const displayItems = group.items.filter(s => !s.is_charge)
              const alreadyPaidForAdvance = displayItems.reduce((s, i) => s + Number(i.paid_amount || 0), 0)
              const isFullyPaidAdvance = group.is_advance && alreadyPaidForAdvance >= groupTotal - 0.01

              return (
                <div
                  key={group.key}
                  className={`px-5 py-4 ${group.cancelled ? 'bg-red-50/40 opacity-70' : group.is_advance ? 'bg-amber-50/30 hover:bg-amber-50/60 cursor-pointer' : 'hover:bg-gray-50 cursor-pointer'} transition-colors`}
                  onClick={() => {
                    if (selectMode) {
                      toggleSelectGroup(group)
                    } else {
                      setSaleDetail(group)
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    {selectMode && (
                      <div className="flex items-center pt-1" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedKeys.has(group.key)}
                          disabled={!canSelectGroup(group) && !selectedKeys.has(group.key)}
                          onChange={() => toggleSelectGroup(group)}
                          className="w-4 h-4 rounded border-gray-300 disabled:opacity-30"
                          title={
                            !canSelectGroup(group) && !selectedKeys.has(group.key)
                              ? group.is_advance
                                ? 'Les ventes en avance ne peuvent pas être groupées'
                                : `Client différent (${group.client_name || 'sans client'})`
                              : ''
                          }
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs text-gray-400">
                          {format(new Date(group.date), 'dd MMM yyyy', { locale: fr })}
                          {group.created_at && (
                            <span> · {format(new Date(group.created_at), 'HH:mm', { locale: fr })}</span>
                          )}
                        </span>
                        {group.store && <span className="text-xs text-gray-400">· {group.store}</span>}
                        {group.client_name && <span className="text-xs font-medium text-blue-600">· {group.client_name}</span>}
                        {group.cancelled && <Badge color="red">Annulée</Badge>}
                        {group.is_advance && (
                          <Badge color="amber">
                            {isFullyPaidAdvance ? '✅ Prêt à collecter' : `Avance : ${formatFCFA(alreadyPaidForAdvance)} / ${formatFCFA(groupTotal)}`}
                          </Badge>
                        )}
                        {!group.is_advance && group.payment_status === 'credit' && (
                          <Badge color="amber">Crédit : {formatFCFA(group.remaining_amount)}</Badge>
                        )}
                        {displayItems.length > 1 && (
                          <Badge color="blue">{displayItems.length} produits</Badge>
                        )}
                        <span className="text-xs text-gray-300 ml-1">· Cliquer pour voir les détails</span>
                      </div>
                      <div className="space-y-0.5">
                        {displayItems.map(s => (
                          <div key={s.id} className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-gray-800 max-w-[200px] truncate">{s.product_name}</span>
                            <span className="text-gray-400">×{s.quantity}</span>
                            <span className="text-gray-500">{formatFCFA(s.total_sale)}</span>
                          </div>
                        ))}
                        {group.items.filter(s => s.is_charge).length > 0 && (
                          <div className="text-xs text-gray-400 italic mt-1">
                            + {group.items.filter(s => s.is_charge).length} charge(s) interne(s)
                            ({formatFCFA(group.items.filter(s => s.is_charge).reduce((a, s) => a + (s.total_sale || 0), 0))})
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-none">
                      <p className="font-bold text-gray-900">{formatFCFA(groupTotal)}</p>
                      {!group.cancelled && !group.is_advance && (
                        <p className="text-xs text-emerald-600">+{formatFCFA(groupProfit)}</p>
                      )}
                      {group.is_advance && (
                        <p className="text-xs text-amber-600">Non collectée</p>
                      )}
                    </div>
                    {!group.cancelled && !selectMode && (
                      <div className="flex gap-1 flex-none" onClick={e => e.stopPropagation()}>
                        {/* Advance-specific buttons */}
                        {group.is_advance && (
                          <>
                            {/* Add payment button */}
                            {!isFullyPaidAdvance && (
                              <button
                                onClick={() => openAdvancePayment(group)}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                                title="Ajouter un paiement"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {/* Collect button */}
                            <button
                              onClick={() => setConfirm({ type: 'collect', group })}
                              className={`p-1.5 rounded-lg transition-colors ${isFullyPaidAdvance ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700' : 'hover:bg-blue-50 text-gray-400 hover:text-blue-600'}`}
                              title={isFullyPaidAdvance ? 'Collecter (entièrement payée)' : 'Collecter (partiellement payée)'}
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* Credit payment button (non-advance) */}
                        {!group.is_advance && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openPayment(group) }}
                            disabled={Number(group.remaining_amount || 0) <= 0 || group.cancelled}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Payer le crédit"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setPrintOptions(getDefaultDocumentOptions())
                            setDocGuarantee({ key: GUARANTEE_OPTIONS[0].key, text: GUARANTEE_OPTIONS[0].text })
                            setDocModal(group)
                          }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Imprimer un document"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditSale(group)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Modifier la vente"
                        >
                          <Pencil className="w-3.5 h-3.5" />
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

      {/* Sale Detail Modal */}
      <Modal open={!!saleDetail} onClose={() => setSaleDetail(null)} title="Détails de la vente" maxW="max-w-3xl">
        {saleDetail && (() => {
          const grandTotal = saleDetail.items.filter(i => !i.is_charge).reduce((sum, item) => sum + Number(item.total_sale || 0), 0)
          const alreadyPaid = saleDetail.items.filter(i => !i.is_charge).reduce((sum, item) => sum + Number(item.paid_amount || 0), 0)
          const isAdvance = saleDetail.items.some(i => i.status === 'pending_advance')
          const isFullyPaid = isAdvance && alreadyPaid >= grandTotal - 0.01
          return (
            <div className="space-y-6">
              {isAdvance && (
                <div className={`rounded-xl p-4 border ${isFullyPaid ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  <p className={`text-sm font-semibold ${isFullyPaid ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {isFullyPaid ? '✅ Vente entièrement payée — prête à être collectée' : `⏳ Vente en avance — ${formatFCFA(alreadyPaid)} payé sur ${formatFCFA(grandTotal)}`}
                  </p>
                  {!isFullyPaid && (
                    <p className="text-xs text-amber-700 mt-1">Reste à payer : {formatFCFA(grandTotal - alreadyPaid)} — le stock ne sera déduit qu'à la collecte</p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Informations générales</p>
                  <div className="mt-4 space-y-3 text-sm text-gray-700">
                    <div className="flex justify-between"><span>Date</span><span>{format(new Date(saleDetail.date), 'dd MMM yyyy', { locale: fr })}</span></div>
                    {saleDetail.created_at && <div className="flex justify-between"><span>Créée le</span><span>{format(new Date(saleDetail.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}</span></div>}
                    <div className="flex justify-between"><span>Client</span><span>{saleDetail.client_name || '—'}</span></div>
                    <div className="flex justify-between"><span>Statut</span>
                      <span>{isAdvance ? (isFullyPaid ? 'Prêt à collecter' : 'Avance en cours') : saleDetail.payment_status === 'credit' ? 'Crédit' : 'Payé'}</span>
                    </div>
                    <div className="flex justify-between"><span>Montant payé</span><span>{formatFCFA(alreadyPaid)}</span></div>
                    <div className="flex justify-between"><span>Reste à payer</span><span>{formatFCFA(Math.max(0, grandTotal - alreadyPaid))}</span></div>
                    <div className="flex justify-between"><span>Articles</span><span>{saleDetail.items.filter(i => !i.is_charge).length}</span></div>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Totaux</p>
                  <div className="mt-4 space-y-3 text-sm text-gray-700">
                    <div className="flex justify-between">
                      <span>Chiffre d'affaires</span>
                      <span>{formatFCFA(saleDetail.items.filter(i => !i.is_charge).reduce((sum, item) => sum + Number(item.total_sale || 0), 0))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Coût total</span>
                      <span>{formatFCFA(saleDetail.items.filter(i => !i.is_charge).reduce((sum, item) => sum + Number(item.total_purchase_cost || 0), 0))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Charges internes</span>
                      <span className="text-amber-600">-{formatFCFA(saleDetail.items.filter(i => i.is_charge).reduce((sum, item) => sum + Number(item.total_sale || 0), 0))}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Marge nette</span>
                      <span>{formatFCFA(saleDetail.items.reduce((sum, item) => sum + Number(item.profit || 0), 0))}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Articles vendus</p>
                    <p className="text-xs text-gray-500">Détails des lignes de vente</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {saleDetail.items.filter(i => !i.is_charge).map(item => (
                    <div key={item.id} className="grid grid-cols-1 lg:grid-cols-4 gap-3 p-4 rounded-2xl bg-gray-50">
                      <div>
                        <p className="text-xs text-gray-400">Produit</p>
                        <p className="font-semibold text-gray-900 truncate">{item.product_name || '—'}</p>
                        <p className="text-xs text-gray-500">{item.product_code || item.product_id || '—'}</p>
                      </div>
                      <div><p className="text-xs text-gray-400">Quantité</p><p className="font-semibold text-gray-900">{item.quantity}</p></div>
                      <div><p className="text-xs text-gray-400">Prix unitaire</p><p className="font-semibold text-gray-900">{formatFCFA(item.unit_sale_price || 0)}</p></div>
                      <div><p className="text-xs text-gray-400">Total</p><p className="font-semibold text-gray-900">{formatFCFA(item.total_sale || 0)}</p></div>
                    </div>
                  ))}
                  {saleDetail.items.filter(i => i.is_charge).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 mb-2">Charges internes (non facturées au client)</p>
                      {saleDetail.items.filter(i => i.is_charge).map(item => (
                        <div key={item.id} className="flex justify-between text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-2 mb-1">
                          <span>{item.product_name}</span>
                          <span>{formatFCFA(item.total_sale || 0)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 justify-end">
                <Btn variant="secondary" onClick={() => setSaleDetail(null)}>Fermer</Btn>
                <Btn onClick={() => { setSaleDetail(null); setDocModal(saleDetail) }}>Imprimer</Btn>
                {isAdvance && (
                  <>
                    {!isFullyPaid && (
                      <Btn variant="secondary" onClick={() => { setSaleDetail(null); openAdvancePayment(saleDetail) }}>
                        Ajouter un paiement
                      </Btn>
                    )}
                    <Btn onClick={() => { setSaleDetail(null); setConfirm({ type: 'collect', group: saleDetail }) }}>
                      <PackageCheck className="w-4 h-4 mr-1" />
                      {isFullyPaid ? 'Collecter' : 'Collecter (partiel)'}
                    </Btn>
                  </>
                )}
                <Btn onClick={() => { setSaleDetail(null); openEditSale(saleDetail) }}>Modifier</Btn>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Document Print Modal */}
      <Modal open={!!docModal} onClose={() => setDocModal(null)} title="Imprimer un document" maxW="max-w-sm">
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-4">
            {docModal?._multi
              ? `Choisissez le type de document à générer pour ces ${docModal.groups.length} ventes groupées.`
              : 'Choisissez le type de document à générer pour cette vente.'}
          </p>
          <DocumentPrintOptions shop={shop} value={printOptions} onChange={setPrintOptions} />
          <GuaranteePicker value={docGuarantee} onChange={setDocGuarantee} />
          {docModal && SALE_DOC_TYPES.map(doc => {
            const Icon = doc.icon
            return (
              <button
                key={doc.key}
                onClick={() => docModal._multi ? handlePrintDocMulti(docModal.groups, doc.key) : handlePrintDoc(docModal, doc.key)}
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

      {/* New / Edit Sale Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editingGroup ? 'Modifier la vente' : 'Nouvelle vente'} maxW="max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date" required>
              <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className={inputCls} required />
            </FormField>
            <FormField label="Client">
              <div className="flex gap-2">
                <select value={saleClientId} onChange={e => setSaleClientId(e.target.value)} className={selectCls}>
                  <option value="">— Choisir un client —</option>
                  {sortedClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" onClick={() => setClientModal(true)}
                  className="h-11 w-11 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition"
                  title="Ajouter un client">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </FormField>
          </div>

          {/* Payment mode */}
          <FormField label="Mode de paiement" required>
            <select
              value={paymentMode}
              onChange={e => { setPaymentMode(e.target.value); setPaymentBreakdown([]); setPaidAmount('') }}
              className={selectCls}
              required
            >
              <option value="">— Choisir le mode de paiement —</option>
              <option value="paid">Payé comptant</option>
              <option value="credit">Vente à crédit</option>
              <option value="advance">Réservation / Avance client</option>
            </select>
          </FormField>

          {/* Payé comptant: breakdown */}
          {paymentMode === 'paid' && (
            <PaymentBreakdownInput
              value={paymentBreakdown}
              onChange={setPaymentBreakdown}
              total={saleGrandTotal}
            />
          )}

          {/* Vente à crédit: optional partial payment */}
          {paymentMode === 'credit' && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 space-y-3">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Paiement partiel (optionnel)</p>
              <FormField label="Montant payé maintenant">
                <FrenchInput
                  value={paidAmount}
                  onChange={v => setPaidAmount(v)}
                  placeholder="0 — laisser vide si rien payé"
                  className={inputCls}
                />
              </FormField>
              <PaymentBreakdownInput
                value={paymentBreakdown}
                onChange={breakdown => {
                  setPaymentBreakdown(breakdown)
                  const total = sumPaymentBreakdown(breakdown)
                  if (total > 0) setPaidAmount(String(total))
                }}
                total={Number(paidAmount || 0)}
              />
            </div>
          )}

          {/* Avance / Réservation — works exactly like comptant */}
          {paymentMode === 'advance' && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <PackageCheck className="w-4 h-4 text-blue-600 mt-0.5 flex-none" />
                <div>
                  <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Réservation / Avance</p>
                  <p className="text-xs text-blue-600 mt-0.5">Le stock ne sera pas déduit tant que la vente n'est pas collectée. Vous pourrez ajouter des paiements ensuite.</p>
                </div>
              </div>
              <FormField label="Montant payé maintenant (avance)">
                <FrenchInput
                  value={paidAmount}
                  onChange={v => {
                    setPaidAmount(v)
                  }}
                  placeholder="0 — laisser vide si rien encore payé"
                  className={inputCls}
                />
              </FormField>
              {/* Same breakdown UI as comptant */}
              <PaymentBreakdownInput
                value={paymentBreakdown}
                onChange={breakdown => {
                  setPaymentBreakdown(breakdown)
                  const total = sumPaymentBreakdown(breakdown)
                  if (total > 0) setPaidAmount(String(total))
                }}
                total={Number(paidAmount || 0)}
              />
              {saleGrandTotal > 0 && (
                <div className="text-xs text-blue-700 font-medium">
                  {Number(paidAmount || 0) > 0
                    ? `Reste à payer après cette avance : ${formatFCFA(Math.max(0, saleGrandTotal - Number(paidAmount || 0)))}`
                    : `Total à couvrir : ${formatFCFA(saleGrandTotal)}`
                  }
                </div>
              )}
            </div>
          )}

          {/* Charges supplémentaires */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Charges supplémentaires</span>
                <span className="text-xs text-gray-400 ml-2">(internes — non facturées au client)</span>
              </div>
              <button type="button" onClick={addSaleCharge} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                Ajouter
              </button>
            </div>
            <div className="p-3 space-y-2">
              {saleCharges.length === 0 ? (
                <p className="text-xs text-gray-400">Aucune charge supplémentaire.</p>
              ) : (
                saleCharges.map((row) => (
                  <div key={row._key} className="grid grid-cols-[1fr_160px_36px] gap-2">
                    <input
                      value={row.label}
                      onChange={(e) => updateSaleCharge(row._key, 'label', e.target.value)}
                      placeholder="Libellé de la charge"
                      className={inputCls}
                    />
                    <FrenchInput
                      value={row.amount}
                      onChange={(value) => updateSaleCharge(row._key, 'amount', value)}
                      placeholder="Montant"
                      className={inputCls}
                    />
                    <button type="button" onClick={() => removeSaleCharge(row._key)}
                      className="h-11 rounded-xl text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                ))
              )}
              {saleChargeTotal > 0 && (
                <div className="text-xs text-amber-600 font-medium pt-1">
                  Total charges internes : {formatFCFA(saleChargeTotal)} (réduit la marge, pas le prix client)
                </div>
              )}
            </div>
          </div>

          {/* Articles */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Articles</span>
            </div>
            <div className="divide-y divide-gray-50 zebra-list">
              {cart.map((line, idx) => {
                const qty = Number(line.quantity || 0)
                const price = Number(line.unit_sale_price || 0)
                const lineTotal = qty * price
                const lineProfit = qty * price - qty * line.unit_cost
                const prod = products.find(p => p.id === line.product_id)
                const availStock = prod ? computeStock(prod, purchases, sales) : null

                return (
                  <div key={line._key}
                    className={`p-3 space-y-2 rounded-xl transition-all duration-500 ${line._key === newLineKey ? 'bg-blue-50 ring-2 ring-blue-200 shadow-sm animate-pulse' : 'bg-white'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-400">
                        Ligne {idx + 1}
                        {line._key === newLineKey && <span className="ml-2 text-blue-600 font-bold">Nouvelle ligne</span>}
                      </span>
                      <button type="button" onClick={() => removeLine(line._key)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <select value={line.product_id} onChange={e => selectProductForLine(line._key, e.target.value)} className={selectCls}>
                      <option value="">— Sélectionner un produit —</option>
                      {saleProductOptions.map(p => {
                        const stock = Number(p.currentStock || 0)
                        const isSelectedElsewhere = cart.some(other => other._key !== line._key && other.product_id === p.id)
                        const isCurrentLine = line.product_id === p.id
                        // For advance sales, we don't block out-of-stock (stock check is at collect time)
                        const outOfStock = stock <= 0 && paymentMode !== 'advance'
                        const disabled = !isCurrentLine && (isSelectedElsewhere || outOfStock)
                        return (
                          <option key={p.id} value={p.id} disabled={disabled}>
                            {stock <= 0 && paymentMode !== 'advance' ? '⚠ ' : ''}{p.name} {p.code ? `(${p.code})` : ''} — Stock: {formatNumber(stock)}
                            {isSelectedElsewhere ? ' — déjà ajouté' : ''}{outOfStock ? ' — rupture' : ''}
                          </option>
                        )
                      })}
                    </select>
                    {line.product_id && (
                      <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-3 grid sm:grid-cols-3 gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Produit</p>
                          <p className="text-sm font-medium text-gray-800">{line.product_name}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">ID / Code</p>
                          <p className="font-mono text-xs text-gray-700 break-all">ID: {line.product_id}</p>
                          <p className="font-mono text-xs text-gray-400">Code: {line.product_code || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Stock restant actuel</p>
                          <p className={`text-lg font-bold ${availStock <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {formatNumber(availStock)}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-[0.75fr_1fr_1fr_1.8fr] gap-2">
                      <div>
                        <label className="text-xs text-gray-400">Quantité</label>
                        <FrenchInput value={line.quantity} onChange={(value) => updateLine(line._key, 'quantity', value)} className={inputCls} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Prix d'achat utilisé</label>
                        {line.manual_cost ? (
                          <div className="flex gap-2">
                            <FrenchInput value={line.unit_cost} onChange={(value) => updateLine(line._key, 'unit_cost', value)} placeholder="Prix achat" className={inputCls} />
                            <button type="button" onClick={() => handleCostSelect(line._key, getDefaultPurchaseCost(line.product_id))}
                              className="h-11 w-10 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50" title="Revenir à la liste">×</button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <select
                              value={`${line.purchase_id || ''}|${Number(line.unit_cost || 0)}`}
                              onChange={(e) => handleCostSelect(line._key, e.target.value)}
                              className={selectCls} disabled={!line.product_id}
                            >
                              <option value="">— Choisir —</option>
                              {getPurchaseCostOptions(line.product_id).map(option => (
                                <option key={`${option.purchaseId || 'catalogue'}-${option.value}`}
                                  value={`${option.purchaseId || ''}|${option.value}`}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <button type="button" onClick={() => handleCostSelect(line._key, 'manual')}
                              className="h-11 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700"
                              title="Saisir un prix d'achat manuellement" disabled={!line.product_id}>
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Prix unitaire (FCFA)</label>
                        <FrenchInput value={line.unit_sale_price} onChange={(value) => updateLine(line._key, 'unit_sale_price', value)} className={inputCls} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Montant</label>
                        <div className={`${inputCls} mt-0.5 bg-gray-50 flex items-center justify-between gap-3`}>
                          <span className="text-gray-700 font-semibold">{formatFCFA(lineTotal)}</span>
                          {lineTotal > 0 && (
                            <span className={`text-xs font-semibold ml-1 ${lineProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              Marge : {lineProfit >= 0 ? '+' : ''}{formatFCFA(lineProfit)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div className="p-3 bg-gray-50">
                <button type="button" onClick={addLine}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-white px-4 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition">
                  <PlusCircle className="w-4 h-4" />
                  Ajouter une ligne
                </button>
              </div>
            </div>
          </div>

          {saleGrandTotal > 0 && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 grid grid-cols-2 lg:grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-xs text-blue-500">Total client</p>
                <p className="font-bold text-blue-900">{formatFCFA(saleGrandTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-blue-500">Coût produits</p>
                <p className="font-bold text-blue-700">{formatFCFA(cartTotals.cost)}</p>
              </div>
              <div>
                <p className="text-xs text-blue-500">Marge brute</p>
                <p className={`font-bold ${cartTotals.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {cartTotals.profit >= 0 ? '+' : ''}{formatFCFA(cartTotals.profit)}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-500">
                  {paymentMode === 'advance' ? 'Reste après avance' : 'Reste à payer'}
                </p>
                <p className={`font-bold ${remainingPreview > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {formatFCFA(remainingPreview)}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="secondary" onClick={() => setModal(false)}>Annuler</Btn>
            <Btn type="submit">{editingGroup ? 'Modifier la vente' : 'Enregistrer la vente'}</Btn>
          </div>
        </form>
      </Modal>

      {/* Advance payment modal */}
      <Modal open={!!paymentModal} onClose={() => { setPaymentModal(null); setAdvancePaymentBreakdown([]) }}
        title={paymentModal?._advanceMode ? 'Ajouter un paiement' : 'Paiement du crédit'}
        maxW="max-w-md">
        {paymentModal && (
          paymentModal._advanceMode ? (
            // ── Advance payment form ──
            <form onSubmit={handleAdvancePayment} className="space-y-4">
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                <p className="text-xs text-blue-600">Total vente</p>
                <p className="font-bold text-gray-900">{formatFCFA(paymentModal._grandTotal)}</p>
                <p className="text-xs text-blue-600 mt-2">Déjà payé</p>
                <p className="font-bold text-gray-900">{formatFCFA(paymentModal._alreadyPaid)}</p>
                <p className="text-xs text-blue-600 mt-2">Reste à payer</p>
                <p className="font-bold text-amber-700">{formatFCFA(paymentModal._grandTotal - paymentModal._alreadyPaid)}</p>
              </div>
              <FormField label="Montant payé maintenant" required>
                <FrenchInput value={paymentAmount} onChange={v => { setPaymentAmount(v) }} placeholder="0" required className={inputCls} />
              </FormField>
              {/* Same breakdown as comptant */}
              <PaymentBreakdownInput
                value={advancePaymentBreakdown}
                onChange={breakdown => {
                  setAdvancePaymentBreakdown(breakdown)
                  const total = sumPaymentBreakdown(breakdown)
                  if (total > 0) setPaymentAmount(String(total))
                }}
                total={Number(paymentAmount || 0)}
              />
              {Number(paymentAmount || 0) > 0 && (
                <div className="text-xs text-blue-700 font-medium">
                  Reste après ce paiement : {formatFCFA(Math.max(0, paymentModal._grandTotal - paymentModal._alreadyPaid - Number(paymentAmount || 0)))}
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <Btn variant="secondary" onClick={() => { setPaymentModal(null); setAdvancePaymentBreakdown([]) }}>Annuler</Btn>
                <Btn type="submit">Enregistrer paiement</Btn>
              </div>
            </form>
          ) : (
            // ── Credit payment form (legacy) ──
            <form onSubmit={handleCreditPayment} className="space-y-4">
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                <p className="text-xs text-amber-600">Total vente</p>
                <p className="font-bold text-gray-900">
                  {formatFCFA(paymentModal.items.filter(i => !i.is_charge).reduce((s, item) => s + Number(item.total_sale || 0), 0))}
                </p>
                <p className="text-xs text-amber-600 mt-2">Déjà payé</p>
                <p className="font-bold text-gray-900">{formatFCFA(paymentModal.paid_amount)}</p>
                <p className="text-xs text-amber-600 mt-2">Reste à payer</p>
                <p className="font-bold text-amber-700">{formatFCFA(paymentModal.remaining_amount)}</p>
              </div>
              <FormField label="Montant payé maintenant" required>
                <FrenchInput value={paymentAmount} onChange={setPaymentAmount} placeholder="0" required className={inputCls} />
              </FormField>
              <div className="flex gap-3 justify-end">
                <Btn variant="secondary" onClick={() => setPaymentModal(null)}>Annuler</Btn>
                <Btn type="submit">Enregistrer paiement</Btn>
              </div>
            </form>
          )
        )}
      </Modal>

      {/* Quick client modal */}
      <Modal open={clientModal} onClose={() => setClientModal(false)} title="Nouveau client" maxW="max-w-md">
        <form onSubmit={handleQuickClientSubmit} className="space-y-4">
          <FormField label="Nom du client" required>
            <input value={quickClient.name}
              onChange={(e) => setQuickClient(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Client Boutique" className={inputCls} required />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Téléphone">
              <PhoneInput value={quickClient.phone}
                onChange={(value) => setQuickClient(prev => ({ ...prev, phone: value }))}
                placeholder="99 12 34 56" className={inputCls} />
            </FormField>
            <FormField label="Adresse">
              <input value={quickClient.address}
                onChange={(e) => setQuickClient(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Ex: Niamey" className={inputCls} />
            </FormField>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="secondary" onClick={() => setClientModal(false)}>Annuler</Btn>
            <Btn type="submit">Ajouter</Btn>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm && confirm.type === 'collect'}
        onClose={() => setConfirm(null)}
        onConfirm={() => { handleCollectAdvanceSale(confirm.group); setConfirm(null) }}
        title="Collecter la vente"
        message={(() => {
          if (!confirm?.group) return ''
          const grandTotal = (confirm.group.items || []).filter(i => !i.is_charge).reduce((s, i) => s + Number(i.total_sale || 0), 0)
          const alreadyPaid = (confirm.group.items || []).filter(i => !i.is_charge).reduce((s, i) => s + Number(i.paid_amount || 0), 0)
          const remaining = Math.max(0, grandTotal - alreadyPaid)
          if (remaining > 0) {
            return `Les articles seront marqués comme collectés et le stock sera déduit. Il restera ${formatFCFA(remaining)} à payer (enregistré comme crédit).`
          }
          return 'Les articles seront marqués comme collectés et le stock sera déduit. La vente est entièrement payée.'
        })()}
        confirmLabel="Confirmer la collecte"
        danger={false}
      />
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