'use client';

import Link from "next/link";

export default function HeroSection() {
  return (
    <div className="relative bg-gradient-to-br from-blue-900 via-gray-900 to-green-900 h-[600px] mt-8">
      <div className="absolute inset-0 bg-black opacity-30"></div>
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
  );
}
