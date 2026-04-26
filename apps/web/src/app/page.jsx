'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSetting } from '@/lib/db/local'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    async function redirect() {
      // 1. Has the user entered an access code on this device?
      const accessGranted = await getSetting('access_granted')
      if (!accessGranted) {
        router.replace('/access-code')
        return
      }

      // 2. Is the user logged in?
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/auth')
        return
      }

      // 3. Does the user have a shop set up?
      const shopId = await getSetting('shop_id')
      if (!shopId) {
        router.replace('/setup')
        return
      }

      // 4. All good — go to the dashboard
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