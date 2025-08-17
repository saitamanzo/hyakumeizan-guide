"use client";
import React, { useEffect, useState } from "react";
import MountainForm from "@/components/admin/MountainForm";
import type { Mountain } from "@/types/database";

type PageParams = { params: Promise<{ id: string }> };

export default function AdminMountainEditPage({ params }: PageParams) {
  const { id } = React.use(params);
  const [mountain, setMountain] = useState<Mountain | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  useEffect(() => {
    const fetchMountain = async () => {
      try {
        const res = await fetch(`/api/admin/mountains/${id}/edit`);
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

  const handleSubmit = async (data: Partial<Mountain>) => {
    try {
      const res = await fetch(`/api/admin/mountains/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        alert("更新しました");
        window.location.href = `/admin/mountains/${id}`;
      } else {
        alert("更新失敗: " + (result.error || "不明なエラー"));
      }
    } catch (err) {
      alert("通信エラー: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const fetchPhoto = async (force = false) => {
    if (!id) return;
    setFetching(true);
    try {
      const res = await fetch(`/api/admin/mountains/${id}/fetch-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        alert(`取得失敗: ${data.error || res.status}`);
        return;
      }
      alert('写真URLを取得・更新しました');
      // 最新を再取得
      const r2 = await fetch(`/api/admin/mountains/${id}/edit`);
      if (r2.ok) setMountain(await r2.json());
    } catch (e) {
      alert('通信エラー: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setFetching(false);
    }
  };

  if (loading) return <div>読み込み中...</div>;
  if (!mountain) return <div>山情報が見つかりません</div>;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{mountain.name} 編集（管理者）</h1>
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => fetchPhoto(false)} disabled={fetching} className="bg-indigo-600 text-white px-3 py-1 rounded">
          {fetching ? '取得中...' : 'Wikiから写真取得'}
        </button>
        <button onClick={() => fetchPhoto(true)} disabled={fetching} className="bg-gray-600 text-white px-3 py-1 rounded">
          {fetching ? '取得中...' : '強制再取得（上書き）'}
        </button>
        {mountain.photo_url && (
          <a href={mountain.photo_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
            現在の写真を開く
          </a>
        )}
      </div>
      <MountainForm mode="edit" initialData={mountain} onSubmit={handleSubmit} />
    </div>
  );
}
