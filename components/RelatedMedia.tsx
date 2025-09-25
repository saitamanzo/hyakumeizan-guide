import React from 'react';
import Image from 'next/image';
import type { MediaItem } from '@/lib/relatedMedia';

export default function RelatedMedia({ items }: { items: MediaItem[] }) {
  return (
    <div className="mt-6 bg-white shadow-sm rounded-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">関連ライブラリ</h3>
      {(!items || items.length === 0) ? (
        <div className="text-sm text-gray-500">この山に紐づく関連ライブラリ情報はまだありません。よろしければおすすめの本や写真集を追加してください。</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map(item => (
            <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-start space-x-3 p-2 border border-gray-100 rounded hover:shadow">
              <div className="w-16 h-24 relative flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                {item.thumbnail ? (
                  // Use next/image for optimization where possible
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
    </div>
  );
}
