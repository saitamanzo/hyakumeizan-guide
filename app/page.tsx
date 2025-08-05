export const dynamic = "force-dynamic";
import { Suspense } from 'react';
import { getMountains } from '@/app/actions/mountains';
import HomeClient from '@/components/HomeClient';

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

export default async function Home() {
  try {
    console.log('Home: getMountains開始');
    const mountains = await getMountains();
    console.log('Home: getMountains成功 -', mountains?.length || 0, '件');

    return (
      <Suspense fallback={<LoadingSpinner />}>
        <HomeClient mountains={mountains} />
      </Suspense>
    );
  } catch (error) {
    console.error('Home: データ取得エラー:', error);
    
    // エラー時は空の配列で表示を継続
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <HomeClient mountains={[]} />
      </Suspense>
    );
  }
}
