// apps/web/src/app/(app)/layout.jsx
// The main authenticated app shell: sidebar + topbar + theme injection.

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { getSetting } from '@/lib/db/local'
import { useAppStore } from '@/context/store'
import { startSyncListener } from '@/lib/sync/engine'
import {
  LayoutDashboard, Package, ShoppingCart, TrendingUp,
  Receipt, FileText, FileBadge, Users, Truck,
  PieChart, Wallet, Settings, LogOut, Menu, X,
  Wifi, WifiOff, ChevronRight
} from 'lucide-react'

const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Produits', href: '/produits', icon: Package },
  { separator: 'Transactions' },
  { label: 'Achats', href: '/achats', icon: ShoppingCart },
  { label: 'Ventes', href: '/ventes', icon: TrendingUp },
  { label: 'Dépenses', href: '/depenses', icon: Wallet },
  { separator: 'Documents' },
  { label: 'Factures', href: '/factures', icon: Receipt },
  { label: 'Proformas', href: '/proformas', icon: FileText },
  { separator: 'Tiers' },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Fournisseurs', href: '/fournisseurs', icon: Truck },
  { separator: 'Analyse' },
  { label: 'Stock', href: '/stock', icon: Package },
  { label: 'Rentabilité', href: '/rentabilite', icon: PieChart },
]

export default function AppLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { shop, setShop, setProfile, setUser, applyTheme, sidebarOpen, toggleSidebar } = useAppStore()
  const [online, setOnline] = useState(true)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function init() {
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/auth')
        return
      }

      const shopId = await getSetting('shop_id')
      if (!shopId) {
        router.replace('/setup')
        return
      }

      // Load profile and shop
      const [profileRes, shopRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('shops').select('*').eq('id', shopId).single(),
      ])

      if (profileRes.data) setProfile(profileRes.data)
      if (shopRes.data) { setShop(shopRes.data); }
      setUser(session.user)
      setLoaded(true)
    }

    init()
  }, [])

  // Apply theme whenever shop changes
  useEffect(() => {
    if (shop) applyTheme()
  }, [shop])

  // Sync listener
useEffect(() => {
  if (!shop?.id) return

  let cleanup = () => {}

  async function bootSync() {
    const { pullFromRemote, runSync, startSyncListener } = await import('@/lib/sync/engine')

    await pullFromRemote(shop.id)
    await runSync(shop.id)
    cleanup = startSyncListener(shop.id)
  }

  bootSync()

  return () => cleanup()
}, [shop?.id])

  // Online/offline indicator
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    setOnline(navigator.onLine)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

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
      {/* ── Sidebar ── */}
      <aside className={`
        flex flex-col h-full border-r border-gray-100 bg-white transition-all duration-300 z-20
        ${sidebarOpen ? 'w-60' : 'w-16'}
        fixed lg:relative
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo area */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 min-h-[64px]">
          {shop?.logo_url ? (
            <img src={shop.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-contain flex-none" />
          ) : (
            <div className="w-8 h-8 rounded-lg flex-none flex items-center justify-center text-white text-xs font-bold"
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
            {/* Online indicator */}
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${online ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}>
              {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {online ? 'En ligne' : 'Hors ligne'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}