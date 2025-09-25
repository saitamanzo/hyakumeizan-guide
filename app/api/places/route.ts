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
  rating?: number
  user_ratings_total?: number
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
    node(around:RADIUS,LAT,LNG)[hot_spring];
    node(around:RADIUS,LAT,LNG)[natural=spring];
    node(around:RADIUS,LAT,LNG)[source~"hot_spring|温泉|onsen"];
    node(around:RADIUS,LAT,LNG)[amenity=public_bath];
    node(around:RADIUS,LAT,LNG)[name~"日帰り|スーパー銭湯|温泉|onsen|spa|スパ|sento"];
    way(around:RADIUS,LAT,LNG)[leisure=spa];
    way(around:RADIUS,LAT,LNG)[amenity=spa];
    way(around:RADIUS,LAT,LNG)[name~"日帰り|スーパー銭湯|温泉|onsen|spa|スパ|sento"];
    relation(around:RADIUS,LAT,LNG)[leisure=spa];
  `,
  soba_restaurants: `
    node(around:RADIUS,LAT,LNG)[cuisine~"soba|そば|蕎麦"];
    node(around:RADIUS,LAT,LNG)[amenity=restaurant][name~"そば|蕎麦|soba"];
    way(around:RADIUS,LAT,LNG)[cuisine~"soba|そば|蕎麦"];
    relation(around:RADIUS,LAT,LNG)[cuisine~"soba|そば|蕎麦"];
  `,
  restaurants: `
    node(around:RADIUS,LAT,LNG)[amenity=restaurant];
    node(around:RADIUS,LAT,LNG)[shop=food];
    node(around:RADIUS,LAT,LNG)[name~"食堂|定食|レストラン|食事|ご飯|めし"];
    way(around:RADIUS,LAT,LNG)[amenity=restaurant];
    relation(around:RADIUS,LAT,LNG)[amenity=restaurant];
  `,
  hotels: `
    node(around:RADIUS,LAT,LNG)[tourism~"hotel|guest_house|hostel|motel"];
    way(around:RADIUS,LAT,LNG)[tourism~"hotel|guest_house|hostel|motel"];
    relation(around:RADIUS,LAT,LNG)[tourism~"hotel|guest_house|hostel|motel"];
  `,
  mountain_huts: `
    node(around:RADIUS,LAT,LNG)[tourism~"alpine_hut|mountain_hut|refuge|hut"];
    node(around:RADIUS,LAT,LNG)[building~"hut|shelter"];
    node(around:RADIUS,LAT,LNG)[name~"小屋|山荘|山の家|避難小屋|避難所"];
    way(around:RADIUS,LAT,LNG)[tourism~"alpine_hut|mountain_hut|refuge|hut"];
    relation(around:RADIUS,LAT,LNG)[tourism~"alpine_hut|mountain_hut|refuge|hut"];
  `,
  ski_resorts: `
    node(around:RADIUS,LAT,LNG)[leisure=sports_centre][sport~"ski|スキー"];
    node(around:RADIUS,LAT,LNG)[winter_sports];
    way(around:RADIUS,LAT,LNG)[leisure=ski_resort];
    relation(around:RADIUS,LAT,LNG)[leisure=ski_resort];
  `,
  // 釣り場: 管理釣り場・渓流釣りを含める
  fishing_spots: `
    node(around:RADIUS,LAT,LNG)[leisure=fishing];
    node(around:RADIUS,LAT,LNG)[name~"釣り|釣り堀|管理釣り場|管理釣り|渓流|渓流釣り|渓流移り場|fishing"i];
    way(around:RADIUS,LAT,LNG)[leisure=fishing];
    way(around:RADIUS,LAT,LNG)[name~"釣り|釣り堀|管理釣り場|管理釣り|渓流|渓流釣り|渓流移り場|fishing"i];
    relation(around:RADIUS,LAT,LNG)[leisure=fishing];
    relation(around:RADIUS,LAT,LNG)[name~"釣り|釣り堀|管理釣り場|管理釣り|渓流|渓流釣り|渓流移り場|fishing"i];
  `,
  camp_sites: `
    node(around:RADIUS,LAT,LNG)[tourism=camp_site];
    node(around:RADIUS,LAT,LNG)[leisure=camp_site];
    node(around:RADIUS,LAT,LNG)[amenity=camp_site];
    way(around:RADIUS,LAT,LNG)[tourism=camp_site];
    way(around:RADIUS,LAT,LNG)[leisure=camp_site];
    way(around:RADIUS,LAT,LNG)[amenity=camp_site];
    relation(around:RADIUS,LAT,LNG)[tourism=camp_site];
    relation(around:RADIUS,LAT,LNG)[leisure=camp_site];
    relation(around:RADIUS,LAT,LNG)[amenity=camp_site];
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

// Google Places integration (single consolidated implementation)
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY || ''

const CATEGORY_GOOGLE_PARAMS: Record<string, { keyword?: string; type?: string }> = {
  // Include day-use, sento, super sento, day spa keywords
  // Japanese terms: 日帰り, スーパー銭湯, 公衆浴場, 日帰り温泉
  hot_springs: { keyword: '温泉 onsen spa 日帰り 日帰り温泉 スーパー銭湯 公衆浴場 sento "day spa" "day-use"' },
  soba_restaurants: { keyword: '蕎麦 そば soba', type: 'restaurant' },
  hotels: { type: 'lodging' },
  ski_resorts: { keyword: 'スキー場 ski resort' },
  mountain_huts: { keyword: '山小屋 小屋 山荘 避難小屋 hut refuge alpine hut' },
  restaurants: { keyword: '食堂 レストラン 定食 食事 ご飯', type: 'restaurant' },
  camp_sites: { keyword: 'キャンプ場 campground campsite' },
  attractions: { keyword: '観光 観光地 viewpoint', type: 'tourist_attraction' },
}

// Google-specific params for fishing-related categories (merged)
CATEGORY_GOOGLE_PARAMS['fishing_spots'] = { keyword: '釣り 釣り堀 管理釣り場 管理釣り 渓流 渓流釣り 渓流移り場 fishing "fishing pond" river fishing', type: 'point_of_interest' }

// Simple in-memory cache for Google Places grouped results
const googlePlacesCache = new Map<string, { ts: number; data: Record<string, Place[]> }>()
const GOOGLE_TTL = 1000 * 60 * 10 // 10 minutes

async function fetchGoogleNearbyRaw(params: { location: string; radius: number; keyword?: string; type?: string }, pages = 2) {
  const qs = new URLSearchParams()
  qs.set('location', params.location)
  qs.set('radius', String(Math.min(params.radius, 50000)))
  if (params.keyword) qs.set('keyword', params.keyword)
  if (params.type) qs.set('type', params.type)
  qs.set('key', GOOGLE_KEY)
  qs.set('language', 'ja')

  const outResults: unknown[] = []
  let nextPageToken: string | undefined = undefined
  for (let i = 0; i < pages; i++) {
    if (nextPageToken) qs.set('pagetoken', nextPageToken)
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${qs.toString()}`
    try {
      const res = await fetch(url)
      if (!res.ok) break
      const json = await res.json()
      const results = Array.isArray(json.results) ? json.results : []
      outResults.push(...results)
      nextPageToken = json.next_page_token
      if (!nextPageToken) break
      // short delay before next page token becomes valid
      await new Promise((r) => setTimeout(r, 800))
    } catch (err) {
      try { console.error('Google nearby fetch error', err) } catch {}
      break
    }
  }
  return outResults
}

// Google Text Search (useful for queries like "利尻温泉", "利尻 日帰り温泉" etc.)
async function fetchGoogleTextSearch(query: string, pages = 2) {
  if (!GOOGLE_KEY) return [] as unknown[]
  const qs = new URLSearchParams()
  qs.set('query', query)
  qs.set('key', GOOGLE_KEY)
  qs.set('language', 'ja')

  const outResults: unknown[] = []
  let nextPageToken: string | undefined = undefined
  for (let i = 0; i < pages; i++) {
    if (nextPageToken) qs.set('pagetoken', nextPageToken)
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${qs.toString()}`
    try {
      const res = await fetch(url)
      if (!res.ok) break
      const json = await res.json()
      const results = Array.isArray(json.results) ? json.results : []
      outResults.push(...results)
      nextPageToken = json.next_page_token
      if (!nextPageToken) break
      await new Promise((r) => setTimeout(r, 800))
    } catch (err) {
      try { console.error('Google textsearch fetch error', err) } catch {}
      break
    }
  }
  return outResults
}

function mapGoogleRawToPlaces(results: unknown[] = [], centerLat: number, centerLon: number): Place[] {
  type GoogleRaw = {
    geometry?: { location?: { lat?: number; lng?: number } }
    place_id?: string
    // allow place_id to be present without using `any`
    // other fields are already declared above
    photos?: { photo_reference?: string }[]
    name?: string
    types?: string[]
    vicinity?: string
    business_status?: string
    rating?: number
    user_ratings_total?: number
  }
  return (results || []).map((rIn) => {
    const r = rIn as GoogleRaw
    const lat = r.geometry?.location?.lat
    const lon = r.geometry?.location?.lng
    const id = r.place_id ? `google:${r.place_id}` : `${lat || 'n'}/${lon || 'n'}`
  const tags: Record<string, string> = {}
    if (Array.isArray(r.types)) tags.types = r.types.join(',')
    if (r.vicinity) tags.vicinity = r.vicinity
    if (r.business_status) tags.business_status = r.business_status
    // preserve place_id to allow fetching Place Details (website etc.) later
    if (r.place_id) tags.place_id = r.place_id
    const image = Array.isArray(r.photos) && r.photos[0]?.photo_reference
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${encodeURIComponent(r.photos[0].photo_reference)}&key=${GOOGLE_KEY}`
      : undefined
    const distance = typeof lat === 'number' && typeof lon === 'number' ? haversineDistance(centerLat, centerLon, lat, lon) : undefined
    return { id, name: r.name, lat, lon, tags, distance, google_maps_url: r.place_id ? `https://www.google.com/maps/place/?q=place_id:${r.place_id}` : undefined, image, rating: typeof r.rating === 'number' ? r.rating : undefined, user_ratings_total: typeof r.user_ratings_total === 'number' ? r.user_ratings_total : undefined }
  })
}

async function fetchGooglePlaceDetails(placeId: string) {
  if (!GOOGLE_KEY) return {} as PlaceDetailsResult
  try {
    const qs = new URLSearchParams()
    qs.set('place_id', placeId)
    qs.set('key', GOOGLE_KEY)
    // Request website/url/phone and rating metadata
    qs.set('fields', 'website,url,formatted_phone_number,rating,user_ratings_total')
    qs.set('language', 'ja')
    const url = `https://maps.googleapis.com/maps/api/place/details/json?${qs.toString()}`
    const res = await fetch(url)
    if (!res.ok) return {} as Record<string, string>
    const json = await res.json()
    const r = json.result || {}
  const out: PlaceDetailsResult = {}
    if (r.website) out.website = r.website
    if (r.url) out.url = r.url
    if (r.formatted_phone_number) out.phone = r.formatted_phone_number
    if (typeof r.rating === 'number') out.rating = r.rating
    if (typeof r.user_ratings_total === 'number') out.user_ratings_total = r.user_ratings_total
    return out
  } catch (e) {
    try { console.error('Place details fetch error', e) } catch {}
    return {} as PlaceDetailsResult
  }
}

type PlaceDetailsResult = {
  website?: string
  url?: string
  phone?: string
  rating?: number
  user_ratings_total?: number
}

async function cachedQueryGoogle(lat: string, lng: string, radius = '20000', q?: string) {
  const key = `${lat}:${lng}:${radius}`
  const now = Date.now()
  const hit = googlePlacesCache.get(key)
  if (hit && now - hit.ts < GOOGLE_TTL) return hit.data

  // avoid concurrent queries for same key
  const localLockKey = `glock:${key}`
  const lockWaitMs = Number(process.env.OVERPASS_LOCAL_LOCK_WAIT_MS || '10000')
  const waitUntil = Date.now() + lockWaitMs
  if (localLocks.has(localLockKey)) {
    while (Date.now() < waitUntil) {
      await new Promise((r) => setTimeout(r, 200))
      const cachedNow = googlePlacesCache.get(key)
      if (cachedNow && Date.now() - cachedNow.ts < GOOGLE_TTL) return cachedNow.data
    }
  }

  localLocks.add(localLockKey)
  try {
    const categories = Object.keys(CATEGORY_GOOGLE_PARAMS)
    const out: Record<string, Place[]> = {}
    const centerLat = Number(lat)
    const centerLon = Number(lng)
    for (const cat of categories) {
      const p = CATEGORY_GOOGLE_PARAMS[cat]
      const raw = await fetchGoogleNearbyRaw({ location: `${lat},${lng}`, radius: Number(radius), keyword: p?.keyword, type: p?.type }, 2)
        const places = mapGoogleRawToPlaces(raw, centerLat, centerLon)
        // Fetch Place Details (website/url) for top N places per category to enrich website info
        const MAX_DETAILS_PER_CATEGORY = Number(process.env.GOOGLE_DETAILS_PER_CATEGORY || '5')
        const toDetail = (places || []).filter(pl => {
          const tags = pl.tags || {}
          return !tags.website && typeof tags.place_id === 'string'
        }).slice(0, MAX_DETAILS_PER_CATEGORY)
        for (const pl of toDetail) {
          const pid = pl.tags?.place_id
          if (!pid) continue
          try {
            const det = await fetchGooglePlaceDetails(pid)
            if (det.website) pl.tags = { ...(pl.tags || {}), website: det.website }
            if (det.url && !pl.google_maps_url) pl.google_maps_url = det.url
          } catch {}
          // small throttle
          await new Promise((r) => setTimeout(r, 150))
        }
      out[cat] = places
      // be polite
      await new Promise((r) => setTimeout(r, 150))
    }
    // If a textual query (mountain name, e.g., "利尻岳") is provided, run a text search for hot springs nearby name variations and merge
    function isLikelyOnsen(p: Place) {
      const name = (p.name || '').toLowerCase()
      const tags = p.tags || {}
      const types = (tags.types || '').toLowerCase()
      // Heuristics: name contains 温泉/日帰り/スーパー銭湯/sento/spa or tags.types contains spa/onsen/sento/public_bath
      if (/温泉|日帰り|スーパー銭湯|公衆浴場|銭湯|日帰り温泉|onsen|sento|spa|sento/i.test(name)) return true
      if (/(spa|onsen|sento|public_bath|bath|hot_spring)/i.test(types)) return true
      // vicinity or other tag hints
      for (const v of Object.values(tags)) {
        if (typeof v === 'string' && /温泉|スーパー銭湯|公衆浴場|銭湯|日帰り|onsen|sento|spa/i.test(v)) return true
      }
      return false
    }

    if (q && typeof q === 'string' && q.trim().length > 0) {
      try {
        const queryVariants = [`${q} 温泉`, `${q} 日帰り温泉`, `${q} スーパー銭湯`, `${q} spa`, `${q} onsen`]
        const seenIds = new Set<string>(Object.values(out).flat().map(p=>p.id))
        const merged: Place[] = out.hot_springs ? [...out.hot_springs] : []
        for (const v of queryVariants) {
          const textRaw = await fetchGoogleTextSearch(v, 2)
          const textPlaces = mapGoogleRawToPlaces(textRaw, centerLat, centerLon)
          for (const tp of textPlaces) {
            if (!tp.id) continue
            if (seenIds.has(tp.id)) continue
            seenIds.add(tp.id)
            merged.push(tp)
          }
          await new Promise((r) => setTimeout(r, 150))
        }
        // filter merged to only likely hot springs
        out.hot_springs = merged.filter(isLikelyOnsen)
      } catch (e) {
        try { console.error('Error during text-based hot_springs merge', e) } catch {}
      }
    }
    googlePlacesCache.set(key, { ts: now, data: out })
    return out
  } finally {
    localLocks.delete(localLockKey)
  }
}

async function queryOverpassCategory(categoryKey: string, lat: string, lng: string, radius = '20000') {
  const qTemplate = CATEGORY_QUERIES[categoryKey]
  if (!qTemplate) return { elements: [] } as OverpassResponse
  const q = `[out:json][timeout:25];( ${qTemplate} );out center tags geom;`
  const body = `data=${encodeURIComponent(q.replace(/LAT/g, lat).replace(/LNG/g, lng).replace(/RADIUS/g, radius))}`
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!res.ok) {
      console.error('Overpass API returned non-ok for category', categoryKey, 'status', res.status)
      return { elements: [] } as OverpassResponse
    }
    return (await res.json()) as OverpassResponse
  } catch (e) {
    try {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('Overpass fetch error for category', categoryKey, 'err', msg)
    } catch {}
    return { elements: [] } as OverpassResponse
  }
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
      if (!res.ok) {
        console.error('Wikimedia imageinfo non-ok', title, res.status)
        return undefined
      }
      const json = await res.json()
      const pages = json.query?.pages
      if (!pages) return undefined
      for (const k of Object.keys(pages)) {
        const p = pages[k]
        const info = p.imageinfo && p.imageinfo[0]
        const url = info?.thumburl || info?.url
        if (url) return url
      }
    } catch (err) {
      try {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('Wikimedia fetch error for imageinfo', title, msg)
      } catch {}
    }
    return undefined
  }

  async function fetchFromCategory(catName: string): Promise<string | undefined> {
    try {
      const title = catName.startsWith('Category:') ? catName : `Category:${catName}`
      const cmApi = `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(title)}&cmtype=file&cmlimit=5&format=json&origin=*`
      const res = await fetch(cmApi)
      if (!res.ok) {
        console.error('Wikimedia categorymembers non-ok', title, res.status)
        return undefined
      }
      const json = await res.json()
      const members = json.query?.categorymembers || []
      for (const m of members) {
        const fileTitle = m.title
        if (fileTitle) {
          const url = await fetchImageInfoByTitle(fileTitle)
          if (url) return url
        }
      }
    } catch (err) {
      try {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('Wikimedia fetch error for category', catName, msg)
      } catch {}
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
        try {
          const thumb = await fetchWikimediaThumbnail(candidate)
          if (thumb) image = thumb
        } catch (err) {
          try {
            const msg = err instanceof Error ? err.message : String(err)
            console.error('Error fetching thumbnail for candidate', candidate, msg)
          } catch {}
        }
      }
    }

    const enriched: Place = { ...place, distance, osm_url, google_maps_url, image }

    if (el.tags.leisure === 'spa' || el.tags.amenity === 'spa' || el.tags.hot_spring) {
      out.hot_springs = out.hot_springs || []
      out.hot_springs.push(enriched)
      continue
    }
    // 釣り場判定: leisure=fishing または名前に釣り関連ワード（管理釣り場/渓流含む）
    if (
      el.tags.leisure === 'fishing' ||
      (el.tags.name && /釣り|釣り堀|管理釣り場|管理釣り|渓流|渓流釣り|渓流移り場|fishing/i.test(String(el.tags.name))) ||
      (el.tags.natural && /stream|river/i.test(String(el.tags.natural)))
    ) {
      out.fishing_spots = out.fishing_spots || []
      out.fishing_spots.push(enriched)
      continue
    }
    if (el.tags.tourism === 'camp_site' || el.tags.leisure === 'camp_site' || el.tags.amenity === 'camp_site' || /camp[_ ]?site/i.test(JSON.stringify(el.tags))) {
      out.camp_sites = out.camp_sites || []
      out.camp_sites.push(enriched)
      continue
    }
    if ((el.tags.cuisine && /soba|そば|蕎麦/i.test(el.tags.cuisine)) || (el.tags.name && /そば|蕎麦|soba/i.test(el.tags.name))) {
      out.soba_restaurants = out.soba_restaurants || []
      out.soba_restaurants.push(enriched)
      continue
    }
    // 名前に「小屋」を含む場合は宿泊施設（山小屋など）として扱う
    if (el.tags.name && /小屋/.test(String(el.tags.name))) {
      out.hotels = out.hotels || []
      out.hotels.push(enriched)
      continue
    }
    // 名前に「茶屋」を含む場合は食堂／レストランとして扱う
    if (el.tags.name && /茶屋/.test(String(el.tags.name))) {
      out.restaurants = out.restaurants || []
      out.restaurants.push(enriched)
      continue
    }
    // 名前に「山荘」を含む場合は観光地ではなく宿泊施設として扱う
    if (el.tags.name && /山荘/.test(String(el.tags.name))) {
      out.hotels = out.hotels || []
      out.hotels.push(enriched)
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
    const onlyCategory = url.searchParams.get('category')
    if (!lat || !lng) return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })

    // Google-only mode: require GOOGLE_KEY and use Google Places exclusively
    if (!GOOGLE_KEY) {
      return NextResponse.json({ ok: false, error: 'GOOGLE_MAPS_API_KEY is required for places search. Set the env var or revert to Overpass mode.' }, { status: 500 })
    }

    if (onlyCategory) {
      // only allow known categories from Google params
      if (!Object.prototype.hasOwnProperty.call(CATEGORY_GOOGLE_PARAMS, onlyCategory)) {
        return NextResponse.json({ ok: false, error: 'unknown category' }, { status: 400 })
      }
      const qParam = url.searchParams.get('q') || undefined
      const all = await cachedQueryGoogle(lat, lng, radius, qParam)
      const picked = all[onlyCategory] || []
      const withCoords = picked.filter((p) => p.lat != null && p.lon != null)
      const without = picked.filter((p) => p.lat == null || p.lon == null)
      withCoords.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
      const grouped: PlacesResponse = { [onlyCategory]: withCoords.concat(without) }
      return NextResponse.json({ ok: true, data: grouped })
    }

  const qParam = url.searchParams.get('q') || undefined
  const all = await cachedQueryGoogle(lat, lng, radius, qParam)
    for (const k of Object.keys(all)) {
      const arr = all[k] || []
      const withCoords = arr.filter((p) => p.lat != null && p.lon != null)
      const without = arr.filter((p) => p.lat == null || p.lon == null)
      withCoords.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
      all[k] = withCoords.concat(without)
    }
    return NextResponse.json({ ok: true, data: all })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('places API error', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

// Keep Overpass helpers exported for future fallback or debugging.
// They are intentionally preserved even though the current runtime uses Google Places exclusively.
// Exporting prevents TypeScript from flagging them as unused while keeping them available for reuse.
// Prevent "defined but never used" warnings by referencing helpers without exporting them.
void queryOverpassCategory
void cachedQueryOverpass
void groupByCategory
