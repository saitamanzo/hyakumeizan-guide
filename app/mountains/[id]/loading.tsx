export default function Loading() {
  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダーセクション */}
        <div className="relative pb-8">
          <div className="h-64 w-full bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="absolute bottom-0 left-0 right-0 px-4 py-6">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
            <div className="mt-2 h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* 基本情報 */}
        <div className="mt-8 bg-white shadow-sm rounded-lg p-6">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="space-y-4">
              <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* 登山ルート */}
        <div className="mt-8">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="space-y-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white shadow-sm rounded-lg p-6">
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, j) => (
                    <div key={j}>
                      <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                      <div className="mt-1 h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="mt-1 h-20 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* レビュー */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white shadow-sm rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                    <div className="mt-2 h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="mt-4 h-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
