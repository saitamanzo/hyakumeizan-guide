"use client"
import React, { useEffect, useState } from 'react'
import {
  FireIcon,
  SparklesIcon,
  BuildingStorefrontIcon,
  MapIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'

function StarRating({ rating, total }: { rating: number; total?: number | null }) {
  // rating: 0..5 (Google uses 1..5). We'll round to nearest 0.5 and display 5 icons.
  const r = Math.max(0, Math.min(5, rating))
  const rounded = Math.round(r * 2) / 2
  const stars = Array.from({ length: 5 }).map((_, i) => {
    const idx = i + 1
    if (rounded >= idx) return 'full'
    if (rounded + 0.5 === idx) return 'half'
    return 'empty'
  })
  return (
    <span className="ml-2 inline-flex items-center gap-1 text-yellow-500">
      {stars.map((s, i) => (
        <span key={i} className="w-3 h-3">
          {s === 'full' ? (
            <StarSolid className="w-3 h-3 text-yellow-400" />
          ) : (
            // empty star: simple outline using SVG to avoid extra dependency
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3 text-yellow-300">
              <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.966a1 1 0 0 0 .95.69h4.174c.969 0 1.371 1.24.588 1.81l-3.377 2.455a1 1 0 0 0-.364 1.118l1.287 3.966c.3.921-.755 1.688-1.54 1.118l-3.377-2.455a1 1 0 0 0-1.176 0L6.98 18.95c-.785.57-1.84-.197-1.54-1.118l1.287-3.966a1 1 0 0 0-.364-1.118L2.986 9.293c-.783-.57-.38-1.81.588-1.81h4.174a1 1 0 0 0 .95-.69l1.286-3.966z" />
            </svg>
          )}
        </span>
      ))}
      <span className="text-[10px] text-gray-500">{rounded.toFixed(1)}{total != null ? ` (${total})` : ''}</span>
    </span>
  )
}
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
  rating?: number
  user_ratings_total?: number
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
  mountain_huts: '山小屋',
  attractions: '観光地',
  // 将来的に API 側で追加される可能性があるカテゴリ用ラベル
  camp_sites: 'キャンプ場',
  restaurants: '食堂',
  others: 'その他',
  fishing_spots: '釣り場',
  managed_fishing: '管理釣り場',
  river_fishing: '渓流移り場',
}

// 優先的に表示するカテゴリキーの順番
// 既存の順序に、追加で要望のあったカテゴリを挿入
const CATEGORY_ORDER = [
  // 優先順: 温泉、蕎麦、山小屋、キャンプ場、宿泊施設、食堂、観光地、スキー場
  'hot_springs',
  'soba_restaurants',
  'mountain_huts',
  'managed_fishing',
  'fishing_spots',
  'river_fishing',
  'camp_sites',
  'hotels',
  'restaurants',
  'attractions',
  'ski_resorts',
]

export default function NearbyPlaces({ lat, lng, radius = 20000, mountainName }: { lat: number; lng: number; radius?: number, mountainName?: string }) {
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
        // 基本の一括取得に加え、温泉・スキー場は別クエリで確実に取得する
    let baseUrl = `/api/places?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}&radius=${encodeURIComponent(String(radius))}`
  if (mountainName) baseUrl += `&q=${encodeURIComponent(String(mountainName))}`
  const hotUrl = `${baseUrl}&category=hot_springs`
  const skiUrl = `${baseUrl}&category=ski_resorts`

        const [baseRes, hotRes, skiRes] = await Promise.all([
          fetch(baseUrl),
          fetch(hotUrl),
          fetch(skiUrl),
        ])
        if (!baseRes.ok) throw new Error(`base fetch error ${baseRes.status}`)
        if (!hotRes.ok) throw new Error(`hot fetch error ${hotRes.status}`)
        if (!skiRes.ok) throw new Error(`ski fetch error ${skiRes.status}`)
        const [baseJson, hotJson, skiJson] = await Promise.all([baseRes.json(), hotRes.json(), skiRes.json()])
        // マージ: hot_springs と ski_resorts は個別結果で上書きする
        const merged: PlacesResponse = { ...(baseJson.data || {}) }
        if (hotJson.data && hotJson.data.hot_springs) merged.hot_springs = hotJson.data.hot_springs
        if (skiJson.data && skiJson.data.ski_resorts) merged.ski_resorts = skiJson.data.ski_resorts
        if (mounted) {
          // DEBUG: ログに返却されたカテゴリキーを出す
          try { console.debug('NearbyPlaces fetched categories:', Object.keys(merged || {})) } catch {}
          setData(merged)
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchPlaces()
    return () => { mounted = false }
  }, [lat, lng, radius, mountainName])

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
  // カテゴリごとのプレビュー件数: デフォルト3件。
  const DEFAULT_PREVIEW = 3
  const CATEGORY_PREVIEW_OVERRIDES: Record<string, number> = {
    // ここにカテゴリごとの初期表示件数を追加できます。例: 'soba_restaurants': 5
  }

  // 温泉・スキー場を独立表示
  const renderCategorySection = (category: string, places: Place[]) => {
    const spotsWithCoords = (places || []).filter(p => typeof p.lat === 'number' && typeof p.lon === 'number')
    return (
      <div key={category} className="bg-white shadow-sm rounded-lg p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
          {(() => {
            switch (category) {
              case 'hot_springs': return <FireIcon className="w-5 h-5 text-red-500" aria-hidden />
              case 'ski_resorts': return <SparklesIcon className="w-5 h-5 text-blue-500" aria-hidden />
              case 'mountain_huts': return <BuildingStorefrontIcon className="w-5 h-5 text-amber-600" aria-hidden />
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
              {(expandedCategories[category]
                ? places
                : places.slice(0, (CATEGORY_PREVIEW_OVERRIDES[category] ?? DEFAULT_PREVIEW))
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
                            case 'ski_resorts': return <SparklesIcon className="w-6 h-6 text-blue-400" />
                            case 'mountain_huts': return <BuildingStorefrontIcon className="w-6 h-6 text-amber-500" />
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
                              if (/^www\./i.test(u)) return `https://${u}`
                              return undefined
                            }
                          }
                          const hp = normalize(homepage)
                          const gm = p.google_maps_url
                          const osm = p.osm_url
                          // スポット名は公式サイトを優先して開く。なければ Google Maps、さらに無ければ OSM を使う。
                          const nameHref = hp || gm || osm
                          return (
                            <div className="flex items-baseline gap-2">
                              {nameHref ? (
                                <a href={nameHref} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:underline">{p.name || '無名スポット'}</a>
                              ) : (
                                <span className="text-gray-800">{p.name || '無名スポット'}</span>
                              )}
                              {/* rating display: star visualization */}
                              {typeof p.rating === 'number' && (
                                <StarRating rating={p.rating} total={p.user_ratings_total} />
                              )}
                              {/* 公式サイトがある場合は小さなリンクを添える */}
                              {hp && (
                                <a href={hp} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">公式サイト</a>
                              )}
                            </div>
                          )
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
  }

  // 温泉・スキー場のみ抽出
  const hotSpringEntry = finalListCapped.find(([c]) => c === 'hot_springs')
  const skiResortEntry = finalListCapped.find(([c]) => c === 'ski_resorts')
  // その他カテゴリ
  const otherEntries = finalListCapped.filter(([c]) => c !== 'hot_springs' && c !== 'ski_resorts')

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-3">近郊スポット</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 温泉セクション */}
        {hotSpringEntry && renderCategorySection(hotSpringEntry[0], hotSpringEntry[1])}
        {/* その他カテゴリまとめて */}
        {otherEntries.map(([category, places]) => {
          const spotsWithCoords = (places || []).filter(p => typeof p.lat === 'number' && typeof p.lon === 'number')
          return (
            <div key={category} className="bg-white shadow-sm rounded-lg p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                {(() => {
                  switch (category) {
                    case 'soba_restaurants': return <SparklesIcon className="w-5 h-5 text-amber-600" aria-hidden />
                    case 'hotels': return <BuildingStorefrontIcon className="w-5 h-5 text-gray-700" aria-hidden />
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
                    {(expandedCategories[category]
                      ? places
                      : places.slice(0, (CATEGORY_PREVIEW_OVERRIDES[category] ?? DEFAULT_PREVIEW))
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
                                  case 'soba_restaurants': return <SparklesIcon className="w-6 h-6 text-amber-500" />
                                  case 'hotels': return <BuildingStorefrontIcon className="w-6 h-6 text-gray-500" />
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
                                      if (/^www\./i.test(u)) return `https://${u}`
                                      return undefined
                                    }
                                  }
                                  const hp = normalize(homepage)
                                  const gm = p.google_maps_url
                                  const osm = p.osm_url
                                  const nameHref = hp || gm || osm
                                  return (
                                    <div className="flex items-baseline gap-2">
                                      {nameHref ? (
                                        <a href={nameHref} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:underline">{p.name || '無名スポット'}</a>
                                      ) : (
                                        <span className="text-gray-800">{p.name || '無名スポット'}</span>
                                      )}
                                      {typeof p.rating === 'number' && (
                                        <StarRating rating={p.rating} total={p.user_ratings_total} />
                                      )}
                                      {hp && (
                                        <a href={hp} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">公式サイト</a>
                                      )}
                                    </div>
                                  )
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
        {/* スキー場セクション（最後に配置） */}
        {skiResortEntry && renderCategorySection(skiResortEntry[0], skiResortEntry[1])}
      </div>
    </div>
  )
}
