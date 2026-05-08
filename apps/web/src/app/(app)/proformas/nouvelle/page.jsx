'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { v4 as uuid } from 'uuid'
import { toast } from 'sonner'
import { Plus, Trash2, Printer, Save, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { localDb, getAll, localUpsert, localDelete } from '@/lib/db/local'
import { formatFCFA, amountToWordsFCFA, generateInvoiceNumber, calculateInvoiceTotal } from '@/lib/core/calculations'
import { FormField, inputCls, Btn } from '@/components/ui'
import { renderToInvoiceHTML } from '@/lib/core/invoicePrint'
import FrenchInput from '@/components/FrenchInput'

const UNITS = ['Pièces', 'Mètre', 'Litre', 'Kg', 'Lot', 'Forfait']

export default function NouvelleProformaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const existingId = searchParams.get('id')
  const shop = useAppStore(s => s.shop)

  const [items, setItems] = useState([{ id: uuid(), designation: '', quantity: 1, unit: 'Pièces', unit_price: 0 }])
  const [products, setProducts] = useState([])
  const [saving, setSaving] = useState(false)
  const [proformaId] = useState(existingId || uuid())
  const [proformaNumber, setProformaNumber] = useState('')

  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      city: shop?.city || '',
      client_name: '', client_address: '', client_phone: '',
      validity: '30 jours',
    }
  })

  const load = useCallback(async () => {
    if (!shop?.id) return
    const [prods, allInvoices] = await Promise.all([
      getAll('products', shop.id),
      getAll('invoices', shop.id),
    ])
    setProducts(prods)

    if (existingId) {
      const inv = await localDb.invoices.get(existingId)
      const lines = await localDb.invoice_items.where('invoice_id').equals(existingId).toArray()
      if (inv) {
        reset({
          date: inv.date, city: inv.city || '',
          client_name: inv.client_name || '', client_address: inv.client_address || '',
          client_phone: inv.client_phone || '', validity: inv.validity || '30 jours',
        })
        setProformaNumber(inv.invoice_number)
        if (lines.length > 0) setItems(lines)
      }
    } else {
      const num = generateInvoiceNumber(allInvoices.filter(i => i.type === 'proforma'), 'proforma')
      setProformaNumber(num)
    }
  }, [shop?.id, existingId, reset])

  useEffect(() => { load() }, [load])

  function updateItem(id, field, value) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it))
  }
  function addItem() {
    setItems(prev => [...prev, { id: uuid(), designation: '', quantity: 1, unit: 'Pièces', unit_price: 0 }])
  }
  function removeItem(id) {
    if (items.length === 1) return
    setItems(prev => prev.filter(it => it.id !== id))
  }
  function fillFromProduct(itemId, productId) {
    const prod = products.find(p => p.id === productId)
    if (prod) updateItem(itemId, 'designation', prod.name)
  }

  const computedItems = items.map(it => ({
    ...it,
    total_price: Number(it.quantity) * Number(it.unit_price),
  }))
  const grandTotal = calculateInvoiceTotal(computedItems)

  async function onSubmit(data) {
    setSaving(true)
    try {
      const proforma = {
        id: proformaId,
        shop_id: shop.id,
        type: 'proforma',
        invoice_number: proformaNumber,
        date: data.date,
        city: data.city || shop?.city || '',
        client_name: data.client_name,
        client_address: data.client_address,
        client_phone: data.client_phone,
        validity: data.validity,
        total_amount: grandTotal,
        amount_in_words: amountToWordsFCFA(grandTotal),
        status: 'finalized',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await localUpsert('invoices', proforma)

      const existingItems = await localDb.invoice_items
        .where('invoice_id').equals(proformaId).toArray()

      for (const item of existingItems) {
        await localDelete('invoice_items', item.id)
      }

      for (let i = 0; i < computedItems.length; i++) {
        const it = computedItems[i]
        await localUpsert('invoice_items', {
          id: it.id,
          invoice_id: proformaId,
          shop_id: shop.id,
          designation: it.designation,
          quantity: Number(it.quantity),
          unit: it.unit,
          unit_price: Number(it.unit_price),
          total_price: it.total_price,
          sort_order: i,
        })
      }

      toast.success('Proforma enregistré !')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Print via iframe (only the document, not the screen) ─────────────────
  function handlePrint() {
    const formValues = watch()
    const html = renderToInvoiceHTML({
      shop,
      invoiceNumber: proformaNumber,
      formValues,
      items: computedItems,
      grandTotal,
      type: 'proforma',
    })

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

  const formValues = watch()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/proformas')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-display font-bold text-gray-900">Proforma {proformaNumber}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Btn variant="secondary" icon={Printer} onClick={handlePrint}>Imprimer</Btn>
          <Btn icon={Save} onClick={handleSubmit(onSubmit)} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Btn>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="max-w-7xl mx-auto p-6 grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Informations générales</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Date" required>
                <input {...register('date', { required: true })} type="date" className={inputCls} />
              </FormField>
              <FormField label="Ville">
                <input {...register('city')} placeholder={shop?.city || 'Niamey'} className={inputCls} />
              </FormField>
            </div>
            <div className="mt-4">
              <FormField label="Validité de l'offre">
                <input {...register('validity')} placeholder="Ex: 30 jours, 15 jours..." className={inputCls} />
              </FormField>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Client / Destinataire</h3>
            <div className="space-y-3">
              <FormField label="Nom">
                <input {...register('client_name')} placeholder="Ex: M. HAROUNA" className={inputCls} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Adresse">
                  <input {...register('client_address')} placeholder="Ex: Niamey" className={inputCls} />
                </FormField>
                <FormField label="Téléphone">
                  <input {...register('client_phone')} placeholder="92 00 00 00" className={inputCls} />
                </FormField>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Articles</h3>
              <Btn size="sm" icon={Plus} onClick={addItem}>Ajouter</Btn>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id} className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">Article {idx + 1}</span>
                    <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <select className={`${inputCls} text-xs`}
                    onChange={e => fillFromProduct(item.id, e.target.value)} defaultValue="">
                    <option value="">— Remplir depuis catalogue —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input value={item.designation}
                    onChange={e => updateItem(item.id, 'designation', e.target.value)}
                    placeholder="Désignation du produit / service" className={inputCls} />
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-xs text-gray-400">Qté</label>
                      <FrenchInput min="0.001" step="0.001" value={item.quantity}
                        onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                        className={`${inputCls} mt-0.5`} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Unité</label>
                      <select value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)}
                        className={`${inputCls} mt-0.5`}>
                        {UNITS.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Prix unit.</label>
                      <FrenchInput min="0" value={item.unit_price}
                        onChange={e => updateItem(item.id, 'unit_price', e.target.value)}
                        className={`${inputCls} mt-0.5`} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Total</label>
                      <div className={`${inputCls} mt-0.5 bg-gray-100 text-gray-600 flex items-center text-xs`}>
                        {formatFCFA(Number(item.quantity) * Number(item.unit_price))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="font-semibold text-gray-700">MONTANT TOTAL</span>
              <span className="font-display text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {formatFCFA(grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div>
          <div className="card p-6 sticky top-24">
            <h3 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">Aperçu</h3>
            <ProformaPreview shop={shop} proformaNumber={proformaNumber}
              formValues={formValues} items={computedItems} grandTotal={grandTotal} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ProformaPreview({ shop, proformaNumber, formValues, items, grandTotal }) {
  const dateStr = formValues.date
    ? format(new Date(formValues.date), 'dd MMMM yyyy', { locale: fr }) : '—'
  const city = formValues.city || shop?.city || 'Niamey'

  return (
    <div className="bg-white font-sans text-gray-900 p-5 text-xs border border-gray-100 rounded-xl">
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-start gap-4">
          {shop?.logo_url && (
            <img src={shop.logo_url} alt="Logo" className="w-16 h-16 object-contain" />
          )}
          <div>
            <h2 className="font-display font-bold text-lg" style={{ color: shop?.color_primary || '#1a56db' }}>
              {shop?.name}
            </h2>
            {shop?.address && <p className="text-gray-500">{shop.address}</p>}
            {shop?.nif && <p className="text-gray-500">NIF: {shop.nif}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-gray-500">{city}, le {dateStr}</p>
          {formValues.validity && (
            <p className="text-gray-400 text-xs mt-1">Validité : {formValues.validity}</p>
          )}
        </div>
      </div>

      <div className="text-center mb-6">
        <h1 className="font-display text-xl font-bold uppercase tracking-wide"
          style={{ color: shop?.color_primary || '#1a56db' }}>
          FACTURE PROFORMA N°{proformaNumber}
        </h1>
      </div>

      {(formValues.client_name || formValues.client_address || formValues.client_phone) && (
        <div className="border border-gray-200 rounded-lg p-4 mb-6 grid grid-cols-3 gap-4">
          {formValues.client_name && <div><span className="text-gray-500">CLIENT : </span><strong>{formValues.client_name}</strong></div>}
          {formValues.client_address && <div><span className="text-gray-500">ADRESSE : </span>{formValues.client_address}</div>}
          {formValues.client_phone && <div><span className="text-gray-500">Tél : </span>{formValues.client_phone}</div>}
        </div>
      )}

      <table className="w-full border-collapse mb-4">
        <thead>
          <tr style={{ background: shop?.color_primary || '#1a56db' }} className="text-white">
            <th className="text-left px-3 py-2 font-semibold">Désignation</th>
            <th className="text-center px-3 py-2 font-semibold w-16">Qté</th>
            <th className="text-center px-3 py-2 font-semibold w-20">Unité</th>
            <th className="text-right px-3 py-2 font-semibold w-28">Prix Unitaire</th>
            <th className="text-right px-3 py-2 font-semibold w-28">Prix Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
              <td className="px-3 py-2">{item.designation || '—'}</td>
              <td className="px-3 py-2 text-center">{item.quantity}</td>
              <td className="px-3 py-2 text-center">{item.unit}</td>
              <td className="px-3 py-2 text-right">{formatFCFA(item.unit_price)}</td>
              <td className="px-3 py-2 text-right font-semibold">{formatFCFA(item.total_price)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: shop?.color_primary || '#1a56db' }} className="text-white">
            <td colSpan={4} className="px-3 py-2 font-bold text-right">MONTANT TOTAL</td>
            <td className="px-3 py-2 font-bold text-right">{formatFCFA(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>

      <p className="text-gray-600 italic mb-6">{amountToWordsFCFA(grandTotal)}</p>

      <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 mb-4 text-xs text-amber-700">
        ⚠ Ce document est un devis / proforma et ne constitue pas une facture définitive.
      </div>

      <div className="mt-8 pt-4 border-t border-gray-200 text-center text-gray-400 text-xs">
        {[shop?.phone && `Tél : ${shop.phone}`,
        shop?.whatsapp && `WhatsApp : ${shop.whatsapp}`,
        shop?.email && `Email : ${shop.email}`
        ].filter(Boolean).join('   ·   ')}
      </div>
    </div>
  )
}