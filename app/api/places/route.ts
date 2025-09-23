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

async function queryOverpass(lat: string, lng: string, radius = '20000') {
  // Build Overpass QL
  const parts: string[] = []
  for (const key of Object.keys(CATEGORY_QUERIES)) {
    parts.push(CATEGORY_QUERIES[key])
  }
  const combined = parts.join('\n')
  // request nodes/ways/relations, include center and geometry when available
  const q = `[out:json][timeout:25];( ${combined} );out center tags geom;` 
  const body = `data=${encodeURIComponent(q.replace(/LAT/g, lat).replace(/LNG/g, lng).replace(/RADIUS/g, radius))}`

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    throw new Error(`Overpass API error ${res.status}`)
  }
  const data = await res.json()
  return data as OverpassResponse
}

// Simple in-memory cache
const overpassCache = new Map<string, { ts: number, data: OverpassResponse }>()
const CACHE_TTL = 1000 * 60 * 10 // 10 minutes

async function cachedQueryOverpass(lat: string, lng: string, radius = '20000') {
  const key = `${lat}:${lng}:${radius}`
  const now = Date.now()
  const hit = overpassCache.get(key)
  if (hit && (now - hit.ts) < CACHE_TTL) return hit.data
  const data = await queryOverpass(lat, lng, radius)
  overpassCache.set(key, { ts: now, data })
  return data
}

async function fetchWikimediaThumbnail(fileName: string): Promise<string | undefined> {
  try {
    // check cache first
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
      if (info && info.thumburl) return info.thumburl as string
      if (info && info.url) return info.url as string
    }
  } catch {
    // ignore
  }
  return undefined
}

// short-term cache for thumbnails
const thumbnailCache = new Map<string, { ts: number, url: string }>()
const THUMBNAIL_TTL = 1000 * 60 * 60 // 1 hour

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
