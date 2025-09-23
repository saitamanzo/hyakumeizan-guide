"use client"
import React, { useEffect, useState } from 'react'
import {
  FireIcon,
  SparklesIcon,
  BuildingStorefrontIcon,
  MapIcon,
} from '@heroicons/react/24/outline'
import CategoryMap from './CategoryMap'

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

// スポットカテゴリキー -> 日本語名マップ
// 注意: バックエンドの `app/api/places/route.ts` に定義されているキーを元にしています。
// バックエンドに未定義のキーを追加しても影響はありませんが、実際にデータが返るかは API 側に依存します。
const SPOT_CATEGORY_MAP: Record<string, string> = {
  hot_springs: '温泉',
  soba_restaurants: '蕎麦屋',
  hotels: '宿泊施設',
  ski_resorts: 'スキー場',
  attractions: '観光地',
  // 将来的に API 側で追加される可能性があるカテゴリ用ラベル
  camp_sites: 'キャンプ場',
  restaurants: 'レストラン',
  others: 'その他',
}

// 優先的に表示するカテゴリキーの順番
// 既存の順序に、追加で要望のあったカテゴリを挿入
const CATEGORY_ORDER = [
  'hot_springs',
  'soba_restaurants',
  'hotels',
  'attractions',
  // 追加カテゴリ（存在する場合のみ表示されます）
  'ski_resorts',
  'camp_sites',
  'restaurants',
]

export default function NearbyPlaces({ lat, lng, radius = 20000 }: { lat: number; lng: number; radius?: number }) {
  const [data, setData] = useState<PlacesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

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

  // カテゴリの順序付けと重複除外を事前に計算
  const entries = Object.entries(data)
  const ordered = CATEGORY_ORDER.flatMap(k => entries.filter(([c]) => c === k))
  const rest = entries.filter(([c]) => !CATEGORY_ORDER.includes(c))
  const finalListRaw = [...ordered, ...rest]
  // 重複除外: OSM ID と (name + lat + lon) ハッシュの両方で検出する
  const seenIds = new Set<string>()
  const seenKeys = new Set<string>()
  const normalizeKey = (p?: Place) => {
    if (!p) return ''
    const name = (p.name || '').trim().toLowerCase()
    const lat = typeof p.lat === 'number' ? p.lat.toFixed(6) : ''
    const lon = typeof p.lon === 'number' ? p.lon.toFixed(6) : ''
    return `${name}|${lat}|${lon}`
  }

  const finalList: [string, Place[]][] = finalListRaw.map(([category, places]) => {
    const filtered = (places || []).filter(p => {
      if (!p) return false
      const id = p.id || ''
      if (id && seenIds.has(id)) return false
      const key = normalizeKey(p)
      if (key && seenKeys.has(key)) return false
      if (id) seenIds.add(id)
      if (key) seenKeys.add(key)
      return true
    })
    return [category, filtered]
  })

  // 各カテゴリごとに距離でソートし、上位30件に制限する（重複除外は既に適用済み）
  const finalListCapped: [string, Place[]][] = finalList.map(([category, places]) => {
    const sorted = (places || []).slice().sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
    return [category, sorted.slice(0, 30)]
  })

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-3">近郊スポット</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {finalListCapped.map(([category, places]) => {
          const spotsWithCoords = (places || []).filter(p => typeof p.lat === 'number' && typeof p.lon === 'number')
          // 経路（directions）は不要とのことなので、カテゴリリンクは山の中心で地図を開く方式に変更
          return (
            <div key={category} className="bg-white shadow-sm rounded-lg p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                {(() => {
                  switch (category) {
                    case 'hot_springs': return <FireIcon className="w-5 h-5 text-red-500" aria-hidden />
                    case 'soba_restaurants': return <SparklesIcon className="w-5 h-5 text-amber-600" aria-hidden />
                    
                    case 'hotels': return <BuildingStorefrontIcon className="w-5 h-5 text-gray-700" aria-hidden />
                    case 'ski_resorts': return <SparklesIcon className="w-5 h-5 text-blue-500" aria-hidden />
                    case 'attractions': return <MapIcon className="w-5 h-5 text-green-600" aria-hidden />
                    default: return <MapIcon className="w-5 h-5 text-gray-400" aria-hidden />
                  }
                })()}
                <span>{SPOT_CATEGORY_MAP[category] || category.replace(/_/g, ' ')}</span>
                {spotsWithCoords.length > 0 && (
                  <CategoryMap
                    spots={spotsWithCoords}
                    mountainLat={lat}
                    mountainLng={lng}
                    mountainName={''}
                    categoryLabel={SPOT_CATEGORY_MAP[category] || category}
                  />
                )}
              </h3>
              {places.length === 0 ? (
                <div className="text-sm text-gray-500">該当スポットなし</div>
              ) : (
                <>
                  <ul className="space-y-3">
                    {(
                      expandedCategories[category] ? places : places.slice(0, 3)
                    ).map((p, i) => (
                      <li key={`${p.id}-${i}`} className="flex items-start gap-3">
                        <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt={p.name || ''} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              {(() => {
                                switch (category) {
                                  case 'hot_springs': return <FireIcon className="w-6 h-6 text-red-400" />
                                  case 'soba_restaurants': return <SparklesIcon className="w-6 h-6 text-amber-500" />
                                  
                                  case 'hotels': return <BuildingStorefrontIcon className="w-6 h-6 text-gray-500" />
                                  case 'ski_resorts': return <SparklesIcon className="w-6 h-6 text-blue-400" />
                                  case 'attractions': return <MapIcon className="w-6 h-6 text-green-500" />
                                  default: return <MapIcon className="w-6 h-6 text-gray-300" />
                                }
                              })()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="font-medium text-gray-800">
                              {(() => {
                                const possible = p.tags || {}
                                const homepage = (possible['website'] || possible['url'] || possible['homepage'] || possible['contact:website'] || possible['official_website']) as string | undefined
                                const normalize = (u?: string) => {
                                  if (!u) return undefined
                                  try {
                                    const parsed = new URL(u)
                                    return parsed.toString()
                                  } catch {
                                    // add scheme if missing
                                    if (/^www\./i.test(u)) return `https://${u}`
                                    return undefined
                                  }
                                }
                                const hp = normalize(homepage)
                                if (hp) {
                                  return (
                                    <a href={hp} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:underline">{p.name || '公式サイト'}</a>
                                  )
                                }
                                return p.name || '無名スポット'
                              })()}
                            </div>
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
                  {places.length > 3 && (
                    <div className="mt-3">
                      <button
                        type="button"
                        className="text-sm text-blue-600 hover:underline"
                        onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                      >
                        {expandedCategories[category] ? '閉じる' : `もっと見る (${places.length} 件)`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
