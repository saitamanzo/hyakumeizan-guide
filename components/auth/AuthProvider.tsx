'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SupabaseClient, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthContextType = {
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  forceStopLoading: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // クライアントサイドであることを確認
    setIsClient(true);
  }, []);

  useEffect(() => {
    // クライアントサイドでのみ認証処理を実行
    if (!isClient) return;

    let mounted = true;
    let sessionChecked = false;
    
    // コールバック成功の検出
    const checkAuthCallback = () => {
      if (typeof document !== 'undefined') {
        const callbackCookie = document.cookie
          .split(';')
          .find(c => c.trim().startsWith('auth-callback='));
        
        if (callbackCookie && callbackCookie.includes('success')) {
          // クッキーを削除
          document.cookie = 'auth-callback=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          // セッション再取得を強制
          return true;
        }
      }
      return false;
    };
    
    // 初期セッション取得
    const getInitialSession = async () => {
      try {
        const isCallback = checkAuthCallback();
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          // セッション取得エラーは無視（通常のログアウト状態）
        }
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await ensureUserProfile(session.user);
          }
          
          sessionChecked = true;
          setLoading(false);
          
          // コールバック成功時はページリフレッシュを促す
          if (isCallback && session?.user) {
            console.log('Auth callback detected, session updated');
          }
        }
      } catch {
        // 初期セッション取得例外（通常のエラー）
        if (mounted) {
          sessionChecked = true;
          setLoading(false);
        }
      }
    };

    // 認証状態変化の監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
            await ensureUserProfile(session.user);
          }
          
          // 認証状態が変わったらすぐにローディングを終了
          if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
            setLoading(false);
          } else if (event === 'INITIAL_SESSION') {
            // 初期セッション取得時もローディングを終了
            setLoading(false);
          }
        }
      }
    );

    // 初期セッション取得を実行
    getInitialSession();

    // フォールバック: 3秒後に強制的にロード完了
    const fallbackTimeout = setTimeout(() => {
      if (mounted && !sessionChecked) {
        console.log('Auth fallback timeout triggered');
        setLoading(false);
      }
    }, 3000);

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      clearTimeout(fallbackTimeout);
    };
  }, [isClient]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const forceStopLoading = () => {
    setLoading(false);
  };

  const value = {
    supabase,
    session,
    user,
    loading,
    signOut,
    forceStopLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ユーザープロファイル確保
async function ensureUserProfile(user: User) {
  try {
    const { error } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // ユーザーが存在しない場合は作成
      const { error: insertError } = await supabase.from('users').insert({
        id: user.id,
        display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User',
        experience_level: 'beginner',
        mountains_climbed: 0,
      });
      
      if (insertError) {
        // プロファイル作成エラー（通常処理継続）
      }
    }
  } catch {
    // ユーザープロファイルエラー（通常処理継続）
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};