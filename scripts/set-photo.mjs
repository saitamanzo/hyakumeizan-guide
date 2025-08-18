#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

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

function normalizeWikipediaUrl(input) {
  try {
    const u = new URL(input)
    if (u.protocol !== 'https:') return null
    if (u.hostname === 'upload.wikimedia.org') return u.toString()
    const isWiki = u.hostname.endsWith('wikipedia.org') || u.hostname.endsWith('wikimedia.org')
    if (!isWiki) return null
    if (/^\/wiki\/Special:FilePath\//.test(u.pathname)) {
      return u.toString()
    }
    if (u.pathname.startsWith('/wiki/')) {
      const fileFromHash = u.hash && u.hash.startsWith('#/media/') ? decodeURIComponent(u.hash.replace('#/media/', '')) : ''
      const fileFromPath = decodeURIComponent(u.pathname.replace('/wiki/', ''))
      const fileCandidate = fileFromHash || (/^(?:ファイル:|File:)/i.test(fileFromPath) ? fileFromPath : '')
      if (!fileCandidate) return null
      const fileName = fileCandidate.replace(/^ファイル:|^File:/i, '')
      return `${u.protocol}//${u.hostname}/wiki/Special:FilePath/${encodeURIComponent(fileName)}`
    }
    return null
  } catch {
    return null
  }
}

function parseArgs() {
  const args = process.argv.slice(2)
  const out = { id: null, name: null, url: null }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--id') out.id = args[++i]
    else if (a === '--name') out.name = args[++i]
    else if (a === '--url') out.url = args[++i]
  }
  if ((!out.id && !out.name) || !out.url) {
    console.error('Usage: node scripts/set-photo.mjs --id <uuid> | --name <mountain name> --url <photoUrl>')
    process.exit(1)
  }
  return out
}

async function main() {
  // Load .env.local for local runs
  loadEnvLocal()
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
    process.exit(1)
  }
  const { id, name, url } = parseArgs()
  const normalized = normalizeWikipediaUrl(url)
  if (!normalized) {
    console.error('Unsupported URL. Use upload.wikimedia.org or File/Special:FilePath URL.')
    process.exit(1)
  }
  const client = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  let targetId = id
  if (!targetId && name) {
    const { data, error } = await client.from('mountains').select('id').eq('name', name).single()
    if (error || !data) {
      console.error('Mountain not found by name:', name)
      process.exit(1)
    }
    targetId = data.id
  }

  const { error: upErr } = await client.from('mountains').update({ photo_url: normalized }).eq('id', targetId)
  if (upErr) {
    console.error('Update failed:', upErr.message)
    process.exit(1)
  }
  console.log('Updated:', { id: targetId, photo_url: normalized })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
