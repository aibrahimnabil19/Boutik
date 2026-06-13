'use client'

import { useEffect, useState } from 'react'
import { Download, MonitorDown, X } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'

function getDismissKey(version) {
  return `boutik_desktop_banner_dismissed_${version || 'latest'}`
}

export default function DesktopDownloadBanner() {
  const [release, setRelease] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_IS_DEMO === 'true') return
    if (process.env.NEXT_PUBLIC_NATIVE_BUILD === 'true') return
    if (typeof window === 'undefined') return
    if (window.__TAURI_INTERNALS__) return

    async function loadLatestRelease() {
      try {
        const supabase = getSupabaseClient()

        const { data, error } = await supabase
          .from('app_releases')
          .select('version, title, download_url, exe_url, msi_url, created_at')
          .eq('platform', 'windows')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) throw error

        if (data?.version) {
          const key = getDismissKey(data.version)
          const alreadyDismissed = localStorage.getItem(key) === 'true'

          if (alreadyDismissed) {
            setDismissed(true)
          }
        }

        setRelease(data || null)
      } catch {
        setRelease(null)
      }
    }

    loadLatestRelease()
  }, [])

  if (dismissed) return null

  if (!release?.download_url && !release?.exe_url && !release?.msi_url) {
    return null
  }

  const url = release.exe_url || release.download_url || release.msi_url

  function closeBanner() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(getDismissKey(release?.version), 'true')
    }

    setDismissed(true)
  }

  return (
  <div className="sticky top-0 z-[9998] bg-slate-950 text-white border-b border-white/10">
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-3 text-sm">
      <div className="flex items-center justify-center gap-2 text-center">
        <MonitorDown className="w-4 h-4 text-blue-300 flex-none" />

        <span className="text-slate-200 text-xs sm:text-sm leading-snug">
          Application desktop Boutik disponible
          {release.version ? ` — version ${release.version}` : ''}
        </span>
      </div>

      <div className="flex items-center justify-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
        >
          <Download className="w-3.5 h-3.5" />
          Télécharger
        </a>

        <button
          type="button"
          onClick={closeBanner}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition"
          title="Fermer"
        >
          <X className="w-3.5 h-3.5" />
          <span>Fermer</span>
        </button>
      </div>
    </div>
  </div>
)
}