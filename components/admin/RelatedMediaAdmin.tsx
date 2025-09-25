"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import type { MediaItem } from '@/lib/relatedMedia';

export default function RelatedMediaAdmin() {
  const { user, loading } = useAuth();
  const [mountainName, setMountainName] = useState('');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<'book' | 'movie' | 'drama' | 'other'>('book');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!mountainName) setItems([]);
  }, [mountainName]);

  if (loading) return <div>認証状態を確認しています...</div>;
  if (!user) return (
    <div className="p-4">
      <p className="mb-3">このページは管理者専用です。サインインしてください。</p>
      <a className="px-3 py-2 bg-blue-600 text-white rounded" href="/signin">サインイン</a>
    </div>
  );

  async function loadItems() {
    if (!mountainName) return setStatus('山名を入力してください');
    setStatus('読み込み中...');
    try {
      const res = await fetch('/api/related-media');
      const json = await res.json();
      const data = json.data || {};
      setItems(data[mountainName] || []);
      setStatus('読み込み完了');
    } catch (e) {
      console.error(e);
      setStatus('読み込みに失敗しました');
    }
  }

  async function addItem() {
    if (!mountainName || !newTitle || !newUrl) return setStatus('必須項目を入力してください');
    const item: MediaItem = { id: `${Date.now()}`, type: newType, title: newTitle, url: newUrl };
    setStatus('追加中...');
    try {
      const res = await fetch('/api/related-media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mountainName, item }) });
      const j = await res.json();
      if (j.ok) {
        setStatus('追加しました');
        setNewTitle(''); setNewUrl('');
        await loadItems();
      } else {
        setStatus('追加に失敗しました');
      }
    } catch (e) {
      console.error(e);
      setStatus('追加に失敗しました');
    }
  }

  // Simple CSV/JSON import. Accepts JSON that is either an object { mountainName: [items] }
  // or an array of { mountainName, item } entries. CSV expects header: mountainName,title,url,type,id(optional)
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setStatus('インポート中...');
    try {
      const text = await file.text();
  const tasks: Array<Promise<Response>> = [];
      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          for (const entry of parsed) {
            // expect { mountainName, item }
            if (entry.mountainName && entry.item) {
              tasks.push(fetch('/api/related-media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) }));
            }
          }
        } else if (typeof parsed === 'object') {
          // object mapping mountainName -> items[]
          for (const [m, arr] of Object.entries(parsed)) {
            if (Array.isArray(arr)) {
              for (const it of arr) {
                tasks.push(fetch('/api/related-media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mountainName: m, item: it }) }));
              }
            }
          }
        }
      } else {
        // naive CSV parse
        const lines = text.split(/\r?\n/).filter(Boolean);
        const header = lines.shift()?.split(',').map(s=>s.trim()) || [];
        for (const line of lines) {
          const cols = line.split(',').map(s=>s.trim());
    const obj: Record<string, string> = {};
          header.forEach((h, i) => obj[h] = cols[i] ?? '');
          const m = obj.mountainName || obj.mountain || '';
          const it = { id: obj.id || `${Date.now()}`, title: obj.title || obj.name || '', url: obj.url || '', type: obj.type || 'other' };
          if (m && it.title) tasks.push(fetch('/api/related-media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mountainName: m, item: it }) }));
        }
      }

      const results = await Promise.all(tasks);
      const okCount = results.filter(r => r.ok).length;
      setStatus(`インポート完了: ${okCount}/${results.length}`);
      await loadItems();
    } catch (err) {
      console.error(err);
      setStatus('インポートに失敗しました');
    } finally {
      setImporting(false);
  ((e.target) as HTMLInputElement).value = '';
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-2xl font-bold mb-4">Related Media 管理</h2>
      <div className="mb-3 text-sm text-gray-600">サインイン済みユーザー: {user.email}</div>

      <div className="mb-4">
        <label className="block text-sm font-medium">山名</label>
        <input value={mountainName} onChange={e=>setMountainName(e.target.value)} className="mt-1 block w-full rounded border-gray-300 p-2" />
        <div className="mt-2">
          <button onClick={loadItems} className="px-3 py-2 bg-blue-600 text-white rounded mr-2">読み込み</button>
        </div>
      </div>

      <div id="listArea" className="mb-6">
        <h3 className="text-lg font-semibold">{mountainName ? `${mountainName} のアイテム (${items.length})` : 'アイテム一覧'}</h3>
        <div className="space-y-2 mt-2">
          {items.map(i => (
            <div key={i.id} className="p-2 border rounded">
              <a href={i.url} target="_blank" rel="noreferrer" className="font-medium">{i.title}</a>
              <div className="text-xs text-gray-500">{i.type} • {i.url}</div>
            </div>
          ))}
        </div>
      </div>

      <hr className="my-4" />

      <h3 className="text-lg font-semibold mb-2">新規アイテム追加</h3>
      <div className="space-y-2 mb-6">
        <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="タイトル" className="mt-1 block w-full rounded border-gray-300 p-2" />
        <input value={newUrl} onChange={e=>setNewUrl(e.target.value)} placeholder="URL" className="mt-1 block w-full rounded border-gray-300 p-2" />
  <select value={newType} onChange={e=>setNewType(e.target.value as 'book' | 'movie' | 'drama' | 'other')} className="mt-1 block w-full rounded border-gray-300 p-2">
          <option value="book">book</option>
          <option value="movie">movie</option>
          <option value="drama">drama</option>
          <option value="other">other</option>
        </select>
        <div>
          <button onClick={addItem} className="px-3 py-2 bg-green-600 text-white rounded">追加</button>
        </div>
      </div>

      <hr className="my-4" />

      <h3 className="text-lg font-semibold mb-2">CSV / JSON 一括インポート</h3>
      <div className="mb-4">
  <input type="file" accept=".csv,.json,application/json" onChange={handleFile} disabled={importing} />
  <div className="mt-2"><button onClick={() => { /* noop to keep importing state used */ }} className="px-2 py-1 text-sm border rounded" disabled={importing}>{importing ? 'インポート中...' : '準備'}</button></div>
        <div className="text-sm text-gray-500 mt-2">JSON: {"{mountainName:[items]}"} もしくは要素が {"[{mountainName,item},...]"} の配列。CSV ヘッダー例: mountainName,title,url,type</div>
      </div>

      <div className="mt-4 text-sm text-gray-700">{status}</div>
    </div>
  );
}
