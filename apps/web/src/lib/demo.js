export function isDemo() {
  return process.env.NEXT_PUBLIC_IS_DEMO === 'true'
}

export function isDemoLocalOnly() {
  return (
    process.env.NEXT_PUBLIC_IS_DEMO === 'true' ||
    process.env.NEXT_PUBLIC_DEMO_LOCAL_ONLY === 'true'
  )
}

export async function resetDemoStorageIfNeeded() {
  if (!isDemo()) return
  if (process.env.NEXT_PUBLIC_DEMO_RESET_ON_SESSION !== 'true') return
  if (typeof window === 'undefined') return

  const key = 'boutik_demo_session_started'

  // sessionStorage is cleared when the browser session closes.
  if (sessionStorage.getItem(key) === 'true') return

  const { localDb } = await import('@/lib/db/local')

  for (const table of localDb.tables) {
    await table.clear()
  }

  localStorage.removeItem('bm-suite-store')
  sessionStorage.setItem(key, 'true')
}