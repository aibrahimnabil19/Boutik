'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { setSetting } from '@/lib/db/local'
import { toast } from 'sonner'
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react'

const CODE_LENGTH = 16
const GROUP_SIZE = 4
const NUM_GROUPS = CODE_LENGTH / GROUP_SIZE

export default function AccessCodePage() {
  const router = useRouter()
  const [groups, setGroups] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef([])

  const isDemoMode = process.env.NEXT_PUBLIC_IS_DEMO === 'true'

  useEffect(() => {
    if (!isDemoMode) return

    async function skipDemoAccessCode() {
      await setSetting('access_granted', true)
      router.replace('/auth')
    }

    skipDemoAccessCode()
  }, [isDemoMode, router])

  const fullCode = groups.join('').toUpperCase()

  function handleGroupChange(index, value) {
    const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, GROUP_SIZE)
    const next = [...groups]
    next[index] = clean
    setGroups(next)
    if (clean.length === GROUP_SIZE && index < NUM_GROUPS - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && groups[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (fullCode.length < CODE_LENGTH) {
      toast.error('Veuillez entrer le code complet (16 caractères)')
      return
    }

    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', fullCode)
        .single()

      if (error || !data) {
        toast.error('Code invalide. Vérifiez votre code et réessayez.')
        return
      }
      if (data.used_by) {
        toast.error('Ce code a déjà été utilisé et ne peut plus être utilisé de nouveau.')
        return
      }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error('Ce code a expiré.')
        return
      }

      await setSetting('access_granted', true)
      await setSetting('pending_code', fullCode)
      toast.success('Code validé ! Créez votre compte.')
      router.push('/auth')
    } catch (err) {
      toast.error('Erreur de connexion. Vérifiez votre connexion internet.')
    } finally {
      setLoading(false)
    }
  }

  if (isDemoMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <p className="text-white text-sm">Chargement de la démo…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold text-white text-center mb-2">
            Code d&apos;accès
          </h1>
          <p className="text-slate-400 text-sm text-center mb-8">
            Entrez le code à 16 caractères fourni par votre administrateur pour activer cette application.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-2 justify-center">
              {groups.map((group, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    ref={(el) => (inputRefs.current[i] = el)}
                    type="text"
                    inputMode="text"
                    maxLength={GROUP_SIZE}
                    value={group}
                    onChange={(e) => handleGroupChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className="w-16 h-14 text-center text-white font-mono text-lg font-bold
                               bg-white/10 border border-white/20 rounded-xl
                               focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400
                               tracking-widest uppercase transition-all placeholder-white/30"
                    placeholder="XXXX"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {i < NUM_GROUPS - 1 && (
                    <span className="text-slate-500 font-bold text-lg select-none">—</span>
                  )}
                </div>
              ))}
            </div>

            {/* Progress dots */}
            <div className="flex gap-1 justify-center">
              {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 w-3 rounded-full transition-all duration-200 ${i < fullCode.length ? 'bg-blue-400' : 'bg-white/10'
                    }`}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || fullCode.length < CODE_LENGTH}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold text-white
                         bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200 shadow-lg shadow-blue-500/25"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Valider le code
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-slate-500 text-xs text-center mt-6">
            Vous devez être connecté à internet lors de cette étape.
          </p>
        </div>
      </div>
    </div>
  )
}