// apps/web/src/app/api/desktop-update/route.js

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Tell Next this route is dynamic/server-only and must be skipped entirely
// during a static export build. With this present, `next build` with
// `output: 'export'` will not attempt to execute/prerender this handler.
export const dynamic = 'force-dynamic'

// Use service-role key so this works without auth headers
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function GET() {
  // Defensive guard: if this somehow still gets invoked during a native
  // export build (e.g. someone forgets to set NEXT_PUBLIC_NATIVE_BUILD),
  // bail out instantly instead of hitting the network/DB at build time.
  if (process.env.NEXT_PUBLIC_NATIVE_BUILD === 'true') {
    return new NextResponse(null, { status: 204 })
  }

  try {
    const supabase = getSupabaseAdmin()

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