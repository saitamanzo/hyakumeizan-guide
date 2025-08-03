import { Suspense } from 'react';
import SignInForm from '@/components/auth/SignInForm';

export const metadata = {
  title: 'ログイン - 百名山ガイド',
  description: '百名山ガイドにログインして、登山記録や山の情報を共有しましょう。',
};

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SignInForm />
    </Suspense>
  );
}
