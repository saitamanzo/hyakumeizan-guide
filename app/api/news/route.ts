import { NextResponse } from 'next/server'

type NewsItem = {
  title: string
  link: string
  pubDate?: string
  source?: string
}

async function fetchGoogleNewsRss(query: string) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ja&gl=JP&ceid=JP:ja`
  try {
    const res = await fetch(url)
    if (!res.ok) return [] as NewsItem[]
    const text = await res.text()
    // crude XML parse: extract <item>...</item>
    const items: NewsItem[] = []
    const itemRe = /<item>[\s\S]*?<\/item>/gi
    const matches = text.match(itemRe) || []
    for (const m of matches) {
      const tit = (m.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]
      const link = (m.match(/<link>([\s\S]*?)<\/link>/i) || [])[1]
      const pub = (m.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1]
      let source = undefined
      if (tit) {
        const s = tit.split(' - ')
        if (s.length > 1) source = s[s.length - 1]
      }
      if (tit && link) {
        items.push({ title: tit, link, pubDate: pub, source })
      }
    }
    return items
  } catch (e) {
    console.error('news fetch error', e)
    return [] as NewsItem[]
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const name = url.searchParams.get('name') || ''
    const area = url.searchParams.get('area') || ''
    const max = Number(url.searchParams.get('max') || '15')

    const queries = [] as string[]
    if (name) queries.push(`${name}`)
    if (area) queries.push(`${area} ニュース`)
  // '熊' 関連のクエリはユーザーの要望で除外
    // 災害・通行情報のキーワードを追加
    const disasterKeywords = ['土砂崩れ', '落石', '通行止め']
    if (name) {
      for (const kw of disasterKeywords) queries.push(`${name} ${kw}`)
    }
    if (area) {
      for (const kw of disasterKeywords) queries.push(`${area} ${kw}`)
    }

    const all: NewsItem[] = []
    for (const q of queries) {
      const items = await fetchGoogleNewsRss(q)
      all.push(...items)
      // small delay to be polite
      await new Promise((r) => setTimeout(r, 150))
    }

    // dedupe by link
    const seen = new Set<string>()
    const out: NewsItem[] = []
    for (const it of all) {
      if (!it.link) continue
      if (seen.has(it.link)) continue
      seen.add(it.link)
      out.push(it)
      if (out.length >= max) break
    }

    return NextResponse.json({ ok: true, data: out })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('news api error', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
