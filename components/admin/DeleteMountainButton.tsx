"use client";
import React from "react";

interface Props {
  id: string;
}

export default function DeleteMountainButton({ id }: Props) {
  const handleDelete = async () => {
    if (!confirm("本当に削除しますか？")) return;
    try {
      const res = await fetch(`/api/admin/mountains/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const text = await res.text();
        alert("APIエラー: " + text);
        console.error("APIエラー:", text);
        return;
      }
  type DeleteResponse = { success?: boolean; error?: string };
  const result: DeleteResponse = await res.json().catch(() => ({}));
  if (res.ok && (result.success ?? true)) {
        alert("削除しました");
        window.location.href = "/admin/mountains";
      } else {
        alert("削除失敗: " + (result.error || "不明なエラー"));
        console.error("削除失敗:", result);
      }
    } catch (err) {
      alert("通信エラー: " + (err instanceof Error ? err.message : String(err)));
      console.error("通信エラー:", err);
    }
  };
  return (
    <button className="text-red-600" onClick={handleDelete}>
      削除
    </button>
  );
}
