import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { normalizeInputToUploadOriginal } from '@/lib/wikimedia'

// 旧正規化は廃止し、必ず upload.wikimedia.org の原本URLに変換して保存する

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const allowed = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean)
  const email = session?.user?.email || ''
  if (!email || (allowed.length > 0 && !allowed.includes(email))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const id = typeof body.id === 'string' ? body.id : undefined
  const name = typeof body.name === 'string' ? body.name : undefined
  const rawUrl = typeof body.photoUrl === 'string' ? body.photoUrl : undefined

  if ((!id && !name) || !rawUrl) {
    return NextResponse.json({ success: false, error: 'Missing id/name or photoUrl' }, { status: 400 })
  }

  const normalized = await normalizeInputToUploadOriginal(rawUrl)
  if (!normalized) {
    return NextResponse.json({ success: false, error: 'Unsupported URL. Provide upload.wikimedia.org or Special:FilePath/File: URL.' }, { status: 400 })
  }

  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceClient() : supabase

  let targetId: string | null = null
  if (id) {
    targetId = id
  } else if (name) {
    const { data: m, error } = await service
      .from('mountains')
      .select('id')
      .eq('name', name)
      .single()
    if (error || !m) {
      return NextResponse.json({ success: false, error: 'Mountain not found by name' }, { status: 404 })
    }
    targetId = m.id
  }

  const { error: upErr } = await service
    .from('mountains')
    .update({ photo_url: normalized })
    .eq('id', targetId!)

  if (upErr) {
    return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: targetId, photo_url: normalized })
}
