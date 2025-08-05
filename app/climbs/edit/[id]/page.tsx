"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getUserClimbRecords, ClimbRecord } from "@/lib/climb-utils";
import EditClimbRecord from "@/components/EditClimbRecord";
import { useAuth } from "@/components/auth/AuthProvider";


export default function EditClimbPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  const { user, loading } = useAuth();
  const router = useRouter();
  const [record, setRecord] = useState<ClimbRecord | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    setFetching(true);
    setError(null);
    getUserClimbRecords(user.id)
      .then((records) => {
        const found = records.find((r) => r.id === id);
        setRecord(found || null);
      })
      .catch(() => setError('記録の取得に失敗しました'))
      .finally(() => setFetching(false));
  }, [user, id]);

  if (loading || fetching) {
    return <div className="py-12 text-center">読込中...</div>;
  }
  if (!user) {
    return <div className="py-12 text-center text-red-600">ログインが必要です</div>;
  }
  if (error) {
    return <div className="py-12 text-center text-red-600">{error}</div>;
  }
  if (!record) {
    return <div className="py-12 text-center text-gray-600">該当する記録が見つかりません</div>;
  }
  if (updated) {
    return (
      <div className="py-12 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4">編集完了</h1>
        <p className="mb-4">登山記録を更新しました。</p>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={() => router.push('/climbs')}>一覧に戻る</button>
      </div>
    );
  }
  return (
    <div className="py-12 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">登山記録を編集</h1>
      <div className="w-full max-w-xl">
        <EditClimbRecord
          record={record}
          onUpdate={() => setUpdated(true)}
          onCancel={() => router.push('/climbs')}
        />
      </div>
    </div>
  );
}
