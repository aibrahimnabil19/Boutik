import * as XLSX from "xlsx-js-style";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { describeDateFilter, isDateInFilter } from "@/lib/core/dateFilters";

const BLUE = "1F4E79";
const LIGHT_BLUE = "D9E2F3";
const GREEN = "70AD47";
const RED = "C00000";
const ORANGE = "F4B183";
const WHITE = "FFFFFF";

function n(value) {
  return Number(value || 0);
}

function norm(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function safeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function excelDate(value) {
  const d = safeDate(value);
  return d ? format(d, "dd/MM/yyyy", { locale: fr }) : "";
}

function dateSortAsc(a, b) {
  const da = safeDate(a)?.getTime() || 0;
  const db = safeDate(b)?.getTime() || 0;
  return da - db;
}

function sheetNameSafe(name) {
  return String(name || "Rapport")
    .replace(/[\\/?*[\]:]/g, " ")
    .slice(0, 31);
}

function currencyStyle(fill) {
  return {
    fill: fill ? { fgColor: { rgb: fill } } : undefined,
    numFmt: "#,##0",
    border: thinBorder(),
  };
}

function percentStyle(fill) {
  return {
    fill: fill ? { fgColor: { rgb: fill } } : undefined,
    numFmt: "0.00%",
    border: thinBorder(),
  };
}

function thinBorder() {
  return {
    top: { style: "thin", color: { rgb: "D9E2F3" } },
    bottom: { style: "thin", color: { rgb: "D9E2F3" } },
    left: { style: "thin", color: { rgb: "D9E2F3" } },
    right: { style: "thin", color: { rgb: "D9E2F3" } },
  };
}

function headerStyle() {
  return {
    fill: { fgColor: { rgb: BLUE } },
    font: { bold: true, color: { rgb: WHITE } },
    alignment: { horizontal: "center", vertical: "center" },
    border: thinBorder(),
  };
}

function titleStyle() {
  return {
    fill: { fgColor: { rgb: BLUE } },
    font: { bold: true, color: { rgb: WHITE }, sz: 16 },
    alignment: { horizontal: "center", vertical: "center" },
  };
}

function cellStyle(rowIndex) {
  return {
    fill: rowIndex % 2 === 0 ? { fgColor: { rgb: LIGHT_BLUE } } : undefined,
    border: thinBorder(),
    alignment: { vertical: "center" },
  };
}

function addSheet(wb, name, rows, options = {}) {
  const ws = XLSX.utils.aoa_to_sheet(rows);

  const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");

  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;

      if (r === 0) {
        ws[addr].s = headerStyle();
      } else {
        ws[addr].s = cellStyle(r);
      }
    }
  }

  if (options.title) {
    XLSX.utils.sheet_add_aoa(ws, [[options.title]], { origin: "A1" });
    ws["A1"].s = titleStyle();
  }

  if (options.widths) {
    ws["!cols"] = options.widths.map((w) => ({ wch: w }));
  }

  if (options.freezeHeader !== false) {
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetNameSafe(name));
  return ws;
}

function productKey(row) {
  return (
    row.product_id ||
    row.id ||
    row.product_code ||
    row.code ||
    row.product_name ||
    row.name
  );
}

function findProduct(products, row) {
  const pid = row.product_id;
  const code = row.product_code;

  return products.find(
    (p) =>
      (pid && p.id === pid) ||
      (code && p.code === code) ||
      norm(p.name) === norm(row.product_name),
  );
}

function monthlyKey(dateValue) {
  const d = safeDate(dateValue);
  if (!d) return "Sans date";
  return format(d, "yyyy-MM");
}

function monthlyLabel(key) {
  if (key === "Sans date") return key;
  return format(new Date(`${key}-01`), "MMM yyyy", { locale: fr });
}

function buildProductStats({ products, purchases, sales }) {
  const map = {};

  for (const p of products) {
    const key = p.id || p.code || p.name;
    map[key] = {
      product: p,
      code: p.code || "",
      name: p.name || "",
      stockInitial: n(p.stock_initial),
      threshold: n(p.alert_threshold),
      purchasePrice: n(p.purchase_price),
      totalAchatsQty: 0,
      totalVentesQty: 0,
      ca: 0,
      cost: 0,
      profit: 0,
    };
  }

  for (const p of purchases) {
    const product = findProduct(products, p);
    const key = product?.id || p.product_id || p.product_code || p.product_name;

    if (!map[key]) {
      map[key] = {
        product,
        code: p.product_code || product?.code || "",
        name: p.product_name || product?.name || "",
        stockInitial: n(product?.stock_initial),
        threshold: n(product?.alert_threshold),
        purchasePrice: n(product?.purchase_price || p.unit_price),
        totalAchatsQty: 0,
        totalVentesQty: 0,
        ca: 0,
        cost: 0,
        profit: 0,
      };
    }

    map[key].totalAchatsQty += n(p.quantity);
  }

  for (const s of sales) {
    const product = findProduct(products, s);
    const key = product?.id || s.product_id || s.product_code || s.product_name;

    if (!map[key]) {
      map[key] = {
        product,
        code: s.product_code || product?.code || "",
        name: s.product_name || product?.name || "",
        stockInitial: n(product?.stock_initial),
        threshold: n(product?.alert_threshold),
        purchasePrice: n(product?.purchase_price || s.unit_purchase_cost),
        totalAchatsQty: 0,
        totalVentesQty: 0,
        ca: 0,
        cost: 0,
        profit: 0,
      };
    }

    map[key].totalVentesQty += n(s.quantity);
    map[key].ca += n(s.total_sale);
    map[key].cost += n(s.total_purchase_cost);
    map[key].profit += n(s.profit);
  }

  return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
}

export function exportRentabiliteReportExcel({
  shop,
  dateFilter,
  products = [],
  purchases = [],
  sales = [],
  expenses = [],
  clients = [],
  clientTransactions = [],
  suppliers = [],
  supplierTransactions = [],
}) {
  const filteredSales = sales
    .filter((s) => !s.deleted_at && !s.cancelled_at)
    .filter((s) => isDateInFilter(s.date, dateFilter))
    .sort((a, b) => dateSortAsc(a.date, b.date));

  const filteredPurchases = purchases
    .filter((p) => !p.deleted_at)
    .filter((p) => isDateInFilter(p.date, dateFilter))
    .sort((a, b) => dateSortAsc(a.date, b.date));

  const filteredExpenses = expenses
    .filter((e) => !e.deleted_at)
    .filter((e) => isDateInFilter(e.date, dateFilter))
    .sort((a, b) => dateSortAsc(a.date, b.date));

  const filteredClientTransactions = clientTransactions
    .filter((t) => !t.deleted_at)
    .filter((t) => isDateInFilter(t.date, dateFilter))
    .sort((a, b) => dateSortAsc(a.date, b.date));

  const filteredSupplierTransactions = supplierTransactions
    .filter((t) => !t.deleted_at)
    .filter((t) => isDateInFilter(t.date, dateFilter))
    .sort((a, b) => dateSortAsc(a.date, b.date));

  const productStats = buildProductStats({
    products,
    purchases: filteredPurchases,
    sales: filteredSales,
  });

  const wb = XLSX.utils.book_new();

  // Produits
  addSheet(
    wb,
    "Produits",
    [
      [
        "Code Produit",
        "Nom Produit",
        "Prix Achat",
        "Prix Vente",
        "Stock Initial",
        "Seuil Alerte",
        "Fournisseur",
      ],
      ...products.map((p) => [
        p.code || "",
        p.name || "",
        n(p.purchase_price),
        n(p.sale_price),
        n(p.stock_initial),
        p.alert_threshold || "",
        p.supplier || "",
      ]),
    ],
    {
      widths: [18, 48, 16, 16, 14, 14, 24],
    },
  );

  // Achats
  addSheet(
    wb,
    "Achats",
    [
      [
        "Date",
        "Fournisseur",
        "Code Produit",
        "Nom Produit",
        "Quantité",
        "PA Unitaire",
        "Total Achat",
      ],
      ...filteredPurchases.map((p) => [
        excelDate(p.date),
        p.supplier || "",
        p.product_code || "",
        p.product_name || "",
        n(p.quantity),
        n(p.unit_price),
        n(p.total_amount),
      ]),
    ],
    {
      widths: [14, 24, 18, 48, 12, 16, 18],
    },
  );

  // Ventes
  addSheet(
    wb,
    "Ventes",
    [
      [
        "Date",
        "Magasin",
        "Code Produit",
        "Nom Produit",
        "Quantité",
        "Prix Vente Unitaire",
        "Total Vente",
        "Coût Unitaire Achat",
        "Coût Total Achat",
        "Résultat",
      ],
      ...filteredSales.map((s) => [
        excelDate(s.date),
        s.store || "",
        s.product_code || "",
        s.product_name || "",
        n(s.quantity),
        n(s.unit_sale_price),
        n(s.total_sale),
        n(s.unit_purchase_cost),
        n(s.total_purchase_cost),
        n(s.profit),
      ]),
    ],
    {
      widths: [14, 18, 18, 48, 12, 18, 18, 20, 20, 18],
    },
  );

  // Stock Intelligent
  const stockRows = productStats.map((p) => {
    const stockDisponible =
      p.stockInitial + p.totalAchatsQty - p.totalVentesQty;
    const threshold = p.threshold || 0;
    const alert = stockDisponible <= threshold ? "⚠ COMMANDE URGENTE" : "OK";

    return [
      p.code,
      p.name,
      p.stockInitial,
      p.totalAchatsQty,
      p.totalVentesQty,
      stockDisponible,
      alert,
      p.purchasePrice,
      stockDisponible * p.purchasePrice,
    ];
  });

  addSheet(
    wb,
    "Stock Intelligent",
    [
      [
        "Code Produit",
        "Nom Produit",
        "Stock Initial",
        "Total Achats",
        "Total Ventes",
        "Stock Disponible",
        "Alerte Stock",
        "PA Unitaire",
        "Stock en valeur",
      ],
      ...stockRows,
    ],
    {
      widths: [18, 48, 14, 14, 14, 16, 26, 16, 18],
    },
  );

  // Analyse Rentabilité
  addSheet(
    wb,
    "Analyse Rentabilité",
    [
      [
        "Code Produit",
        "Nom Produit",
        "Chiffre d'Affaires",
        "Coût Total Achat",
        "Marge Brute",
        "Taux de Marge (%)",
      ],
      ...productStats.map((p) => [
        p.code,
        p.name,
        p.ca,
        p.cost,
        p.profit,
        p.cost > 0 ? p.profit / p.cost : 0,
      ]),
    ],
    {
      widths: [18, 48, 20, 20, 18, 18],
    },
  );

  // Dashboard PDG
  const totalVentes = filteredSales.reduce((a, s) => a + n(s.total_sale), 0);
  const totalAchats = filteredPurchases.reduce(
    (a, p) => a + n(p.total_amount),
    0,
  );
  const totalDepenses = filteredExpenses.reduce((a, e) => a + n(e.amount), 0);
  const margeVentes = filteredSales.reduce((a, s) => a + n(s.profit), 0);
  const resultatNet = margeVentes - totalDepenses;

  const dashboard = XLSX.utils.aoa_to_sheet([
    ["TABLEAU DE BORD STRATEGIQUE"],
    ["Boutique", shop?.name || "—"],
    ["Période", describeDateFilter(dateFilter)],
    ["Total Ventes", totalVentes],
    ["Total Achats", totalAchats],
    ["Total Dépenses", totalDepenses],
    ["Résultat Net", resultatNet],
  ]);

  dashboard["!cols"] = [{ wch: 28 }, { wch: 22 }];
  dashboard["A1"].s = titleStyle();
  dashboard["B1"] = dashboard["B1"] || { t: "s", v: "" };
  dashboard["B1"].s = titleStyle();

  for (let r = 1; r <= 6; r++) {
    const a = `A${r + 1}`;
    const b = `B${r + 1}`;
    if (dashboard[a])
      dashboard[a].s = {
        font: { bold: true },
        border: thinBorder(),
        fill: { fgColor: { rgb: LIGHT_BLUE } },
      };
    if (dashboard[b])
      dashboard[b].s = { border: thinBorder(), numFmt: "#,##0" };
  }

  XLSX.utils.book_append_sheet(wb, dashboard, "Dashboard PDG");

  // Charges
  addSheet(
    wb,
    "Charges",
    [
      ["Date", "Description", "Montant", "", "Total Depenses"],
      ...filteredExpenses.map((e, i) => [
        excelDate(e.date),
        e.description || "",
        n(e.amount),
        "",
        i === 0 ? totalDepenses : "",
      ]),
    ],
    {
      widths: [14, 42, 18, 4, 18],
    },
  );

  // Créances Clients
  const clientById = Object.fromEntries(clients.map((c) => [c.id, c]));

  addSheet(
    wb,
    "Créances Clients",
    [
      [
        "Date",
        "Client",
        "Adresse",
        "Libellé",
        "Quantité",
        "PA Unitaire",
        "Montant Achat",
      ],
      ...filteredClientTransactions.map((t) => {
        const c = clientById[t.client_id] || {};
        return [
          excelDate(t.date),
          c.name || t.client_name || "",
          c.phone || c.address || "",
          t.label || "",
          n(t.quantity || 1),
          n(t.unit_amount),
          n(t.amount),
        ];
      }),
    ],
    {
      widths: [14, 26, 20, 38, 12, 16, 18],
    },
  );

  // Dettes Fournisseurs
  const supplierById = Object.fromEntries(suppliers.map((s) => [s.id, s]));

  addSheet(
    wb,
    "Dettes Fournisseurs",
    [
      [
        "Date",
        "Fournisseur",
        "Adresse",
        "Libellé",
        "Quantité",
        "PA Unitaire",
        "Montant Achat",
      ],
      ...filteredSupplierTransactions.map((t) => {
        const s = supplierById[t.supplier_id] || {};
        return [
          excelDate(t.date),
          s.name || t.supplier_name || "",
          s.phone || s.address || "",
          t.label || "",
          n(t.quantity || 1),
          n(t.unit_amount),
          n(t.amount),
        ];
      }),
    ],
    {
      widths: [14, 26, 20, 38, 12, 16, 18],
    },
  );

  // Synthese_Mensuelle
  const monthly = {};

  for (const s of filteredSales) {
    const key = monthlyKey(s.date);
    if (!monthly[key]) monthly[key] = { ventes: 0, cout: 0, benefice: 0 };
    monthly[key].ventes += n(s.total_sale);
    monthly[key].cout += n(s.total_purchase_cost);
    monthly[key].benefice += n(s.profit);
  }

  const monthlyRows = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, row]) => [
      monthlyLabel(key),
      row.ventes,
      row.cout,
      row.benefice,
    ]);

  addSheet(
    wb,
    "Synthese_Mensuelle",
    [["Mois", "Total Ventes", "Coût Total Achat", "Bénéfice"], ...monthlyRows],
    {
      widths: [18, 20, 22, 18],
    },
  );

  // Apply number/date formats and extra conditional styling
  for (const ws of wb.SheetNames.map((name) => wb.Sheets[name])) {
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");

    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (!cell) continue;

        if (cell.v instanceof Date) {
          cell.z = "dd/mm/yyyy";
        }

        if (typeof cell.v === "number") {
          cell.z = "#,##0";
        }

        if (ws === wb.Sheets["Analyse Rentabilité"] && c === 5 && r > 0) {
          cell.z = "0.00%";
        }

        if (typeof cell.v === "number" && cell.v < 0) {
          cell.s = {
            ...(cell.s || {}),
            font: {
              ...(cell.s?.font || {}),
              color: { rgb: RED },
              bold: c >= 4,
            },
          };
        }

        if (String(cell.v || "").includes("COMMANDE URGENTE")) {
          cell.s = {
            ...(cell.s || {}),
            fill: { fgColor: { rgb: ORANGE } },
            font: { bold: true, color: { rgb: RED } },
          };
        }
      }
    }
  }

  const safeShop = String(shop?.name || "Boutik")
    .replace(/[^a-z0-9_-]+/gi, "_")
    .slice(0, 40);

  const safePeriod = describeDateFilter(dateFilter)
    .replace(/[^a-z0-9_-]+/gi, "_")
    .slice(0, 40);

  XLSX.writeFile(wb, `Rapport_Rentabilite_${safeShop}_${safePeriod}.xlsx`);
}
