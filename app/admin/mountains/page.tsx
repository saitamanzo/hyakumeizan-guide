import React from "react";
import Link from "next/link";
import { getMountains } from "@/app/actions/mountains";
import DeleteMountainButton from "@/components/admin/DeleteMountainButton";
import FetchPhotosBatchPanel from "@/components/admin/FetchPhotosBatchPanel";

export default async function AdminMountainsPage() {
  // 管理者用：山一覧取得
  const mountains = await getMountains();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">山一覧（管理者）</h1>
      <FetchPhotosBatchPanel />
      <Link href="/admin/mountains/new" className="bg-blue-500 text-white px-4 py-2 rounded mb-4 inline-block">新規作成</Link>
      <table className="w-full border">
        <thead>
          <tr>
            <th className="border px-2 py-1">ID</th>
            <th className="border px-2 py-1">山名</th>
            <th className="border px-2 py-1">操作</th>
          </tr>
        </thead>
        <tbody>
          {mountains.map((mountain: import('@/types/database').Mountain) => (
            <tr key={mountain.id}>
              <td className="border px-2 py-1">{mountain.id}</td>
              <td className="border px-2 py-1">{mountain.name}</td>
              <td className="border px-2 py-1">
                <Link href={`/admin/mountains/${mountain.id}`} className="text-blue-600 mr-2">詳細</Link>
                <Link href={`/admin/mountains/${mountain.id}/edit`} className="text-green-600 mr-2">編集</Link>
                <DeleteMountainButton id={mountain.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
