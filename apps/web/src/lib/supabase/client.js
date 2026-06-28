import { createBrowserClient } from '@supabase/ssr'

let supabase
let initError = null

export function getSupabaseClient() {
  if (!supabase && !initError) {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!url || !anonKey) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
      }

      supabase = createBrowserClient(url, anonKey)
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