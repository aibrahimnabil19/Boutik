// apps/web/src/app/(onboarding)/setup/page.jsx
// Collected after first login: shop/business profile + color theme.
// All fields optional. Used in factures, proformas, receipts, and app branding.

'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { getSupabaseClient } from '@/lib/supabase/client'
import { setSetting } from '@/lib/db/local'
import { useAppStore } from '@/context/store'
import { toast } from 'sonner'
import {
  Building2, MapPin, Phone, Mail, FileText,
  Palette, Upload, ChevronRight, Loader2, Check
} from 'lucide-react'
import Image from 'next/image'

// Preset color themes
const THEMES = [
  { name: 'Bleu océan',    primary: '#1a56db', accent: '#e3a008' },
  { name: 'Vert nature',   primary: '#057a55', accent: '#e3a008' },
  { name: 'Rouge rubis',   primary: '#c81e1e', accent: '#fbbf24' },
  { name: 'Violet royal',  primary: '#6c2bd9', accent: '#f59e0b' },
  { name: 'Ardoise',       primary: '#374151', accent: '#10b981' },
  { name: 'Orange vif',    primary: '#c05621', accent: '#1a56db' },
]

const STEPS = ['Infos boutique', 'Contact', 'Documents', 'Thème']

export default function SetupPage() {
  const router = useRouter()
  const setShop = useAppStore(s => s.setShop)
  const applyTheme = useAppStore(s => s.applyTheme)

  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0])
  const [customPrimary, setCustomPrimary] = useState('')

  // File uploads
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [cachetFile, setCachetFile] = useState(null)
  const [signatureFile, setSignatureFile] = useState(null)

  const logoRef = useRef()
  const cachetRef = useRef()
  const signatureRef = useRef()

  const { register, handleSubmit, trigger, formState: { errors } } = useForm()

  function handleFileChange(file, setFile, setPreview) {
    if (!file) return
    setFile(file)
    if (setPreview) {
      const url = URL.createObjectURL(file)
      setPreview(url)
    }
  }

  async function uploadFile(supabase, file, path) {
    if (!file) return null
    const { data, error } = await supabase.storage
      .from('shop-assets')
      .upload(path, file, { upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('shop-assets').getPublicUrl(data.path)
    return publicUrl
  }

  async function onSubmit(data) {
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      const shopId = crypto.randomUUID()
      const primary = customPrimary || selectedTheme.primary

      // Upload files if provided
      const [logoUrl, cachetUrl, signatureUrl] = await Promise.all([
        logoFile ? uploadFile(supabase, logoFile, `${shopId}/logo`) : null,
        cachetFile ? uploadFile(supabase, cachetFile, `${shopId}/cachet`) : null,
        signatureFile ? uploadFile(supabase, signatureFile, `${shopId}/signature`) : null,
      ])

      // Create shop
      const shopData = {
        id: shopId,
        owner_id: user.id,
        name: data.name || 'Ma Boutique',
        address: data.address || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        nif: data.nif || null,
        city: data.city || null,
        logo_url: logoUrl,
        cachet_url: cachetUrl,
        signature_url: signatureUrl,
        color_primary: primary,
        color_secondary: darkenHex(primary),
        color_accent: selectedTheme.accent,
        currency: 'FCFA',
      }

      const { error: shopError } = await supabase.from('shops').insert(shopData)
      if (shopError) throw shopError

      // Link shop to profile
      await supabase.from('profiles').update({ shop_id: shopId }).eq('id', user.id)

      // Save locally
      await setSetting('shop_id', shopId)
      setShop(shopData)
      applyTheme()

      toast.success('Boutique configurée ! Bienvenue 🎉')
      router.push('/dashboard')
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la configuration')
    } finally {
      setLoading(false)
    }
  }

  async function nextStep() {
    const fields = [
      ['name'],
      ['phone'],
      [],
      [],
    ][step]

    const valid = fields.length === 0 || await trigger(fields)
    if (valid) setStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  const isLastStep = step === STEPS.length - 1

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-blue-600/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-amber-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            {STEPS.map((s, i) => (
              <span key={i} className={`text-xs font-medium ${i <= step ? 'text-blue-400' : 'text-slate-600'}`}>
                {s}
              </span>
            ))}
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* ── Step 0: Business Info ── */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-white mb-1">Votre boutique</h2>
                  <p className="text-slate-400 text-sm">Ces informations apparaîtront sur vos factures et reçus.</p>
                </div>

                {/* Logo upload */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Logo (optionnel)</label>
                  <div
                    onClick={() => logoRef.current?.click()}
                    className="flex items-center gap-4 p-4 border-2 border-dashed border-white/15 rounded-xl cursor-pointer hover:border-blue-400/50 transition-colors"
                  >
                    {logoPreview ? (
                      <Image 
                      src={logoPreview} 
                      alt="Logo" 
                      width={500}
                      height={500}
                      className="w-12 h-12 rounded-lg object-contain bg-white/10" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-white text-sm font-medium">{logoPreview ? 'Logo sélectionné' : 'Ajouter un logo'}</p>
                      <p className="text-slate-500 text-xs">PNG, JPG — max 2MB</p>
                    </div>
                  </div>
                  <input
                    ref={logoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleFileChange(e.target.files[0], setLogoFile, setLogoPreview)}
                  />
                </div>

                <Field label="Nom de la boutique *" error={errors.name?.message}>
                  <input
                    {...register('name', { required: 'Nom requis' })}
                    placeholder="Ex: ELSO Niger"
                    className={inputClass}
                  />
                </Field>

                <Field label="Ville">
                  <input {...register('city')} placeholder="Ex: Niamey" className={inputClass} />
                </Field>

                <Field label="Adresse">
                  <input {...register('address')} placeholder="Ex: Plateau, Niamey" className={inputClass} />
                </Field>
              </div>
            )}

            {/* ── Step 1: Contact ── */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-white mb-1">Coordonnées</h2>
                  <p className="text-slate-400 text-sm">Affichées en bas de vos documents.</p>
                </div>

                <Field label="Téléphone" icon={Phone}>
                  <input {...register('phone')} placeholder="+227 90 00 00 00" className={inputClass} />
                </Field>

                <Field label="WhatsApp" icon={Phone}>
                  <input {...register('whatsapp')} placeholder="+227 94 00 00 00" className={inputClass} />
                </Field>

                <Field label="Email" icon={Mail}>
                  <input {...register('email')} type="email" placeholder="contact@votreboutique.com" className={inputClass} />
                </Field>
              </div>
            )}

            {/* ── Step 2: Documents ── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-white mb-1">Documents légaux</h2>
                  <p className="text-slate-400 text-sm">Pour vos factures officielles. Tout est optionnel.</p>
                </div>

                <Field label="NIF (Numéro d'Identification Fiscale)" icon={FileText}>
                  <input {...register('nif')} placeholder="Ex: NIF-000000000-0" className={inputClass} />
                </Field>

                {/* Cachet / Tampon */}
                <FileUploadBox
                  label="Photo du cachet / tampon"
                  file={cachetFile}
                  onPick={(f) => handleFileChange(f, setCachetFile, null)}
                />

                {/* Signature */}
                <FileUploadBox
                  label="Photo de la signature"
                  file={signatureFile}
                  onPick={(f) => handleFileChange(f, setSignatureFile, null)}
                />
              </div>
            )}

            {/* ── Step 3: Theme ── */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-white mb-1">Couleur de l&apos;application</h2>
                  <p className="text-slate-400 text-sm">Choisissez le thème visuel de votre espace.</p>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.name}
                      type="button"
                      onClick={() => { setSelectedTheme(theme); setCustomPrimary('') }}
                      className={`relative p-3 rounded-xl border-2 transition-all ${
                        selectedTheme.name === theme.name && !customPrimary
                          ? 'border-white/60 scale-105'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                      style={{ background: theme.primary + '33' }}
                    >
                      <div className="flex gap-1 mb-2">
                        <div className="w-4 h-4 rounded" style={{ background: theme.primary }} />
                        <div className="w-4 h-4 rounded" style={{ background: theme.accent }} />
                      </div>
                      <p className="text-xs text-white/70 text-left">{theme.name}</p>
                      {selectedTheme.name === theme.name && !customPrimary && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-slate-800" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Custom color picker */}
                <div className="border-t border-white/10 pt-4">
                  <label className="block text-xs font-medium text-slate-400 mb-2">
                    <Palette className="w-3.5 h-3.5 inline mr-1" />
                    Couleur personnalisée
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={customPrimary || selectedTheme.primary}
                      onChange={(e) => setCustomPrimary(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-slate-400 text-sm font-mono">
                      {customPrimary || selectedTheme.primary}
                    </span>
                    {customPrimary && (
                      <button
                        type="button"
                        onClick={() => setCustomPrimary('')}
                        className="text-xs text-slate-500 hover:text-white"
                      >
                        Réinitialiser
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-8">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep(s => s - 1)}
                  className="flex-none h-11 px-5 rounded-xl font-medium text-slate-400 hover:text-white
                             bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm"
                >
                  Retour
                </button>
              )}

              {isLastStep ? (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl font-semibold text-white
                             bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/25"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Terminer <Check className="w-4 h-4" /></>}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl font-semibold text-white
                             bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/25"
                >
                  Suivant <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {step === 0 && (
              <button
                type="button"
                onClick={() => { setStep(STEPS.length - 1) }}
                className="w-full text-center text-xs text-slate-600 hover:text-slate-400 mt-3 transition-colors"
              >
                Passer la configuration (faire plus tard)
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const inputClass = `w-full h-11 px-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500
  focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400 text-sm transition-all`

function Field({ label, children, error, icon: Icon }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

function FileUploadBox({ label, file, onPick }) {
  const ref = useRef()
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label} (optionnel)</label>
      <div
        onClick={() => ref.current?.click()}
        className="flex items-center gap-3 p-3 border border-dashed border-white/15 rounded-xl cursor-pointer hover:border-blue-400/40 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-none">
          {file ? <Check className="w-4 h-4 text-green-400" /> : <Upload className="w-4 h-4 text-slate-400" />}
        </div>
        <p className="text-sm text-slate-300">{file ? file.name : 'Cliquer pour sélectionner'}</p>
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => onPick(e.target.files[0])} />
    </div>
  )
}

function darkenHex(hex) {
  try {
    const r = Math.max(0, parseInt(hex.slice(1,3),16) - 30)
    const g = Math.max(0, parseInt(hex.slice(3,5),16) - 30)
    const b = Math.max(0, parseInt(hex.slice(5,7),16) - 30)
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
  } catch { return hex }
}