'use client';

import { createClient } from "@/lib/supabase/client";

const Button = ({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode; className?: string; }) => (
  <button {...props} className={className}>{children}</button>
);


const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:3000/';
  // Make sure to include `https` in production URLs.
  url = url.includes('http') ? url : `https://${url}`;
  // Make sure to include a trailing `/`.
  url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
  return url;
};

export default function OAuthSignIn({ provider, children }: { provider: 'google', children: React.ReactNode }) {
  const supabase = createClient();

  const handleOAuthSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${getURL()}auth/callback`,
      },
    });
  };

  return (
    <Button onClick={handleOAuthSignIn} className="w-full">
      {children}
    </Button>
  );
}
