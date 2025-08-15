'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserProfile {
  id: string;
  display_name: string;
  nickname?: string | null;
  experience_level: string;
  mountains_climbed: number;
  created_at: string;
  updated_at: string;
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
  nickname: '',
    experience_level: 'beginner'
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  // ログインしていない場合はサインインページにリダイレクト
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/signin');
    }
  }, [user, authLoading, router]);

  // プロフィール情報を取得
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        console.log('ProfilePage: ユーザーなし、プロファイル取得スキップ');
        return;
      }
      
      console.log('ProfilePage: プロファイル取得開始 - userID:', user.id);
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        console.log('ProfilePage: プロファイル取得結果', { hasData: !!data, error: error?.code });
        
        if (error) {
          console.error('プロフィール取得エラー:', error);
          setError('プロフィール情報の取得に失敗しました: ' + error.message);
        } else if (data) {
          console.log('ProfilePage: プロファイル取得成功');
          setProfile(data);
          setEditForm({
            display_name: data.display_name || '',
            nickname: data.nickname || '',
            experience_level: data.experience_level || 'beginner'
          });
        } else {
          console.log('ProfilePage: プロファイルデータなし');
          setError('プロフィールが見つかりません');
        }
      } catch (err) {
        console.error('プロフィール取得例外:', err);
        setError('プロフィール情報の取得中にエラーが発生しました: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user || !profile) return;

    // バリデーション
    if (!editForm.display_name.trim()) {
      setError('表示名を入力してください');
      return;
    }

    setUpdateLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: editForm.display_name.trim(),
          nickname: editForm.nickname.trim() || null,
          experience_level: editForm.experience_level,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      // ローカル状態を更新
      setProfile(prev => prev ? {
        ...prev,
        display_name: editForm.display_name.trim(),
  nickname: editForm.nickname.trim() || null,
        experience_level: editForm.experience_level,
        updated_at: new Date().toISOString()
      } : null);

      setEditing(false);
      setSuccessMessage('プロフィールが正常に更新されました');
      
      // 3秒後に成功メッセージを非表示
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('プロフィール更新エラー:', err);
      setError('プロフィールの更新に失敗しました');
    } finally {
      setUpdateLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">プロフィールを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // useEffectでリダイレクト処理済み
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          {/* ヘッダー */}
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">プロフィール</h1>
                <p className="mt-1 text-sm text-gray-500">
                  あなたの登山プロフィール情報
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ← ダッシュボード
              </Link>
            </div>
          </div>

          {error && (
            <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="m-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          )}

          {/* プロフィール情報 */}
          <div className="px-4 py-5 sm:p-6">
            {profile ? (
              <div className="space-y-6">
                {/* 基本情報 */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">基本情報</h3>
                  
                  {editing ? (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="display_name" className="block text-sm font-medium text-gray-700">
                          表示名
                        </label>
                        <input
                          type="text"
                          id="display_name"
                          value={editForm.display_name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="表示名を入力"
                        />
                      </div>

                      <div>
                        <label htmlFor="nickname" className="block text-sm font-medium text-gray-700">
                          ニックネーム（公開表示名）
                        </label>
                        <input
                          type="text"
                          id="nickname"
                          value={editForm.nickname}
                          onChange={(e) => setEditForm(prev => ({ ...prev, nickname: e.target.value }))}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="公開時に表示する名前（任意）"
                        />
                        <p className="mt-1 text-xs text-gray-500">未設定の場合は表示名が使われます。</p>
                      </div>

                      <div>
                        <label htmlFor="experience_level" className="block text-sm font-medium text-gray-700">
                          登山経験レベル
                        </label>
                        <select
                          id="experience_level"
                          value={editForm.experience_level}
                          onChange={(e) => setEditForm(prev => ({ ...prev, experience_level: e.target.value }))}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="beginner">初心者</option>
                          <option value="intermediate">中級者</option>
                          <option value="advanced">上級者</option>
                          <option value="expert">エキスパート</option>
                        </select>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          onClick={handleUpdateProfile}
                          disabled={updateLoading}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {updateLoading ? '更新中...' : '保存'}
                        </button>
                        <button
                          onClick={() => {
                            setEditing(false);
                            setEditForm({
                              display_name: profile.display_name || '',
                              nickname: profile.nickname || '',
                              experience_level: profile.experience_level || 'beginner'
                            });
                          }}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
                          <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">表示名</dt>
                          <dd className="mt-1 text-sm text-gray-900">{profile.display_name || '未設定'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">ニックネーム（公開表示名）</dt>
                          <dd className="mt-1 text-sm text-gray-900">{profile.nickname || '未設定'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">経験レベル</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {profile.experience_level === 'beginner' && '初心者'}
                            {profile.experience_level === 'intermediate' && '中級者'}
                            {profile.experience_level === 'advanced' && '上級者'}
                            {profile.experience_level === 'expert' && 'エキスパート'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">登山回数</dt>
                          <dd className="mt-1 text-sm text-gray-900">{profile.mountains_climbed || 0}回</dd>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <button
                          onClick={() => setEditing(true)}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          編集
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* アカウント情報 */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">アカウント情報</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">アカウント作成日</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {new Date(profile.created_at).toLocaleDateString('ja-JP')}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">最終更新日</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {new Date(profile.updated_at).toLocaleDateString('ja-JP')}
                        </dd>
                      </div>
                    </div>
                  </div>
                </div>

                {/* クイックアクション */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">クイックアクション</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Link
                      href="/plans"
                      className="block p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <div className="text-blue-600 font-medium">登山計画</div>
                      <div className="text-sm text-blue-500 mt-1">新しい登山を計画する</div>
                    </Link>
                    <Link
                      href="/climbs"
                      className="block p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <div className="text-green-600 font-medium">登山記録</div>
                      <div className="text-sm text-green-500 mt-1">過去の登山記録を見る</div>
                    </Link>
                    <Link
                      href="/favorites"
                      className="block p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <div className="text-purple-600 font-medium">お気に入り</div>
                      <div className="text-sm text-purple-500 mt-1">お気に入りの山を管理</div>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">プロフィール情報がありません</p>
                <Link
                  href="/auth-debug"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  認証デバッグページへ
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
