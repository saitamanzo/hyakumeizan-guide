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

function isUUID(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

async function resolveMountain(client, key) {
  if (isUUID(key)) {
    const { data, error } = await client.from('mountains').select('*').eq('id', key).maybeSingle()
    if (error) throw new Error(error.message)
    return data
  } else {
    const { data, error } = await client.from('mountains').select('*').eq('name', key)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) return null
    if (data.length > 1) return { __ambiguous: true, items: data }
    return data[0]
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
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const getArgVal = (flag) => {
    const i = args.indexOf(flag)
    if (i === -1) return null
    return args[i + 1] || null
  }
  const keepKey = getArgVal('--keep')
  const removeKey = getArgVal('--remove')
  if (!keepKey || !removeKey) {
    console.log('Usage: node scripts/merge-duplicate-mountains.mjs --keep <id|name> --remove <id|name> [--apply]')
    process.exit(2)
  }

  const client = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  const keep = await resolveMountain(client, keepKey)
  const remove = await resolveMountain(client, removeKey)
  if (!keep || !remove) {
    console.error('keep/remove target not found')
    process.exit(3)
  }
  if (keep.__ambiguous || remove.__ambiguous) {
    console.error('Ambiguous name matched multiple rows. Please specify IDs.')
    if (keep.__ambiguous) console.error(' keep candidates:', keep.items.map(x => `${x.id}\t${x.name}`).join('\n '))
    if (remove.__ambiguous) console.error(' remove candidates:', remove.items.map(x => `${x.id}\t${x.name}`).join('\n '))
    process.exit(4)
  }

  console.log('[dry-run] Merge preview:')
  console.log('  KEEP  :', keep.id, keep.name)
  console.log('  REMOVE:', remove.id, remove.name)

  if (!apply) {
    console.log('Use --apply to execute changes.')
    return
  }

  // 1) mountain_favorites: prevent unique conflicts
  try {
    const { data: favKeep } = await client.from('mountain_favorites').select('id,user_id').eq('mountain_id', keep.id)
    const { data: favRem } = await client.from('mountain_favorites').select('id,user_id').eq('mountain_id', remove.id)
    const keepUsers = new Set((favKeep || []).map(r => r.user_id))
    const overlaps = new Set()
    for (const r of (favRem || [])) if (keepUsers.has(r.user_id)) overlaps.add(r.id)
    if (overlaps.size) {
      await client.from('mountain_favorites').delete().in('id', Array.from(overlaps))
    }
    await client.from('mountain_favorites').update({ mountain_id: keep.id }).eq('mountain_id', remove.id)
  } catch (e) {
    console.warn('mountain_favorites merge skipped or failed:', e.message || e)
  }

  // 2) climbs, reviews, routes, climbing_plans
  const refTables = [
    { table: 'climbs', col: 'mountain_id' },
    { table: 'reviews', col: 'mountain_id' },
    { table: 'routes', col: 'mountain_id' },
    { table: 'climbing_plans', col: 'mountain_id' },
  ]
  for (const ref of refTables) {
    try {
      const { error } = await client.from(ref.table).update({ [ref.col]: keep.id }).eq(ref.col, remove.id)
      if (error) console.warn(`Update ${ref.table} failed:`, error.message)
    } catch (e) {
      console.warn(`Update ${ref.table} skipped:`, e.message || e)
    }
  }

  // 3) likes table (if exists and has mountain_id)
  try {
    await client.from('likes').update({ mountain_id: keep.id }).eq('mountain_id', remove.id)
  } catch {}

  // 4) copy photo_url if keep lacks it
  try {
    if ((!keep.photo_url || keep.photo_url === '') && remove.photo_url) {
      const { error } = await client.from('mountains').update({ photo_url: remove.photo_url }).eq('id', keep.id)
      if (error) console.warn('Failed to copy photo_url to keep:', error.message)
      else keep.photo_url = remove.photo_url
    }
  } catch (e) {
    console.warn('photo_url copy skipped:', e.message || e)
  }

  // 5) delete remove mountain
  const { error: delErr } = await client.from('mountains').delete().eq('id', remove.id)
  if (delErr) {
    console.error('Delete remove failed:', delErr.message)
    process.exit(5)
  }
  console.log('Merge completed.')
}

main().catch(e => { console.error(e); process.exit(1) })
