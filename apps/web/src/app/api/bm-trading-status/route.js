import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function bmHeaders() {
  return {
    'x-admin-secret': process.env.BM_TRADING_ADMIN_SECRET || '',
    'Content-Type': 'application/json',
  }
}

export async function GET() {
  if (process.env.NEXT_PUBLIC_NATIVE_BUILD === 'true') {
    return new NextResponse(null, { status: 204 })
  }

  try {
    const base = process.env.BM_TRADING_API_URL
    if (!base) throw new Error('BM_TRADING_API_URL non configuré')

    const res = await fetch(`${base}/api/site-status`, {
      headers: bmHeaders(),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`BM Trading a répondu ${res.status}`)

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  if (process.env.NEXT_PUBLIC_NATIVE_BUILD === 'true') {
    return new NextResponse(null, { status: 204 })
  }

  try {
    const base = process.env.BM_TRADING_API_URL
    if (!base) throw new Error('BM_TRADING_API_URL non configuré')

    const body = await request.json()

    const res = await fetch(`${base}/api/site-status`, {
      method: 'POST',
      headers: bmHeaders(),
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || `BM Trading a répondu ${res.status}`)
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}