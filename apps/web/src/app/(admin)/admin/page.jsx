'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Users,
  Key,
  Copy,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  Shield,
  LogOut,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  User,
  Store,
  Rocket,
  Send,
  Building2,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

const CODE_LENGTH = 16
const ADMIN_EMAIL_DOMAIN = '@admin.local'

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function formatCode(code) {
  return code.match(/.{1,4}/g)?.join('-') || code
}

export default function AdminPage() {
  const router = useRouter()
  const supabase = getSupabaseClient()

  const [authLoading, setAuthLoading] = useState(true)
  const [loginLoading, setLoginLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [tab, setTab] = useState('codes')
  const [codes, setCodes] = useState([])
  const [users, setUsers] = useState([])
  const [shops, setShops] = useState([])
  const [releases, setReleases] = useState([])
  const [releaseForm, setReleaseForm] = useState({
    version: '',
    title: '',
    notes: '',
    download_url: '',
    updater_url: '',
    mandatory: false,
  })
  const [selectedReleaseId, setSelectedReleaseId] = useState('')
  const [selectedShopIds, setSelectedShopIds] = useState([])
  const [sendingUpdate, setSendingUpdate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [newCodeLabel, setNewCodeLabel] = useState('')
  const [showUsed, setShowUsed] = useState(false)
  const [stats, setStats] = useState({ total: 0, active: 0, codes_available: 0 })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [codesRes, usersRes, shopsRes, releasesRes] = await Promise.all([
        supabase
          .from('access_codes')
          .select('*, creator:created_by(email), user:used_by(email)')
          .order('created_at', { ascending: false }),

        supabase
          .from('profiles')
          .select('*, shop:shop_id(name, city, color_primary)')
          .order('created_at', { ascending: false }),

        supabase
          .from('shops')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('app_releases')
          .select('*')
          .order('created_at', { ascending: false }),
      ])

      if (codesRes.error) throw codesRes.error
      if (usersRes.error) throw usersRes.error
      if (shopsRes.error) throw shopsRes.error
      if (releasesRes.error) throw releasesRes.error

      const codesData = codesRes.data || []
      const usersData = usersRes.data || []
      const shopsData = shopsRes.data || []
      const releasesData = releasesRes.data || []

      setCodes(codesData)
      setUsers(usersData)
      setShops(shopsData)
      setReleases(releasesData)

      setStats({
        total: usersData.length,
        active: usersData.filter((u) => u.shop_id).length,
        codes_available: codesData.filter((c) => !c.used_by).length,
      })
    } catch (err) {
      toast.error(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    async function checkAdminSession() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error || !user) {
          setIsAdmin(false)
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profileError || !profile || profile.role !== 'admin') {
          setIsAdmin(false)
          return
        }

        setIsAdmin(true)
        await fetchData()
      } catch (err) {
        setIsAdmin(false)
      } finally {
        setAuthLoading(false)
      }
    }

    checkAdminSession()
  }, [fetchData, supabase])

  async function handleAdminLogin(e) {
    e.preventDefault()
    setLoginLoading(true)

    try {
      const email = username.includes('@')
        ? username.trim().toLowerCase()
        : `${username.trim().toLowerCase()}${ADMIN_EMAIL_DOMAIN}`

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Connexion échouée')
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile || profile.role !== 'admin') {
        await supabase.auth.signOut()
        throw new Error('Accès refusé. Ce compte n’est pas administrateur.')
      }

      setIsAdmin(true)
      toast.success('Connexion admin réussie')
      await fetchData()
    } catch (err) {
      toast.error(err.message || 'Échec de connexion admin')
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) {
        toast.error('Session expirée. Reconnectez-vous.')
        setIsAdmin(false)
        return
      }

      const code = generateCode()

      const { error } = await supabase.from('access_codes').insert({
        code,
        label: newCodeLabel.trim() || null,
        created_by: user.id,
      })

      if (error) throw error

      toast.success(`Code créé : ${formatCode(code)}`)
      setNewCodeLabel('')
      await fetchData()
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la création du code')
    } finally {
      setGenerating(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer ce code ?')) return

    try {
      const { error } = await supabase.from('access_codes').delete().eq('id', id)
      if (error) throw error
      toast.success('Code supprimé')
      await fetchData()
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la suppression')
    }
  }

  async function handleDeleteShop(shopId) {
    const shop = shops.find(s => s.id === shopId)

    const ok = confirm(
      `Supprimer la boutique "${shop?.name || shopId}" ?\n\nAttention: cela peut supprimer ses données liées.`
    )

    if (!ok) return

    try {
      const { error } = await supabase.rpc('admin_delete_shop', {
        p_shop_id: shopId,
      })

      if (error) throw error

      toast.success('Boutique supprimée')
      await fetchData()
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la suppression de la boutique')
    }
  }

  async function handleCreateRelease(e) {
    e.preventDefault()

    if (!releaseForm.version.trim() || !releaseForm.title.trim()) {
      toast.error('Version et titre requis.')
      return
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { error } = await supabase.from('app_releases').insert({
        version: releaseForm.version.trim(),
        title: releaseForm.title.trim(),
        notes: releaseForm.notes.trim() || null,
        download_url: releaseForm.download_url.trim() || null,
        updater_url: releaseForm.updater_url.trim() || null,
        mandatory: releaseForm.mandatory,
        created_by: user?.id || null,
      })

      if (error) throw error

      toast.success('Mise à jour créée')
      setReleaseForm({
        version: '',
        title: '',
        notes: '',
        download_url: '',
        updater_url: '',
        mandatory: false,
      })
      await fetchData()
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la création')
    }
  }

  async function handleSendUpdate() {
    if (!selectedReleaseId) {
      toast.error('Choisissez une mise à jour.')
      return
    }

    if (!selectedShopIds.length) {
      toast.error('Choisissez au moins une boutique.')
      return
    }

    setSendingUpdate(true)

    try {
      const rows = selectedShopIds.map(shopId => ({
        release_id: selectedReleaseId,
        shop_id: shopId,
        status: 'pending',
      }))

      const { error } = await supabase
        .from('app_update_targets')
        .upsert(rows, { onConflict: 'release_id,shop_id' })

      if (error) throw error

      toast.success('Notification de mise à jour envoyée')
      setSelectedShopIds([])
      await fetchData()
    } catch (err) {
      toast.error(err.message || 'Envoi impossible')
    } finally {
      setSendingUpdate(false)
    }
  }

  function toggleShopSelection(shopId) {
    setSelectedShopIds(prev =>
      prev.includes(shopId)
        ? prev.filter(id => id !== shopId)
        : [...prev, shopId]
    )
  }

  function copyCode(code) {
    navigator.clipboard.writeText(formatCode(code))
    toast.success('Code copié')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setIsAdmin(false)
    setUsername('')
    setPassword('')
    router.refresh()
  }

  const visibleCodes = showUsed ? codes : codes.filter((c) => !c.used_by)

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <p className="text-sm text-slate-400">Vérification de la session admin…</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold text-white text-center mb-2">
            Connexion admin
          </h1>
          <p className="text-slate-400 text-sm text-center mb-8">
            Entrez votre nom d&apos;utilisateur admin et votre mot de passe.
          </p>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Nom d&apos;utilisateur
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: nabil"
                  className="w-full h-11 pl-10 pr-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400 text-sm transition-all"
                  autoComplete="username"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Le nom d&apos;utilisateur <span className="font-mono">nabil</span> sera traité comme
                <span className="font-mono"> nabil@admin.local</span>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400 text-sm transition-all"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading || !username.trim() || !password.trim()}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25"
            >
              {loginLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Se connecter
                  <Shield className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg">Panneau Admin</h1>
            <p className="text-slate-500 text-xs">Boutik</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            title="Déconnexion"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Utilisateurs total', value: stats.total, icon: Users, color: 'blue' },
            { label: 'Boutiques actives', value: stats.active, icon: CheckCircle2, color: 'green' },
            { label: 'Codes disponibles', value: stats.codes_available, icon: Key, color: 'amber' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div
                className={`w-8 h-8 rounded-lg mb-3 flex items-center justify-center ${color === 'blue'
                  ? 'bg-blue-500/20'
                  : color === 'green'
                    ? 'bg-emerald-500/20'
                    : 'bg-amber-500/20'
                  }`}
              >
                <Icon
                  className={`w-4 h-4 ${color === 'blue'
                    ? 'text-blue-400'
                    : color === 'green'
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                    }`}
                />
              </div>
              <p className="font-display text-2xl font-bold">{loading ? '—' : value}</p>
              <p className="text-slate-500 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 mb-6 w-fit">
          {[
            [
              { key: 'codes', label: "Codes d'accès", icon: Key },
              { key: 'users', label: 'Utilisateurs', icon: Users },
              { key: 'shops', label: 'Boutiques', icon: Store },
              { key: 'updates', label: 'Mises à jour', icon: Rocket },
            ]
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'codes' && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                Générer un nouveau code
              </h3>

              <div className="flex gap-3">
                <input
                  value={newCodeLabel}
                  onChange={(e) => setNewCodeLabel(e.target.value)}
                  placeholder="Note (optionnel) — ex: Pour Hamza boutique"
                  className="flex-1 h-10 px-4 bg-white/10 border border-white/15 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                />
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="h-10 px-5 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  Générer
                </button>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <h3 className="font-semibold text-sm">Codes ({visibleCodes.length})</h3>
                <button
                  onClick={() => setShowUsed((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  {showUsed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showUsed ? 'Masquer utilisés' : 'Afficher utilisés'}
                </button>
              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-500 text-sm">Chargement…</div>
              ) : visibleCodes.length === 0 ? (
                <div className="p-8 text-center text-slate-600 text-sm">Aucun code disponible</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {visibleCodes.map((code) => (
                    <div key={code.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="flex-none">
                        {code.used_by ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : code.expires_at && new Date(code.expires_at) < new Date() ? (
                          <XCircle className="w-4 h-4 text-red-400" />
                        ) : (
                          <Clock className="w-4 h-4 text-blue-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-mono text-sm font-bold tracking-widest ${code.used_by ? 'text-slate-500 line-through' : 'text-white'
                              }`}
                          >
                            {formatCode(code.code)}
                          </span>

                          {code.used_by ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                              Utilisé
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/20">
                              Disponible
                            </span>
                          )}

                          {code.label && (
                            <span className="text-xs text-slate-500 truncate">— {code.label}</span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 mt-0.5">
                          Créé le {format(new Date(code.created_at), 'dd MMM yyyy', { locale: fr })}
                          {code.used_by && ` · Utilisé par ${code.user?.email || '—'}`}
                          {code.used_at && ` · Le ${format(new Date(code.used_at), 'dd MMM yyyy à HH:mm', { locale: fr })}`}
                        </p>
                      </div>

                      {!code.used_by && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => copyCode(code.code)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            title="Copier"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(code.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="font-semibold text-sm">Tous les utilisateurs ({users.length})</h3>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500 text-sm">Chargement…</div>
            ) : (
              <div className="divide-y divide-white/5">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-none"
                      style={{ background: u.shop?.color_primary || '#374151' }}
                    >
                      {(u.full_name || u.email || '?')[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{u.full_name || '—'}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>

                    <div className="text-right">
                      {u.shop ? (
                        <div>
                          <p className="text-xs text-emerald-400 font-medium">{u.shop.name}</p>
                          <p className="text-xs text-slate-600">{u.shop.city || '—'}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600">Pas de boutique</span>
                      )}
                    </div>

                    <div className="flex-none">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-white/5 text-slate-500'
                          }`}
                      >
                        {u.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'shops' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="font-semibold text-sm">Boutiques ({shops.length})</h3>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500 text-sm">Chargement…</div>
            ) : shops.length === 0 ? (
              <div className="p-8 text-center text-slate-600 text-sm">Aucune boutique</div>
            ) : (
              <div className="divide-y divide-white/5">
                {shops.map((shop) => {
                  const shopUsers = users.filter(u => u.shop_id === shop.id)

                  return (
                    <div key={shop.id} className="px-5 py-4 flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-none"
                        style={{ background: shop.color_primary || '#2563eb' }}
                      >
                        {(shop.name || '?')[0].toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-white">{shop.name || 'Sans nom'}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10">
                            {shopUsers.length} utilisateur{shopUsers.length > 1 ? 's' : ''}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mt-0.5">
                          {shop.city || 'Ville non renseignée'} {shop.address ? `· ${shop.address}` : ''}
                        </p>

                        <p className="text-[11px] text-slate-600 mt-1 font-mono">
                          ID: {shop.id}
                        </p>

                        {shopUsers.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {shopUsers.map(u => (
                              <span key={u.id} className="text-xs px-2 py-1 rounded-lg bg-white/5 text-slate-400">
                                {u.full_name || u.email}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteShop(shop.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                        title="Supprimer la boutique"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'updates' && (
          <div className="space-y-5">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Rocket className="w-4 h-4 text-blue-400" />
                Créer une mise à jour
              </h3>

              <form onSubmit={handleCreateRelease} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={releaseForm.version}
                    onChange={(e) => setReleaseForm(prev => ({ ...prev, version: e.target.value }))}
                    placeholder="Version ex: 0.1.1"
                    className="h-10 px-4 bg-white/10 border border-white/15 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />

                  <input
                    value={releaseForm.title}
                    onChange={(e) => setReleaseForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Titre ex: Nouvelle version disponible"
                    className="h-10 px-4 bg-white/10 border border-white/15 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>

                <textarea
                  value={releaseForm.notes}
                  onChange={(e) => setReleaseForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notes de version"
                  rows={3}
                  className="w-full px-4 py-3 bg-white/10 border border-white/15 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />

                <input
                  value={releaseForm.download_url}
                  onChange={(e) => setReleaseForm(prev => ({ ...prev, download_url: e.target.value }))}
                  placeholder="Lien de téléchargement manuel optionnel"
                  className="w-full h-10 px-4 bg-white/10 border border-white/15 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />

                <label className="flex items-center gap-2 text-sm text-slate-400">
                  <input
                    type="checkbox"
                    checked={releaseForm.mandatory}
                    onChange={(e) => setReleaseForm(prev => ({ ...prev, mandatory: e.target.checked }))}
                  />
                  Mise à jour obligatoire
                </label>

                <button
                  type="submit"
                  className="h-10 px-5 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Créer
                </button>
              </form>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                Envoyer une mise à jour aux boutiques
              </h3>

              <div className="space-y-4">
                <select
                  value={selectedReleaseId}
                  onChange={(e) => setSelectedReleaseId(e.target.value)}
                  className="w-full h-10 px-4 bg-slate-900 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="">— Choisir une mise à jour —</option>
                  {releases.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.version} — {r.title}
                    </option>
                  ))}
                </select>

                <div className="grid sm:grid-cols-2 gap-2">
                  {shops.map(shop => (
                    <label
                      key={shop.id}
                      className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${selectedShopIds.includes(shop.id)
                          ? 'bg-blue-500/10 border-blue-500/40'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedShopIds.includes(shop.id)}
                        onChange={() => toggleShopSelection(shop.id)}
                      />
                      <div>
                        <p className="text-sm font-medium text-white">{shop.name}</p>
                        <p className="text-xs text-slate-500">
                          {users.filter(u => u.shop_id === shop.id).length} utilisateur(s)
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  onClick={handleSendUpdate}
                  disabled={sendingUpdate}
                  className="h-11 px-5 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
                >
                  <Send className="w-4 h-4" />
                  {sendingUpdate ? 'Envoi…' : 'Envoyer aux boutiques sélectionnées'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}