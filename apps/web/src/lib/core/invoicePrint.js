// lib/core/invoicePrint.js
// Renders a self-contained HTML string for printing via iframe.
// This avoids the "print screenshot of screen" problem entirely.

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatFCFA, amountToWordsFCFA } from "./calculations";

function askIncludeStamp(shop) {
  if (typeof window === "undefined") return true;

  const hasStamp = !!shop?.signature_url || !!shop?.cachet_url;

  if (!hasStamp) return false;

  return window.confirm(
    "Voulez-vous générer ce document avec cachet/signature ?\n\nOK = Avec cachet/signature\nAnnuler = Sans cachet/signature",
  );
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
  includeStamp = true,
}) {
  const dateStr = formValues.date
    ? format(new Date(formValues.date), "dd MMMM yyyy", { locale: fr })
    : "—";

  const city = formValues.city || shop?.city || "Niamey";
  const primary = "#1F4E79";
  const orange = "#F39A21";

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
      size: A4;
      margin: 10mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: white;
      font-family: Arial, Helvetica, sans-serif;
      color: #111827;
      font-size: 13px;
    }

    .page {
      width: 100%;
      min-height: 277mm;
      padding: 0;
      position: relative;
    }

    .top {
      display: grid;
      grid-template-columns: 1fr 380px;
      align-items: start;
      min-height: 88px;
    }

    .logo {
      max-width: 115px;
      max-height: 82px;
      object-fit: contain;
    }

    .activity {
      background: ${orange};
      color: white;
      font-weight: 800;
      text-align: center;
      padding: 8px 10px;
      border-radius: 4px;
      font-size: 13px;
      text-transform: uppercase;
    }

    .company {
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.35;
      margin-top: 8px;
    }

    .title-row {
      display: grid;
      grid-template-columns: 1fr 410px 1fr;
      align-items: center;
      margin-top: 8px;
    }

    .doc-title {
      grid-column: 2;
      background: ${primary};
      color: white;
      text-align: center;
      font-weight: 800;
      font-size: 16px;
      padding: 4px 8px;
    }

    .date {
      text-align: right;
      font-size: 14px;
      white-space: nowrap;
    }

    .client-strip {
      display: grid;
      grid-template-columns: 1.1fr 1.25fr 1fr;
      background: ${primary};
      color: white;
      font-weight: 800;
      margin-top: 20px;
      border: 1px solid ${primary};
    }

    .client-cell {
      padding: 5px 10px;
      border-right: 2px solid white;
      text-align: center;
      font-size: 15px;
    }

    .client-cell:last-child {
      border-right: 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 22px;
      font-size: 14px;
    }

    th {
      background: ${primary};
      color: white;
      padding: 5px 6px;
      font-size: 14px;
      border: 2px solid white;
      font-weight: 800;
    }

    .td {
      padding: 4px 6px;
      border-left: 2px solid white;
      border-right: 2px solid white;
      font-size: 13px;
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

    .total-row td {
      background: ${primary};
      color: white;
      font-weight: 800;
      padding: 5px 6px;
      border: 2px solid white;
      font-size: 14px;
    }

    .words {
      margin-top: 26px;
      font-size: 14px;
      line-height: 1.35;
    }

    .words strong {
      font-weight: 800;
    }

    .garantie {
      margin-top: 26px;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.35;
    }

    .garantie span {
      color: red;
      text-decoration: underline;
      font-weight: 900;
    }

    .signature {
      margin-top: 26px;
      display: flex;
      justify-content: flex-end;
      min-height: 120px;
      padding-right: 20px;
    }

    .signature-box {
      width: 180px;
      text-align: left;
      font-weight: 700;
      font-size: 14px;
    }

    .signature-img {
      max-width: 150px;
      max-height: 70px;
      object-fit: contain;
      margin-top: 8px;
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
        ${shop?.logo_url ? `<img class="logo" src="${shop.logo_url}" alt="Logo" />` : ""}
      </div>

      <div>
        <div class="activity">
          ${shop?.activity || "VENTE ET INSTALLATION D’ÉQUIPEMENTS SOLAIRES"}
        </div>
        <div class="company">
          <div>Situé à DAR ES SALAM derrière ESCAE</div>
          <div>NIF : ${shop?.nif || "—"} ${shop?.rccm ? `– RCCM : ${shop.rccm}` : ""}</div>
          ${shop?.bank_account ? `<div>COMPTE CORIS BANK : ${shop.bank_account}</div>` : ""}
          <div>${(shop?.city || "NIAMEY").toUpperCase()} - NIGER</div>
        </div>
      </div>
    </div>

    <div class="title-row">
      <div></div>
      <div class="doc-title">${title} N°${invoiceNumber}</div>
      <div class="date">${city}, le ${dateStr}</div>
    </div>

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
        ? `<div class="words">Arrêté la présente ${isProforma ? "proforma" : "facture"} à la somme de <strong>${amountToWordsFCFA(
            grandTotal,
          )
            .replace(/^Arrêté.*?somme de /i, "")
            .replace(" FCFA", " francs CFA")}</strong></div>`
        : ""
    }

    ${
      isBonCommande || isBonLivraison
        ? ""
        : `
          <div class="garantie">
            <span>GARANTIE</span> : Cinq (05) ans sur la batterie et un (01) an sur l’onduleur si l’installation a été faite dans les normes et ne prend en charge qu’une consommation correspondante à la capacité des équipements concernés. En cas de problème la garantie consistera à réparer les d’abord et les remplacer s’ils sont irréparables.
          </div>
        `
    }

    <div class="signature">
      <div class="signature-box">
        SIGNATURE
        ${includeStamp && shop?.signature_url ? `<br/><img class="signature-img" src="${shop.signature_url}" />` : ""}
${includeStamp && shop?.cachet_url ? `<br/><img class="signature-img" src="${shop.cachet_url}" />` : ""}
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
export function printSaleDocument({ shop, type, saleGroup, invoiceNumber }) {
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
  const num = invoiceNumber || `VTE-${saleGroup.date}`;

  const html = renderToInvoiceHTML({
    shop,
    invoiceNumber: num,
    formValues,
    items,
    grandTotal,
    type,
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

/**
 * Opens a print dialog for a purchase (bon de commande).
 */
export function printPurchaseDocument({ shop, type, purchase, invoiceNumber }) {
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
