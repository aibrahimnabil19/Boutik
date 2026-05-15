'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { getSupabaseClient } from '@/lib/supabase/client'
import { getSetting, setSetting } from '@/lib/db/local'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, ArrowRight, UserPlus, LogIn } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const { register, handleSubmit, formState: { errors }, reset } = useForm()

  async function onSubmit(data) {
    setLoading(true)
    const supabase = getSupabaseClient()

    try {
      if (mode === 'signup') {
        const pendingCode = await getSetting('pending_code')
        if (!pendingCode) {
          toast.error("Code d'accès manquant. Retournez à l'étape précédente.")
          router.push('/access-code')
          return
        }

        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email.trim().toLowerCase(),
          password: data.password,
          options: { data: { full_name: data.full_name?.trim() || '' } },
        })
        if (error) throw error

        const now = new Date().toISOString()

        const { data: claimedCode, error: claimError } = await supabase
          .from('access_codes')
          .update({
            used_by: authData.user.id,
            used_at: now,
          })
          .eq('code', pendingCode)
          .is('used_by', null)
          .select('id, code')
          .maybeSingle()

        if (claimError) throw claimError

        if (!claimedCode) {
          await supabase.auth.signOut()
          toast.error('Ce code a déjà été utilisé et ne peut plus être utilisé de nouveau.')
          return
        }

        await setSetting('pending_code', null)
        await setSetting('user_id', authData.user.id)
        await setSetting('offline_ready', true)

        toast.success('Compte créé ! Configurez votre boutique.')
        router.push('/setup')
      } else {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: data.email.trim().toLowerCase(),
          password: data.password,
        })
        if (error) throw error

        await setSetting('user_id', authData.user.id)
        await setSetting('offline_ready', true)

        const { data: profile } = await supabase
          .from('profiles')
          .select('shop_id')
          .eq('id', authData.user.id)
          .single()

        if (profile?.shop_id) {
          await setSetting('shop_id', profile.shop_id)
          await setSetting('offline_ready', true)
          toast.success('Connexion réussie !')
          router.push('/dashboard')
        } else {
          router.push('/setup')
        }
      }
    } catch (err) {
      const msg = err.message?.includes('Invalid login') ? 'Email ou mot de passe incorrect.'
        : err.message?.includes('already registered') ? 'Cet email est déjà utilisé.'
          : err.message || 'Une erreur est survenue.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = `w-full h-11 px-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400
    focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400 text-sm transition-all`

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Tab switcher */}
          <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 mb-8">
            {[
              { key: 'login', label: 'Se connecter', icon: LogIn },
              { key: 'signup', label: 'Créer un compte', icon: UserPlus },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setMode(key); reset() }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${mode === key
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Nom complet</label>
                <input
                  {...register('full_name')}
                  type="text"
                  placeholder="Votre nom"
                  className={inputCls}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Adresse email</label>
              <input
                {...register('email', {
                  required: 'Email requis',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email invalide' }
                })}
                type="email"
                placeholder="vous@exemple.com"
                className={inputCls}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Mot de passe</label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Mot de passe requis',
                    minLength: mode === 'signup' ? { value: 8, message: 'Minimum 8 caractères' } : undefined
                  })}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`${inputCls} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold text-white
                         bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200 shadow-lg shadow-blue-500/25 mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-slate-500 text-xs text-center mt-6">
            Connexion internet requise lors de la première connexion sur un appareil.
          </p>
        </div>
      </div>
    </div>
  )
}