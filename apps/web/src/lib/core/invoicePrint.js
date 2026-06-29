// lib/core/invoicePrint.js
// Renders a self-contained HTML string for printing via iframe.

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatFCFA, amountToWordsFCFA } from "./calculations";

export function askIncludeStamp(shop) {
  if (typeof window === "undefined") return true;
  const hasStamp = !!shop?.signature_url || !!shop?.cachet_url;
  if (!hasStamp) return false;
  return window.confirm(
    "Voulez-vous générer ce document avec cachet/signature ?\n\nOK = Avec cachet/signature\nAnnuler = Sans cachet/signature",
  );
}

export function normalizeDocumentOptions(shop, options = {}) {
  return {
    includeCachet:
      !!options.includeCachet &&
      !!(shop?.cachet_print_src || shop?.cachet_data_url || shop?.cachet_url),
    includeSignature:
      !!options.includeSignature &&
      !!(
        shop?.signature_print_src ||
        shop?.signature_data_url ||
        shop?.signature_url
      ),
    orientation: getOrientation(options),
  };
}

function getOrientation(options = {}) {
  return options.orientation === "portrait" ? "portrait" : "landscape";
}

function getAssetSrc(shop, key) {
  return shop?.[`${key}_data_url`] || shop?.[`${key}_url`] || "";
}

async function imageUrlToDataUrl(url) {
  if (!url || url.startsWith("data:")) return url || "";
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error(`Image HTTP ${res.status}`);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

// ─── Multi-sale (combined invoice across several sale groups, same client) ──
export function printSaleDocumentMulti({
  shop,
  type,
  saleGroups,
  invoiceNumber,
  guaranteeText,
  includeCachet,
  includeSignature,
  orientation = "landscape",
}) {
  const allFirstItems = saleGroups.map(
    (g) => (g.items || []).find((s) => !s.is_charge) || g.items?.[0] || {},
  );
  const anchor = allFirstItems[0] || {};

  const earliestDate =
    saleGroups
      .map((g) => g.date)
      .filter(Boolean)
      .sort()[0] || saleGroups[0]?.date;

  const formValues = {
    date: earliestDate,
    city: shop?.city || "",
    client_name: saleGroups[0]?.client_name || anchor.client_name || "",
    client_address:
      saleGroups[0]?.client_address || anchor.client_address || "",
    client_phone: saleGroups[0]?.client_phone || anchor.client_phone || "",
    validity: "30 jours",
  };

  const items = saleGroups.flatMap((g) =>
    (g.items || [])
      .filter((s) => !s.is_charge)
      .map((s) => ({
        id: s.id,
        is_charge: false,
        designation: s.product_name,
        quantity: s.quantity,
        unit: s.unit || "Pièces",
        unit_price: s.unit_sale_price || 0,
        total_price: s.total_sale || 0,
      })),
  );

  const grandTotal = items.reduce((a, i) => a + i.total_price, 0);
  const num = invoiceNumber || `V-${earliestDate}`;

  const html = renderToInvoiceHTML({
    shop,
    invoiceNumber: num,
    formValues,
    items,
    grandTotal,
    type,
    includeCachet,
    includeSignature,
    guaranteeText,
    orientation,
  });

  printHtmlDocument(html, orientation);
}

// ─── Multi-purchase ──
export function printPurchaseDocumentMulti({
  shop,
  type,
  purchases,
  invoiceNumber,
  guaranteeText = "",
  includeCachet,
  includeSignature,
  orientation = "landscape",
}) {
  const earliestDate =
    purchases
      .map((p) => p.date)
      .filter(Boolean)
      .sort()[0] || purchases[0]?.date;

  const formValues = {
    date: earliestDate,
    city: shop?.city || "",
    client_name: purchases[0]?.supplier || "",
    client_address: "",
    client_phone: "",
  };

  const items = purchases.map((p) => ({
    id: p.id,
    is_charge: false,
    designation: p.product_name,
    quantity: p.quantity,
    unit: "Pièces",
    unit_price: p.unit_price || 0,
    total_price: p.total_amount || 0,
  }));

  const grandTotal = items.reduce((a, i) => a + i.total_price, 0);
  const num = invoiceNumber || `ACH-${earliestDate}`;

  const html = renderToInvoiceHTML({
    shop,
    invoiceNumber: num,
    formValues,
    items,
    grandTotal,
    type,
    includeCachet,
    includeSignature,
    guaranteeText,
    orientation,
  });

  printHtmlDocument(html, orientation);
}

export async function preparePrintableShop(shop = {}) {
  return {
    ...shop,
    logo_print_src: await imageUrlToDataUrl(getAssetSrc(shop, "logo")),
    cachet_print_src: await imageUrlToDataUrl(getAssetSrc(shop, "cachet")),
    signature_print_src: await imageUrlToDataUrl(
      getAssetSrc(shop, "signature"),
    ),
  };
}

function waitForPrintAssets(doc) {
  const images = Array.from(doc.images || []);
  if (!images.length) return Promise.resolve();
  return Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
        setTimeout(resolve, 2500);
      });
    }),
  );
}

export function printHtmlDocument(html, orientation = "landscape") {
  const isPortrait = orientation === "portrait";

  const iframe = document.createElement("iframe");
  iframe.style.cssText = isPortrait
    ? "position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;"
    : "position:fixed;top:-9999px;left:-9999px;width:297mm;height:210mm;border:none;";

  document.body.appendChild(iframe);
  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();

  iframe.onload = async () => {
    await waitForPrintAssets(iframe.contentDocument);
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1500);
  };
}

// ─── helpers ─────────────────────────────────────────────────────────────────
/** Build the phone string shown in the landscape middle block.
 *  If shop has both phone and whatsapp (and they differ), join with " / ". */
function buildPhoneLine(shop) {
  const phone = shop?.phone || "";
  const wa = shop?.whatsapp || "";
  if (phone && wa && phone.trim() !== wa.trim()) {
    return `${phone} / ${wa}`;
  }
  return phone || wa || "";
}

/** Format numbers with spaces as thousands separator (French style). */
function fmtNum(n) {
  return Number(n || 0).toLocaleString("fr-FR");
}

// ─── LANDSCAPE LAYOUT ────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
function renderLandscapeHTML({
  shop,
  invoiceNumber,
  formValues,
  items,
  grandTotal,
  type,
  guaranteeText,
  documentOptions,
}) {
  const dateStr = formValues.date
    ? format(new Date(formValues.date), "dd MMMM yyyy", { locale: fr })
    : "—";

  const city = formValues.city || shop?.city || "Niamey";

  const PRIMARY = "#1D71B8";
  const ORANGE  = "#F29100";
  const ROW_BG  = "#D9E1F2";

  const isProforma    = type === "proforma";
  const isBonLivraison = type === "bon_livraison";
  const isBonCommande  = type === "bon_commande";

  let title = "FACTURE DE VENTE";
  if (isProforma)    title = "FACTURE PROFORMA";
  if (isBonLivraison) title = "BON DE LIVRAISON";
  if (isBonCommande)  title = "BON DE COMMANDE";

  const showPrices = !isBonLivraison && !isBonCommande;

  const printItems = items.filter((item) => !item.is_charge);

  const itemsHTML = printItems
    .map((item, i) => {
      const bg = i % 2 === 0 ? ROW_BG : "#fff";
      return `
    <tr>
      <td class="td-cell td-left"  style="background:${bg}">${item.designation || item.product_name || "—"}</td>
      <td class="td-cell td-center" style="background:${bg}">${item.quantity || 0}</td>
      <td class="td-cell td-center" style="background:${bg}">${item.unit || "Pièces"}</td>
      ${showPrices ? `
      <td class="td-cell td-right"  style="background:${bg}">${fmtNum(item.unit_price || item.unit_sale_price)}</td>
      <td class="td-cell td-right td-bold" style="background:${bg}">${fmtNum(item.total_price || item.total_sale)}</td>` : ""}
    </tr>`;
    })
    .join("");

  const printGrandTotal = printItems.reduce(
    (sum, item) => sum + Number(item.total_price || item.total_sale || 0), 0,
  );

  const clientName    = formValues.client_name    || "—";
  const clientAddress = formValues.client_address || "—";
  const clientPhone   = formValues.client_phone   || "—";

  // Shop info
  const shopName     = shop?.name     || "";
  const shopAddress  = shop?.address  || "DAR ES SALAM derrière ESCAE";
  const shopNif      = shop?.nif      || "50873/P";
  const shopRccm     = shop?.rccm     || "NE-NIA-2019-A-467";
  const shopCity     = (shop?.city    || "NIAMEY").toUpperCase();
  const shopEmail    = shop?.email    || "elso.niger@gmail.com";
  const shopPhone    = shop?.phone    || "(+227) 90 27 54 53 / 94 29 29 19";
  const shopWhatsapp = shop?.whatsapp || shop?.phone || "+227 94 29 29 19";
  const phoneLine    = buildPhoneLine(shop);

  // Activity: 3-line split matching the orange box spec
  const shopActivity = shop?.activity ||
    "VENTE ET INSTALLATION\nD'ÉQUIPEMENTS SOLAIRES\nENTRETIEN ET DÉPANNAGE";
  const activityLines = shopActivity.split("\n");

  const colSpan = showPrices ? 5 : 3;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title} ${invoiceNumber}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 6mm 8mm 6mm 8mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: white;
      color: #000;
      font-family: "Times New Roman", Times, serif;
      font-size: 15px;
      width: 281mm;
    }

    /* ── TOP HEADER: 3-column grid ── */
    .top {
      display: grid;
      /* Logo 7.05cm | middle 9cm auto-placed | orange box 8.77cm */
      grid-template-columns: 76mm auto 94mm;
      gap: 4mm;
      align-items: start;
      margin-bottom: 3mm;
    }

    /* Logo cell — 7.05 cm wide × 2.92 cm tall */
    .logo-cell img {
      width:  75mm;
      height: 29mm;
      object-fit: contain;
      display: block;
    }
    .logo-placeholder { width: 75mm; height: 29mm; }

    /* Middle block — 9 cm wide × 3.06 cm tall, text left-aligned, Calibri 14 bold */
    .company-block {
      font-family: Calibri, "Segoe UI", Arial, sans-serif;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.55;
      text-align: left;
      width: 90mm;
      height: 30mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    /* Right column: orange activity box (8.77 cm × 2.23 cm) + date */
    .right-col {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 1.5mm;
    }
    .activity-box {
      background: ${ORANGE};
      color: #fff;
      font-family: Calibri, "Segoe UI", Arial, sans-serif;
      font-size: 16px;
      font-weight: 700;
      /* text-align: justify with middle vertical alignment */
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width:  93mm;   /* 8.77 cm */
      height: 22mm;   /* 2.23 cm */
      padding: 2mm 4mm;
      line-height: 1.35;
      /* Rounded corners for landscape (paysage) */
      border-radius: 16px;
    }
    .date-line {
      font-family: "Times New Roman", Times, serif;
      font-size: 15px;
      text-align: right;
      width: 93mm;
    }

    /* ── ORANGE TITLE BAR ── */
    .doc-title {
      background: ${ORANGE};
      color: #fff;
      font-family: "Times New Roman", Times, serif;
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      padding: 2.5mm 0;
    }
    .title-spacer { height: 3mm; }

    /* ── CLIENT STRIP ── */
    .client-strip {
      display: grid;
      grid-template-columns: 1.1fr 1fr 1fr;
      background: ${PRIMARY};
      color: #fff;
      font-family: "Times New Roman", Times, serif;
      font-size: 15px;
      font-weight: bold;
    }
    .client-cell {
      padding: 1.5mm 3mm;
      border-right: 2.5px solid #fff;
      text-align: center;
    }
    .client-cell:last-child { border-right: none; }

    /* ── TABLE ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4mm;
    }
    th {
      background: ${PRIMARY};
      color: #fff;
      font-family: "Times New Roman", Times, serif;
      font-size: 15px;
      font-weight: bold;
      text-align: center;
      padding: 1.5mm 2mm;
      border: 2.5px solid #fff;
    }
    .th-left   { text-align: left; }
    .th-right  { text-align: right; }

    .td-cell {
      font-family: "Times New Roman", Times, serif;
      font-size: 14px;
      font-weight: normal;
      padding: 1.5mm 2mm;
      border: 2.5px solid #fff;
    }
    .td-left   { text-align: left; }
    .td-center { text-align: center; }
    .td-right  { text-align: right; }
    .td-bold   { font-weight: bold; }

    /* Total row */
    .total-row td {
      background: ${PRIMARY};
      color: #fff;
      font-family: "Times New Roman", Times, serif;
      font-size: 15px;
      font-weight: bold;
      padding: 1.5mm 2mm;
      border: 2.5px solid #fff;
      text-align: center;
    }
    .total-value { text-align: right; }

    /* ── AMOUNT IN WORDS ── */
    .words {
      margin-top: 5mm;
      font-family: "Times New Roman", Times, serif;
      font-size: 15px;
      font-weight: normal;
      line-height: 1.5;
    }
    .words strong { font-weight: bold; }

    /* ── BOTTOM SECTION ── */
    .bottom-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 5mm;
    }
    .garantie-col { flex: 1; }
    .garantie {
      font-family: "Times New Roman", Times, serif;
      font-size: 15px;
      font-weight: normal;
      line-height: 1.6;
    }
    .garantie .label {
      color: red;
      text-decoration: underline;
      font-weight: normal;
      display: block;
      margin-bottom: 1mm;
    }
    .signature-box {
      width: 54mm;
      text-align: center;
      font-family: "Times New Roman", Times, serif;
      font-size: 15px;
      font-weight: bold;
      text-transform: uppercase;
      flex-shrink: 0;
      margin-left: 6mm;
    }
    .signature-img {
      max-width: 44mm;
      max-height: 24mm;
      object-fit: contain;
      margin-top: 2mm;
      display: block;
      margin-left: auto;
      margin-right: auto;
    }

    @media print {
      html, body {
        width: 297mm;
        height: 210mm;
        overflow: hidden;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>

  <!-- TOP HEADER -->
  <div class="top">
    <!-- Logo -->
    <div class="logo-cell">
      ${getAssetSrc(shop, "logo")
        ? `<img src="${shop.logo_print_src || getAssetSrc(shop, "logo")}" alt="Logo" />`
        : '<div class="logo-placeholder"></div>'}
    </div>

    <!-- Middle info block -->
    <div class="company-block">
      ${shopName ? `<div>${shopName}</div>` : ""}
      <div>Situé à ${shopAddress}</div>
      <div>NIF : ${shopNif} – RCCM : ${shopRccm}</div>
      ${phoneLine ? `<div>${phoneLine}</div>` : ""}
      <div>${shopCity} - NIGER</div>
    </div>

    <!-- Right: orange box + date -->
    <div class="right-col">
      <div class="activity-box">
        ${activityLines.map((l) => `<div>${l}</div>`).join("")}
      </div>
      <div class="date-line">${city}, le ${dateStr}</div>
    </div>
  </div>

  <!-- TITLE BAR -->
  <div class="doc-title">${title} ${invoiceNumber}</div>
  <div class="title-spacer"></div>

  <!-- CLIENT STRIP -->
  <div class="client-strip">
    <div class="client-cell">CLIENT : ${clientName}</div>
    <div class="client-cell">ADRESSE : ${clientAddress}</div>
    <div class="client-cell">Tél : ${clientPhone}</div>
  </div>

  <!-- ITEMS TABLE -->
  <table>
    <thead>
      <tr>
        <th class="th-left"  style="width:43%">Désignation</th>
        <th                   style="width:9%">Quantité</th>
        <th                   style="width:9%">Unité</th>
        ${showPrices ? `
        <th class="th-right" style="width:19%">Prix Unitaire CFA</th>
        <th class="th-right" style="width:20%">Prix Total CFA</th>` : ""}
      </tr>
    </thead>
    <tbody>
      ${itemsHTML || `<tr><td class="td-cell td-left" style="background:${ROW_BG}" colspan="${colSpan}">Aucun article</td></tr>`}
    </tbody>
    ${showPrices ? `
    <tfoot>
      <tr class="total-row">
        <td colspan="${colSpan - 1}" style="text-align:center">MONTANT TOTAL</td>
        <td class="total-value">${fmtNum(printGrandTotal)}</td>
      </tr>
    </tfoot>` : ""}
  </table>

  ${showPrices ? `
  <div class="words">${
    amountToWordsFCFA(printGrandTotal, isProforma ? "proforma" : "facture")
      .replace(
        /(Arrêté la présente (?:facture|proforma) à la somme de )(.+)/i,
        "$1<strong>$2</strong>",
      )
  }</div>` : ""}

  <!-- BOTTOM: garantie + signature -->
  <div class="bottom-section">
    <div class="garantie-col">
      ${guaranteeText ? `
      <div class="garantie">
        <span class="label">GARANTIE</span>
        ${guaranteeText}
      </div>` : ""}
    </div>
    <div class="signature-box">
      SIGNATURE
      ${documentOptions.includeSignature && (shop?.signature_print_src || shop?.signature_url)
        ? `<br/><img class="signature-img" src="${shop.signature_print_src || shop.signature_url}" />`
        : ""}
      ${documentOptions.includeCachet && (shop?.cachet_print_src || shop?.cachet_url)
        ? `<br/><img class="signature-img" src="${shop.cachet_print_src || shop.cachet_url}" />`
        : ""}
    </div>
  </div>

</body>
</html>`;
}

// ─── PORTRAIT LAYOUT ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
function renderPortraitHTML({
  shop,
  invoiceNumber,
  formValues,
  items,
  grandTotal,
  type,
  guaranteeText,
  documentOptions,
}) {
  const dateStr = formValues.date
    ? format(new Date(formValues.date), "dd MMMM yyyy", { locale: fr })
    : "—";

  const city = formValues.city || shop?.city || "Niamey";

  const PRIMARY = "#1D71B8";
  const ORANGE  = "#F29100";
  const ROW_BG  = "#D9E1F2";

  const isProforma    = type === "proforma";
  const isBonLivraison = type === "bon_livraison";
  const isBonCommande  = type === "bon_commande";

  let title = "FACTURE DE VENTE";
  if (isProforma)    title = "FACTURE PROFORMA";
  if (isBonLivraison) title = "BON DE LIVRAISON";
  if (isBonCommande)  title = "BON DE COMMANDE";

  const showPrices = !isBonLivraison && !isBonCommande;

  const printItems = items.filter((item) => !item.is_charge);

  const itemsHTML = printItems
    .map((item, i) => {
      const bg = i % 2 === 0 ? ROW_BG : "#ffffff";
      return `
    <tr>
      <td class="td-cell td-left"   style="background:${bg}">${item.designation || item.product_name || "—"}</td>
      <td class="td-cell td-center" style="background:${bg}">${item.quantity || 0}</td>
      <td class="td-cell td-center" style="background:${bg}">${item.unit || "Pièce"}</td>
      ${showPrices ? `
      <td class="td-cell td-right"  style="background:${bg}">${fmtNum(item.unit_price || item.unit_sale_price)}</td>
      <td class="td-cell td-right td-bold" style="background:${bg}">${fmtNum(item.total_price || item.total_sale)}</td>` : ""}
    </tr>`;
    })
    .join("");

  const printGrandTotal = printItems.reduce(
    (sum, item) => sum + Number(item.total_price || item.total_sale || 0), 0,
  );

  const clientName    = formValues.client_name    || "—";
  const clientAddress = formValues.client_address || "—";
  const clientPhone   = formValues.client_phone   || "—";

  const shopPhone    = shop?.phone    || "(+227) 90 27 54 53 / 94 29 29 19";
  const shopWhatsapp = shop?.whatsapp || shop?.phone || "+227 94 29 29 19";
  const shopEmail    = shop?.email    || "elso.niger@gmail.com";
  const shopAddress  = shop?.address  || "DAR ES SALAM derrière ESCAE";
  const shopNif      = shop?.nif      || "50873/P";
  const shopRccm     = shop?.rccm     || "NE-NIA-2019-A-467";
  const shopBank     = shop?.bank_account || "02134924401-79";
  const shopCity     = (shop?.city    || "NIAMEY").toUpperCase();
  const shopActivity = shop?.activity || "VENTE ET INSTALLATION D'EQUIPEMENTS SOLAIRES";

  const colSpan = showPrices ? 5 : 3;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title} ${invoiceNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 6mm 8mm 0mm 8mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: white;
      color: #000;
      font-family: "Times New Roman", Times, serif;
      font-size: 15px;
      display: flex;
      flex-direction: column;
      min-height: 285mm;
      width: 194mm;
    }
    .page { flex: 1; }

    /* ── TOP HEADER ── */
    .top {
      display: grid;
      grid-template-columns: 55mm 1fr;
      gap: 4mm;
      align-items: start;
      margin-bottom: 4mm;
    }
    .logo-cell img {
      max-width: 53mm;
      max-height: 34mm;
      object-fit: contain;
      display: block;
    }
    .logo-placeholder { width: 53mm; height: 34mm; }

    /* Right col: orange box top-right, company info right-aligned below, date right */
    .right-col {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 1.5mm;
    }
    /* Orange activity box — full width */
    .activity-box {
      background: ${ORANGE};
      color: #fff;
      font-family: "Times New Roman", Times, serif;
      font-size: 15px;
      font-weight: bold;
      text-align: center;
      padding: 2mm 3mm;
      line-height: 1.35;
      border-radius: 8px;
    }
    /* Company info — right-aligned, bold — matches PDF */
    .company-block {
      text-align: right;
      font-family: "Times New Roman", Times, serif;
      font-size: 13px;
      font-weight: bold;
      line-height: 1.6;
    }
    .date-line {
      text-align: right;
      font-family: "Times New Roman", Times, serif;
      font-size: 15px;
      margin-top: 1mm;
    }

    /* ── ORANGE TITLE BAR ── */
    .doc-title {
      background: ${ORANGE};
      color: #fff;
      font-family: "Times New Roman", Times, serif;
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      padding: 2.5mm 0;
      /* no margin-bottom — client strip sits flush below */
    }

    /* ── CLIENT STRIP — flush below title, no gap ── */
    .client-strip {
      display: grid;
      grid-template-columns: 1.15fr 1fr 0.8fr;
      background: ${PRIMARY};
      color: #fff;
      font-family: "Times New Roman", Times, serif;
      font-size: 15px;
      font-weight: bold;
    }
    .client-cell {
      padding: 1.5mm 2.5mm;
      border-right: 2.5px solid #fff;
      text-align: center;
    }
    .client-cell:last-child { border-right: none; }

    /* ── TABLE ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 3.5mm;
    }
    th {
      background: ${PRIMARY};
      color: #fff;
      font-family: "Times New Roman", Times, serif;
      font-size: 15px;
      font-weight: bold;
      text-align: center;
      padding: 1.5mm 2mm;
      border: 2.5px solid #fff;
    }
    .th-left  { text-align: left; }
    .th-right { text-align: right; }

    .td-cell {
      font-family: "Times New Roman", Times, serif;
      font-size: 14px;
      font-weight: normal;
      padding: 1.5mm 2mm;
      border: 2.5px solid #fff;
    }
    .td-left   { text-align: left; }
    .td-center { text-align: center; }
    .td-right  { text-align: right; }
    .td-bold   { font-weight: bold; }

    .total-row td {
      background: ${PRIMARY};
      color: #fff;
      font-family: "Times New Roman", Times, serif;
      font-size: 15px;
      font-weight: bold;
      padding: 1.5mm 2mm;
      border: 2.5px solid #fff;
      text-align: center;
    }
    .total-value { text-align: right; }

    /* ── AMOUNT IN WORDS ── */
    .words {
      margin-top: 4mm;
      font-family: "Times New Roman", Times, serif;
      font-size: 15px;
      font-weight: normal;
      line-height: 1.5;
      padding-left: 1mm;
    }
    .words strong { font-weight: bold; }

    /* ── BOTTOM SECTION ── */
    .bottom-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 6mm;
    }
    .garantie-col { flex: 1; }
    .garantie {
      font-family: "Times New Roman", Times, serif;
      font-size: 15px;
      font-weight: normal;
      line-height: 1.6;
    }
    /* GARANTIE label: red, underlined, own line — matches PDF */
    .garantie .label {
      color: red;
      text-decoration: underline;
      font-weight: normal;
      display: block;
      margin-bottom: 1mm;
      text-transform: uppercase;
    }
    /* Garantie body is bold — matches PDF */
    .garantie .body {
      font-weight: bold;
    }
    .signature-box {
      width: 50mm;
      text-align: center;
      font-family: "Times New Roman", Times, serif;
      font-size: 15px;
      font-weight: bold;
      text-transform: uppercase;
      flex-shrink: 0;
      margin-left: 6mm;
    }
    .signature-img {
      max-width: 42mm;
      max-height: 22mm;
      object-fit: contain;
      margin-top: 2mm;
      display: block;
      margin-left: auto;
      margin-right: auto;
    }

    /* ── BLUE FOOTER BAR — pinned at very bottom ── */
    .footer-bar {
      background: ${PRIMARY};
      color: #fff;
      font-family: "Times New Roman", Times, serif;
      font-size: 11px;
      font-weight: bold;
      text-align: center;
      padding: 2.5mm 4mm;
      margin-top: 8mm;
    }

    @media print {
      html, body {
        width: 210mm;
        height: 297mm;
        overflow: hidden;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- TOP: Logo (left) | Activity + Company info (right) -->
  <div class="top">
    <div class="logo-cell">
      ${getAssetSrc(shop, "logo")
        ? `<img src="${shop.logo_print_src || getAssetSrc(shop, "logo")}" alt="Logo" />`
        : '<div class="logo-placeholder"></div>'}
    </div>
    <div class="right-col">
      <div class="activity-box">${shopActivity}</div>
      <div class="company-block">
        <div>Situé à ${shopAddress}</div>
        <div>NIF : ${shopNif} – RCCM : ${shopRccm}</div>
        <div>COMPTE CORIS BANK : ${shopBank}</div>
        <div>${shopCity} - NIGER</div>
      </div>
      <div class="date-line">${city}, le ${dateStr}</div>
    </div>
  </div>

  <!-- ORANGE TITLE BAR -->
  <div class="doc-title">${title} ${invoiceNumber}</div>

  <!-- BLUE CLIENT STRIP — flush below title bar -->
  <div class="client-strip">
    <div class="client-cell">DOIT : ${clientName}</div>
    <div class="client-cell">ADRESSE : ${clientAddress}</div>
    <div class="client-cell">${clientPhone}</div>
  </div>

  <!-- ITEMS TABLE -->
  <table>
    <thead>
      <tr>
        <th class="th-left" style="width:40%">Désignation</th>
        <th                  style="width:10%">Quantité</th>
        <th                  style="width:9%">Unité</th>
        ${showPrices ? `
        <th class="th-right" style="width:20%">Prix Unitaire CFA</th>
        <th class="th-right" style="width:21%">Prix Total CFA</th>` : ""}
      </tr>
    </thead>
    <tbody>
      ${itemsHTML || `<tr><td class="td-cell td-left" style="background:${ROW_BG}" colspan="${colSpan}">Aucun article</td></tr>`}
    </tbody>
    ${showPrices ? `
    <tfoot>
      <tr class="total-row">
        <td colspan="${colSpan - 1}" style="text-align:center">MONTANT TOTAL</td>
        <td class="total-value">${fmtNum(printGrandTotal)}</td>
      </tr>
    </tfoot>` : ""}
  </table>

  ${showPrices ? `
  <div class="words">${
    amountToWordsFCFA(printGrandTotal, isProforma ? "proforma" : "facture")
      .replace(
        /(Arrêté la présente (?:facture|proforma) à la somme de )(.+)/i,
        "$1<strong>$2</strong>",
      )
  }</div>` : ""}

  <!-- BOTTOM SECTION: Garantie left + Signature right, bottom-aligned -->
  <div class="bottom-section">
    <div class="garantie-col">
      ${guaranteeText ? `
      <div class="garantie">
        <span class="label">GARANTIE</span>
        <div class="body">${guaranteeText}</div>
      </div>` : ""}
    </div>
    <div class="signature-box">
      SIGNATURE
      ${documentOptions.includeSignature && (shop?.signature_print_src || shop?.signature_url)
        ? `<br/><img class="signature-img" src="${shop.signature_print_src || shop.signature_url}" />`
        : ""}
      ${documentOptions.includeCachet && (shop?.cachet_print_src || shop?.cachet_url)
        ? `<br/><img class="signature-img" src="${shop.cachet_print_src || shop.cachet_url}" />`
        : ""}
    </div>
  </div>

</div>

<!-- BLUE FOOTER BAR — outside .page so it sits at the very bottom -->
<div class="footer-bar">
  Tél: ${shopPhone} &nbsp;|&nbsp; WhatsApp : ${shopWhatsapp} &nbsp;|&nbsp; Email : ${shopEmail}
</div>

</body>
</html>`;
}

// ─── Main render dispatcher ───────────────────────────────────────────────────
export function renderToInvoiceHTML({
  shop,
  invoiceNumber,
  formValues,
  items,
  grandTotal,
  type = "facture",
  guaranteeText = "",
  includeCachet = false,
  includeSignature = false,
  orientation = "landscape",
}) {
  const documentOptions = normalizeDocumentOptions(shop, {
    includeCachet,
    includeSignature,
    orientation,
  });

  const params = {
    shop,
    invoiceNumber,
    formValues,
    items,
    grandTotal,
    type,
    guaranteeText,
    documentOptions,
  };

  if (documentOptions.orientation === "portrait") {
    return renderPortraitHTML(params);
  }
  return renderLandscapeHTML(params);
}

// ─── Print helpers ────────────────────────────────────────────────────────────

export function printSaleDocument({
  shop,
  type,
  saleGroup,
  invoiceNumber,
  guaranteeText,
  includeCachet,
  includeSignature,
  orientation = "landscape",
}) {
  const firstItem =
    (saleGroup.items || []).find((s) => !s.is_charge) ||
    saleGroup.items?.[0] ||
    {};

  const formValues = {
    date: saleGroup.date,
    city: shop?.city || "",
    client_name:    saleGroup.client_name    || firstItem.client_name    || "",
    client_address: saleGroup.client_address || firstItem.client_address || "",
    client_phone:   saleGroup.client_phone   || firstItem.client_phone   || "",
    validity: "30 jours",
  };

  const items = (saleGroup.items || [])
    .filter((s) => !s.is_charge)
    .map((s) => ({
      id: s.id,
      is_charge: false,
      designation: s.product_name,
      quantity: s.quantity,
      unit: s.unit || "Pièces",
      unit_price: s.unit_sale_price || 0,
      total_price: s.total_sale || 0,
    }));

  const grandTotal = items.reduce((a, i) => a + i.total_price, 0);
  const num = invoiceNumber || `V-${saleGroup.date}`;

  const html = renderToInvoiceHTML({
    shop,
    invoiceNumber: num,
    formValues,
    items,
    grandTotal,
    type,
    includeCachet,
    includeSignature,
    guaranteeText,
    orientation,
  });

  printHtmlDocument(html, orientation);
}

export function printPurchaseDocument({
  shop,
  type,
  purchase,
  invoiceNumber,
  guaranteeText = "",
  includeCachet,
  includeSignature,
  orientation = "landscape",
}) {
  const formValues = {
    date: purchase.date,
    city: shop?.city || "",
    client_name:    purchase.supplier || "",
    client_address: "",
    client_phone:   "",
  };

  const items = [
    {
      id: purchase.id,
      is_charge: false,
      designation: purchase.product_name,
      quantity: purchase.quantity,
      unit: "Pièces",
      unit_price:  purchase.unit_price   || 0,
      total_price: purchase.total_amount || 0,
    },
  ];

  const grandTotal = purchase.total_amount || 0;
  const num = invoiceNumber || `ACH-${purchase.date}`;

  const html = renderToInvoiceHTML({
    shop,
    invoiceNumber: num,
    formValues,
    items,
    grandTotal,
    type,
    includeCachet,
    includeSignature,
    guaranteeText,
    orientation,
  });

  printHtmlDocument(html, orientation);
}