type CommonsApiResponse = {
  query?: {
    pages?: Record<string, {
      imageinfo?: Array<{ url?: string }>
    }>
  }
}

export function toOriginalUploadFromUploadUrl(input: string): string | null {
  try {
    const u = new URL(input)
    if (u.hostname !== 'upload.wikimedia.org') return null
    const parts = u.pathname.split('/').filter(Boolean)
    const idx = parts.indexOf('thumb')
    if (idx !== -1) {
      const fileName = parts[parts.length - 2]
      const root = parts.slice(0, idx)
      const hashes = parts.slice(idx + 1, parts.length - 2)
      const newPath = ['/', ...root, ...hashes, fileName].join('/')
      return `${u.protocol}//${u.hostname}${newPath}`
    }
    return u.toString()
  } catch {
    return null
  }
}

function buildCommonsApiForFile(fileName: string) {
  const api = new URL('https://commons.wikimedia.org/w/api.php')
  api.searchParams.set('action', 'query')
  api.searchParams.set('prop', 'imageinfo')
  api.searchParams.set('iiprop', 'url')
  api.searchParams.set('format', 'json')
  api.searchParams.set('origin', '*')
  api.searchParams.set('redirects', '1')
  api.searchParams.set('titles', `File:${fileName}`)
  return api
}

export async function resolveOriginalUploadFromSpecialFilePath(input: string): Promise<string | null> {
  try {
    const u = new URL(input)
    if (!/\/wiki\/Special:FilePath\//.test(u.pathname)) return null
    const fileName = decodeURIComponent(u.pathname.replace('/wiki/Special:FilePath/', ''))
    if (!fileName) return null
    const api = buildCommonsApiForFile(fileName)
    const resp = await fetch(api.toString(), { headers: { 'Accept': 'application/json' }, cache: 'no-store' })
    if (!resp.ok) return null
    const data = await resp.json() as CommonsApiResponse
    const pages = data.query?.pages ?? {}
    const first = Object.values(pages)[0]
    const url = first?.imageinfo?.[0]?.url
    return typeof url === 'string' ? url : null
  } catch {
    return null
  }
}

export function normalizeInputToUploadOriginal(input: string): Promise<string | null> | string | null {
  try {
    const u = new URL(input)
    if (u.hostname === 'upload.wikimedia.org') {
      return toOriginalUploadFromUploadUrl(input)
    }
    if (/\/wiki\//.test(u.pathname)) {
      if (/\/wiki\/Special:FilePath\//.test(u.pathname)) {
        return resolveOriginalUploadFromSpecialFilePath(input)
      }
      return null
    }
    return null
  } catch {
    return null
  }
}
