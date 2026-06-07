// lib/core/invoicePrint.js
// Renders a self-contained HTML string for printing via iframe.
// This avoids the "print screenshot of screen" problem entirely.

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

const PRINT_LAYOUT = {
  landscape: {
    pageSize: "A4 landscape",
    iframe: "width:297mm;height:210mm",
    pageWidth: "287.7mm",
    pageMinHeight: "209.5mm",
    topGrid: "70.54mm 112.18mm 87.66mm",
    logoW: "70.54mm",
    logoH: "39.18mm",
    activityW: "87.66mm",
    activityH: "22.82mm",
    bodyFont: "13px",
    tableFont: "20px",
  },
  portrait: {
    pageSize: "A4 portrait",
    iframe: "width:210mm;height:297mm",
    pageWidth: "200.7mm",
    pageMinHeight: "287mm",
    topGrid: "48mm 76mm 67mm",
    logoW: "48mm",
    logoH: "26.66mm",
    activityW: "67mm",
    activityH: "24mm",
    bodyFont: "12px",
    tableFont: "15px",
  },
};

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
  const layout = PRINT_LAYOUT[getOrientation({ orientation })];

  const iframe = document.createElement("iframe");
  iframe.style.cssText = `position:fixed;top:-9999px;left:-9999px;${layout.iframe};border:none;`;
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

/**
 * Renders a complete standalone HTML document for a facture or proforma.
 * Used for iframe-based printing (no browser chrome, no sidebar, just the doc).
 */
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
  const dateStr = formValues.date
    ? format(new Date(formValues.date), "dd MMMM yyyy", { locale: fr })
    : "—";

  const city = formValues.city || shop?.city || "Niamey";
  const documentOptions = normalizeDocumentOptions(shop, {
    includeCachet,
    includeSignature,
  });
  const layout = PRINT_LAYOUT[documentOptions.orientation];
  const primary = "#1D71B8";
  const orange = "#F29100";

  const isProforma = type === "proforma";
  const isBonLivraison = type === "bon_livraison";
  const isBonCommande = type === "bon_commande";

  let title = "FACTURE DE VENTE";
  if (isProforma) title = "FACTURE PROFORMA";
  if (isBonLivraison) title = "BON DE LIVRAISON";
  if (isBonCommande) title = "BON DE COMMANDE";

  const showPrices = !isBonLivraison && !isBonCommande;

  const itemsHTML = items
    .map(
      (item, i) => `
    <tr class="${i % 2 === 1 ? "alt" : ""}">
      <td class="td designation">${item.designation || item.product_name || "—"}</td>
      <td class="td center">${item.quantity || 0}</td>
      <td class="td center">${item.unit || "Pièces"}</td>
      ${
        showPrices
          ? `
            <td class="td right">${formatFCFA(item.unit_price || item.unit_sale_price || 0).replace(" FCFA", "")}</td>
            <td class="td right bold">${formatFCFA(item.total_price || item.total_sale || 0).replace(" FCFA", "")}</td>
          `
          : ""
      }
    </tr>
  `,
    )
    .join("");

  const colCount = showPrices ? 5 : 3;
  const totalColSpan = showPrices ? 4 : 2;

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title} ${invoiceNumber}</title>
  <style>
    @page {
      size: ${layout.pageSize};
      margin: 0.21mm 1.9mm 0.21mm 7.4mm;
    }

    body {
      margin: 0;
      padding: 0;
      background: white;
      color: #000;
      font-family: "Times New Roman", Times, serif;
      font-size: ${layout.bodyFont};
    }

    .page {
      width: ${layout.pageWidth};
      min-height: ${layout.pageMinHeight};
      box-sizing: border-box;
      position: relative;
    }

    .top {
      display: grid;
      grid-template-columns: ${layout.topGrid};
      column-gap: 6mm;
      align-items: start;
    }

    .logo {
      width: ${layout.logoW};
      height: ${layout.logoH};
      max-width: ${layout.logoW};
      max-height: ${layout.logoH};
      object-fit: contain;
    }

    .activity {
      width: ${layout.activityW};
      min-height: ${layout.activityH};
      background: #F29100;
      border-radius: 7mm;
      color: #fff;
      font-weight: bold;
      text-align: center;
      padding: 3mm;
      box-sizing: border-box;
      font-size: ${documentOptions.orientation === "portrait" ? "13px" : "18px"};
    }

    .doc-title {
      background: #F29100;
      color: white;
      font-size: ${documentOptions.orientation === "portrait" ? "18px" : "22px"};
      font-weight: bold;
      text-align: center;
      padding: 2mm 0;
    }

    td, th {
      font-size: ${layout.tableFont};
    }

    .company {
      text-align: left;
      font-size: 19px;
      font-weight: 700;
      line-height: 1.28;
    }

    .title-row {
      display: grid;
      grid-template-columns: 1fr 410px 1fr;
      align-items: center;
      margin-top: 8px;
    }

    .date {
      text-align: right;
      font-size: 14px;
      white-space: nowrap;
    }

    .client-strip {
      display: grid;
      grid-template-columns: 1.1fr 1fr 1fr;
      background: ${primary};
      color: white;
      font-weight: 800;
      border-top: 2px solid white;
    }

    .client-cell {
      padding: 1mm 2mm;
      border-right: 2px solid white;
      text-align: center;
      font-size: 22px;
    }

    .client-cell:last-child {
      border-right: 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8mm;
      font-size: 20px;
    }

    th {
      background: ${primary};
      color: white;
      padding: 1mm 2mm;
      font-size: 21px;
      border: 2px solid white;
      font-weight: 800;
    }

    .td {
      padding: 1mm 2mm;
      border: 2px solid white;
      background: #D9E2F3;
      font-size: 20px;
    }

    .total-row td {
      background: ${primary};
      color: white;
      font-weight: 800;
      padding: 1mm 2mm;
      border: 2px solid white;
      font-size: 21px;
    }

    .designation {
      width: 45%;
    }

    .center {
      text-align: center;
    }

    .right {
      text-align: right;
    }

    .bold {
      font-weight: 700;
    }

    tr.alt .td {
      background: #D9E2F3;
    }

    .words {
      margin-top: 8mm;
      font-size: 20px;
      line-height: 1.35;
    }

    .words strong {
      font-weight: 900;
    }

    .garantie {
      margin-top: 9mm;
      font-size: 20px;
      line-height: 1.35;
    }

    .garantie span {
      color: red;
      text-decoration: underline;
      font-weight: 900;
    }

    .signature {
      margin-top: 1mm;
      display: flex;
      justify-content: flex-end;
      padding-right: 10mm;
    }

    .signature-box {
      width: 48mm;
      text-align: center;
      font-weight: 900;
      font-size: 22px;
    }

    .signature-img {
      max-width: 42mm;
      max-height: 22mm;
      object-fit: contain;
      margin-top: 2mm;
    }

    .footer {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      display: grid;
      grid-template-columns: 1.25fr 0.9fr 0.9fr;
      background: ${primary};
      color: white;
      font-weight: 800;
      font-style: italic;
      font-size: 16px;
    }

    .footer div {
      padding: 5px 10px;
      text-align: center;
      border-right: 2px solid white;
    }

    .footer div:last-child {
      border-right: 0;
    }

    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="top">
      <div>
        ${getAssetSrc(shop, 'logo') ? `<img class="logo" src="${shop.logo_print_src || getAssetSrc(shop, 'logo')}" alt="Logo" />` : ''}
      </div>

      <div class="company">
        <div>Situé à ${shop?.address || "DAR ES SALAM derrière ESCAE"}</div>
        <div>Tél : ${shop?.phone || "+ 227 90 27 54 53 / 94 29 29 19"}</div>
        <div>Email : ${shop?.email || "elso.niger@gmail.com"}</div>
        <div>NIF: ${shop?.nif || "50873"} ${shop?.rccm ? `– RCCM : ${shop.rccm}` : "– RCCM : NE-NIA-2019-A-467"}</div>
        <div>${(shop?.city || "NIAMEY").toUpperCase()} - NIGER</div>
      </div>

      <div>
        <div class="activity">
          ${shop?.activity || "VENTE, INSTALLATION D’ÉQUIPEMENTS SOLAIRES, ENTRETIEN ET DÉPANNAGE"}
        </div>
        <div class="date">${city}, le ${dateStr}</div>
      </div>
    </div>

    <div class="doc-title">${title} ${invoiceNumber}</div>

    <div class="client-strip">
      <div class="client-cell">CLIENT : ${formValues.client_name || "—"}</div>
      <div class="client-cell">ADRESSE : ${formValues.client_address || "—"}</div>
      <div class="client-cell">Tél : ${formValues.client_phone || "—"}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="text-align:left">Désignation</th>
          <th>Quantité</th>
          <th>Unité</th>
          ${showPrices ? '<th style="text-align:right">Prix Unitaire</th><th style="text-align:right">Prix Total</th>' : ""}
        </tr>
      </thead>
      <tbody>
        ${itemsHTML || `<tr><td class="td" colspan="${colCount}">Aucun article</td></tr>`}
      </tbody>
      ${
        showPrices
          ? `
            <tfoot>
              <tr class="total-row">
                <td colspan="${totalColSpan}" class="right">MONTANT TOTAL</td>
                <td class="right">${formatFCFA(grandTotal).replace(" FCFA", "")}</td>
              </tr>
            </tfoot>
          `
          : ""
      }
    </table>

    ${
      showPrices
        ? `<div class="words">${amountToWordsFCFA(
            grandTotal,
            isProforma ? "proforma" : "facture",
          ).replace(
            /(Arrêté la présente (?:facture|proforma) à la somme de )(.+)/i,
            "$1<strong>$2</strong>",
          )}</div>`
        : ""
    }

    ${
      !guaranteeText
        ? ""
        : `
      <div class="garantie">
        <span>GARANTIE</span> : ${guaranteeText}
      </div>
    `
    }

    <div class="signature">
      <div class="signature-box">
        SIGNATURE
        ${documentOptions.includeSignature && (shop?.signature_print_src || shop?.signature_url)
          ? `<br/><img class="signature-img" src="${shop.signature_print_src || shop.signature_url}" />`
          : ''
        }

        ${documentOptions.includeCachet && (shop?.cachet_print_src || shop?.cachet_url)
          ? `<br/><img class="signature-img" src="${shop.cachet_print_src || shop.cachet_url}" />`
          : ''
        }
      </div>
    </div>

    <div class="footer">
      <div>Tél : ${shop?.phone || "(+227) 90 27 54 53 / 94 29 29 19"}</div>
      <div>WhatsApp : ${shop?.whatsapp || "+227 94 29 29 19"}</div>
      <div>Email : ${shop?.email || "elso.niger@gmail.com"}</div>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Opens a print dialog for a sale, showing the appropriate document type.
 * @param {object} params
 * @param {object} params.shop
 * @param {string} params.type - 'facture' | 'proforma' | 'bon_livraison' | 'bon_commande'
 * @param {object} params.saleGroup - { date, client_name, items: [{product_name, quantity, unit_sale_price, total_sale}] }
 * @param {string} params.invoiceNumber - optional
 */
export function printSaleDocument({
  shop,
  type,
  saleGroup,
  invoiceNumber,
  guaranteeText,
  includeCachet,
  includeSignature,
}) {
  const formValues = {
    date: saleGroup.date,
    city: shop?.city || "",
    client_name: saleGroup.client_name || "",
    client_address: "",
    client_phone: "",
    validity: "30 jours",
  };

  const items = saleGroup.items.map((s) => ({
    id: s.id,
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
  });

  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:297mm;height:210mm;border:none;";
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

/**
 * Opens a print dialog for a purchase (bon de commande).
 */
export function printPurchaseDocument({
  shop,
  type,
  purchase,
  invoiceNumber,
  guaranteeText = "",
  includeCachet,
  includeSignature,
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
  });

  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;";
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
