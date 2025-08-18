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

async function main() {
  loadEnvLocal()
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
    process.exit(1)
  }
  const rawArgs = process.argv.slice(2)
  const apply = rawArgs.includes('--apply')
  const args = rawArgs.filter(a => a !== '--apply')
  // usage:
  //   node scripts/rename-mountain.mjs            -> 万三郎岳 -> 天城山
  //   node scripts/rename-mountain.mjs 富士山 天城山 --apply
  //   node scripts/rename-mountain.mjs --apply    -> default names
  const fromName = args[0] || '万三郎岳'
  const toName = args[1] || '天城山'

  const client = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  const { data: existingTo, error: eTo } = await client
    .from('mountains').select('id,name').eq('name', toName)
  if (eTo) { console.error('Fetch error:', eTo.message); process.exit(1) }
  if (existingTo && existingTo.length > 0) {
    console.log(`[abort] 既に '${toName}' が ${existingTo.length} 件存在します。重複を避けるため処理を中断します。`)
    console.log(existingTo)
    process.exit(2)
  }

  const { data: fromRows, error: eFrom } = await client
    .from('mountains').select('id,name').eq('name', fromName)
  if (eFrom) { console.error('Fetch error:', eFrom.message); process.exit(1) }
  if (!fromRows || fromRows.length === 0) {
    console.log(`[info] '${fromName}' は見つかりませんでした。処理不要です。`)
    return
  }

  console.log(`[dry-run] rename ${fromRows.length} rows: '${fromName}' -> '${toName}'`)
  console.log(fromRows)
  if (!apply) { console.log('Use --apply to write changes.'); return }

  for (const r of fromRows) {
    const { error: upErr } = await client.from('mountains').update({ name: toName }).eq('id', r.id)
    if (upErr) {
      console.error('Update failed for', r.id, upErr.message)
    }
  }
  console.log('Applied rename for', fromRows.length, 'rows.')
}

main().catch(e => { console.error(e); process.exit(1) })
