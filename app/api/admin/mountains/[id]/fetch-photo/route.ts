import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function fetchWikimediaImage(title: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      action: 'query',
      prop: 'pageimages',
      piprop: 'thumbnail',
      pithumbsize: '800',
      redirects: '1',
      format: 'json',
      origin: '*',
      titles: title,
    })
    const url = `https://ja.wikipedia.org/w/api.php?${params.toString()}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const data: unknown = await res.json()
    if (!data || typeof data !== 'object') return null
    const query = (data as Record<string, unknown>).query
    if (!query || typeof query !== 'object') return null
    const pages = (query as Record<string, unknown>).pages
    if (!pages || typeof pages !== 'object') return null
    const values = Object.values(pages)
    if (!values.length) return null
    const first = values[0]
    if (!first || typeof first !== 'object') return null
    const tn = (first as Record<string, unknown>).thumbnail
    if (!tn || typeof tn !== 'object') return null
    const src = (tn as Record<string, unknown>).source
    const thumb = typeof src === 'string' ? src : undefined
    return thumb || null
  } catch {
    return null
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function POST(request: Request, context: any) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const allowed = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean)
  const email = session?.user?.email || ''
  if (!email || (allowed.length > 0 && !allowed.includes(email))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await context.params
  const { data: m, error } = await supabase.from('mountains').select('id,name,photo_url').eq('id', id).single()
  if (error || !m) {
    return NextResponse.json({ success: false, error: error?.message || 'Not found' }, { status: 404 })
  }

  const raw = await request.json().catch(() => ({})) as unknown
  const body = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const force = Boolean(body.force)

  if (m.photo_url && !force) {
    return NextResponse.json({ success: true, skipped: true, reason: 'Already has photo_url' })
  }

  const candidates = [m.name, `${m.name} (山)`]
  let url: string | null = null
  for (const t of candidates) {
    url = await fetchWikimediaImage(t)
    if (url) break
  }
  if (!url) {
    return NextResponse.json({ success: false, error: 'NotFoundOnWikipedia' }, { status: 404 })
  }

  const { error: upErr } = await supabase.from('mountains').update({ photo_url: url }).eq('id', id)
  if (upErr) {
    return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, photo_url: url })
}
