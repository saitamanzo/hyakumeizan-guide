import { notFound } from 'next/navigation';
import { getMountainWithRoutes, getMountainReviews } from '@/app/actions/mountain';

export default async function MountainPage({
  params
}: {
  params: { id: string }
}) {
  try {
    const [mountain, reviews] = await Promise.all([
      getMountainWithRoutes(params.id),
      getMountainReviews(params.id)
    ]);

    if (!mountain) {
      notFound();
    }

    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* ヘッダーセクション */}
          <div className="relative pb-8">
            <div className="h-64 w-full bg-gray-200 rounded-lg"></div>
            <div className="absolute bottom-0 left-0 right-0 px-4 py-6 bg-gradient-to-t from-black/60 to-transparent">
              <h1 className="text-4xl font-bold text-white">
                {mountain.name}
                <span className="text-2xl ml-2 font-normal">
                  ({mountain.elevation}m)
                </span>
              </h1>
              <p className="mt-2 text-white/90">
                {mountain.prefecture}
              </p>
            </div>
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
                    <dt className="text-sm font-medium text-gray-500">ベストシーズン</dt>
                    <dd className="mt-1 text-base text-gray-900">{mountain.best_season || '情報なし'}</dd>
                  </div>
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

          {/* レビュー */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">レビュー</h2>
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                レビューを書く
              </button>
            </div>
            <div className="space-y-6">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="bg-white shadow-sm rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {review.users?.display_name || '匿名ユーザー'}
                        </p>
                        <div className="mt-1 flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`h-5 w-5 ${
                                i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 15.585l-6.328 3.326 1.209-7.043L.342 7.538l7.057-1.026L10 0l2.601 6.512 7.057 1.026-4.539 4.33 1.209 7.043L10 15.585z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(review.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <p className="mt-4 text-base text-gray-900">{review.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">
                  まだレビューがありません。最初のレビューを投稿してみませんか？
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in MountainPage:', error);
    throw error;
  }
}
