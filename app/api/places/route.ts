import { NextResponse } from 'next/server'

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

type OverpassResponse = { elements?: OverpassElement[] }

const CATEGORY_QUERIES: Record<string, string> = {
  hot_springs: `
    node(around:RADIUS,LAT,LNG)[leisure=spa];
    node(around:RADIUS,LAT,LNG)[amenity=spa];
    way(around:RADIUS,LAT,LNG)[leisure=spa];
    relation(around:RADIUS,LAT,LNG)[leisure=spa];
  `,
  soba_restaurants: `
    node(around:RADIUS,LAT,LNG)[cuisine~"soba|そば|蕎麦"];
    node(around:RADIUS,LAT,LNG)[amenity=restaurant][name~"そば|蕎麦|soba"];
    way(around:RADIUS,LAT,LNG)[cuisine~"soba|そば|蕎麦"];
    relation(around:RADIUS,LAT,LNG)[cuisine~"soba|そば|蕎麦"];
  `,
  fishing_streams: `
    way(around:RADIUS,LAT,LNG)[waterway~"stream|river|brook|drain"];
    relation(around:RADIUS,LAT,LNG)[waterway~"stream|river|brook|drain"];
  `,
  hotels: `
    node(around:RADIUS,LAT,LNG)[tourism~"hotel|guest_house|hostel|motel"];
    way(around:RADIUS,LAT,LNG)[tourism~"hotel|guest_house|hostel|motel"];
    relation(around:RADIUS,LAT,LNG)[tourism~"hotel|guest_house|hostel|motel"];
  `,
  ski_resorts: `
    node(around:RADIUS,LAT,LNG)[leisure=sports_centre][sport~"ski|スキー"];
    node(around:RADIUS,LAT,LNG)[winter_sports];
    way(around:RADIUS,LAT,LNG)[leisure=ski_resort];
    relation(around:RADIUS,LAT,LNG)[leisure=ski_resort];
  `,
  attractions: `
    node(around:RADIUS,LAT,LNG)[tourism~"attraction|museum|viewpoint|theme_park|zoo|gallery"];
    node(around:RADIUS,LAT,LNG)[historic];
    way(around:RADIUS,LAT,LNG)[tourism];
    relation(around:RADIUS,LAT,LNG)[tourism];
  `,
}

const overpassCache = new Map<string, { ts: number; data: OverpassResponse }>()
const CACHE_TTL = 1000 * 60 * 10 // 10 minutes
const localLocks = new Set<string>()

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
  if (!res.ok) return { elements: [] } as OverpassResponse
  return (await res.json()) as OverpassResponse
}

async function cachedQueryOverpass(lat: string, lng: string, radius = '20000') {
  const key = `${lat}:${lng}:${radius}`
  const now = Date.now()
  const hit = overpassCache.get(key)
  if (hit && now - hit.ts < CACHE_TTL) return hit.data

  const localLockKey = `olock:${key}`
  const lockWaitMs = Number(process.env.OVERPASS_LOCAL_LOCK_WAIT_MS || '10000')
  const waitUntil = Date.now() + lockWaitMs
  if (localLocks.has(localLockKey)) {
    while (Date.now() < waitUntil) {
      await new Promise((r) => setTimeout(r, 200))
      const cachedNow = overpassCache.get(key)
      if (cachedNow && Date.now() - cachedNow.ts < CACHE_TTL) return cachedNow.data
    }
  }

  localLocks.add(localLockKey)
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
    return combined
  } finally {
    localLocks.delete(localLockKey)
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371e3
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const Δφ = toRad(lat2 - lat1)
  const Δλ = toRad(lon2 - lon1)
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
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

function extractImage(tags?: Record<string, string>) {
  if (!tags) return undefined
  if (tags.image && /^https?:\/\//i.test(tags.image)) return tags.image
  if (tags.wikimedia_commons && /^https?:\/\//i.test(tags.wikimedia_commons)) return tags.wikimedia_commons
  return undefined
}

const thumbnailCache = new Map<string, { ts: number; url: string }>()
const THUMBNAIL_TTL = Number(process.env.THUMBNAIL_TTL_MS || String(1000 * 60 * 60 * 24))

async function fetchWikimediaThumbnail(identifier: string): Promise<string | undefined> {
  const now = Date.now()
  const cached = thumbnailCache.get(identifier)
  if (cached && now - cached.ts < THUMBNAIL_TTL) return cached.url

  async function fetchImageInfoByTitle(title: string): Promise<string | undefined> {
    try {
      const api = `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&format=json&origin=*&titles=${encodeURIComponent(title)}`
      const res = await fetch(api)
      if (!res.ok) return undefined
      const json = await res.json()
      const pages = json.query?.pages
      if (!pages) return undefined
      for (const k of Object.keys(pages)) {
        const p = pages[k]
        const info = p.imageinfo && p.imageinfo[0]
        const url = info?.thumburl || info?.url
        if (url) return url
      }
    } catch {
      // ignore
    }
    return undefined
  }

  async function fetchFromCategory(catName: string): Promise<string | undefined> {
    try {
      const title = catName.startsWith('Category:') ? catName : `Category:${catName}`
      const cmApi = `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(title)}&cmtype=file&cmlimit=5&format=json&origin=*`
      const res = await fetch(cmApi)
      if (!res.ok) return undefined
      const json = await res.json()
      const members = json.query?.categorymembers || []
      for (const m of members) {
        const fileTitle = m.title
        if (fileTitle) {
          const url = await fetchImageInfoByTitle(fileTitle)
          if (url) return url
        }
      }
    } catch {
      // ignore
    }
    return undefined
  }

  // Try several resolution strategies
  // 1) If identifier looks like File:..., query that title
  // 2) If identifier looks like Category:..., list category members and get first file
  // 3) Try raw identifier as a File: title
  // 4) Try prefixing with File:
  try {
    // Category
    if (/^Category:/i.test(identifier)) {
      const fromCat = await fetchFromCategory(identifier)
      if (fromCat) {
        thumbnailCache.set(identifier, { ts: Date.now(), url: fromCat })
        return fromCat
      }
    }

    // File: or Image:
    if (/^(File|Image):/i.test(identifier)) {
      const url = await fetchImageInfoByTitle(identifier)
      if (url) {
        thumbnailCache.set(identifier, { ts: Date.now(), url })
        return url
      }
    }

    // Try raw as file title
    const tryRaw = await fetchImageInfoByTitle(identifier)
    if (tryRaw) {
      thumbnailCache.set(identifier, { ts: Date.now(), url: tryRaw })
      return tryRaw
    }

    // Try with File: prefix
    const tryFilePref = await fetchImageInfoByTitle(`File:${identifier}`)
    if (tryFilePref) {
      thumbnailCache.set(identifier, { ts: Date.now(), url: tryFilePref })
      return tryFilePref
    }

    // If it contains 'Category' somewhere, attempt category lookup
    if (/Category:/i.test(identifier) || /category/i.test(identifier)) {
      const fromCat2 = await fetchFromCategory(identifier.replace(/^Category:/i, ''))
      if (fromCat2) {
        thumbnailCache.set(identifier, { ts: Date.now(), url: fromCat2 })
        return fromCat2
      }
    }
  } catch {
    // ignore
  }

  return undefined
}

async function groupByCategory(overpassData: OverpassResponse, centerLat: number, centerLon: number): Promise<PlacesResponse> {
  const out: PlacesResponse = {}
  const elements = Array.isArray(overpassData.elements) ? overpassData.elements : []
  for (const el of elements) {
    if (!el.type || !el.tags) continue
    let lat = el.lat ?? el.center?.lat
    let lon = el.lon ?? el.center?.lon
    if ((lat == null || lon == null) && Array.isArray(el.geometry) && el.geometry.length > 0) {
      let sumLat = 0
      let sumLon = 0
      for (const g of el.geometry) {
        sumLat += g.lat
        sumLon += g.lon
      }
      lat = sumLat / el.geometry.length
      lon = sumLon / el.geometry.length
    }

    const place: Place = { id: `${el.type}/${el.id}`, name: el.tags?.name, lat, lon, tags: el.tags }
    const distance = lat != null && lon != null ? haversineDistance(centerLat, centerLon, lat, lon) : undefined
    const osm_url = osmUrlFor(el)
    const google_maps_url = googleMapsUrl(lat, lon)
    let image = extractImage(el.tags)
    if (!image && el.tags) {
      const candidate = el.tags.wikimedia_commons || el.tags.image || el.tags['image']
      if (candidate && !/^https?:\/\//i.test(candidate)) {
        const thumb = await fetchWikimediaThumbnail(candidate)
        if (thumb) image = thumb
      }
    }

    const enriched: Place = { ...place, distance, osm_url, google_maps_url, image }

    if (el.tags.leisure === 'spa' || el.tags.amenity === 'spa' || el.tags.hot_spring) {
      out.hot_springs = out.hot_springs || []
      out.hot_springs.push(enriched)
      continue
    }
    if ((el.tags.cuisine && /soba|そば|蕎麦/i.test(el.tags.cuisine)) || (el.tags.name && /そば|蕎麦|soba/i.test(el.tags.name))) {
      out.soba_restaurants = out.soba_restaurants || []
      out.soba_restaurants.push(enriched)
      continue
    }
    if (el.tags.tourism && /hotel|guest_house|hostel|motel/i.test(el.tags.tourism)) {
      out.hotels = out.hotels || []
      out.hotels.push(enriched)
      continue
    }
    if ((el.tags.leisure && /ski|winter/i.test(el.tags.leisure)) || el.tags.winter_sports) {
      out.ski_resorts = out.ski_resorts || []
      out.ski_resorts.push(enriched)
      continue
    }
    if (el.tags.tourism || el.tags.historic || el.tags.museum || el.tags.viewpoint) {
      out.attractions = out.attractions || []
      out.attractions.push(enriched)
      continue
    }

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
    if (!lat || !lng) return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })

    const data = await cachedQueryOverpass(lat, lng, radius)
    const grouped = await groupByCategory(data, Number(lat), Number(lng))

    for (const k of Object.keys(grouped)) {
      const withCoords = grouped[k].filter((p) => p.lat != null && p.lon != null)
      const without = grouped[k].filter((p) => p.lat == null || p.lon == null)
      withCoords.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
      grouped[k] = withCoords.concat(without)
    }

    return NextResponse.json({ ok: true, data: grouped })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('places API error', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
