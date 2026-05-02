// lib/core/invoicePrint.js
// Renders a self-contained HTML string for printing via iframe.
// This avoids the "print screenshot of screen" problem entirely.

import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { formatFCFA, amountToWordsFCFA } from './calculations'

/**
 * Renders a complete standalone HTML document for a facture or proforma.
 * Used for iframe-based printing (no browser chrome, no sidebar, just the doc).
 */
export function renderToInvoiceHTML({ shop, invoiceNumber, formValues, items, grandTotal, type = 'facture' }) {
  const dateStr = formValues.date
    ? format(new Date(formValues.date), 'dd MMMM yyyy', { locale: fr })
    : '—'
  const city = formValues.city || shop?.city || 'Niamey'
  const primary = shop?.color_primary || '#1a56db'
  const isProforma = type === 'proforma'
  const isBonLivraison = type === 'bon_livraison'
  const isBonCommande = type === 'bon_commande'

  let title = 'FACTURE DE VENTE'
  if (isProforma) title = 'FACTURE PROFORMA'
  if (isBonLivraison) title = 'BON DE LIVRAISON'
  if (isBonCommande) title = 'BON DE COMMANDE'

  const itemsHTML = items.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'}">
      <td style="padding:8px 12px">${item.designation || '—'}</td>
      <td style="padding:8px 12px;text-align:center">${item.quantity}</td>
      <td style="padding:8px 12px;text-align:center">${item.unit || 'Pièces'}</td>
      ${!isBonLivraison && !isBonCommande ? `
      <td style="padding:8px 12px;text-align:right">${formatFCFA(item.unit_price)}</td>
      <td style="padding:8px 12px;text-align:right;font-weight:600">${formatFCFA(item.total_price)}</td>
      ` : ''}
    </tr>
  `).join('')

  const clientBlock = (formValues.client_name || formValues.client_address || formValues.client_phone)
    ? `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin-bottom:24px;display:flex;gap:24px;flex-wrap:wrap">
        ${formValues.client_name ? `<div><span style="color:#6b7280">${isProforma || isBonLivraison ? 'DESTINATAIRE' : 'CLIENT'} : </span><strong>${formValues.client_name}</strong></div>` : ''}
        ${formValues.client_address ? `<div><span style="color:#6b7280">ADRESSE : </span>${formValues.client_address}</div>` : ''}
        ${formValues.client_phone ? `<div><span style="color:#6b7280">Tél : </span>${formValues.client_phone}</div>` : ''}
      </div>`
    : ''

  const priceColumns = (!isBonLivraison && !isBonCommande) ? `
    <th style="padding:8px 12px;text-align:right;width:120px">Prix Unitaire</th>
    <th style="padding:8px 12px;text-align:right;width:120px">Prix Total</th>
  ` : ''

  const totalsRow = (!isBonLivraison && !isBonCommande) ? `
    <tfoot>
      <tr style="background:${primary};color:white">
        <td colspan="3" style="padding:8px 12px;font-weight:700;text-align:right">MONTANT TOTAL</td>
        <td style="padding:8px 12px;font-weight:700;text-align:right">${formatFCFA(grandTotal)}</td>
      </tr>
    </tfoot>
  ` : ''

  const amountWords = (!isBonLivraison && !isBonCommande)
    ? `<p style="color:#4b5563;font-style:italic;margin-bottom:32px">${amountToWordsFCFA(grandTotal)}</p>`
    : ''

  const proformaWarning = isProforma
    ? `<div style="border:1px solid #fde68a;background:#fffbeb;border-radius:8px;padding:12px;margin-bottom:24px;color:#b45309;font-size:13px">
        ⚠ Ce document est un devis / proforma et ne constitue pas une facture définitive.
      </div>`
    : ''

  const validityNote = (isProforma && formValues.validity)
    ? `<p style="color:#6b7280;font-size:12px;margin-top:4px">Validité : ${formValues.validity}</p>`
    : ''

  const signatureBlock = (shop?.signature_url || shop?.cachet_url)
    ? `<div style="text-align:right;margin-top:48px">
        <p style="color:#4b5563;margin-bottom:8px">Signature</p>
        ${shop.signature_url ? `<img src="${shop.signature_url}" alt="Signature" style="height:56px;object-fit:contain;display:block;margin-left:auto" />` : ''}
        ${shop.cachet_url ? `<img src="${shop.cachet_url}" alt="Cachet" style="height:56px;object-fit:contain;display:block;margin-left:auto;margin-top:8px" />` : ''}
      </div>`
    : `<div style="margin-top:48px;text-align:right">
        <p style="color:#4b5563">Signature</p>
        <div style="height:56px"></div>
      </div>`

  const footer = [
    shop?.phone && `Tél : ${shop.phone}`,
    shop?.whatsapp && `WhatsApp : ${shop.whatsapp}`,
    shop?.email && `Email : ${shop.email}`,
  ].filter(Boolean).join('   ·   ')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${title} N°${invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      color: #111827;
      background: white;
      padding: 20mm 15mm;
    }
    table { border-collapse: collapse; width: 100%; }
    @media print {
      body { padding: 10mm 12mm; }
      @page { margin: 10mm; size: A4; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">
    <div style="display:flex;align-items:flex-start;gap:16px">
      ${shop?.logo_url ? `<img src="${shop.logo_url}" alt="Logo" style="width:64px;height:64px;object-fit:contain" />` : ''}
      <div>
        <h2 style="font-size:18px;font-weight:700;color:${primary};margin-bottom:4px">${shop?.name || ''}</h2>
        ${shop?.address ? `<p style="color:#6b7280;font-size:12px">${shop.address}</p>` : ''}
        ${shop?.city ? `<p style="color:#6b7280;font-size:12px">${shop.city}</p>` : ''}
        ${shop?.nif ? `<p style="color:#6b7280;font-size:12px">NIF: ${shop.nif}</p>` : ''}
      </div>
    </div>
    <div style="text-align:right">
      <p style="color:#6b7280;font-size:12px">${city}, le ${dateStr}</p>
      ${validityNote}
    </div>
  </div>

  <!-- Title -->
  <div style="text-align:center;margin-bottom:24px">
    <h1 style="font-size:18px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${primary}">
      ${title} N°${invoiceNumber}
    </h1>
  </div>

  <!-- Client -->
  ${clientBlock}

  <!-- Items table -->
  <table style="margin-bottom:16px">
    <thead>
      <tr style="background:${primary};color:white">
        <th style="padding:8px 12px;text-align:left">Désignation</th>
        <th style="padding:8px 12px;text-align:center;width:60px">Qté</th>
        <th style="padding:8px 12px;text-align:center;width:80px">Unité</th>
        ${priceColumns}
      </tr>
    </thead>
    <tbody>${itemsHTML}</tbody>
    ${totalsRow}
  </table>

  <!-- Amount in words -->
  ${amountWords}

  <!-- Proforma warning -->
  ${proformaWarning}

  <!-- Signature -->
  ${signatureBlock}

  <!-- Footer -->
  ${footer ? `
  <div style="margin-top:48px;padding-top:12px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:10px">
    ${footer}
  </div>` : ''}
</body>
</html>`
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
    city: shop?.city || '',
    client_name: saleGroup.client_name || '',
    client_address: '',
    client_phone: '',
    validity: '30 jours',
  }

  const items = saleGroup.items.map(s => ({
    id: s.id,
    designation: s.product_name,
    quantity: s.quantity,
    unit: s.unit || 'Pièces',
    unit_price: s.unit_sale_price || 0,
    total_price: s.total_sale || 0,
  }))

  const grandTotal = items.reduce((a, i) => a + i.total_price, 0)
  const num = invoiceNumber || `VTE-${saleGroup.date}`

  const html = renderToInvoiceHTML({ shop, invoiceNumber: num, formValues, items, grandTotal, type })

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;'
  document.body.appendChild(iframe)
  iframe.contentDocument.open()
  iframe.contentDocument.write(html)
  iframe.contentDocument.close()
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      setTimeout(() => document.body.removeChild(iframe), 1500)
    }, 300)
  }
}

/**
 * Opens a print dialog for a purchase (bon de commande).
 */
export function printPurchaseDocument({ shop, type, purchase, invoiceNumber }) {
  const formValues = {
    date: purchase.date,
    city: shop?.city || '',
    client_name: purchase.supplier || '',
    client_address: '',
    client_phone: '',
  }

  const items = [{
    id: purchase.id,
    designation: purchase.product_name,
    quantity: purchase.quantity,
    unit: 'Pièces',
    unit_price: purchase.unit_price || 0,
    total_price: purchase.total_amount || 0,
  }]

  const grandTotal = purchase.total_amount || 0
  const num = invoiceNumber || `ACH-${purchase.date}`

  const html = renderToInvoiceHTML({ shop, invoiceNumber: num, formValues, items, grandTotal, type })

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;'
  document.body.appendChild(iframe)
  iframe.contentDocument.open()
  iframe.contentDocument.write(html)
  iframe.contentDocument.close()
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      setTimeout(() => document.body.removeChild(iframe), 1500)
    }, 300)
  }
}