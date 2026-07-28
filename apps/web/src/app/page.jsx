'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSetting, getStoredSessionState, setSetting } from '@/lib/db/local'
import { isDemo, resetDemoStorageIfNeeded } from '@/lib/demo'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    let failSafeTimer = null

    async function redirect() {
      failSafeTimer = setTimeout(async () => {
        if (!mounted) return
        console.error('[root] redirect timeout exceeded')
        try {
          const { canOpenStoredSession } = await getStoredSessionState()
          if (canOpenStoredSession) {
            router.replace('/dashboard')
            return
          }
        } catch (e) {
          console.warn('[root] fail-safe cache check failed', e?.message)
        }
        router.replace('/auth')
      }, 5000)

      try {
        let storedState = {
          accessGranted: null,
          shopId: null,
          offlineLoginActive: null,
          canOpenStoredSession: false,
        }

        try {
          storedState = await getStoredSessionState()
        } catch (err) {
          console.error('[root] getSetting failed (likely IndexedDB issue)', err?.message)
        }

        const { accessGranted, shopId, offlineLoginActive, canOpenStoredSession } = storedState

        if (!mounted) return

        if (isDemo()) {
          try {
            await resetDemoStorageIfNeeded()
            await setSetting('access_granted', true)

            const demoUser = await getSetting('demo_auth_user')
            const demoShopId = await getSetting('shop_id')

            if (!demoUser) {
              router.replace('/auth')
              return
            }

            if (!demoShopId) {
              router.replace('/setup')
              return
            }

            router.replace('/dashboard')
            return
          } catch (err) {
            console.error('[root] demo mode init failed', err?.message)
            router.replace('/auth')
            return
          }
        }

        let session = null

        try {
          const supabase = getSupabaseClient()
          const sessionPromise = supabase.auth.getSession()
          const timeoutPromise = new Promise((resolve) =>
            setTimeout(() => resolve({ data: { session: null }, timedOut: true }), 3000)
          )
          const { data } = await Promise.race([sessionPromise, timeoutPromise])
          session = data?.session || null
        } catch (err) {
          console.warn('[root] supabase.auth.getSession failed', err?.message)
          session = null
        }

        if (!mounted) return

        if (!session) {
          if (canOpenStoredSession) {
            router.replace('/dashboard')
            return
          }
          if (!accessGranted) {
            router.replace('/access-code')
            return
          }
          router.replace('/auth')
          return
        }

        if (offlineLoginActive === false) {
          router.replace('/auth')
          return
        }

        if (!shopId) {
          router.replace('/setup')
          return
        }

        router.replace('/dashboard')
      } catch (err) {
        console.error('[root] unexpected error in redirect', err)
        if (mounted) {
          router.replace('/auth')
        }
      } finally {
        if (failSafeTimer) clearTimeout(failSafeTimer)
      }
    }

    redirect()

    return () => {
      mounted = false
      if (failSafeTimer) clearTimeout(failSafeTimer)
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-gray-500">Chargement…</p>
      </div>
    </div>
  )
}
