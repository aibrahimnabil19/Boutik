import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from './server'

export async function requireBoutikAdmin() {
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Authentication required', status: 401 }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, is_super_admin')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    return { error: 'Administrator access required', status: 403 }
  }

  return { user, profile, supabase }
}

export function createSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) throw new Error('Server configuration error')

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
