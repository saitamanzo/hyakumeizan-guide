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

function toOriginalUploadFromUploadUrl(input) {
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

async function resolveOriginalUploadFromSpecialFilePath(input) {
  try {
    const u = new URL(input)
    if (!/\/wiki\/Special:FilePath\//.test(u.pathname)) return null
    const fileName = decodeURIComponent(u.pathname.replace('/wiki/Special:FilePath/', ''))
    if (!fileName) return null
    return await resolveOriginalUploadFromFileName(fileName)
  } catch {
    return null
  }
}

function normalizeToFileNamespace(name) {
  try {
    const decoded = decodeURIComponent(name)
    const idx = decoded.indexOf(':')
    if (idx === -1) return `File:${decoded}`
    const rest = decoded.slice(idx + 1)
    return `File:${rest}`
  } catch {
    return typeof name === 'string' ? `File:${name}` : null
  }
}

async function resolveOriginalUploadFromFileName(rawName) {
  try {
    const fileTitle = normalizeToFileNamespace(rawName)
    if (!fileTitle) return null
    const api = new URL('https://commons.wikimedia.org/w/api.php')
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

async function normalizeInputToUploadOriginal(input) {
  try {
    const u = new URL(input)
    if (u.hostname === 'upload.wikimedia.org') {
      return toOriginalUploadFromUploadUrl(input)
    }
    if (/\/wiki\//.test(u.pathname)) {
      if (/\/wiki\/Special:FilePath\//.test(u.pathname)) {
        return await resolveOriginalUploadFromSpecialFilePath(input)
      }
      // Handle direct file pages like /wiki/File:... or /wiki/ファイル:...
      const afterWiki = decodeURIComponent(u.pathname.replace(/^.*\/wiki\//, ''))
      if (/^(File:|ファイル:)/i.test(afterWiki)) {
        return await resolveOriginalUploadFromFileName(afterWiki)
      }
      // Handle #/media/File:... anchors
      if (u.hash && /#\/media\//.test(u.hash)) {
        const mediaPart = decodeURIComponent(u.hash.replace('#/media/', ''))
        if (mediaPart) {
          return await resolveOriginalUploadFromFileName(mediaPart)
        }
      }
      return null
    }
    return null
  } catch {
    return null
  }
}

function parseArgs() {
  const args = process.argv.slice(2)
  return {
    apply: args.includes('--apply'),
    limit: Number(args[args.indexOf('--limit') + 1]) || 500,
  nullifyInvalid: args.includes('--nullify-invalid'),
  force: args.includes('--force'),
  all: args.includes('--all'),
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
  const { apply, limit, nullifyInvalid, force, all } = parseArgs()
  const client = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  let query = client
    .from('mountains')
    .select('id,name,photo_url')
    .not('photo_url', 'is', null)
    .order('name', { ascending: true })

  if (!all) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Query error:', error.message)
    process.exit(1)
  }

  let changed = 0
  const updates = []

  for (const m of data || []) {
    const current = m.photo_url
    if (typeof current !== 'string' || !current) continue
    let normalized = null
    const host = (() => { try { return new URL(current).hostname } catch { return '' } })()
    if (host === 'upload.wikimedia.org') {
      normalized = toOriginalUploadFromUploadUrl(current)
    } else {
      normalized = await normalizeInputToUploadOriginal(current)
    }
    if (!normalized || typeof normalized !== 'string') {
      if (nullifyInvalid) {
        updates.push({ id: m.id, name: m.name, from: current, to: null })
      } else if (force) {
        // force an update even if we cannot normalize
        updates.push({ id: m.id, name: m.name, from: current, to: current })
      }
    } else {
      if (normalized !== current || force) {
        updates.push({ id: m.id, name: m.name, from: current, to: normalized })
      }
    }
    // polite delay for API usage
    await new Promise(r => setTimeout(r, 60))
  }

  if (!updates.length) {
    console.log('No changes needed.')
    return
  }

  if (!apply) {
    const nullCount = updates.filter(u => u.to === null).length
    const changeCount = updates.length - nullCount
    console.log(`[dry-run] ${updates.length} rows would be updated. (${changeCount} normalize, ${nullCount} nullify)`) 
    console.log(updates.slice(0, 10))
    console.log('Use --apply to perform updates.')
    return
  }

  for (const u of updates) {
    const { error: upErr } = await client.from('mountains').update({ photo_url: u.to }).eq('id', u.id)
    if (upErr) {
      console.error('Update failed:', u.id, upErr.message)
    } else {
      changed++
    }
    await new Promise(r => setTimeout(r, 40))
  }

  const nullCount = updates.filter(u => u.to === null).length
  const changeCount = updates.length - nullCount
  console.log(`Updated ${changed} / ${updates.length} rows. (${changeCount} normalized, ${nullCount} nullified)`) 
}

main().catch((e) => { console.error(e); process.exit(1) })
