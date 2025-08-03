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
  const mountains = await getMountains();

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HomeClient mountains={mountains} />
    </Suspense>
  );
}
