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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) { console.error('Missing env'); process.exit(1) }
  const client = createClient(url, key, { auth: { persistSession: false } })

  const targets = ['北岳','八ヶ岳','富士山','大菩薩岳','大菩薩嶺']
  const { data, error } = await client
    .from('mountains')
    .select('id,name,photo_url')
    .in('name', targets)
    .order('name')
  if (error) { console.error(error.message); process.exit(1) }
  for (const m of data) {
    console.log(`${m.name}\t${m.photo_url || ''}\t${m.id}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
