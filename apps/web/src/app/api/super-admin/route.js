import { NextResponse } from 'next/server'
import { createSupabaseAdminClient, requireBoutikAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/
const MIN_PASSWORD_LENGTH = 12

function jsonError(message, status) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET() {
  const auth = await requireBoutikAdmin()
  if (auth.error) return jsonError(auth.error, auth.status)

  const admin = createSupabaseAdminClient()
  const { data: profile, error } = await admin
    .from('profiles')
    .select('id, email, full_name, role, is_super_admin, shop_id')
    .eq('is_super_admin', true)
    .maybeSingle()

  if (error) return jsonError('Unable to load the super-admin account', 500)
  if (!profile) return jsonError('Super-admin account not found', 404)

  return NextResponse.json({
    id: profile.id,
    email: profile.email,
    username: profile.email?.split('@')[0] || '',
    full_name: profile.full_name,
    role: profile.role,
    is_super_admin: profile.is_super_admin,
    shop_id: profile.shop_id,
  })
}

export async function PATCH(request) {
  const auth = await requireBoutikAdmin()
  if (auth.error) return jsonError(auth.error, auth.status)

  let body
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid request body', 400)
  }

  const allowedKeys = new Set(['username', 'password'])
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
    return jsonError('Only username and password may be changed', 400)
  }

  const hasUsername = body.username !== undefined
  const hasPassword = body.password !== undefined
  if (!hasUsername && !hasPassword) return jsonError('Provide a username or password', 400)

  const username = hasUsername ? String(body.username).trim().toLowerCase() : null
  if (hasUsername && !USERNAME_PATTERN.test(username)) {
    return jsonError('Username must be 3-32 characters and use letters, numbers, dot, dash, or underscore', 400)
  }
  if (hasPassword && (typeof body.password !== 'string' || body.password.length < MIN_PASSWORD_LENGTH)) {
    return jsonError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 400)
  }

  const admin = createSupabaseAdminClient()
  const { data: target, error: targetError } = await admin
    .from('profiles')
    .select('id, email, role, is_super_admin, shop_id')
    .eq('is_super_admin', true)
    .maybeSingle()

  if (targetError) return jsonError('Unable to load the super-admin account', 500)
  if (!target) return jsonError('Super-admin account not found', 404)
  if (target.is_super_admin !== true) return jsonError('Target is not a super-admin', 403)

  const updates = {}
  const nextEmail = hasUsername ? `${username}@admin.local` : target.email
  if (hasUsername) updates.email = nextEmail

  if (Object.keys(updates).length) {
    const { error } = await admin.from('profiles').update(updates).eq('id', target.id).eq('is_super_admin', true)
    if (error) return jsonError('Unable to update the super-admin profile', 500)
  }

  if (hasUsername || hasPassword) {
    const authUpdates = {}
    if (hasUsername) authUpdates.email = nextEmail
    if (hasPassword) authUpdates.password = body.password

    const { error } = await admin.auth.admin.updateUserById(target.id, authUpdates)
    if (error) {
      if (hasUsername) await admin.from('profiles').update({ email: target.email }).eq('id', target.id).eq('is_super_admin', true)
      return jsonError('Unable to update the super-admin credentials', 500)
    }
  }

  const { data: updated, error: readError } = await admin
    .from('profiles')
    .select('id, email, full_name, role, is_super_admin, shop_id')
    .eq('id', target.id)
    .eq('is_super_admin', true)
    .single()

  if (readError) return jsonError('Super-admin updated, but the account could not be reloaded', 500)
  return NextResponse.json({
    id: updated.id,
    email: updated.email,
    username: updated.email?.split('@')[0] || '',
    full_name: updated.full_name,
    role: updated.role,
    is_super_admin: updated.is_super_admin,
    shop_id: updated.shop_id,
  })
}
