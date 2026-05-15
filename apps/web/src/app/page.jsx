'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSetting } from '@/lib/db/local'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    async function redirect() {
      const accessGranted = await getSetting('access_granted')
      const shopId = await getSetting('shop_id')
      const offlineReady = await getSetting('offline_ready')

      if (!accessGranted) {
        router.replace('/access-code')
        return
      }

      let session = null

      try {
        const supabase = getSupabaseClient()
        const { data } = await supabase.auth.getSession()
        session = data?.session || null
      } catch {
        session = null
      }

      if (!session) {
        if (!navigator.onLine && offlineReady && shopId) {
          router.replace('/dashboard')
          return
        }

        router.replace('/auth')
        return
      }

      if (!shopId) {
        router.replace('/setup')
        return
      }

      router.replace('/dashboard')
    }

    redirect()
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