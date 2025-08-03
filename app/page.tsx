import { getMountains } from '@/app/actions/mountains';
import HomeClient from '@/components/HomeClient';

export default async function Home() {
  const mountains = await getMountains();

  return <HomeClient mountains={mountains} />;
}
