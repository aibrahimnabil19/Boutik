// Core business logic: formatting, amount conversion, monthly aggregation.
// Import this anywhere — no framework dependencies.

import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
import { fr } from "date-fns/locale";

// ─── Currency formatting ──────────────────────────────────────────────────────

/** Format a number as FCFA: "1 250 000 FCFA" */
export function formatFCFA(amount, currency = "FCFA") {
  if (amount == null || isNaN(amount)) return `— ${currency}`;
  return (
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ` ${currency}`
  );
}

/** Format without currency label */
export function formatNumber(n) {
  return new Intl.NumberFormat("fr-FR").format(n || 0);
}

// ─── Amount to words (French, FCFA) ──────────────────────────────────────────

const ONES = [
  "",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
  "dix-sept",
  "dix-huit",
  "dix-neuf",
];
const TENS = [
  "",
  "dix",
  "vingt",
  "trente",
  "quarante",
  "cinquante",
  "soixante",
  "soixante",
  "quatre-vingt",
  "quatre-vingt",
];

function belowHundred(n) {
  if (n === 0) return "";
  if (n < 20) return ONES[n];

  const ten = Math.floor(n / 10);
  const one = n % 10;

  if (ten === 7) {
    return one === 1 ? "soixante-et-onze" : "soixante-" + ONES[10 + one];
  }

  if (ten === 9) {
    return one === 0 ? "quatre-vingt-dix" : "quatre-vingt-" + ONES[10 + one];
  }

  if (ten === 8) {
    return "quatre-vingt" + (one === 0 ? "s" : "-" + ONES[one]);
  }

  if (one === 1) {
    return TENS[ten] + "-et-un";
  }

  return TENS[ten] + (one > 0 ? "-" + ONES[one] : "");
}

function belowThousand(n) {
  if (n === 0) return "";
  if (n < 100) return belowHundred(n);

  const hundred = Math.floor(n / 100);
  const rest = n % 100;

  const hundredText =
    hundred === 1
      ? "cent"
      : `${belowHundred(hundred)} cent${rest === 0 ? "s" : ""}`;

  return rest > 0 ? `${hundredText} ${belowHundred(rest)}` : hundredText;
}

function numberToWordsFR(n) {
  if (n === 0) return "zéro";
  let result = "";
  if (n >= 1000000000) {
    const b = Math.floor(n / 1000000000);
    result += b === 1 ? "un milliard" : belowThousand(b) + " milliards";
    n %= 1000000000;
  }
  if (n >= 1000000) {
    const m = Math.floor(n / 1000000);
    result +=
      (result ? " " : "") +
      (m === 1 ? "un million" : belowThousand(m) + " millions");
    n %= 1000000;
  }
  if (n >= 1000) {
    const k = Math.floor(n / 1000);
    result +=
      (result ? " " : "") + (k === 1 ? "mille" : belowThousand(k) + " mille");
    n %= 1000;
  }
  if (n > 0) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    if (h > 0)
      result +=
        (result ? " " : "") +
        (h === 1
          ? "cent"
          : belowThousand(h) + " cent" + (rest === 0 ? "s" : ""));
    if (rest > 0) result += (result ? " " : "") + belowThousand(rest);
  }
  return result;
}

/** Convert amount to French words for invoices */
export function amountWordsOnlyFCFA(amount) {
  const n = Math.round(Number(amount || 0));
  if (!Number.isFinite(n)) return "zéro franc CFA";
  return `${numberToWordsFR(n)} francs CFA`;
}

/** Convert amount to French words for invoices */
export function amountToWordsFCFA(amount, subject = "") {
  const safeSubject = subject ? ` ${subject}` : "";
  return `Arrêté la présente${safeSubject} à la somme de ${amountWordsOnlyFCFA(amount)}`;
}

/**
 * Generate next monthly document number.
 * Facture: V2026-04-12
 * Proforma: P2026-04-12
 */
export function generateMonthlyDocumentNumber(
  existingInvoices,
  type = "facture",
  dateValue = new Date(),
) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  const prefix =
    type === "proforma" ? `P${year}-${month}-` : `V${year}-${month}-`;

  const indexes = (existingInvoices || [])
    .filter((inv) => inv.type === type)
    .map((inv) => String(inv.invoice_number || ""))
    .filter((num) => num.startsWith(prefix))
    .map((num) => Number(num.replace(prefix, "")))
    .filter((n) => Number.isFinite(n));

  const next = indexes.length ? Math.max(...indexes) + 1 : 1;

  return `${prefix}${String(next).padStart(2, "0")}`;
}

/**
 * Backward-compatible wrapper.
 */
export function generateInvoiceNumber(
  existingInvoices,
  type = "facture",
  dateValue = new Date(),
) {
  return generateMonthlyDocumentNumber(existingInvoices, type, dateValue);
}

// ─── Stock calculation ────────────────────────────────────────────────────────

/** Calculate current stock for a product */
export function calculateStock(product, purchases, sales) {
  const bought = purchases
    .filter(
      (p) => p.product_id === product.id || p.product_code === product.code,
    )
    .reduce((a, p) => a + (p.quantity || 0), 0);

  const sold = sales
    .filter(
      (s) => s.product_id === product.id || s.product_code === product.code,
    )
    .reduce((a, s) => a + (s.quantity || 0), 0);

  return (product.stock_initial || 0) + bought - sold;
}

// ─── Client/Supplier balance ──────────────────────────────────────────────────

/** Sum all transactions for a client (positive = owes us, negative = we owe them) */
export function calculateClientBalance(clientId, transactions) {
  return transactions
    .filter((t) => t.client_id === clientId && !t.deleted_at)
    .reduce((a, t) => a + (t.amount || 0), 0);
}

export function calculateSupplierBalance(supplierId, transactions) {
  return transactions
    .filter((t) => t.supplier_id === supplierId && !t.deleted_at)
    .reduce((a, t) => a + (t.amount || 0), 0);
}

// ─── Invoice total ────────────────────────────────────────────────────────────

export function calculateInvoiceTotal(items) {
  return items.reduce(
    (a, item) => a + (item.total_price || item.quantity * item.unit_price || 0),
    0,
  );
}

export function getMonthlyTotals(sales = [], purchases = [], expenses = [], months = 6) {
  return Array.from({ length: months }, (_, i) => {
    const date = subMonths(new Date(), months - 1 - i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    const inPeriod = (value) => {
      if (!value) return false;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return false;
      return isWithinInterval(d, { start, end });
    };

    const monthSales = sales
      .filter((s) => !s.deleted_at && !s.cancelled_at && inPeriod(s.date))
      .reduce((a, s) => a + Number(s.total_sale || 0), 0);

    const monthPurchases = purchases
      .filter((p) => !p.deleted_at && inPeriod(p.date))
      .reduce((a, p) => a + Number(p.total_amount || 0), 0);

    const monthExpenses = expenses
      .filter((e) => !e.deleted_at && inPeriod(e.date))
      .reduce((a, e) => a + Number(e.amount || 0), 0);

    const grossProfit = sales
      .filter((s) => !s.deleted_at && !s.cancelled_at && inPeriod(s.date))
      .reduce((a, s) => a + Number(s.profit || 0), 0);

    return {
      month: format(date, "MMM yy", { locale: fr }),
      ventes: monthSales,
      achats: monthPurchases,
      depenses: monthExpenses,
      benefice: grossProfit - monthExpenses,
    };
  });
}