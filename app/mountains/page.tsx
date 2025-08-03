import { getMountains } from '@/app/actions/mountains';
import MountainsList from '@/components/MountainsList';

export default async function MountainsPage() {
  try {
    console.log('MountainsPage: getMountains開始');
    const mountains = await getMountains();
    console.log('MountainsPage: getMountains成功 -', mountains?.length || 0, '件');

    return <MountainsList initialMountains={mountains} />;
  } catch (error) {
    console.error('MountainsPage: データ取得エラー:', error);
    
    // エラー時は空の配列で表示を継続
    return <MountainsList initialMountains={[]} />;
  }
}
