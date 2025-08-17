"use client";
import React, { useState } from "react";
import type { Mountain } from "@/types/database";

interface MountainFormProps {
  mode: "create" | "edit";
  initialData?: Partial<Mountain>;
  onSubmit?: (data: Partial<Mountain>) => void;
}

export default function MountainForm({ mode, initialData = {}, onSubmit }: MountainFormProps) {
  const [form, setForm] = useState<Partial<Mountain>>(initialData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? null : Number(value)) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) onSubmit(form);
    // TODO: API呼び出し（新規 or 編集）
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* id, created_at, updated_atは詳細表示のみ */}
      {mode === "edit" && form.id && (
        <div>
          <label>ID</label>
          <input name="id" value={form.id} className="border px-2 py-1 w-full bg-gray-100" disabled />
        </div>
      )}
      <div>
        <label>山名</label>
        <input name="name" value={form.name || ""} onChange={handleChange} className="border px-2 py-1 w-full" required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label>カテゴリ（0-9）</label>
          <input
            name="category"
            type="number"
            min={0}
            max={9}
            value={form.category ?? ''}
            onChange={handleChange}
            className="border px-2 py-1 w-full"
          />
        </div>
        <div>
          <label>カテゴリ内順（0-99）</label>
          <input
            name="category_order"
            type="number"
            min={0}
            max={99}
            value={form.category_order ?? ''}
            onChange={handleChange}
            className="border px-2 py-1 w-full"
          />
        </div>
      </div>
      <div>
        <label>山名（かな）</label>
        <input name="name_kana" value={form.name_kana || ""} onChange={handleChange} className="border px-2 py-1 w-full" />
      </div>
      <div>
        <label>標高</label>
        <input name="elevation" type="number" value={form.elevation ?? ""} onChange={handleChange} className="border px-2 py-1 w-full" required />
      </div>
      <div>
        <label>場所</label>
        <input name="location" value={form.location || ""} onChange={handleChange} className="border px-2 py-1 w-full" />
      </div>
      <div>
        <label>都道府県</label>
        <input name="prefecture" value={form.prefecture || ""} onChange={handleChange} className="border px-2 py-1 w-full" />
      </div>
      <div>
        <label>説明</label>
        <textarea name="description" value={form.description || ""} onChange={handleChange} className="border px-2 py-1 w-full" />
      </div>
      <div>
        <label>ベストシーズン</label>
        <input name="best_season" value={form.best_season || ""} onChange={handleChange} className="border px-2 py-1 w-full" />
      </div>
      <div>
        <label>難易度</label>
        <input name="difficulty_level" value={form.difficulty_level || ""} onChange={handleChange} className="border px-2 py-1 w-full" />
      </div>
      <div>
        <label>緯度</label>
        <input name="latitude" type="number" value={form.latitude ?? ""} onChange={handleChange} className="border px-2 py-1 w-full" step="any" />
      </div>
      <div>
        <label>経度</label>
        <input name="longitude" type="number" value={form.longitude ?? ""} onChange={handleChange} className="border px-2 py-1 w-full" step="any" />
      </div>
      <div>
        <label>写真URL</label>
        <input name="photo_url" value={form.photo_url || ""} onChange={handleChange} className="border px-2 py-1 w-full" />
      </div>
      {mode === "edit" && form.created_at && (
        <div>
          <label>作成日時</label>
          <input name="created_at" value={form.created_at} className="border px-2 py-1 w-full bg-gray-100" disabled />
        </div>
      )}
      {mode === "edit" && form.updated_at && (
        <div>
          <label>更新日時</label>
          <input name="updated_at" value={form.updated_at} className="border px-2 py-1 w-full bg-gray-100" disabled />
        </div>
      )}
      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
        {mode === "create" ? "新規作成" : "更新"}
      </button>
    </form>
  );
}
