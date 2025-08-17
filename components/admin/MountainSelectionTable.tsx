"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import type { Mountain } from "@/types/database";

type Props = {
  mountains: Mountain[];
};

type RowStatus =
  | { state: "idle" }
  | { state: "pending" }
  | { state: "success"; photo_url?: string }
  | { state: "skipped"; reason?: string }
  | { state: "error"; message: string };

export default function MountainSelectionTable({ mountains }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [skipHasPhoto, setSkipHasPhoto] = useState(true);
  const [statusMap, setStatusMap] = useState<Record<string, RowStatus>>({});

  const allIds = useMemo(() => mountains.map((m) => m.id), [mountains]);
  const allSelected = selected.size > 0 && selected.size === allIds.length;

  const toggleAll = () => {
    setSelected((prev) => {
      if (prev.size === allIds.length) return new Set();
      return new Set(allIds);
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runForIds = async (ids: string[], force: boolean) => {
    setProcessing(true);
    // reset status only for target ids
    setStatusMap((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [id, { state: "pending" as const }])) }));
    try {
      for (const id of ids) {
        // optional skip when already has photo
        const row = mountains.find((m) => m.id === id);
        if (skipHasPhoto && row?.photo_url && !force) {
          setStatusMap((prev) => ({ ...prev, [id]: { state: "skipped", reason: "already has photo" } }));
          continue;
        }
        try {
          const res = await fetch(`/api/admin/mountains/${id}/fetch-photo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ force }),
          });
          const data = await res.json();
          if (!res.ok || data.success === false) {
            setStatusMap((prev) => ({ ...prev, [id]: { state: "error", message: data.error || `HTTP ${res.status}` } }));
          } else if (data.skipped) {
            setStatusMap((prev) => ({ ...prev, [id]: { state: "skipped", reason: data.reason || "skipped" } }));
          } else {
            setStatusMap((prev) => ({ ...prev, [id]: { state: "success", photo_url: data.photo_url } }));
          }
        } catch (e) {
          setStatusMap((prev) => ({ ...prev, [id]: { state: "error", message: e instanceof Error ? e.message : String(e) } }));
        }
        // small delay to be nice to APIs
        await new Promise((r) => setTimeout(r, 200));
      }
    } finally {
      setProcessing(false);
    }
  };

  const runSelected = (force: boolean) => runForIds(Array.from(selected), force);
  const runOne = (id: string, force: boolean) => runForIds([id], force);

  const successCount = Object.values(statusMap).filter((s) => s.state === "success").length;
  const errorCount = Object.values(statusMap).filter((s) => s.state === "error").length;
  const skippedCount = Object.values(statusMap).filter((s) => s.state === "skipped").length;

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <button
          onClick={() => runSelected(false)}
          disabled={processing || selected.size === 0}
          className="bg-indigo-600 text-white px-3 py-1.5 rounded disabled:opacity-50"
        >
          選択の写真を取得
        </button>
        <button
          onClick={() => runSelected(true)}
          disabled={processing || selected.size === 0}
          className="bg-gray-700 text-white px-3 py-1.5 rounded disabled:opacity-50"
        >
          強制再取得（上書き）
        </button>
        <label className="ml-2 inline-flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={skipHasPhoto} onChange={(e) => setSkipHasPhoto(e.target.checked)} />
          既に写真ありはスキップ
        </label>
        {processing && <span className="text-sm text-gray-600">実行中...</span>}
        {(successCount + errorCount + skippedCount > 0) && (
          <span className="text-sm text-gray-600">
            成功: {successCount} / 失敗: {errorCount} / スキップ: {skippedCount}
          </span>
        )}
      </div>

      <table className="w-full border">
        <thead>
          <tr>
            <th className="border px-2 py-1 w-10">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            </th>
            <th className="border px-2 py-1">ID</th>
            <th className="border px-2 py-1">山名</th>
            <th className="border px-2 py-1">写真</th>
            <th className="border px-2 py-1">状態</th>
            <th className="border px-2 py-1">操作</th>
          </tr>
        </thead>
        <tbody>
          {mountains.map((m) => {
            const st = statusMap[m.id]?.state || "idle";
            return (
              <tr key={m.id} className="align-top">
                <td className="border px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
                    onChange={() => toggleOne(m.id)}
                  />
                </td>
                <td className="border px-2 py-1 text-xs text-gray-600">{m.id}</td>
                <td className="border px-2 py-1">{m.name}</td>
                <td className="border px-2 py-1 text-sm">
                  {m.photo_url ? (
                    <span className="text-green-700">あり</span>
                  ) : (
                    <span className="text-gray-500">なし</span>
                  )}
                </td>
                <td className="border px-2 py-1 text-sm">
                  {st === "idle" && <span className="text-gray-500">-</span>}
                  {st === "pending" && <span className="text-indigo-600">実行中...</span>}
                  {st === "success" && <span className="text-green-700">更新済み</span>}
                  {st === "skipped" && <span className="text-gray-600">スキップ</span>}
                  {st === "error" && <span className="text-red-600">失敗</span>}
                </td>
                <td className="border px-2 py-1 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => runOne(m.id, false)}
                      disabled={processing}
                      className="px-2 py-1 rounded bg-indigo-600 text-white disabled:opacity-50"
                    >
                      取得
                    </button>
                    <button
                      onClick={() => runOne(m.id, true)}
                      disabled={processing}
                      className="px-2 py-1 rounded bg-gray-700 text-white disabled:opacity-50"
                    >
                      強制
                    </button>
                    <Link href={`/admin/mountains/${m.id}/edit`} className="px-2 py-1 rounded border text-gray-700 hover:bg-gray-50">編集</Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
