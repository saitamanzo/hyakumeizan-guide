import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function extractFileName(raw: string): { fileName: string | null, host: string | null } {
  try {
    const u = new URL(raw)
    const host = u.hostname
    if (host === 'upload.wikimedia.org') {
      const parts = u.pathname.split('/')
      const isThumb = parts.includes('thumb')
      const rawName = isThumb ? parts[parts.length - 2] : parts[parts.length - 1]
      const name = rawName || ''
      return { fileName: decodeURIComponent(name), host }
    }
    if ((host.endsWith('wikipedia.org') || host.endsWith('wikimedia.org')) && u.pathname.startsWith('/wiki/Special:FilePath/')) {
      const name = u.pathname.replace('/wiki/Special:FilePath/', '')
      return { fileName: decodeURIComponent(name), host }
    }
    return { fileName: null, host: null }
  } catch {
    return { fileName: null, host: null }
  }
}

function toFilePageUrl(fileName: string, hostHint: string | null): string {
  const host = hostHint === 'ja.wikipedia.org' ? 'ja.wikipedia.org' : 'commons.wikimedia.org'
  return `https://${host}/wiki/File:${encodeURIComponent(fileName)}`
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  let raw = searchParams.get('u') || searchParams.get('url') || ''
  if (!raw) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  // base64url decode if 'u'
  if (searchParams.get('u')) {
    try {
      const b64 = raw.replace(/-/g, '+').replace(/_/g, '/')
      const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
      raw = Buffer.from(b64 + pad, 'base64').toString('utf-8')
    } catch {
      return NextResponse.json({ error: 'Invalid encoded url' }, { status: 400 })
    }
  }

  const { fileName, host } = extractFileName(raw)
  if (!fileName) return NextResponse.json({ error: 'Unsupported url' }, { status: 400 })

  // Query Commons API for metadata regardless of host (Commons often holds the metadata)
  const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=extmetadata%7Curl&format=json&titles=${encodeURIComponent('File:' + fileName)}`
  try {
    const resp = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'hyakumeizan-guide/1.0 (+https://hyakumeizan-guide.vercel.app)'
      },
      cache: 'no-store'
    })
    if (!resp.ok) {
      return NextResponse.json({ error: 'Upstream error', status: resp.status }, { status: 502 })
    }
    const json = await resp.json()
  const pages = (json?.query?.pages || {}) as Record<string, unknown>
  const first = Object.values(pages)[0] as unknown
  const page = (first && typeof first === 'object') ? first as { imageinfo?: Array<{ extmetadata?: Record<string, { value?: string }>, url?: string }> } : undefined
  const info = page?.imageinfo?.[0]
    const ext = info?.extmetadata || {}
    const artistRaw = ext?.Artist?.value || ''
    const licenseShort = ext?.LicenseShortName?.value || ''
    const licenseUrl = ext?.LicenseUrl?.value || ''
    const author = artistRaw ? stripHtml(artistRaw) : ''
    const filePageUrl = toFilePageUrl(fileName, host)

    return NextResponse.json({
      fileName,
      filePageUrl,
      author,
      license: licenseShort,
      licenseUrl: licenseUrl || filePageUrl,
    })
  } catch {
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 })
  }
}
