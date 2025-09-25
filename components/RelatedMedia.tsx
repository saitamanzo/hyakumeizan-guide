 'use client'
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import type { MediaItem } from '@/lib/relatedMedia';

export default function RelatedMedia({ items, mountainName }: { items: MediaItem[], mountainName?: string }) {
  const [showExternal, setShowExternal] = useState(false);
  const [externalItems, setExternalItems] = useState<MediaItem[] | null>(null);
  const queryName = mountainName && mountainName.length > 0 ? mountainName : (items && items.length > 0 ? items[0].title : '');

  useEffect(() => {
    // Reset external items when mountain changes or toggle off
    setExternalItems(null);
  }, [items]);

  useEffect(() => {
    if (!showExternal) return;
    // if we already fetched for this mountain don't refetch
    if (externalItems !== null) return;
    const nameToQuery = queryName || '';
    if (!nameToQuery) {
      setExternalItems([]);
      return;
    }
    // fetch external links
    (async () => {
      try {
        const res = await fetch(`/api/related-media/external?name=${encodeURIComponent(nameToQuery)}`);
        const json = await res.json();
        setExternalItems(json.items || []);
      } catch (err) {
        console.error('fetch external related media', err);
        setExternalItems([]);
      }
    })();
  }, [showExternal, externalItems, queryName]);

 

  return (
    <div className="mt-6 bg-white shadow-sm rounded-lg p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900 mb-4">関連ライブラリ</h3>
        <div className="flex items-center space-x-3">
          <label className="text-sm text-gray-600">外部検索を表示</label>
          <input type="checkbox" className="h-4 w-4" checked={showExternal} onChange={e => setShowExternal(e.target.checked)} />
        </div>
      </div>

      {(!items || items.length === 0) ? (
        <div className="text-sm text-gray-500">この山に紐づく関連ライブラリ情報はまだありません。よろしければおすすめの本や写真集を追加してください。</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map(item => (
            <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-start space-x-3 p-2 border border-gray-100 rounded hover:shadow">
              <div className="w-16 h-24 relative flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                {item.thumbnail ? (
                  <Image src={item.thumbnail} alt={item.title} fill sizes="80px" className="object-cover" unoptimized={process.env.NEXT_PUBLIC_IMAGE_UNOPTIMIZED === 'true'} />
                ) : (
                  <div className="w-full h-full bg-gray-200" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-900 truncate">{item.title}</div>
                <div className="text-[10px] text-gray-500 mt-1">{item.author || ''} {item.year ? `· ${item.year}` : ''}</div>
                <div className="mt-2">
                  <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{item.type}</span>
                  <span className="ml-2 text-[10px] text-gray-500">{new URL(item.url).hostname.replace('www.','')}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* external results area */}
      {showExternal && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">外部検索結果 ({queryName})</h4>
          {externalItems === null ? (
            <div className="text-sm text-gray-500">検索中…</div>
          ) : externalItems.length === 0 ? (
            <div className="text-sm text-gray-500">外部検索結果はありません。</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {externalItems.map(item => (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-start space-x-3 p-2 border border-gray-100 rounded hover:shadow">
                  <div className="w-12 h-18 relative flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                    {item.thumbnail ? (
                      <Image src={item.thumbnail} alt={item.title} fill sizes="56px" className="object-cover" unoptimized={process.env.NEXT_PUBLIC_IMAGE_UNOPTIMIZED === 'true'} />
                    ) : (
                      <div className="w-full h-full bg-gray-200" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-900 truncate">{item.title}</div>
                    <div className="text-[10px] text-gray-500 mt-1">{item.type} • {new URL(item.url).hostname.replace('www.','')}</div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
