"use client";

import React, { useMemo, useState } from 'react';
import type { Mountain } from '@/types/database';
import ClimbRecord from '@/components/ClimbRecord';

export default function NewClimbForm({ mountains }: { mountains: Mountain[] }) {
  const [selectedId, setSelectedId] = useState<string>("");

  const selected = useMemo(() => mountains.find(m => m.id === selectedId) || null, [mountains, selectedId]);

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-md p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">山を選択</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">（選択してください）</option>
          {mountains.map(m => (
            <option key={m.id} value={m.id}>{m.name}（{m.elevation}m / {m.prefecture}）</option>
          ))}
        </select>
      </div>

      {!selected && (
        <p className="text-sm text-gray-600">山を選択すると、記録フォームが表示されます。</p>
      )}

      {selected && (
        <div className="bg-white border rounded-md p-4">
          <ClimbRecord mountainName={selected.name} mountainId={selected.id} />
        </div>
      )}
    </div>
  );
}
