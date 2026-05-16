'use client'

import { useEffect, useState } from 'react'
import { Download, MonitorDown } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function DesktopDownloadBanner() {
  const [release, setRelease] = useState(null)

  useEffect(() => {
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
        setRelease(data || null)
      } catch {
        setRelease(null)
      }
    }

    loadLatestRelease()
  }, [])

  if (!release?.download_url && !release?.exe_url && !release?.msi_url) {
    return null
  }

  const url = release.exe_url || release.download_url || release.msi_url

  return (
    <div className="sticky top-0 z-[9998] bg-slate-950 text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-3 text-sm">
        <MonitorDown className="w-4 h-4 text-blue-300" />
        <span className="text-slate-200">
          Application desktop Boutik disponible
          {release.version ? ` — version ${release.version}` : ''}
        </span>

        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
        >
          <Download className="w-3.5 h-3.5" />
          Télécharger
        </a>
      </div>
    </div>
  )
}