import { getMountains } from '@/app/actions/mountains';
import NewClimbForm from '@/components/NewClimbForm';

export default async function NewClimbPage() {
  const mountains = await getMountains();
  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">登山記録を作成</h1>
        <NewClimbForm mountains={mountains} />
      </div>
    </div>
  );
}
