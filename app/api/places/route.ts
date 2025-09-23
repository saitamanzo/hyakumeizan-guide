import { NextResponse } from 'next/server'
import { gzipSync, gunzipSync } from 'zlib'

type Place = {
  id: string
  name?: string
  lat?: number
  lon?: number
  tags?: Record<string, string>
  distance?: number
  osm_url?: string
  google_maps_url?: string
  image?: string
}

type PlacesResponse = Record<string, Place[]>

type OverpassElement = {
  type?: string
  id?: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  geometry?: { lat: number; lon: number }[]
  tags?: Record<string, string>
}

type OverpassResponse = {
  elements?: OverpassElement[]
}

const CATEGORY_QUERIES: Record<string, string> = {
  hot_springs: `
    node(around:RADIUS,LAT,LNG)[leisure=spa];
    node(around:RADIUS,LAT,LNG)[amenity=spa];
    way(around:RADIUS,LAT,LNG)[leisure=spa];
    relation(around:RADIUS,LAT,LNG)[leisure=spa];
  `,
  soba_restaurants: `
    node(around:RADIUS,LAT,LNG)[cuisine~"soba|そば|蕎麦"i];
    node(around:RADIUS,LAT,LNG)[amenity=restaurant][name~"そば|蕎麦|soba"i];
    way(around:RADIUS,LAT,LNG)[cuisine~"soba|そば|蕎麦"i];
    relation(around:RADIUS,LAT,LNG)[cuisine~"soba|そば|蕎麦"i];
  `,
  fishing_streams: `
    way(around:RADIUS,LAT,LNG)[waterway~"stream|river|brook|drain"i];
    relation(around:RADIUS,LAT,LNG)[waterway~"stream|river|brook|drain"i];
  `,
  hotels: `
    node(around:RADIUS,LAT,LNG)[tourism~"hotel|guest_house|hostel|motel"i];
    way(around:RADIUS,LAT,LNG)[tourism~"hotel|guest_house|hostel|motel"i];
    relation(around:RADIUS,LAT,LNG)[tourism~"hotel|guest_house|hostel|motel"i];
  `,
  ski_resorts: `
    node(around:RADIUS,LAT,LNG)[leisure=sports_centre][sport~"ski|スキー"i];
    node(around:RADIUS,LAT,LNG)[winter_sports];
    way(around:RADIUS,LAT,LNG)[leisure=ski_resort];
    relation(around:RADIUS,LAT,LNG)[leisure=ski_resort];
  `,
  attractions: `
    node(around:RADIUS,LAT,LNG)[tourism~"attraction|museum|viewpoint|theme_park|zoo|gallery"i];
    node(around:RADIUS,LAT,LNG)[historic];
    way(around:RADIUS,LAT,LNG)[tourism];
    relation(around:RADIUS,LAT,LNG)[tourism];
  `,
}

// (previous generic queryOverpass removed; we perform per-category queries with throttling)

// Simple in-memory cache for Overpass combined responses
const overpassCache = new Map<string, { ts: number, data: OverpassResponse }>()
const CACHE_TTL = 1000 * 60 * 10 // 10 minutes
// in-process locks to avoid duplicate Overpass fetches within same Node process
const localLocks = new Set<string>()

// Perform query per category to allow rate control and smaller responses
async function queryOverpassCategory(categoryKey: string, lat: string, lng: string, radius = '20000') {
  const qTemplate = CATEGORY_QUERIES[categoryKey]
  if (!qTemplate) return { elements: [] } as OverpassResponse
  const q = `[out:json][timeout:25];( ${qTemplate} );out center tags geom;`
  const body = `data=${encodeURIComponent(q.replace(/LAT/g, lat).replace(/LNG/g, lng).replace(/RADIUS/g, radius))}`
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    // return empty to avoid failing whole pipeline
    return { elements: [] } as OverpassResponse
  }
  const data = await res.json()
  return data as OverpassResponse
}

async function cachedQueryOverpass(lat: string, lng: string, radius = '20000') {
  const key = `${lat}:${lng}:${radius}`
  const now = Date.now()
  const hit = overpassCache.get(key)
  if (hit && (now - hit.ts) < CACHE_TTL) return hit.data

  // Try Redis for cached combined response if available (optional)
  const redis = await ensureRedis()
  const redisOverpassKey = `${REDIS_KEY_PREFIX}overpass:${key}`
  const redisTtl = Number(process.env.REDIS_OVERPASS_TTL_MS || String(CACHE_TTL))
  if (redis) {
    try {
      const raw = await redis.get(redisOverpassKey)
      if (raw) {
        try {
          let parsed: OverpassResponse
          if (raw.startsWith('GZ:')) {
            const b = Buffer.from(raw.slice(3), 'base64')
            const json = gunzipSync(b).toString('utf8')
            parsed = JSON.parse(json) as OverpassResponse
          } else {
            parsed = JSON.parse(raw) as OverpassResponse
          }
          // update in-memory cache for faster subsequent access
          overpassCache.set(key, { ts: now, data: parsed })
          try { if (typeof redis.incr === 'function') await redis.incr(`${REDIS_KEY_PREFIX}metrics:overpass:cache_hits`) } catch {}
          return parsed
        } catch {
          // ignore parse errors and fallthrough to fetch
        }
      } else {
        try { if (typeof redis.incr === 'function') await redis.incr(`${REDIS_KEY_PREFIX}metrics:overpass:cache_misses`) } catch {}
      }
    } catch {
      // ignore redis read errors and continue with in-memory fetch
    }
  }

  // in-process locks to avoid duplicate Overpass fetches within same Node process
  const localLockKey = `olock:${key}`
  const lockWaitMs = Number(process.env.OVERPASS_LOCAL_LOCK_WAIT_MS || '10000')
  const waitUntil = Date.now() + lockWaitMs
  if (localLocks.has(localLockKey)) {
    // wait for other in-process worker to finish and populate cache
    while (Date.now() < waitUntil) {
      await new Promise(r => setTimeout(r, 200))
      const cachedNow = overpassCache.get(key)
      if (cachedNow && (Date.now() - cachedNow.ts) < CACHE_TTL) return cachedNow.data
      if (redis) {
        try {
          const raw2 = await redis.get(redisOverpassKey)
          if (raw2) {
            try {
              let parsed2: OverpassResponse
              if (raw2.startsWith('GZ:')) {
                const b2 = Buffer.from(raw2.slice(3), 'base64')
                const json2 = gunzipSync(b2).toString('utf8')
                parsed2 = JSON.parse(json2) as OverpassResponse
              } else {
                parsed2 = JSON.parse(raw2) as OverpassResponse
              }
              overpassCache.set(key, { ts: now, data: parsed2 })
              try { if (typeof redis.incr === 'function') await redis.incr(`${REDIS_KEY_PREFIX}metrics:overpass:cache_hits`) } catch {}
              return parsed2
            } catch {}
          }
        } catch {}
      }
    }
    // timeout expired — fall through and perform fetch
  }

  // acquire local lock
  localLocks.add(localLockKey)
  // try distributed lock using Redlock if available, otherwise best-effort NX
  let distLockAcquired = false
  let redlockLock: { unlock?: () => Promise<void>; } | null = null
  if (redis) {
    const g = globalThis as unknown as { __redlock?: unknown }
    if (g.__redlock) {
      try {
        const redlock = g.__redlock as unknown as { lock(resource: string, ttl: number): Promise<{ unlock(): Promise<void> }> }
        const lockTtl = Number(process.env.REDIS_OVERPASS_LOCK_TTL_MS || '10000')
        const resource = `${REDIS_KEY_PREFIX}lock:overpass:${key}`
        const acquired = await redlock.lock(resource, lockTtl)
        redlockLock = acquired
        distLockAcquired = true
      } catch {
        // failed to acquire redlock, will fallback
      }
    }
    if (!distLockAcquired) {
      try {
        const distLockKey = `${REDIS_KEY_PREFIX}lock:overpass:${key}`
        const lockTtl = Number(process.env.REDIS_OVERPASS_LOCK_TTL_MS || '10000')
        try {
          const redisAny = redis as unknown as { set?: (...args: unknown[]) => unknown }
          try {
            const setRes = await (redisAny.set ? (redisAny.set(distLockKey, '1', 'PX', lockTtl, 'NX') as Promise<unknown>) : undefined)
            distLockAcquired = !!setRes
          } catch {
            // ignore
          }
        } catch {
          // ignore
        }
      } catch {}
    }
  }

  try {
    const categories = Object.keys(CATEGORY_QUERIES)
    const allElements: OverpassElement[] = []
    for (const cat of categories) {
      const resp = await queryOverpassCategory(cat, lat, lng, radius)
      if (Array.isArray(resp.elements)) allElements.push(...resp.elements)
      await new Promise((r) => setTimeout(r, 200))
    }
    const combined: OverpassResponse = { elements: allElements }
    overpassCache.set(key, { ts: now, data: combined })
    // persist to Redis (best-effort) with gzip+base64 prefix
    if (redis) {
      try {
        const json = JSON.stringify(combined)
        const gz = gzipSync(Buffer.from(json, 'utf8'))
        const payload = `GZ:${gz.toString('base64')}`
        await redis.set(redisOverpassKey, payload, 'PX', redisTtl)
      } catch {
        // ignore
      }
    }
    return combined
  } finally {
    // release dist lock if we acquired
    try {
      if (redlockLock && typeof redlockLock.unlock === 'function') {
        try { await redlockLock.unlock() } catch {}
      } else if (distLockAcquired && redis) {
        try {
          const delKey = `${REDIS_KEY_PREFIX}lock:overpass:${key}`
          if (typeof (redis as unknown as { del?: unknown }).del === 'function') {
            try { await (redis as unknown as { del?: (k: string) => Promise<number> }).del!(delKey) } catch {}
          }
        } catch {}
      }
    } catch {}
    // release local lock
    try { localLocks.delete(localLockKey) } catch {}
  }
}

interface RedisLike {
  get(key: string): Promise<string | null>
  set(key: string, value: string, mode?: string, duration?: number): Promise<string | null>
  incr?(key: string): Promise<number>
  // optional helper for passing non-standard SET args (e.g. NX)
  setWithOptions?(...args: unknown[]): Promise<unknown>
  del?(key: string): Promise<number>
}

let redisClient: RedisLike | null = null
const REDIS_URL = process.env.REDIS_URL
const REDIS_KEY_PREFIX = process.env.REDIS_KEY_PREFIX || 'hyakumeizan:'
async function ensureRedis() {
  if (!REDIS_URL) return null
  // reuse singleton across module reloads
  const g = globalThis as unknown as { __redisClient?: unknown }
  if (g.__redisClient) {
    redisClient = g.__redisClient as unknown as RedisLike
    return redisClient
  }
  try {
    // dynamic import optional dependency
    const mod = await import('ioredis')
    const IORedis = (mod as unknown as { default?: unknown }).default ?? mod
    const opts = {
      maxRetriesPerRequest: Number(process.env.REDIS_MAX_RETRIES || '10'),
      enableReadyCheck: true,
      lazyConnect: false,
      connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || '5000'),
      // exponential retryStrategy in ms (attempt -> delay)
      retryStrategy: (times: number) => Math.min(100 * Math.pow(2, times), 10000),
      // reconnectOnError example
      reconnectOnError: (err: Error) => {
        return /ECONNRESET|EPIPE|ETIMEDOUT|ECONNREFUSED/.test(String(err))
      },
    }
  const ClientConstructor = IORedis as unknown as { new(url: string, opts?: unknown): unknown }
  const client = new ClientConstructor(REDIS_URL, opts) as unknown
  const clientAny = client as unknown as { on?: (...args: unknown[]) => void }
    // attach a small wrapper to allow set with extra args through our typed RedisLike
    try {
      const clientWithSet = client as unknown as { set?: (...args: unknown[]) => unknown }
      try {
  ;(clientAny as unknown as { setWithOptions?: (...args: unknown[]) => unknown }).setWithOptions = (...args: unknown[]) => (clientWithSet.set ? (clientWithSet.set(...args) as unknown) : undefined)
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
    try {
      if (typeof clientAny.on === 'function') {
            clientAny.on('error', (err: unknown) => {
              console.warn('redis error', err)
              const gm = globalThis as unknown as { __redisMetrics?: { errors: number, connects: number } }
              gm.__redisMetrics = gm.__redisMetrics || { errors: 0, connects: 0 }
              gm.__redisMetrics.errors += 1
            })
            clientAny.on('connect', () => {
              const gm = globalThis as unknown as { __redisMetrics?: { errors: number, connects: number } }
              gm.__redisMetrics = gm.__redisMetrics || { errors: 0, connects: 0 }
              gm.__redisMetrics.connects += 1
            })
            clientAny.on('ready', () => { /* ready */ })
      }
    } catch {
      // ignore
    }
  // store singleton
  g.__redisClient = clientAny
  redisClient = clientAny as unknown as RedisLike
  // initialize redlock (best-effort)
  try {
    const rmod = await import('redlock')
    const Redlock = (rmod as unknown as { default?: unknown }).default ?? (rmod as unknown)
    const RedlockCtor = Redlock as unknown as { new(clients: unknown[], opts?: unknown): unknown }
    const redlock = new RedlockCtor([client as unknown], { retryCount: Number(process.env.REDLOCK_RETRY || '3') })
    ;(globalThis as unknown as { __redlock?: unknown }).__redlock = redlock
  } catch {
    // ignore if redlock not available
  }
  return redisClient
  } catch {
    redisClient = null
    return null
  }
}

// Helper: attempt to flush selected Redis metrics to Pushgateway or StatsD (best-effort)
async function flushMetricsIfDue(redis: RedisLike | null) {
  if (!redis) return
  const PUSH_URL = process.env.PUSHGATEWAY_URL
  const STATSD_HOST = process.env.STATSD_HOST
  const FLUSH_INTERVAL = Number(process.env.METRICS_FLUSH_INTERVAL_MS || '60000')
  const g = globalThis as unknown as { __metricsLastFlush?: number, __metricsFlushRunning?: boolean }
  const now = Date.now()
  if (g.__metricsFlushRunning) return
  if (g.__metricsLastFlush && (now - g.__metricsLastFlush) < FLUSH_INTERVAL) return
  g.__metricsFlushRunning = true
  try {
    const keys = [
      `${REDIS_KEY_PREFIX}metrics:overpass:cache_hits`,
      `${REDIS_KEY_PREFIX}metrics:overpass:cache_misses`,
      `${REDIS_KEY_PREFIX}metrics:thumbnail:cache_hits`,
      `${REDIS_KEY_PREFIX}metrics:thumbnail:cache_misses`,
    ]
    const pairs: Record<string, number> = {}
    for (const k of keys) {
      try {
        const v = await redis.get(k)
        pairs[k] = Number(v || '0')
      } catch {
        pairs[k] = 0
      }
    }

    // Prepare Prometheus text format with labels
    const job = 'places'
    const instance = process.env.INSTANCE_ID || process.env.HOSTNAME || 'unknown'
    const labelStr = `{job="${job}",instance="${instance}"}`
    let body = ''
    const v1 = pairs[`${REDIS_KEY_PREFIX}metrics:overpass:cache_hits`] || pairs['metrics:overpass:cache_hits'] || 0
    const v2 = pairs[`${REDIS_KEY_PREFIX}metrics:overpass:cache_misses`] || pairs['metrics:overpass:cache_misses'] || 0
    const v3 = pairs[`${REDIS_KEY_PREFIX}metrics:thumbnail:cache_hits`] || pairs['metrics:thumbnail:cache_hits'] || 0
    const v4 = pairs[`${REDIS_KEY_PREFIX}metrics:thumbnail:cache_misses`] || pairs['metrics:thumbnail:cache_misses'] || 0
    body += `# TYPE overpass_cache_hits counter\n` + `overpass_cache_hits${labelStr} ${v1}\n`
    body += `# TYPE overpass_cache_misses counter\n` + `overpass_cache_misses${labelStr} ${v2}\n`
    body += `# TYPE thumbnail_cache_hits counter\n` + `thumbnail_cache_hits${labelStr} ${v3}\n`
    body += `# TYPE thumbnail_cache_misses counter\n` + `thumbnail_cache_misses${labelStr} ${v4}\n`

    if (PUSH_URL) {
      // Pushgateway prefers a path like: /metrics/job/<job>/instance/<instance>
      const pushPath = PUSH_URL.replace(/\/+$/, '') + `/metrics/job/${encodeURIComponent(job)}/instance/${encodeURIComponent(instance)}`
      try { await fetch(pushPath, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body }) } catch {}
    }

    if (STATSD_HOST) {
      try {
        const client = await ensureStatsD()
        if (client) {
          try {
            client.increment('overpass_cache_hits', pairs[`${REDIS_KEY_PREFIX}metrics:overpass:cache_hits`] || pairs['metrics:overpass:cache_hits'] || 0)
            client.increment('overpass_cache_misses', pairs[`${REDIS_KEY_PREFIX}metrics:overpass:cache_misses`] || pairs['metrics:overpass:cache_misses'] || 0)
            client.increment('thumbnail_cache_hits', pairs[`${REDIS_KEY_PREFIX}metrics:thumbnail:cache_hits`] || pairs['metrics:thumbnail:cache_hits'] || 0)
            client.increment('thumbnail_cache_misses', pairs[`${REDIS_KEY_PREFIX}metrics:thumbnail:cache_misses`] || pairs['metrics:thumbnail:cache_misses'] || 0)
          } catch {}
        }
      } catch {}
    }

    // reset counters (best-effort)
    for (const k of keys) {
      try { await redis.set(k, '0', 'PX', 24 * 60 * 60 * 1000) } catch {}
    }
    g.__metricsLastFlush = Date.now()
  } finally {
    g.__metricsFlushRunning = false
  }
}

async function ensureStatsD() {
  const STATSD_HOST = process.env.STATSD_HOST
  if (!STATSD_HOST) return null
  const g = globalThis as unknown as { __statsdClient?: unknown }
  if (g.__statsdClient) return g.__statsdClient as unknown as { increment: (s: string, v?: number) => void }
  try {
    const hsMod = await import('hot-shots')
  const StatsD = (hsMod as unknown as { StatsD?: unknown }).StatsD ?? (hsMod as unknown as { default?: unknown }).default ?? hsMod
  const StatsCtor = StatsD as unknown as { new(opts?: { host?: string, port?: number }): unknown }
    const client = new StatsCtor({ host: STATSD_HOST, port: Number(process.env.STATSD_PORT || '8125') }) as unknown as { increment: (s: string, v?: number) => void, close?: () => void }
    g.__statsdClient = client
    // register process exit handlers to close client if possible
    try {
      const closer = () => { try { if (client && typeof (client as unknown as { close?: unknown }).close === 'function') (client as unknown as { close?: () => void }).close!() } catch {} }
      if (typeof process !== 'undefined') {
        const p = process as unknown as { on?: (ev: string, fn: () => void) => void }
        if (typeof p.on === 'function') {
          p.on('SIGINT', closer)
          p.on('SIGTERM', closer)
          p.on('beforeExit', closer)
        }
      }
    } catch {}
    return client
  } catch {
    return null
  }
}


async function fetchWikimediaThumbnail(fileName: string): Promise<string | undefined> {
  try {
    // attempt to initialize redis client if REDIS_URL is set
    const redis = await ensureRedis()
    // check Redis first (if available)
    if (redis) {
      try {
        const v = await redis.get(`${REDIS_KEY_PREFIX}thumb:${fileName}`)
        if (v) return v
      } catch {
        // ignore redis errors and fallback to in-memory
      }
    }
    // check in-memory cache
    const now = Date.now()
    const cached = thumbnailCache.get(fileName)
    if (cached && (now - cached.ts) < THUMBNAIL_TTL) return cached.url

    const api = `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&format=json&origin=*&titles=File:${encodeURIComponent(fileName)}`
    const res = await fetch(api)
    if (!res.ok) return undefined
    const json = await res.json()
    const pages = json.query?.pages
    if (!pages) return undefined
    for (const k of Object.keys(pages)) {
      const p = pages[k]
      const info = p.imageinfo && p.imageinfo[0]
      if (info && info.thumburl) {
        const url = info.thumburl as string
        // update caches
        thumbnailCache.set(fileName, { ts: Date.now(), url })
        if (redis) {
          try { await redis.set(`${REDIS_KEY_PREFIX}thumb:${fileName}`, url, 'PX', THUMBNAIL_TTL) } catch {}
        }
        return url
      }
      if (info && info.url) {
        const url = info.url as string
        thumbnailCache.set(fileName, { ts: Date.now(), url })
        if (redis) {
          try { await redis.set(`${REDIS_KEY_PREFIX}thumb:${fileName}`, url, 'PX', THUMBNAIL_TTL) } catch {}
        }
        return url
      }
    }
  } catch {
    // ignore
  }
  return undefined
}

// short-term cache for thumbnails
const thumbnailCache = new Map<string, { ts: number, url: string }>()
// default thumbnail TTL: 24 hours (ms) - can be overridden by env THUMBNAIL_TTL_MS
const THUMBNAIL_TTL = Number(process.env.THUMBNAIL_TTL_MS || String(1000 * 60 * 60 * 24))

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (deg: number) => deg * Math.PI / 180
  const R = 6371e3 // meters
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const Δφ = toRad(lat2 - lat1)
  const Δλ = toRad(lon2 - lon1)
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

function osmUrlFor(el: OverpassElement) {
  if (!el.type || !el.id) return undefined
  return `https://www.openstreetmap.org/${el.type}/${el.id}`
}

function googleMapsUrl(lat?: number, lon?: number) {
  if (lat == null || lon == null) return undefined
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`
}

function extractImage(tags?: Record<string,string>) {
  if (!tags) return undefined
  if (tags.image) return tags.image
  if (tags.wikimedia_commons) return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(tags.wikimedia_commons)}`
  if (tags['image:'] ) return tags['image:']
  return undefined
}

async function groupByCategory(overpassData: OverpassResponse, centerLat: number, centerLon: number): Promise<PlacesResponse> {
  const out: PlacesResponse = {}
  const elements = Array.isArray(overpassData.elements) ? overpassData.elements : []
  for (const el of elements) {
    if (!el.type || !el.tags) continue
    // compute lat/lon: prefer node lat/lon, then center, then centroid of geometry
    let lat = el.lat ?? el.center?.lat
    let lon = el.lon ?? el.center?.lon
    if ((lat == null || lon == null) && Array.isArray(el.geometry) && el.geometry.length > 0) {
      // compute centroid of geometry points
      let sumX = 0
      let sumY = 0
      for (const g of el.geometry) {
        sumX += g.lat
        sumY += g.lon
      }
      lat = sumX / el.geometry.length
      lon = sumY / el.geometry.length
    }
    const place: Place = {
      id: `${el.type}/${el.id}`,
      name: el.tags?.name,
      lat: lat,
      lon: lon,
      tags: el.tags,
    }
    const distance = (lat != null && lon != null) ? haversineDistance(centerLat, centerLon, lat, lon) : undefined
    const osm_url = osmUrlFor(el)
    const google_maps_url = googleMapsUrl(lat, lon)
    let image = extractImage(el.tags)
    // if it's a commons file like 'File:...' or tag 'wikimedia_commons' present, try to fetch a thumbnail
    if (!image && el.tags) {
      const candidate = el.tags.wikimedia_commons || el.tags.image || el.tags['image']
      if (candidate) {
        // candidate may be a URL or a file name; if it looks like a filename (no http), try fetch
        if (!/^https?:\/\//i.test(candidate)) {
          const thumb = await fetchWikimediaThumbnail(candidate)
          if (thumb) image = thumb
        }
      }
    }
    // attach metadata
    const enriched = { ...place, distance, osm_url, google_maps_url, image }

    // classify
    if (el.tags && (el.tags.leisure === 'spa' || el.tags.amenity === 'spa' || el.tags.hot_spring)) {
      out.hot_springs = out.hot_springs || []
      out.hot_springs.push(enriched)
      continue
    }
    if (el.tags && ((el.tags.cuisine && /soba|そば|蕎麦/i.test(el.tags.cuisine)) || (el.tags.name && /そば|蕎麦|soba/i.test(el.tags.name)))) {
      out.soba_restaurants = out.soba_restaurants || []
      out.soba_restaurants.push(enriched)
      continue
    }
    if (el.tags && (el.tags.tourism && /hotel|guest_house|hostel|motel/i.test(el.tags.tourism))) {
      out.hotels = out.hotels || []
      out.hotels.push(enriched)
      continue
    }
    if (el.tags && ((el.tags.leisure && /ski|winter/i.test(el.tags.leisure)) || (el.tags.winter_sports))) {
      out.ski_resorts = out.ski_resorts || []
      out.ski_resorts.push(enriched)
      continue
    }
    if (el.tags && (el.tags.tourism || el.tags.historic || el.tags.museum || el.tags.viewpoint)) {
      out.attractions = out.attractions || []
      out.attractions.push(enriched)
      continue
    }
    // fallback
    out.others = out.others || []
    out.others.push(enriched)
  }
  return out
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const lat = url.searchParams.get('lat')
    const lng = url.searchParams.get('lng')
    const radius = url.searchParams.get('radius') || '20000'
    if (!lat || !lng) {
      return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })
    }
  const data = await cachedQueryOverpass(lat, lng, radius)
  const grouped = await groupByCategory(data, Number(lat), Number(lng))
  // fire-and-forget metrics flush
  try { const r = await ensureRedis(); void flushMetricsIfDue(r) } catch {}
    // sort each category by distance asc
    for (const k of Object.keys(grouped)) {
      const withCoords = grouped[k].filter(p => p.lat != null && p.lon != null)
      const without = grouped[k].filter(p => p.lat == null || p.lon == null)
      withCoords.sort((a,b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
      grouped[k] = withCoords.concat(without)
    }
    return NextResponse.json({ ok: true, data: grouped })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('places API error', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
