import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-600 tracking-wider uppercase">
              百名山ガイド
            </h3>
            <div className="mt-4 space-y-4">
              <Link href="/about" className="text-base text-gray-500 hover:text-gray-900 block">
                サイトについて
              </Link>
              <Link href="/contact" className="text-base text-gray-500 hover:text-gray-900 block">
                お問い合わせ
              </Link>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-600 tracking-wider uppercase">
              山の情報
            </h3>
            <div className="mt-4 space-y-4">
              <Link href="/mountains" className="text-base text-gray-500 hover:text-gray-900 block">
                山一覧
              </Link>
              <Link href="/routes" className="text-base text-gray-500 hover:text-gray-900 block">
                登山ルート
              </Link>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-600 tracking-wider uppercase">
              コミュニティ
            </h3>
            <div className="mt-4 space-y-4">
              <Link href="/climbs" className="text-base text-gray-500 hover:text-gray-900 block">
                登山記録
              </Link>
              <Link href="/reviews" className="text-base text-gray-500 hover:text-gray-900 block">
                レビュー
              </Link>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-600 tracking-wider uppercase">
              アカウント
            </h3>
            <div className="mt-4 space-y-4">
              <Link href="/signin" className="text-base text-gray-500 hover:text-gray-900 block">
                ログイン
              </Link>
              <Link href="/signup" className="text-base text-gray-500 hover:text-gray-900 block">
                新規登録
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-8">
          <p className="text-base text-gray-400 text-center">
            &copy; 2025 百名山ガイド. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
