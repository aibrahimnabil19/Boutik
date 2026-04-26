// Global app state with Zustand.
// Holds: current user, shop info, theme colors.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAppStore = create(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      profile: null,

      // Shop
      shop: null,

      // UI
      sidebarOpen: true,

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setShop: (shop) => set({ shop }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      /** Apply shop colors to CSS variables on <html> */
      applyTheme: () => {
        const { shop } = get()
        if (!shop) return
        const root = document.documentElement
        root.style.setProperty('--color-primary', shop.color_primary || '#1a56db')
        root.style.setProperty('--color-primary-dark', darken(shop.color_primary || '#1a56db'))
        root.style.setProperty('--color-primary-light', lighten(shop.color_primary || '#1a56db'))
        root.style.setProperty('--color-accent', shop.color_accent || '#e3a008')
      },

      clear: () => set({ user: null, profile: null, shop: null }),
    }),
    {
      name: 'bm-suite-store',
      // Only persist non-sensitive fields
      partialize: (state) => ({
        shop: state.shop,
        profile: state.profile,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
)

// ─── Simple color helpers ────────────────────────────────────────────────────
function hexToHsl(hex) {
  let r = parseInt(hex.slice(1,3),16)/255
  let g = parseInt(hex.slice(3,5),16)/255
  let b = parseInt(hex.slice(5,7),16)/255
  const max = Math.max(r,g,b), min = Math.min(r,g,b)
  let h, s, l = (max+min)/2
  if (max === min) { h = s = 0 }
  else {
    const d = max - min
    s = l > 0.5 ? d/(2-max-min) : d/(max+min)
    switch(max) {
      case r: h = ((g-b)/d + (g<b?6:0))/6; break
      case g: h = ((b-r)/d + 2)/6; break
      case b: h = ((r-g)/d + 4)/6; break
    }
  }
  return [Math.round(h*360), Math.round(s*100), Math.round(l*100)]
}

function hslToHex(h,s,l) {
  l /= 100; const a = s*Math.min(l,1-l)/100
  const f = n => { const k=(n+h/30)%12; const c=l-a*Math.max(Math.min(k-3,9-k,1),-1); return Math.round(255*c).toString(16).padStart(2,'0') }
  return `#${f(0)}${f(8)}${f(4)}`
}

function darken(hex, amount = 15) {
  try { const [h,s,l] = hexToHsl(hex); return hslToHex(h, s, Math.max(0, l - amount)) } catch { return hex }
}

function lighten(hex, amount = 40) {
  try { const [h,s,l] = hexToHsl(hex); return hslToHex(h, s, Math.min(100, l + amount)) } catch { return hex }
}