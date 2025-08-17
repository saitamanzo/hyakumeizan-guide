import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 簡易: Wikipedia/Wikimediaから各山の代表画像を1枚取得して mountains.photo_url を更新
// 注意: 本APIは管理者のみ実行可。過剰な呼び出しはWikimediaのレート制限に配慮してください。

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

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const allowed = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean)
  const email = session?.user?.email || ''
  if (!email || (allowed.length > 0 && !allowed.includes(email))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const raw = await request.json().catch(() => ({})) as unknown
  const body = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const limit = Math.max(1, Math.min(100, Number(body.limit ?? 100)))
  const dryRun = Boolean(body.dryRun)
  const force = Boolean(body.force)

  // 効率化: 通常は photo_url IS NULL の行のみを対象にする（force時は全件対象）
  const baseQuery = supabase
    .from('mountains')
    .select('id,name,photo_url')
    .order('name', { ascending: true })
    .limit(limit)
  const { data: mountains, error } = await (
    !force ? baseQuery.is('photo_url', null) : baseQuery
  )
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const updates: Array<{ id: string, photo_url: string } | null> = await Promise.all(
    (mountains || []).map(async (m) => {
      // 非forceでも上のクエリでNULLに絞っているが、二重防御でチェック
      if (!force && m.photo_url) return null
      const candidates = [m.name, `${m.name} (山)`]
      for (const t of candidates) {
        const url = await fetchWikimediaImage(t)
        if (url) {
          return { id: m.id, photo_url: url }
        }
      }
      return null
    })
  )

  const toApply = updates.filter((u): u is { id: string, photo_url: string } => Boolean(u))

  if (dryRun) {
    return NextResponse.json({ success: true, dryRun: true, force, updates: toApply }, { status: 200 })
  }

  for (const u of toApply) {
    const { error: upErr } = await supabase.from('mountains').update({ photo_url: u.photo_url }).eq('id', u.id)
    if (upErr) {
      console.warn('update failed', u.id, upErr.message)
    }
  }

  return NextResponse.json({ success: true, force, applied: toApply.length }, { status: 200 })
}
