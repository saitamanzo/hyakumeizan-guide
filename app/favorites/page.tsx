import { getMountains } from '@/app/actions/mountains';
import FavoritesList from '@/components/FavoritesList';

export default async function FavoritesPage() {
  const mountains = await getMountains();

  return <FavoritesList initialMountains={mountains} />;
}
