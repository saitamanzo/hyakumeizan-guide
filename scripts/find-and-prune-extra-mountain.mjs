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

async function fetchAuthorOrderSectionHtml() {
  const base = 'https://ja.wikipedia.org/w/api.php'
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
  const trRegex = /<tr[\s\S]*?<\/tr>/gi
  let m
  while ((m = trRegex.exec(tableHtml)) !== null) rows.push(m[0])
  return rows
}

function extractCellsFromRow(trHtml) {
  const cells = []
  const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi
  let m
  while ((m = cellRegex.exec(trHtml)) !== null) cells.push(m[1])
  return cells
}

function getTextContent(html) {
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

function extractMountainNameFromRow(trHtml) {
  const cells = extractCellsFromRow(trHtml)
  if (cells.length < 2) return ''
  const raw = cells[1]
  const linkMatch = raw.match(/<a [^>]*>([\s\S]*?)<\/a>/i)
  const text = getTextContent((linkMatch && linkMatch[1]) || raw)
  return text.replace(/\[[^\]]*\]/g, '').trim()
}

const alias = new Map([
  ['魚沼駒ヶ岳', '越後駒ヶ岳'],
  ['奥白根山', '日光白根山'],
  ['宮ノ浦岳', '宮之浦岳'],
  ['燧岳', '燧ヶ岳'],
  ['那須岳', '茶臼岳'],
  ['大菩薩岳', '大菩薩嶺'],
  ['万三郎岳', '天城山'],
  ['会津駒ヶ岳', '駒ヶ岳（会津）'],
  ['茶臼岳（那須）', '茶臼岳'],
  ['白根山（日光）', '日光白根山'],
  ['白根山(日光)', '日光白根山'],
])

const normalize = (s) => s
  .replace(/\s+/g, '')
  .replace(/ヶ/g, 'ケ')
  .replace(/曾/g, '曽')
  .replace(/゛/g, '')
  .replace(/ノ/g, '之')
  .replace(/（[^）]*）/g, '')
  .replace(/\([^)]*\)/g, '')

async function main() {
  loadEnvLocal()
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing env')
    process.exit(1)
  }
  const APPLY = process.argv.includes('--apply')
  const client = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  // 1) expected 100 from Wikipedia
  const html = await fetchAuthorOrderSectionHtml()
  const table = extractAuthorOrderTable(html)
  const rows = extractRowsFromTable(table).slice(1)
  const expectedNames = []
  for (const tr of rows) {
    const n = extractMountainNameFromRow(tr)
    if (!n) continue
    expectedNames.push(n)
    await sleep(10)
  }
  if (expectedNames.length !== 100) console.warn('[warn] extracted names:', expectedNames.length)

  // 2) DB list
  const { data: allMountains, error } = await client.from('mountains').select('id,name')
  if (error) { console.error(error.message); process.exit(1) }
  const byName = new Map(allMountains.map(m => [m.name, m]))

  // 3) map expected to DB ids
  const expectedIds = new Set()
  for (const name of expectedNames) {
    const targetName = alias.get(name) || name
    // direct hit
    if (byName.has(targetName)) { expectedIds.add(byName.get(targetName).id); continue }
    // normalized match
    const n0 = normalize(targetName)
    const hit = allMountains.find(m => normalize(m.name) === n0 || normalize(m.name).includes(n0) || n0.includes(normalize(m.name)))
    if (hit) { expectedIds.add(hit.id); continue }
  }

  // 4) extras
  const extras = allMountains.filter(m => !expectedIds.has(m.id))
  console.log('[extra-count]', extras.length)
  for (const e of extras) console.log('[extra]', e.id, e.name)

  if (APPLY) {
    if (extras.length !== 1) {
      console.error('Abort: expected exactly 1 extra row to delete.')
      process.exit(2)
    }
    const victim = extras[0]
    const { error: delErr } = await client.from('mountains').delete().eq('id', victim.id)
    if (delErr) { console.error('Delete failed:', delErr.message); process.exit(3) }
    console.log('Deleted:', victim.id, victim.name)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
