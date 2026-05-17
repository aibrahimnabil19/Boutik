import * as XLSX from "xlsx";
import { v4 as uuid } from "uuid";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function excelDateToISO(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return new Date().toISOString().slice(0, 10);
    const d = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

/**
 * Get a value from a row object by trying multiple candidate column names.
 * Matching is accent-insensitive and case-insensitive.
 */
function getValue(row, candidates) {
  const normalizedMap = {};
  for (const key of Object.keys(row)) {
    normalizedMap[normalize(key)] = row[key];
  }
  for (const candidate of candidates) {
    const found = normalizedMap[normalize(candidate)];
    if (found !== undefined && found !== null && found !== "") return found;
  }
  return "";
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(
    String(value)
      .replace(/[\s\u00a0]/g, "")
      .replace(",", "."),
  );
  return isNaN(n) ? 0 : n;
}

function dedupeById(rows) {
  const map = new Map();

  for (const row of rows || []) {
    if (!row?.id) continue;

    map.set(String(row.id), {
      ...(map.get(String(row.id)) || {}),
      ...row,
    });
  }

  return Array.from(map.values());
}

function makeNaturalKey(prefix, value) {
  return `${prefix}:${normalize(value)}`;
}

function sheetToRows(workbook, preferredSheetName) {
  // Try exact match first, then normalized match
  const sheetName =
    workbook.SheetNames.find((s) => s === preferredSheetName) ||
    workbook.SheetNames.find(
      (s) => normalize(s) === normalize(preferredSheetName),
    ) ||
    null;

  if (!sheetName) return [];
  const ws = workbook.Sheets[sheetName];
  if (!ws) return [];

  return XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });
}

function buildProductMap(products) {
  const map = new Map();
  for (const p of products) {
    if (p.code) map.set(String(p.code).trim(), p.id);
  }
  return map;
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export async function parseGestionExcelFile(
  file,
  shopId,
  existingProducts = [],
  importMode = "auto",
) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const now = new Date().toISOString();
  const productMap = buildProductMap(existingProducts);

  const newProductIds = new Map();
  const supplierIds = new Map();
  const clientIds = new Map();

  function getProductId(code, name) {
    const cleanCode = String(code || "").trim();
    const cleanName = String(name || "").trim();

    if (cleanCode && productMap.has(cleanCode)) {
      return productMap.get(cleanCode);
    }

    const key = cleanCode
      ? makeNaturalKey("product-code", cleanCode)
      : makeNaturalKey("product-name", cleanName);

    if (!newProductIds.has(key)) {
      newProductIds.set(key, uuid());
    }

    const id = newProductIds.get(key);

    if (cleanCode) {
      productMap.set(cleanCode, id);
    }

    return id;
  }

  function getSupplierId(name) {
    const cleanName = String(name || "").trim();
    if (!cleanName) return null;

    const key = makeNaturalKey("supplier", cleanName);

    if (!supplierIds.has(key)) {
      supplierIds.set(key, uuid());
    }

    return supplierIds.get(key);
  }

  function getClientId(name) {
    const cleanName = String(name || "").trim();
    if (!cleanName) return null;

    const key = makeNaturalKey("client", cleanName);

    if (!clientIds.has(key)) {
      clientIds.set(key, uuid());
    }

    return clientIds.get(key);
  }

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
  };

  // In-memory dedup maps (name → entity record) for this import session
  const supplierByName = new Map();
  const clientByName = new Map();

  const modes =
    importMode === "auto"
      ? ["produits", "achats", "ventes", "charges", "creances", "dettes"]
      : [importMode];

  // ─── Produits ──────────────────────────────────────────────────────────────
  if (modes.includes("produits")) {
    const rows = sheetToRows(workbook, "Produits");

    for (const row of rows) {
      const code = String(getValue(row, ["Code Produit", "Code"]) || "").trim();
      const name = String(
        getValue(row, ["Nom Produit", "Produit", "Nom"]) || "",
      ).trim();
      if (!name) continue;

      // Reuse existing product id if code matches
      const id = getProductId(code, name);
      if (code) productMap.set(code, id);

      // Supplier name for the product
      const supplierName = String(getValue(row, ["Fournisseur"]) || "").trim();

      result.products.push({
        id,
        shop_id: shopId,
        code,
        name,
        purchase_price: toNumber(
          getValue(row, ["Prix Achat", "PA", "Prix d'achat"]),
        ),
        sale_price:
          toNumber(getValue(row, ["Prix Vente", "PV", "Prix de vente"])) ||
          null,
        stock_initial: toNumber(
          getValue(row, ["Stock Initial", "Stock Ini", "Stock"]),
        ),
        alert_threshold:
          toNumber(getValue(row, ["Seuil Alerte", "Seuil", "Alerte"])) || null,
        supplier: supplierName,
        unit:
          String(
            getValue(row, ["Unité", "Unite", "Unit"]) || "Pièces",
          ).trim() || "Pièces",
        created_at: now,
        updated_at: now,
        sync_status: "synced",
      });
    }
  }

  // ─── Achats ────────────────────────────────────────────────────────────────
  if (modes.includes("achats")) {
    const rows = sheetToRows(workbook, "Achats");

    for (const row of rows) {
      const code = String(getValue(row, ["Code Produit", "Code"]) || "").trim();
      const name = String(
        getValue(row, ["Nom Produit", "Produit", "Nom Produit"]) || "",
      ).trim();
      if (!name && !code) continue;

      const supplierName = String(getValue(row, ["Fournisseur"]) || "").trim();

      // Deduplicate suppliers within this import
      let supplierRecord = supplierByName.get(normalize(supplierName));
      if (!supplierRecord && supplierName) {
        supplierRecord = {
          id: uuid(),
          shop_id: shopId,
          name: supplierName,
          phone: "",
          address: "",
          created_at: now,
          updated_at: now,
          sync_status: "synced",
        };
        supplierByName.set(normalize(supplierName), supplierRecord);
        result.suppliers.push(supplierRecord);
      }

      const quantity = toNumber(
        getValue(row, ["Quantité", "Qte", "Qty", "Quantite"]),
      );
      const unitPrice = toNumber(
        getValue(row, ["PA Unitaire", "Prix Achat", "Prix Unitaire", "PA"]),
      );
      const total =
        toNumber(getValue(row, ["Total Achat", "Total"])) ||
        quantity * unitPrice;
      const date = excelDateToISO(getValue(row, ["Date"]));

      const productId = productMap.get(code) || null;

      result.purchases.push({
        id: uuid(),
        shop_id: shopId,
        date,
        supplier_id: supplierRecord?.id || null,
        supplier: supplierName,
        product_id: productId,
        product_code: code,
        product_name: name,
        quantity,
        unit_price: unitPrice,
        total_amount: total,
        payment_status: "paid",
        paid_amount: total,
        remaining_amount: 0,
        notes: "",
        created_at: now,
        updated_at: now,
        sync_status: "synced",
      });
    }
  }

  // ─── Ventes ────────────────────────────────────────────────────────────────
  if (modes.includes("ventes")) {
    const rows = sheetToRows(workbook, "Ventes");

    for (const row of rows) {
      const code = String(getValue(row, ["Code Produit", "Code"]) || "").trim();
      const name = String(
        getValue(row, ["Nom Produit", "Produit"]) || "",
      ).trim();
      if (!name && !code) continue;

      const quantity = toNumber(getValue(row, ["Quantité", "Qte", "Quantite"]));
      // Sale price: "Prix Vente Unitaire" in Excel
      const price = toNumber(
        getValue(row, [
          "Prix Vente Unitaire",
          "Prix Vente",
          "PV Unitaire",
          "PV",
        ]),
      );
      // Total sale: "Total Vente"
      const total =
        toNumber(getValue(row, ["Total Vente", "Total"])) || quantity * price;
      // Cost: "Coût Unitaire Achat"
      const cost = toNumber(
        getValue(row, [
          "Coût Unitaire Achat",
          "Cout Unitaire Achat",
          "PA Unitaire",
          "Coût Achat Unitaire",
        ]),
      );
      // Total cost: "Coût Total Achat"
      const costTotal =
        toNumber(
          getValue(row, [
            "Coût Total Achat",
            "Cout Total Achat",
            "Total Achat",
          ]),
        ) || quantity * cost;
      // Profit: "Résultat"
      const profit =
        toNumber(
          getValue(row, [
            "Résultat",
            "Resultat",
            "Bénéfice",
            "Benefice",
            "Marge",
          ]),
        ) || total - costTotal;
      // Store: "Magasin"
      const store = String(
        getValue(row, ["Magasin", "Boutique", "Store"]) || "",
      ).trim();
      const date = excelDateToISO(getValue(row, ["Date"]));
      const productId = productMap.get(code) || null;

      result.sales.push({
        id: uuid(),
        shop_id: shopId,
        session_id: uuid(), // Each row = its own session (historical data)
        sale_batch_id: uuid(),
        date,
        store,
        client_id: null,
        client_name: "",
        product_id: productId,
        product_code: code,
        product_name: name,
        quantity,
        unit_sale_price: price,
        total_sale: total,
        unit_purchase_cost: cost,
        total_purchase_cost: costTotal,
        profit,
        payment_status: "paid",
        paid_amount: total,
        remaining_amount: 0,
        created_at: now,
        updated_at: now,
        sync_status: "synced",
      });
    }
  }

  // ─── Charges ───────────────────────────────────────────────────────────────
  if (modes.includes("charges")) {
    const rows = sheetToRows(workbook, "Charges");

    for (const row of rows) {
      // Skip summary/total rows that have no date or description
      const description = String(
        getValue(row, ["Description", "Libellé", "Libelle", "Designation"]) ||
          "",
      ).trim();
      const amount = toNumber(getValue(row, ["Montant", "Amount"]));
      if (!description && !amount) continue;
      // Skip rows that look like totals (no date, just aggregate)
      if (!description) continue;

      const date = excelDateToISO(getValue(row, ["Date"]));

      result.expenses.push({
        id: uuid(),
        shop_id: shopId,
        date,
        description,
        amount: Math.abs(amount), // Always positive for expenses
        category: "Anciennes données",
        created_at: now,
        updated_at: now,
        sync_status: "synced",
      });
    }
  }

  // ─── Créances Clients ──────────────────────────────────────────────────────
  if (modes.includes("creances")) {
    const rows = sheetToRows(workbook, "Créances Clients");

    for (const row of rows) {
      const clientName = String(
        getValue(row, ["Client", "Nom Client", "Nom"]) || "",
      ).trim();
      if (!clientName) continue;

      const amount = toNumber(
        getValue(row, ["Montant Achat", "Montant", "Amount"]),
      );
      if (!amount) continue;

      // Deduplicate clients within this import
      let clientRecord = clientByName.get(normalize(clientName));
      if (!clientRecord) {
        // "Adresse" in Excel actually contains a phone number for this dataset
        const adresseRaw = String(
          getValue(row, ["Adresse", "Address", "Tel", "Phone"]) || "",
        ).trim();
        // Detect if it looks like a phone (digits/spaces only)
        const looksLikePhone = /^[\d\s\+\-]+$/.test(adresseRaw);

        clientRecord = {
          id: uuid(),
          shop_id: shopId,
          name: clientName,
          phone: looksLikePhone ? adresseRaw : "",
          address: looksLikePhone ? "" : adresseRaw,
          created_at: now,
          updated_at: now,
          sync_status: "synced",
        };
        clientByName.set(normalize(clientName), clientRecord);
        result.clients.push(clientRecord);
      }

      const label =
        String(
          getValue(row, ["Libellé", "Libelle", "Description", "Label"]) || "",
        ).trim() || "Ancienne créance";
      const date = excelDateToISO(getValue(row, ["Date"]));
      const quantity = toNumber(getValue(row, ["Quantité", "Qte"])) || 1;
      const unitAmount =
        toNumber(getValue(row, ["PA Unitaire", "Prix Unitaire"])) || amount;

      result.client_transactions.push({
        id: uuid(),
        shop_id: shopId,
        client_id: clientRecord.id,
        date,
        label,
        quantity,
        unit_amount: unitAmount,
        amount, // Positive = client owes us (créance)
        created_at: now,
        updated_at: now,
        sync_status: "synced",
      });
    }
  }

  // ─── Dettes Fournisseurs ───────────────────────────────────────────────────
  if (modes.includes("dettes")) {
    const rows = sheetToRows(workbook, "Dettes Fournisseurs");

    for (const row of rows) {
      const supplierName = String(
        getValue(row, ["Fournisseur", "Nom Fournisseur", "Nom"]) || "",
      ).trim();
      if (!supplierName) continue;

      const amount = toNumber(
        getValue(row, ["Montant Achat", "Montant", "Amount"]),
      );
      // Include negative amounts (règlements/payments) - they reduce the debt
      if (amount === 0) continue;

      // Deduplicate suppliers
      let supplierRecord = supplierByName.get(normalize(supplierName));
      if (!supplierRecord) {
        const adresseRaw = String(
          getValue(row, ["Adresse", "Address", "Tel"]) || "",
        ).trim();
        const looksLikePhone = /^[\d\s\+\-]+$/.test(adresseRaw);

        supplierRecord = {
          id: uuid(),
          shop_id: shopId,
          name: supplierName,
          phone: looksLikePhone ? adresseRaw : "",
          address: looksLikePhone ? "" : adresseRaw,
          created_at: now,
          updated_at: now,
          sync_status: "synced",
        };
        supplierByName.set(normalize(supplierName), supplierRecord);
        result.suppliers.push(supplierRecord);
      }

      const label =
        String(
          getValue(row, ["Libellé", "Libelle", "Description"]) || "",
        ).trim() || "Ancienne dette";
      const date = excelDateToISO(getValue(row, ["Date"]));
      const quantity = toNumber(getValue(row, ["Quantité", "Qte"])) || 1;
      const unitAmount =
        toNumber(getValue(row, ["PA Unitaire", "Prix Unitaire"])) ||
        Math.abs(amount);

      result.supplier_transactions.push({
        id: uuid(),
        shop_id: shopId,
        supplier_id: supplierRecord.id,
        date,
        label,
        quantity,
        unit_amount: unitAmount,
        // Positive = we owe supplier (dette), Negative = payment made (règlement)
        amount,
        created_at: now,
        updated_at: now,
        sync_status: "synced",
      });
    }
  }

  result.products = dedupeById(result.products);
  result.suppliers = dedupeById(result.suppliers);
  result.clients = dedupeById(result.clients);
  result.purchases = dedupeById(result.purchases);
  result.sales = dedupeById(result.sales);
  result.expenses = dedupeById(result.expenses);
  result.client_transactions = dedupeById(result.client_transactions);
  result.supplier_transactions = dedupeById(result.supplier_transactions);

  result.summary = {
    Produits: result.products.length,
    "Entrées de stock": result.purchases.length,
    Ventes: result.sales.length,
    Dépenses: result.expenses.length,
    Clients: result.clients.length,
    Fournisseurs: result.suppliers.length,
    "Transactions clients": result.client_transactions.length,
    "Transactions fournisseurs": result.supplier_transactions.length,
  };

  return result;
}
