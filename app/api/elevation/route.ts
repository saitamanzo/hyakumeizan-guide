import { NextResponse } from 'next/server'
import { reportError } from '@/lib/monitoring'

// In-memory rate limiter per IP (simple fixed window)
type Stamp = number
const ipBuckets: Map<string, Stamp[]> = new Map()
const WINDOW_MS = parseInt(process.env.ELEVATION_RATE_LIMIT_WINDOW_MS || '60000', 10) // 60s
const MAX_REQ = parseInt(process.env.ELEVATION_RATE_LIMIT_PER_MINUTE || '60', 10)

function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for') || ''
  if (xff) return xff.split(',')[0].trim()
  const xrip = request.headers.get('x-real-ip')
  if (xrip) return xrip
  const cfip = request.headers.get('cf-connecting-ip')
  if (cfip) return cfip
  return 'unknown'
}

function isRateLimited(ip: string): { limited: boolean; retryAfter: number } {
  const now = Date.now()
  const bucket = ipBuckets.get(ip) || []
  const fresh = bucket.filter((t) => now - t < WINDOW_MS)
  if (fresh.length >= MAX_REQ) {
    const oldest = Math.min(...fresh)
    const retryAfter = Math.ceil((WINDOW_MS - (now - oldest)) / 1000)
    ipBuckets.set(ip, fresh)
    return { limited: true, retryAfter }
  }
  fresh.push(now)
  ipBuckets.set(ip, fresh)
  return { limited: false, retryAfter: 0 }
}

export async function GET(request: Request) {
  try {
    // rate limit
    const ip = getClientIp(request)
    const rl = isRateLimited(ip)
    if (rl.limited) {
      const body = { status: 'error', message: 'Rate limit exceeded' }
      return NextResponse.json(body, { status: 429, headers: { 'Retry-After': String(rl.retryAfter), 'Cache-Control': 'no-store' } })
    }

    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat') || '')
    const lng = parseFloat(searchParams.get('lng') || '')

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { status: 'error', message: 'Invalid or missing lat/lng' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      const body = process.env.NODE_ENV === 'production'
        ? { status: 'error', message: 'Server configuration error' }
        : { status: 'error', message: 'Missing GOOGLE_MAPS_API_KEY', hint: 'Set GOOGLE_MAPS_API_KEY in your environment (and Vercel)' }
      return NextResponse.json(body, { status: 500, headers: { 'Cache-Control': 'no-store' } })
    }

    const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${lng}&key=${apiKey}`

    const res = await fetch(url, { 
      method: 'GET',
      cache: 'no-store',
      headers: { 'Accept': 'application/json' },
    })
    // Read as text first to preserve raw content on errors
  const raw = await res.text().catch(() => '')
    type GoogleElevationOK = { status: 'OK'; results: Array<{ elevation: number }> }
  type GoogleElevationResponse = GoogleElevationOK | { status?: string; results?: unknown } | { raw: string } | object
    let data: GoogleElevationResponse = {}
    const isOkShape = (d: unknown): d is GoogleElevationOK => {
      if (!d || typeof d !== 'object') return false
      const obj = d as Record<string, unknown>
      if (obj.status !== 'OK') return false
      const results = obj.results
      if (!Array.isArray(results)) return false
      // elevation should be number when present
      if (results.length === 0) return true
      const first = results[0]
      if (!first || typeof first !== 'object') return false
      const elev = (first as Record<string, unknown>).elevation
      return typeof elev === 'number'
    }
    if (raw) {
      try {
        data = JSON.parse(raw)
      } catch {
        data = { raw }
      }
    }

    if (!res.ok) {
      // send detailed error to monitoring only in production
      if (process.env.NODE_ENV === 'production') {
        await reportError(new Error('Elevation API upstream failure'), {
          httpStatus: res.status,
          google: data,
          endpoint: 'google-elevation',
        })
      }
      const body = process.env.NODE_ENV === 'production'
        ? { status: 'error', message: 'Upstream service error' }
        : { status: 'error', message: 'Google Elevation API request failed', httpStatus: res.status, google: data }
      return NextResponse.json(body, { status: res.status, headers: { 'Cache-Control': 'no-store' } })
    }

  if (!isOkShape(data) || data.results.length === 0) {
      if (process.env.NODE_ENV === 'production') {
        await reportError(new Error('Elevation API returned no data'), { google: data })
      }
      const body = process.env.NODE_ENV === 'production'
        ? { status: 'error', message: 'No elevation data returned' }
        : { status: 'error', message: 'No elevation data returned', google: data }
      return NextResponse.json(body, { status: 502, headers: { 'Cache-Control': 'no-store' } })
    }

  const elevation = data.results[0]?.elevation
    if (typeof elevation !== 'number') {
      if (process.env.NODE_ENV === 'production') {
        await reportError(new Error('Invalid elevation value'), { google: data })
      }
      const body = process.env.NODE_ENV === 'production'
        ? { status: 'error', message: 'Invalid elevation value in response' }
        : { status: 'error', message: 'Invalid elevation value in response', google: data }
      return NextResponse.json(body, { status: 502, headers: { 'Cache-Control': 'no-store' } })
    }

    return NextResponse.json(
      { status: 'success', elevation, source: 'google' },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (process.env.NODE_ENV === 'production') {
      await reportError(err as Error, { endpoint: 'api/elevation' })
    }
    return NextResponse.json(
      { status: 'error', message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
