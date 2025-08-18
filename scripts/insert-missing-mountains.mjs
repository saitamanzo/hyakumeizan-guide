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

async function getPageQidAndExtract(title) {
  const api = new URL('https://ja.wikipedia.org/w/api.php')
  api.searchParams.set('action', 'query')
  api.searchParams.set('format', 'json')
  api.searchParams.set('origin', '*')
  api.searchParams.set('prop', 'pageprops|extracts')
  api.searchParams.set('exintro', '1')
  api.searchParams.set('explaintext', '1')
  api.searchParams.set('titles', title)
  const r = await fetch(api.toString(), { headers: { 'Accept': 'application/json' }, cache: 'no-store' })
  if (!r.ok) throw new Error('ja.wikipedia query failed: ' + r.status)
  const d = await r.json()
  const pages = d?.query?.pages ?? {}
  const first = Object.values(pages)[0]
  const qid = first?.pageprops?.wikibase_item || null
  const extract = typeof first?.extract === 'string' ? first.extract : null
  return { qid, extract }
}

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

function getClaimValues(claims, pid) {
  const arr = claims?.[pid]
  if (!Array.isArray(arr)) return []
  const vals = []
  for (const c of arr) {
    const v = c?.mainsnak?.datavalue?.value
    if (v != null) vals.push(v)
  }
  return vals
}

function parseElevationFromClaims(claims) {
  // P2044: elevation above sea level (in meters)
  const vals = getClaimValues(claims, 'P2044')
  if (!vals.length) return null
  const v = vals[0]
  let num = null
  if (typeof v?.amount === 'string') num = parseFloat(v.amount)
  if (Number.isFinite(num)) return Math.round(num)
  return null
}

function parseCoordinatesFromClaims(claims) {
  // P625: coordinate location
  const vals = getClaimValues(claims, 'P625')
  if (!vals.length) return { lat: null, lon: null }
  const v = vals[0]
  const lat = typeof v?.latitude === 'number' ? v.latitude : null
  const lon = typeof v?.longitude === 'number' ? v.longitude : null
  return { lat, lon }
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
    if (/都$|道$|府$|県$/.test(ja)) labels.push(ja)
  }
  return labels
}

async function fetchMountainInfoByTitle(title) {
  const { qid, extract } = await getPageQidAndExtract(title)
  if (!qid) return { title, extract: extract || null, elevation: null, lat: null, lon: null, prefectures: [] }
  const ent = await getWikidataEntity([qid])
  const claims = ent?.[qid]?.claims ?? {}
  const elevation = parseElevationFromClaims(claims)
  const { lat, lon } = parseCoordinatesFromClaims(claims)
  const p131Ids = extractP131ItemIds(claims)
  let prefectures = []
  if (p131Ids.length) {
    const ent2 = await getWikidataEntity(p131Ids)
    prefectures = pickPrefectureLabels(ent2)
  }
  return { title, extract: extract || null, elevation, lat, lon, prefectures }
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

  const targetTitles = [
    '会津駒ヶ岳',
    '那須岳',
    '越後駒ヶ岳',
    '平ヶ岳',
    '巻機山',
    '両神山',
    '瑞牆山',
  '天城山',
  ]

  const client = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  // Load existing names to skip present ones
  const { data: existing, error: loadErr } = await client.from('mountains').select('id,name')
  if (loadErr) {
    console.error('Failed to load mountains:', loadErr.message)
    process.exit(1)
  }
  const existingSet = new Set(existing.map(x => x.name))

  const toInsert = []
  for (const t of targetTitles) {
    if (existingSet.has(t)) {
      console.log('[skip exists]', t)
      continue
    }
    console.log('[fetch]', t)
    const info = await fetchMountainInfoByTitle(t)
    const prefectureStr = info.prefectures.length ? info.prefectures.join('・') : ''
    const row = {
      name: t,
      name_kana: null,
      elevation: info.elevation ?? 0,
      location: prefectureStr || '—',
      prefecture: prefectureStr || '—',
      description: info.extract,
      best_season: null,
      difficulty_level: null,
      latitude: info.lat,
      longitude: info.lon,
      photo_url: null,
      category: null,
      category_order: null,
    }
    toInsert.push(row)
    await sleep(80)
  }

  if (!toInsert.length) {
    console.log('Nothing to insert.')
    return
  }

  console.log('[dry-run] rows to insert:', toInsert.length)
  console.log(JSON.stringify(toInsert, null, 2))

  if (!apply) {
    console.log('Use --apply to insert rows into database.')
    return
  }

  const { error: insErr } = await client.from('mountains').insert(toInsert)
  if (insErr) {
    console.error('Insert failed:', insErr.message)
    process.exit(1)
  }
  console.log('Inserted', toInsert.length, 'rows.')
}

main().catch(e => { console.error(e); process.exit(1) })
