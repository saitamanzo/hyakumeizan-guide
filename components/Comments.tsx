"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { getPlanComments, addPlanComment, getClimbComments, addClimbComment, updatePlanComment, deletePlanComment, updateClimbComment, deleteClimbComment } from '@/lib/comment-utils';

type CommentItem = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: { id: string; display_name: string | null; nickname: string | null };
};

type Props =
  | { type: 'plan'; id: string }
  | { type: 'climb'; id: string };

export default function Comments(props: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<CommentItem[]>([]);
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string|null>(null);
  const [editingText, setEditingText] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (props.type === 'plan') {
      const rows = await getPlanComments(props.id);
      setItems(rows as unknown as CommentItem[]);
    } else {
      const rows = await getClimbComments(props.id);
      setItems(rows as unknown as CommentItem[]);
    }
  }, [props.type, props.id]);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!user) return alert('ログインが必要です');
    if (!input.trim()) return;
    setLoading(true);
    try {
      if (props.type === 'plan') {
        const r = await addPlanComment(props.id, user.id, input.trim());
        if (!r.success) throw new Error(r.error);
      } else {
        const r = await addClimbComment(props.id, user.id, input.trim());
        if (!r.success) throw new Error(r.error);
      }
      setInput('');
      await load();
  } catch {
      alert('投稿に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(id: string) {
    // ここでは簡易実装: delete + insert（RLSで自分のみ可）。本番はUPDATE APIを別途実装推奨。
    if (!user) return;
    if (!editingText.trim()) return;
    setLoading(true);
    try {
      if (props.type === 'plan') {
        const r = await updatePlanComment(id, editingText.trim());
        if (!r.success) throw new Error(r.error);
      } else {
        const r = await updateClimbComment(id, editingText.trim());
        if (!r.success) throw new Error(r.error);
      }
      setEditingId(null);
      setEditingText('');
      await load();
    } catch {
      alert('更新に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!user) return;
    if (!confirm('コメントを削除しますか？')) return;
    setLoading(true);
    try {
      if (props.type === 'plan') {
        const r = await deletePlanComment(id);
        if (!r.success) throw new Error(r.error);
      } else {
        const r = await deleteClimbComment(id);
        if (!r.success) throw new Error(r.error);
      }
      await load();
    } catch {
      alert('削除に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <h4 className="text-md font-semibold text-gray-800 mb-2">コメント</h4>
      {/* 投稿 */}
      <div className="mb-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="コメントを書く..."
          className="flex-1 px-3 py-2 border rounded-md"
        />
        <button onClick={submit} disabled={loading || !input.trim()} className="px-3 py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50">
          投稿
        </button>
      </div>
      {/* 一覧 */}
      <div className="space-y-3">
        {items.map((c) => {
          const isMine = user?.id === c.user_id;
          const displayName = c.user?.nickname || c.user?.display_name || '匿名';
          return (
            <div key={c.id} className="border rounded-md p-3">
              <div className="text-sm text-gray-600 flex justify-between">
                <span>{displayName}</span>
                <span>{new Date(c.created_at).toLocaleString('ja-JP')}</span>
              </div>
              {editingId === c.id ? (
                <div className="mt-2">
                  <textarea value={editingText} onChange={(e)=>setEditingText(e.target.value)} className="w-full border rounded-md p-2" rows={3} />
                  <div className="mt-2 flex gap-2 justify-end">
                    <button onClick={()=>{ setEditingId(null); setEditingText(''); }} className="px-2 py-1 border rounded">キャンセル</button>
                    <button onClick={()=>handleUpdate(c.id)} disabled={loading || !editingText.trim()} className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50">保存</button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-gray-800 whitespace-pre-wrap">{c.content}</p>
              )}
              {isMine && editingId !== c.id && (
                <div className="mt-2 flex gap-2 justify-end text-sm">
                  <button onClick={()=>{ setEditingId(c.id); setEditingText(c.content); }} className="px-2 py-1 text-blue-600 hover:underline">編集</button>
                  <button onClick={()=>handleDelete(c.id)} className="px-2 py-1 text-red-600 hover:underline">削除</button>
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="text-sm text-gray-500">まだコメントはありません。</p>
        )}
      </div>
    </div>
  );
}
