// apps/web/src/app/api/desktop-update/route.js
//
// Serves the Tauri v2 update manifest.
// Point tauri.conf.json → plugins.updater.endpoints to this URL.
//
// Expected response shape (Tauri v2):
// {
//   "version": "0.1.5",
//   "notes": "…",
//   "pub_date": "2026-05-17T00:00:00Z",
//   "platforms": {
//     "windows-x86_64": { "signature": "…", "url": "…" }
//   }
// }

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Use service-role key so this works without auth headers
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET() {
  try {
    // Fetch the latest windows release that has a valid exe signature
    const { data: release, error } = await supabase
      .from('app_releases')
      .select('version, notes, exe_url, msi_url, exe_signature, msi_signature, created_at')
      .eq('platform', 'windows')
      .not('exe_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    // No release yet — return 204 so Tauri knows there's no update
    if (!release) {
      return new NextResponse(null, { status: 204 })
    }

    // No signature means auto-update can't verify the binary — return 204
    const signature = release.exe_signature || release.msi_signature
    const url       = release.exe_url       || release.msi_url

    if (!signature || !url) {
      return new NextResponse(null, { status: 204 })
    }

    const manifest = {
      version:  release.version,
      notes:    release.notes   || '',
      pub_date: release.created_at,
      platforms: {
        'windows-x86_64': {
          signature,
          url,
        },
        // Add more platforms here when you build for macOS / Linux
      },
    }

    return NextResponse.json(manifest, {
      headers: {
        // Allow Tauri desktop app to fetch this from any origin
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[desktop-update] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}