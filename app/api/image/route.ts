import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const ALLOWED_HOSTS = new Set([
  'upload.wikimedia.org',
  'ja.wikipedia.org',
  'commons.wikimedia.org',
])

function isAllowedUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:') return false
    if (!ALLOWED_HOSTS.has(u.hostname)) return false
    // For wikipedia/commons, restrict to wiki paths to avoid SSRF
    if (u.hostname.endsWith('wikipedia.org')) {
      return u.pathname.startsWith('/wiki/')
    }
    if (u.hostname === 'commons.wikimedia.org') {
      return u.pathname.startsWith('/wiki/Special:FilePath/')
    }
    // For upload.wikimedia, allow /wikipedia/... images path
    if (u.hostname === 'upload.wikimedia.org') {
      return u.pathname.startsWith('/wikipedia/')
    }
    return false
  } catch {
    return false
  }
}

function decodeRequestedUrl(request: Request): { ok: true; raw: string } | { ok: false; error: NextResponse } {
  const { searchParams } = new URL(request.url)
  let raw = searchParams.get('u')
  const direct = searchParams.get('url')
  if (!raw && direct) {
    raw = direct
  } else if (raw) {
    try {
      const b64 = raw.replace(/-/g, '+').replace(/_/g, '/')
      const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
      const decoded = Buffer.from(b64 + pad, 'base64').toString('utf-8')
      raw = decoded
    } catch {
      return { ok: false, error: NextResponse.json({ error: 'Invalid encoded url' }, { status: 400 }) }
    }
  }
  if (!raw) return { ok: false, error: NextResponse.json({ error: 'Missing url' }, { status: 400 }) }
  if (!isAllowedUrl(raw)) return { ok: false, error: NextResponse.json({ error: 'URL not allowed' }, { status: 400 }) }
  return { ok: true, raw }
}

type CommonsApiResponse = {
  query?: {
    pages?: Record<string, {
      imageinfo?: Array<{ thumburl?: string; url?: string }>
    }>
  }
}

async function resolveCommonsThumbUrlFromFilePath(rawUrl: string): Promise<{ url: string | null; width: number | null }> {
  try {
    const u = new URL(rawUrl)
    if (u.hostname !== 'commons.wikimedia.org') return { url: null, width: null }
    if (!u.pathname.startsWith('/wiki/Special:FilePath/')) return { url: null, width: null }
    const fileName = decodeURIComponent(u.pathname.replace('/wiki/Special:FilePath/', ''))
    const widthParam = u.searchParams.get('width')
    const width = widthParam ? Number(widthParam) : 640
    const api = new URL('https://commons.wikimedia.org/w/api.php')
    api.searchParams.set('action', 'query')
    api.searchParams.set('titles', `File:${fileName}`)
    api.searchParams.set('prop', 'imageinfo')
    api.searchParams.set('iiprop', 'url')
    api.searchParams.set('iiurlwidth', String(width))
  api.searchParams.set('format', 'json')
  api.searchParams.set('redirects', '1')
    api.searchParams.set('origin', '*')
    const resp = await fetch(api.toString(), {
      headers: {
        'User-Agent': 'hyakumeizan-guide/1.0 (+https://hyakumeizan-guide.vercel.app)',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    })
    if (!resp.ok) return { url: null, width }
  const data = await resp.json() as CommonsApiResponse
  const pages = data.query?.pages ?? {}
  const first = Object.values(pages)[0]
  const ii = first?.imageinfo?.[0]
    const thumb = ii?.thumburl as string | undefined
    const orig = ii?.url as string | undefined
    return { url: thumb || orig || null, width }
  } catch {
    return { url: null, width: null }
  }
}

export async function GET(request: Request) {
  const decoded = decodeRequestedUrl(request)
  if (!decoded.ok) return decoded.error
  const raw = decoded.raw

  // helper: fetch with exponential backoff for transient failures
  const fetchWithRetries = async (url: string, tries = 4, method: 'GET' | 'HEAD' = 'GET') => {
    let attempt = 0
  let lastError: unknown = null
    while (attempt < tries) {
      try {
        const resp = await fetch(url, {
          redirect: 'follow',
          cache: 'no-store',
          headers: {
            'User-Agent': 'hyakumeizan-guide/1.0 (+https://hyakumeizan-guide.vercel.app)',
            'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
            'Accept-Language': 'en,ja;q=0.9',
            // Some CDNs vary by Referer; provide a sensible origin
            'Referer': new URL(url).origin + '/',
          },
          method,
        })
        if (resp.ok && resp.body) return resp
        if ([429, 502, 503].includes(resp.status)) {
          const ra = resp.headers.get('retry-after')
          let delay = 200 * Math.pow(2, attempt)
          const secs = ra ? Number(ra) : NaN
          if (!Number.isNaN(secs)) delay = Math.min(secs * 1000, 5000)
          await new Promise(r => setTimeout(r, delay))
          attempt++
          continue
        }
        return resp
      } catch (err) {
        lastError = err
        await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt)))
        attempt++
      }
    }
    if (lastError) throw lastError
    throw new Error('fetchWithRetries: exhausted')
  }

  try {
    const upstream = await fetchWithRetries(raw, 4, 'GET')
  if (!upstream.ok || !upstream.body) {
      // Try Commons API fallback when FilePath returns 404
      if (upstream.status === 404) {
        const fallback = await resolveCommonsThumbUrlFromFilePath(raw)
        if (fallback.url) {
          try {
            const fb = await fetchWithRetries(fallback.url, 3, 'GET')
            if (fb.ok && fb.body) {
              const buf = await fb.arrayBuffer()
              const headers = new Headers()
              const ct = fb.headers.get('content-type') || 'image/jpeg'
              headers.set('Content-Type', ct)
              headers.set('Content-Length', String(buf.byteLength))
              headers.set('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=86400')
              headers.set('X-Content-Type-Options', 'nosniff')
              headers.set('Cross-Origin-Resource-Policy', 'same-origin')
              headers.set('X-Proxy-Fallback', 'commons-api')
              return new NextResponse(buf, { status: 200, headers })
            }
          } catch (e) {
            console.error('[image-proxy] fallback fetch error', { e })
          }
        }
      }
      console.error('[image-proxy] upstream not ok', { url: raw, status: upstream.status })
      const resp = NextResponse.json({ error: 'Upstream fetch failed', status: upstream.status }, { status: 502 })
      resp.headers.set('X-Upstream-Status', String(upstream.status))
      return resp
    }

  // Buffer the entire image to avoid stream incompatibilities
  const arrayBuffer = await upstream.arrayBuffer()
  const headers = new Headers()
  const ct = upstream.headers.get('content-type') || 'image/jpeg'
  headers.set('Content-Type', ct)
  headers.set('Content-Length', String(arrayBuffer.byteLength))
  headers.set('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=86400')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Cross-Origin-Resource-Policy', 'same-origin')

  return new NextResponse(arrayBuffer, { status: 200, headers })
  } catch (err) {
    console.error('[image-proxy] error', { err, url: raw })
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 })
  }
}

export async function HEAD(request: Request) {
  const decoded = decodeRequestedUrl(request)
  if (!decoded.ok) return decoded.error
  const raw = decoded.raw
  const fetchWithRetries = async (url: string, tries = 3) => {
    let attempt = 0
    let lastError: unknown = null
    while (attempt < tries) {
      try {
        const resp = await fetch(url, {
          redirect: 'follow',
          cache: 'no-store',
          headers: {
            'User-Agent': 'hyakumeizan-guide/1.0 (+https://hyakumeizan-guide.vercel.app)',
            'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
            'Accept-Language': 'en,ja;q=0.9',
            'Referer': new URL(url).origin + '/',
          },
          method: 'HEAD',
        })
        if (resp.ok) return resp
        if ([429, 502, 503].includes(resp.status)) {
          const ra = resp.headers.get('retry-after')
          let delay = 200 * Math.pow(2, attempt)
          const secs = ra ? Number(ra) : NaN
          if (!Number.isNaN(secs)) delay = Math.min(secs * 1000, 5000)
          await new Promise(r => setTimeout(r, delay))
          attempt++
          continue
        }
        return resp
      } catch (err) {
        lastError = err
        await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt)))
        attempt++
      }
    }
    if (lastError) throw lastError
    throw new Error('fetchWithRetries: exhausted')
  }
  try {
    const upstream = await fetchWithRetries(raw, 3)
    if (!upstream.ok) {
      if (upstream.status === 404) {
        const fallback = await resolveCommonsThumbUrlFromFilePath(raw)
        if (fallback.url) {
          try {
            const fb = await fetch(fallback.url, {
              method: 'HEAD',
              redirect: 'follow',
              cache: 'no-store',
              headers: {
                'User-Agent': 'hyakumeizan-guide/1.0 (+https://hyakumeizan-guide.vercel.app)',
                'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
                'Accept-Language': 'en,ja;q=0.9',
                'Referer': new URL(fallback.url).origin + '/',
              },
            })
            if (fb.ok) {
              const headers = new Headers()
              const ct = fb.headers.get('content-type') || 'image/jpeg'
              const cl = fb.headers.get('content-length')
              headers.set('Content-Type', ct)
              if (cl) headers.set('Content-Length', cl)
              headers.set('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=86400')
              headers.set('X-Content-Type-Options', 'nosniff')
              headers.set('Cross-Origin-Resource-Policy', 'same-origin')
              headers.set('X-Proxy-Fallback', 'commons-api')
              return new NextResponse(null, { status: 200, headers })
            }
          } catch (e) {
            console.error('[image-proxy][HEAD] fallback error', { e })
          }
        }
      }
      console.error('[image-proxy][HEAD] upstream not ok', { url: raw, status: upstream.status })
      const headers = new Headers()
      headers.set('X-Upstream-Status', String(upstream.status))
      return new NextResponse(null, { status: upstream.status, headers })
    }
    const headers = new Headers()
    const ct = upstream.headers.get('content-type') || 'image/jpeg'
    const cl = upstream.headers.get('content-length')
    headers.set('Content-Type', ct)
    if (cl) headers.set('Content-Length', cl)
    headers.set('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=86400')
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('Cross-Origin-Resource-Policy', 'same-origin')
    return new NextResponse(null, { status: 200, headers })
  } catch (err) {
    console.error('[image-proxy][HEAD] error', { err, url: raw })
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 })
  }
}
