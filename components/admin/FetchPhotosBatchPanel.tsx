"use client";
import React, { useState } from "react";

export default function FetchPhotosBatchPanel() {
  const [limit, setLimit] = useState<number>(50);
  const [dryRun, setDryRun] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  type ApiOk = { success: true; dryRun?: boolean; updates?: Array<{ id: string; photo_url: string }>; applied?: number };
  type ApiErr = { success: false; error: string };

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/mountains/fetch-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit, dryRun }),
      });
      const data: ApiOk | ApiErr = await res.json();
      if (!res.ok || ("success" in data && data.success === false)) {
        const msg = ("error" in data && data.error) ? data.error : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const resultText = result ? JSON.stringify(result, null, 2) : "";

  return (
    <div className="mb-6 p-4 border rounded bg-white">
      <h2 className="text-lg font-semibold mb-2">Wikimediaから写真を一括取得</h2>
      <div className="flex items-center gap-4 mb-2">
        <label className="flex items-center gap-2">
          <span>件数上限</span>
          <input
            type="number"
            min={1}
            max={100}
            value={limit}
            onChange={(e) => setLimit(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
            className="border px-2 py-1 w-24"
          />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
          <span>ドライラン（適用せずプレビュー）</span>
        </label>
        <button onClick={run} disabled={loading} className="bg-indigo-600 text-white px-3 py-1 rounded">
          {loading ? "実行中..." : "実行"}
        </button>
      </div>
      {error && <div className="text-red-600">エラー: {error}</div>}
      {result !== null && (
        <div className="mt-3 text-sm">
          <pre className="whitespace-pre-wrap break-all bg-gray-50 p-2 border rounded max-h-64 overflow-auto">{resultText}</pre>
        </div>
      )}
      <p className="text-xs text-gray-600 mt-2">注: Wikimedia APIのレート制限に配慮してください。必要に応じて複数回に分けて実行してください。</p>
    </div>
  );
}
