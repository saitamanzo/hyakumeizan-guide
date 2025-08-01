import Link from 'next/link';
import { getMountains } from '@/app/actions/mountains';

export default async function MountainsPage() {
  const mountains = await getMountains();

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダーセクション */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            日本百名山一覧
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            深田久弥が選定した日本を代表する100座の山々
          </p>
        </div>

        {/* 山の一覧 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {mountains.map((mountain) => (
            <Link
              key={mountain.id}
              href={`/mountains/${mountain.id}`}
              className="block group"
            >
              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                {/* TODO: 山の画像を追加 */}
                <div className="h-48 bg-gray-200"></div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-semibold text-gray-900 group-hover:text-indigo-600">
                      {mountain.name}
                    </h2>
                    <span className="text-sm text-gray-600">
                      {mountain.elevation}m
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {mountain.prefecture}
                  </p>
                  <div className="flex items-center space-x-2">
                    {mountain.difficulty_level && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {mountain.difficulty_level}
                      </span>
                    )}
                    {mountain.best_season && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {mountain.best_season}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
