import * as XLSX from 'xlsx'
import { v4 as uuid } from 'uuid'

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function excelDateToISO(value) {
  if (!value) return new Date().toISOString().slice(0, 10)

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (!parsed) return new Date().toISOString().slice(0, 10)
    const d = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
    return d.toISOString().slice(0, 10)
  }

  const d = new Date(value)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)

  return new Date().toISOString().slice(0, 10)
}

function getValue(row, candidates) {
  const normalizedMap = {}

  for (const key of Object.keys(row)) {
    normalizedMap[normalize(key)] = row[key]
  }

  for (const candidate of candidates) {
    const found = normalizedMap[normalize(candidate)]
    if (found !== undefined && found !== null && found !== '') return found
  }

  return ''
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  return Number(String(value).replace(/\s/g, '').replace(',', '.')) || 0
}

function sheetToRows(workbook, preferredSheetName) {
  const sheetName =
    workbook.SheetNames.find(s => normalize(s) === normalize(preferredSheetName)) ||
    workbook.SheetNames[0]

  const ws = workbook.Sheets[sheetName]
  if (!ws) return []

  return XLSX.utils.sheet_to_json(ws, {
    defval: '',
    raw: true,
  })
}

function buildProductMap(products) {
  const map = new Map()
  for (const p of products) {
    if (p.code) map.set(String(p.code).trim(), p.id)
  }
  return map
}

export async function parseGestionExcelFile(file, shopId, existingProducts = [], importMode = 'auto') {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
  const now = new Date().toISOString()
  const productMap = buildProductMap(existingProducts)

  const result = {
    products: [],
    purchases: [],
    sales: [],
    expenses: [],
    clients: [],
    client_transactions: [],
    suppliers: [],
    supplier_transactions: [],
    summary: {},
  }

  const modes = importMode === 'auto'
    ? ['produits', 'achats', 'ventes', 'charges', 'creances', 'dettes']
    : [importMode]

  if (modes.includes('produits')) {
    const rows = sheetToRows(workbook, 'Produits')

    for (const row of rows) {
      const code = String(getValue(row, ['Code Produit', 'Code'])).trim()
      const name = String(getValue(row, ['Nom Produit', 'Produit', 'Nom'])).trim()
      if (!name) continue

      const id = existingProducts.find(p => p.code === code)?.id || uuid()
      if (code) productMap.set(code, id)

      result.products.push({
        id,
        shop_id: shopId,
        code,
        name,
        purchase_price: toNumber(getValue(row, ['Prix Achat', 'PA'])),
        sale_price: toNumber(getValue(row, ['Prix Vente', 'PV'])) || null,
        stock_initial: toNumber(getValue(row, ['Stock Initial', 'Stock'])),
        alert_threshold: toNumber(getValue(row, ['Seuil Alerte', 'Alerte'])) || null,
        supplier: String(getValue(row, ['Fournisseur'])).trim(),
        unit: 'Pièces',
        created_at: now,
        updated_at: now,
        sync_status: 'synced',
      })
    }
  }

  if (modes.includes('achats')) {
    const rows = sheetToRows(workbook, 'Achats')

    for (const row of rows) {
      const code = String(getValue(row, ['Code Produit', 'Code'])).trim()
      const name = String(getValue(row, ['Nom Produit', 'Produit'])).trim()
      if (!name && !code) continue

      const supplier = String(getValue(row, ['Fournisseur'])).trim()
      const supplierId = supplier ? uuid() : null

      if (supplier) {
        result.suppliers.push({
          id: supplierId,
          shop_id: shopId,
          name: supplier,
          created_at: now,
          updated_at: now,
          sync_status: 'synced',
        })
      }

      const quantity = toNumber(getValue(row, ['Quantité', 'Qte']))
      const unitPrice = toNumber(getValue(row, ['PA Unitaire', 'Prix Achat', 'Prix Unitaire']))
      const total = toNumber(getValue(row, ['Total Achat', 'Total'])) || quantity * unitPrice

      result.purchases.push({
        id: uuid(),
        shop_id: shopId,
        date: excelDateToISO(getValue(row, ['Date'])),
        supplier_id: supplierId,
        supplier,
        product_id: productMap.get(code) || null,
        product_code: code,
        product_name: name,
        quantity,
        unit_price: unitPrice,
        total_amount: total,
        payment_status: 'paid',
        paid_amount: total,
        remaining_amount: 0,
        created_at: now,
        updated_at: now,
        sync_status: 'synced',
      })
    }
  }

  if (modes.includes('ventes')) {
    const rows = sheetToRows(workbook, 'Ventes')

    for (const row of rows) {
      const code = String(getValue(row, ['Code Produit', 'Code'])).trim()
      const name = String(getValue(row, ['Nom Produit', 'Produit'])).trim()
      if (!name && !code) continue

      const quantity = toNumber(getValue(row, ['Quantité', 'Qte']))
      const price = toNumber(getValue(row, ['Prix Vente Unitaire', 'Prix Vente', 'PV']))
      const total = toNumber(getValue(row, ['Total Vente', 'Total'])) || quantity * price
      const cost = toNumber(getValue(row, ['Coût Unitaire Achat', 'Cout Unitaire Achat', 'PA Unitaire']))
      const costTotal = toNumber(getValue(row, ['Coût Total Achat', 'Cout Total Achat'])) || quantity * cost
      const profit = toNumber(getValue(row, ['Résultat', 'Resultat'])) || total - costTotal

      result.sales.push({
        id: uuid(),
        shop_id: shopId,
        session_id: uuid(),
        sale_batch_id: uuid(),
        date: excelDateToISO(getValue(row, ['Date'])),
        store: String(getValue(row, ['Magasin'])).trim(),
        product_id: productMap.get(code) || null,
        product_code: code,
        product_name: name,
        quantity,
        unit_sale_price: price,
        total_sale: total,
        unit_purchase_cost: cost,
        total_purchase_cost: costTotal,
        profit,
        payment_status: 'paid',
        paid_amount: total,
        remaining_amount: 0,
        created_at: now,
        updated_at: now,
        sync_status: 'synced',
      })
    }
  }

  if (modes.includes('charges')) {
    const rows = sheetToRows(workbook, 'Charges')

    for (const row of rows) {
      const description = String(getValue(row, ['Description', 'Libellé', 'Libelle'])).trim()
      const amount = toNumber(getValue(row, ['Montant']))
      if (!description && !amount) continue

      result.expenses.push({
        id: uuid(),
        shop_id: shopId,
        date: excelDateToISO(getValue(row, ['Date'])),
        description,
        amount,
        category: 'Anciennes données',
        created_at: now,
        updated_at: now,
        sync_status: 'synced',
      })
    }
  }

  if (modes.includes('creances')) {
    const rows = sheetToRows(workbook, 'Créances Clients')

    for (const row of rows) {
      const client = String(getValue(row, ['Client'])).trim()
      if (!client) continue

      const clientId = uuid()
      const amount = toNumber(getValue(row, ['Montant Achat', 'Montant']))

      result.clients.push({
        id: clientId,
        shop_id: shopId,
        name: client,
        address: String(getValue(row, ['Adresse'])).trim(),
        phone: String(getValue(row, ['Téléphone', 'Telephone', 'Adresse'])).trim(),
        created_at: now,
        updated_at: now,
        sync_status: 'synced',
      })

      result.client_transactions.push({
        id: uuid(),
        shop_id: shopId,
        client_id: clientId,
        date: excelDateToISO(getValue(row, ['Date'])),
        label: String(getValue(row, ['Libellé', 'Libelle'])).trim() || 'Ancienne créance',
        quantity: toNumber(getValue(row, ['Quantité', 'Qte'])) || 1,
        unit_amount: toNumber(getValue(row, ['PA Unitaire', 'Prix Unitaire'])),
        amount,
        created_at: now,
        updated_at: now,
        sync_status: 'synced',
      })
    }
  }

  if (modes.includes('dettes')) {
    const rows = sheetToRows(workbook, 'Dettes Fournisseurs')

    for (const row of rows) {
      const supplier = String(getValue(row, ['Fournisseur'])).trim()
      if (!supplier) continue

      const supplierId = uuid()
      const amount = toNumber(getValue(row, ['Montant Achat', 'Montant']))

      result.suppliers.push({
        id: supplierId,
        shop_id: shopId,
        name: supplier,
        address: String(getValue(row, ['Adresse'])).trim(),
        phone: String(getValue(row, ['Téléphone', 'Telephone', 'Adresse'])).trim(),
        created_at: now,
        updated_at: now,
        sync_status: 'synced',
      })

      result.supplier_transactions.push({
        id: uuid(),
        shop_id: shopId,
        supplier_id: supplierId,
        date: excelDateToISO(getValue(row, ['Date'])),
        label: String(getValue(row, ['Libellé', 'Libelle'])).trim() || 'Ancienne dette',
        quantity: toNumber(getValue(row, ['Quantité', 'Qte'])) || 1,
        unit_amount: toNumber(getValue(row, ['PA Unitaire', 'Prix Unitaire'])),
        amount,
        created_at: now,
        updated_at: now,
        sync_status: 'synced',
      })
    }
  }

  result.summary = {
    products: result.products.length,
    purchases: result.purchases.length,
    sales: result.sales.length,
    expenses: result.expenses.length,
    clients: result.clients.length,
    suppliers: result.suppliers.length,
    client_transactions: result.client_transactions.length,
    supplier_transactions: result.supplier_transactions.length,
  }

  return result
}