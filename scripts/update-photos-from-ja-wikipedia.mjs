#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocal() {
  try {
    const p = path.resolve(process.cwd(), '.env.local')
    if (!fs.existsSync(p)) return
    const txt = fs.readFileSync(p, 'utf8')
    for (const rawLine of txt.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq === -1) continue
      const key = line.slice(0, eq).trim()
      let val = line.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = val
    }
  } catch {}
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function toBase64Url(str) {
  return Buffer.from(str, 'utf8').toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_')
}

async function fetchAuthorOrderSectionHtml() {
  const base = 'https://ja.wikipedia.org/w/api.php'
  // 1) find section index by title match
  const s1 = new URL(base)
  s1.searchParams.set('action', 'parse')
  s1.searchParams.set('format', 'json')
  s1.searchParams.set('origin', '*')
  s1.searchParams.set('page', '日本百名山')
  s1.searchParams.set('prop', 'sections')
  const r1 = await fetch(s1.toString(), { headers: { 'Accept': 'application/json' }, cache: 'no-store' })
  if (!r1.ok) throw new Error(`parse sections failed: ${r1.status}`)
  const d1 = await r1.json()
  const sections = d1?.parse?.sections || []
  const sec = sections.find((x) => x?.line === '著書順の山の一覧')
  if (!sec?.index) throw new Error('section not found: 著書順の山の一覧')
  // 2) get section html
  const s2 = new URL(base)
  s2.searchParams.set('action', 'parse')
  s2.searchParams.set('format', 'json')
  s2.searchParams.set('origin', '*')
  s2.searchParams.set('page', '日本百名山')
  s2.searchParams.set('section', String(sec.index))
  s2.searchParams.set('prop', 'text')
  s2.searchParams.set('formatversion', '2')
  const r2 = await fetch(s2.toString(), { headers: { 'Accept': 'application/json' }, cache: 'no-store' })
  if (!r2.ok) throw new Error(`parse text failed: ${r2.status}`)
  const d2 = await r2.json()
  const html = d2?.parse?.text
  if (typeof html !== 'string' || !html) throw new Error('empty section html')
  return html
}

function extractAuthorOrderTable(html) {
  // セクション内の全テーブルから、行数が最大のものを採用
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) || []
  if (!tables.length) return null
  let best = tables[0]
  let bestScore = (best.match(/<tr/gi) || []).length
  for (const t of tables.slice(1)) {
    const score = (t.match(/<tr/gi) || []).length
    if (score > bestScore) { best = t; bestScore = score }
  }
  return best
}

function extractRowsFromTable(tableHtml) {
  const rows = []
  // 各行
  const trRegex = /<tr[\s\S]*?<\/tr>/gi
  let m
  while ((m = trRegex.exec(tableHtml)) !== null) {
    rows.push(m[0])
  }
  return rows
}

function extractCellsFromRow(trHtml) {
  const cells = []
  const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi
  let m
  while ((m = cellRegex.exec(trHtml)) !== null) {
    cells.push(m[1])
  }
  return cells
}

function getTextContent(html) {
  // 非厳密: タグ除去
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function extractImgFileFromRow(trHtml) {
  // サムネイルのFile名を推定: /wiki/Special:FilePath/<name> か /wiki/File:<name> に現れる
  const sp = trHtml.match(/\/wiki\/Special:FilePath\/([^"?#<]+)\b/)
  if (sp && sp[1]) return decodeURIComponent(sp[1])
  const fp = trHtml.match(/\/wiki\/(?:File:|%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB:)([^"?#<]+)\b/i)
  if (fp && fp[1]) return decodeURIComponent(fp[1])
  // <img src="//upload.wikimedia.org/.../thumb/.../<name>/..."> から末尾-1を取る
  const img = trHtml.match(/src=\"(?:https?:)?\/\/upload\.wikimedia\.org\/[^\"]+\"/i)
  if (img) {
    const url = img[0].slice(5, -1) // remove src=" and final "
    try {
      const u = new URL(url.startsWith('http') ? url : `https:${url}`)
      const parts = u.pathname.split('/')
      const isThumb = parts.includes('thumb')
      const rawName = isThumb ? parts[parts.length - 2] : parts[parts.length - 1]
      if (rawName) return decodeURIComponent(rawName)
    } catch {}
  }
  return null
}

function extractMountainNameFromRow(trHtml) {
  // 著書順テーブルの2列目が山名
  const cells = extractCellsFromRow(trHtml)
  if (cells.length < 2) return ''
  const raw = cells[1]
  const linkMatch = raw.match(/<a [^>]*>([\s\S]*?)<\/a>/i)
  const text = getTextContent((linkMatch && linkMatch[1]) || raw)
  return text.replace(/\[[^\]]*\]/g, '').trim()
}

//

async function resolveOriginalUploadFromFileName(rawName) {
  // Try Commons first, then ja.wikipedia (local files are often stored there)
  const tryApi = async (baseApi) => {
    try {
      const fileTitle = rawName.startsWith('File:') || rawName.startsWith('ファイル:') ? rawName : `File:${rawName}`
      const api = new URL(baseApi)
      api.searchParams.set('action', 'query')
      api.searchParams.set('prop', 'imageinfo')
      api.searchParams.set('iiprop', 'url')
      api.searchParams.set('format', 'json')
      api.searchParams.set('origin', '*')
      api.searchParams.set('redirects', '1')
      api.searchParams.set('titles', fileTitle)
      const resp = await fetch(api.toString(), { headers: { 'Accept': 'application/json' }, cache: 'no-store' })
      if (!resp.ok) return null
      const data = await resp.json()
      const pages = data?.query?.pages ?? {}
      const first = Object.values(pages)[0]
      const url = first?.imageinfo?.[0]?.url
      return typeof url === 'string' ? url : null
    } catch {
      return null
    }
  }
  return (await tryApi('https://commons.wikimedia.org/w/api.php'))
      || (await tryApi('https://ja.wikipedia.org/w/api.php'))
      || null
}

function extractMountainPageTitleFromRow(trHtml) {
  // 2列目セル内の最初のリンクを優先してタイトルを抽出
  const cells = extractCellsFromRow(trHtml)
  if (cells.length < 2) return null
  const raw = cells[1]
  const linkRegex = /<a\s+[^>]*href="\/wiki\/([^"]+)"[^>]*>/i
  const m = raw.match(linkRegex)
  if (!m) return null
  const hrefTitle = m[1]
  try {
    const decoded = decodeURIComponent(hrefTitle)
    if (/^(File:|ファイル:|Special:|特別:)/i.test(decoded)) return null
    if (decoded.startsWith(':')) return null
    if (decoded.includes('#')) return null
    if (/^Category:|^カテゴリ:/i.test(decoded)) return null
    return decoded.replace(/_/g, ' ')
  } catch {
    return null
  }
}

async function resolvePageImageOriginalUrlFromTitle(pageTitle) {
  try {
    const api = new URL('https://ja.wikipedia.org/w/api.php')
    api.searchParams.set('action', 'query')
    api.searchParams.set('format', 'json')
    api.searchParams.set('origin', '*')
    api.searchParams.set('prop', 'pageimages')
    api.searchParams.set('piprop', 'original')
    api.searchParams.set('titles', pageTitle)
    const resp = await fetch(api.toString(), { headers: { 'Accept': 'application/json' }, cache: 'no-store' })
    if (!resp.ok) return null
    const data = await resp.json()
    const pages = data?.query?.pages ?? {}
    const first = Object.values(pages)[0]
    const url = first?.original?.source
    return typeof url === 'string' ? url : null
  } catch {
    return null
  }
}

async function resolveOriginalFromQueryImages(title) {
  try {
    const api = new URL('https://ja.wikipedia.org/w/api.php')
    api.searchParams.set('action', 'query')
    api.searchParams.set('format', 'json')
    api.searchParams.set('origin', '*')
    api.searchParams.set('prop', 'images')
    api.searchParams.set('imlimit', 'max')
    api.searchParams.set('titles', title)
    const resp = await fetch(api.toString(), { headers: { 'Accept': 'application/json' }, cache: 'no-store' })
    if (!resp.ok) return null
    const data = await resp.json()
    const pages = data?.query?.pages ?? {}
    const first = Object.values(pages)[0]
    const imgs = first?.images
    if (!Array.isArray(imgs) || !imgs.length) return null
    const pick = imgs.find(x => /\.(jpg|jpeg|png)$/i.test(x?.title || '')) || imgs[0]
    if (!pick?.title) return null
    return await resolveOriginalUploadFromFileName(pick.title.replace(/^.*?:/, ''))
  } catch {
    return null
  }
}

async function resolveOriginalFromWikidataP18ByJaTitle(pageTitle) {
  try {
    // Step 1: ja.wikipedia -> get Wikidata QID
    const api1 = new URL('https://ja.wikipedia.org/w/api.php')
    api1.searchParams.set('action', 'query')
    api1.searchParams.set('format', 'json')
    api1.searchParams.set('origin', '*')
    api1.searchParams.set('prop', 'pageprops')
    api1.searchParams.set('titles', pageTitle)
    const r1 = await fetch(api1.toString(), { headers: { 'Accept': 'application/json' }, cache: 'no-store' })
    if (!r1.ok) return null
    const d1 = await r1.json()
    const p1 = d1?.query?.pages ?? {}
    const first = Object.values(p1)[0]
    const qid = first?.pageprops?.wikibase_item
    if (!qid || typeof qid !== 'string') return null
    // Step 2: wikidata -> P18 image filename
    const api2 = new URL('https://www.wikidata.org/w/api.php')
    api2.searchParams.set('action', 'wbgetclaims')
    api2.searchParams.set('format', 'json')
    api2.searchParams.set('origin', '*')
    api2.searchParams.set('entity', qid)
    api2.searchParams.set('property', 'P18')
    const r2 = await fetch(api2.toString(), { headers: { 'Accept': 'application/json' }, cache: 'no-store' })
    if (!r2.ok) return null
    const d2 = await r2.json()
    const claims = d2?.claims?.P18
    const val = Array.isArray(claims) && claims[0]?.mainsnak?.datavalue?.value
    if (!val || typeof val !== 'string') return null
    return await resolveOriginalUploadFromFileName(val)
  } catch {
    return null
  }
}

async function main() {
  loadEnvLocal()
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
    process.exit(1)
  }
  const apply = process.argv.includes('--apply')
  const html = await fetchAuthorOrderSectionHtml()
  const table = extractAuthorOrderTable(html)
  if (!table) {
    console.error('Failed to locate the author-order table in the page')
    process.exit(1)
  }
  const rows = extractRowsFromTable(table)
  console.log(`[info] detected table rows: ${rows.length}`)
  const items = []
  for (const tr of rows.slice(1)) { // skip header
    const name = extractMountainNameFromRow(tr)
    if (!name) continue
    let uploadUrl = null
    const file = extractImgFileFromRow(tr)
    if (file) {
      uploadUrl = await resolveOriginalUploadFromFileName(file)
    }
    if (!uploadUrl) {
      const pageTitle = extractMountainPageTitleFromRow(tr)
      if (pageTitle) {
        uploadUrl = await resolvePageImageOriginalUrlFromTitle(pageTitle)
        if (!uploadUrl) {
          uploadUrl = await resolveOriginalFromWikidataP18ByJaTitle(pageTitle)
          if (!uploadUrl) {
            uploadUrl = await resolveOriginalFromQueryImages(pageTitle)
          }
        }
      }
    }
    if (!uploadUrl) continue
    items.push({ name, file: file || null, uploadUrl })
    await sleep(50)
  }

  if (!items.length) {
    console.log('No images extracted.')
    return
  }

  console.log(`[dry-run] extracted ${items.length} items.`)
  console.log(items.slice(0, 10))
  if (!apply) {
    console.log('Use --apply to update database.')
    return
  }

  const client = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  // Preload all mountains to handle name variations locally
  const { data: allMountains, error: loadErr } = await client
    .from('mountains')
    .select('id,name')
  if (loadErr) {
    console.error('Failed to load mountains list:', loadErr.message)
    process.exit(1)
  }
  const byName = new Map(allMountains.map(m => [m.name, m]))

  // Known alias mapping from Wikipedia names to DB canonical names
  const alias = new Map([
    ['魚沼駒ヶ岳', '越後駒ヶ岳'],
    ['奥白根山', '日光白根山'],
    ['宮ノ浦岳', '宮之浦岳'],
  ['燧岳', '燧ヶ岳'],
  ['那須岳', '茶臼岳'],
  ['大菩薩岳', '大菩薩嶺'],
  // 天城山系の最高峰は万三郎岳だが、表示は「天城山」に統一
  ['万三郎岳', '天城山'],
  ['会津駒ヶ岳', '駒ヶ岳（会津）'],
  // additional common canonicalizations
  ['茶臼岳（那須）', '茶臼岳'],
  ['白根山（日光）', '日光白根山'],
  ['白根山(日光)', '日光白根山'],
  ])

  const normalize = (s) => s
    .replace(/\s+/g, '')
    .replace(/ヶ/g, 'ケ')
  .replace(/曾/g, '曽')
    .replace(/゛/g, '')
    .replace(/ノ/g, '之') // unify to 之
  // remove any parenthetical content fully
  .replace(/（[^）]*）/g, '')
  .replace(/\([^)]*\)/g, '')

  const findTargetLocal = (name) => {
    // direct
    if (byName.has(name)) return byName.get(name)
    // alias
    const ali = alias.get(name)
    if (ali && byName.has(ali)) return byName.get(ali)
    // normalized contains/equals
    const n = normalize(name)
    let hit = null
    for (const m of allMountains) {
      const mn = normalize(m.name)
      if (mn === n || mn.includes(n) || n.includes(mn)) {
        if (hit && hit.id !== m.id) {
          // ambiguous
          return { __ambiguous: true, names: [hit.name, m.name] }
        }
        hit = m
      }
    }
    return hit
  }

  const bigrams = (s) => {
    const arr = []
    for (let i = 0; i < s.length - 1; i++) arr.push(s.slice(i, i + 2))
    return new Set(arr)
  }
  const jaccard = (a, b) => {
    const A = bigrams(normalize(a))
    const B = bigrams(normalize(b))
    if (A.size === 0 || B.size === 0) return 0
    let inter = 0
    for (const x of A) if (B.has(x)) inter++
    const uni = A.size + B.size - inter
    return inter / uni
  }

  let updated = 0
  for (const it of items) {
    let target = findTargetLocal(it.name)
    if (!target) {
      // Remote fallback: partial match in DB
      const { data: list, error } = await client
        .from('mountains')
        .select('id,name')
        .ilike('name', `%${it.name}%`)
      if (error) {
        console.error('Find error:', it.name, error.message)
        continue
      }
      if (Array.isArray(list) && list.length === 1) {
        target = list[0]
      }
    }
    if (!target) {
      console.warn('Not found in DB:', it.name)
      // Show top similar candidates to help aliasing
      const ranked = allMountains
        .map(m => ({ name: m.name, score: jaccard(it.name, m.name), id: m.id }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
      console.warn('  candidates:', ranked.map(r => `${r.name}(${r.score.toFixed(2)})`).join(', '))
      continue
    }
    if (target.__ambiguous) {
      console.warn('Multiple matches, skipped:', it.name, '=>', target.names.join(', '))
      continue
    }
    const { error: upErr } = await client
      .from('mountains')
      .update({ photo_url: it.uploadUrl })
      .eq('id', target.id)
    if (upErr) {
      console.error('Update failed:', it.name, upErr.message)
    } else {
      updated++
    }
    await sleep(20)
  }
  console.log(`Updated ${updated} rows out of ${items.length}.`)
}

main().catch((e) => { console.error(e); process.exit(1) })
