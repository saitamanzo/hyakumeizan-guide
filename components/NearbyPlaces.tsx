"use client"
import React, { useEffect, useState } from 'react'

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

export default function NearbyPlaces({ lat, lng, radius = 20000 }: { lat: number; lng: number; radius?: number }) {
  const [data, setData] = useState<PlacesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function fetchPlaces() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/places?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}&radius=${encodeURIComponent(String(radius))}`)
        if (!res.ok) throw new Error(`fetch error ${res.status}`)
        const json = await res.json()
        if (mounted) setData(json.data || null)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchPlaces()
    return () => { mounted = false }
  }, [lat, lng, radius])

  if (loading) return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-3">近郊スポット</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white shadow-sm rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
            <ul className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <li key={j} className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
  if (error) return <div className="p-4 text-red-600">エラー: {error}</div>
  if (!data) return <div className="p-4 text-gray-500">近隣スポットは見つかりませんでした。</div>

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-3">近郊スポット</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(data).map(([category, places]) => (
          <div key={category} className="bg-white shadow-sm rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{category.replace(/_/g, ' ')}</h3>
            {places.length === 0 ? (
              <div className="text-sm text-gray-500">該当スポットなし</div>
            ) : (
              <ul className="space-y-3">
                {places.slice(0, 6).map(p => (
                  <li key={p.id} className="flex items-start gap-3">
                    <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt={p.name || ''} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">🗺️</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="font-medium text-gray-800">{p.name || '無名スポット'}</div>
                        <div className="text-xs text-gray-500">{p.distance != null ? `${(p.distance/1000).toFixed(1)} km` : ''}</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{p.tags && Object.entries(p.tags).slice(0,3).map(([k,v])=>`${k}:${v}`).join(' • ')}</div>
                      <div className="mt-2 flex items-center gap-3">
                        {p.google_maps_url && (
                          <a href={p.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600">Google Maps</a>
                        )}
                        {p.osm_url && (
                          <a href={p.osm_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600">OSM</a>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
