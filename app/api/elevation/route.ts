import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat') || '')
    const lng = parseFloat(searchParams.get('lng') || '')

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { status: 'error', message: 'Invalid or missing lat/lng' },
        { status: 400 }
      )
    }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Missing GOOGLE_MAPS_API_KEY',
          hint: 'Set GOOGLE_MAPS_API_KEY in your environment (and Vercel)'
        },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${lng}&key=${apiKey}`

    const res = await fetch(url, { 
      method: 'GET',
      cache: 'no-store',
      headers: { 'Accept': 'application/json' },
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Google Elevation API request failed',
          httpStatus: res.status,
          google: data,
        },
        { status: res.status }
      )
    }

    if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'No elevation data returned',
          google: data,
        },
        { status: 502 }
      )
    }

    const elevation = data.results[0]?.elevation
    if (typeof elevation !== 'number') {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Invalid elevation value in response',
          google: data,
        },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { status: 'success', elevation, source: 'google' },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { status: 'error', message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
