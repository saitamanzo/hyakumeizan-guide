"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { Mountain } from "@/types/database";
import DeleteMountainButton from "@/components/admin/DeleteMountainButton";

type Params = { id: string };
export default function AdminMountainDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = React.use(params);

  const [mountain, setMountain] = useState<Mountain | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMountain = async () => {
      try {
        const res = await fetch(`/api/admin/mountains/${id}`);
        if (!res.ok) throw new Error("APIエラー: " + res.status);
        const data = await res.json();
        setMountain(data);
      } catch {
        setMountain(null);
      } finally {
        setLoading(false);
      }
    };
    fetchMountain();
  }, [id]);

  if (loading) return <div>読み込み中...</div>;
  if (!mountain) return <div>山情報が見つかりません</div>;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{mountain.name}（詳細・管理者）</h1>
      <div className="mb-4 space-y-1">
        <div>ID: {mountain.id}</div>
        <div>山名: {mountain.name}</div>
        <div>山名（かな）: {mountain.name_kana ?? ""}</div>
        <div>標高: {mountain.elevation}m</div>
        <div>場所: {mountain.location}</div>
        <div>都道府県: {mountain.prefecture}</div>
        <div>説明: {mountain.description ?? ""}</div>
        <div>ベストシーズン: {mountain.best_season ?? ""}</div>
        <div>難易度: {mountain.difficulty_level ?? ""}</div>
  <div>カテゴリ: {mountain.category ?? '-'}</div>
  <div>カテゴリ内順: {mountain.category_order ?? '-'}</div>
        <div>緯度: {mountain.latitude ?? ""}</div>
        <div>経度: {mountain.longitude ?? ""}</div>
        <div>写真URL: {mountain.photo_url ?? ""}</div>
        <div>作成日時: {mountain.created_at}</div>
        <div>更新日時: {mountain.updated_at}</div>
      </div>
      <Link href={`/admin/mountains/${mountain.id}/edit`} className="bg-green-500 text-white px-4 py-2 rounded mr-2">編集</Link>
      <DeleteMountainButton id={mountain.id} />
      <Link href="/admin/mountains" className="ml-4 text-blue-600">一覧へ戻る</Link>
    </div>
  );
}
