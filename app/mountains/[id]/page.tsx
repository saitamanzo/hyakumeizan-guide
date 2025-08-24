// カテゴリ番号→地域名マップ
const CATEGORY_MAP: Record<number, string> = {
  1: '北海道',
  2: '東北',
  3: '上信越',
  4: '関東',
  5: '中部',
  6: '北陸',
  7: '近畿',
  8: '中国・四国',
  9: '九州',
};
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getMountainWithRoutes, getMountainReviews } from '@/app/actions/mountain';
import LikeButton from '@/components/LikeButton';
import { getPublicPlansByMountain } from '@/lib/plan-utils';
import { getPublicClimbRecordsByMountain } from '@/lib/climb-utils';
import ReviewSection from '@/components/ReviewSection';
import ClimbingPlan from '@/components/ClimbingPlan';
import ClimbRecord from '@/components/ClimbRecord';
import { WeatherMapIntegration, ImageGalleryWrapper } from '@/components/MountainClientComponents';

export default async function MountainPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [mountain, reviews, publicPlans, publicClimbs] = await Promise.all([
      getMountainWithRoutes(id),
      getMountainReviews(id),
      getPublicPlansByMountain(id),
      getPublicClimbRecordsByMountain(id)
    ]);

    if (!mountain) {
      notFound();
    }

    // デフォルト座標（富士山）
    const latitude = mountain.latitude || 35.360833;
    const longitude = mountain.longitude || 138.727500;

    // WikipediaなどのページURLを表示用の画像URLに正規化
      // 画像URL正規化＋クレジット取得
      const toDisplayImageUrl = (url: string | null | undefined, targetWidth = 1200): { src: string, filePageUrl: string, author?: string, license?: string } | null => {
        if (!url) return null;
        let external: string | null = null;
        let filePageUrl: string | null = null;
        let author: string | undefined = undefined;
        let license: string | undefined = undefined;
        try {
          const u = new URL(url);
          if (u.hostname === 'upload.wikimedia.org') {
            const parts = u.pathname.split('/')
            const isThumb = parts.includes('thumb')
            const rawName = isThumb ? parts[parts.length - 2] : parts[parts.length - 1]
            const fileName = decodeURIComponent(rawName)
            if (fileName) {
              external = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${targetWidth}`
              // クリック先は原本のアップロードURLに統一
              filePageUrl = u.toString()
              // Wikimedia APIからauthor/license取得（簡易:ファイル名から推測）
              // 本来はAPIで取得すべきだが、ここではダミー
              author = 'Wikimedia Commons';
              license = '';
            }
          }
          if (!external && (u.hostname.endsWith('wikipedia.org') || u.hostname.endsWith('wikimedia.org'))) {
            if (/\/wiki\/Special:FilePath\//.test(u.pathname)) {
              try {
                const cu = new URL(url)
                if (!cu.searchParams.has('width')) cu.searchParams.set('width', String(targetWidth))
                external = cu.toString()
                const name = cu.pathname.replace('/wiki/Special:FilePath/', '')
                filePageUrl = `https://ja.wikipedia.org/wiki/%E6%97%A5%E6%9C%AC%E7%99%BE%E5%90%8D%E5%B1%B1#/media/File:${encodeURIComponent(decodeURIComponent(name))}`
                author = 'Wikimedia Commons';
                license = '';
              } catch {
                external = url;
              }
            } else if (u.pathname.startsWith('/wiki/')) {
              const fileFromHash = u.hash && u.hash.startsWith('#/media/') ? decodeURIComponent(u.hash.replace('#/media/', '')) : '';
              const fileFromPath = decodeURIComponent(u.pathname.replace('/wiki/', ''));
              if (fileFromHash) {
                const fileName = fileFromHash.replace(/^ファイル:|^File:/i, '');
                external = `${u.protocol}//${u.hostname}/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${targetWidth}`;
                filePageUrl = `https://ja.wikipedia.org/wiki/%E6%97%A5%E6%9C%AC%E7%99%BE%E5%90%8D%E5%B1%B1#/media/File:${encodeURIComponent(fileName)}`
                author = 'Wikimedia Commons';
                license = '';
              } else if (/^(?:ファイル:|File:)/i.test(fileFromPath)) {
                const fileName = fileFromPath.replace(/^ファイル:|^File:/i, '');
                external = `${u.protocol}//${u.hostname}/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${targetWidth}`;
                filePageUrl = `https://ja.wikipedia.org/wiki/%E6%97%A5%E6%9C%AC%E7%99%BE%E5%90%8D%E5%B1%B1#/media/File:${encodeURIComponent(fileName)}`
                author = 'Wikimedia Commons';
                license = '';
              }
            }
          }
        } catch {
          external = null;
        }
        if (!external) return null;
        const b64url = Buffer.from(external, 'utf-8').toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
        return { src: `/api/image?u=${b64url}`, filePageUrl: filePageUrl || external, author, license };
    };

  const cover = toDisplayImageUrl(mountain.photo_url, 1200);

    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* ...existing code... */}
          {/* ヘッダーセクション */}
          <div className="relative pb-8">
            <div className="relative h-[40rem] w-full overflow-hidden rounded-lg">
              {cover ? (
                <a href={cover.filePageUrl} target="_blank" rel="noopener noreferrer" title="画像のクレジット/ライセンス">
                  <Image
                    src={cover.src}
                    alt={`${mountain.name} の写真`}
                    fill
                    sizes="100vw"
                    className="object-cover"
                    unoptimized={process.env.NEXT_PUBLIC_IMAGE_UNOPTIMIZED === 'true'}
                    priority
                  />
                </a>
              ) : (
                <div className="h-full w-full bg-gray-200" />
              )}
              {/* グラデーションオーバーレイ */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              {/* カテゴリバッジ（画像左上） */}
              {mountain.category && (
                <span className="absolute top-4 left-4 z-10 text-xs font-bold text-blue-900 bg-blue-50 rounded px-3 py-1 border border-blue-200 shadow">
                  {CATEGORY_MAP[mountain.category] || `カテゴリ${mountain.category}`}
                </span>
              )}
              {/* タイトルエリア */}
              <div className="absolute bottom-0 left-0 right-0 px-4 py-4 sm:px-6 sm:py-6">
                <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow">
                  {mountain.name}
                  {typeof mountain.elevation === 'number' && Number.isFinite(mountain.elevation) && (
                    <span className="text-xl sm:text-2xl ml-2 font-normal">
                      ({mountain.elevation}m)
                    </span>
                  )}
                </h1>
                <p className="mt-1 sm:mt-2 text-white/90 drop-shadow">
                  {mountain.prefecture || '-'}
                </p>
              </div>
            </div>
            {/* 画像外・ヘッダー直下にCredit欄を常時表示 */}
            <div className="w-full px-2 py-0.5 text-xs text-gray-500 bg-white/80 border-t border-gray-100 flex items-center justify-center min-h-0 leading-tight">
              <span className="truncate">
                {cover?.author || 'Wikimedia Commons'}
                {cover?.license ? ` / ${cover.license}` : ''}
              </span>
            </div>
          </div>

          {/* 天気・地図 - 統合レイアウト */}
          <div className="mt-8">
            <WeatherMapIntegration 
              latitude={latitude}
              longitude={longitude}
              mountainName={mountain.name}
              elevation={mountain.elevation}
            />
          </div>

          {/* 登山計画 */}
          <div className="mt-8">
            <ClimbingPlan 
              mountainName={mountain.name}
              mountainId={id}
              difficulty={mountain.difficulty_level || '中級'}
              elevation={mountain.elevation}
            />
          </div>

          {/* 登山記録 */}
          <div className="mt-8">
            <ClimbRecord 
              mountainName={mountain.name}
              mountainId={id}
            />
          </div>

          {/* 基本情報 */}
          <div className="mt-8 bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">基本情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">位置</dt>
                    <dd className="mt-1 text-base text-gray-900">{mountain.location}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">カテゴリ</dt>
                    <dd className="mt-1 text-base text-gray-900">
                      {mountain.category ? CATEGORY_MAP[mountain.category] || `カテゴリ${mountain.category}` : '情報なし'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">ベストシーズン</dt>
                    <dd className="mt-1 text-base text-gray-900">{mountain.best_season || '情報なし'}</dd>
                  </div>
                  {(mountain.latitude && mountain.longitude) && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">座標</dt>
                      <dd className="mt-1 text-base text-gray-900">
                        {mountain.latitude.toFixed(6)}, {mountain.longitude.toFixed(6)}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
              <div>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">難易度</dt>
                    <dd className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {mountain.difficulty_level || '情報なし'}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            {mountain.description && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500">山の説明</h3>
                <p className="mt-2 text-base text-gray-900">{mountain.description}</p>
              </div>
            )}
          </div>

          {/* 登山ルート */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">登山ルート</h2>
            <div className="space-y-6">
              {mountain.routes?.map((route) => (
                <div
                  key={route.id}
                  className="bg-white shadow-sm rounded-lg p-6"
                >
                  <h3 className="text-xl font-semibold text-gray-900">{route.name}</h3>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">距離</dt>
                      <dd className="mt-1 text-base text-gray-900">{route.distance ? `${route.distance}km` : '情報なし'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">獲得標高</dt>
                      <dd className="mt-1 text-base text-gray-900">{route.elevation_gain ? `${route.elevation_gain}m` : '情報なし'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">所要時間</dt>
                      <dd className="mt-1 text-base text-gray-900">
                        {route.estimated_time ? `約${Math.floor(route.estimated_time / 60)}時間${route.estimated_time % 60}分` : '情報なし'}
                      </dd>
                    </div>
                  </div>
                  {route.description && (
                    <div className="mt-4">
                      <dt className="text-sm font-medium text-gray-500">ルートの説明</dt>
                      <dd className="mt-1 text-base text-gray-900">{route.description}</dd>
                    </div>
                  )}
                  {route.trail_head_access && (
                    <div className="mt-4">
                      <dt className="text-sm font-medium text-gray-500">アクセス</dt>
                      <dd className="mt-1 text-base text-gray-900">{route.trail_head_access}</dd>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 画像ギャラリー */}
          <ImageGalleryWrapper 
            mountainId={id}
            mountainName={mountain.name}
          />

          {/* レビューセクション */}
          <ReviewSection 
            reviews={reviews} 
            mountainId={id}
          />

          {/* みんなの計画・記録一覧（ページ下部に移動） */}
          <div className="mt-12">
            {publicPlans && publicPlans.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-orange-700 mb-2">この山の公開登山計画</h2>
                <ul className="space-y-2">
                  {publicPlans.map(plan => (
                    <li key={plan.id} className="bg-orange-50 border border-orange-200 rounded p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold">{plan.title}</span>
                          <span className="ml-2 text-xs text-gray-500">by {plan.user?.display_name || 'ユーザー'}</span>
                          {plan.planned_date && (
                            <span className="ml-2 text-xs text-gray-500">({new Date(plan.planned_date).toLocaleDateString('ja-JP')})</span>
                          )}
                        </div>
                        <div>
                          {/* いいねボタン */}
                          <span className="ml-2">
                            <LikeButton type="plan" contentId={plan.id || ''} contentOwnerId={plan.user_id || ''} size="small" variant="outline" />
                          </span>
                        </div>
                      </div>
                      {plan.notes && <div className="text-xs text-gray-700 mt-1">{plan.notes}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {publicClimbs && publicClimbs.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-green-700 mb-2">この山の公開登山記録</h2>
                <ul className="space-y-2">
                  {publicClimbs.map(climb => (
                    <li key={climb.id} className="bg-green-50 border border-green-200 rounded p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold">{climb.user?.display_name || 'ユーザー'}</span>
                          {climb.climb_date && (
                            <span className="ml-2 text-xs text-gray-500">({new Date(climb.climb_date).toLocaleDateString('ja-JP')})</span>
                          )}
                        </div>
                        <div>
                          {/* いいねボタン */}
                          <span className="ml-2">
                            <LikeButton type="climb" contentId={climb.id || ''} contentOwnerId={climb.user_id || ''} size="small" variant="outline" />
                          </span>
                        </div>
                      </div>
                      {climb.notes && <div className="text-xs text-gray-700 mt-1">{climb.notes}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in MountainPage:', error);
    throw error;
  }
}
