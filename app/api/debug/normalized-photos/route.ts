import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type Norm = { src: string; filePageUrl: string } | null
type DebugItem = {
  id: string
  name: string
  original: string | null
  normalized: string | null
  externalStatus?: number | 'fetch_error'
  externalContentType?: string | null
  proxyUrl: string | null
  filePageUrl: string | null
  status?: number | 'fetch_error'
  contentType?: string | null
  error?: string
}

function buildFilePageUrl(fileName: string, host: string) {
  const pageHost = host === 'ja.wikipedia.org' ? 'ja.wikipedia.org' : 'commons.wikimedia.org'
  return `https://${pageHost}/wiki/File:${encodeURIComponent(fileName)}`
}

function normalizePhotoUrl(raw: string | null | undefined, width = 640): Norm {
  if (!raw) return null
  let external: string | null = null
  let filePageUrl: string | null = null
  try {
    const u = new URL(raw)
    if (u.hostname === 'upload.wikimedia.org') {
      const parts = u.pathname.split('/')
      const isThumb = parts.includes('thumb')
      const rawName = isThumb ? parts[parts.length - 2] : parts[parts.length - 1]
      const fileName = decodeURIComponent(rawName)
      if (fileName) {
        external = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${width}`
        filePageUrl = buildFilePageUrl(fileName, 'commons.wikimedia.org')
      }
    }
    if (!external && (u.hostname.endsWith('wikipedia.org') || u.hostname.endsWith('wikimedia.org'))) {
      if (/\/wiki\/Special:FilePath\//.test(u.pathname)) {
        try {
          const cu = new URL(raw)
          if (!cu.searchParams.has('width')) cu.searchParams.set('width', String(width))
          external = cu.toString()
          const name = cu.pathname.replace('/wiki/Special:FilePath/', '')
          if (name) filePageUrl = buildFilePageUrl(decodeURIComponent(name), u.hostname)
        } catch {
          external = raw
        }
      } else if (u.pathname.startsWith('/wiki/')) {
        const fileFromHash = u.hash && u.hash.startsWith('#/media/') ? decodeURIComponent(u.hash.replace('#/media/', '')) : ''
        const fileFromPath = decodeURIComponent(u.pathname.replace('/wiki/', ''))
        if (fileFromHash) {
          const fileName = fileFromHash.replace(/^ファイル:|^File:/i, '')
          external = `${u.protocol}//${u.hostname}/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${width}`
          filePageUrl = buildFilePageUrl(fileName, u.hostname)
        } else if (/^(?:ファイル:|File:)/i.test(fileFromPath)) {
          const fileName = fileFromPath.replace(/^ファイル:|^File:/i, '')
          external = `${u.protocol}//${u.hostname}/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${width}`
          filePageUrl = buildFilePageUrl(fileName, u.hostname)
        }
      }
    }
  } catch {
    external = null
  }
  if (!external) return null
  // base64url encode for proxy
  const b64 = Buffer.from(external, 'utf-8').toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_')
  return { src: `/api/image?u=${b64}`, filePageUrl: filePageUrl || external }
}

function decodeExternalFromProxySrc(src: string | null): string | null {
  if (!src) return null
  try {
    const u = new URL(src, 'http://localhost')
    const b64 = u.searchParams.get('u')
    if (!b64) return null
    const norm = b64.replace(/-/g, '+').replace(/_/g, '/')
    const pad = norm.length % 4 === 0 ? '' : '='.repeat(4 - (norm.length % 4))
    return Buffer.from(norm + pad, 'base64').toString('utf-8')
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  // Only allow in non-production to avoid exposing internals
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  }
  const url = new URL(request.url)
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || 20)))
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mountains')
    .select('id,name,photo_url')
    .not('photo_url', 'is', null)
    .order('name', { ascending: true })
    .limit(limit)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  const items: DebugItem[] = await Promise.all((data || []).map(async (m: { id: string; name: string; photo_url: string | null; }) => {
    const norm = normalizePhotoUrl(m.photo_url, 640)
    const external = decodeExternalFromProxySrc(norm?.src || null)
    const result: DebugItem = {
      id: m.id,
      name: m.name,
      original: m.photo_url,
      normalized: external,
      proxyUrl: norm?.src || null,
      filePageUrl: norm?.filePageUrl || null,
    }
    // Check external (bypass proxy) to isolate issues
    if (external) {
      try {
        const eresp = await fetch(external, {
          method: 'HEAD',
          redirect: 'follow',
          headers: {
            'User-Agent': 'hyakumeizan-guide/1.0 (+https://hyakumeizan-guide.vercel.app)',
            'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
            'Accept-Language': 'en,ja;q=0.9',
            'Referer': new URL(external).origin + '/',
          },
        })
        result.externalStatus = eresp.status as number
        result.externalContentType = eresp.headers.get('content-type')
      } catch (e) {
        result.externalStatus = 'fetch_error'
        result.error = e instanceof Error ? e.message : String(e)
      }
    }
    if (norm?.src) {
      try {
        const resp = await fetch(new URL(norm.src, url.origin), { method: 'HEAD' })
        result.status = resp.status
        result.contentType = resp.headers.get('content-type')
      } catch (e) {
        result.status = 'fetch_error'
        result.error = e instanceof Error ? e.message : String(e)
      }
    }
    return result
  }))

  return NextResponse.json({ success: true, count: items.length, items })
}
