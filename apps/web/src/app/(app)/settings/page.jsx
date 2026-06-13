// Settings: shop profile, theme, sync status, import Excel, danger zone.
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  Settings, Store, Palette, Database, AlertTriangle,
  Upload, Save, RefreshCw, Check, Loader2, Phone, Mail, FileText
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/context/store'
import { setSetting, localDb } from '@/lib/db/local'
import { runSync, pullFromRemote } from '@/lib/sync/engine'
import { FormField, inputCls, Btn } from '@/components/ui'
import Image from 'next/image'

const THEMES = [
  { name: 'Bleu océan', primary: '#1a56db', accent: '#e3a008' },
  { name: 'Vert nature', primary: '#057a55', accent: '#e3a008' },
  { name: 'Rouge rubis', primary: '#c81e1e', accent: '#fbbf24' },
  { name: 'Violet royal', primary: '#6c2bd9', accent: '#f59e0b' },
  { name: 'Ardoise', primary: '#374151', accent: '#10b981' },
  { name: 'Orange vif', primary: '#c05621', accent: '#1a56db' },
]

export default function SettingsPage() {
  const { shop, setShop, applyTheme } = useAppStore()
  const [activeTab, setActiveTab] = useState('shop')
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [logoPreview, setLogoPreview] = useState(shop?.logo_url || null)
  const [logoFile, setLogoFile] = useState(null)
  const [cachetFile, setCachetFile] = useState(null)
  const [signatureFile, setSignatureFile] = useState(null)
  const [customPrimary, setCustomPrimary] = useState(shop?.color_primary || '#1a56db')

  const [pendingCount, setPendingCount] = useState(0)
  const [lastSyncAt, setLastSyncAt] = useState(null)

  const logoRef = useRef()
  const cachetRef = useRef()
  const signatureRef = useRef()

  const refreshSyncStats = useCallback(async () => {
    const count = await localDb.sync_queue.count()
    const savedLastSync = await localDb.app_settings.get('last_sync_at')
    setPendingCount(count)
    setLastSyncAt(savedLastSync?.value || null)
  }, [])

  async function handleManualSync() {
    if (!shop?.id) {
      toast.error('Aucune boutique active')
      return
    }

    setSyncing(true)

    try {
      await runSync(shop.id)
      await pullFromRemote(shop.id)

      const now = new Date().toISOString()
      await setSetting('last_sync_at', now)

      await refreshSyncStats()
      toast.success('Synchronisation terminée')
    } catch (err) {
      console.error('[manual sync failed]', err)
      toast.error(err.message || 'Échec de la synchronisation')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    refreshSyncStats()
  }, [refreshSyncStats])

  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: shop?.name || '',
      city: shop?.city || '',
      address: shop?.address || '',
      phone: shop?.phone || '',
      whatsapp: shop?.whatsapp || '',
      email: shop?.email || '',
      nif: shop?.nif || '',
    }
  })

  async function uploadFile(supabase, file, path) {
    if (!file) return null
    const { data, error } = await supabase.storage.from('shop-assets').upload(path, file, { upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('shop-assets').getPublicUrl(data.path)
    return publicUrl
  }

  function fileToDataUrl(file) {
    if (!file) return Promise.resolve(null)

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function onSaveShop(data) {
    if (!shop?.id) return
    setSaving(true)
    try {
      const isDemoMode = process.env.NEXT_PUBLIC_IS_DEMO === 'true'

      if (isDemoMode) {
        const [logoDataUrl, cachetDataUrl, signatureDataUrl] = await Promise.all([
          logoFile ? fileToDataUrl(logoFile) : Promise.resolve(shop.logo_data_url || shop.logo_url || null),
          cachetFile ? fileToDataUrl(cachetFile) : Promise.resolve(shop.cachet_data_url || shop.cachet_url || null),
          signatureFile ? fileToDataUrl(signatureFile) : Promise.resolve(shop.signature_data_url || shop.signature_url || null),
        ])

        const updates = {
          ...data,
          logo_url: logoDataUrl,
          cachet_url: cachetDataUrl,
          signature_url: signatureDataUrl,
          logo_data_url: logoDataUrl,
          cachet_data_url: cachetDataUrl,
          signature_data_url: signatureDataUrl,
          updated_at: new Date().toISOString(),
        }

        const nextShop = { ...shop, ...updates }

        setShop(nextShop)
        await setSetting('cached_shop', nextShop)
        await setSetting('offline_ready', true)
        applyTheme()

        toast.success('Boutique démo mise à jour !')
        return
      }
      const supabase = getSupabaseClient()
      const [logoUrl, cachetUrl, signatureUrl] = await Promise.all([
        logoFile ? uploadFile(supabase, logoFile, `${shop.id}/logo`) : Promise.resolve(shop.logo_url),
        cachetFile ? uploadFile(supabase, cachetFile, `${shop.id}/cachet`) : Promise.resolve(shop.cachet_url),
        signatureFile ? uploadFile(supabase, signatureFile, `${shop.id}/signature`) : Promise.resolve(shop.signature_url),
      ])

      const [logoDataUrl, cachetDataUrl, signatureDataUrl] = await Promise.all([
        logoFile ? fileToDataUrl(logoFile) : Promise.resolve(shop.logo_data_url || null),
        cachetFile ? fileToDataUrl(cachetFile) : Promise.resolve(shop.cachet_data_url || null),
        signatureFile ? fileToDataUrl(signatureFile) : Promise.resolve(shop.signature_data_url || null),
      ])

      const updates = {
        ...data,
        logo_url: logoUrl,
        cachet_url: cachetUrl,
        signature_url: signatureUrl,
        logo_data_url: logoDataUrl,
        cachet_data_url: cachetDataUrl,
        signature_data_url: signatureDataUrl,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('shops').update(updates).eq('id', shop.id)
      if (error) throw error

      setShop({ ...shop, ...updates })
      await setSetting('cached_shop', { ...shop, ...updates })
      await setSetting('offline_ready', true)
      applyTheme()
      toast.success('Boutique mise à jour !')
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  async function onSaveTheme() {
    if (!shop?.id) return
    setSaving(true)
    try {
      const isDemoMode = process.env.NEXT_PUBLIC_IS_DEMO === 'true'

      if (isDemoMode) {
        const updates = {
          color_primary: customPrimary,
          color_accent: shop.color_accent,
        }

        const nextShop = { ...shop, ...updates }

        setShop(nextShop)
        await setSetting('cached_shop', nextShop)
        applyTheme()

        toast.success('Thème démo mis à jour !')
        return
      }
      const supabase = getSupabaseClient()
      const updates = { color_primary: customPrimary, color_accent: shop.color_accent }
      const { error } = await supabase.from('shops').update(updates).eq('id', shop.id)
      if (error) throw error
      setShop({ ...shop, ...updates })
      applyTheme()
      toast.success('Thème mis à jour !')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleClearLocalData() {
    if (!confirm('Supprimer toutes les données locales ? Cette action est irréversible si non synchronisé.')) return
    const tables = ['products', 'purchases', 'sales', 'expenses', 'clients', 'client_transactions',
      'suppliers', 'supplier_transactions', 'invoices', 'invoice_items', 'sync_queue']
    for (const t of tables) {
      await localDb[t].clear()
    }
    toast.success('Données locales effacées.')
  }

  const tabs = [
    { key: 'shop', label: 'Boutique', icon: Store },
    { key: 'theme', label: 'Thème', icon: Palette },
    { key: 'sync', label: 'Données & Sync', icon: Database },
  ]

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-gray-600" />
        <h1 className="font-display text-2xl font-bold text-gray-900">Paramètres</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-800'
              }`}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Shop Tab */}
      {activeTab === 'shop' && (
        <form onSubmit={handleSubmit(onSaveShop)} className="space-y-5">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Logo de la boutique</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                {logoPreview ? (
                  <Image src={logoPreview} alt="Logo" width={64} height={64} className="w-full h-full object-contain" />
                ) : (
                  <Store className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div>
                <Btn size="sm" icon={Upload} variant="secondary"
                  onClick={() => logoRef.current?.click()}>Changer le logo</Btn>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG — max 2MB</p>
              </div>
              <input ref={logoRef} type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const f = e.target.files[0]
                  if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)) }
                }} />
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">Informations générales</h3>
            <FormField label="Nom de la boutique">
              <input {...register('name')} className={inputCls} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Ville">
                <input {...register('city')} className={inputCls} />
              </FormField>
              <FormField label="Adresse">
                <input {...register('address')} className={inputCls} />
              </FormField>
            </div>
            <FormField label="NIF" icon={FileText}>
              <input {...register('nif')} placeholder="NIF-000000000-0" className={inputCls} />
            </FormField>
          </div>

          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">Coordonnées</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Téléphone">
                <input {...register('phone')} className={inputCls} />
              </FormField>
              <FormField label="WhatsApp">
                <input {...register('whatsapp')} className={inputCls} />
              </FormField>
            </div>
            <FormField label="Email">
              <input {...register('email')} type="email" className={inputCls} />
            </FormField>
          </div>

          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">Documents</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Cachet / Tampon</p>
                <Btn size="sm" icon={Upload} variant="secondary"
                  onClick={() => cachetRef.current?.click()}>
                  {cachetFile ? '✓ ' + cachetFile.name.slice(0, 20) : 'Changer'}
                </Btn>
                <input ref={cachetRef} type="file" accept="image/*" className="hidden"
                  onChange={e => setCachetFile(e.target.files[0])} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Signature</p>
                <Btn size="sm" icon={Upload} variant="secondary"
                  onClick={() => signatureRef.current?.click()}>
                  {signatureFile ? '✓ ' + signatureFile.name.slice(0, 20) : 'Changer'}
                </Btn>
                <input ref={signatureRef} type="file" accept="image/*" className="hidden"
                  onChange={e => setSignatureFile(e.target.files[0])} />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Btn type="submit" icon={saving ? Loader2 : Save} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </Btn>
          </div>
        </form>
      )}

      {/* Theme Tab */}
      {activeTab === 'theme' && (
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Thème de couleur</h3>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {THEMES.map(theme => (
                <button key={theme.name} onClick={() => setCustomPrimary(theme.primary)}
                  className={`p-3 rounded-xl border-2 transition-all ${customPrimary === theme.primary ? 'border-gray-400 scale-105' : 'border-gray-200 hover:border-gray-300'
                    }`} style={{ background: theme.primary + '15' }}>
                  <div className="flex gap-1 mb-2">
                    <div className="w-4 h-4 rounded" style={{ background: theme.primary }} />
                    <div className="w-4 h-4 rounded" style={{ background: theme.accent }} />
                  </div>
                  <p className="text-xs text-gray-600 text-left">{theme.name}</p>
                  {customPrimary === theme.primary && (
                    <div className="mt-1"><Check className="w-3 h-3 text-gray-700" /></div>
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Couleur personnalisée</p>
              <div className="flex items-center gap-3">
                <input type="color" value={customPrimary}
                  onChange={(e) => setCustomPrimary(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer" />
                <span className="font-mono text-sm text-gray-600">{customPrimary}</span>
              </div>
            </div>

            {/* Live preview */}
            <div className="mt-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400 mb-2">Aperçu</p>
              <div className="flex gap-2 flex-wrap">
                <div className="h-8 px-4 rounded-lg flex items-center text-white text-sm font-semibold"
                  style={{ background: customPrimary }}>Bouton</div>
                <div className="h-8 w-8 rounded-lg" style={{ background: customPrimary + '20' }} />
                <div className="h-8 px-3 rounded-lg flex items-center text-sm font-medium border-2"
                  style={{ borderColor: customPrimary, color: customPrimary }}>Outline</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Btn icon={saving ? Loader2 : Palette} disabled={saving} onClick={onSaveTheme}>
              {saving ? 'Enregistrement…' : 'Appliquer le thème'}
            </Btn>
          </div>
        </div>
      )}

      {/* Sync Tab */}
      {activeTab === 'sync' && (
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-500" />
              Synchronisation
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Synchronise les données locales vers le cloud Supabase. Se fait automatiquement toutes les 2 minutes si vous êtes en ligne.
            </p>
            {/* <div className="flex gap-3">
              <Btn icon={syncing ? Loader2 : RefreshCw} disabled={syncing} onClick={handleSync}>
                {syncing ? 'Synchronisation…' : 'Synchroniser maintenant'}
              </Btn>
            </div> */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Synchronisation des données</h3>
                  <p className="text-sm text-gray-500">
                    Envoie les données locales vers Supabase puis recharge les données distantes.
                  </p>
                </div>
                <Btn onClick={handleManualSync} disabled={syncing} icon={syncing ? Loader2 : RefreshCw}>
                  {syncing ? 'Synchronisation…' : 'Synchroniser maintenant'}
                </Btn>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                  <p className="text-xs text-gray-500">Éléments en attente</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                </div>

                <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                  <p className="text-xs text-gray-500">Dernière synchronisation</p>
                  <p className="text-sm font-medium text-gray-900">
                    {lastSyncAt ? new Date(lastSyncAt).toLocaleString('fr-FR') : 'Jamais'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5 border border-red-100">
            <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Zone dangereuse
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Efface toutes les données de cet appareil. Les données déjà synchronisées resteront dans le cloud.
            </p>
            <Btn variant="danger" icon={AlertTriangle} onClick={handleClearLocalData}>
              Effacer les données locales
            </Btn>
          </div>
        </div>
      )}
    </div>
  )
}