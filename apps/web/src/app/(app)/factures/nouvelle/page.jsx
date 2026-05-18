// Invoice builder: create/edit a facture, then print it with the shop's logo/signature.
// Brouillon = saved as draft (not finalized, can still edit)
// Finaliser = marks invoice as final/official
// Print = opens a clean print dialog showing ONLY the invoice document
'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { v4 as uuid } from 'uuid'
import { toast } from 'sonner'
import { Plus, Trash2, Printer, Save, ArrowLeft, Check } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { localDb, getAll, localUpsert, localDelete } from '@/lib/db/local'
import { formatFCFA, amountToWordsFCFA, generateInvoiceNumber, calculateInvoiceTotal } from '@/lib/core/calculations'
import { FormField, inputCls, Btn } from '@/components/ui'
import { renderToInvoiceHTML } from '@/lib/core/invoicePrint'
import DocumentPrintOptions from '@/components/DocumentPrintOptions'
import FrenchInput from '@/components/FrenchInput'
import GuaranteePicker from '@/components/GuaranteePicker'
import { GUARANTEE_OPTIONS } from '@/lib/core/guarantees'

const UNITS = ['Pièces', 'Mètre', 'Litre', 'Kg', 'Lot', 'Forfait']

export default function NouvelleFacturePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const existingId = searchParams.get('id')
  const shop = useAppStore(s => s.shop)

  const [items, setItems] = useState([{ id: uuid(), designation: '', quantity: 1, unit: 'Pièces', unit_price: 0 }])
  const [products, setProducts] = useState([])
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('draft')
  const [invoiceId] = useState(existingId || uuid())
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [printOptions, setPrintOptions] = useState({
    includeCachet: searchParams.get('cachet') !== '0',
    includeSignature: searchParams.get('signature') !== '0',
  })
  const [guarantee, setGuarantee] = useState({
    key: GUARANTEE_OPTIONS[0].key,
    text: GUARANTEE_OPTIONS[0].text,
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      city: shop?.city || '',
      client_name: '',
      client_address: '',
      client_phone: '',
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
          date: inv.date, city: inv.city || '', client_name: inv.client_name || '',
          client_address: inv.client_address || '', client_phone: inv.client_phone || '',
        })
        setStatus(inv.status)
        setInvoiceNumber(inv.invoice_number)
        setGuarantee({
          key: 'manual',
          text: inv.guarantee_text || GUARANTEE_OPTIONS[0].text,
        })

        setPrintOptions({
          includeCachet: inv.include_cachet ?? searchParams.get('cachet') !== '0',
          includeSignature: inv.include_signature ?? searchParams.get('signature') !== '0',
        })
        if (lines.length > 0) setItems(lines)
      }
    } else {
      const num = generateInvoiceNumber(allInvoices.filter(i => i.type === 'facture'), 'facture')
      setInvoiceNumber(num)
    }
  }, [shop?.id, existingId, reset])

  useEffect(() => { load() }, [load])

  // ─── Items helpers ────────────────────────────────────────────────────────
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

  // ─── Save ─────────────────────────────────────────────────────────────────
  async function onSubmit(data, newStatus = status) {
    setSaving(true)
    try {
      const invoice = {
        id: invoiceId,
        shop_id: shop.id,
        type: 'facture',
        invoice_number: invoiceNumber,
        date: data.date,
        city: data.city || shop?.city || '',
        client_name: data.client_name,
        client_address: data.client_address,
        client_phone: data.client_phone,
        total_amount: grandTotal,
        amount_in_words: amountToWordsFCFA(grandTotal, 'facture'),
        guarantee_text: guarantee.text || '',
        include_cachet: !!printOptions.includeCachet,
        include_signature: !!printOptions.includeSignature,
        status: newStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await localUpsert('invoices', invoice)

      const existingItems = await localDb.invoice_items
        .where('invoice_id').equals(invoiceId).toArray()
      for (const item of existingItems) {
        await localDelete('invoice_items', item.id)
      }

      for (let i = 0; i < computedItems.length; i++) {
        const it = computedItems[i]
        await localUpsert('invoice_items', {
          id: it.id,
          invoice_id: invoiceId,
          shop_id: shop.id,
          designation: it.designation,
          quantity: Number(it.quantity),
          unit: it.unit,
          unit_price: Number(it.unit_price),
          total_price: it.total_price,
          sort_order: i,
        })
      }

      setStatus(newStatus)
      toast.success(newStatus === 'finalized' ? 'Facture finalisée !' : 'Brouillon enregistré — vous pourrez le modifier plus tard')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Print: renders ONLY the invoice into a hidden iframe ─────────────────
  function handlePrint() {
    const formValues = watch ? watch() : {}

    const html = renderToInvoiceHTML({
      shop,
      invoiceNumber,
      formValues,
      items: computedItems,
      grandTotal,
      type: 'facture',
      guaranteeText: guarantee.text,
      includeCachet: printOptions.includeCachet,
      includeSignature: printOptions.includeSignature,
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
        setTimeout(() => document.body.removeChild(iframe), 1000)
      }, 300)
    }
  }

  const formValues = watch()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/factures')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-display font-bold text-gray-900">
          Facture {invoiceNumber}
          {status === 'draft' && <span className="ml-2 text-xs font-normal text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">Brouillon</span>}
          {status === 'finalized' && <span className="ml-2 text-xs font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Finalisée</span>}
        </h1>

        <div className="hidden lg:block w-64">
          <DocumentPrintOptions
            shop={shop}
            value={printOptions}
            onChange={setPrintOptions}
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Btn variant="secondary" icon={Printer} onClick={handlePrint}>Imprimer</Btn>
          <Btn
            variant="secondary"
            icon={Save}
            onClick={handleSubmit(d => onSubmit(d, 'draft'))}
            disabled={saving}
            title="Enregistre sans finaliser — vous pourrez modifier cette facture plus tard"
          >
            Brouillon
          </Btn>
          <Btn icon={Check} onClick={handleSubmit(d => onSubmit(d, 'finalized'))} disabled={saving}>
            Finaliser
          </Btn>
        </div>
      </div>

      {/* Two-column layout: form left, preview right */}
      <div className="max-w-7xl mx-auto p-6 grid lg:grid-cols-2 gap-6">
        {/* ── Form ── */}
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
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Client</h3>
            <div className="space-y-3">
              <FormField label="Nom du client">
                <input {...register('client_name')} placeholder="Ex: M. HAROUNA" className={inputCls} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Adresse">
                  <input {...register('client_address')} placeholder="Ex: Niamey 200" className={inputCls} />
                </FormField>
                <FormField label="Téléphone">
                  <FrenchInput
                    value={watch('client_phone')}
                    onChange={(value) => setValue('client_phone', value)}
                    placeholder="Ex: 92 00 00 00"
                    className={inputCls}
                  />
                </FormField>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Lignes de facture</h3>
              <Btn size="sm" icon={Plus} onClick={addItem}>Ajouter</Btn>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id} className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">Ligne {idx + 1}</span>
                    <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <select
                    className={`${inputCls} text-xs`}
                    onChange={e => fillFromProduct(item.id, e.target.value)}
                    defaultValue=""
                  >
                    <option value="">— Remplir depuis catalogue —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>

                  <input
                    value={item.designation}
                    onChange={e => updateItem(item.id, 'designation', e.target.value)}
                    placeholder="Désignation du produit / service"
                    className={inputCls}
                  />

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-xs text-gray-400">Qté</label>
                      <FrenchInput
                        value={item.quantity}
                        onChange={(value) => updateItem(item.id, 'quantity', value)}
                        className={`${inputCls} mt-0.5`}
                      />
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
                      <FrenchInput
                        value={item.unit_price}
                        onChange={(value) => updateItem(item.id, 'unit_price', value)}
                        className={`${inputCls} mt-0.5`}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Total</label>
                      <div className={`${inputCls} mt-0.5 bg-gray-100 text-gray-600 flex items-center`}>
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

        <div className="card p-4 mb-4">
          <GuaranteePicker value={guarantee} onChange={setGuarantee} />
        </div>

        {/* ── Preview ── */}
        <div>
          <div className="card p-6 sticky top-24">
            <h3 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">Aperçu</h3>
            <InvoicePreview
              shop={shop}
              invoiceNumber={invoiceNumber}
              formValues={formValues}
              items={computedItems}
              grandTotal={grandTotal}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Invoice Preview Component ────────────────────────────────────────────────
export function InvoicePreview({ shop, invoiceNumber, formValues, items, grandTotal, full }) {
  const dateStr = formValues.date
    ? format(new Date(formValues.date), 'dd MMMM yyyy', { locale: fr })
    : '—'

  const city = formValues.city || shop?.city || 'Niamey'

  return (
    <div className={`bg-white font-sans text-gray-900 ${full ? 'p-10 min-h-screen' : 'p-5 text-xs border border-gray-100 rounded-xl'}`}
      style={{ fontSize: full ? '12pt' : undefined }}>

      <div className="flex justify-between items-start mb-8">
        <div className="flex items-start gap-4">
          {shop?.logo_url && (
            <img src={shop.logo_url} alt="Logo" className="w-24 h-24 object-contain" />
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
        </div>
      </div>

      <div className="text-center mb-6">
        <h1 className="font-display text-xl font-bold uppercase tracking-wide"
          style={{ color: shop?.color_primary || '#1a56db' }}>
          FACTURE DE VENTE N°{invoiceNumber}
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

      <p className="text-gray-800 mb-8">
        {amountToWordsFCFA(grandTotal, 'facture')}
      </p>

      {guarantee.text && (
        <p className="text-gray-800 mb-8">
          <span className="text-red-600 underline font-bold">GARANTIE</span> : {guarantee.text}
        </p>
      )}

      <div className="flex justify-between items-end mt-12">
        <div />
        <div className="text-center">
          <p className="text-gray-600 mb-2">Signature</p>
          {shop?.signature_url && (
            <img src={shop.signature_url} alt="Signature" className="h-14 object-contain mx-auto" />
          )}
          {shop?.cachet_url && (
            <img src={shop.cachet_url} alt="Cachet" className="h-14 object-contain mx-auto mt-2" />
          )}
        </div>
      </div>

      <div className="mt-12 pt-4 border-t border-gray-200 text-center text-gray-400 text-xs">
        {[shop?.phone && `Tél : ${shop.phone}`,
        shop?.whatsapp && `WhatsApp : ${shop.whatsapp}`,
        shop?.email && `Email : ${shop.email}`
        ].filter(Boolean).join('   ·   ')}
      </div>
    </div>
  )
}