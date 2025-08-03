import { getMountains } from '@/app/actions/mountains';
import MountainsList from '@/components/MountainsList';

export default async function MountainsPage() {
  const mountains = await getMountains();

  return <MountainsList initialMountains={mountains} />;
}
