"use client"
import React, { useEffect, useState } from 'react'

type NewsItem = { title: string; link: string; pubDate?: string; source?: string }

export default function NearbyNews({ name, area }: { name?: string; area?: string }) {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let mounted = true
    async function fetchNews(max = 3) {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/news?name=${encodeURIComponent(name||'')}&area=${encodeURIComponent(area||'')}&max=${max}`)
        if (!res.ok) throw new Error(`fetch ${res.status}`)
        const json = await res.json()
        if (mounted && json.ok) setItems(json.data || [])
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchNews(3)
    return () => { mounted = false }
  }, [name, area])

  const loadMore = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/news?name=${encodeURIComponent(name||'')}&area=${encodeURIComponent(area||'')}&max=15`)
      if (!res.ok) throw new Error(`fetch ${res.status}`)
      const json = await res.json()
      if (json.ok) setItems(json.data || [])
      setExpanded(true)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally { setLoading(false) }
  }

  if (loading) return <div className="p-4">ニュースを取得中…</div>
  if (error) return <div className="p-4 text-red-600">エラー: {error}</div>
  if (!items || items.length === 0) return <div className="p-4 text-gray-500">関連ニュースは見つかりませんでした。</div>

  const visible = expanded ? items : (items || []).slice(0, 3)

  return (
    <div className="mt-6 bg-white shadow-sm rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-2">関連ニュース</h3>
      <ul className="space-y-2">
        {visible.map((it, i) => (
          <li key={it.link || i}>
            <a href={it.link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">{it.title}</a>
            <div className="text-xs text-gray-500">{it.source || ''} {it.pubDate ? `・${new Date(it.pubDate).toLocaleString('ja-JP')}` : ''}</div>
          </li>
        ))}
      </ul>
      <div className="mt-3">
        {!expanded ? (
          <button type="button" className="text-sm text-blue-600 hover:underline" onClick={loadMore}>もっと見る（最大15件）</button>
        ) : (
          <button type="button" className="text-sm text-gray-600 hover:underline" onClick={() => setExpanded(false)}>閉じる</button>
        )}
      </div>
    </div>
  )
}
