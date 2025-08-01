import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative">
      {/* ヒーローセクション */}
      <div className="relative bg-gray-900 h-[600px]">
        <Image
          src="/images/hero.jpg"
          alt="富士山の風景"
          fill
          className="object-cover opacity-50"
          priority
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            日本百名山への
            <br />
            冒険を始めよう
          </h1>
          <p className="text-xl sm:text-2xl text-white mb-8">
            登山情報の共有と記録で、より安全で楽しい山登りを
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/mountains"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:text-lg"
            >
              山を探す
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:text-lg"
            >
              無料で始める
            </Link>
          </div>
        </div>
      </div>

      {/* 特徴セクション */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              百名山ガイドの特徴
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              安全で楽しい登山をサポートする充実の機能
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative bg-white p-6 rounded-lg shadow-lg">
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2">
                <div className="rounded-full bg-indigo-500 p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
              </div>
              <h3 className="mt-8 text-xl font-medium text-gray-900">詳細な山岳情報</h3>
              <p className="mt-2 text-gray-500">
                標高、アクセス、推奨シーズン、難易度など、登山に必要な情報を完備
              </p>
            </div>

            <div className="relative bg-white p-6 rounded-lg shadow-lg">
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2">
                <div className="rounded-full bg-indigo-500 p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </div>
              <h3 className="mt-8 text-xl font-medium text-gray-900">登山記録</h3>
              <p className="mt-2 text-gray-500">
                登頂記録を保存し、自分だけの登山履歴を作成。写真や感想も残せます
              </p>
            </div>

            <div className="relative bg-white p-6 rounded-lg shadow-lg">
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2">
                <div className="rounded-full bg-indigo-500 p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="mt-8 text-xl font-medium text-gray-900">コミュニティ</h3>
              <p className="mt-2 text-gray-500">
                他の登山者とのレビュー共有や情報交換で、より安全で楽しい登山を
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
