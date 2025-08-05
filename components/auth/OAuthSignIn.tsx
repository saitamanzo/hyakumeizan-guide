'use client';

import { createClient } from "@/lib/supabase/client";

const Button = ({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode; className?: string; }) => (
  <button
    {...props}
    className={
      [
        "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md border-2 border-red-500 bg-white text-red-600 font-bold text-lg shadow-sm transition-all duration-150",
        "hover:bg-red-50 hover:shadow-lg hover:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2",
        className
      ].filter(Boolean).join(' ')
    }
  >
    {children}
  </button>
);


const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:3000/';
  
  // 本番環境では常にhttpsを使用
  if (process.env.NODE_ENV === 'production') {
    url = 'https://hyakumeizan-guide.vercel.app/';
  } else {
    // 開発環境
    url = url.includes('http') ? url : `http://${url}`;
  }
  
  // Make sure to include a trailing `/`.
  url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
  return url;
};

export default function OAuthSignIn({ provider, children }: { provider: 'google', children: React.ReactNode }) {
  const supabase = createClient();

  const handleOAuthSignIn = async () => {
    const redirectUrl = `${getURL()}auth/callback`;
    console.log('🔑 OAuth Sign In Configuration:', {
      provider,
      redirectTo: redirectUrl,
      siteUrl: getURL(),
      environment: process.env.NODE_ENV
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      console.error('❌ OAuth Sign In Error:', error);
      alert(`認証エラー: ${error.message}`);
    } else {
      console.log('✅ OAuth Sign In initiated:', data);
    }
  };

  return (
    <Button onClick={handleOAuthSignIn} className="w-full">
      {children}
    </Button>
  );
}
