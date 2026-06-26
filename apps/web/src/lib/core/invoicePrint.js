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
  saleGroups, // array of group objects (same shape as saleGroup)
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

  // Use the earliest date among the merged sales for the document date
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

  // Flatten every non-charge line item from every selected sale group
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

// ─── Multi-purchase (combined invoice across several purchase entries, same supplier) ──
export function printPurchaseDocumentMulti({
  shop,
  type,
  purchases, // array of purchase row objects
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

// ─── LANDSCAPE LAYOUT ────────────────────────────────────────────────────────
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

  const primary = "#1D71B8";
  const orange = "#F29100";
  const rowBg = "#D9E1F2";

  const isProforma = type === "proforma";
  const isBonLivraison = type === "bon_livraison";
  const isBonCommande = type === "bon_commande";

  let title = "FACTURE DE VENTE";
  if (isProforma) title = "FACTURE PROFORMA";
  if (isBonLivraison) title = "BON DE LIVRAISON";
  if (isBonCommande) title = "BON DE COMMANDE";

  const showPrices = !isBonLivraison && !isBonCommande;

  const printItems = items.filter((item) => !item.is_charge);

  const itemsHTML = printItems
    .map(
      (item, i) => `
    <tr>
      <td class="td-cell td-left" style="background:${i % 2 === 0 ? rowBg : "#fff"}">${item.designation || item.product_name || "—"}</td>
      <td class="td-cell td-center" style="background:${i % 2 === 0 ? rowBg : "#fff"}">${item.quantity || 0}</td>
      <td class="td-cell td-center" style="background:${i % 2 === 0 ? rowBg : "#fff"}">${item.unit || "Pièces"}</td>
      ${
        showPrices
          ? `<td class="td-cell td-right" style="background:${i % 2 === 0 ? rowBg : "#fff"}">${formatFCFA(item.unit_price || item.unit_sale_price || 0).replace(" FCFA", "")}</td>
           <td class="td-cell td-right td-bold" style="background:${i % 2 === 0 ? rowBg : "#fff"}">${formatFCFA(item.total_price || item.total_sale || 0).replace(" FCFA", "")}</td>`
          : ""
      }
    </tr>`,
    )
    .join("");

  const printGrandTotal = printItems.reduce(
    (sum, item) => sum + Number(item.total_price || item.total_sale || 0),
    0,
  );

  const clientName = formValues.client_name || "—";
  const clientAddress = formValues.client_address || "—";
  const clientPhone = formValues.client_phone || "—";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title} ${invoiceNumber}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 4mm 6mm 4mm 6mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: white;
      color: #000;
      font-family: "Times New Roman", Times, serif;
      font-size: 13px;
    }
    .page { width: 285mm; }

    .top {
      display: grid;
      grid-template-columns: 72mm 110mm 1fr;
      gap: 5mm;
      align-items: start;
      margin-bottom: 3mm;
    }
    .logo-cell img {
      max-width: 70mm;
      max-height: 38mm;
      object-fit: contain;
      display: block;
    }
    .logo-placeholder { width: 70mm; height: 38mm; }
    .company-info {
      font-size: 13px;
      line-height: 1.5;
      font-weight: 700;
      padding-top: 2mm;
    }
    .right-col {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2mm;
    }
    .activity-box {
      background: ${orange};
      color: #fff;
      font-weight: bold;
      font-size: 12px;
      text-align: center;
      border-radius: 4mm;
      padding: 2.5mm 3mm;
      max-width: 52mm;
      line-height: 1.35;
    }
    .date-line {
      text-align: right;
      font-size: 13px;
      font-weight: normal;
      white-space: nowrap;
      width: 100%;
    }

    .doc-title {
      background: ${orange};
      color: #fff;
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      padding: 2.5mm 0;
    }

    .title-spacer {
      height: 3mm;
      background: white;
    }

    .client-strip {
      display: grid;
      grid-template-columns: 1.1fr 1fr 1fr;
      background: ${primary};
      color: #fff;
      font-weight: 800;
      margin-bottom: 0;
    }
    .client-cell {
      padding: 1.5mm 3mm;
      border-right: 2px solid #fff;
      text-align: center;
      font-size: 14px;
    }
    .client-cell:last-child { border-right: 0; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4mm;
    }
    th {
      background: ${primary};
      color: #fff;
      padding: 1.5mm 2mm;
      font-size: 14px;
      border: 2px solid #fff;
      font-weight: 800;
    }
    .th-left  { text-align: left; }
    .th-center { text-align: center; }
    .th-right { text-align: right; }
    .td-cell {
      padding: 1.5mm 2mm;
      border: 2px solid #fff;
      font-size: 13px;
    }
    .td-left   { text-align: left; }
    .td-center { text-align: center; }
    .td-right  { text-align: right; }
    .td-bold   { font-weight: 700; }
    .total-row td {
      background: ${primary};
      color: #fff;
      font-weight: 800;
      padding: 1.5mm 2mm;
      border: 2px solid #fff;
      font-size: 14px;
    }
    .total-label { text-align: center; }
    .total-value { text-align: right; }

    .words {
      margin-top: 5mm;
      font-size: 14px;
      line-height: 1.4;
    }
    .words strong { font-weight: 900; }

    .garantie {
      margin-top: 4mm;
      font-size: 13px;
      line-height: 1.4;
    }
    .garantie .label {
      color: red;
      text-decoration: underline;
      font-weight: 900;
    }

    .signature-wrap {
      margin-top: 4mm;
      display: flex;
      justify-content: flex-end;
    }
    .signature-box {
      width: 52mm;
      text-align: center;
      font-size: 15px;
      font-weight: 900;
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
<div class="page">

  <div class="top">
    <div class="logo-cell">
      ${
        getAssetSrc(shop, "logo")
          ? `<img src="${shop.logo_print_src || getAssetSrc(shop, "logo")}" alt="Logo" />`
          : '<div class="logo-placeholder"></div>'
      }
    </div>
    <div class="company-info">
      <div>${shop?.name || ""}</div>
      <div>Situé à ${shop?.address || "DAR ES SALAM derrière ESCAE"}</div>
      <div>Tél : ${shop?.phone || "+ 227 90 27 54 53 / 94 29 29 19"}</div>
      <div>Email : ${shop?.email || "elso.niger@gmail.com"}</div>
      <div>NIF : ${shop?.nif || "50873"}${shop?.rccm ? ` – RCCM : ${shop.rccm}` : " – RCCM : NE-NIA-2019-A-467"}</div>
      <div>${(shop?.city || "NIAMEY").toUpperCase()} - NIGER</div>
    </div>
    <div class="right-col">
      <div class="activity-box">
        ${shop?.activity || "VENTE, INSTALLATION D'ÉQUIPEMENTS SOLAIRES, ENTRETIEN ET DÉPANNAGE"}
      </div>
      <div class="date-line">${city}, le ${dateStr}</div>
    </div>
  </div>

  <div class="doc-title">${title} ${invoiceNumber}</div>
  <div class="title-spacer"></div>

  <div class="client-strip">
    <div class="client-cell">CLIENT : ${clientName}</div>
    <div class="client-cell">ADRESSE : ${clientAddress}</div>
    <div class="client-cell">Tél : ${clientPhone}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="th-left" style="width:45%">Désignation</th>
        <th class="th-center" style="width:10%">Quantité</th>
        <th class="th-center" style="width:10%">Unité</th>
        ${
          showPrices
            ? `<th class="th-right" style="width:17%">Prix Unitaire CFA</th>
             <th class="th-right" style="width:18%">Prix Total CFA</th>`
            : ""
        }
      </tr>
    </thead>
    <tbody>
      ${itemsHTML || `<tr><td class="td-cell td-left" style="background:${rowBg}" colspan="${showPrices ? 5 : 3}">Aucun article</td></tr>`}
    </tbody>
    ${
      showPrices
        ? `<tfoot>
           <tr class="total-row">
             <td colspan="4" class="total-label">MONTANT TOTAL</td>
             <td class="total-value">${formatFCFA(printGrandTotal).replace(" FCFA", "")}</td>
           </tr>
         </tfoot>`
        : ""
    }
  </table>

  ${
    showPrices
      ? `<div class="words">${amountToWordsFCFA(
          printGrandTotal,
          isProforma ? "proforma" : "facture",
        ).replace(
          /(Arrêté la présente (?:facture|proforma) à la somme de )(.+)/i,
          "$1<strong>$2</strong>",
        )}</div>`
      : ""
  }

  ${
    guaranteeText
      ? `<div class="garantie"><span class="label">GARANTIE</span> : ${guaranteeText}</div>`
      : ""
  }

  <div class="signature-wrap">
    <div class="signature-box">
      SIGNATURE
      ${
        documentOptions.includeSignature &&
        (shop?.signature_print_src || shop?.signature_url)
          ? `<br/><img class="signature-img" src="${shop.signature_print_src || shop.signature_url}" />`
          : ""
      }
      ${
        documentOptions.includeCachet &&
        (shop?.cachet_print_src || shop?.cachet_url)
          ? `<br/><img class="signature-img" src="${shop.cachet_print_src || shop.cachet_url}" />`
          : ""
      }
    </div>
  </div>

</div>
</body>
</html>`;
}

// ─── PORTRAIT LAYOUT ─────────────────────────────────────────────────────────
// Matches Portrait_facture.pdf exactly:
//   Top-left:  Logo
//   Top-right: Orange activity box (full-width of right col, no border-radius)
//              Company block centered (address / NIF / RCCM / BANK / CITY) — no shop name
//              Date right-aligned below
//   Orange title bar — no spacer between it and client strip
//   Blue client strip: DOIT / ADRESSE / bare phone number
//   Table: blue headers, alternating white/#D9E1F2 rows, blue total row
//   Amount in words
//   Bottom: GARANTIE label (red underline, own line) + bold body — left col
//           SIGNATURE — right col, bottom-aligned
//   Blue footer bar: Tél ; WhatsApp ; Email
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

  const primary = "#1D71B8";
  const orange = "#F29100";
  const rowBg = "#D9E1F2";

  const isProforma = type === "proforma";
  const isBonLivraison = type === "bon_livraison";
  const isBonCommande = type === "bon_commande";

  let title = "FACTURE DE VENTE";
  if (isProforma) title = "FACTURE PROFORMA";
  if (isBonLivraison) title = "BON DE LIVRAISON";
  if (isBonCommande) title = "BON DE COMMANDE";

  const showPrices = !isBonLivraison && !isBonCommande;

  const printItems = items.filter((item) => !item.is_charge);

  // Alternating rows: even index = rowBg (#D9E1F2), odd = white — matching the PDF
  const itemsHTML = printItems
    .map((item, i) => {
      const bg = i % 2 === 0 ? rowBg : "#ffffff";
      return `
    <tr>
      <td class="td-cell td-left" style="background:${bg}">${item.designation || item.product_name || "—"}</td>
      <td class="td-cell td-center" style="background:${bg}">${item.quantity || 0}</td>
      <td class="td-cell td-center" style="background:${bg}">${item.unit || "Pièce"}</td>
      ${
        showPrices
          ? `<td class="td-cell td-right" style="background:${bg}">${formatFCFA(item.unit_price || item.unit_sale_price || 0).replace(" FCFA", "")}</td>
           <td class="td-cell td-right td-bold" style="background:${bg}">${formatFCFA(item.total_price || item.total_sale || 0).replace(" FCFA", "")}</td>`
          : ""
      }
    </tr>`;
    })
    .join("");

  const printGrandTotal = printItems.reduce(
    (sum, item) => sum + Number(item.total_price || item.total_sale || 0),
    0,
  );

  const clientName = formValues.client_name || "—";
  const clientAddress = formValues.client_address || "—";
  const clientPhone = formValues.client_phone || "—";

  const shopPhone = shop?.phone || "(+227) 90 27 54 53 / 94 29 29 19";
  const shopWhatsapp = shop?.whatsapp || shop?.phone || "+227 94 29 29 19";
  const shopEmail = shop?.email || "elso.niger@gmail.com";

  const shopActivity =
    shop?.activity || "VENTE ET INSTALLATION D'EQUIPEMENTS SOLAIRES";
  const shopAddress = shop?.address || "DAR ES SALAM derrière ESCAE";
  const shopNif = shop?.nif || "50873/P";
  const shopRccm = shop?.rccm || "NE-NIA-2019-A-467";
  const shopBank = shop?.bank_account || "02134924401-79";
  const shopCity = (shop?.city || "NIAMEY").toUpperCase();

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
      font-size: 12px;
      display: flex;
      flex-direction: column;
      min-height: 285mm;
      margin: 0;
      width: 210mm;
    }
    .page {
      flex: 1;
      width: 194mm;
      marging: 0 auto;
    }

    /* ── TOP HEADER ── */
    .top {
      display: grid;
      grid-template-columns: 50mm 1fr;
      gap: 4mm;
      align-items: start;
      margin-bottom: 3mm;
    }
    .logo-cell img {
      max-width: 48mm;
      max-height: 36mm;
      object-fit: contain;
      display: block;
    }
    .logo-placeholder { width: 48mm; height: 36mm; }

    /* Right column: activity box top, company block centered below, date right */
    .right-col {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 1.5mm;
    }
    /* Orange activity box — full width of right col, no border-radius, matching PDF */
    .activity-box {
      background: ${orange};
      color: #fff;
      font-weight: bold;
      font-size: 11px;
      text-align: center;
      padding: 2mm 4mm;
      line-height: 1.3;
    }
    /* Company info block — centered, bold, no shop name (logo carries the brand) */
    .company-block {
      text-align: center;
      font-weight: 700;
      font-size: 12px;
      line-height: 1.6;
      width: 100%;
    }
    .date-line {
      text-align: right;
      font-size: 12px;
      width: 100%;
      margin-top: 1mm;
    }

    /* ── ORANGE TITLE BAR ── */
    .doc-title {
      background: ${orange};
      color: #fff;
      font-size: 15px;
      font-weight: bold;
      text-align: center;
      padding: 2.5mm 0;
      margin-top: 3mm;
      /* No margin-bottom — client strip is directly below, matching PDF */
    }

    /* ── CLIENT STRIP — directly below title bar, no gap ── */
    .client-strip {
      display: grid;
      grid-template-columns: 1.1fr 1fr 0.8fr;
      background: ${primary};
      color: #fff;
      font-weight: 800;
    }
    .client-cell {
      padding: 1.5mm 2.5mm;
      border-right: 2px solid #fff;
      text-align: center;
      font-size: 13px;
    }
    .client-cell:last-child { border-right: 0; }

    /* ── TABLE ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 3.5mm;
    }
    th {
      background: ${primary};
      color: #fff;
      padding: 1.5mm 2mm;
      font-size: 13px;
      border: 2px solid #fff;
      font-weight: 800;
    }
    .th-left   { text-align: left; }
    .th-center { text-align: center; }
    .th-right  { text-align: right; }
    .td-cell {
      padding: 1.5mm 2mm;
      border: 2px solid #fff;
      font-size: 12px;
      /* background set inline per row for alternating effect */
    }
    .td-left   { text-align: left; }
    .td-center { text-align: center; }
    .td-right  { text-align: right; }
    .td-bold   { font-weight: 700; }
    .total-row td {
      background: ${primary};
      color: #fff;
      font-weight: 800;
      padding: 1.5mm 2mm;
      border: 2px solid #fff;
      font-size: 13px;
    }
    .total-label { text-align: center; }
    .total-value { text-align: right; }

    /* ── AMOUNT IN WORDS ── */
    .words {
      margin-top: 4mm;
      font-size: 12px;
      line-height: 1.5;
      padding-left: 1mm;
    }
    .words strong { font-weight: 900; }

    /* ── BOTTOM SECTION: garantie left + signature right, bottom-aligned ── */
    .bottom-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 5mm;
    }
    .garantie-col { flex: 1; }
    .garantie {
      font-size: 12px;
      line-height: 1.5;
    }
    /* GARANTIE label: red, underlined, on its own line — matching PDF */
    .garantie .label {
      color: red;
      text-decoration: underline;
      font-weight: 900;
      display: block;
      margin-bottom: 1mm;
    }
    /* Guarantee body text is bold — matching PDF */
    .garantie .body {
      font-weight: 700;
    }
    .signature-box {
      width: 48mm;
      text-align: center;
      font-size: 14px;
      font-weight: 900;
      flex-shrink: 0;
      margin-left: 6mm;
    }
    .signature-img {
      max-width: 40mm;
      max-height: 22mm;
      object-fit: contain;
      margin-top: 2mm;
      display: block;
      margin-left: auto;
      margin-right: auto;
    }

    /* ── BLUE FOOTER BAR — pinned at very bottom ── */
    .footer-bar {
      background: ${primary};
      color: #fff;
      font-weight: 700;
      font-size: 11px;
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

  <!-- TOP: Logo (left) | Activity box + Company info (right) -->
  <div class="top">
    <div class="logo-cell">
      ${
        getAssetSrc(shop, "logo")
          ? `<img src="${shop.logo_print_src || getAssetSrc(shop, "logo")}" alt="Logo" />`
          : '<div class="logo-placeholder"></div>'
      }
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

  <!-- BLUE CLIENT STRIP: directly below title, no spacer — DOIT / ADRESSE / bare phone -->
  <div class="client-strip">
    <div class="client-cell">DOIT : ${clientName}</div>
    <div class="client-cell">ADRESSE : ${clientAddress}</div>
    <div class="client-cell">${clientPhone}</div>
  </div>

  <!-- ITEMS TABLE -->
  <table>
    <thead>
      <tr>
        <th class="th-left" style="width:42%">Désignation</th>
        <th class="th-center" style="width:10%">Quantité</th>
        <th class="th-center" style="width:9%">Unité</th>
        ${
          showPrices
            ? `<th class="th-right" style="width:19%">Prix Unitaire CFA</th>
             <th class="th-right" style="width:20%">Prix Total CFA</th>`
            : ""
        }
      </tr>
    </thead>
    <tbody>
      ${itemsHTML || `<tr><td class="td-cell td-left" style="background:${rowBg}" colspan="${showPrices ? 5 : 3}">Aucun article</td></tr>`}
    </tbody>
    ${
      showPrices
        ? `<tfoot>
           <tr class="total-row">
             <td colspan="4" class="total-label">MONTANT TOTAL</td>
             <td class="total-value">${formatFCFA(printGrandTotal).replace(" FCFA", "")}</td>
           </tr>
         </tfoot>`
        : ""
    }
  </table>

  ${
    showPrices
      ? `<div class="words">${amountToWordsFCFA(
          printGrandTotal,
          isProforma ? "proforma" : "facture",
        ).replace(
          /(Arrêté la présente (?:facture|proforma) à la somme de )(.+)/i,
          "$1<strong>$2</strong>",
        )}</div>`
      : ""
  }

  <!-- BOTTOM SECTION: Garantie left + Signature right, bottom-aligned -->
  <div class="bottom-section">
    <div class="garantie-col">
      ${
        guaranteeText
          ? `<div class="garantie">
             <span class="label">GARANTIE</span>
             <div class="body">${guaranteeText}</div>
           </div>`
          : ""
      }
    </div>
    <div class="signature-box">
      SIGNATURE
      ${
        documentOptions.includeSignature &&
        (shop?.signature_print_src || shop?.signature_url)
          ? `<br/><img class="signature-img" src="${shop.signature_print_src || shop.signature_url}" />`
          : ""
      }
      ${
        documentOptions.includeCachet &&
        (shop?.cachet_print_src || shop?.cachet_url)
          ? `<br/><img class="signature-img" src="${shop.cachet_print_src || shop.cachet_url}" />`
          : ""
      }
    </div>
  </div>

</div>

<!-- BLUE FOOTER BAR — outside .page so it stays at the very bottom -->
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
    client_name: saleGroup.client_name || firstItem.client_name || "",
    client_address: saleGroup.client_address || firstItem.client_address || "",
    client_phone: saleGroup.client_phone || firstItem.client_phone || "",
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

  const isPortrait = orientation === "portrait";
  const iframe = document.createElement("iframe");
  iframe.style.cssText = isPortrait
    ? "position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;"
    : "position:fixed;top:-9999px;left:-9999px;width:297mm;height:210mm;border:none;";

  document.body.appendChild(iframe);
  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1500);
    }, 300);
  };
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
    client_name: purchase.supplier || "",
    client_address: "",
    client_phone: "",
  };

  const items = [
    {
      id: purchase.id,
      is_charge: false,
      designation: purchase.product_name,
      quantity: purchase.quantity,
      unit: "Pièces",
      unit_price: purchase.unit_price || 0,
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

  const isPortrait = orientation === "portrait";
  const iframe = document.createElement("iframe");
  iframe.style.cssText = isPortrait
    ? "position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;"
    : "position:fixed;top:-9999px;left:-9999px;width:297mm;height:210mm;border:none;";

  document.body.appendChild(iframe);
  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1500);
    }, 300);
  };
}
