// The main authenticated app shell: sidebar + topbar + theme injection.

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { getSetting, setSetting } from '@/lib/db/local'
import { useAppStore } from '@/context/store'
import { startSyncListener, runSync, pullFromRemote } from '@/lib/sync/engine'
import {
  LayoutDashboard, Package, ShoppingCart, TrendingUp,
  FileText, Users, Truck, PieChart, Wallet, BookOpen,
  Settings, LogOut, Menu, X, Wifi, WifiOff, ChevronRight,
} from 'lucide-react'
import AppUpdatePrompt from '@/components/AppUpdatePrompt'
import { isDemo, resetDemoStorageIfNeeded } from '@/lib/demo'

const NAV = [
  { label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },

  { separator: 'Opérations' },
  { label: 'Ventes', href: '/ventes', icon: TrendingUp },
  { label: 'Entrées de stock', href: '/achats', icon: ShoppingCart },
  { label: 'Charges', href: '/depenses', icon: Wallet },

  { separator: 'Tiers' },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Fournisseurs', href: '/fournisseurs', icon: Truck },

  { separator: 'Documents' },
  { label: 'Documents', href: '/documents', icon: FileText },

  { separator: 'Catalogue & Analyse' },
  { label: 'Catalogue / Stock', href: '/produits', icon: Package },
  { label: 'Rentabilité', href: '/rentabilite', icon: PieChart },
  { label: 'Rapports financiers', href: '/rapports-financiers', icon: BookOpen },
]

export default function AppLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { shop, setShop, setProfile, setUser, applyTheme, sidebarOpen, toggleSidebar } = useAppStore()
  const [online, setOnline] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    let cleanupSync = null
    let mounted = true

    async function init() {
      if (isDemo()) {
        await resetDemoStorageIfNeeded()
        await setSetting('access_granted', true)

        const demoUser = await getSetting('demo_auth_user')
        const shopId = await getSetting('shop_id')
        const cachedShop = await getSetting('cached_shop')

        if (!demoUser) {
          router.replace('/auth')
          return
        }

        if (!shopId || !cachedShop) {
          router.replace('/setup')
          return
        }

        setUser(demoUser)
        setShop(cachedShop)
        applyTheme()
        setLoaded(true)
        return
      }
      try {
        const cachedShopId = await getSetting('shop_id')
        const cachedShop = await getSetting('cached_shop')
        const offlineReady = await getSetting('offline_ready')

        if (!navigator.onLine && offlineReady && cachedShopId) {
          if (cachedShop) {
            setShop(cachedShop)
            applyTheme(cachedShop)
          }

          setLoaded(true)
          cleanupSync = startSyncListener(cachedShopId)
          return
        }

        if (cachedShopId && cachedShop) {
          setShop(cachedShop)
          applyTheme(cachedShop)
          setLoaded(true)
        }

        const supabase = getSupabaseClient()

        // Add timeout so the app never hangs forever
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Session timeout')),
            navigator.onLine ? 2500 : 300
          )
        )

        let session
        try {
          const { data } = await Promise.race([sessionPromise, timeoutPromise])
          session = data?.session
        } catch (err) {
          // On timeout or network error, check if we have cached shop data
          const shopId = cachedShopId
          if (!shopId) {
            router.replace('/auth')
            return
          }
          // Let the app load offline with cached data
          if (!mounted) return
          setLoaded(true)
          return
        }

        if (!session) {
          const shopId = await getSetting('shop_id')
          const cachedShop = await getSetting('cached_shop')
          const offlineReady = await getSetting('offline_ready')

          if (!navigator.onLine && offlineReady && shopId) {
            if (cachedShop) {
              setShop(cachedShop)
              applyTheme(cachedShop)
            }

            setLoaded(true)
            cleanupSync = startSyncListener(shopId)
            return
          }

          router.replace('/auth')
          return
        }

        const shopId = await getSetting('shop_id')
        if (!shopId) {
          router.replace('/setup')
          return
        }

        // Load profile + shop in parallel, with individual error handling
        const [profileRes, shopRes] = await Promise.allSettled([
          supabase.from('profiles').select('*').eq('id', session.user.id).single(),
          supabase.from('shops').select('*').eq('id', shopId).single(),
        ])

        if (!mounted) return

        if (profileRes.status === 'fulfilled' && profileRes.value.data) {
          setProfile(profileRes.value.data)
        }
        if (shopRes.status === 'fulfilled' && shopRes.value.data) {
          setShop(shopRes.value.data)
          applyTheme(shopRes.value.data)
          await setSetting('cached_shop', shopRes.value.data)
          await setSetting('offline_ready', true)
        }

        setUser(session.user)

        // Mark as loaded BEFORE sync so the app shows immediately
        setLoaded(true)

        // Run sync in background, don't block UI
        if (navigator.onLine) {
          Promise.resolve()
            .then(() => pullFromRemote(shopId))
            .then(() => runSync(shopId))
            .catch(err => console.warn('[background sync failed]', err?.message))
        }

        cleanupSync = startSyncListener(shopId)
      } catch (err) {
        console.error('[layout init failed]', err)
        if (!mounted) return
        // Still try to show app if we have cached data
        const shopId = await getSetting('shop_id').catch(() => null)
        if (shopId) {
          setLoaded(true)
        } else {
          setLoadError(err.message)
          // Redirect after a moment
          setTimeout(() => router.replace('/auth'), 2000)
        }
      }
    }

    init()

    return () => {
      mounted = false
      if (cleanupSync) cleanupSync()
    }
  }, [router, setProfile, setShop, setUser, applyTheme])

  // Apply theme whenever shop changes
  useEffect(() => {
    if (shop) applyTheme()
  }, [shop, applyTheme])

  // Online/offline indicator
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    setOnline(navigator.onLine)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 text-sm mb-2">Erreur de connexion</p>
          <p className="text-gray-400 text-xs">Redirection en cours…</p>
        </div>
      </div>
    )
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
          <p className="text-sm text-gray-400">Chargement…</p>
        </div>
      </div>
    )
  }

  async function handleLogout() {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {process.env.NEXT_PUBLIC_IS_DEMO === 'true' && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white text-xs font-semibold text-center py-1.5">
          🧪 Version démo — les données sont temporaires et peuvent être réinitialisées
        </div>
      )}
      {/* ── Sidebar ── */}
      <aside className={`
        flex flex-col h-full border-r border-gray-100 bg-white transition-all duration-300 z-20
        ${sidebarOpen ? 'w-60' : 'w-16'}
        fixed lg:relative
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo area */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 min-h-[76px]">
          {shop?.logo_url ? (
            <img src={shop.logo_url} alt="Logo" className="w-12 h-12 rounded-xl object-contain flex-none" />
          ) : (
            <div className="w-12 h-12 rounded-xl flex-none flex items-center justify-center text-white text-base font-bold"
              style={{ background: 'var(--color-primary)' }}>
              {(shop?.name || 'B')[0]}
            </div>
          )}
          {sidebarOpen && (
            <div className="min-w-0 overflow-hidden">
              <p className="font-display font-bold text-sm text-gray-900 truncate">{shop?.name || 'Ma Boutique'}</p>
              <p className="text-xs text-gray-400 truncate">{shop?.city || ''}</p>
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map((item, i) => {
            if (item.separator) {
              return sidebarOpen ? (
                <p key={i} className="text-xs font-semibold text-gray-400 px-2 pt-4 pb-1 uppercase tracking-wider">
                  {item.separator}
                </p>
              ) : <div key={i} className="my-1 border-t border-gray-100" />
            }

            const active = pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all group ${active
                  ? 'text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                  style={active ? { background: 'var(--color-primary)' } : {}}
                >
                  <Icon className="w-4 h-4 flex-none" />
                  {sidebarOpen && <span className="text-sm font-medium truncate">{item.label}</span>}
                  {sidebarOpen && active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-gray-100 p-2 space-y-0.5">
          <Link href="/settings">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-50 cursor-pointer transition-all">
              <Settings className="w-4 h-4 flex-none" />
              {sidebarOpen && <span className="text-sm font-medium">Paramètres</span>}
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-4 h-4 flex-none" />
            {sidebarOpen && <span className="text-sm font-medium">Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-10 lg:hidden" onClick={toggleSidebar} />
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 gap-4 flex-none">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3 ml-auto">
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${online ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {online ? 'En ligne' : 'Hors ligne'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 overflow-y-auto ${process.env.NEXT_PUBLIC_IS_DEMO === 'true' ? 'pt-7' : ''}`}>
          {children}
        </main>

        <AppUpdatePrompt />
      </div>
    </div>
  )
}