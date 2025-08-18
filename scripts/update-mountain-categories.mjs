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

// Regions mapping → category numbers (A..I -> 1..9)
const REGION_CODE = {
  A: 1, // 北海道
  B: 2, // 東北
  C: 3, // 上信越（群馬・長野・新潟）
  D: 4, // 関東（茨城・栃木・埼玉・千葉・東京・神奈川）
  E: 5, // 中部（山梨・静岡・愛知・岐阜）
  F: 6, // 北陸（富山・石川・福井）
  G: 7, // 近畿（滋賀・京都・大阪・兵庫・奈良・和歌山・三重）
  H: 8, // 中国・四国
  I: 9, // 九州・沖縄
}

const PREF_GROUPS = {
  A: ['北海道'],
  B: ['青森県','岩手県','宮城県','秋田県','山形県','福島県'],
  C: ['群馬県','長野県','新潟県'],
  D: ['茨城県','栃木県','埼玉県','千葉県','東京都','神奈川県'],
  E: ['山梨県','静岡県','愛知県','岐阜県'],
  F: ['富山県','石川県','福井県'],
  G: ['滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','三重県'],
  H: ['鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県'],
  I: ['福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'],
}

const ALL_PREFS = new Set(Object.values(PREF_GROUPS).flat())

// Helpers to fetch prefectures from Wikidata when missing
async function getWikidataEntity(qids) {
  const ids = Array.isArray(qids) ? qids.join('|') : qids
  const api = new URL('https://www.wikidata.org/w/api.php')
  api.searchParams.set('action', 'wbgetentities')
  api.searchParams.set('format', 'json')
  api.searchParams.set('origin', '*')
  api.searchParams.set('props', 'labels|claims')
  api.searchParams.set('languages', 'ja')
  api.searchParams.set('ids', ids)
  const r = await fetch(api.toString(), { headers: { 'Accept': 'application/json' }, cache: 'no-store' })
  if (!r.ok) throw new Error('wikidata wbgetentities failed: ' + r.status)
  const d = await r.json()
  return d?.entities ?? {}
}

async function getPageQid(title) {
  const api = new URL('https://ja.wikipedia.org/w/api.php')
  api.searchParams.set('action', 'query')
  api.searchParams.set('format', 'json')
  api.searchParams.set('origin', '*')
  api.searchParams.set('prop', 'pageprops')
  api.searchParams.set('titles', title)
  const r = await fetch(api.toString(), { headers: { 'Accept': 'application/json' }, cache: 'no-store' })
  if (!r.ok) return null
  const d = await r.json()
  const pages = d?.query?.pages ?? {}
  const first = Object.values(pages)[0]
  const qid = first?.pageprops?.wikibase_item || null
  return qid
}

function extractP131ItemIds(claims) {
  const arr = claims?.P131
  if (!Array.isArray(arr)) return []
  const ids = []
  for (const c of arr) {
    const id = c?.mainsnak?.datavalue?.value?.id
    if (typeof id === 'string') ids.push(id)
  }
  return ids
}

function pickPrefectureLabels(entities) {
  const labels = []
  for (const ent of Object.values(entities)) {
    const ja = ent?.labels?.ja?.value
    if (!ja) continue
    if (/都$|道$|府$|県$/.test(ja) && ALL_PREFS.has(ja)) labels.push(ja)
  }
  return labels
}

function parsePrefecturesFromText(text) {
  if (!text) return []
  const hits = []
  for (const p of ALL_PREFS) {
    if (text.includes(p)) hits.push(p)
  }
  return hits
}

function splitPrefectureField(prefStr) {
  if (!prefStr || prefStr === '—') return []
  return prefStr
    .split(/[・,、\/\s]+/)
    .map(s => s.trim())
    .filter(Boolean)
}

function decideRegionFromPrefs(prefList) {
  if (!prefList.length) return null
  const counts = { A:0,B:0,C:0,D:0,E:0,F:0,G:0,H:0,I:0 }
  for (const pref of prefList) {
    for (const [key, arr] of Object.entries(PREF_GROUPS)) {
      if (arr.includes(pref)) { counts[key]++; break }
    }
  }
  let bestKey = null, bestVal = -1
  for (const [k,v] of Object.entries(counts)) {
    if (v > bestVal) { bestVal = v; bestKey = k }
  }
  return bestVal > 0 ? bestKey : null
}

async function ensurePrefectures(m, cache) {
  // Try existing prefecture value
  let prefList = splitPrefectureField(m.prefecture)
  if (prefList.length) return { prefList, updatedPrefecture: null }

  // Try description
  prefList = parsePrefecturesFromText(m.description || '')
  if (prefList.length) return { prefList, updatedPrefecture: prefList.join('・') }

  // Try Wikidata P131
  const title = m.name
  if (!cache.qids[title]) cache.qids[title] = await getPageQid(title)
  const qid = cache.qids[title]
  if (!qid) return { prefList: [], updatedPrefecture: null }
  if (!cache.entities[qid]) cache.entities[qid] = await getWikidataEntity([qid])
  const claims = cache.entities[qid]?.[qid]?.claims ?? {}
  const p131 = extractP131ItemIds(claims)
  if (!p131.length) return { prefList: [], updatedPrefecture: null }
  const ent2 = await getWikidataEntity(p131)
  const labels = pickPrefectureLabels(ent2)
  return { prefList: labels, updatedPrefecture: labels.length ? labels.join('・') : null }
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
  const client = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  const { data: mountains, error } = await client
    .from('mountains')
    .select('id,name,prefecture,location,latitude,longitude,description,category,category_order')

  if (error) {
    console.error('Fetch error:', error.message)
    process.exit(1)
  }

  const cache = { qids: {}, entities: {} }
  const rows = []
  for (const m of mountains) {
    const { prefList, updatedPrefecture } = await ensurePrefectures(m, cache)
    const regionKey = decideRegionFromPrefs(prefList)
    if (!regionKey) {
      rows.push({ id: m.id, name: m.name, newCategory: null, newOrder: null, reason: 'region-undetermined', prefList })
      await sleep(50)
      continue
    }
    const catNum = REGION_CODE[regionKey]
    rows.push({ id: m.id, name: m.name, newCategory: catNum, newOrder: null, updatedPrefecture, prefList })
    await sleep(50)
  }

  // Assign category_order within each category (north→south)
  const grouped = new Map()
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (r.newCategory == null) continue
    if (!grouped.has(r.newCategory)) grouped.set(r.newCategory, [])
    const m = mountains.find(x => x.id === r.id)
    grouped.get(r.newCategory).push({ idx: i, name: r.name, lat: m?.latitude ?? null })
  }
  for (const arr of grouped.values()) {
    arr.sort((a,b) => {
      const la = typeof a.lat === 'number' ? a.lat : -999
      const lb = typeof b.lat === 'number' ? b.lat : -999
      if (lb !== la) return lb - la // higher latitude first (north)
      return a.name.localeCompare(b.name, 'ja')
    })
    arr.forEach((item, idx) => {
      rows[item.idx].newOrder = idx + 1
    })
  }

  // Prepare updates
  const updates = []
  for (const r of rows) {
    if (r.newCategory == null && r.newOrder == null && !r.updatedPrefecture) continue
    const patch = {}
    if (r.newCategory != null) patch.category = r.newCategory
    if (r.newOrder != null) patch.category_order = r.newOrder
    if (r.updatedPrefecture) { patch.prefecture = r.updatedPrefecture; patch.location = r.updatedPrefecture }
    if (Object.keys(patch).length) updates.push({ id: r.id, patch })
  }

  console.log(`[dry-run] to update: ${updates.length} rows`)
  console.log(updates.slice(0, 20))

  if (!apply) {
    console.log('Use --apply to write changes to DB.')
    return
  }

  // Apply updates in small batches
  for (const u of updates) {
    const { error: upErr } = await client.from('mountains').update(u.patch).eq('id', u.id)
    if (upErr) {
      console.error('Update failed:', u.id, upErr.message)
    }
    await sleep(30)
  }
  console.log('Applied updates:', updates.length)
}

main().catch(e => { console.error(e); process.exit(1) })
