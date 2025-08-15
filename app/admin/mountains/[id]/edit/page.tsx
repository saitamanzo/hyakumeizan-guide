
"use client";
import React, { useEffect, useState } from "react";
import MountainForm from "@/components/admin/MountainForm";
import type { Mountain } from "@/types/database";

type PageParams = { params: Promise<{ id: string }> };

export default function AdminMountainEditPage({ params }: PageParams) {
  const { id } = React.use(params);
  const [mountain, setMountain] = useState<Mountain | null>(null);
  const [loading, setLoading] = useState(true);
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

  if (loading) return <div>読み込み中...</div>;
  if (!mountain) return <div>山情報が見つかりません</div>;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{mountain.name} 編集（管理者）</h1>
      <MountainForm mode="edit" initialData={mountain} onSubmit={handleSubmit} />
    </div>
  );
}
