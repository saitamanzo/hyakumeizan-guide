import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* ロゴ/サイト名 */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="font-bold text-xl text-gray-900">
                百名山ガイド
              </Link>
            </div>
            {/* メインナビゲーション */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/mountains"
                className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-gray-600"
              >
                山一覧
              </Link>
              <Link
                href="/climbs"
                className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-gray-600"
              >
                登山記録
              </Link>
            </div>
          </div>
          {/* 右側のナビゲーション */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <Link
              href="/signin"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              ログイン
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
