'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { SupabaseClient, Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

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
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = async () => {
    console.log('AuthProvider: Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('AuthProvider: Error signing out:', error);
    } else {
      console.log('AuthProvider: Sign out successful. Redirecting to home.');
      router.push('/');
      router.refresh();
    }
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
  const supabase = createClient();
  try {
    console.log('ensureUserProfile: 開始 - userID:', user.id);
    
    const { error } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    console.log('ensureUserProfile: プロファイル確認結果', { error: error?.code });

    if (error && error.code === 'PGRST116') {
      console.log('ensureUserProfile: プロファイル作成開始');
      // ユーザーが存在しない場合は作成
      const { error: insertError } = await supabase.from('users').insert({
        id: user.id,
        display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User',
        experience_level: 'beginner',
        mountains_climbed: 0,
      });
      
      if (insertError) {
        console.error('ensureUserProfile: プロファイル作成エラー:', insertError);
        // プロファイル作成エラー（通常処理継続）
      } else {
        console.log('ensureUserProfile: プロファイル作成成功');
      }
    } else if (!error) {
      console.log('ensureUserProfile: プロファイル既存');
    }
  } catch (err) {
    console.error('ensureUserProfile: 例外発生:', err);
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