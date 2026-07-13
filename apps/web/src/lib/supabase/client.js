// apps/web/src/lib/supabase/client.js
import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

let supabase
let initError = null

function isNativeBuild() {
  return (
    process.env.NEXT_PUBLIC_NATIVE_BUILD === 'true' ||
    (typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__)
  )
}

export function getSupabaseClient() {
  if (!supabase && !initError) {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!url || !anonKey) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
      }

      if (isNativeBuild()) {
        supabase = createClient(url, anonKey, {
          auth: {
            persistSession: true,
            storage: window.localStorage,
            autoRefreshToken: true,
            detectSessionInUrl: false,
          },
        })
      } else {
        supabase = createBrowserClient(url, anonKey)
      }
    } catch (err) {
      initError = err
      console.error('[supabase client] initialization failed', err?.message)
      throw err
    }
  }

  if (initError) {
    throw initError
  }

  return supabase
}