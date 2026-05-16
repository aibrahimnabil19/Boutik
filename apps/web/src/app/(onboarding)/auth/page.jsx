'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { getSupabaseClient } from '@/lib/supabase/client'
import { getSetting, setSetting } from '@/lib/db/local'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'

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

        const { data: claimed, error: claimError } = await supabase.rpc('claim_access_code', {
          p_code: pendingCode,
        })

        if (claimError) throw claimError

        if (!claimed) {
          await setSetting('pending_code', null)
          toast.error('Ce code a déjà été utilisé.')
          router.push('/access-code')
          return
        }

        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email.trim().toLowerCase(),
          password: data.password,
          options: {
            data: { full_name: data.full_name?.trim() || '' },
          },
        })

        if (error) throw error

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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

        .auth-root {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          font-family: 'DM Sans', sans-serif;
          background: #fafaf9;
        }

        @media (max-width: 900px) {
          .auth-root { grid-template-columns: 1fr; }
          .auth-brand { display: none; }
        }

        /* ── Left brand panel ── */
        .auth-brand {
          background: #1a1a2e;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 3rem;
        }

        .brand-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .brand-orb-1 {
          position: absolute;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%);
          top: -100px;
          right: -100px;
          pointer-events: none;
        }

        .brand-orb-2 {
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%);
          bottom: 100px;
          left: -50px;
          pointer-events: none;
        }

        .brand-content {
          position: relative;
          z-index: 1;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 3rem;
        }

        .brand-logo-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-logo-icon svg {
          width: 20px;
          height: 20px;
          fill: white;
        }

        .brand-logo-name {
          font-family: 'DM Serif Display', serif;
          font-size: 1.5rem;
          color: white;
          letter-spacing: -0.02em;
        }

        .brand-headline {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(2rem, 3vw, 2.75rem);
          line-height: 1.15;
          color: white;
          letter-spacing: -0.02em;
          margin-bottom: 1.5rem;
        }

        .brand-headline em {
          font-style: italic;
          color: #a5b4fc;
        }

        .brand-desc {
          color: rgba(255,255,255,0.5);
          font-size: 0.95rem;
          line-height: 1.7;
          max-width: 340px;
          font-weight: 300;
        }

        .brand-stats {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
          background: rgba(255,255,255,0.08);
          border-radius: 16px;
          overflow: hidden;
        }

        .brand-stat {
          padding: 1.25rem 1.5rem;
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(10px);
        }

        .brand-stat-value {
          font-size: 1.75rem;
          font-weight: 600;
          color: white;
          letter-spacing: -0.03em;
          line-height: 1;
          margin-bottom: 4px;
        }

        .brand-stat-label {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        /* ── Right form panel ── */
        .auth-form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: #fafaf9;
        }

        .auth-form-box {
          width: 100%;
          max-width: 420px;
        }

        .auth-form-header {
          margin-bottom: 2.5rem;
        }

        .auth-form-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          color: #6366f1;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 0.75rem;
        }

        .auth-form-eyebrow::before {
          content: '';
          display: block;
          width: 16px;
          height: 2px;
          background: #6366f1;
          border-radius: 2px;
        }

        .auth-form-title {
          font-family: 'DM Serif Display', serif;
          font-size: 2rem;
          color: #111827;
          letter-spacing: -0.03em;
          line-height: 1.2;
          margin-bottom: 0.5rem;
        }

        .auth-form-subtitle {
          font-size: 0.9rem;
          color: #6b7280;
          font-weight: 300;
        }

        /* Tab switcher */
        .auth-tabs {
          display: flex;
          gap: 0;
          background: #f3f4f6;
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 2rem;
        }

        .auth-tab {
          flex: 1;
          padding: 0.625rem 1rem;
          border-radius: 9px;
          border: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
          color: #6b7280;
        }

        .auth-tab.active {
          background: white;
          color: #111827;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
        }

        /* Form fields */
        .auth-field {
          margin-bottom: 1.25rem;
        }

        .auth-label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.4rem;
          letter-spacing: 0.01em;
        }

        .auth-input-wrap {
          position: relative;
        }

        .auth-input {
          width: 100%;
          height: 48px;
          padding: 0 16px;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9375rem;
          color: #111827;
          background: white;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .auth-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }

        .auth-input::placeholder {
          color: #d1d5db;
        }

        .auth-input.has-toggle {
          padding-right: 48px;
        }

        .auth-toggle-btn {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
        }

        .auth-toggle-btn:hover {
          color: #6b7280;
        }

        .auth-error-msg {
          font-size: 0.75rem;
          color: #ef4444;
          margin-top: 4px;
        }

        /* Submit button */
        .auth-submit {
          width: 100%;
          height: 50px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: opacity 0.2s, transform 0.15s;
          margin-top: 0.5rem;
          box-shadow: 0 4px 14px rgba(99,102,241,0.35);
          letter-spacing: 0.01em;
        }

        .auth-submit:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(99,102,241,0.4);
        }

        .auth-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .auth-footer-note {
          text-align: center;
          font-size: 0.78rem;
          color: #9ca3af;
          margin-top: 1.5rem;
          font-weight: 300;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 1.5rem 0;
        }

        .auth-divider-line {
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }

        .auth-divider-text {
          font-size: 0.75rem;
          color: #9ca3af;
          white-space: nowrap;
        }
      `}</style>

      <div className="auth-root">
        {/* ── Brand panel (left) ── */}
        <div className="auth-brand">
          <div className="brand-grid" />
          <div className="brand-orb-1" />
          <div className="brand-orb-2" />

          <div className="brand-content">
            <div className="brand-logo">
              <div className="brand-logo-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
                </svg>
              </div>
              <span className="brand-logo-name">Boutik</span>
            </div>

            <h1 className="brand-headline">
              Gérez votre boutique<br />
              <em>intelligemment.</em>
            </h1>
            <p className="brand-desc">
              Ventes, achats, stocks, créances — tout au même endroit.
              Fonctionne même sans internet.
            </p>
          </div>

          <div className="brand-stats">
            {[
              { value: '100%', label: 'Hors-ligne' },
              { value: 'FCFA', label: 'Monnaie locale' },
              { value: '0 perte', label: 'Données sécurisées' },
              { value: '∞', label: 'Transactions' },
            ].map(s => (
              <div key={s.label} className="brand-stat">
                <div className="brand-stat-value">{s.value}</div>
                <div className="brand-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Form panel (right) ── */}
        <div className="auth-form-panel">
          <div className="auth-form-box">
            <div className="auth-form-header">
              <div className="auth-form-eyebrow">Boutik Suite</div>
              <h2 className="auth-form-title">
                {mode === 'login' ? 'Bon retour 👋' : 'Créer un compte'}
              </h2>
              <p className="auth-form-subtitle">
                {mode === 'login'
                  ? 'Connectez-vous pour accéder à votre espace.'
                  : 'Rejoignez Boutik et gérez votre boutique.'}
              </p>
            </div>

            {/* Tab switcher */}
            <div className="auth-tabs">
              <button
                className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                onClick={() => { setMode('login'); reset() }}
              >
                Se connecter
              </button>
              <button
                className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => { setMode('signup'); reset() }}
              >
                Créer un compte
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              {mode === 'signup' && (
                <div className="auth-field">
                  <label className="auth-label">Nom complet</label>
                  <div className="auth-input-wrap">
                    <input
                      {...register('full_name')}
                      type="text"
                      placeholder="Ex: Ibrahim Moussa"
                      className="auth-input"
                    />
                  </div>
                </div>
              )}

              <div className="auth-field">
                <label className="auth-label">Adresse email</label>
                <div className="auth-input-wrap">
                  <input
                    {...register('email', {
                      required: 'Email requis',
                      pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email invalide' }
                    })}
                    type="email"
                    placeholder="vous@exemple.com"
                    className="auth-input"
                    autoComplete="email"
                  />
                </div>
                {errors.email && <p className="auth-error-msg">{errors.email.message}</p>}
              </div>

              <div className="auth-field">
                <label className="auth-label">Mot de passe</label>
                <div className="auth-input-wrap">
                  <input
                    {...register('password', {
                      required: 'Mot de passe requis',
                      minLength: mode === 'signup' ? { value: 8, message: 'Minimum 8 caractères' } : undefined,
                    })}
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="auth-input has-toggle"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    className="auth-toggle-btn"
                    onClick={() => setShowPass(v => !v)}
                    tabIndex={-1}
                  >
                    {showPass
                      ? <EyeOff size={16} />
                      : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="auth-error-msg">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="auth-submit"
              >
                {loading ? (
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            <p className="auth-footer-note">
              {mode === 'login'
                ? 'Connexion internet requise lors de la première connexion sur un appareil.'
                : 'En créant un compte, vous acceptez nos conditions d\'utilisation.'}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}