/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useEffect, useRef, useState } from 'react'

type Spot = {
  id: string
  name?: string
  lat?: number
  lon?: number
}

export default function CategoryMap({
  spots,
  mountainLat,
  mountainLng,
  mountainName,
  categoryLabel,
}: {
  spots: Spot[]
  mountainLat: number
  mountainLng: number
  mountainName?: string
  categoryLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

  let map: unknown = null
  let markersGroup: unknown = null

    async function init() {
      // load CSS
      const cssHref = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      if (!document.querySelector(`link[href="${cssHref}"]`)) {
        const l = document.createElement('link')
        l.rel = 'stylesheet'
        l.href = cssHref
        document.head.appendChild(l)
      }

      // load script if needed
      if (!(window as unknown as { L?: unknown }).L) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
          s.async = true
          s.onload = () => resolve()
          s.onerror = () => reject(new Error('Failed to load Leaflet'))
          document.body.appendChild(s)
        })
      }

  const Lraw = (window as unknown as { L?: unknown }).L as unknown
  if (!Lraw) return
  const Leaflet = Lraw as any

      if (mapContainerRef.current) {
        mapContainerRef.current.innerHTML = ''
        map = Leaflet.map(mapContainerRef.current).setView([mountainLat, mountainLng], 12)
        Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map)

  const markers: Array<unknown> = []
        // mountain summit marker
        const summitMarker = Leaflet.marker([mountainLat, mountainLng]).addTo(map)
        summitMarker.bindPopup(`<strong>山頂: ${mountainName || '山頂'}</strong>`)
        // Summit label always visible
        try {
          summitMarker.bindTooltip(`山頂: ${mountainName || '山頂'}`, { permanent: true, direction: 'right', className: 'bg-white/80 text-sm px-1 rounded' })
        } catch {}
        markers.push(summitMarker)

        for (const s of spots) {
          if (typeof s.lat === 'number' && typeof s.lon === 'number') {
            const m = Leaflet.marker([s.lat, s.lon]).addTo(map)
            m.bindPopup(`<strong>${s.name || '無名スポット'}</strong>`)
            try {
              m.bindTooltip(`${s.name || '無名スポット'}`, { permanent: true, direction: 'right', className: 'bg-white/80 text-sm px-1 rounded' })
            } catch {}
            markers.push(m)
          }
        }

        if (markers.length > 0) {
          markersGroup = Leaflet.featureGroup(markers)
          try {
            ;(map as any).fitBounds((markersGroup as any).getBounds().pad(0.2))
          } catch {
            // ignore
          }
        }
      }
    }

    init().catch((err) => console.error('CategoryMap init error', err))

    return () => {
      try {
        if (map) (map as any).remove()
      } catch {}
    }
  }, [open, spots, mountainLat, mountainLng, mountainName])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-2 text-xs text-blue-600 hover:underline"
      >
        Google Mapで見る
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg overflow-hidden w-[95vw] h-[85vh] shadow-lg">
            <div className="flex items-center justify-between p-3 border-b bg-white relative z-40">
              <div className="text-sm font-semibold">{categoryLabel || '地図'}</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm text-gray-600 hover:underline"
                >
                  閉じる
                </button>
              </div>
            </div>
            <div ref={mapContainerRef} className="w-full h-full relative z-10" />
          </div>
        </div>
      )}
    </>
  )
}
